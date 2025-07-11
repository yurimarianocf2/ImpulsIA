/**
 * Store Context - Gerenciamento centralizado do ID da loja
 * Fornece identificação consistente da loja ativa em toda a aplicação
 */

// ID padrão da loja para desenvolvimento/fallback
const DEFAULT_STORE_ID = '550e8400-e29b-41d4-a716-446655440000';

/**
 * Retorna o ID da loja atual
 */
export function getCurrentStoreId(): string {
  // Para desenvolvimento: verificar environment
  const envStoreId = process.env.NEXT_PUBLIC_STORE_ID;
  if (envStoreId) {
    return envStoreId;
  }
  
  return DEFAULT_STORE_ID;
}

/**
 * Informações básicas da loja
 */
export interface StoreContext {
  id: string;
  nome?: string;
  ativo: boolean;
}

/**
 * Retorna contexto básico da loja
 */
export function getStoreContext(): StoreContext {
  return {
    id: getCurrentStoreId(),
    ativo: true
  };
}

/**
 * Lista de lojas de desenvolvimento/teste
 */
export const DEVELOPMENT_STORES = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'Loja Exemplo A',
    business_id: 'STORE001'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    nome: 'Loja Exemplo B',
    business_id: 'STORE002'
  }
] as const;