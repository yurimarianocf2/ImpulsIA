import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, PERMISSIONS } from '@/lib/auth';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';

async function handleDashboardMetrics(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Obter farmacia_id dos headers (definido pelo middleware de auth)
  const farmaciaId = request.headers.get('x-farmacia-id');
  
  if (!farmaciaId) {
    return NextResponse.json(
      { error: 'farmacia_id não encontrado no contexto de autenticação' },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Supabase environment variables not set' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Verificar qual tabela de produtos usar (medicamentos ou produtos)
    let produtosTable = 'medicamentos';
    const { data: testMedicamentos, error: testError } = await supabase
      .from('medicamentos')
      .select('id')
      .limit(1);

    if (testError && testError.code === '42P01') {
      produtosTable = 'produtos';
    }

    // Métricas em paralelo
    const [
      { count: produtosCount },
      { count: expiringCount }
    ] = await Promise.all([
      // Contar produtos ativos
      supabase
        .from(produtosTable)
        .select('*', { count: 'exact', head: true })
        .eq('farmacia_id', farmaciaId)
        .eq('ativo', true),
      
      // Contar produtos vencendo (próximos 60 dias)
      supabase
        .from(produtosTable)
        .select('*', { count: 'exact', head: true })
        .eq('farmacia_id', farmaciaId)
        .not('validade', 'is', null)
        .lt('validade', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    ]);

    // Para vendas, tentar usar pedidos primeiro, depois analises_preco como proxy
    let vendasHoje = 'R$ 0';
    let clientesTotal = '0';

    try {
      const { data: vendasData } = await supabase
        .from('pedidos')
        .select('valor_total')
        .eq('farmacia_id', farmaciaId)
        .gte('created_at', new Date().toISOString().split('T')[0]);

      if (vendasData && vendasData.length > 0) {
        const total = vendasData.reduce((sum, venda) => sum + (venda.valor_total || 0), 0);
        vendasHoje = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(total);
      }
    } catch (error) {
      // Se não houver tabela de pedidos, usar dados de análise de preços como proxy
      const { count: analisesCount } = await supabase
        .from('analises_preco')
        .select('*', { count: 'exact', head: true })
        .eq('farmacia_id', farmaciaId)
        .gte('created_at', new Date().toISOString().split('T')[0]);

      if (analisesCount) {
        vendasHoje = `R$ ${(analisesCount * 50).toFixed(0)}`; // Estimativa baseada em análises
      }
    }

    const metrics = {
      vendas_hoje: vendasHoje,
      produtos_total: produtosCount?.toString() || '0',
      clientes_total: clientesTotal,
      produtos_vencendo: expiringCount?.toString() || '0'
    };

    return NextResponse.json(metrics);

  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Exportar a função protegida por autenticação e rate limiting
export const GET = withRateLimit(
  withAuth(handleDashboardMetrics, {
    requireFarmaciaAccess: false, // Já validado pelo middleware
    requiredPermissions: [PERMISSIONS.METRICS_READ, PERMISSIONS.DASHBOARD_ACCESS]
  }),
  RATE_LIMIT_CONFIGS.CRITICAL,
  (request) => request.headers.get('x-farmacia-id') || undefined
);