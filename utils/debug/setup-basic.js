require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupBasicTables() {
  console.log('🔧 Configurando tabelas básicas...\n');

  try {
    // 1. Criar tabela farmácias
    console.log('📋 Criando tabela farmacias...');
    const { error: farmaciaError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS farmacias (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome VARCHAR(255) NOT NULL,
          cnpj VARCHAR(18),
          telefone VARCHAR(20) NOT NULL,
          whatsapp VARCHAR(20) NOT NULL,
          email VARCHAR(100),
          endereco JSONB DEFAULT '{}',
          horario_funcionamento JSONB DEFAULT '{}',
          ativo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    });

    if (farmaciaError) {
      console.log('❌ Erro ao criar tabela farmacias:', farmaciaError.message);
    } else {
      console.log('✅ Tabela farmacias criada');
    }

    // 2. Inserir farmácia padrão
    console.log('🏥 Inserindo farmácia padrão...');
    const farmaciaId = process.env.NEXT_PUBLIC_FARMACIA_ID;
    
    const { error: insertError } = await supabase
      .from('farmacias')
      .upsert({
        id: farmaciaId,
        nome: 'Farmácia São João',
        cnpj: '12.345.678/0001-90',
        telefone: '11999999999',
        whatsapp: '11999999999',
        email: 'contato@farmaciasaojoao.com.br',
        endereco: {
          rua: 'Rua das Flores, 123',
          bairro: 'Centro',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '01234-567'
        },
        horario_funcionamento: {
          segunda: '08:00-22:00',
          terca: '08:00-22:00',
          quarta: '08:00-22:00',
          quinta: '08:00-22:00',
          sexta: '08:00-22:00',
          sabado: '08:00-20:00',
          domingo: '09:00-18:00'
        }
      });

    if (insertError) {
      console.log('❌ Erro ao inserir farmácia:', insertError.message);
    } else {
      console.log('✅ Farmácia padrão inserida');
    }

    // 3. Criar tabela produtos
    console.log('💊 Criando tabela produtos...');
    const { error: produtoError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS produtos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
          codigo_barras VARCHAR(14),
          nome VARCHAR(255) NOT NULL,
          laboratorio VARCHAR(100),
          categoria VARCHAR(100),
          preco_venda DECIMAL(10,2) NOT NULL,
          preco_custo DECIMAL(10,2),
          estoque_atual INTEGER DEFAULT 0,
          estoque_minimo INTEGER DEFAULT 5,
          ativo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    });

    if (produtoError) {
      console.log('❌ Erro ao criar tabela produtos:', produtoError.message);
    } else {
      console.log('✅ Tabela produtos criada');
    }

    console.log('\n🎉 Setup básico concluído!');
    console.log('💡 Agora você pode testar a conexão novamente.');

  } catch (error) {
    console.log('❌ Erro geral:', error.message);
  }
}

setupBasicTables(); 