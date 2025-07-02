-- FarmaBot Pro Evolution - Schema Supabase Otimizado
-- Sistema completo para gestão de farmácias com IA e analytics

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para busca fuzzy
CREATE EXTENSION IF NOT EXISTS "unaccent"; -- Para remover acentos
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Para analytics de queries
CREATE EXTENSION IF NOT EXISTS "timescaledb"; -- Para time-series data

-- Tabela de Farmácias (multi-tenant)
CREATE TABLE farmacias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    whatsapp_number VARCHAR(20) UNIQUE,
    endereco JSONB,
    config JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabela de Produtos
CREATE TABLE produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
    codigo_barras VARCHAR(50),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100),
    subcategoria VARCHAR(100),
    fabricante VARCHAR(255),
    principio_ativo VARCHAR(255),
    apresentacao VARCHAR(255),
    preco_venda DECIMAL(10,2),
    preco_custo DECIMAL(10,2),
    margem_lucro DECIMAL(5,2),
    estoque_atual INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 5,
    unidade VARCHAR(20) DEFAULT 'UN',
    requer_receita BOOLEAN DEFAULT false,
    tipo_receita VARCHAR(50), -- 'branca', 'azul', 'amarela', etc
    validade DATE, -- Data de validade do produto
    ativo BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(farmacia_id, codigo_barras)
);

-- Índices para busca rápida
CREATE INDEX idx_produtos_nome_trgm ON produtos USING gin(nome gin_trgm_ops);
CREATE INDEX idx_produtos_principio ON produtos(principio_ativo);
CREATE INDEX idx_produtos_categoria ON produtos(categoria);
CREATE INDEX idx_produtos_farmacia ON produtos(farmacia_id);

-- Tabela de Conversas WhatsApp
CREATE TABLE conversas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
    whatsapp_id VARCHAR(50) NOT NULL,
    cliente_nome VARCHAR(255),
    cliente_telefone VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'ativa',
    contexto JSONB DEFAULT '{}',
    ultima_mensagem TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabela de Mensagens
CREATE TABLE mensagens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversa_id UUID REFERENCES conversas(id) ON DELETE CASCADE,
    whatsapp_message_id VARCHAR(100) UNIQUE,
    tipo VARCHAR(20) NOT NULL, -- 'entrada', 'saida'
    conteudo TEXT NOT NULL,
    tipo_conteudo VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'audio', 'document'
    metadata JSONB DEFAULT '{}',
    processada BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabela de Pedidos
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
    conversa_id UUID REFERENCES conversas(id),
    numero_pedido VARCHAR(20) UNIQUE,
    cliente_nome VARCHAR(255),
    cliente_telefone VARCHAR(20),
    cliente_cpf VARCHAR(14),
    status VARCHAR(50) DEFAULT 'pendente',
    valor_total DECIMAL(10,2),
    forma_pagamento VARCHAR(50),
    tipo_entrega VARCHAR(50), -- 'balcao', 'delivery'
    endereco_entrega JSONB,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabela de Itens do Pedido
CREATE TABLE pedido_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES produtos(id),
    quantidade INTEGER NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    desconto DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL
);

-- Tabela de Integrações ERP
CREATE TABLE integracoes_erp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
    tipo_erp VARCHAR(50) NOT NULL, -- 'vetor', 'digifarma', 'tekfarma', etc
    config JSONB NOT NULL, -- URLs, tokens, etc (criptografado)
    ultimo_sync TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabela de Logs de Sincronização
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integracao_id UUID REFERENCES integracoes_erp(id) ON DELETE CASCADE,
    tipo_sync VARCHAR(50), -- 'produtos', 'estoque', 'precos'
    status VARCHAR(50),
    registros_processados INTEGER DEFAULT 0,
    erros INTEGER DEFAULT 0,
    detalhes JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE
);

