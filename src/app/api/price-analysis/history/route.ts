import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const farmacia_id = searchParams.get('farmacia_id')
    const produto_id = searchParams.get('produto_id')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!farmacia_id) {
      return NextResponse.json(
        { error: 'farmacia_id é obrigatório' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('analises_preco_consolidada')
      .select(`
        id,
        medicamento_id,
        farmacia_id,
        preco_local,
        preco_medio_mercado,
        preco_minimo_mercado,
        preco_maximo_mercado,
        posicao_competitiva,
        percentil_preco,
        margem_atual,
        margem_sugerida,
        recomendacao_preco,
        recomendacao_descricao,
        confidence_score,
        created_at,
        medicamentos!inner(nome, categoria, principio_ativo)
      `)
      .eq('farmacia_id', farmacia_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (produto_id) {
      query = query.eq('medicamento_id', produto_id)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        limit,
        offset,
        total: data?.length || 0
      }
    })

  } catch (error) {
    console.error('Erro ao buscar histórico:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}