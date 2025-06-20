-- ============================================================================
-- FARMABOT PRO - SCHEMA COMPLETO SUPABASE
-- Sistema de Atendente Virtual para Farmácias
-- Versão: 2.0.0
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================================
-- ENUMS E TIPOS CUSTOMIZADOS
-- ============================================================================

-- Status de conversas
CREATE TYPE conversa_status AS ENUM ('ativo', 'pausado', 'finalizado', 'transferido', 'aguardando');

-- Status de pedidos
CREATE TYPE pedido_status AS ENUM ('pendente', 'confirmado', 'preparando', 'pronto', 'entregue', 'cancelado');

-- Tipos de entrega
CREATE TYPE tipo_entrega AS ENUM ('balcao', 'delivery', 'agendado');

-- Tipos de pagamento
CREATE TYPE tipo_pagamento AS ENUM ('dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'convenio');

-- Status de estoque
CREATE TYPE estoque_status AS ENUM ('disponivel', 'baixo', 'esgotado', 'vencendo', 'vencido');

-- ============================================================================
-- TABELA: FARMÁCIAS
-- ============================================================================
CREATE TABLE farmacias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    telefone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    endereco JSONB NOT NULL,
    horario_funcionamento JSONB,
    configuracoes JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    plano VARCHAR(50) DEFAULT 'basico',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir farmácia padrão
INSERT INTO farmacias (nome, cnpj, telefone, whatsapp, email, endereco, horario_funcionamento) VALUES 
('Farmácia São João', '12.345.678/0001-90', '11999999999', '11999999999', 'contato@farmaciasaojoao.com.br', 
 '{"rua": "Rua das Flores, 123", "bairro": "Centro", "cidade": "São Paulo", "estado": "SP", "cep": "01234-567"}',
 '{"segunda": "08:00-22:00", "terca": "08:00-22:00", "quarta": "08:00-22:00", "quinta": "08:00-22:00", "sexta": "08:00-22:00", "sabado": "08:00-20:00", "domingo": "09:00-18:00"}');

-- ============================================================================
-- TABELA: PRODUTOS
-- ============================================================================
CREATE TABLE produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
    codigo_barras VARCHAR(14) UNIQUE,
    codigo_interno VARCHAR(50),
    nome VARCHAR(255) NOT NULL,
    nome_generico VARCHAR(255),
    principio_ativo VARCHAR(255),
    laboratorio VARCHAR(100),
    categoria VARCHAR(100),
    subcategoria VARCHAR(100),
    dosagem VARCHAR(50),
    apresentacao VARCHAR(100),
    unidade_medida VARCHAR(20) DEFAULT 'un',
    registro_anvisa VARCHAR(20),
    classe_terapeutica VARCHAR(100),
    prescricao_obrigatoria BOOLEAN DEFAULT false,
    controlado BOOLEAN DEFAULT false,
    generico BOOLEAN DEFAULT false,
    pmc_maximo DECIMAL(10,2),
    preco_venda DECIMAL(10,2) NOT NULL,
    preco_custo DECIMAL(10,2),
    margem_lucro DECIMAL(5,2),
    estoque_atual INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 5,
    estoque_maximo INTEGER DEFAULT 100,
    localizacao VARCHAR(50),
    data_vencimento DATE,
    lote VARCHAR(50),
    fornecedor VARCHAR(100),
    descricao TEXT,
    indicacoes TEXT,
    contraindicacoes TEXT,
    efeitos_colaterais TEXT,
    posologia TEXT,
    observacoes TEXT,
    imagem_url VARCHAR(500),
    peso DECIMAL(8,3),
    dimensoes JSONB,
    ativo BOOLEAN DEFAULT true,
    promocao BOOLEAN DEFAULT false,
    preco_promocional DECIMAL(10,2),
    data_inicio_promocao DATE,
    data_fim_promocao DATE,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    search_vector tsvector,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Função para atualizar search_vector
CREATE OR REPLACE FUNCTION update_produto_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('portuguese', 
        coalesce(NEW.nome, '') || ' ' ||
        coalesce(NEW.nome_generico, '') || ' ' ||
        coalesce(NEW.principio_ativo, '') || ' ' ||
        coalesce(NEW.laboratorio, '') || ' ' ||
        coalesce(NEW.categoria, '') || ' ' ||
        coalesce(array_to_string(NEW.tags, ' '), '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para search_vector
CREATE TRIGGER trigger_update_produto_search_vector
    BEFORE INSERT OR UPDATE ON produtos
    FOR EACH ROW
    EXECUTE FUNCTION update_produto_search_vector();

-- ============================================================================
-- TABELA: CLIENTES
-- ============================================================================
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
    telefone VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(100),
    cpf VARCHAR(14),
    email VARCHAR(100),
    data_nascimento DATE,
    genero VARCHAR(20),
    endereco JSONB,
    endereco_entrega JSONB,
    medicamentos_uso JSONB DEFAULT '[]',
    alergias TEXT[],
    condicoes_medicas TEXT[],
    preferencias JSONB DEFAULT '{}',
    segmento VARCHAR(50) DEFAULT 'novo',
    pontos_fidelidade INTEGER DEFAULT 0,
    total_pedidos INTEGER DEFAULT 0,
    total_gasto DECIMAL(10,2) DEFAULT 0,
    ultimo_pedido_at TIMESTAMP,
    ativo BOOLEAN DEFAULT true,
    bloqueado BOOLEAN DEFAULT false,
    observacoes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- TABELA: CONVERSAS
-- ============================================================================
CREATE TABLE conversas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id),
    telefone VARCHAR(20) NOT NULL,
    status conversa_status DEFAULT 'ativo',
    contexto JSONB DEFAULT '{}',
    intent_atual VARCHAR(100),
    entidades JSONB DEFAULT '{}',
    aguardando_resposta BOOLEAN DEFAULT false,
    transferido_para VARCHAR(100),
    satisfacao INTEGER CHECK (satisfacao >= 1 AND satisfacao <= 5),
    feedback_texto TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    finalizada_at TIMESTAMP
);

-- ============================================================================
-- TABELA: MENSAGENS
-- ============================================================================
CREATE TABLE mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id UUID REFERENCES conversas(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('recebida', 'enviada', 'sistema')),
    conteudo TEXT NOT NULL,
    intent VARCHAR(100),
    entidades JSONB DEFAULT '{}',
    confianca DECIMAL(3,2),
    resposta_automatica BOOLEAN DEFAULT false,
    tempo_resposta INTEGER, -- em segundos
    processed BOOLEAN DEFAULT false,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    whatsapp_message_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- TABELA: PEDIDOS
-- ============================================================================
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_pedido VARCHAR(20) UNIQUE NOT NULL,
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id),
    conversa_id UUID REFERENCES conversas(id),
    status pedido_status DEFAULT 'pendente',
    itens JSONB NOT NULL,
    quantidade_total INTEGER NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    desconto DECIMAL(10,2) DEFAULT 0,
    taxa_entrega DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    forma_pagamento tipo_pagamento,
    tipo_entrega tipo_entrega DEFAULT 'balcao',
    endereco_entrega JSONB,
    data_agendamento TIMESTAMP,
    observacoes TEXT,
    receita_obrigatoria BOOLEAN DEFAULT false,
    receita_enviada BOOLEAN DEFAULT false,
    tempo_preparo_estimado INTEGER, -- em minutos
    pronto_em TIMESTAMP,
    entregue_em TIMESTAMP,
    cancelado_em TIMESTAMP,
    motivo_cancelamento TEXT,
    avaliacao INTEGER CHECK (avaliacao >= 1 AND avaliacao <= 5),
    comentario_avaliacao TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Função para gerar número do pedido
