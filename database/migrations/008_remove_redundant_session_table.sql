-- =============================================================================
-- MIGRAÇÃO: REMOÇÃO DE TABELA REDUNDANTE E OTIMIZAÇÃO DA ARQUITETURA
-- =============================================================================
-- Remove sessoes_whatsapp que será gerenciada pelo Redis
-- Mantém apenas dados que precisam persistir no Supabase
-- =============================================================================

-- 1. BACKUP DE SEGURANÇA (caso haja dados importantes)
-- -----------------------------------------------------------------------------
-- Execute apenas se quiser preservar dados existentes para análise
-- CREATE TABLE sessoes_whatsapp_backup AS SELECT * FROM sessoes_whatsapp;

-- 2. REMOÇÃO DA TABELA REDUNDANTE
-- -----------------------------------------------------------------------------
-- A tabela sessoes_whatsapp será substituída pelo Redis

DROP TABLE IF EXISTS sessoes_whatsapp CASCADE;

-- 3. OTIMIZAÇÃO DA FUNÇÃO DE CONTEXTO
-- -----------------------------------------------------------------------------
-- Remove dependência da tabela sessoes_whatsapp
-- Mantém apenas dados persistentes necessários

CREATE OR REPLACE FUNCTION obter_contexto_cliente(tel TEXT)
RETURNS TABLE(
    tem_cadastro BOOLEAN,
    nome_mascarado TEXT,
    total_pedidos INTEGER,
    medicamentos_frequentes JSONB,
    cliente_vip BOOLEAN,
    ultima_compra TIMESTAMPTZ,
    ticket_medio DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.cliente_id IS NOT NULL as tem_cadastro,
        CASE WHEN c.nome IS NOT NULL THEN mascara_nome(c.nome) ELSE NULL END as nome_mascarado,
        COALESCE(p.total_pedidos, 0) as total_pedidos,
        COALESCE(p.medicamentos_frequentes, '[]'::jsonb) as medicamentos_frequentes,
        COALESCE(p.cliente_vip, false) as cliente_vip,
        p.ultima_compra_em,
        p.ticket_medio
    FROM clientes c
    LEFT JOIN cliente_perfil p ON c.cliente_id = p.cliente_id
    WHERE c.telefone = tel;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. NOVA FUNÇÃO PARA ATUALIZAÇÃO DE PERFIL (SEM SESSÃO)
-- -----------------------------------------------------------------------------
-- Atualiza apenas dados persistentes no perfil do cliente

CREATE OR REPLACE FUNCTION atualizar_perfil_cliente(
    tel TEXT,
    nova_compra BOOLEAN DEFAULT FALSE,
    valor_pedido DECIMAL(10,2) DEFAULT NULL,
    medicamentos_pedido JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    cliente_id_encontrado UUID;
    medicamentos_atuais JSONB;
BEGIN
    -- Buscar cliente_id
    SELECT c.cliente_id INTO cliente_id_encontrado
    FROM clientes c WHERE c.telefone = tel;
    
    IF cliente_id_encontrado IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Atualizar perfil do cliente
    INSERT INTO cliente_perfil (cliente_id, ultima_compra_em, total_pedidos, ticket_medio)
    VALUES (cliente_id_encontrado, 
           CASE WHEN nova_compra THEN NOW() ELSE NULL END,
           CASE WHEN nova_compra THEN 1 ELSE 0 END,
           valor_pedido)
    ON CONFLICT (cliente_id) 
    DO UPDATE SET
        ultima_compra_em = CASE WHEN nova_compra THEN NOW() ELSE cliente_perfil.ultima_compra_em END,
        total_pedidos = CASE WHEN nova_compra THEN cliente_perfil.total_pedidos + 1 ELSE cliente_perfil.total_pedidos END,
        ticket_medio = CASE 
            WHEN nova_compra AND valor_pedido IS NOT NULL THEN 
                (COALESCE(cliente_perfil.ticket_medio, 0) * COALESCE(cliente_perfil.total_pedidos, 0) + valor_pedido) / (COALESCE(cliente_perfil.total_pedidos, 0) + 1)
            ELSE cliente_perfil.ticket_medio 
        END,
        updated_at = NOW();
    
    -- Atualizar medicamentos frequentes se fornecido
    IF medicamentos_pedido IS NOT NULL THEN
        -- Buscar medicamentos atuais
        SELECT medicamentos_frequentes INTO medicamentos_atuais
        FROM cliente_perfil WHERE cliente_id = cliente_id_encontrado;
        
        -- Lógica para atualizar frequência seria implementada aqui
        -- Por simplicidade, apenas concatenamos para esta versão
        UPDATE cliente_perfil 
        SET medicamentos_frequentes = medicamentos_pedido,
            updated_at = NOW()
        WHERE cliente_id = cliente_id_encontrado;
    END IF;
    
    RETURN cliente_id_encontrado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ÍNDICES OTIMIZADOS
-- -----------------------------------------------------------------------------
-- Remove índices da tabela removida e otimiza os existentes

-- Otimizar consultas_precos para analytics
CREATE INDEX IF NOT EXISTS idx_consultas_analytics 
ON consultas_precos(timestamp_consulta, levou_ao_pedido, produto_pesquisado);

-- Otimizar cliente_perfil para personalização
CREATE INDEX IF NOT EXISTS idx_perfil_vip_ativo 
ON cliente_perfil(cliente_vip, ultima_compra_em) WHERE cliente_vip = true;

-- 6. COMENTÁRIOS ATUALIZADOS
-- -----------------------------------------------------------------------------

COMMENT ON FUNCTION obter_contexto_cliente IS 'Busca contexto persistente do cliente (sem dados temporários de sessão)';
COMMENT ON FUNCTION atualizar_perfil_cliente IS 'Atualiza dados comportamentais persistentes do cliente';

-- 7. LIMPEZA DE FUNÇÕES OBSOLETAS
-- -----------------------------------------------------------------------------
-- Remove função que dependia da tabela sessoes_whatsapp

DROP FUNCTION IF EXISTS gerenciar_sessao_whatsapp CASCADE;

-- =============================================================================
-- RESUMO DA MIGRAÇÃO
-- =============================================================================
/*
REMOVIDO:
- Tabela sessoes_whatsapp (gerenciado pelo Redis)
- Função gerenciar_sessao_whatsapp (lógica movida para N8N/Redis)

MANTIDO:
- cliente_perfil (dados comportamentais persistentes)
- consultas_precos (analytics de demanda) 
- Todas as funções de segurança e mascaramento

ADICIONADO:
- Função otimizada obter_contexto_cliente
- Função atualizar_perfil_cliente
- Índices otimizados para performance

RESULTADO:
- Arquitetura mais limpa e performática
- Separação clara: Redis (temporário) + Supabase (persistente)
- Redução de custos e complexidade
*/