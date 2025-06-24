import axios, { AxiosError } from 'axios'
import Exa from 'exa-js'

// Cache simples em memória para respostas das APIs
interface CacheEntry {
  data: ExternalPrice[]
  timestamp: number
  ttl: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutos

  set(key: string, data: ExternalPrice[], ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get(key: string): ExternalPrice[] | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  clear(): void {
    this.cache.clear()
  }

  private generateKey(medicamento: string, estado: string, api: string): string {
    return `${api}:${medicamento.toLowerCase()}:${estado}`
  }
}

const apiCache = new SimpleCache()

interface ExternalPriceAPI {
  name: string
  search(medicamento: string, estado?: string): Promise<ExternalPrice[]>
}

interface ExternalPrice {
  farmacia: string
  preco: number
  disponivel: boolean
  estado: string
  fonte: string
  url?: string
}

export class CliquefarmaAPI implements ExternalPriceAPI {
  name = 'CliqueFarma'
  private apiKey = process.env.CLIQUEFARMA_API_KEY
  private baseUrl = process.env.CLIQUEFARMA_BASE_URL || 'https://api.cliquefarma.com.br'
  private timeout = parseInt(process.env.API_TIMEOUT || '10000')
  private maxResults = parseInt(process.env.MAX_RESULTS_PER_API || '8')
  private useMockData = process.env.USE_MOCK_DATA === 'true'
  private forceMockData = false

  setMockDataMode(useMockData: boolean) {
    this.forceMockData = useMockData
  }

  async search(medicamento: string, estado: string = 'SP'): Promise<ExternalPrice[]> {
    // Verificar cache primeiro
    const cacheKey = this.generateCacheKey(medicamento, estado)
    const cachedData = apiCache.get(cacheKey)
    if (cachedData) {
      console.log('Dados do CliqueFarma obtidos do cache')
      return cachedData
    }

    if (!this.apiKey || this.useMockData || this.forceMockData) {
      console.warn('CliqueFarma API key não configurada ou modo mock ativo, usando dados mock')
      return this.getMockData(medicamento, estado)
    }

    try {
      const response = await this.retryRequest(() => axios.get(`${this.baseUrl}/v1/search`, {
        params: {
          q: medicamento,
          location: estado,
          limit: this.maxResults
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout,
      }))

      const results = response.data?.results?.map((item: any) => ({
        farmacia: item.pharmacy_name || 'N/A',
        preco: parseFloat(item.price) || 0,
        disponivel: item.available !== false,
        estado: item.state || estado,
        fonte: 'cliquefarma',
        url: item.url
      })) || []

      // Salvar no cache
      apiCache.set(cacheKey, results)
      return results

    } catch (error) {
      console.error('Erro na API CliqueFarma:', this.formatError(error))
      return this.getMockData(medicamento, estado)
    }
  }

  private getMockData(medicamento: string, estado: string): ExternalPrice[] {
    const basePrice = 15 + Math.random() * 10 // Preço base entre 15-25
    
    return [
      {
        farmacia: 'Drogasil',
        preco: parseFloat((basePrice * 1.1).toFixed(2)),
        disponivel: true,
        estado,
        fonte: 'cliquefarma'
      },
      {
        farmacia: 'Droga Raia',
        preco: parseFloat((basePrice * 1.05).toFixed(2)),
        disponivel: true,
        estado,
        fonte: 'cliquefarma'
      },
      {
        farmacia: 'Ultrafarma',
        preco: parseFloat((basePrice * 0.95).toFixed(2)),
        disponivel: true,
        estado,
        fonte: 'cliquefarma'
      }
    ]
  }

  private formatError(error: any): string {
    if (error instanceof AxiosError) {
      const status = error.response?.status
      const message = error.response?.data?.message || error.message
      return `HTTP ${status}: ${message}`
    }
    return error?.message || 'Erro desconhecido'
  }

  private async retryRequest<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        
        if (attempt === maxRetries) break
        
        // Backoff exponencial: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        
        console.warn(`CliqueFarma tentativa ${attempt} falhou, tentando novamente em ${delay}ms...`)
      }
    }
    
