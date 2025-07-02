#!/usr/bin/env node

/**
 * Script para testar o esquema consolidado do Supabase
 * Verifica se todas as tabelas, views e funções estão funcionando corretamente
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  console.log('Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const farmaciaId = '550e8400-e29b-41d4-a716-446655440000';

console.log('🧪 TESTANDO ESQUEMA CONSOLIDADO SUPABASE\n');

async function testConnection() {
  console.log('📡 Testando conexão com Supabase...');
  try {
    const { data, error } = await supabase
      .from('farmacias')
      .select('id, nome')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Conexão estabelecida com sucesso');
    console.log(`   Farmácia encontrada: ${data[0]?.nome || 'N/A'}\n`);
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    return false;
  }
}

async function testTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log(`❌ Tabela '${tableName}' não existe`);
      return false;
    }
    
    console.log(`✅ Tabela '${tableName}' existe e acessível`);
    return true;
  } catch (error) {
    console.log(`❌ Erro ao acessar tabela '${tableName}':`, error.message);
    return false;
  }
}

async function testViewExists(viewName) {
  try {
    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log(`❌ View '${viewName}' não existe`);
      return false;
    }
    
    console.log(`✅ View '${viewName}' existe e acessível`);
    return true;
  } catch (error) {
    console.log(`❌ Erro ao acessar view '${viewName}':`, error.message);
    return false;
  }
}

async function testMedicamentosTable() {
  console.log('🧬 Testando tabela medicamentos...');
  
  try {
    // Verificar estrutura
    const { data, error } = await supabase
      .from('medicamentos')
      .select('*')
      .eq('farmacia_id', farmaciaId)
      .limit(5);
    
    if (error) throw error;
    
    console.log(`✅ Tabela medicamentos funcionando (${data.length} registros encontrados)`);
    
    if (data.length > 0) {
      const sample = data[0];
      const expectedFields = ['id', 'farmacia_id', 'nome', 'validade', 'preco_venda', 'estoque_atual', 'status_validade', 'dias_para_vencer'];
      const missingFields = expectedFields.filter(field => !(field in sample));
      
      if (missingFields.length > 0) {
        console.log(`⚠️  Campos ausentes: ${missingFields.join(', ')}`);
      } else {
        console.log('✅ Todos os campos esperados estão presentes');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao testar medicamentos:', error.message);
    return false;
  }
}

async function testViewMedicamentosVencendo() {
  console.log('📅 Testando view medicamentos vencendo...');
  
  try {
    const { data, error } = await supabase
      .from('v_medicamentos_vencendo')
      .select('*')
      .eq('farmacia_id', farmaciaId)
      .limit(10);
    
    if (error) throw error;
    
    console.log(`✅ View medicamentos vencendo funcionando (${data.length} registros)`);
    
    if (data.length > 0) {
      console.log('   Exemplo de medicamento vencendo:');
      const exemplo = data[0];
      console.log(`   - ${exemplo.nome}`);
      console.log(`   - Validade: ${exemplo.validade}`);
      console.log(`   - Dias para vencer: ${exemplo.dias_para_vencer}`);
      console.log(`   - Status: ${exemplo.status_validade}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao testar view medicamentos vencendo:', error.message);
    return false;
  }
}

async function testAnalisePrecos() {
  console.log('💰 Testando tabela análises de preços...');
  
  try {
    const { data, error } = await supabase
      .from('analises_preco_consolidada')
      .select(`
        *,
        medicamentos!inner(nome, categoria)
      `)
      .eq('farmacia_id', farmaciaId)
      .limit(5);
    
    if (error) throw error;
    
    console.log(`✅ Análises de preços funcionando (${data.length} registros)`);
    
    if (data.length > 0) {
      const exemplo = data[0];
      console.log('   Exemplo de análise:');
      console.log(`   - Medicamento: ${exemplo.medicamentos.nome}`);
      console.log(`   - Preço local: R$ ${exemplo.preco_local}`);
      console.log(`   - Preço médio mercado: R$ ${exemplo.preco_medio_mercado || 'N/A'}`);
      console.log(`   - Posição: ${exemplo.posicao_competitiva || 'N/A'}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao testar análises de preços:', error.message);
    return false;
  }
}

async function testFunctions() {
  console.log('⚙️ Testando funções do banco...');
  
  try {
    // Testar função buscar_medicamentos
    const { data: searchData, error: searchError } = await supabase
      .rpc('buscar_medicamentos', {
        p_farmacia_id: farmaciaId,
        p_termo: 'dipirona',
        p_limit: 5
      });
    
    if (searchError) throw searchError;
    
    console.log(`✅ Função buscar_medicamentos funcionando (${searchData?.length || 0} resultados)`);
    
    // Testar função obter_medicamentos_vencendo
    const { data: expiringData, error: expiringError } = await supabase
      .rpc('obter_medicamentos_vencendo', {
        p_farmacia_id: farmaciaId,
        p_dias: 60
      });
    
    if (expiringError) throw expiringError;
    
    console.log(`✅ Função obter_medicamentos_vencendo funcionando (${expiringData?.length || 0} medicamentos)`);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao testar funções:', error.message);
    return false;
  }
}

async function testAPIEndpoints() {
  console.log('🔌 Testando endpoints da API...');
  
  try {
    // Testar endpoint de medicamentos vencendo
    const expiringResponse = await fetch(`http://localhost:3000/api/expiring-products?farmacia_id=${farmaciaId}`);
    
    if (expiringResponse.ok) {
      const expiringData = await expiringResponse.json();
      console.log(`✅ API medicamentos vencendo funcionando (${expiringData?.length || 0} itens)`);
    } else {
      console.log(`⚠️  API medicamentos vencendo retornou status: ${expiringResponse.status}`);
    }
    
    // Testar endpoint de histórico de análises
    const historyResponse = await fetch(`http://localhost:3000/api/price-analysis/history?farmacia_id=${farmaciaId}&limit=5`);
    
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      console.log(`✅ API histórico análises funcionando (${historyData?.data?.length || 0} registros)`);
    } else {
      console.log(`⚠️  API histórico análises retornou status: ${historyResponse.status}`);
    }
    
    return true;
  } catch (error) {
    console.log(`⚠️  Erro ao testar APIs (servidor pode estar offline): ${error.message}`);
    return false;
  }
}

async function testDataIntegrity() {
  console.log('🔍 Verificando integridade dos dados...');
  
  try {
    // Verificar se há medicamentos sem validade
    const { data: semValidade, error: error1 } = await supabase
      .from('medicamentos')
      .select('id, nome')
      .eq('farmacia_id', farmaciaId)
      .is('validade', null);
    
    if (error1) throw error1;
    
    if (semValidade.length > 0) {
      console.log(`⚠️  ${semValidade.length} medicamentos sem data de validade`);
    } else {
      console.log('✅ Todos os medicamentos têm data de validade');
    }
    
    // Verificar preços inconsistentes
    const { data: precosInvalidos, error: error2 } = await supabase
      .from('medicamentos')
      .select('id, nome, preco_custo, preco_venda')
      .eq('farmacia_id', farmaciaId)
      .not('preco_custo', 'is', null)
      .not('preco_venda', 'is', null);
    
    if (error2) throw error2;
    
    const precosProblema = precosInvalidos.filter(m => m.preco_custo >= m.preco_venda);
    
    if (precosProblema.length > 0) {
      console.log(`⚠️  ${precosProblema.length} medicamentos com preço de custo >= preço de venda`);
    } else {
      console.log('✅ Preços de medicamentos consistentes');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar integridade:', error.message);
    return false;
  }
}

async function generateReport() {
  console.log('📊 Gerando relatório consolidado...');
  
  try {
    // Contar registros por tabela
    const tabelas = ['medicamentos', 'analises_preco_consolidada', 'conversas_whatsapp', 'pedidos_consolidada'];
    const contadores = {};
    
    for (const tabela of tabelas) {
      try {
        const { count, error } = await supabase
          .from(tabela)
          .select('*', { count: 'exact', head: true })
          .eq('farmacia_id', farmaciaId);
        
        if (!error) {
          contadores[tabela] = count;
        }
      } catch (e) {
        contadores[tabela] = 'Erro';
      }
    }
    
    console.log('\n📋 RELATÓRIO CONSOLIDADO:');
    console.log('================================');
    console.log(`Farmácia ID: ${farmaciaId}`);
    console.log(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
    console.log('');
    console.log('Contadores por tabela:');
    Object.entries(contadores).forEach(([tabela, count]) => {
      console.log(`  ${tabela}: ${count}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error.message);
    return false;
  }
}

async function runAllTests() {
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  const tests = [
    { name: 'Conexão', fn: testConnection },
    { name: 'Tabela farmacias', fn: () => testTableExists('farmacias') },
    { name: 'Tabela medicamentos', fn: () => testTableExists('medicamentos') },
    { name: 'Tabela analises_preco_consolidada', fn: () => testTableExists('analises_preco_consolidada') },
    { name: 'View medicamentos vencendo', fn: () => testViewExists('v_medicamentos_vencendo') },
    { name: 'View medicamentos disponíveis', fn: () => testViewExists('v_medicamentos_disponiveis') },
    { name: 'Funcionalidade medicamentos', fn: testMedicamentosTable },
    { name: 'View medicamentos vencendo', fn: testViewMedicamentosVencendo },
    { name: 'Análises de preços', fn: testAnalisePrecos },
    { name: 'Funções do banco', fn: testFunctions },
    { name: 'Integridade dos dados', fn: testDataIntegrity },
    { name: 'Endpoints da API', fn: testAPIEndpoints }
  ];
  
  for (const test of tests) {
    results.total++;
    try {
      const success = await test.fn();
      if (success) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      console.error(`❌ Erro no teste ${test.name}:`, error.message);
      results.failed++;
    }
    console.log(''); // Linha em branco entre testes
  }
  
  await generateReport();
  
  console.log('\n🎯 RESULTADO FINAL:');
  console.log('===================');
  console.log(`✅ Testes aprovados: ${results.passed}`);
  console.log(`❌ Testes falharam: ${results.failed}`);
  console.log(`📊 Total executados: ${results.total}`);
  console.log(`📈 Taxa de sucesso: ${Math.round((results.passed / results.total) * 100)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! Esquema consolidado funcionando perfeitamente.');
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique os logs acima para detalhes.');
  }
  
  return results.failed === 0;
}

// Executar testes
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Erro crítico:', error);
    process.exit(1);
  });