CREATE OR REPLACE FUNCTION generate_numero_pedido()
RETURNS TRIGGER AS $$
BEGIN
    NEW.numero_pedido := 'PED' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('pedidos_seq')::text, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequência para números de pedido
CREATE SEQUENCE pedidos_seq START 1;

-- Trigger para número do pedido
CREATE TRIGGER trigger_generate_numero_pedido
    BEFORE INSERT ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION generate_numero_pedido();

-- ============================================================================
-- TABELA: NOTIFICAÇÕES
-- ============================================================================
CREATE TABLE notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    destinatario VARCHAR(20),
    produto_id UUID REFERENCES produtos(id),
    pedido_id UUID REFERENCES pedidos(id),
    cliente_id UUID REFERENCES clientes(id),
    lida BOOLEAN DEFAULT false,
    enviada BOOLEAN DEFAULT false,
    tentativas_envio INTEGER DEFAULT 0,
    erro_envio TEXT,
    prioridade VARCHAR(20) DEFAULT 'normal',
    agendada_para TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    lida_em TIMESTAMP,
    enviada_em TIMESTAMP
);

-- ============================================================================
-- TABELA: LOGS DE AUDITORIA
-- ============================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabela VARCHAR(50) NOT NULL,
    operacao VARCHAR(10) NOT NULL,
    registro_id UUID NOT NULL,
    usuario_id UUID,
    dados_antigos JSONB,
    dados_novos JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- TABELA: CONFIGURAÇÕES
