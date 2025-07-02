// Script de teste para EXA Search API
// Execute com: node scripts/test-exa-search.js

require('dotenv').config({ path: '.env.local' });

async function testExaSearch() {
  console.log('=== Teste do EXA Search para Preços de Medicamentos ===\n');
  
  try {
    // Importar dinamicamente a classe EXA
    const { ExaSearchAPI } = await import('../src/lib/external-price-apis.ts');
    
    const exaApi = new ExaSearchAPI();
    
    console.log('1. Testando com dados MOCK (sem API key)...');
    exaApi.setMockDataMode(true);
    
    const resultsMock = await exaApi.search('Dipirona', 'SP');
    console.log('Resultados MOCK:', JSON.stringify(resultsMock, null, 2));
    console.log('✅ Dados mock funcionando\n');
    
    console.log('2. Testando busca real do EXA (se API key configurada)...');
    exaApi.setMockDataMode(false);
    
    if (process.env.EXA_API_KEY && process.env.EXA_API_KEY !== 'your_exa_api_key_here') {
      console.log('API Key encontrada, testando busca real...');
      
      const resultsReal = await exaApi.search('Paracetamol', 'SP');
      console.log('Resultados REAIS EXA:', JSON.stringify(resultsReal, null, 2));
      console.log('✅ EXA Search funcionando\n');
    } else {
      console.log('ℹ️  EXA API Key não configurada, pulando teste real');
      console.log('Para testar com dados reais, configure EXA_API_KEY no .env.local\n');
    }
    
    console.log('3. Testando diferentes medicamentos...');
    const medicamentos = ['Ibuprofeno', 'Omeprazol', 'Vitamina C'];
    
    for (const medicamento of medicamentos) {
      console.log(`Testando: ${medicamento}`);
      const results = await exaApi.search(medicamento, 'RJ');
      console.log(`- Encontrados ${results.length} preços para ${medicamento}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error('Stack:', error.stack);
  }
  
  console.log('\n=== Fim dos testes EXA ===');
}

// Executar testes
testExaSearch().catch(console.error);