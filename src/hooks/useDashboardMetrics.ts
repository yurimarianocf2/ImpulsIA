import { useState, useEffect } from 'react';

interface DashboardMetrics {
  vendas_hoje: string;
  produtos_total: string;
  clientes_total: string;
  produtos_vencendo: string;
}

export function useDashboardMetrics(farmaciaId?: string) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultFarmaciaId = farmaciaId || '550e8400-e29b-41d4-a716-446655440000';

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/dashboard-metrics?farmacia_id=${defaultFarmaciaId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        setMetrics(data);
      } catch (err) {
        console.error('Erro ao buscar métricas:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        
        // Fallback para dados padrão em caso de erro
        setMetrics({
          vendas_hoje: 'R$ 0',
          produtos_total: '0',
          clientes_total: '0',
          produtos_vencendo: '0'
        });
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [defaultFarmaciaId]);

  const refetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/dashboard-metrics?farmacia_id=${defaultFarmaciaId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setMetrics(data);
    } catch (err) {
      console.error('Erro ao buscar métricas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      
      // Fallback para dados padrão em caso de erro
      setMetrics({
        vendas_hoje: 'R$ 0',
        produtos_total: '0',
        clientes_total: '0',
        produtos_vencendo: '0'
      });
    } finally {
      setLoading(false);
    }
  };

  return { metrics, loading, error, refetch: refetchMetrics };
}