-- ============================================================================
CREATE TABLE configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
    chave VARCHAR(100) NOT NULL,
    valor JSONB NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'string',
    categoria VARCHAR(50) DEFAULT 'geral',
    publico BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(farmacia_id, chave)
);

-- ============================================================================
-- TABELA: MÉTRICAS E ANALYTICS
-- ============================================================================
CREATE TABLE metricas_diarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    total_mensagens INTEGER DEFAULT 0,
    total_conversas INTEGER DEFAULT 0,
    total_clientes_unicos INTEGER DEFAULT 0,
    total_pedidos INTEGER DEFAULT 0,
    valor_total_vendas DECIMAL(10,2) DEFAULT 0,
    ticket_medio DECIMAL(10,2) DEFAULT 0,
    tempo_resposta_medio DECIMAL(8,2) DEFAULT 0,
    taxa_conversao DECIMAL(5,2) DEFAULT 0,
    satisfacao_media DECIMAL(3,2) DEFAULT 0,
    produtos_mais_vendidos JSONB DEFAULT '[]',
    horarios_pico JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(farmacia_id, data)
);

-- ============================================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================================

-- Produtos
CREATE INDEX idx_produtos_farmacia ON produtos(farmacia_id);
CREATE INDEX idx_produtos_search_vector ON produtos USING gin(search_vector);
CREATE INDEX idx_produtos_categoria ON produtos(categoria, subcategoria);
CREATE INDEX idx_produtos_laboratorio ON produtos(laboratorio);
CREATE INDEX idx_produtos_ativo ON produtos(ativo) WHERE ativo = true;
CREATE INDEX idx_produtos_estoque ON produtos(estoque_atual, estoque_minimo);
CREATE INDEX idx_produtos_promocao ON produtos(promocao) WHERE promocao = true;
CREATE INDEX idx_produtos_controlado ON produtos(controlado) WHERE controlado = true;

-- Clientes
CREATE INDEX idx_clientes_farmacia ON clientes(farmacia_id);
CREATE INDEX idx_clientes_telefone ON clientes(telefone);
CREATE INDEX idx_clientes_segmento ON clientes(segmento);
CREATE INDEX idx_clientes_ativo ON clientes(ativo) WHERE ativo = true;

-- Conversas
CREATE INDEX idx_conversas_farmacia ON conversas(farmacia_id);
CREATE INDEX idx_conversas_cliente ON conversas(cliente_id);
CREATE INDEX idx_conversas_telefone ON conversas(telefone);
CREATE INDEX idx_conversas_status ON conversas(status);
CREATE INDEX idx_conversas_created_at ON conversas(created_at);

-- Mensagens
CREATE INDEX idx_mensagens_conversa ON mensagens(conversa_id);
CREATE INDEX idx_mensagens_tipo ON mensagens(tipo);
CREATE INDEX idx_mensagens_created_at ON mensagens(created_at);
CREATE INDEX idx_mensagens_processed ON mensagens(processed) WHERE processed = false;

-- Pedidos
CREATE INDEX idx_pedidos_farmacia ON pedidos(farmacia_id);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_created_at ON pedidos(created_at);
CREATE INDEX idx_pedidos_numero ON pedidos(numero_pedido);

-- Notificações
CREATE INDEX idx_notificacoes_farmacia ON notificacoes(farmacia_id);
CREATE INDEX idx_notificacoes_tipo ON notificacoes(tipo);
CREATE INDEX idx_notificacoes_lida ON notificacoes(lida) WHERE lida = false;
CREATE INDEX idx_notificacoes_agendada ON notificacoes(agendada_para) WHERE agendada_para IS NOT NULL;

-- ============================================================================
-- TRIGGERS DE ATUALIZAÇÃO
-- ============================================================================

-- Função genérica para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de updated_at
CREATE TRIGGER trigger_farmacias_updated_at
    BEFORE UPDATE ON farmacias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_produtos_updated_at
    BEFORE UPDATE ON produtos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_conversas_updated_at
    BEFORE UPDATE ON conversas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_pedidos_updated_at
    BEFORE UPDATE ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_configuracoes_updated_at
    BEFORE UPDATE ON configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGERS DE NEGÓCIO
