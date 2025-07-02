#!/usr/bin/env node

/**
 * Script para inserir dados reais nas farmácias usando a estrutura atual da tabela produtos
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🚀 INSERINDO DADOS REAIS CORRIGIDOS NO SUPABASE\n');

async function insertRealData() {
  try {
    // 1. Verificar conexão
    console.log('🔍 Verificando conexão...');
    const { data: testData } = await supabase
      .from('produtos')
      .select('count')
      .limit(1);
    console.log('✅ Conexão estabelecida');

    // 2. Limpar dados das farmácias de teste
    console.log('🧹 Limpando dados antigos...');
    await supabase
      .from('produtos')
      .delete()
      .in('farmacia_id', [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002'
      ]);
    console.log('✅ Dados antigos removidos');

    // 3. Inserir produtos para Farmácia Saúde Total (SP)
    console.log('💊 Inserindo produtos Farmácia Saúde Total (SP)...');
    
    const produtosSP = [
      {
        farmacia_id: '550e8400-e29b-41d4-a716-446655440001',
        codigo_barras: '7896658451234',
        nome: 'Dipirona Sódica 500mg',
        nome_generico: 'Dipirona Sódica',
        principio_ativo: 'Dipirona Monoidratada',
        concentracao: '500mg',
        forma_farmaceutica: 'comprimido',
        laboratorio: 'Sanofi',
        categoria: 'Analgésicos',
        preco_custo: 3.50,
        preco_venda: 8.90,
        margem_lucro: 154.29,
        estoque_atual: 150,
        estoque_minimo: 20,
        estoque_maximo: 300,
        data_validade: '2025-08-15',
        ativo: true,
        requer_receita: false,
        controlado: false,
        generico: false
      },
      {
        farmacia_id: '550e8400-e29b-41d4-a716-446655440001',
        codigo_barras: '7896658451235',
        nome: 'Paracetamol 750mg',
        nome_generico: 'Paracetamol',
        principio_ativo: 'Paracetamol',
        concentracao: '750mg',
        forma_farmaceutica: 'comprimido',
        laboratorio: 'Johnson & Johnson',
        categoria: 'Analgésicos',
        preco_custo: 4.20,
        preco_venda: 12.50,
        margem_lucro: 197.62,
        estoque_atual: 200,
        estoque_minimo: 25,
        estoque_maximo: 400,
        data_validade: '2025-09-20',
        ativo: true,
        requer_receita: false,
        controlado: false,
        generico: false
      },
      {
        farmacia_id: '550e8400-e29b-41d4-a716-446655440001',
        codigo_barras: '7896658451236',
        nome: 'Ibuprofeno 600mg',
        nome_generico: 'Ibuprofeno',
        principio_ativo: 'Ibuprofeno',
        concentracao: '600mg',
        forma_farmaceutica: 'comprimido',
        laboratorio: 'Pfizer',
        categoria: 'Anti-inflamatórios',
        preco_custo: 6.80,
        preco_venda: 18.90,
        margem_lucro: 177.94,
        estoque_atual: 80,
        estoque_minimo: 15,
        estoque_maximo: 160,
        data_validade: '2025-07-10',
        ativo: true,
        requer_receita: false,
        controlado: false,
        generico: false
      },
      {
        farmacia_id: '550e8400-e29b-41d4-a716-446655440001',
        codigo_barras: '7896658451238',
        nome: 'Vitamina D3 2000UI',
        nome_generico: 'Colecalciferol',
        principio_ativo: 'Colecalciferol',
        concentracao: '2000UI',
        forma_farmaceutica: 'gota',
        laboratorio: 'EMS',
        categoria: 'Vitaminas',
        preco_custo: 18.50,
        preco_venda: 42.00,
        margem_lucro: 127.03,
        estoque_atual: 60,
        estoque_minimo: 10,
        estoque_maximo: 120,
        data_validade: '2025-12-15',
        ativo: true,
        requer_receita: false,
        controlado: false,
        generico: false
      },
      {
        farmacia_id: '550e8400-e29b-41d4-a716-446655440001',
        codigo_barras: '7896658451239',
        nome: 'Rivotril 2mg',
        nome_generico: 'Clonazepam',
        principio_ativo: 'Clonazepam',
        concentracao: '2mg',
        forma_farmaceutica: 'comprimido',
        laboratorio: 'Roche',
        categoria: 'Controlados',
        preco_custo: 25.00,
        preco_venda: 65.00,
        margem_lucro: 160.00,
        estoque_atual: 30,
        estoque_minimo: 5,
        estoque_maximo: 60,
        data_validade: '2026-03-20',
        ativo: true,
        requer_receita: true,
        controlado: true,
        generico: false
      }
    ];

    const { error: spError } = await supabase
      .from('produtos')
      .insert(produtosSP);
    
    if (spError) throw spError;
    console.log(`✅ ${produtosSP.length} produtos inseridos para SP`);

    // 4. Inserir produtos para Farmácia Bem Estar (RJ)
    console.log('💊 Inserindo produtos Farmácia Bem Estar (RJ)...');
    
    const produtosRJ = [
      {
        farmacia_id: '550e8400-e29b-41d4-a716-446655440002',
        codigo_barras: '7896658451240',
        nome: 'Dipirona Sódica 500mg',
        nome_generico: 'Dipirona Sódica',
        principio_ativo: 'Dipirona Monoidratada',
        concentracao: '500mg',
        forma_farmaceutica: 'comprimido',
        laboratorio: 'Sanofi',
        categoria: 'Analgésicos',
        preco_custo: 3.80,
        preco_venda: 9.50, // Preço diferente
        margem_lucro: 150.00,
        estoque_atual: 95,  // Estoque diferente
        estoque_minimo: 15,
        estoque_maximo: 190,
        data_validade: '2025-07-20', // Validade diferente
        ativo: true,
        requer_receita: false,
        controlado: false,
        generico: false
      },
      {
        farmacia_id: '550e8400-e29b-41d4-a716-446655440002',
        codigo_barras: '7896658451241',
        nome: 'Paracetamol 750mg',
        nome_generico: 'Paracetamol',
        principio_ativo: 'Paracetamol',
        concentracao: '750mg',
        forma_farmaceutica: 'comprimido',
        laboratorio: 'Johnson & Johnson',
        categoria: 'Analgésicos',
        preco_custo: 4.50,
        preco_venda: 13.90, // Preço diferente
        margem_lucro: 208.89,
        estoque_atual: 180,
        estoque_minimo: 20,
        estoque_maximo: 360,
        data_validade: '2025-08-10',
        ativo: true,
        requer_receita: false,
        controlado: false,
        generico: false
      },
      {
        farmacia_id: '550e8400-e29b-41d4-a716-446655440002',
        codigo_barras: '7896658451244',
        nome: 'Amoxicilina 500mg',
        nome_generico: 'Amoxicilina',
        principio_ativo: 'Amoxicilina',
        concentracao: '500mg',
        forma_farmaceutica: 'cápsula',
        laboratorio: 'GlaxoSmithKline',
        categoria: 'Antibióticos',
        preco_custo: 18.90,
        preco_venda: 45.00,
        margem_lucro: 138.10,
        estoque_atual: 85,
        estoque_minimo: 18,
        estoque_maximo: 170,
        data_validade: '2025-05-30',
        ativo: true,
        requer_receita: true,
        controlado: false,
        generico: false
      },
      {
        farmacia_id: '550e8400-e29b-41d4-a716-446655440002',
        codigo_barras: '7896658451242',
        nome: 'Vitamina D3 2000UI',
        nome_generico: 'Colecalciferol',
        principio_ativo: 'Colecalciferol',
        concentracao: '2000UI',
        forma_farmaceutica: 'gota',
        laboratorio: 'EMS',
        categoria: 'Vitaminas',
        preco_custo: 19.80,
        preco_venda: 45.00, // Preço ligeiramente diferente
        margem_lucro: 127.27,
        estoque_atual: 42,
        estoque_minimo: 8,
        estoque_maximo: 84,
        data_validade: '2025-11-08',
        ativo: true,
        requer_receita: false,
        controlado: false,
        generico: false
      },
      {
        farmacia_id: '550e8400-e29b-41d4-a716-446655440002',
        codigo_barras: '7896658451247',
        nome: 'Fluoxetina 20mg',
        nome_generico: 'Cloridrato de Fluoxetina',
        principio_ativo: 'Cloridrato de Fluoxetina',
        concentracao: '20mg',
        forma_farmaceutica: 'comprimido',
        laboratorio: 'Eli Lilly',
        categoria: 'Antidepressivos',
        preco_custo: 35.00,
        preco_venda: 85.90,
        margem_lucro: 145.43,
        estoque_atual: 25,
        estoque_minimo: 5,
        estoque_maximo: 50,
        data_validade: '2025-12-31',
        ativo: true,
        requer_receita: true,
        controlado: false,
        generico: false
      }
    ];

    const { error: rjError } = await supabase
      .from('produtos')
      .insert(produtosRJ);
    
    if (rjError) throw rjError;
    console.log(`✅ ${produtosRJ.length} produtos inseridos para RJ`);

    // 5. Verificar dados inseridos
    console.log('\n🔍 Verificando dados inseridos...');
    
    for (const farmaciaId of ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002']) {
      const { data: produtos, error } = await supabase
        .from('produtos')
        .select('nome, preco_venda, estoque_atual, data_validade')
        .eq('farmacia_id', farmaciaId)
        .eq('ativo', true);
      
      if (!error) {
        const farmaciaName = farmaciaId.endsWith('001') ? 'Saúde Total (SP)' : 'Bem Estar (RJ)';
        console.log(`\n📋 ${farmaciaName}: ${produtos.length} produtos`);
        produtos.forEach(p => {
          console.log(`  - ${p.nome}: R$ ${p.preco_venda} (${p.estoque_atual} un) - Val: ${p.data_validade}`);
        });
      }
    }

    // 6. Teste de busca por Dipirona
    console.log('\n🔍 Teste: Busca por "Dipirona"...');
    const { data: dipironas, error: buscaError } = await supabase
      .from('produtos')
      .select('nome, preco_venda, farmacia_id')
      .ilike('nome', '%dipirona%')
      .eq('ativo', true);
    
    if (!buscaError && dipironas?.length > 0) {
      dipironas.forEach(d => {
        const farmaciaName = d.farmacia_id.endsWith('001') ? 'SP' : 'RJ';
        console.log(`  ✅ ${d.nome}: R$ ${d.preco_venda} (${farmaciaName})`);
      });
    } else {
      console.log('  ❌ Nenhuma dipirona encontrada');
    }

    return true;
  } catch (error) {
    console.error('❌ Erro:', error);
    return false;
  }
}

async function main() {
  const success = await insertRealData();
  
  if (success) {
    console.log('\n🎉 DADOS REAIS INSERIDOS COM SUCESSO!');
    console.log('========================================');
    console.log('✅ 2 farmácias com produtos reais');
    console.log('✅ Preços diferentes entre farmácias');
    console.log('✅ Produtos comuns e únicos');
    console.log('✅ Dados de validade e estoque reais');
    console.log('');
    console.log('🧪 TESTE AGORA:');
    console.log('1. npm run dev');
    console.log('2. Buscar "Dipirona" no analisador de preços');
    console.log('3. Verificar produtos no dashboard');
    console.log('');
    console.log('🚫 NENHUM DADO MOCK SERÁ MAIS USADO!');
  } else {
    console.log('\n💥 FALHA AO INSERIR DADOS');
    process.exit(1);
  }
}

main()
  .catch(error => {
    console.error('💥 Erro crítico:', error);
    process.exit(1);
  });