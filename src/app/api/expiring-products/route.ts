import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, PERMISSIONS } from '@/lib/auth';

async function handleExpiringProducts(request: NextRequest) {
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
    // Primeiro tenta usar o esquema novo (medicamentos)
    let { data, error }: { data: any[] | null, error: any } = await supabase
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
          })) || null;
        }
      } else {
        data = resultValidade.data?.map(product => ({
          ...product,
          dias_para_vencer: Math.ceil((new Date(product.validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
          status_validade: new Date(product.validade) < new Date() ? 'vencido' : 
                          new Date(product.validade) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'vencendo' : 'ok'
        })) || null;
      }
    } else if (error) {
      throw error;
    }

    // Função para calcular desconto inteligente baseado em múltiplos fatores
    const calcularDescontoInteligente = (medicamento: any) => {
      const diasVencer = medicamento.dias_para_vencer;
      const estoque = medicamento.estoque_atual || 0;
      const margemLucro = medicamento.margem_lucro || 0;
      const precoVenda = medicamento.preco_venda || 0;
      const valorTotalEstoque = estoque * precoVenda;

      // Se já vencido, desconto máximo para liquidar
      if (diasVencer < 0) {
        const descontoBase = Math.min(70, margemLucro * 0.8); // Até 70% ou 80% da margem
        return {
          desconto: Math.round(descontoBase),
          estrategia: 'LIQUIDAÇÃO',
          justificativa: 'Produto vencido - liquidar imediatamente'
        };
      }

      // Fatores de cálculo
      let descontoBase = 0;
      let estrategia = '';
      let justificativa = '';

      // 1. Fator URGÊNCIA (dias para vencer)
      if (diasVencer <= 3) {
        descontoBase = 50; // Desconto alto para urgência extrema
        estrategia = 'QUEIMA DE ESTOQUE';
      } else if (diasVencer <= 7) {
        descontoBase = 35; // Desconto alto para urgência crítica
        estrategia = 'PROMOÇÃO FLASH';
      } else if (diasVencer <= 15) {
        descontoBase = 25; // Desconto médio para urgência alta
        estrategia = 'PROMOÇÃO SEMANAL';
      } else if (diasVencer <= 30) {
        descontoBase = 15; // Desconto baixo para urgência média
        estrategia = 'PROMOÇÃO MENSAL';
      } else {
        descontoBase = 5; // Desconto mínimo
        estrategia = 'MONITORAMENTO';
      }

      // 2. Fator ESTOQUE (quanto mais estoque, maior o desconto)
      let fatorEstoque = 1;
      if (estoque > 100) {
        fatorEstoque = 1.4; // +40% se estoque muito alto
        justificativa += 'Alto estoque + ';
      } else if (estoque > 50) {
        fatorEstoque = 1.2; // +20% se estoque alto
        justificativa += 'Estoque elevado + ';
      } else if (estoque > 20) {
        fatorEstoque = 1.1; // +10% se estoque médio
      }

      // 3. Fator VALOR TOTAL (produtos com maior valor em estoque precisam sair mais rápido)
      if (valorTotalEstoque > 2000) {
        fatorEstoque *= 1.2; // +20% adicional para alto valor em estoque
        justificativa += 'Alto valor em estoque + ';
      } else if (valorTotalEstoque > 1000) {
        fatorEstoque *= 1.1; // +10% adicional
      }

      // 4. Limitar desconto pela margem de lucro (não vender no prejuízo)
      const descontoCalculado = Math.round(descontoBase * fatorEstoque);
      const descontoFinal = Math.min(descontoCalculado, margemLucro * 0.9); // Máximo 90% da margem

      // Finalizar justificativa
      justificativa += `${diasVencer} dias restantes`;
      if (descontoFinal !== descontoCalculado) {
        justificativa += ' (limitado pela margem)';
      }

      return {
        desconto: Math.max(5, Math.round(descontoFinal)), // Mínimo 5%
        estrategia,
        justificativa: justificativa.trim()
      };
    };

    // Enriquecer dados com informações calculadas
    const enrichedData = data?.map(medicamento => {
      const descontoInfo = calcularDescontoInteligente(medicamento);
      const precoComDesconto = medicamento.preco_venda * (1 - descontoInfo.desconto / 100);
      
      return {
        ...medicamento,
        urgencia: medicamento.dias_para_vencer <= 7 ? 'critica' : 
                  medicamento.dias_para_vencer <= 30 ? 'alta' : 'media',
        valor_total_estoque: medicamento.estoque_atual * medicamento.preco_venda,
        // Nova recomendação inteligente com desconto sugerido
        recomendacao: medicamento.dias_para_vencer < 0 
          ? `${descontoInfo.estrategia}: Desconto ${descontoInfo.desconto}% (R$ ${precoComDesconto.toFixed(2)})`
          : `${descontoInfo.estrategia}: Desconto ${descontoInfo.desconto}% (R$ ${precoComDesconto.toFixed(2)})`,
        // Campos adicionais para análise
        desconto_sugerido: descontoInfo.desconto,
        preco_promocional: precoComDesconto,
        estrategia_venda: descontoInfo.estrategia,
        justificativa_desconto: descontoInfo.justificativa
      };
    });

    return NextResponse.json(enrichedData || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Exportar a função protegida por autenticação
export const GET = withAuth(handleExpiringProducts, {
  requireFarmaciaAccess: false, // Já validado pelo middleware
  requiredPermissions: [PERMISSIONS.PRODUCTS_READ, PERMISSIONS.DASHBOARD_ACCESS]
});