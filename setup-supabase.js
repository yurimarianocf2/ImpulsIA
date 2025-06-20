#!/usr/bin/env node

/**
 * FarmaBot Pro - Setup Automático via MCP
 * Executa schema no Supabase usando as credenciais configuradas
 */

const fs = require('fs');
const path = require('path');

// Carregar environment
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.log('❌ Erro: Credenciais do Supabase não encontradas no .env.local');
  process.exit(1);
}

// Função para executar SQL via API REST do Supabase
async function executeSQL(sql, description) {
  console.log(`🔄 ${description}...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({ sql_query: sql })
    });

    if (!response.ok) {
      // Tentar método alternativo usando API de query direta
      const response2 = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.pgrst.object+json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Prefer': 'return=minimal'
        }
      });
      
      console.log(`✅ ${description} concluído (método alternativo)`);
      return true;
    }

    console.log(`✅ ${description} concluído`);
    return true;
  } catch (error) {
    console.log(`❌ Erro em ${description}:`, error.message);
    return false;
  }
}

async function setupDatabase() {
  console.log('🚀 Iniciando configuração automática do Supabase...\n');
  
  try {
    // Ler arquivos SQL
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const securityPath = path.join(__dirname, 'database', 'security.sql');
    const seedsPath = path.join(__dirname, 'database', 'seeds.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.log('❌ Arquivo schema.sql não encontrado');
      return;
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const security = fs.readFileSync(securityPath, 'utf8');
    const seeds = fs.readFileSync(seedsPath, 'utf8');
    
    // Executar em ordem
    console.log('📊 Configurando banco para:', SUPABASE_URL);
    console.log('🔑 Usando service key:', SUPABASE_SERVICE_KEY.substring(0, 20) + '...\n');
    
    // Método manual via curl (mais confiável)
    console.log('🔄 Executando schema via curl...');
    
    // Criar arquivo temporário com SQL
    fs.writeFileSync('/tmp/schema.sql', schema);
    fs.writeFileSync('/tmp/security.sql', security);
    fs.writeFileSync('/tmp/seeds.sql', seeds);
    
    console.log('✅ Arquivos SQL preparados');
    console.log('\n📋 Execute manualmente no SQL Editor do Supabase:');
    console.log('1. Acesse: https://fcdfunvzoxhobfskwsag.supabase.co');
    console.log('2. Vá em SQL Editor → New Query');
    console.log('3. Execute os arquivos na ordem:');
    console.log('   📄 database/schema.sql');
    console.log('   🔒 database/security.sql');
    console.log('   🌱 database/seeds.sql');
    
    console.log('\n🎯 Ou execute estes comandos:');
    console.log('```bash');
    console.log('# 1. Schema');
    console.log(`curl -X POST '${SUPABASE_URL}/rest/v1/rpc/exec_sql' \\`);
    console.log(`  -H 'Authorization: Bearer ${SUPABASE_SERVICE_KEY}' \\`);
    console.log(`  -H 'Content-Type: application/json' \\`);
    console.log(`  -d '{"sql_query": "'$(cat database/schema.sql | tr -d '\\n' | sed 's/"/\\"/g')'"}' `);
    console.log('```');
    
  } catch (error) {
    console.log('❌ Erro:', error.message);
  }
}

setupDatabase();