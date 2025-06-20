// Interface base para conectores ERP
export interface ERPConnector {
  name: string;
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  searchProducts(term: string): Promise<Product[]>;
  getProductByCode(code: string): Promise<Product | null>;
  getStock(productId: string): Promise<StockInfo>;
  syncProducts(lastSync?: Date): Promise<SyncResult>;
  updatePrice(productId: string, price: number): Promise<boolean>;
}

export interface Product {
  id: string;
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  manufacturer?: string;
  activeIngredient?: string;
  price: number;
  cost?: number;
  stock: number;
  minStock?: number;
  requiresPrescription: boolean;
  prescriptionType?: 'white' | 'blue' | 'yellow' | 'black';
  category?: string;
  lastUpdate: Date;
}

export interface StockInfo {
  productId: string;
  available: number;
  reserved: number;
  incoming: number;
  lastUpdate: Date;
}

export interface SyncResult {
  success: boolean;
  totalRecords: number;
  syncedRecords: number;
  errors: SyncError[];
  duration: number;
}

export interface SyncError {
  productId?: string;
  error: string;
  timestamp: Date;
}

// Classe base abstrata
export abstract class BaseERPConnector implements ERPConnector {
  protected config: any;
  protected connected: boolean = false;

  constructor(config: any) {
    this.config = config;
  }

  abstract name: string;
  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract searchProducts(term: string): Promise<Product[]>;
  abstract getProductByCode(code: string): Promise<Product | null>;
  abstract getStock(productId: string): Promise<StockInfo>;
  abstract syncProducts(lastSync?: Date): Promise<SyncResult>;
  abstract updatePrice(productId: string, price: number): Promise<boolean>;

  // Métodos auxiliares compartilhados
  protected async retry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retry(fn, retries - 1, delay * 2);
    }
  }

  protected normalizeProduct(rawProduct: any): Product {
    // Implementação padrão que pode ser sobrescrita
    return {
      id: rawProduct.id || rawProduct.codigo,
      code: rawProduct.codigo,
      barcode: rawProduct.codigo_barras,
      name: rawProduct.nome || rawProduct.descricao,
      description: rawProduct.descricao_completa,
      manufacturer: rawProduct.fabricante,
      activeIngredient: rawProduct.principio_ativo,
      price: parseFloat(rawProduct.preco_venda || rawProduct.preco),
      cost: rawProduct.preco_custo ? parseFloat(rawProduct.preco_custo) : undefined,
      stock: parseInt(rawProduct.estoque || rawProduct.quantidade || '0'),
      minStock: rawProduct.estoque_minimo,
      requiresPrescription: rawProduct.receita || false,
      prescriptionType: rawProduct.tipo_receita,
      category: rawProduct.categoria,
      lastUpdate: new Date()
    };
  }
} 