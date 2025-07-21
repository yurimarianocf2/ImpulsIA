-- =============================================================================
-- TABELAS PARA INDIVIDUALIZAÇÃO E MEMÓRIA DE CONVERSAÇÃO WHATSAPP
-- =============================================================================
-- Implementa sistema de memória para IA da farmácia se lembrar de cada cliente
-- Uma farmácia com múltiplos clientes, cada um com seu histórico individual
-- =============================================================================

-- 1. TABELA DE SESSÕES WHATSAPP
-- -----------------------------------------------------------------------------
-- Mantém o estado atual da conversa de cada cliente

CREATE TABLE sessoes_whatsapp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone TEXT UNIQUE NOT NULL,
    cliente_id UUID REFERENCES clientes(cliente_id),
    
    -- Estado atual da conversa
    estado_atual TEXT DEFAULT 'inicial' NOT NULL,
    contexto JSONB DEFAULT '{}',
    
    -- Informações da última interação
    ultima_mensagem TEXT,
    ultima_resposta_bot TEXT,
    ultima_interacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Controle de sessão
    ativa BOOLEAN DEFAULT true,
    sessao_iniciada_em TIMESTAMPTZ DEFAULT NOW(),
    
    -- Métricas para análise
    total_mensagens INTEGER DEFAULT 0,
    total_consultas_precos INTEGER DEFAULT 0,
    total_pedidos_criados INTEGER DEFAULT 0,
    
    CONSTRAINT estados_validos CHECK (estado_atual IN (
        'inicial', 'identificando', 'confirmando_cliente', 'navegando_produtos',
        'consultando_precos', 'criando_pedido', 'confirmando_pedido', 'finalizado'
    ))
);

-- Índices para performance
CREATE INDEX idx_sessoes_telefone ON sessoes_whatsapp(telefone);
CREATE INDEX idx_sessoes_ativas ON sessoes_whatsapp(ativa, ultima_interacao);
CREATE INDEX idx_sessoes_cliente_id ON sessoes_whatsapp(cliente_id);

-- 2. FOCO EM DADOS PERSISTENTES
-- -----------------------------------------------------------------------------
-- Mantemos apenas dados que precisam persistir entre sessões

-- 3. TABELA DE PREFERÊNCIAS E PERFIL DO CLIENTE
-- -----------------------------------------------------------------------------
-- Armazena preferências e padrões de comportamento para personalização

