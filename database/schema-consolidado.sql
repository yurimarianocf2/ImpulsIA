-- ESQUEMA CONSOLIDADO SUPABASE - FARMABOT PRO
-- Elimina duplicações e organiza informações em estrutura otimizada
-- Cada farmácia terá seu próprio cadastro consolidado de medicamentos

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =====================================================
-- TABELA PRINCIPAL: FARMACIAS
-- =====================================================
CREATE TABLE IF NOT EXISTS farmacias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    whatsapp VARCHAR(20) UNIQUE,
    endereco JSONB,
    horario_funcionamento JSONB DEFAULT '{"seg-sex": "08:00-18:00", "sab": "08:00-12:00"}',
    config JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- TABELA CONSOLIDADA: MEDICAMENTOS
-- Todas as informações em uma única tabela por farmácia
-- =====================================================
CREATE TABLE IF NOT EXISTS medicamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmacia_id UUID NOT NULL REFERENCES farmacias(id) ON DELETE CASCADE,
    
    -- Identificação do produto
    codigo_barras VARCHAR(50),
    nome VARCHAR(255) NOT NULL,
    nome_comercial VARCHAR(255),
    nome_generico VARCHAR(255),
    
    -- Informações farmacêuticas
    principio_ativo VARCHAR(255),
    concentracao VARCHAR(100),
    forma_farmaceutica VARCHAR(100), -- comprimido, cápsula, xarope, etc
    apresentacao VARCHAR(255),
    fabricante VARCHAR(255),
    laboratorio VARCHAR(255),
    
    -- Categorização
    categoria VARCHAR(100),
    subcategoria VARCHAR(100),
    classe_terapeutica VARCHAR(255),
    
    -- Informações comerciais
    preco_venda DECIMAL(10,2),
    preco_custo DECIMAL(10,2),
    margem_lucro DECIMAL(5,2),
    preco_tabela DECIMAL(10,2), -- preço sugerido pelo fabricante
    desconto_maximo DECIMAL(5,2),
    
    -- Controle de estoque
    estoque_atual INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 5,
    estoque_maximo INTEGER DEFAULT 100,
    unidade VARCHAR(20) DEFAULT 'UN',
    lote VARCHAR(50),
    
    -- Validade e controle
    validade DATE NOT NULL, -- Data de validade obrigatória
    data_entrada DATE DEFAULT CURRENT_DATE,
    dias_para_vencer INTEGER GENERATED ALWAYS AS (validade - CURRENT_DATE) STORED,
    status_validade VARCHAR(20) GENERATED ALWAYS AS (
        CASE 
            WHEN validade < CURRENT_DATE THEN 'vencido'
            WHEN validade <= CURRENT_DATE + INTERVAL '30 days' THEN 'vencendo'
            WHEN validade <= CURRENT_DATE + INTERVAL '60 days' THEN 'atencao'
            ELSE 'ok'
        END
    ) STORED,
    
    -- Regulamentação
    requer_receita BOOLEAN DEFAULT false,
    tipo_receita VARCHAR(50), -- branca, azul, amarela, especial
    controlado BOOLEAN DEFAULT false,
    psicoativo BOOLEAN DEFAULT false,
    antimicrobiano BOOLEAN DEFAULT false,
    
    -- Informações complementares
    indicacao TEXT,
    contraindicacao TEXT,
    posologia TEXT,
    observacoes TEXT,
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    
    -- Controle de sistema
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Constraints
    UNIQUE(farmacia_id, codigo_barras),
    CHECK (preco_venda >= 0),
    CHECK (preco_custo >= 0),
    CHECK (estoque_atual >= 0),
    CHECK (validade > '2020-01-01')
);

-- =====================================================
-- TABELA: HISTORICO_PRECOS
-- Histórico de mudanças de preços
-- =====================================================
CREATE TABLE IF NOT EXISTS historico_precos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicamento_id UUID NOT NULL REFERENCES medicamentos(id) ON DELETE CASCADE,
    preco_anterior DECIMAL(10,2),
    preco_novo DECIMAL(10,2),
    motivo VARCHAR(255),
    usuario VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- TABELA: ANALISES_PRECO_CONSOLIDADA
