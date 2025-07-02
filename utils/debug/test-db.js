require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testDB() {
  console.log('🔍 Testando conexão com Supabase...\n');
  
  // Verificar variáveis de ambiente
  console.log('📋 Variáveis de ambiente:');
  console.log('   URL:', process.env.SUPABASE_URL ? '✅ OK' : '❌ MISSING');
  console.log('   ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ OK' : '❌ MISSING');
  console.log('   SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ OK' : '❌ MISSING');
  console.log();

  // Teste com chave ANON
  console.log('🔑 Testando com chave ANON...');
  const supabaseAnon = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  try {
    const { data, error } = await supabaseAnon.from('farmacias').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('   ❌ Erro:', error.message);
    } else {
      console.log('   ✅ Conexão ANON funcionando!');
      console.log('   📊 Contagem:', data || 0);
    }
  } catch (err) {
    console.log('   ❌ Erro de conexão:', err.message);
  }
  
  console.log();

  // Teste com chave SERVICE
  console.log('🔐 Testando com chave SERVICE...');
  const supabaseService = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    const { data, error } = await supabaseService.from('farmacias').select('id, nome').limit(3);
    
    if (error) {
      console.log('   ❌ Erro:', error.message);
    } else {
      console.log('   ✅ Conexão SERVICE funcionando!');
      if (data && data.length > 0) {
        console.log('   📋 Farmácias encontradas:');
        data.forEach(f => console.log(`      - ${f.nome} (${f.id})`));
      } else {
        console.log('   📋 Nenhuma farmácia encontrada');
      }
    }
  } catch (err) {
    console.log('   ❌ Erro de conexão:', err.message);
  }

  console.log();

  // Verificar farmácia específica
  console.log('🏪 Verificando farmácia específica...');
  const farmaciaId = process.env.NEXT_PUBLIC_FARMACIA_ID;
  
  try {
    const { data, error } = await supabaseService
      .from('farmacias')
      .select('*')
      .eq('id', farmaciaId)
      .single();
    
    if (error) {
      console.log('   ❌ Farmácia não encontrada:', error.message);
      console.log('   💡 Dica: Execute o script de setup para criar a farmácia');
    } else {
      console.log('   ✅ Farmácia encontrada:', data.nome);
    }
  } catch (err) {
    console.log('   ❌ Erro:', err.message);
  }

  console.log('\n🏁 Teste finalizado!');
}

testDB().catch(console.error); 