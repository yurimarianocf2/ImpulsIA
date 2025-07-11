import { NextRequest, NextResponse } from 'next/server'
import { PriceAnalyzer } from '@/lib/price-analyzer'
import { withAuth, PERMISSIONS } from '@/lib/auth'
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter'

async function handlePriceAnalysis(request: NextRequest) {
  try {
    const { medicamento, estado } = await request.json()

    // Validar parâmetros obrigatórios
    if (!medicamento) {
      return NextResponse.json(
        { error: 'medicamento é obrigatório' },
        { status: 400 }
      )
    }

    // Obter farmacia_id dos headers (definido pelo middleware de auth)
    const farmacia_id = request.headers.get('x-farmacia-id');
    
    if (!farmacia_id) {
      return NextResponse.json(
        { error: 'farmacia_id não encontrado no contexto de autenticação' },
        { status: 400 }
      );
    }

    console.log(`🔍 Analisando preços para "${medicamento}" na farmácia ${farmacia_id}`)

    // Criar instância do analisador - APENAS DADOS REAIS
    const analyzer = new PriceAnalyzer(farmacia_id)

    // Realizar análise de preços
    const analise = await analyzer.analisarPrecos(medicamento, estado || 'SP')

    // Salvar no banco de dados
    await analyzer.salvarAnalise(analise)

    console.log(`✅ Análise concluída para ${analise.produto_local.nome}`)

    return NextResponse.json({
      success: true,
      data: analise
    })

  } catch (error) {
    console.error('❌ Erro na análise de preços:', error)
    
    return NextResponse.json(
      { 
        error: 'Produto não encontrado ou erro interno', 
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 404 }
    )
  }
}

async function handlePriceAnalysisGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const medicamento = searchParams.get('medicamento')
    const estado = searchParams.get('estado') || 'SP'

    if (!medicamento) {
      return NextResponse.json(
        { error: 'medicamento é obrigatório' },
        { status: 400 }
      )
    }

    // Obter farmacia_id dos headers (definido pelo middleware de auth)
    const farmacia_id = request.headers.get('x-farmacia-id');
    
    if (!farmacia_id) {
      return NextResponse.json(
        { error: 'farmacia_id não encontrado no contexto de autenticação' },
        { status: 400 }
      );
    }

    console.log(`🔍 GET - Analisando preços para "${medicamento}" na farmácia ${farmacia_id}`)

    const analyzer = new PriceAnalyzer(farmacia_id)
    const analise = await analyzer.analisarPrecos(medicamento, estado)

    console.log(`✅ GET - Análise concluída para ${analise.produto_local.nome}`)

    return NextResponse.json({
      success: true,
      data: analise
    })

  } catch (error) {
    console.error('❌ GET - Erro na análise de preços:', error)
    
    return NextResponse.json(
      { 
        error: 'Produto não encontrado ou erro interno',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 404 }
    )
  }
}

// Exportar as funções protegidas por autenticação e rate limiting
export const POST = withRateLimit(
  withAuth(handlePriceAnalysis, {
    requireFarmaciaAccess: false, // Já validado pelo middleware
    requiredPermissions: [PERMISSIONS.PRICES_READ, PERMISSIONS.PRICES_ANALYZE]
  }),
  RATE_LIMIT_CONFIGS.PRICE_ANALYSIS,
  (request) => request.headers.get('x-farmacia-id') || undefined
);

export const GET = withRateLimit(
  withAuth(handlePriceAnalysisGET, {
    requireFarmaciaAccess: false, // Já validado pelo middleware
    requiredPermissions: [PERMISSIONS.PRICES_READ, PERMISSIONS.PRICES_ANALYZE]
  }),
  RATE_LIMIT_CONFIGS.PRICE_ANALYSIS,
  (request) => request.headers.get('x-farmacia-id') || undefined
);