-- Tabela de Templates de Resposta
CREATE TABLE templates_resposta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
    categoria VARCHAR(100) NOT NULL,
    gatilho VARCHAR(255), -- palavra-chave que ativa o template
    resposta TEXT NOT NULL,
    variaveis JSONB DEFAULT '[]', -- variáveis disponíveis no template
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Views úteis
CREATE VIEW v_produtos_disponiveis AS
SELECT 
    p.*,
    f.nome as farmacia_nome,
    CASE 
        WHEN p.estoque_atual > p.estoque_minimo THEN 'disponivel'
        WHEN p.estoque_atual > 0 THEN 'baixo_estoque'
        ELSE 'indisponivel'
    END as status_estoque
FROM produtos p
JOIN farmacias f ON p.farmacia_id = f.id
WHERE p.ativo = true AND f.ativo = true;

-- Funções úteis
CREATE OR REPLACE FUNCTION buscar_produtos_similar(
    p_farmacia_id UUID,
    p_termo VARCHAR,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    nome VARCHAR,
    preco_venda DECIMAL,
    estoque_atual INTEGER,
    similaridade REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.nome,
        p.preco_venda,
        p.estoque_atual,
        similarity(p.nome, p_termo) as similaridade
    FROM produtos p
    WHERE 
        p.farmacia_id = p_farmacia_id
        AND p.ativo = true
        AND (
            p.nome ILIKE '%' || p_termo || '%'
            OR p.principio_ativo ILIKE '%' || p_termo || '%'
            OR similarity(p.nome, p_termo) > 0.3
        )
    ORDER BY 
        CASE WHEN p.nome ILIKE p_termo || '%' THEN 0 ELSE 1 END,
        similarity(p.nome, p_termo) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualização automática
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_farmacias_updated_at BEFORE UPDATE ON farmacias
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON pedidos
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Row Level Security
ALTER TABLE farmacias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança básicas
CREATE POLICY "Farmácias podem ver seus próprios dados" ON produtos
    FOR ALL USING (farmacia_id = auth.uid());

CREATE POLICY "Farmácias podem gerenciar suas conversas" ON conversas
    FOR ALL USING (farmacia_id = auth.uid());

-- Inserir dados de exemplo
INSERT INTO farmacias (nome, cnpj, telefone, whatsapp_number, endereco) VALUES
('Farmácia Saúde & Vida', '12.345.678/0001-90', '11999999999', '5511999999999', 
 '{"rua": "Rua das Flores", "numero": "123", "bairro": "Centro", "cidade": "São Paulo", "uf": "SP", "cep": "01234-567"}'::jsonb);

-- Tabela de Análises de Preço
CREATE TABLE analises_preco (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES produtos(id),
    preco_local DECIMAL(10,2),
    preco_medio_mercado DECIMAL(10,2),
    posicao_competitiva VARCHAR(20), -- 'abaixo', 'medio', 'acima'
    margem_atual DECIMAL(5,2),
    precos_externos JSONB DEFAULT '[]',
    recomendacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Índices para análises de preço
CREATE INDEX idx_analises_preco_farmacia ON analises_preco(farmacia_id);
CREATE INDEX idx_analises_preco_produto ON analises_preco(produto_id);
CREATE INDEX idx_analises_preco_data ON analises_preco(created_at DESC);

-- Comentários nas tabelas
COMMENT ON TABLE farmacias IS 'Tabela principal de farmácias cadastradas no sistema';
COMMENT ON TABLE produtos IS 'Catálogo de produtos das farmácias com informações de preço e estoque';
COMMENT ON TABLE conversas IS 'Histórico de conversas do WhatsApp com contexto';
COMMENT ON TABLE mensagens IS 'Mensagens individuais trocadas nas conversas';
COMMENT ON TABLE pedidos IS 'Pedidos realizados através do chatbot';
COMMENT ON TABLE integracoes_erp IS 'Configurações de integração com sistemas ERP externos';
COMMENT ON TABLE analises_preco IS 'Histórico de análises de preços e comparações de mercado';

-- =====================================================
-- NOVAS TABELAS PARA FEATURES AVANÇADAS
-- =====================================================

-- Tabela de Analytics de Conversas (Time Series)
CREATE TABLE analytics_conversas (
    time TIMESTAMPTZ NOT NULL,
    farmacia_id UUID NOT NULL,
    total_mensagens INTEGER DEFAULT 0,
    mensagens_respondidas INTEGER DEFAULT 0,
    tempo_resposta_medio INTERVAL,
    taxa_resolucao DECIMAL(5,2),
    sentimento_medio DECIMAL(3,2), -- -1 a 1
    topicos JSONB DEFAULT '[]',
    PRIMARY KEY (time, farmacia_id)
);

-- Converter para hypertable do TimescaleDB
SELECT create_hypertable('analytics_conversas', 'time');

-- Tabela de Previsões de Demanda
CREATE TABLE previsoes_demanda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmacia_id UUID REFERENCES farmacias(id),
    produto_id UUID REFERENCES produtos(id),
    data_previsao DATE NOT NULL,
    quantidade_prevista INTEGER,
    confidence_score DECIMAL(3,2),
    modelo_usado VARCHAR(50),
    features_utilizadas JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(farmacia_id, produto_id, data_previsao)
);

-- Tabela de Campanhas de Marketing
CREATE TABLE campanhas_marketing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmacia_id UUID REFERENCES farmacias(id),
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50), -- 'promocao', 'fidelidade', 'reengajamento'
    segmento_alvo JSONB, -- critérios de segmentação
    mensagem_template TEXT,
    inicio_campanha TIMESTAMP WITH TIME ZONE,
    fim_campanha TIMESTAMP WITH TIME ZONE,
    meta_conversao DECIMAL(5,2),
    orcamento DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'rascunho',
    resultados JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Feedback e Avaliações
