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
}

export class PriceAnalyzer {
  private farmaciaId: string

  constructor(farmaciaId: string) {
    this.farmaciaId = farmaciaId
  }

  async buscarProdutoLocal(termo: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('farmacia_id', this.farmaciaId)
        .eq('ativo', true)
        .or(`nome.ilike.%${termo}%,principio_ativo.ilike.%${termo}%,codigo_barras.eq.${termo}`)
        .limit(1)
        .single()

      if (error) {
        console.error('Erro ao buscar produto:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Erro na busca local:', error)
      return null
    }
  }

  async buscarPrecosExternos(nomeMedicamento: string, estado: string = 'SP'): Promise<ExternalPrice[]> {
    const { ExternalPriceManager } = await import('./external-price-apis')
    const priceManager = new ExternalPriceManager()
    
    try {
      return await priceManager.searchAllSources(nomeMedicamento, estado)
    } catch (error) {
      console.error('Erro ao buscar preços externos:', error)
      return []
    }
  }

  async analisarPrecos(termo: string, estado: string = 'SP'): Promise<PriceAnalysis> {
    // Buscar produto local
    const produtoLocal = await this.buscarProdutoLocal(termo)
    
    if (!produtoLocal) {
      throw new Error('Produto não encontrado no estoque local')
    }

    // Buscar preços externos
    const precosExternos = await this.buscarPrecosExternos(produtoLocal.nome, estado)
    
    // Calcular preço médio do mercado
    const precoMedioMercado = precosExternos.length > 0 
      ? precosExternos.reduce((sum, p) => sum + p.preco, 0) / precosExternos.length
      : produtoLocal.preco_venda

    // Determinar posição competitiva
    let posicaoCompetitiva: 'abaixo' | 'medio' | 'acima'
    const diferenca = produtoLocal.preco_venda - precoMedioMercado
    const percentualDiferenca = (diferenca / precoMedioMercado) * 100

    if (percentualDiferenca <= -5) {
      posicaoCompetitiva = 'abaixo'
    } else if (percentualDiferenca >= 5) {
      posicaoCompetitiva = 'acima'
    } else {
      posicaoCompetitiva = 'medio'
    }

    // Gerar recomendação
    const recomendacao = this.gerarRecomendacao(
      produtoLocal, 
      precoMedioMercado, 
      posicaoCompetitiva,
      percentualDiferenca
    )

    // Calcular margem atual
    const margemAtual = produtoLocal.preco_custo > 0 
      ? ((produtoLocal.preco_venda - produtoLocal.preco_custo) / produtoLocal.preco_venda) * 100
      : 0

    return {
      produto_local: produtoLocal,
      precos_externos: precosExternos,
      preco_medio_mercado: precoMedioMercado,
      posicao_competitiva: posicaoCompetitiva,
      recomendacao,
      margem_atual: margemAtual
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
    try {
      await supabase
        .from('analises_preco')
        .insert({
          farmacia_id: this.farmaciaId,
          produto_id: analise.produto_local?.id,
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