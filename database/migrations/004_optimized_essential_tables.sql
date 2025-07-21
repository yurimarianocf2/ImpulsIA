-- =============================================================================
-- TABELAS ESSENCIAIS PARA FARMÁCIA WHATSAPP (VERSÃO OTIMIZADA)
-- =============================================================================
-- Baseado na análise arquitetural: mantém apenas dados que devem persistir
-- Redis gerencia sessões temporárias, Supabase gerencia dados persistentes
-- =============================================================================

-- 1. TABELA DE PERFIL DO CLIENTE (DADOS DURADOURAS)
-- -----------------------------------------------------------------------------
-- Armazena preferências e padrões que precisam persistir além da sessão

CREATE TABLE cliente_perfil (
    cliente_id UUID PRIMARY KEY REFERENCES clientes(cliente_id) ON DELETE CASCADE,
    
    -- Preferências duradouras (não temporárias como no Redis)
    prefere_promocoes BOOLEAN DEFAULT true,
    aceita_sugestoes BOOLEAN DEFAULT true,
    tipo_cliente TEXT DEFAULT 'regular' CHECK (tipo_cliente IN ('regular', 'frequente', 'vip')),
    
    -- Histórico de comportamento para personalização
    medicamentos_frequentes JSONB DEFAULT '[]', -- [{"nome": "Dipirona", "count": 5}]
    categorias_interesse JSONB DEFAULT '[]',     -- ["analgésicos", "vitaminas"]
    
    -- Métricas de negócio importantes
    total_pedidos INTEGER DEFAULT 0,
    valor_total_compras DECIMAL(10,2) DEFAULT 0,
    ticket_medio DECIMAL(10,2),
    ultima_compra_em TIMESTAMPTZ,
    
    -- Dados para segmentação e marketing
    cliente_ativo BOOLEAN DEFAULT true,
    data_ultima_interacao TIMESTAMPTZ DEFAULT NOW(),
    
    -- Observações importantes (alergias, prescrições especiais)
    observacoes_especiais TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_cliente_perfil_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cliente_perfil_updated_at
    BEFORE UPDATE ON cliente_perfil
    FOR EACH ROW
    EXECUTE FUNCTION update_cliente_perfil_updated_at();

-- 2. TABELA DE ANALYTICS DE CONSULTAS (DADOS HISTÓRICOS)
-- -----------------------------------------------------------------------------
-- Para análise de demanda e comportamento - dados que precisam persistir

CREATE TABLE consultas_precos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(cliente_id),
    telefone_hash TEXT NOT NULL, -- Hash para privacidade
    
    -- Dados da consulta
    produto_pesquisado TEXT NOT NULL,
    produto_encontrado UUID REFERENCES produtos(produto_id),
    preco_informado DECIMAL(10,2),
    promocao_ativa BOOLEAN DEFAULT false,
    
    -- Para análise de negócio
    dia_semana INTEGER DEFAULT EXTRACT(DOW FROM NOW()), -- 0=domingo, 1=segunda...
    hora_consulta INTEGER DEFAULT EXTRACT(HOUR FROM NOW()),
    
    -- Resultado e conversão
    resultado TEXT NOT NULL CHECK (resultado IN ('encontrado', 'nao_encontrado', 'sugestao_enviada')),
    levou_ao_pedido BOOLEAN DEFAULT false,
    pedido_id UUID REFERENCES pedidos(id),
    
    timestamp_consulta TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para analytics e performance
CREATE INDEX idx_consultas_produto_pesquisado ON consultas_precos(produto_pesquisado);
CREATE INDEX idx_consultas_timestamp ON consultas_precos(timestamp_consulta);
CREATE INDEX idx_consultas_cliente ON consultas_precos(cliente_id);
CREATE INDEX idx_consultas_analytics ON consultas_precos(dia_semana, hora_consulta);

-- 3. FUNÇÕES PARA INTEGRAÇÃO N8N (SEM SESSÕES)
-- -----------------------------------------------------------------------------

-- Função para atualizar perfil do cliente baseado em interação
CREATE OR REPLACE FUNCTION atualizar_perfil_cliente(
    tel TEXT,
    medicamento TEXT DEFAULT NULL,
    categoria TEXT DEFAULT NULL,
    valor_compra DECIMAL DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    cliente_uuid UUID;
    perfil_existe BOOLEAN := FALSE;
BEGIN
    -- Buscar cliente pelo telefone
    SELECT cliente_id INTO cliente_uuid
    FROM clientes WHERE telefone = tel;
    
    IF cliente_uuid IS NULL THEN
        -- Cliente não existe ainda
        RETURN NULL;
    END IF;
    
    -- Verificar se perfil existe
    SELECT EXISTS(SELECT 1 FROM cliente_perfil WHERE cliente_id = cliente_uuid) INTO perfil_existe;
    
    IF NOT perfil_existe THEN
        -- Criar perfil básico
        INSERT INTO cliente_perfil (cliente_id) VALUES (cliente_uuid);
    END IF;
    
    -- Atualizar dados baseado na interação
    UPDATE cliente_perfil SET
        data_ultima_interacao = NOW(),
        -- Adicionar medicamento aos frequentes se informado
        medicamentos_frequentes = CASE 
            WHEN medicamento IS NOT NULL THEN
                COALESCE(medicamentos_frequentes, '[]'::jsonb) || 
                jsonb_build_object('nome', medicamento, 'timestamp', NOW())
            ELSE medicamentos_frequentes
        END,
        -- Adicionar categoria se informada
        categorias_interesse = CASE 
            WHEN categoria IS NOT NULL AND NOT (categorias_interesse ? categoria) THEN
                COALESCE(categorias_interesse, '[]'::jsonb) || to_jsonb(categoria)
            ELSE categorias_interesse
        END,
        -- Atualizar valores se houve compra
        total_pedidos = CASE 
            WHEN valor_compra IS NOT NULL THEN total_pedidos + 1 
            ELSE total_pedidos 
        END,
        valor_total_compras = CASE 
            WHEN valor_compra IS NOT NULL THEN valor_total_compras + valor_compra 
            ELSE valor_total_compras 
        END,
        ticket_medio = CASE 
            WHEN valor_compra IS NOT NULL THEN 
                (valor_total_compras + valor_compra) / (total_pedidos + 1)
            ELSE ticket_medio 
        END,
        ultima_compra_em = CASE 
            WHEN valor_compra IS NOT NULL THEN NOW() 
            ELSE ultima_compra_em 
        END,
        -- Determinar tipo de cliente baseado em comportamento
        tipo_cliente = CASE 
            WHEN (total_pedidos + CASE WHEN valor_compra IS NOT NULL THEN 1 ELSE 0 END) >= 10 THEN 'vip'
            WHEN (total_pedidos + CASE WHEN valor_compra IS NOT NULL THEN 1 ELSE 0 END) >= 3 THEN 'frequente'
            ELSE 'regular'
        END
    WHERE cliente_id = cliente_uuid;
    
    RETURN cliente_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar contexto do cliente (dados persistentes)
CREATE OR REPLACE FUNCTION obter_contexto_persistente_cliente(tel TEXT)
RETURNS TABLE(
    tem_cadastro BOOLEAN,
    nome_mascarado TEXT,
    tipo_cliente TEXT,
    total_pedidos INTEGER,
    medicamentos_frequentes JSONB,
    prefere_promocoes BOOLEAN,
    observacoes_especiais TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.cliente_id IS NOT NULL as tem_cadastro,
        CASE WHEN c.nome IS NOT NULL THEN mascara_nome(c.nome) ELSE NULL END as nome_mascarado,
        COALESCE(p.tipo_cliente, 'regular') as tipo_cliente,
        COALESCE(p.total_pedidos, 0) as total_pedidos,
        COALESCE(p.medicamentos_frequentes, '[]'::jsonb) as medicamentos_frequentes,
        COALESCE(p.prefere_promocoes, true) as prefere_promocoes,
        p.observacoes_especiais
    FROM clientes c
    LEFT JOIN cliente_perfil p ON c.cliente_id = p.cliente_id  
    WHERE c.telefone = tel;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para registrar consulta de preços
CREATE OR REPLACE FUNCTION registrar_consulta_preco(
    tel TEXT,
    produto TEXT,
    produto_id UUID DEFAULT NULL,
    preco DECIMAL DEFAULT NULL,
    tem_promocao BOOLEAN DEFAULT false,
    resultado_busca TEXT DEFAULT 'encontrado'
)
RETURNS UUID AS $$
DECLARE
    consulta_id UUID;
    cliente_uuid UUID;
BEGIN
    -- Buscar cliente
    SELECT cliente_id INTO cliente_uuid FROM clientes WHERE telefone = tel;
    
    -- Registrar consulta
    INSERT INTO consultas_precos (
        cliente_id, telefone_hash, produto_pesquisado, produto_encontrado,
        preco_informado, promocao_ativa, resultado
    ) VALUES (
        cliente_uuid,
        encode(digest(tel, 'sha256'), 'hex'), -- Hash do telefone
        produto,
        produto_id,
        preco,
        tem_promocao,
        resultado_busca
    ) RETURNING id INTO consulta_id;
    
    RETURN consulta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- POLÍTICAS RLS PARA NOVAS TABELAS
-- =============================================================================

-- Habilitar RLS
ALTER TABLE cliente_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas_precos ENABLE ROW LEVEL SECURITY;

-- Políticas (apenas service_role pode acessar - usado pelo N8N)
CREATE POLICY "perfil_service_only" ON cliente_perfil FOR ALL 
USING (current_setting('role') = 'service_role');

CREATE POLICY "consultas_service_only" ON consultas_precos FOR ALL 
USING (current_setting('role') = 'service_role');

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON TABLE cliente_perfil IS 'Perfil persistente do cliente - dados que sobrevivem além da sessão Redis';
COMMENT ON TABLE consultas_precos IS 'Analytics de consultas de preços para análise de demanda e comportamento';

COMMENT ON FUNCTION atualizar_perfil_cliente IS 'Atualiza perfil baseado em interações - chamada pelo N8N';
COMMENT ON FUNCTION obter_contexto_persistente_cliente IS 'Busca dados persistentes do cliente (não temporários)';
COMMENT ON FUNCTION registrar_consulta_preco IS 'Registra consulta para analytics de negócio';

-- Verificar criação das tabelas
SELECT 
    'TABELA CRIADA: ' || table_name as status,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cliente_perfil', 'consultas_precos')
ORDER BY table_name;