CREATE TABLE feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversa_id UUID REFERENCES conversas(id),
    pedido_id UUID REFERENCES pedidos(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comentario TEXT,
    tags TEXT[],
    respondido BOOLEAN DEFAULT false,
    resposta TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Configurações de IA
CREATE TABLE configuracoes_ia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmacia_id UUID REFERENCES farmacias(id) UNIQUE,
    personalidade VARCHAR(50) DEFAULT 'profissional', -- 'amigavel', 'formal', etc
    tom_voz JSONB DEFAULT '{"formalidade": 0.5, "empatia": 0.8}',
    respostas_customizadas JSONB DEFAULT '{}',
    features_ativas JSONB DEFAULT '{"price_comparison": true, "recommendations": true}',
    limites_ia JSONB DEFAULT '{"max_recommendations": 3, "price_margin": 0.1}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- VIEWS MATERIALIZADAS PARA PERFORMANCE
-- =====================================================

-- View materializada de produtos mais vendidos
CREATE MATERIALIZED VIEW mv_produtos_populares AS
WITH vendas_30d AS (
    SELECT 
        pi.produto_id,
        p.farmacia_id,
        SUM(pi.quantidade) as total_vendido,
        AVG(pi.preco_unitario) as preco_medio,
        COUNT(DISTINCT pe.id) as num_pedidos
    FROM pedido_itens pi
    JOIN pedidos pe ON pi.pedido_id = pe.id
    JOIN produtos p ON pi.produto_id = p.id
    WHERE pe.created_at >= NOW() - INTERVAL '30 days'
    AND pe.status = 'finalizado'
    GROUP BY pi.produto_id, p.farmacia_id
)
SELECT 
    v.*,
    p.nome,
    p.categoria,
    p.principio_ativo,
    RANK() OVER (PARTITION BY v.farmacia_id ORDER BY v.total_vendido DESC) as ranking
FROM vendas_30d v
JOIN produtos p ON v.produto_id = p.id;

CREATE INDEX idx_mv_produtos_populares_farmacia ON mv_produtos_populares(farmacia_id);

-- View materializada de métricas de clientes
CREATE MATERIALIZED VIEW mv_metricas_clientes AS
SELECT 
    c.id as conversa_id,
    c.farmacia_id,
    c.cliente_telefone,
    COUNT(DISTINCT p.id) as total_pedidos,
    SUM(p.valor_total) as valor_total_gasto,
    AVG(p.valor_total) as ticket_medio,
    MAX(p.created_at) as ultima_compra,
    CASE 
        WHEN COUNT(DISTINCT p.id) >= 10 THEN 'vip'
        WHEN COUNT(DISTINCT p.id) >= 5 THEN 'frequente'
        WHEN COUNT(DISTINCT p.id) >= 2 THEN 'regular'
        ELSE 'novo'
    END as segmento,
    (NOW() - MAX(p.created_at))::INTEGER as dias_sem_compra
FROM conversas c
LEFT JOIN pedidos p ON c.id = p.conversa_id
GROUP BY c.id, c.farmacia_id, c.cliente_telefone;

CREATE INDEX idx_mv_metricas_clientes_farmacia ON mv_metricas_clientes(farmacia_id);
CREATE INDEX idx_mv_metricas_clientes_segmento ON mv_metricas_clientes(segmento);

-- =====================================================
-- FUNCTIONS AVANÇADAS
-- =====================================================

-- Function para recomendação de produtos com ML simples
CREATE OR REPLACE FUNCTION recomendar_produtos(
    p_farmacia_id UUID,
    p_cliente_telefone VARCHAR,
    p_limite INTEGER DEFAULT 5
)
RETURNS TABLE (
    produto_id UUID,
    nome VARCHAR,
    score DECIMAL,
    motivo VARCHAR
) AS $$
DECLARE
    v_historico RECORD;
BEGIN
    -- Buscar histórico do cliente
    SELECT INTO v_historico
        array_agg(DISTINCT pi.produto_id) as produtos_comprados,
        array_agg(DISTINCT p.categoria) as categorias_preferidas
    FROM conversas c
    JOIN pedidos pe ON c.id = pe.conversa_id
    JOIN pedido_itens pi ON pe.id = pi.pedido_id
    JOIN produtos p ON pi.produto_id = p.id
    WHERE c.farmacia_id = p_farmacia_id
    AND c.cliente_telefone = p_cliente_telefone;

    -- Retornar recomendações baseadas em:
    -- 1. Produtos complementares
    -- 2. Produtos da mesma categoria
    -- 3. Produtos populares não comprados
    RETURN QUERY
    WITH scores AS (
        SELECT 
            p.id as produto_id,
            p.nome,
            CASE
                -- Produtos frequentemente comprados juntos
                WHEN EXISTS (
                    SELECT 1 FROM pedido_itens pi2
                    JOIN pedido_itens pi3 ON pi2.pedido_id = pi3.pedido_id
                    WHERE pi2.produto_id = ANY(v_historico.produtos_comprados)
                    AND pi3.produto_id = p.id
                ) THEN 0.9
                -- Mesma categoria
                WHEN p.categoria = ANY(v_historico.categorias_preferidas) THEN 0.7
                -- Produto popular
                WHEN p.id IN (SELECT produto_id FROM mv_produtos_populares WHERE farmacia_id = p_farmacia_id LIMIT 20) THEN 0.5
                ELSE 0.3
            END as score,
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM pedido_itens pi2
                    JOIN pedido_itens pi3 ON pi2.pedido_id = pi3.pedido_id
                    WHERE pi2.produto_id = ANY(v_historico.produtos_comprados)
                    AND pi3.produto_id = p.id
                ) THEN 'Frequentemente comprado junto'
                WHEN p.categoria = ANY(v_historico.categorias_preferidas) THEN 'Baseado em suas preferências'
                WHEN p.id IN (SELECT produto_id FROM mv_produtos_populares WHERE farmacia_id = p_farmacia_id LIMIT 20) THEN 'Produto popular'
                ELSE 'Você pode gostar'
            END as motivo
        FROM produtos p
        WHERE p.farmacia_id = p_farmacia_id
        AND p.ativo = true
        AND p.estoque_atual > 0
        AND p.id NOT IN (COALESCE(v_historico.produtos_comprados, ARRAY[]::UUID[]))
    )
    SELECT * FROM scores
    ORDER BY score DESC
    LIMIT p_limite;
