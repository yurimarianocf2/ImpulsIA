import { NextRequest, NextResponse } from 'next/server'
import { PriceAnalyzer } from '@/lib/price-analyzer'

export async function POST(request: NextRequest) {
  try {
    const { farmacia_id, medicamento, estado } = await request.json()

    // Validar parâmetros obrigatórios
    if (!farmacia_id || !medicamento) {
      return NextResponse.json(
        { error: 'farmacia_id e medicamento são obrigatórios' },
        { status: 400 }
      )
    }

    // Criar instância do analisador
    const analyzer = new PriceAnalyzer(farmacia_id)

    // Realizar análise de preços
    const analise = await analyzer.analisarPrecos(medicamento, estado || 'SP')

    // Salvar no banco de dados
    await analyzer.salvarAnalise(analise)

    return NextResponse.json({
      success: true,
      data: analise
    })

  } catch (error) {
    console.error('Erro na análise de preços:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor', 
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const farmacia_id = searchParams.get('farmacia_id')
    const medicamento = searchParams.get('medicamento')
    const estado = searchParams.get('estado') || 'SP'

    if (!farmacia_id || !medicamento) {
      return NextResponse.json(
        { error: 'farmacia_id e medicamento são obrigatórios' },
        { status: 400 }
      )
    }

    const analyzer = new PriceAnalyzer(farmacia_id)
    const analise = await analyzer.analisarPrecos(medicamento, estado)

    return NextResponse.json({
      success: true,
      data: analise
    })

  } catch (error) {
    console.error('Erro na análise de preços:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}