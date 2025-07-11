/**
 * API de Convite de Usuários
 * Permite enviar convites para novos usuários
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAuth, PERMISSIONS } from '@/lib/auth'
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter'
import { withValidation, inviteUserSchema } from '@/lib/validators'

async function handleInviteUser(inviteData: any, request: NextRequest) {
  const farmaciaId = request.headers.get('x-farmacia-id')
  const inviterId = request.headers.get('x-user-id')
  
  if (!farmaciaId || !inviterId) {
    return NextResponse.json(
      { error: 'Contexto de autenticação incompleto' },
      { status: 400 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Configuração do banco de dados não encontrada' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { email, role, permissions } = inviteData

    // Verificar se o usuário já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    // Verificar se já há convite pendente
    if (existingUser) {
      const { data: existingRole } = await supabase
        .from('user_farmacia_roles')
        .select('id, status')
        .eq('user_id', existingUser.id)
        .eq('farmacia_id', farmaciaId)
        .single()

      if (existingRole) {
        if (existingRole.status === 'pending') {
          return NextResponse.json(
            { error: 'Já existe um convite pendente para este usuário' },
            { status: 400 }
          )
        }
        return NextResponse.json(
          { error: 'Este usuário já faz parte da farmácia' },
          { status: 400 }
        )
      }
    }

    // Criar usuário se não existir
    let userId = existingUser?.id
    if (!existingUser) {
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: {
          invited_by: inviterId,
          farmacia_id: farmaciaId
        }
      })

      if (userError) {
        console.error('Erro ao criar usuário:', userError)
        return NextResponse.json(
          { error: 'Erro ao criar convite de usuário' },
          { status: 500 }
        )
      }

      userId = newUser.user.id

      // Inserir na tabela users
      await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          created_at: new Date().toISOString()
        })
    }

    // Definir permissões baseadas no papel
    const rolePermissions = role === 'admin' 
      ? ['products:read', 'products:create', 'products:update', 'prices:read', 'prices:analyze', 'metrics:read', 'dashboard:access', 'users:read']
      : ['products:read', 'prices:read', 'dashboard:access']

    const finalPermissions = permissions && permissions.length > 0 ? permissions : rolePermissions

    // Criar relacionamento com a farmácia
    const { error: roleError } = await supabase
      .from('user_farmacia_roles')
      .insert({
        user_id: userId,
        farmacia_id: farmaciaId,
        role,
        permissions: finalPermissions,
        status: 'pending',
        invited_by: inviterId,
        created_at: new Date().toISOString()
      })

    if (roleError) {
      console.error('Erro ao criar papel do usuário:', roleError)
      return NextResponse.json(
        { error: 'Erro ao configurar permissões do usuário' },
        { status: 500 }
      )
    }

    // Enviar email de convite (implementar quando houver serviço de email)
    // await sendInviteEmail(email, farmaciaId, role)

    // Registrar evento de auditoria
    await supabase.rpc('log_audit_event', {
      p_user_id: inviterId,
      p_farmacia_id: farmaciaId,
      p_action: 'INVITE',
      p_resource_type: 'users',
      p_resource_id: userId,
      p_details: {
        invited_email: email,
        role,
        permissions: finalPermissions
      },
      p_ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || request.ip,
      p_user_agent: request.headers.get('user-agent')
    })

    return NextResponse.json({
      success: true,
      message: 'Convite enviado com sucesso',
      data: {
        user_id: userId,
        email,
        role,
        status: 'pending'
      }
    })

  } catch (error) {
    console.error('Erro inesperado ao convidar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Rota POST protegida
export const POST = withRateLimit(
  withAuth(
    withValidation(inviteUserSchema, handleInviteUser),
    {
      requireFarmaciaAccess: false,
      requiredPermissions: ['users:create', 'admin:read']
    }
  ),
  RATE_LIMIT_CONFIGS.AUTH,
  (request) => request.headers.get('x-farmacia-id') || undefined
)