END;
$$ LANGUAGE plpgsql;

-- Function para análise de sentimento simples
CREATE OR REPLACE FUNCTION analisar_sentimento(p_texto TEXT)
RETURNS DECIMAL AS $$
DECLARE
    palavras_positivas TEXT[] := ARRAY['otimo', 'excelente', 'bom', 'rapido', 'eficiente', 'satisfeito', 'feliz', 'agradeço', 'obrigado'];
    palavras_negativas TEXT[] := ARRAY['ruim', 'pessimo', 'demorado', 'caro', 'insatisfeito', 'problema', 'erro', 'falha'];
    score_positivo INTEGER := 0;
    score_negativo INTEGER := 0;
    palavra TEXT;
BEGIN
    -- Normalizar texto
    p_texto := lower(unaccent(p_texto));
    
    -- Contar palavras positivas
    FOREACH palavra IN ARRAY palavras_positivas
    LOOP
        IF p_texto LIKE '%' || palavra || '%' THEN
            score_positivo := score_positivo + 1;
        END IF;
    END LOOP;
    
    -- Contar palavras negativas
    FOREACH palavra IN ARRAY palavras_negativas
    LOOP
        IF p_texto LIKE '%' || palavra || '%' THEN
            score_negativo := score_negativo + 1;
        END IF;
    END LOOP;
    
    -- Calcular score final (-1 a 1)
    IF score_positivo + score_negativo = 0 THEN
        RETURN 0;
    ELSE
        RETURN (score_positivo - score_negativo)::DECIMAL / (score_positivo + score_negativo);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function para previsão de demanda simples