-- Análises de preços consolidadas
-- =====================================================
CREATE TABLE IF NOT EXISTS analises_preco_consolidada (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicamento_id UUID NOT NULL REFERENCES medicamentos(id) ON DELETE CASCADE,
    farmacia_id UUID NOT NULL REFERENCES farmacias(id) ON DELETE CASCADE,
    
    -- Preços de referência
    preco_local DECIMAL(10,2) NOT NULL,
    preco_medio_mercado DECIMAL(10,2),
    preco_minimo_mercado DECIMAL(10,2),
    preco_maximo_mercado DECIMAL(10,2),
    
    -- Análise competitiva
    posicao_competitiva VARCHAR(20), -- 'muito_baixo', 'baixo', 'medio', 'alto', 'muito_alto'
    percentil_preco INTEGER, -- 1-100
    margem_atual DECIMAL(5,2),
    margem_sugerida DECIMAL(5,2),
    
    -- Fontes dos dados
    fontes_comparacao JSONB DEFAULT '[]',
    precos_externos JSONB DEFAULT '[]',
    
    -- Recomendações
    recomendacao_preco DECIMAL(10,2),
    recomendacao_descricao TEXT,
    confidence_score DECIMAL(3,2),
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Único por medicamento e data
    CONSTRAINT uk_analise_medicamento_data UNIQUE (medicamento_id, DATE(created_at))
);

-- =====================================================
-- TABELA: CONVERSAS_WHATSAPP
-- =====================================================
CREATE TABLE IF NOT EXISTS conversas_whatsapp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmacia_id UUID NOT NULL REFERENCES farmacias(id) ON DELETE CASCADE,
    whatsapp_id VARCHAR(50) NOT NULL,
    cliente_telefone VARCHAR(20) NOT NULL,
    cliente_nome VARCHAR(255),
    status VARCHAR(50) DEFAULT 'ativa',
    contexto JSONB DEFAULT '{}',
    ultima_mensagem TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    UNIQUE(farmacia_id, whatsapp_id)
);

-- =====================================================
-- TABELA: MENSAGENS_WHATSAPP
-- =====================================================
CREATE TABLE IF NOT EXISTS mensagens_whatsapp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversa_id UUID NOT NULL REFERENCES conversas_whatsapp(id) ON DELETE CASCADE,
    whatsapp_message_id VARCHAR(100) UNIQUE,
    tipo VARCHAR(20) NOT NULL, -- 'entrada', 'saida'
    conteudo TEXT NOT NULL,
    tipo_conteudo VARCHAR(50) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    processada BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- TABELA: PEDIDOS_CONSOLIDADA
