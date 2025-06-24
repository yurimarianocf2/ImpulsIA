// Script para testar conexão com Supabase
// Execute com: node scripts/test-supabase-connection.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  console.log('=== Teste de Conexão Supabase ===\n');
  
  // Teste com chave ANON primeiro
  console.log('1. Testando com chave ANON...');
  const supabaseAnon = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  try {
    const { data, error } = await supabaseAnon
      .from('farmacias')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Erro com chave ANON:', error.message);
    } else {
      console.log('✅ Chave ANON funcionando. Farmácias na tabela:', data || 'N/A');
    }
  } catch (err) {
    console.log('❌ Erro na conexão ANON:', err.message);
  }
  
  // Teste com chave SERVICE ROLE
  console.log('\n2. Testando com chave SERVICE ROLE...');
  const supabaseService = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    const { data, error } = await supabaseService
      .from('farmacias')
      .select('id, nome')
      .limit(5);
    
    if (error) {
      console.log('❌ Erro com chave SERVICE:', error.message);
    } else {
      console.log('✅ Chave SERVICE funcionando. Farmácias encontradas:');
      if (data && data.length > 0) {
        data.forEach(farmacia => {
          console.log(`   - ${farmacia.nome} (${farmacia.id})`);
        });
      } else {
        console.log('   Nenhuma farmácia encontrada na tabela');
      }
    }
  } catch (err) {
    console.log('❌ Erro na conexão SERVICE:', err.message);
  }
  
  // Verificar se a farmácia específica existe
  console.log('\n3. Verificando farmácia específica...');
  const farmaciaId = '550e8400-e29b-41d4-a716-446655440000';
  
  try {
    const { data, error } = await supabaseService
      .from('farmacias')
      .select('*')
      .eq('id', farmaciaId)
      .single();
    
    if (error) {
      console.log('❌ Farmácia não encontrada:', error.message);
      console.log('ℹ️  Será necessário criar a farmácia primeiro');
    } else {
      console.log('✅ Farmácia encontrada:', data.nome);
    }
  } catch (err) {
    console.log('❌ Erro ao verificar farmácia:', err.message);
  }
  
  console.log('\n=== Fim do teste ===');
}

testConnection().catch(console.error);