CREATE OR REPLACE FUNCTION prever_demanda_produto(
    p_produto_id UUID,
    p_dias_futuros INTEGER DEFAULT 7
)
RETURNS TABLE (
    data_previsao DATE,
    quantidade_prevista INTEGER,
    confidence DECIMAL
) AS $$
DECLARE
    media_diaria DECIMAL;
    desvio_padrao DECIMAL;
    tendencia DECIMAL;
BEGIN
    -- Calcular estatísticas dos últimos 30 dias
    SELECT 
        AVG(vendas_diarias.quantidade),
        STDDEV(vendas_diarias.quantidade),
        -- Tendência simples (regressão linear)
        CASE 
            WHEN COUNT(*) > 1 THEN
                (COUNT(*) * SUM(dia * quantidade) - SUM(dia) * SUM(quantidade)) / 
                (COUNT(*) * SUM(dia * dia) - SUM(dia) * SUM(dia))
            ELSE 0
        END
    INTO media_diaria, desvio_padrao, tendencia
    FROM (
        SELECT 
            DATE(pe.created_at) as data,
            SUM(pi.quantidade) as quantidade,
            EXTRACT(EPOCH FROM DATE(pe.created_at) - MIN(DATE(pe.created_at)) OVER()) / 86400 as dia
        FROM pedido_itens pi
        JOIN pedidos pe ON pi.pedido_id = pe.id
        WHERE pi.produto_id = p_produto_id
        AND pe.created_at >= NOW() - INTERVAL '30 days'
        AND pe.status = 'finalizado'
        GROUP BY DATE(pe.created_at)
    ) as vendas_diarias;
    
    -- Gerar previsões
    FOR i IN 1..p_dias_futuros LOOP
        data_previsao := CURRENT_DATE + i;
        quantidade_prevista := GREATEST(0, ROUND(media_diaria + (tendencia * i)))::INTEGER;
        confidence := CASE 
            WHEN desvio_padrao IS NULL OR desvio_padrao = 0 THEN 0.5
            ELSE LEAST(0.95, 1 - (desvio_padrao / NULLIF(media_diaria, 0)))
        END;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS AVANÇADOS
-- =====================================================

-- Trigger para atualizar analytics em tempo real
CREATE OR REPLACE FUNCTION update_analytics_conversas()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO analytics_conversas (
        time,
        farmacia_id,
        total_mensagens,
        mensagens_respondidas,
        sentimento_medio
    )
    VALUES (
        date_trunc('hour', NOW()),
        (SELECT farmacia_id FROM conversas WHERE id = NEW.conversa_id),
        1,
        CASE WHEN NEW.tipo = 'saida' THEN 1 ELSE 0 END,
        analisar_sentimento(NEW.conteudo)
    )
    ON CONFLICT (time, farmacia_id) DO UPDATE
    SET 
        total_mensagens = analytics_conversas.total_mensagens + 1,
        mensagens_respondidas = analytics_conversas.mensagens_respondidas + 
            CASE WHEN NEW.tipo = 'saida' THEN 1 ELSE 0 END,
        sentimento_medio = (
            analytics_conversas.sentimento_medio * analytics_conversas.total_mensagens + 
            analisar_sentimento(NEW.conteudo)
        ) / (analytics_conversas.total_mensagens + 1);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_analytics_conversas
