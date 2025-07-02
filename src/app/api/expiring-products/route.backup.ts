import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const farmaciaId = searchParams.get('farmacia_id') || '550e8400-e29b-41d4-a716-446655440000';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Supabase environment variables not set' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Use the new consolidated table and view
    const { data, error } = await supabase
      .from('v_medicamentos_vencendo')
      .select(`
        id,
        nome,
        principio_ativo,
        categoria,
        preco_venda,
        estoque_atual,
        validade,
        dias_para_vencer,
        status_validade,
        lote,
        farmacia_nome
      `)
      .eq('farmacia_id', farmaciaId)
      .lte('dias_para_vencer', 60)
      .order('validade', { ascending: true });

    if (error) {
      console.error('Error fetching expiring products:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich data with additional calculated fields
    const enrichedData = data?.map(medicamento => ({
      ...medicamento,
      urgencia: medicamento.dias_para_vencer <= 7 ? 'critica' : 
                medicamento.dias_para_vencer <= 30 ? 'alta' : 'media',
      valor_total_estoque: medicamento.estoque_atual * medicamento.preco_venda,
      recomendacao: medicamento.dias_para_vencer < 0 ? 'Retirar do estoque imediatamente' :
                   medicamento.dias_para_vencer <= 7 ? 'Promover desconto urgente' :
                   medicamento.dias_para_vencer <= 30 ? 'Considerar promoção' :
                   'Monitorar regularmente'
    }));

    return NextResponse.json(enrichedData || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