CREATE TABLE cliente_perfil (
    cliente_id UUID PRIMARY KEY REFERENCES clientes(cliente_id) ON DELETE CASCADE,
    
    -- Preferências de comunicação
    prefere_promocoes BOOLEAN DEFAULT true,
    aceita_sugestoes BOOLEAN DEFAULT true,
    horario_preferido_contato TIME,
    
    -- Histórico de comportamento
    medicamentos_frequentes JSONB DEFAULT '[]', -- [{"nome": "Dipirona", "frequencia": 5}]
    categorias_interesse JSONB DEFAULT '[]',     -- ["analgésicos", "vitaminas"]
    ticket_medio DECIMAL(10,2),
    frequencia_compra_dias INTEGER, -- média de dias entre compras
    
    -- Dados para personalização
    ultima_compra_em TIMESTAMPTZ,
    total_pedidos INTEGER DEFAULT 0,
    cliente_vip BOOLEAN DEFAULT false,
    
    -- Notas importantes (ex: alergia, receita especial)
    observacoes_importantes TEXT,
    
    -- Métricas de engajamento
    tempo_medio_resposta_segundos INTEGER,
    satisfacao_media DECIMAL(3,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE CONSULTAS DE PREÇOS
-- -----------------------------------------------------------------------------
-- Rastreia consultas para análise de demanda e comportamento

CREATE TABLE consultas_precos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone TEXT NOT NULL,
    cliente_id UUID REFERENCES clientes(cliente_id),
    sessao_id UUID REFERENCES sessoes_whatsapp(id),
    
    -- Produto consultado
    produto_pesquisado TEXT NOT NULL,
    produto_encontrado UUID REFERENCES produtos(produto_id),
    preco_informado DECIMAL(10,2),
    promocao_ativa BOOLEAN DEFAULT false,
    
    -- Contexto da consulta
    origem_consulta TEXT DEFAULT 'whatsapp', -- whatsapp, site, etc
    resultado TEXT NOT NULL CHECK (resultado IN ('encontrado', 'nao_encontrado', 'sugestao_enviada')),
    
    -- Para análise de conversão
    levou_ao_pedido BOOLEAN DEFAULT false,
    pedido_id UUID REFERENCES pedidos(id),
    
    timestamp_consulta TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consultas_telefone ON consultas_precos(telefone);
CREATE INDEX idx_consultas_produto ON consultas_precos(produto_pesquisado);
CREATE INDEX idx_consultas_timestamp ON consultas_precos(timestamp_consulta);

-- =============================================================================
-- FUNÇÕES PARA GERENCIAMENTO DE SESSÕES E MEMÓRIA
-- =============================================================================

-- 5. FUNÇÃO PARA INICIAR/ATUALIZAR SESSÃO DO CLIENTE
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION gerenciar_sessao_whatsapp(
    tel TEXT,
    novo_estado TEXT DEFAULT NULL,
    nova_mensagem TEXT DEFAULT NULL,
    nova_resposta TEXT DEFAULT NULL,
    novo_contexto JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    sessao_id UUID;
    cliente_id_encontrado UUID;
BEGIN
    -- Buscar cliente_id se existe
    SELECT c.cliente_id INTO cliente_id_encontrado
    FROM clientes c WHERE c.telefone = tel;
    
    -- Inserir ou atualizar sessão
    INSERT INTO sessoes_whatsapp (
        telefone, cliente_id, estado_atual, contexto, 
        ultima_mensagem, ultima_resposta_bot
    )
    VALUES (
        tel, cliente_id_encontrado, 
        COALESCE(novo_estado, 'inicial'),
        COALESCE(novo_contexto, '{}'),
        nova_mensagem, nova_resposta
    )
    ON CONFLICT (telefone) 
    DO UPDATE SET
        estado_atual = COALESCE(novo_estado, sessoes_whatsapp.estado_atual),
        contexto = COALESCE(novo_contexto, sessoes_whatsapp.contexto),
        ultima_mensagem = COALESCE(nova_mensagem, sessoes_whatsapp.ultima_mensagem),
        ultima_resposta_bot = COALESCE(nova_resposta, sessoes_whatsapp.ultima_resposta_bot),
        ultima_interacao = NOW(),
        total_mensagens = sessoes_whatsapp.total_mensagens + 1,
        ativa = true
    RETURNING id INTO sessao_id;
    
    RETURN sessao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FOCO EM DADOS ESSENCIAIS
-- -----------------------------------------------------------------------------
-- Mantemos apenas funcionalidades para dados persistentes

-- 7. FUNÇÃO PARA BUSCAR CONTEXTO DO CLIENTE
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION obter_contexto_cliente(tel TEXT)
RETURNS TABLE(
    tem_cadastro BOOLEAN,
    nome_mascarado TEXT,
    estado_conversa TEXT,
    ultima_interacao_minutos INTEGER,
    total_pedidos INTEGER,
    medicamentos_frequentes JSONB,
    cliente_vip BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.cliente_id IS NOT NULL as tem_cadastro,
        CASE WHEN c.nome IS NOT NULL THEN mascara_nome(c.nome) ELSE NULL END as nome_mascarado,
        s.estado_atual,
        EXTRACT(EPOCH FROM (NOW() - s.ultima_interacao))/60 as ultima_interacao_minutos,
        COALESCE(p.total_pedidos, 0) as total_pedidos,
        COALESCE(p.medicamentos_frequentes, '[]'::jsonb) as medicamentos_frequentes,
        COALESCE(p.cliente_vip, false) as cliente_vip
    FROM sessoes_whatsapp s
    LEFT JOIN clientes c ON s.cliente_id = c.cliente_id  
    LEFT JOIN cliente_perfil p ON c.cliente_id = p.cliente_id
    WHERE s.telefone = tel;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- POLÍTICAS RLS PARA NOVAS TABELAS
-- =============================================================================

-- Habilitar RLS
ALTER TABLE sessoes_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas_precos ENABLE ROW LEVEL SECURITY;

-- Políticas (apenas service_role pode acessar tudo - usado pelo N8N)
CREATE POLICY "sessoes_service_only" ON sessoes_whatsapp FOR ALL 
USING (current_setting('role') = 'service_role');

CREATE POLICY "perfil_service_only" ON cliente_perfil FOR ALL 
USING (current_setting('role') = 'service_role');

CREATE POLICY "consultas_service_only" ON consultas_precos FOR ALL 
USING (current_setting('role') = 'service_role');

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON TABLE sessoes_whatsapp IS 'Controla estado atual de cada conversa WhatsApp individual';
COMMENT ON TABLE cliente_perfil IS 'Perfil e preferências de cada cliente para personalização';
COMMENT ON TABLE consultas_precos IS 'Rastreamento de consultas de preços para análise de demanda';

COMMENT ON FUNCTION gerenciar_sessao_whatsapp IS 'Função principal para atualizar estado da conversa';
COMMENT ON FUNCTION obter_contexto_cliente IS 'Busca contexto completo do cliente para personalização do atendimento';