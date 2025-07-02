// Script para verificar schema da tabela produtos
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkProductsSchema() {
  console.log('=== Verificação Schema Produtos ===\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Buscar um produto para ver quais colunas existem
  console.log('1. Verificando colunas existentes na tabela produtos...');
  try {
    const { data: sampleProduct, error } = await supabase
      .from('produtos')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Erro ao buscar produto:', error.message);
      return;
    }
    
    if (sampleProduct && sampleProduct.length > 0) {
      console.log('✅ Colunas encontradas na tabela produtos:');
      Object.keys(sampleProduct[0]).forEach(column => {
        console.log(`   - ${column}: ${typeof sampleProduct[0][column]} (${sampleProduct[0][column]})`);
      });
    } else {
      console.log('⚠️ Nenhum produto encontrado na tabela');
    }
  } catch (err) {
    console.log('❌ Erro:', err.message);
  }
  
  // Verificar se existe coluna de data relacionada a vencimento
  console.log('\n2. Verificando colunas de data...');
  try {
    const { data: products, error } = await supabase
      .from('produtos')
      .select('*')
      .limit(3);
    
    if (!error && products && products.length > 0) {
      const product = products[0];
      const dateColumns = Object.keys(product).filter(key => {
        const value = product[key];
        return key.toLowerCase().includes('data') || 
               key.toLowerCase().includes('validade') || 
               key.toLowerCase().includes('vencimento') ||
               (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/));
      });
      
      console.log('Possíveis colunas de data encontradas:');
      dateColumns.forEach(col => {
        console.log(`   - ${col}: ${product[col]}`);
      });
      
      if (dateColumns.length === 0) {
        console.log('⚠️ Nenhuma coluna de data/validade encontrada');
      }
    }
  } catch (err) {
    console.log('❌ Erro ao verificar colunas de data:', err.message);
  }
  
  console.log('\n=== Fim da verificação ===');
}

checkProductsSchema().catch(console.error);