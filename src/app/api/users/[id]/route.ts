/**
 * API de Usuário Individual
 * Permite atualizar e desativar usuários específicos
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAuth, PERMISSIONS } from '@/lib/auth'
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter'
import { withValidation, updateUserRoleSchema } from '@/lib/validators'

async function handleUpdateUser(
  updateData: any, 
  request: NextRequest
) {
  const url = new URL(request.url)
  const targetUserId = url.pathname.split('/').pop()
  const farmaciaId = request.headers.get('x-farmacia-id')
  const currentUserId = request.headers.get('x-user-id')
  
  if (!farmaciaId || !currentUserId) {
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
    const { role, permissions } = updateData

    // Verificar se o usuário alvo existe e pertence à farmácia
    const { data: targetUser, error: targetError } = await supabase
      .from('user_farmacia_roles')
      .select('id, role, user_id')
      .eq('user_id', targetUserId)
      .eq('farmacia_id', farmaciaId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado ou não pertence a esta farmácia' },
        { status: 404 }
      )
    }

    // Não permitir alterar o proprietário
    if (targetUser.role === 'owner') {
      return NextResponse.json(
        { error: 'Não é possível alterar o papel do proprietário' },
        { status: 403 }
      )
    }

    // Não permitir que usuários se alterem
    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { error: 'Você não pode alterar seu próprio papel' },
        { status: 403 }
      )
    }

    // Atualizar papel e permissões
    const { error: updateError } = await supabase
      .from('user_farmacia_roles')
      .update({
        role,
        permissions: permissions || [],
        updated_at: new Date().toISOString()
      })
      .eq('user_id', targetUserId)
      .eq('farmacia_id', farmaciaId)

    if (updateError) {
      console.error('Erro ao atualizar usuário:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar usuário' },
        { status: 500 }
      )
    }

    // Registrar evento de auditoria
    await supabase.rpc('log_audit_event', {
      p_user_id: currentUserId,
      p_farmacia_id: farmaciaId,
      p_action: 'UPDATE',
      p_resource_type: 'users',
      p_resource_id: targetUserId,
      p_details: {
        previous_role: targetUser.role,
        new_role: role,
        new_permissions: permissions || []
      },
      p_ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || request.ip,
      p_user_agent: request.headers.get('user-agent')
    })

    return NextResponse.json({
      success: true,
      message: 'Usuário atualizado com sucesso'
    })

  } catch (error) {
    console.error('Erro inesperado ao atualizar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function handleDeactivateUser(
  request: NextRequest
) {
  const url = new URL(request.url)
  const targetUserId = url.pathname.split('/').pop()
  const farmaciaId = request.headers.get('x-farmacia-id')
  const currentUserId = request.headers.get('x-user-id')
  
  if (!farmaciaId || !currentUserId) {
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
    // Verificar se o usuário alvo existe e pertence à farmácia
    const { data: targetUser, error: targetError } = await supabase
      .from('user_farmacia_roles')
      .select('id, role, user_id')
      .eq('user_id', targetUserId)
      .eq('farmacia_id', farmaciaId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado ou não pertence a esta farmácia' },
        { status: 404 }
      )
    }

    // Não permitir desativar o proprietário
    if (targetUser.role === 'owner') {
      return NextResponse.json(
        { error: 'Não é possível desativar o proprietário' },
        { status: 403 }
      )
    }

    // Não permitir que usuários se desativem
    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { error: 'Você não pode desativar sua própria conta' },
        { status: 403 }
      )
    }

    // Desativar usuário (marcar como inativo)
    const { error: deactivateError } = await supabase
      .from('user_farmacia_roles')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', targetUserId)
      .eq('farmacia_id', farmaciaId)

    if (deactivateError) {
      console.error('Erro ao desativar usuário:', deactivateError)
      return NextResponse.json(
        { error: 'Erro ao desativar usuário' },
        { status: 500 }
      )
    }

    // Registrar evento de auditoria
    await supabase.rpc('log_audit_event', {
      p_user_id: currentUserId,
      p_farmacia_id: farmaciaId,
      p_action: 'DELETE',
      p_resource_type: 'users',
      p_resource_id: targetUserId,
      p_details: {
        action: 'deactivate',
        previous_status: 'active'
      },
      p_ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || request.ip,
      p_user_agent: request.headers.get('user-agent')
    })

    return NextResponse.json({
      success: true,
      message: 'Usuário desativado com sucesso'
    })

  } catch (error) {
    console.error('Erro inesperado ao desativar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Rota PATCH protegida
export const PATCH = withRateLimit(
  withAuth(
    withValidation(updateUserRoleSchema, handleUpdateUser),
    {
      requireFarmaciaAccess: false,
      requiredPermissions: ['users:update', 'admin:read']
    }
  ),
  RATE_LIMIT_CONFIGS.NORMAL,
  (request) => request.headers.get('x-farmacia-id') || undefined
)

// Rota DELETE protegida
export const DELETE = withRateLimit(
  withAuth(handleDeactivateUser, {
    requireFarmaciaAccess: false,
    requiredPermissions: ['users:delete', 'admin:read']
  }),
  RATE_LIMIT_CONFIGS.NORMAL,
  (request) => request.headers.get('x-farmacia-id') || undefined
)