AFTER INSERT ON mensagens
FOR EACH ROW EXECUTE FUNCTION update_analytics_conversas();

-- =====================================================
-- ÍNDICES OTIMIZADOS
-- =====================================================

-- Índices compostos para queries comuns
CREATE INDEX idx_produtos_busca ON produtos(farmacia_id, ativo, nome);
CREATE INDEX idx_pedidos_analytics ON pedidos(farmacia_id, status, created_at);
CREATE INDEX idx_mensagens_conversa_time ON mensagens(conversa_id, created_at DESC);

-- Índices parciais para performance
CREATE INDEX idx_produtos_disponiveis ON produtos(farmacia_id, nome) 
WHERE ativo = true AND estoque_atual > 0;

CREATE INDEX idx_pedidos_pendentes ON pedidos(farmacia_id, created_at) 
WHERE status = 'pendente';

-- =====================================================
-- PARTICIONAMENTO DE TABELAS GRANDES
-- =====================================================

-- Particionar tabela de mensagens por mês
CREATE TABLE mensagens_2024_01 PARTITION OF mensagens
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE mensagens_2024_02 PARTITION OF mensagens
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Adicionar mais partições conforme necessário...

-- =====================================================
-- JOBS DE MANUTENÇÃO
-- =====================================================

-- Refresh de views materializadas
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_produtos_populares;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_metricas_clientes;
END;
$$ LANGUAGE plpgsql;

-- Agendar refresh (usar pg_cron ou scheduler externo)
-- SELECT cron.schedule('refresh-mv', '0 */4 * * *', 'SELECT refresh_materialized_views();');

-- =====================================================
-- DADOS DE EXEMPLO EXPANDIDOS
-- =====================================================

-- Inserir farmácia exemplo com configurações
INSERT INTO farmacias (id, nome, cnpj, telefone, whatsapp_number, config) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Farmácia Saúde Total', '98.765.432/0001-10', 
 '11987654321', '5511987654321', 
 '{"horario_funcionamento": {"seg-sex": "08:00-22:00", "sab": "08:00-20:00", "dom": "09:00-18:00"}, 
   "delivery": {"ativo": true, "raio_km": 5, "taxa_minima": 3.00}}'::jsonb);

-- Configurações de IA para a farmácia
INSERT INTO configuracoes_ia (farmacia_id, personalidade, tom_voz, features_ativas) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'amigavel', 
 '{"formalidade": 0.3, "empatia": 0.9, "proatividade": 0.7}'::jsonb,
 '{"price_comparison": true, "recommendations": true, "health_tips": true, "loyalty_program": true}'::jsonb);

-- =====================================================
-- COMENTÁRIOS ATUALIZADOS
-- =====================================================

COMMENT ON TABLE analytics_conversas IS 'Time-series data de analytics das conversas para dashboards em tempo real';
COMMENT ON TABLE previsoes_demanda IS 'Previsões de demanda geradas por ML para otimização de estoque';
COMMENT ON TABLE campanhas_marketing IS 'Campanhas de marketing automatizadas via WhatsApp';
COMMENT ON TABLE feedbacks IS 'Avaliações e feedback dos clientes para melhoria contínua';
COMMENT ON TABLE configuracoes_ia IS 'Personalização do comportamento da IA por farmácia';

COMMENT ON FUNCTION recomendar_produtos IS 'Sistema de recomendação baseado em histórico de compras e padrões';
COMMENT ON FUNCTION analisar_sentimento IS 'Análise básica de sentimento para feedbacks e conversas';
COMMENT ON FUNCTION prever_demanda_produto IS 'Previsão simples de demanda baseada em histórico de vendas'; 