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
  private useMockData: boolean

  constructor(farmaciaId: string, useMockData: boolean = false) {
    this.farmaciaId = farmaciaId
    this.useMockData = useMockData || process.env.USE_MOCK_DATA === 'true'
  }

  async buscarProdutoLocal(termo: string): Promise<Product | null> {
    // Se modo mock estiver ativo ou Supabase indisponível, usar dados mock
    if (this.useMockData) {
      return this.getMockProduct(termo)
    }

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
        // Fallback para dados mock se Supabase falhar
        return this.getMockProduct(termo)
      }

      return data
    } catch (error) {
      console.error('Erro na busca local:', error)
      // Fallback para dados mock se Supabase falhar
      return this.getMockProduct(termo)
    }
  }

  private getMockProduct(termo: string): Product | null {
    const produtosMock = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        nome: 'Dipirona Monoidratada 500mg',
        preco_venda: 12.50,
        preco_custo: 8.00,
        margem_lucro: 36.00,
        estoque_atual: 150,
        principio_ativo: 'Dipirona Monoidratada',
        fabricante: 'EMS Genérico'
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        nome: 'Paracetamol 750mg',
        preco_venda: 8.90,
        preco_custo: 5.50,
        margem_lucro: 38.20,
        estoque_atual: 200,
        principio_ativo: 'Paracetamol',
        fabricante: 'Medley'
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174002',
        nome: 'Ibuprofeno 600mg',
        preco_venda: 15.80,
        preco_custo: 10.20,
        margem_lucro: 35.44,
        estoque_atual: 80,
        principio_ativo: 'Ibuprofeno',
        fabricante: 'Germed'
      }
    ]

    const termoLower = termo.toLowerCase()
    return produtosMock.find(p => 
      p.nome.toLowerCase().includes(termoLower) || 
      (p.principio_ativo && p.principio_ativo.toLowerCase().includes(termoLower))
    ) || null
  }

  async buscarPrecosExternos(nomeMedicamento: string, estado: string = 'SP', useMockData?: boolean): Promise<ExternalPrice[]> {
    const { ExternalPriceManager } = await import('./external-price-apis')
    const priceManager = new ExternalPriceManager()
    
    // Se useMockData foi especificado, configurar o modo
    if (useMockData !== undefined) {
      priceManager.setMockDataMode(useMockData)
    }
    
    try {
      return await priceManager.searchAllSources(nomeMedicamento, estado)
    } catch (error) {
      console.error('Erro ao buscar preços externos:', error)
      return []
    }
  }

  async analisarPrecos(termo: string, estado: string = 'SP', useMockData?: boolean): Promise<PriceAnalysis> {
    // Configurar modo mock se especificado
    if (useMockData !== undefined) {
      this.useMockData = useMockData
    }

    // Buscar produto local
    const produtoLocal = await this.buscarProdutoLocal(termo)
    
    if (!produtoLocal) {
      throw new Error('Produto não encontrado no estoque local')
    }

    // Buscar preços externos
    const precosExternos = await this.buscarPrecosExternos(produtoLocal.nome, estado, this.useMockData)
    
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
    // Se modo mock estiver ativo, apenas log
    if (this.useMockData) {
      console.log('Mock: Análise salva com sucesso')
      return
    }

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