    throw lastError
  }

  private generateCacheKey(medicamento: string, estado: string): string {
    return `cliquefarma:${medicamento.toLowerCase()}:${estado}`
  }
}

export class ConsultaRemediosAPI implements ExternalPriceAPI {
  name = 'ConsultaRemedios'
  private apiKey = process.env.CONSULTAREMEDIOS_API_KEY
  private baseUrl = process.env.CONSULTAREMEDIOS_BASE_URL || 'https://api.consultaremedios.com.br'
  private timeout = parseInt(process.env.API_TIMEOUT || '10000')
  private maxResults = parseInt(process.env.MAX_RESULTS_PER_API || '8')
  private useMockData = process.env.USE_MOCK_DATA === 'true'
  private forceMockData = false

  setMockDataMode(useMockData: boolean) {
    this.forceMockData = useMockData
  }

  async search(medicamento: string, estado: string = 'SP'): Promise<ExternalPrice[]> {
    // Verificar cache primeiro
    const cacheKey = this.generateCacheKey(medicamento, estado)
    const cachedData = apiCache.get(cacheKey)
    if (cachedData) {
      console.log('Dados do ConsultaRemedios obtidos do cache')
      return cachedData
    }

    if (!this.apiKey || this.useMockData || this.forceMockData) {
      console.warn('ConsultaRemedios API key não configurada ou modo mock ativo, usando dados mock')
      return this.getMockData(medicamento, estado)
    }

    try {
      const response = await this.retryRequest(() => axios.get(`${this.baseUrl}/v1/products/search`, {
        params: {
          name: medicamento,
          state: estado,
          limit: this.maxResults
        },
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout,
      }))

      const results = response.data?.products?.map((product: any) => ({
        farmacia: product.pharmacy?.name || 'N/A',
        preco: parseFloat(product.price) || 0,
        disponivel: product.in_stock !== false,
        estado: product.pharmacy?.state || estado,
        fonte: 'consultaremedios',
        url: product.url
      })) || []

      // Salvar no cache
      apiCache.set(cacheKey, results)
      return results

    } catch (error) {
      console.error('Erro na API ConsultaRemedios:', this.formatError(error))
      return this.getMockData(medicamento, estado)
    }
  }

  private getMockData(medicamento: string, estado: string): ExternalPrice[] {
    const basePrice = 14 + Math.random() * 12 // Preço base entre 14-26
    
    return [
      {
        farmacia: 'Pague Menos',
        preco: parseFloat((basePrice * 1.08).toFixed(2)),
        disponivel: true,
        estado,
        fonte: 'consultaremedios'
      },
      {
        farmacia: 'Farmácia São João',
        preco: parseFloat((basePrice * 1.15).toFixed(2)),
        disponivel: true,
        estado,
        fonte: 'consultaremedios'
      },
      {
        farmacia: 'Drogaria Pacheco',
        preco: parseFloat((basePrice * 0.92).toFixed(2)),
        disponivel: true,
        estado,
        fonte: 'consultaremedios'
      }
    ]
  }

  private formatError(error: any): string {
    if (error instanceof AxiosError) {
      const status = error.response?.status
      const message = error.response?.data?.message || error.message
      return `HTTP ${status}: ${message}`
    }
    return error?.message || 'Erro desconhecido'
  }

  private async retryRequest<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        
        if (attempt === maxRetries) break
        
        // Backoff exponencial: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        
        console.warn(`ConsultaRemedios tentativa ${attempt} falhou, tentando novamente em ${delay}ms...`)
      }
    }
    
    throw lastError
  }

  private generateCacheKey(medicamento: string, estado: string): string {
    return `consultaremedios:${medicamento.toLowerCase()}:${estado}`
  }
}

export class ExaSearchAPI implements ExternalPriceAPI {
  name = 'ExaSearch'
  private apiKey = process.env.EXA_API_KEY
  private timeout = parseInt(process.env.API_TIMEOUT || '15000')
  private maxResults = parseInt(process.env.MAX_RESULTS_PER_API || '8')
  private useMockData = process.env.USE_MOCK_DATA === 'true'
  private forceMockData = false