-- =====================================================
CREATE TABLE IF NOT EXISTS pedidos_consolidada (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmacia_id UUID NOT NULL REFERENCES farmacias(id) ON DELETE CASCADE,
    conversa_id UUID REFERENCES conversas_whatsapp(id),
    
    -- Informações do pedido
    numero_pedido VARCHAR(20) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pendente',
    
    -- Cliente
    cliente_nome VARCHAR(255),
    cliente_telefone VARCHAR(20),
    cliente_cpf VARCHAR(14),
    
    -- Valores
    subtotal DECIMAL(10,2) DEFAULT 0,
    desconto DECIMAL(10,2) DEFAULT 0,
    valor_total DECIMAL(10,2) NOT NULL,
    
    -- Pagamento e entrega
    forma_pagamento VARCHAR(50),
    tipo_entrega VARCHAR(50) DEFAULT 'balcao',
    endereco_entrega JSONB,
    taxa_entrega DECIMAL(10,2) DEFAULT 0,
    
    -- Observações
    observacoes TEXT,
    observacoes_internas TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- TABELA: ITENS_PEDIDO
-- =====================================================
CREATE TABLE IF NOT EXISTS itens_pedido (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID NOT NULL REFERENCES pedidos_consolidada(id) ON DELETE CASCADE,
    medicamento_id UUID NOT NULL REFERENCES medicamentos(id),
    
    -- Informações do item
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario DECIMAL(10,2) NOT NULL,
    desconto_item DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    
    -- Informações do produto no momento da venda
    nome_produto VARCHAR(255) NOT NULL,
    lote VARCHAR(50),
    validade DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- ÍNDICES OTIMIZADOS
-- =====================================================

-- Índices para medicamentos
CREATE INDEX IF NOT EXISTS idx_medicamentos_farmacia ON medicamentos(farmacia_id);
CREATE INDEX IF NOT EXISTS idx_medicamentos_nome ON medicamentos USING gin(nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_medicamentos_principio ON medicamentos(principio_ativo);
CREATE INDEX IF NOT EXISTS idx_medicamentos_categoria ON medicamentos(categoria);
CREATE INDEX IF NOT EXISTS idx_medicamentos_validade ON medicamentos(farmacia_id, validade) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_medicamentos_vencendo ON medicamentos(farmacia_id, status_validade) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_medicamentos_estoque ON medicamentos(farmacia_id, estoque_atual) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_medicamentos_codigo ON medicamentos(codigo_barras) WHERE codigo_barras IS NOT NULL;

-- Índices para análises de preço
CREATE INDEX IF NOT EXISTS idx_analises_preco_medicamento ON analises_preco_consolidada(medicamento_id);
CREATE INDEX IF NOT EXISTS idx_analises_preco_farmacia ON analises_preco_consolidada(farmacia_id);
CREATE INDEX IF NOT EXISTS idx_analises_preco_data ON analises_preco_consolidada(created_at DESC);

-- Índices para pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_farmacia ON pedidos_consolidada(farmacia_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos_consolidada(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_data ON pedidos_consolidada(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_itens_pedido ON itens_pedido(pedido_id);

-- =====================================================
-- VIEWS CONSOLIDADAS
-- =====================================================

-- View de medicamentos disponíveis
CREATE OR REPLACE VIEW v_medicamentos_disponiveis AS
SELECT 
    m.*,
    f.nome as farmacia_nome,
    CASE 
        WHEN m.estoque_atual > m.estoque_minimo THEN 'disponivel'
        WHEN m.estoque_atual > 0 THEN 'baixo_estoque'
        ELSE 'indisponivel'
    END as status_estoque,
    CASE 
        WHEN m.validade < CURRENT_DATE THEN 'vencido'
        WHEN m.validade <= CURRENT_DATE + INTERVAL '30 days' THEN 'vencendo'
        ELSE 'ok'
    END as status_validade_atual
FROM medicamentos m
JOIN farmacias f ON m.farmacia_id = f.id
WHERE m.ativo = true AND f.ativo = true;

-- View de medicamentos vencendo
CREATE OR REPLACE VIEW v_medicamentos_vencendo AS
SELECT 
    m.id,
    m.farmacia_id,
    m.nome,
    m.principio_ativo,
    m.lote,
    m.validade,
    m.estoque_atual,
    m.preco_venda,
    m.dias_para_vencer,
    m.status_validade,
    f.nome as farmacia_nome
FROM medicamentos m
JOIN farmacias f ON m.farmacia_id = f.id
WHERE m.ativo = true 
AND f.ativo = true
AND m.validade <= CURRENT_DATE + INTERVAL '60 days'
ORDER BY m.validade ASC;

-- View de relatório de vendas
CREATE OR REPLACE VIEW v_relatorio_vendas AS
SELECT 
    p.farmacia_id,
    f.nome as farmacia_nome,
    DATE(p.created_at) as data_venda,
    COUNT(DISTINCT p.id) as total_pedidos,
    SUM(p.valor_total) as faturamento_dia,
    AVG(p.valor_total) as ticket_medio,
    COUNT(DISTINCT ip.medicamento_id) as produtos_vendidos,
    SUM(ip.quantidade) as unidades_vendidas
FROM pedidos_consolidada p
JOIN farmacias f ON p.farmacia_id = f.id
JOIN itens_pedido ip ON p.id = ip.pedido_id
WHERE p.status = 'finalizado'
GROUP BY p.farmacia_id, f.nome, DATE(p.created_at);

-- =====================================================
-- FUNÇÕES CONSOLIDADAS
-- =====================================================

-- Função para buscar medicamentos
CREATE OR REPLACE FUNCTION buscar_medicamentos(
    p_farmacia_id UUID,
    p_termo VARCHAR,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    nome VARCHAR,
    principio_ativo VARCHAR,
    preco_venda DECIMAL,
    estoque_atual INTEGER,
    validade DATE,
    status_validade VARCHAR,
    similaridade REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.nome,
        m.principio_ativo,
        m.preco_venda,
        m.estoque_atual,
        m.validade,
        m.status_validade,
        similarity(m.nome, p_termo) as similaridade
    FROM medicamentos m
    WHERE 
        m.farmacia_id = p_farmacia_id
        AND m.ativo = true
        AND (
            m.nome ILIKE '%' || p_termo || '%'
            OR m.principio_ativo ILIKE '%' || p_termo || '%'
            OR m.nome_generico ILIKE '%' || p_termo || '%'
            OR similarity(m.nome, p_termo) > 0.3
        )
    ORDER BY 
        CASE WHEN m.nome ILIKE p_termo || '%' THEN 0 ELSE 1 END,
        similarity(m.nome, p_termo) DESC,
        m.estoque_atual DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Função para obter medicamentos vencendo
CREATE OR REPLACE FUNCTION obter_medicamentos_vencendo(
    p_farmacia_id UUID,
    p_dias INTEGER DEFAULT 60
)
RETURNS TABLE (
    id UUID,
    nome VARCHAR,
    validade DATE,
    dias_para_vencer INTEGER,
    estoque_atual INTEGER,
    valor_estoque DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.nome,
        m.validade,
        m.dias_para_vencer,
        m.estoque_atual,
        (m.estoque_atual * m.preco_custo) as valor_estoque
    FROM medicamentos m
    WHERE 
        m.farmacia_id = p_farmacia_id
        AND m.ativo = true
        AND m.validade <= CURRENT_DATE + (p_dias || ' days')::interval
        AND m.estoque_atual > 0
    ORDER BY m.validade ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
CREATE TRIGGER update_farmacias_updated_at 
    BEFORE UPDATE ON farmacias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medicamentos_updated_at 
    BEFORE UPDATE ON medicamentos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversas_updated_at 
    BEFORE UPDATE ON conversas_whatsapp
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at 
    BEFORE UPDATE ON pedidos_consolidada
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para histórico de preços
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.preco_venda != NEW.preco_venda THEN
        INSERT INTO historico_precos (medicamento_id, preco_anterior, preco_novo, motivo)
        VALUES (NEW.id, OLD.preco_venda, NEW.preco_venda, 'Alteração via sistema');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_price_change
    AFTER UPDATE ON medicamentos
    FOR EACH ROW EXECUTE FUNCTION log_price_change();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Habilitar RLS
ALTER TABLE farmacias ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_consolidada ENABLE ROW LEVEL SECURITY;
ALTER TABLE analises_preco_consolidada ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar conforme autenticação)
CREATE POLICY "Farmácias veem seus dados" ON medicamentos
    FOR ALL USING (farmacia_id = auth.uid()::uuid);

CREATE POLICY "Farmácias veem suas conversas" ON conversas_whatsapp
    FOR ALL USING (farmacia_id = auth.uid()::uuid);

CREATE POLICY "Farmácias veem seus pedidos" ON pedidos_consolidada
    FOR ALL USING (farmacia_id = auth.uid()::uuid);

-- =====================================================
-- INSERIR FARMÁCIA PADRÃO
-- =====================================================
INSERT INTO farmacias (
    id, 
    nome, 
    cnpj, 
    telefone, 
    whatsapp,
    endereco,
    horario_funcionamento,
    ativo
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'Farmácia Saúde Total',
    '12.345.678/0001-90',
    '11987654321',
    '5511987654321',
    '{"rua": "Rua das Flores", "numero": "123", "bairro": "Centro", "cidade": "São Paulo", "uf": "SP", "cep": "01234-567"}'::jsonb,
    '{"seg-sex": "07:00-22:00", "sab": "07:00-20:00", "dom": "08:00-18:00"}'::jsonb,
    true
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    updated_at = NOW();

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE farmacias IS 'Tabela principal de farmácias - multi-tenant';
COMMENT ON TABLE medicamentos IS 'Tabela consolidada de medicamentos com todas as informações necessárias';
COMMENT ON TABLE analises_preco_consolidada IS 'Análises de preços consolidadas sem duplicação';
COMMENT ON TABLE conversas_whatsapp IS 'Conversas do WhatsApp organizadas por farmácia';
COMMENT ON TABLE pedidos_consolidada IS 'Pedidos consolidados com todas as informações';
COMMENT ON TABLE historico_precos IS 'Histórico de mudanças de preços para auditoria';

COMMENT ON FUNCTION buscar_medicamentos IS 'Busca medicamentos com similaridade e ranking';
COMMENT ON FUNCTION obter_medicamentos_vencendo IS 'Retorna medicamentos próximos ao vencimento';