import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Product {
  id: string
  nome: string
  preco_venda: number
  preco_custo: number
  margem_lucro: number
  estoque_atual: number
  principio_ativo?: string
  fabricante?: string
}

interface ExternalPrice {
  farmacia: string
  preco: number
  disponivel: boolean
  estado: string
  fonte: string
}

interface PriceAnalysis {
  produto_local: Product | null
  precos_externos: ExternalPrice[]
  preco_medio_mercado: number
  posicao_competitiva: 'abaixo' | 'medio' | 'acima'
  recomendacao: string
  margem_atual: number
  isMockData: boolean
  dataSource: 'database' | 'mock' | 'fallback'
}

export class PriceAnalyzer {
  private farmaciaId: string
  private useMockData: boolean

  constructor(farmaciaId: string, useMockData: boolean = false) {
    this.farmaciaId = farmaciaId
    this.useMockData = useMockData || process.env.USE_MOCK_DATA === 'true'
  }

  async buscarProdutoLocal(termo: string): Promise<{product: Product | null, isMockData: boolean, dataSource: string}> {
    // Se modo mock estiver ativo ou Supabase indisponível, usar dados mock
    if (this.useMockData) {
      const mockProduct = this.getMockProduct(termo)
      return {
      produto_local: produtoLocal,
      precos_externos: precosExternos,
      preco_medio_mercado: precoMedioMercado,
      posicao_competitiva: posicaoCompetitiva,
      recomendacao,
      margem_atual: margemAtual,
      isMockData: produtoResult.isMockData,
      dataSource: produtoResult.dataSource
    }
  }

  private gerarRecomendacao(
    produto: Product, 
    precoMedio: number, 
    posicao: 'abaixo' | 'medio' | 'acima',
    percentual: number
  ): string {
    const diferenca = Math.abs(percentual)
    
    switch (posicao) {
      case 'abaixo':
        if (diferenca > 15) {
          return `Seu preço está ${diferenca.toFixed(1)}% abaixo do mercado. Considere aumentar para R$ ${precoMedio.toFixed(2)} e melhorar sua margem.`
        }
        return `Seu preço está competitivo, ${diferenca.toFixed(1)}% abaixo do mercado. Boa estratégia de atração de clientes.`
      
      case 'acima':
        if (diferenca > 20) {
          return `Seu preço está ${diferenca.toFixed(1)}% acima do mercado. Considere reduzir para R$ ${precoMedio.toFixed(2)} para ser mais competitivo.`
        }
        return `Seu preço está ${diferenca.toFixed(1)}% acima do mercado. Certifique-se de que o valor agregado justifica a diferença.`
      
      case 'medio':
        return `Seu preço está alinhado com o mercado (${diferenca.toFixed(1)}% de diferença). Posicionamento equilibrado.`
    }
  }

  async salvarAnalise(analise: PriceAnalysis): Promise<void> {
    // Se modo mock estiver ativo, apenas log
    if (this.useMockData) {
      console.log('Mock: Análise salva com sucesso')
      return
    }

    try {
      await supabase
        .from('analises_preco_consolidada')
        .insert({
          farmacia_id: this.farmaciaId,
          medicamento_id: analise.produto_local?.id,
          preco_local: analise.produto_local?.preco_venda,
          preco_medio_mercado: analise.preco_medio_mercado,
          posicao_competitiva: analise.posicao_competitiva,
          margem_atual: analise.margem_atual,
          precos_externos: analise.precos_externos,
          recomendacao: analise.recomendacao,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Erro ao salvar análise:', error)
      // Não falhar se não conseguir salvar
    }
  }
}

// Função auxiliar para uso direto
export async function analisarPrecoMedicamento(
  farmaciaId: string,
  medicamento: string,
  estado: string = 'SP'
): Promise<PriceAnalysis> {
  const analyzer = new PriceAnalyzer(farmaciaId)
  const analise = await analyzer.analisarPrecos(medicamento, estado)
  await analyzer.salvarAnalise(analise)
  return analise
}