import axios, { AxiosInstance } from 'axios';
import { BaseERPConnector, Product, StockInfo, SyncResult } from './base-connector';

export class VetorFarmaConnector extends BaseERPConnector {
  name = 'Vetor Farma';
  private api: AxiosInstance;

  constructor(config: {
    baseUrl: string;
    apiKey: string;
    storeId: string;
    timeout?: number;
  }) {
    super(config);
    
    this.api = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 10000,
      headers: {
        'X-API-Key': config.apiKey,
        'X-Store-ID': config.storeId,
        'Content-Type': 'application/json'
      }
    });
  }

  async connect(): Promise<boolean> {
    try {
      const response = await this.api.get('/api/v1/health');
      this.connected = response.data.status === 'ok';
      return this.connected;
    } catch (error) {
      console.error('Erro ao conectar com Vetor Farma:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async searchProducts(term: string): Promise<Product[]> {
    try {
      const response = await this.retry(() =>
        this.api.post('/api/v1/produtos/buscar', {
          termo: term,
          limite: 20,
          incluirInativos: false
        })
      );

      return response.data.produtos.map((p: any) => this.normalizeProduct(p));
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }
  }

  async getProductByCode(code: string): Promise<Product | null> {
    try {
      const response = await this.api.get(`/api/v1/produtos/${code}`);
      return this.normalizeProduct(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getStock(productId: string): Promise<StockInfo> {
    try {
      const response = await this.api.get(`/api/v1/estoque/${productId}`);
      const data = response.data;
      
      return {
        productId,
        available: data.disponivel || 0,
        reserved: data.reservado || 0,
        incoming: data.entrada_prevista || 0,
        lastUpdate: new Date(data.ultima_atualizacao)
      };
    } catch (error) {
      console.error('Erro ao buscar estoque:', error);
      throw error;
    }
  }

  async syncProducts(lastSync?: Date): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: any[] = [];
    let totalRecords = 0;
    let syncedRecords = 0;

    try {
      // Buscar produtos modificados
      const response = await this.api.post('/api/v1/produtos/sincronizar', {
        dataUltimaSync: lastSync?.toISOString(),
        pagina: 1,
        itensPorPagina: 100
      });

      totalRecords = response.data.total;
      const totalPages = Math.ceil(totalRecords / 100);

      // Processar todas as páginas
      for (let page = 1; page <= totalPages; page++) {
        try {
          const pageResponse = await this.api.post('/api/v1/produtos/sincronizar', {
            dataUltimaSync: lastSync?.toISOString(),
            pagina: page,
            itensPorPagina: 100
          });

          // Aqui você salvaria os produtos no Supabase
          syncedRecords += pageResponse.data.produtos.length;
        } catch (error) {
          errors.push({
            error: `Erro na página ${page}: ${error}`,
            timestamp: new Date()
          });
        }
      }

      return {
        success: errors.length === 0,
        totalRecords,
        syncedRecords,
        errors,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        totalRecords: 0,
        syncedRecords: 0,
        errors: [{
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date()
        }],
        duration: Date.now() - startTime
      };
    }
  }

  async updatePrice(productId: string, price: number): Promise<boolean> {
    try {
      await this.api.put(`/api/v1/produtos/${productId}/preco`, {
        precoVenda: price,
        dataVigencia: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar preço:', error);
      return false;
    }
  }

  // Métodos específicos do Vetor Farma
  async getPriceHistory(productId: string, days: number = 30): Promise<any[]> {
    try {
      const response = await this.api.get(`/api/v1/produtos/${productId}/historico-precos`, {
        params: { dias: days }
      });
      return response.data.historico;
    } catch (error) {
      console.error('Erro ao buscar histórico de preços:', error);
      return [];
    }
  }

  async checkPromotion(productId: string): Promise<any> {
    try {
      const response = await this.api.get(`/api/v1/promocoes/produto/${productId}`);
      return response.data.promocao;
    } catch (error) {
      return null;
    }
  }
} 