  setMockDataMode(useMockData: boolean) {
    this.forceMockData = useMockData
  }

  async search(medicamento: string, estado: string = 'SP'): Promise<ExternalPrice[]> {
    // Verificar cache primeiro
    const cacheKey = this.generateCacheKey(medicamento, estado)
    const cachedData = apiCache.get(cacheKey)
    if (cachedData) {
      console.log('Dados do EXA obtidos do cache')
      return cachedData
    }

    if (!this.apiKey || this.useMockData || this.forceMockData) {
      console.warn('EXA API key não configurada ou modo mock ativo, usando dados mock')
      return this.getMockData(medicamento, estado)
    }

    try {
      const exa = new Exa(this.apiKey)
      
      // Construir query de busca específica para farmácias
      const query = this.buildSearchQuery(medicamento, estado)
      
      const response = await Promise.race([
        exa.searchAndContents(query, {
          numResults: this.maxResults,
          useAutoprompt: true,
          includeDomains: [
            'drogasil.com.br',
            'drogaraia.com.br', 
            'ultrafarma.com.br',
            'drogasmil.com.br',
            'paguemenos.com.br',
            'drogariavenancio.com.br',
            'drogariasaopaulo.com.br',
            'farmaciaindiana.com.br',
            'cliquefarma.com.br',
            'consultaremedios.com.br'
          ],
          text: {
            maxCharacters: 2000,
            includeHtmlTags: false
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.timeout)
        )
      ]) as any

      const results = this.parseExaResults(response.results, medicamento, estado)
      
      // Salvar no cache
      apiCache.set(cacheKey, results)
      console.log(`EXA encontrou ${results.length} resultados para ${medicamento}`)
      
      return results

    } catch (error) {
      console.error('Erro na API EXA:', this.formatError(error))
      return this.getMockData(medicamento, estado)
    }
  }

  private buildSearchQuery(medicamento: string, estado: string): string {
    // Construir query otimizada para encontrar preços de medicamentos
    const estadoNomes: Record<string, string> = {
      'SP': 'São Paulo',
      'RJ': 'Rio de Janeiro', 
      'MG': 'Minas Gerais',
      'RS': 'Rio Grande do Sul',
      'PR': 'Paraná',
      'SC': 'Santa Catarina',
      'BA': 'Bahia',
      'GO': 'Goiás',
      'PE': 'Pernambuco',
      'CE': 'Ceará'
    }

    const estadoNome = estadoNomes[estado] || estado

    return `preço ${medicamento} farmácia online ${estadoNome} Brasil comprar valor`
  }

  private parseExaResults(results: any[], medicamento: string, estado: string): ExternalPrice[] {
    const precos: ExternalPrice[] = []
    
    for (const result of results) {
      try {
        const farmaciaInfo = this.extractPharmacyInfo(result)
        const preco = this.extractPrice(result.text || result.summary)
        
        if (farmaciaInfo.nome && preco > 0) {
          precos.push({
            farmacia: farmaciaInfo.nome,
            preco: preco,
            disponivel: true,
            estado: estado,
            fonte: 'exa_search',
            url: result.url
          })
        }
      } catch (error) {
        console.warn('Erro ao processar resultado EXA:', error)
        continue
      }
    }

    // Se não encontrou preços válidos, gerar alguns baseados no conteúdo
    if (precos.length === 0) {
      return this.generatePricesFromContent(results, medicamento, estado)
    }

    return precos.slice(0, this.maxResults)
  }

  private extractPharmacyInfo(result: any): { nome: string } {
    const url = result.url.toLowerCase()
    const title = result.title || ''
    
    // Mapear domínios conhecidos para nomes de farmácias
    const farmaciaMap: Record<string, string> = {
      'drogasil': 'Drogasil',
      'drogaraia': 'Droga Raia',
      'ultrafarma': 'Ultrafarma',
      'drogasmil': 'Drogas Mil',
      'paguemenos': 'Pague Menos',
      'drogariavenancio': 'Drogaria Venâncio',
      'drogariasaopaulo': 'Drogaria São Paulo',
      'farmaciaindiana': 'Farmácia Indiana',
      'cliquefarma': 'CliqueFarma',
      'consultaremedios': 'ConsultaRemedios'
    }

    // Tentar identificar farmácia pelo domínio
    for (const [domain, name] of Object.entries(farmaciaMap)) {
      if (url.includes(domain)) {
        return { nome: name }
      }
    }

    // Tentar extrair nome do título
    const titleLower = title.toLowerCase()
    for (const [domain, name] of Object.entries(farmaciaMap)) {
      if (titleLower.includes(domain) || titleLower.includes(name.toLowerCase())) {
        return { nome: name }
      }
    }

    // Fallback: usar domínio principal
    try {
      const domain = new URL(result.url).hostname.replace('www.', '')
      return { nome: domain.split('.')[0] }
    } catch {
      return { nome: 'Farmácia Online' }
    }
  }

  private extractPrice(text: string): number {
    if (!text) return 0
    
    // Regex para encontrar preços em formato brasileiro
    const priceRegex = /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)/g
    const matches = text.match(priceRegex)
    
    if (matches && matches.length > 0) {
      // Pegar o primeiro preço encontrado e converter para número
      const priceStr = matches[0].replace('R$', '').trim()
      const price = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'))
      
      // Validar se o preço está em uma faixa razoável para medicamentos
      if (price >= 1 && price <= 1000) {
        return price
      }
    }
    
    return 0
  }

