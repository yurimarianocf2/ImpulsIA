import { useState, useEffect } from 'react';

interface TopProduct {
  name: string;
  margin: string;
  price: string;
  sales: string;
}

export function useTopProducts(farmaciaId?: string) {
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultFarmaciaId = farmaciaId || '550e8400-e29b-41d4-a716-446655440000';

  useEffect(() => {
    async function fetchTopProducts() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/top-products?farmacia_id=${defaultFarmaciaId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erro ao buscar produtos top margem:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        
        // Em caso de erro, manter lista vazia - dados reais são obrigatórios
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTopProducts();
  }, [defaultFarmaciaId]);

  const refetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/top-products?farmacia_id=${defaultFarmaciaId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao buscar produtos top margem:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      
      // Em caso de erro, manter lista vazia - dados reais são obrigatórios
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  return { products, loading, error, refetch: refetchProducts };
}