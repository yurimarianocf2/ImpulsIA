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
    // Primeiro tenta usar o esquema novo (medicamentos)
    let { data, error } = await supabase
      .from('medicamentos')
      .select('*')
      .eq('farmacia_id', farmaciaId)
      .not('validade', 'is', null)
      .lt('validade', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('validade', { ascending: true });

    // Se tabela medicamentos não existir, usa produtos (esquema antigo)
    if (error && error.code === '42P01') {
      console.log('Tabela medicamentos não existe, tentando produtos...');
      
      // Tentar com 'validade'
      const resultValidade = await supabase
        .from('produtos')
        .select('*')
        .eq('farmacia_id', farmaciaId)
        .not('validade', 'is', null)
        .lt('validade', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('validade', { ascending: true });

      if (resultValidade.error && resultValidade.error.code === '42703') {
        // Tentar com 'data_validade'
        const resultDataValidade = await supabase
          .from('produtos')
          .select('*')
          .eq('farmacia_id', farmaciaId)
          .not('data_validade', 'is', null)
          .lt('data_validade', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('data_validade', { ascending: true });

        if (resultDataValidade.error && resultDataValidade.error.code === '42703') {
          // Tentar com 'data_vencimento'
          const resultDataVencimento = await supabase
            .from('produtos')
            .select('*')
            .eq('farmacia_id', farmaciaId)
            .not('data_vencimento', 'is', null)
            .lt('data_vencimento', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('data_vencimento', { ascending: true });

          if (resultDataVencimento.error) {
            throw new Error('Nenhuma coluna de data válida encontrada');
          }

          data = resultDataVencimento.data?.map(product => ({
            ...product,
            validade: product.data_vencimento,
            dias_para_vencer: Math.ceil((new Date(product.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
            status_validade: new Date(product.data_vencimento) < new Date() ? 'vencido' : 
                            new Date(product.data_vencimento) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'vencendo' : 'ok'
          }));
        } else {
          data = resultDataValidade.data?.map(product => ({
            ...product,
            validade: product.data_validade,
            dias_para_vencer: Math.ceil((new Date(product.data_validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
            status_validade: new Date(product.data_validade) < new Date() ? 'vencido' : 
                            new Date(product.data_validade) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'vencendo' : 'ok'
          }));
        }
      } else {
        data = resultValidade.data?.map(product => ({
          ...product,
          dias_para_vencer: Math.ceil((new Date(product.validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
          status_validade: new Date(product.validade) < new Date() ? 'vencido' : 
                          new Date(product.validade) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'vencendo' : 'ok'
        }));
      }
    } else if (error) {
      throw error;
    }

    // Enriquecer dados com informações calculadas
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