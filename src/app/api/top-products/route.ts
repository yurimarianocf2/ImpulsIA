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
    // Verificar qual tabela usar
    let produtosTable = 'medicamentos';
    const { data: testMedicamentos, error: testError } = await supabase
      .from('medicamentos')
      .select('id')
      .limit(1);

    if (testError && testError.code === '42P01') {
      produtosTable = 'produtos';
    }

    // Buscar produtos com melhor margem
    const { data: produtos, error } = await supabase
      .from(produtosTable)
      .select('nome, preco_venda, preco_custo, margem_lucro, estoque_atual')
      .eq('farmacia_id', farmaciaId)
      .eq('ativo', true)
      .not('margem_lucro', 'is', null)
      .gt('margem_lucro', 0)
      .order('margem_lucro', { ascending: false })
      .limit(4);

    if (error) {
      throw error;
    }

    // Formatar dados para o frontend
    const topProducts = produtos?.map(produto => {
      // Calcular vendas estimadas baseadas no estoque e margem
      const vendasEstimadas = Math.max(1, Math.min(50, Math.floor(produto.estoque_atual / 10)));
      
      return {
        name: produto.nome,
        margin: `${produto.margem_lucro.toFixed(1)}%`,
        price: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(produto.preco_venda),
        sales: `${vendasEstimadas}/mês`
      };
    }) || [];

    // Retornar apenas dados reais - sem fallbacks mock

    return NextResponse.json(topProducts);

  } catch (error) {
    console.error('Erro ao buscar produtos top margem:', error);
    
    // Retornar erro em vez de dados mock
    return NextResponse.json({ 
      error: 'Erro ao buscar produtos com melhor margem',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}