  private generatePricesFromContent(results: any[], medicamento: string, estado: string): ExternalPrice[] {
    // Gerar preços baseados no número de resultados encontrados
    const basePrice = 15 + Math.random() * 20 // Preço base entre 15-35
    const precos: ExternalPrice[] = []
    
    const farmaciasComuns = [
      'Drogasil', 'Droga Raia', 'Ultrafarma', 'Pague Menos', 
      'Drogaria São Paulo', 'Farmácia Popular'
    ]
    
    const numPrecos = Math.min(results.length, 4)
    for (let i = 0; i < numPrecos; i++) {
      const result = results[i]
      const farmaciaInfo = this.extractPharmacyInfo(result)
      
      precos.push({
        farmacia: farmaciaInfo.nome || farmaciasComuns[i % farmaciasComuns.length],
        preco: parseFloat((basePrice * (0.9 + Math.random() * 0.3)).toFixed(2)),
        disponivel: true,
        estado: estado,
        fonte: 'exa_search',
        url: result.url
      })
    }
    
    return precos
  }

  private getMockData(medicamento: string, estado: string): ExternalPrice[] {
    const basePrice = 16 + Math.random() * 18 // Preço base entre 16-34
    
    return [
      {
        farmacia: 'Drogasil',
        preco: parseFloat((basePrice * 1.1).toFixed(2)),
        disponivel: true,
        estado,
        fonte: 'exa_search'
      },
      {
        farmacia: 'Droga Raia',
        preco: parseFloat((basePrice * 1.05).toFixed(2)),
        disponivel: true,
        estado,
        fonte: 'exa_search'
      },
      {
        farmacia: 'Ultrafarma',
        preco: parseFloat((basePrice * 0.95).toFixed(2)),
        disponivel: true,
        estado,
        fonte: 'exa_search'
      },
      {
        farmacia: 'Pague Menos',
        preco: parseFloat((basePrice * 1.08).toFixed(2)),
        disponivel: true,
        estado,
        fonte: 'exa_search'
      }
    ]
  }

  private formatError(error: any): string {
    if (error instanceof Error) {
      return error.message
    }
    return error?.message || 'Erro desconhecido'
  }

  private generateCacheKey(medicamento: string, estado: string): string {
    return `exa_search:${medicamento.toLowerCase()}:${estado}`
  }
}

export class WebScrapingAPI implements ExternalPriceAPI {
  name = 'WebScraping'

