#!/usr/bin/env node

/**
 * FarmaBot Pro - Script de Configuração Automática do Banco
 * Este script automatiza a criação e configuração do banco Supabase
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

class DatabaseSetup {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!this.supabaseUrl || !this.supabaseKey) {
      log('❌ ERRO: Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env.local', 'red');
      process.exit(1);
    }
    
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
  }

  async readSQLFile(filename) {
    const filePath = path.join(__dirname, '..', 'database', filename);
    return fs.readFileSync(filePath, 'utf8');
  }

  async executeSQL(sql, description) {
    log(`🔄 ${description}...`, 'cyan');
    
    try {
      const { error } = await this.supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        log(`❌ Erro em ${description}:`, 'red');
        console.error(error);
        return false;
      }
      
      log(`✅ ${description} concluído`, 'green');
      return true;
    } catch (err) {
      log(`❌ Erro em ${description}:`, 'red');
      console.error(err.message);
      return false;
    }
  }

  async testConnection() {
    log('🔗 Testando conexão com Supabase...', 'cyan');
    
    try {
      const { data, error } = await this.supabase
        .from('pg_tables')
        .select('tablename')
        .limit(1);
      
      if (error) {
        log('❌ Erro de conexão:', 'red');
        console.error(error);
        return false;
      }
      
      log('✅ Conexão estabelecida com sucesso', 'green');
      return true;
    } catch (err) {
      log('❌ Erro de conexão:', 'red');
      console.error(err.message);
      return false;
    }
  }

  async checkExistingTables() {
    log('🔍 Verificando tabelas existentes...', 'cyan');
    
    const { data, error } = await this.supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['farmacias', 'produtos', 'clientes']);
    
    if (error) {
      log('❌ Erro ao verificar tabelas:', 'red');
      console.error(error);
      return false;
    }
    
    if (data && data.length > 0) {
      log(`⚠️  Encontradas ${data.length} tabelas do projeto já existentes`, 'yellow');
      log('Isso pode indicar que o banco já foi configurado anteriormente.', 'yellow');
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve) => {
        rl.question('Continuar mesmo assim? (s/N): ', (answer) => {
          rl.close();
          resolve(answer.toLowerCase() === 's' || answer.toLowerCase() === 'sim');
        });
      });
    }
    
    return true;
  }

  async setupSchema() {
    const schema = await this.readSQLFile('schema.sql');
    return await this.executeSQL(schema, 'Criando schema do banco');
  }

  async setupSecurity() {
    const security = await this.readSQLFile('security.sql');
    return await this.executeSQL(security, 'Configurando segurança (RLS)');
  }

  async setupSeeds() {
    const seeds = await this.readSQLFile('seeds.sql');
    return await this.executeSQL(seeds, 'Inserindo dados de teste');
  }

  async verifyInstallation() {
    log('🔍 Verificando instalação...', 'cyan');
    
    // Verificar tabelas criadas
    const { data: tables, error: tablesError } = await this.supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      log('❌ Erro ao verificar tabelas:', 'red');
      return false;
    }
    
    const expectedTables = ['farmacias', 'produtos', 'clientes', 'conversas', 'mensagens', 'pedidos'];
    const existingTables = tables.map(t => t.table_name);
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length > 0) {
      log(`❌ Tabelas faltando: ${missingTables.join(', ')}`, 'red');
      return false;
    }
    
    // Verificar farmácia padrão
    const { data: farmacias, error: farmaciasError } = await this.supabase
      .from('farmacias')
      .select('nome, telefone')
      .limit(1);
    
    if (farmaciasError || !farmacias || farmacias.length === 0) {
      log('❌ Farmácia padrão não encontrada', 'red');
      return false;
    }
    
    // Verificar produtos
    const { data: produtos, error: produtosError } = await this.supabase
      .from('produtos')
      .select('count')
      .single();
    
    if (produtosError) {
      log('❌ Erro ao verificar produtos:', 'red');
      return false;
    }
    
    log('✅ Verificação concluída:', 'green');
    log(`  📊 ${tables.length} tabelas criadas`, 'blue');
    log(`  🏥 Farmácia: ${farmacias[0].nome}`, 'blue');
    log(`  📱 Telefone: ${farmacias[0].telefone}`, 'blue');
    
    return true;
  }

  async generateEnvFile() {
    log('📝 Gerando arquivo de configuração...', 'cyan');
    
    const envContent = `# FarmaBot Pro - Configuração Gerada Automaticamente
# Gerado em: ${new Date().toISOString()}

# Supabase
SUPABASE_URL=${this.supabaseUrl}
SUPABASE_ANON_KEY=${process.env.SUPABASE_ANON_KEY || 'configurar-anon-key'}
SUPABASE_SERVICE_ROLE_KEY=${this.supabaseKey}

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=configurar
WHATSAPP_ACCESS_TOKEN=configurar
WHATSAPP_WEBHOOK_VERIFY_TOKEN=token-personalizado-seguro

# n8n
N8N_HOST=localhost
N8N_PORT=5678
N8N_WEBHOOK_URL=http://localhost:5678/webhook
N8N_ENCRYPTION_KEY=${this.generateRandomKey(32)}

# Segurança
JWT_SECRET=${this.generateRandomKey(64)}
ENCRYPTION_KEY=${this.generateRandomKey(32)}

# Configurações Gerais
NODE_ENV=development
PORT=3000
TZ=America/Sao_Paulo
`;

    fs.writeFileSync('.env.local', envContent);
    log('✅ Arquivo .env.local criado', 'green');
  }

  generateRandomKey(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async displayNextSteps() {
    log('\n🎉 Configuração do banco concluída com sucesso!', 'green');
    log('\n📋 Próximos passos:', 'cyan');
    log('1. Configure as credenciais do WhatsApp Business API no .env.local', 'blue');
    log('2. Configure n8n executando: docker-compose up -d', 'blue');
    log('3. Importe os workflows n8n da pasta /n8n/workflows/', 'blue');
    log('4. Inicie o desenvolvimento: npm run dev', 'blue');
    log('\n📚 Documentação completa em: /database/README.md', 'yellow');
    log('\n🔗 Acesse seu projeto Supabase:', 'cyan');
    log(`   ${this.supabaseUrl.replace('/rest/v1', '')}`, 'blue');
  }

  async run() {
    log('🚀 Iniciando configuração do FarmaBot Pro Database', 'cyan');
    log('================================================\n', 'cyan');
    
    try {
      // 1. Testar conexão
      if (!await this.testConnection()) {
        return;
      }
      
      // 2. Verificar tabelas existentes
      if (!await this.checkExistingTables()) {
        log('❌ Configuração cancelada pelo usuário', 'yellow');
        return;
      }
      
      // 3. Criar schema
      if (!await this.setupSchema()) {
        return;
      }
      
      // 4. Configurar segurança
      if (!await this.setupSecurity()) {
        return;
      }
      
      // 5. Inserir dados de teste
      if (!await this.setupSeeds()) {
        return;
      }
      
      // 6. Verificar instalação
      if (!await this.verifyInstallation()) {
        return;
      }
      
      // 7. Gerar arquivo .env
      await this.generateEnvFile();
      
      // 8. Mostrar próximos passos
      await this.displayNextSteps();
      
    } catch (error) {
      log('❌ Erro durante a configuração:', 'red');
      console.error(error);
    }
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  const setup = new DatabaseSetup();
  setup.run();
}

module.exports = DatabaseSetup;