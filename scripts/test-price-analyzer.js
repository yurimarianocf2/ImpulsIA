// Script de teste para o analisador de preços
// Execute com: node scripts/test-price-analyzer.js

require('dotenv').config({ path: '.env.local' });

const { ExternalPriceManager } = require('../src/lib/external-price-apis.ts');

async function testPriceAnalyzer() {
  console.log('=== Teste do Analisador de Preços ===\n');
  
  // Teste com dados mock
  console.log('1. Testando com dados MOCK...');
  try {
    const priceManager = new ExternalPriceManager();
    priceManager.setMockDataMode(true);
    
    const resultsMock = await priceManager.searchAllSources('Dipirona', 'SP');
    console.log('Resultados MOCK:', JSON.stringify(resultsMock, null, 2));
    console.log('✅ Dados mock funcionando\n');
  } catch (error) {
    console.error('❌ Erro com dados mock:', error.message);
  }
  
  // Teste com APIs reais (se configuradas)
  console.log('2. Testando com APIs REAIS...');
  try {
    const priceManager = new ExternalPriceManager();
    priceManager.setMockDataMode(false);
    
    const resultsReal = await priceManager.searchAllSources('Dipirona', 'SP');
    console.log('Resultados REAIS:', JSON.stringify(resultsReal, null, 2));
    console.log('✅ APIs reais funcionando\n');
  } catch (error) {
    console.error('❌ Erro com APIs reais:', error.message);
    console.log('ℹ️  Isso é esperado se as API keys não estiverem configuradas\n');
  }
  
  // Teste de cache
  console.log('3. Testando limpeza de cache...');
  try {
    const priceManager = new ExternalPriceManager();
    priceManager.clearCache();
    console.log('✅ Cache limpo com sucesso\n');
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error.message);
  }
  
  console.log('=== Fim dos testes ===');
}

// Executar testes
testPriceAnalyzer().catch(console.error);