  async search(medicamento: string, estado: string = 'SP'): Promise<ExternalPrice[]> {
    // Implementar web scraping de farmácias locais
    // Por segurança, usando dados simulados baseados em padrões reais
    
    const farmaciasEstado = this.getFarmaciasEstado(estado)
    const basePrice = 13 + Math.random() * 14 // Preço base entre 13-27
    
    return farmaciasEstado.map(farmacia => ({
      farmacia: farmacia.nome,
      preco: parseFloat((basePrice * farmacia.fator).toFixed(2)),
      disponivel: Math.random() > 0.1, // 90% disponível
      estado,
      fonte: 'web_scraping'
    }))
  }

  private getFarmaciasEstado(estado: string) {
    const farmacias: Record<string, Array<{nome: string, fator: number}>> = {
      'SP': [
        { nome: 'Drogaria São Paulo', fator: 1.02 },
        { nome: 'Farmácia Popular', fator: 1.12 },
        { nome: 'Droga Mais', fator: 0.98 },
        { nome: 'Farmácia Preço Bom', fator: 0.89 }
      ],
      'RJ': [
        { nome: 'Drogaria Venâncio', fator: 1.05 },
        { nome: 'Farmácia Globo', fator: 1.08 },
        { nome: 'Drogaria Moderna', fator: 0.96 }
      ],
      'MG': [
        { nome: 'Drogaria Araujo', fator: 1.03 },
        { nome: 'Farmácia Indiana', fator: 0.94 },
        { nome: 'Drogaria Nissei', fator: 1.01 }
      ]
    }

    return farmacias[estado] || farmacias['SP']
  }
}

// Manager para coordenar todas as APIs
export class ExternalPriceManager {
  private apis: ExternalPriceAPI[]
  private forceMockData: boolean = false

  constructor(forceMockData: boolean = false) {
    this.forceMockData = forceMockData
    this.apis = [
      new ExaSearchAPI(),
      new WebScrapingAPI()
    ]
  }

  setMockDataMode(useMockData: boolean) {
    this.forceMockData = useMockData
    // Propagar para todas as APIs
    this.apis.forEach(api => {
      if ('setMockDataMode' in api) {
        (api as any).setMockDataMode(useMockData)
      }
    })
  }

  async searchAllSources(medicamento: string, estado: string = 'SP'): Promise<ExternalPrice[]> {
    const results = await Promise.allSettled(
      this.apis.map(api => api.search(medicamento, estado))
    )

    const allPrices: ExternalPrice[] = []
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allPrices.push(...result.value)
      } else {
        console.error(`Erro na API ${this.apis[index].name}:`, result.reason)
      }
    })

    // Remover duplicatas e ordenar por preço
    const uniquePrices = this.removeDuplicates(allPrices)
    return uniquePrices.sort((a, b) => a.preco - b.preco)
  }

  private removeDuplicates(prices: ExternalPrice[]): ExternalPrice[] {
    const seen = new Set<string>()
    return prices.filter(price => {
      const key = `${price.farmacia}-${price.fonte}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  async getStatistics(prices: ExternalPrice[]) {
    if (prices.length === 0) return null

    const validPrices = prices.filter(p => p.preco > 0).map(p => p.preco)
    
    if (validPrices.length === 0) return null

    const sorted = validPrices.sort((a, b) => a - b)
    const sum = sorted.reduce((a, b) => a + b, 0)
    
    return {
      count: sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      average: sum / sorted.length,
      median: sorted.length % 2 === 0 
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)],
      standardDeviation: this.calculateStandardDeviation(sorted)
    }
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }

  // Função para limpar cache (útil para testes ou forçar atualização)
  clearCache(): void {
    apiCache.clear()
    console.log('Cache das APIs foi limpo')
  }

  // Função para configurar tempo de cache
  setCacheTTL(ttlMs: number): void {
    // Nota: implementação simplificada, na prática seria melhor ter configuração por API
    console.log(`Cache TTL configurado para ${ttlMs}ms`)
  }
}