-- ============================================================================

-- Função para alertas de estoque baixo
CREATE OR REPLACE FUNCTION check_estoque_baixo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estoque_atual <= NEW.estoque_minimo AND OLD.estoque_atual > OLD.estoque_minimo THEN
        INSERT INTO notificacoes (farmacia_id, tipo, titulo, mensagem, produto_id, prioridade)
        VALUES (
            NEW.farmacia_id,
            'estoque_baixo',
            'Estoque Baixo - ' || NEW.nome,
            'O produto ' || NEW.nome || ' está com estoque baixo (' || NEW.estoque_atual || ' unidades). Estoque mínimo: ' || NEW.estoque_minimo,
            NEW.id,
            'alta'
        );
    END IF;
    
    IF NEW.data_vencimento <= CURRENT_DATE + INTERVAL '30 days' AND 
       (OLD.data_vencimento IS NULL OR OLD.data_vencimento > CURRENT_DATE + INTERVAL '30 days') THEN
        INSERT INTO notificacoes (farmacia_id, tipo, titulo, mensagem, produto_id, prioridade)
        VALUES (
            NEW.farmacia_id,
            'produto_vencendo',
            'Produto Vencendo - ' || NEW.nome,
            'O produto ' || NEW.nome || ' vence em ' || (NEW.data_vencimento - CURRENT_DATE) || ' dias.',
            NEW.id,
            'media'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_estoque_baixo
    AFTER UPDATE ON produtos
    FOR EACH ROW
    EXECUTE FUNCTION check_estoque_baixo();

-- Função para atualizar estatísticas do cliente
CREATE OR REPLACE FUNCTION update_cliente_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'entregue' THEN
        UPDATE clientes 
        SET 
            total_pedidos = total_pedidos + 1,
            total_gasto = total_gasto + NEW.total,
            ultimo_pedido_at = NEW.created_at,
            segmento = CASE 
                WHEN total_pedidos + 1 >= 10 THEN 'vip'
                WHEN total_pedidos + 1 >= 5 THEN 'fiel'
                WHEN total_pedidos + 1 >= 2 THEN 'recorrente'
                ELSE 'novo'
            END
        WHERE id = NEW.cliente_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cliente_stats
    AFTER INSERT OR UPDATE ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION update_cliente_stats();

-- ============================================================================
-- VIEWS MATERIALIZADAS PARA DASHBOARD
-- ============================================================================

-- View de vendas por dia
CREATE MATERIALIZED VIEW mv_vendas_dashboard AS
SELECT 
    p.farmacia_id,
    DATE(p.created_at) as data,
    COUNT(*) as total_pedidos,
    SUM(p.total) as faturamento,
    AVG(p.total) as ticket_medio,
    COUNT(DISTINCT p.cliente_id) as clientes_unicos
FROM pedidos p 
WHERE p.status = 'entregue'
GROUP BY p.farmacia_id, DATE(p.created_at);

CREATE UNIQUE INDEX idx_mv_vendas_dashboard ON mv_vendas_dashboard(farmacia_id, data);

-- View de produtos populares
CREATE MATERIALIZED VIEW mv_produtos_populares AS
SELECT 
    p.farmacia_id,
    pr.id as produto_id,
    pr.nome,
    pr.categoria,
    COUNT(*) as vendas,
    SUM(item.quantidade) as quantidade_vendida,
    SUM(item.subtotal) as receita_total
FROM pedidos p
CROSS JOIN LATERAL jsonb_array_elements(p.itens) as item_json
JOIN LATERAL jsonb_to_record(item_json) as item(produto_id uuid, quantidade integer, subtotal decimal)
    ON true
JOIN produtos pr ON pr.id = item.produto_id
WHERE p.status = 'entregue'
    AND p.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.farmacia_id, pr.id, pr.nome, pr.categoria;

CREATE UNIQUE INDEX idx_mv_produtos_populares ON mv_produtos_populares(farmacia_id, produto_id);

-- Função para refresh das views
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vendas_dashboard;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_produtos_populares;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNÇÕES AUXILIARES
-- ============================================================================

-- Função de busca de produtos
CREATE OR REPLACE FUNCTION buscar_produtos(
    p_farmacia_id UUID,
    p_query TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    nome VARCHAR,
    principio_ativo VARCHAR,
    laboratorio VARCHAR,
    preco_venda DECIMAL,
    estoque_atual INTEGER,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.nome,
        p.principio_ativo,
        p.laboratorio,
        p.preco_venda,
        p.estoque_atual,
        ts_rank(p.search_vector, plainto_tsquery('portuguese', p_query)) as rank
    FROM produtos p
    WHERE p.farmacia_id = p_farmacia_id
        AND p.ativo = true
        AND p.search_vector @@ plainto_tsquery('portuguese', p_query)
    ORDER BY rank DESC, p.nome
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular métricas diárias
CREATE OR REPLACE FUNCTION calcular_metricas_diarias(
    p_farmacia_id UUID,
    p_data DATE DEFAULT CURRENT_DATE
)
RETURNS void AS $$
DECLARE
    v_total_mensagens INTEGER;
    v_total_conversas INTEGER;
    v_total_clientes_unicos INTEGER;
    v_total_pedidos INTEGER;
    v_valor_total_vendas DECIMAL;
    v_ticket_medio DECIMAL;
    v_tempo_resposta_medio DECIMAL;
    v_satisfacao_media DECIMAL;
BEGIN
    -- Calcular métricas
    SELECT COUNT(*) INTO v_total_mensagens
    FROM mensagens m
    JOIN conversas c ON c.id = m.conversa_id
    WHERE c.farmacia_id = p_farmacia_id
        AND DATE(m.created_at) = p_data;
    
    SELECT COUNT(*) INTO v_total_conversas
    FROM conversas c
    WHERE c.farmacia_id = p_farmacia_id
        AND DATE(c.created_at) = p_data;
    
    SELECT COUNT(DISTINCT c.cliente_id) INTO v_total_clientes_unicos
    FROM conversas c
    WHERE c.farmacia_id = p_farmacia_id
        AND DATE(c.created_at) = p_data;
    
    SELECT COUNT(*), COALESCE(SUM(total), 0) INTO v_total_pedidos, v_valor_total_vendas
    FROM pedidos p
    WHERE p.farmacia_id = p_farmacia_id
        AND DATE(p.created_at) = p_data
        AND p.status = 'entregue';
    
    v_ticket_medio := CASE WHEN v_total_pedidos > 0 THEN v_valor_total_vendas / v_total_pedidos ELSE 0 END;
    
    -- Inserir ou atualizar métricas
    INSERT INTO metricas_diarias (
        farmacia_id, data, total_mensagens, total_conversas, total_clientes_unicos,
        total_pedidos, valor_total_vendas, ticket_medio
    ) VALUES (
        p_farmacia_id, p_data, v_total_mensagens, v_total_conversas, v_total_clientes_unicos,
        v_total_pedidos, v_valor_total_vendas, v_ticket_medio
    )
    ON CONFLICT (farmacia_id, data) DO UPDATE SET
        total_mensagens = EXCLUDED.total_mensagens,
        total_conversas = EXCLUDED.total_conversas,
        total_clientes_unicos = EXCLUDED.total_clientes_unicos,
        total_pedidos = EXCLUDED.total_pedidos,
        valor_total_vendas = EXCLUDED.valor_total_vendas,
        ticket_medio = EXCLUDED.ticket_medio;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS em todas as tabelas principais
ALTER TABLE farmacias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_diarias ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança serão criadas após a configuração de autenticação

-- ============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON TABLE farmacias IS 'Dados das farmácias clientes do sistema';
COMMENT ON TABLE produtos IS 'Catálogo completo de produtos farmacêuticos';
COMMENT ON TABLE clientes IS 'Base de clientes das farmácias';
COMMENT ON TABLE conversas IS 'Sessões de conversas no WhatsApp';
COMMENT ON TABLE mensagens IS 'Histórico completo de mensagens trocadas';
COMMENT ON TABLE pedidos IS 'Pedidos realizados via chatbot';
COMMENT ON TABLE notificacoes IS 'Sistema de notificações e alertas';
COMMENT ON TABLE audit_logs IS 'Log de auditoria de todas as operações';
COMMENT ON TABLE configuracoes IS 'Configurações personalizáveis por farmácia';
COMMENT ON TABLE metricas_diarias IS 'Métricas agregadas para dashboard';

-- ============================================================================
-- SCHEMA CRIADO COM SUCESSO!
-- Próximo passo: Popular com dados de teste
-- ============================================================================