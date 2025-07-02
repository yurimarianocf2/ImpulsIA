// Script para adicionar produtos de exemplo no Supabase
// Execute com: node scripts/add-sample-products.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('Variáveis carregadas:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Configurada' : '❌ Não encontrada');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurada' : '❌ Não encontrada');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const produtosExemplo = [
  {
    farmacia_id: '550e8400-e29b-41d4-a716-446655440000',
    codigo_barras: '7891234567890',
    nome: 'Dipirona Monoidratada 500mg',
    descricao: 'Analgésico e antitérmico genérico',
    categoria: 'Medicamentos',
    subcategoria: 'Analgésicos',
    fabricante: 'EMS Genérico',
    principio_ativo: 'Dipirona Monoidratada',
    apresentacao: 'Comprimidos 500mg - Caixa com 20 comprimidos',
    preco_venda: 12.50,
    preco_custo: 8.00,
    margem_lucro: 36.00,
    estoque_atual: 150,
    estoque_minimo: 20,
    unidade: 'CX',
    requer_receita: false,
    ativo: true
  },
  {
    farmacia_id: '550e8400-e29b-41d4-a716-446655440000',
    codigo_barras: '7891234567891',
    nome: 'Paracetamol 750mg',
    descricao: 'Analgésico e antitérmico',
    categoria: 'Medicamentos',
    subcategoria: 'Analgésicos',
    fabricante: 'Medley',
    principio_ativo: 'Paracetamol',
    apresentacao: 'Comprimidos 750mg - Caixa com 20 comprimidos',
    preco_venda: 8.90,
    preco_custo: 5.50,
    margem_lucro: 38.20,
    estoque_atual: 200,
    estoque_minimo: 30,
    unidade: 'CX',
    requer_receita: false,
    ativo: true
  },
  {
    farmacia_id: '550e8400-e29b-41d4-a716-446655440000',
    codigo_barras: '7891234567892',
    nome: 'Ibuprofeno 600mg',
    descricao: 'Anti-inflamatório não esteroidal',
    categoria: 'Medicamentos',
    subcategoria: 'Anti-inflamatórios',
    fabricante: 'Germed',
    principio_ativo: 'Ibuprofeno',
    apresentacao: 'Comprimidos revestidos 600mg - Caixa com 20 comprimidos',
    preco_venda: 15.80,
    preco_custo: 10.20,
    margem_lucro: 35.44,
    estoque_atual: 80,
    estoque_minimo: 15,
    unidade: 'CX',
    requer_receita: false,
    ativo: true
  },
  {
    farmacia_id: '550e8400-e29b-41d4-a716-446655440000',
    codigo_barras: '7891234567893',
    nome: 'Dorflex',
    descricao: 'Relaxante muscular e analgésico',
    categoria: 'Medicamentos',
    subcategoria: 'Relaxantes Musculares',
    fabricante: 'Sanofi',
    principio_ativo: 'Dipirona + Orfenadrina + Cafeína',
    apresentacao: 'Comprimidos - Caixa com 20 comprimidos',
    preco_venda: 22.90,
    preco_custo: 15.60,
    margem_lucro: 31.88,
    estoque_atual: 60,
    estoque_minimo: 10,
    unidade: 'CX',
    requer_receita: false,
    ativo: true
  },
  {
    farmacia_id: '550e8400-e29b-41d4-a716-446655440000',
    codigo_barras: '7891234567894',
    nome: 'Buscopan',
    descricao: 'Antiespasmódico',
    categoria: 'Medicamentos',
    subcategoria: 'Antiespasmódicos',
    fabricante: 'Boehringer',
    principio_ativo: 'Butilbrometo de Escopolamina',
    apresentacao: 'Comprimidos 10mg - Caixa com 20 comprimidos',
    preco_venda: 18.40,
    preco_custo: 12.80,
    margem_lucro: 30.43,
    estoque_atual: 90,
    estoque_minimo: 12,
    unidade: 'CX',
    requer_receita: false,
    ativo: true
  }
];

async function adicionarProdutos() {
  console.log('=== Adicionando Produtos de Exemplo ===\n');
  
  try {
    // Verificar conexão com Supabase
    console.log('1. Testando conexão com Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('farmacias')
      .select('id, nome')
      .eq('id', '550e8400-e29b-41d4-a716-446655440000')
      .single();
    
    if (testError) {
      console.error('❌ Erro ao conectar com Supabase:', testError.message);
      return;
    }
    
    if (!testData) {
      console.error('❌ Farmácia não encontrada. Execute primeiro o script de setup do banco.');
      return;
    }
    
    console.log(`✅ Conectado à farmácia: ${testData.nome}\n`);
    
    // Verificar se já existem produtos
    console.log('2. Verificando produtos existentes...');
    const { data: existingProducts, error: checkError } = await supabase
      .from('produtos')
      .select('id, nome')
      .eq('farmacia_id', '550e8400-e29b-41d4-a716-446655440000');
    
    if (checkError) {
      console.error('❌ Erro ao verificar produtos:', checkError.message);
      return;
    }
    
    console.log(`ℹ️  Produtos existentes: ${existingProducts?.length || 0}\n`);
    
    // Inserir produtos de exemplo
    console.log('3. Inserindo produtos de exemplo...');
    const { data: insertedProducts, error: insertError } = await supabase
      .from('produtos')
      .insert(produtosExemplo)
      .select('id, nome, preco_venda');
    
    if (insertError) {
      console.error('❌ Erro ao inserir produtos:', insertError.message);
      return;
    }
    
    console.log('✅ Produtos inseridos com sucesso:');
    insertedProducts.forEach((produto, index) => {
      console.log(`   ${index + 1}. ${produto.nome} - R$ ${produto.preco_venda}`);
    });
    
    console.log(`\n📊 Total de produtos inseridos: ${insertedProducts.length}`);
    
    // Testar busca de produto
    console.log('\n4. Testando busca de produto...');
    const { data: searchResult, error: searchError } = await supabase
      .from('produtos')
      .select('*')
      .eq('farmacia_id', '550e8400-e29b-41d4-a716-446655440000')
      .ilike('nome', '%dipirona%')
      .limit(1)
      .single();
    
    if (searchError) {
      console.warn('⚠️  Aviso na busca:', searchError.message);
    } else if (searchResult) {
      console.log(`✅ Busca funcionando: Encontrado "${searchResult.nome}"`);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
  
  console.log('\n=== Fim da inserção ===');
}

// Executar script
adicionarProdutos().catch(console.error);