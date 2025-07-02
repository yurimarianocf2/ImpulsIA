// Script para debug de produtos próximos ao vencimento
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function debugExpiringProducts() {
  console.log('=== Debug Produtos Próximos ao Vencimento ===\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const farmaciaId = '550e8400-e29b-41d4-a716-446655440000';
  
  // 1. Verificar se existem produtos na tabela
  console.log('1. Verificando produtos na tabela...');
  try {
    const { data: allProducts, error: allError } = await supabase
      .from('produtos')
      .select('id, nome, validade, farmacia_id')
      .eq('farmacia_id', farmaciaId);
    
    if (allError) {
      console.log('❌ Erro ao buscar produtos:', allError.message);
      return;
    }
    
    console.log(`✅ Total de produtos encontrados: ${allProducts?.length || 0}`);
    if (allProducts && allProducts.length > 0) {
      console.log('Produtos encontrados:');
      allProducts.forEach(p => {
        console.log(`   - ${p.nome} (Validade: ${p.validade || 'NÃO DEFINIDA'})`);
      });
    }
  } catch (err) {
    console.log('❌ Erro:', err.message);
  }
  
  // 2. Verificar schema da tabela produtos
  console.log('\n2. Verificando schema da tabela produtos...');
  try {
    const { data: columns, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'produtos' })
      .single();
    
    if (schemaError) {
      console.log('⚠️ Não foi possível verificar schema automaticamente');
    } else if (columns) {
      console.log('✅ Schema verificado:', columns);
    }
  } catch (err) {
    console.log('⚠️ Schema check não disponível, continuando...');
  }
  
  // 3. Tentar diferentes formas de buscar produtos próximos ao vencimento
  console.log('\n3. Testando busca por produtos próximos ao vencimento...');
  
  const dateLimit = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  console.log(`   Data limite: ${dateLimit}`);
  
  // Tentar com coluna 'validade'
  try {
    const { data: expiringProducts, error: expiringError } = await supabase
      .from('produtos')
      .select('*')
      .eq('farmacia_id', farmaciaId)
      .not('validade', 'is', null)
      .lt('validade', dateLimit)
      .order('validade', { ascending: true });
    
    if (expiringError) {
      console.log('❌ Erro ao buscar produtos próximos ao vencimento:', expiringError.message);
      console.log('   Código do erro:', expiringError.code);
    } else {
      console.log(`✅ Produtos próximos ao vencimento: ${expiringProducts?.length || 0}`);
      if (expiringProducts && expiringProducts.length > 0) {
        expiringProducts.forEach(p => {
          const daysLeft = Math.ceil((new Date(p.validade) - new Date()) / (1000 * 60 * 60 * 24));
          console.log(`   - ${p.nome}: ${p.validade} (${daysLeft} dias)`);
        });
      }
    }
  } catch (err) {
    console.log('❌ Erro na busca:', err.message);
  }
  
  // 4. Adicionar produtos de teste com validade se não existirem
  console.log('\n4. Verificando se precisamos adicionar produtos de teste...');
  try {
    const { data: testProducts, error: testError } = await supabase
      .from('produtos')
      .select('id')
      .eq('farmacia_id', farmaciaId)
      .not('validade', 'is', null);
    
    if (!testError && (!testProducts || testProducts.length === 0)) {
      console.log('ℹ️ Adicionando produtos de teste com validade...');
      
      const sampleProducts = [
        {
          farmacia_id: farmaciaId,
          nome: 'Paracetamol 500mg - Teste',
          preco_venda: 12.50,
          preco_custo: 8.75,
          estoque_atual: 25,
          validade: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 dias
          ativo: true
        },
        {
          farmacia_id: farmaciaId,
          nome: 'Dipirona 500mg - Teste',
          preco_venda: 15.90,
          preco_custo: 11.13,
          estoque_atual: 30,
          validade: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 45 dias
          ativo: true
        },
        {
          farmacia_id: farmaciaId,
          nome: 'Ibuprofeno 600mg - Teste',
          preco_venda: 22.80,
          preco_custo: 15.96,
          estoque_atual: 15,
          validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias
          ativo: true
        }
      ];
      
      const { data: insertedProducts, error: insertError } = await supabase
        .from('produtos')
        .insert(sampleProducts)
        .select();
      
      if (insertError) {
        console.log('❌ Erro ao inserir produtos de teste:', insertError.message);
      } else {
        console.log('✅ Produtos de teste adicionados:', insertedProducts?.length || 0);
      }
    } else {
      console.log('✅ Já existem produtos com validade definida');
    }
  } catch (err) {
    console.log('❌ Erro ao verificar/adicionar produtos de teste:', err.message);
  }
  
  console.log('\n=== Fim do debug ===');
}

debugExpiringProducts().catch(console.error);