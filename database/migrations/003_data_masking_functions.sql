-- =============================================================================
-- FUNÇÕES DE MASCARAMENTO DE DADOS - FARMÁCIA ÚNICA
-- =============================================================================
-- Implementa mascaramento conforme LGPD para uma farmácia com múltiplos clientes
-- Protege dados pessoais seguindo as diretrizes do agente WhatsApp
-- =============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. FUNÇÕES DE MASCARAMENTO CONFORME MANUAL FARMACUS
-- -----------------------------------------------------------------------------

-- Mascarar nome: Primeiro nome + iniciais (Ex: "João Silva" -> "João S****")
CREATE OR REPLACE FUNCTION mascara_nome(nome_completo TEXT)
RETURNS TEXT AS $$
BEGIN
    IF nome_completo IS NULL OR LENGTH(nome_completo) = 0 THEN
        RETURN 'N****';
    END IF;
    
    -- Pega primeira palavra (nome) + primeira letra do resto mascarada
    RETURN CASE 
        WHEN POSITION(' ' IN nome_completo) > 0 THEN
            SPLIT_PART(nome_completo, ' ', 1) || ' ' || 
            SUBSTRING(SPLIT_PART(nome_completo, ' ', 2) FROM 1 FOR 1) || '****'
        ELSE
            SUBSTRING(nome_completo FROM 1 FOR 3) || '****'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Mascarar endereço: Apenas rua parcial (Ex: "Rua das Flores, 123" -> "Rua d*** ****")
CREATE OR REPLACE FUNCTION mascara_endereco(endereco_completo TEXT)
RETURNS TEXT AS $$
BEGIN
    IF endereco_completo IS NULL OR LENGTH(endereco_completo) = 0 THEN
        RETURN 'R*** ****';
    END IF;
    
    -- Mostra apenas primeiras 6 caracteres + máscara
    RETURN SUBSTRING(endereco_completo FROM 1 FOR 6) || '*** ****';
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- CRÍTICO: NUNCA mostrar telefone (conforme manual)
CREATE OR REPLACE FUNCTION mascara_telefone(telefone TEXT)
RETURNS TEXT AS $$
BEGIN
    -- SEMPRE retorna máscara, nunca o número real
    RETURN '(**) ****-****';
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 3. FUNÇÃO PARA BUSCAR CLIENTE COM DADOS MASCARADOS
-- -----------------------------------------------------------------------------
-- Esta função é usada pelo N8N para confirmar identidade sem expor dados

CREATE OR REPLACE FUNCTION buscar_cliente_mascarado(telefone_busca TEXT)
RETURNS TABLE(
    cliente_id UUID,
    nome_mascarado TEXT,
    endereco_mascarado TEXT,
    tem_pedidos_anteriores BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.cliente_id,
        mascara_nome(c.nome) as nome_mascarado,
        mascara_endereco(c.email) as endereco_mascarado, -- usando email como endereço por enquanto
        EXISTS(SELECT 1 FROM pedidos p WHERE p.cliente_id = c.cliente_id) as tem_pedidos_anteriores
    FROM clientes c
    WHERE c.telefone = telefone_busca;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. VIEW SEGURA PARA DADOS DE CLIENTES (PARA N8N)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW vw_clientes_seguros AS
SELECT 
    cliente_id,
    mascara_nome(nome) as nome_exibicao,
    mascara_endereco(COALESCE(email, 'Endereço não informado')) as endereco_exibicao,
    mascara_telefone(telefone) as telefone_mascarado,
    -- Campos úteis para o atendimento sem expor dados
    LENGTH(nome) > 10 as nome_longo,
    email IS NOT NULL as tem_email,
    CASE 
        WHEN LENGTH(telefone) = 13 THEN 'celular'
        WHEN LENGTH(telefone) = 12 THEN 'fixo'
        ELSE 'indefinido'
    END as tipo_telefone
FROM clientes;

-- 5. FUNÇÃO PARA HISTÓRICO DE PEDIDOS MASCARADO
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION historico_pedidos_cliente(telefone_busca TEXT)
RETURNS TABLE(
    pedido_numero TEXT,
    data_pedido DATE,
    total_pedido NUMERIC,
    status_pedido TEXT,
    itens_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.pedido_numero,
        p.created_at::DATE as data_pedido,
        p.total as total_pedido,
        p.status as status_pedido,
        1 as itens_count -- Simplificado por enquanto
    FROM pedidos p
    JOIN clientes c ON p.cliente_id = c.cliente_id
    WHERE c.telefone = telefone_busca
    ORDER BY p.created_at DESC
    LIMIT 5; -- Últimos 5 pedidos
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. AUDITORIA DE ACESSO A DADOS SENSÍVEIS
-- -----------------------------------------------------------------------------

-- Tabela para log de acessos (LGPD compliance)
CREATE TABLE IF NOT EXISTS log_acesso_dados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone_hash TEXT NOT NULL, -- Hash do telefone, não o número real
    acao TEXT NOT NULL,
    dados_acessados TEXT[],
    ip_origem INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Função para registrar acesso
CREATE OR REPLACE FUNCTION registrar_acesso_dados(
    telefone TEXT,
    acao TEXT,
    dados_acessados TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO log_acesso_dados (telefone_hash, acao, dados_acessados)
    VALUES (
        encode(digest(telefone, 'sha256'), 'hex'), -- Hash do telefone
        acao,
        dados_acessados
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TESTES DAS FUNÇÕES DE MASCARAMENTO
-- =============================================================================

-- Para testar (executar no Supabase):
/*
-- Teste 1: Mascaramento de nome
SELECT mascara_nome('João Silva Santos') as nome_teste;
-- Esperado: "João S****"

-- Teste 2: Mascaramento de endereço  
SELECT mascara_endereco('Rua das Flores, 123 - Centro') as endereco_teste;
-- Esperado: "Rua da*** ****"

-- Teste 3: Telefone sempre mascarado
SELECT mascara_telefone('5511999998888') as telefone_teste;
-- Esperado: "(**) ****-****"
*/

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON FUNCTION mascara_nome IS 'Mascara nome conforme LGPD - mostra primeiro nome + inicial';
COMMENT ON FUNCTION mascara_endereco IS 'Mascara endereço conforme LGPD - mostra apenas início';
COMMENT ON FUNCTION mascara_telefone IS 'CRÍTICO: Nunca mostra telefone real, sempre máscara';
COMMENT ON FUNCTION buscar_cliente_mascarado IS 'Busca cliente para confirmação de identidade sem expor dados pessoais';
COMMENT ON VIEW vw_clientes_seguros IS 'View segura para acesso do N8N aos dados de clientes mascarados';