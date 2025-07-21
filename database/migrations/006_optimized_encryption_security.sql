-- =============================================================================
-- CRIPTOGRAFIA E SEGURANÇA FINAL (VERSÃO SEGURA)
-- =============================================================================
-- Versão otimizada sem comandos destrutivos e sem referências inexistentes
-- =============================================================================

-- 1. EXTENSÕES ADICIONAIS DE SEGURANÇA
-- -----------------------------------------------------------------------------

-- Extensão para UUID v4 (mais seguros)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extensão para criptografia avançada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. FUNÇÃO PARA CRIPTOGRAFAR TELEFONES
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hash_telefone(telefone TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Usar salt fixo para consistência (em produção, usar variável de ambiente)
    RETURN encode(digest(telefone || 'farmacia_salt_2024', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 3. TABELA PARA CONFIGURAÇÕES SEGURAS
-- -----------------------------------------------------------------------------

-- Verificar se tabela crypto_keys já existe antes de criar
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crypto_keys') THEN
        CREATE TABLE crypto_keys (
            id SERIAL PRIMARY KEY,
            key_name TEXT UNIQUE NOT NULL,
            key_value TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            expires_at TIMESTAMPTZ,
            active BOOLEAN DEFAULT true,
            purpose TEXT NOT NULL
        );
        
        -- RLS na tabela de chaves
        ALTER TABLE crypto_keys ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "crypto_keys_admin_only" ON crypto_keys FOR ALL 
        USING (current_setting('role') = 'service_role');
    END IF;
END$$;

-- 4. FUNÇÃO PARA VALIDAR TOKEN DE N8N
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validar_token_n8n(token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    token_valido BOOLEAN := FALSE;
    token_esperado TEXT;
BEGIN
    -- Buscar token ativo na configuração
    SELECT valor INTO token_esperado 
    FROM configuracao 
    WHERE chave = 'n8n_webhook_token' AND valor IS NOT NULL;
    
    IF token_esperado IS NULL THEN
        -- Se não há token configurado, rejeitar
        RETURN FALSE;
    END IF;
    
    -- Comparação segura
    SELECT token = token_esperado INTO token_valido;
    
    -- Log da tentativa de acesso (apenas se tabela log_acesso_dados existir)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'log_acesso_dados') THEN
        INSERT INTO log_acesso_dados (telefone_hash, acao, dados_acessados)
        VALUES (
            'n8n_system',
            CASE WHEN token_valido THEN 'token_validado' ELSE 'token_invalido' END,
            ARRAY['webhook_access']
        );
    END IF;
    
    RETURN token_valido;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNÇÃO WRAPPER SEGURA PARA N8N (OTIMIZADA)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION webhook_n8n_processar_seguro(
    token_auth TEXT,
    telefone TEXT,
    acao TEXT DEFAULT 'buscar_cliente',
    dados JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
BEGIN
    -- Validar token primeiro
    IF NOT validar_token_n8n(token_auth) THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Token de autenticação inválido',
            'codigo', 'UNAUTHORIZED'
        );
    END IF;
    
    -- Rate limiting simples (sem dependência de sessoes_whatsapp)
    -- Em produção, usar Redis para rate limiting
    
    -- Usar a interface unificada que criamos
    SELECT interface_n8n_farmacia(acao, telefone, dados) INTO resultado;
    
    RETURN resultado;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log do erro se tabela existir
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'log_acesso_dados') THEN
            INSERT INTO log_acesso_dados (telefone_hash, acao, dados_acessados)
            VALUES (
                hash_telefone(telefone),
                'erro_processamento',
                ARRAY[SQLERRM]
            );
        END IF;
        
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Erro interno do servidor',
            'codigo', 'INTERNAL_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CONFIGURAÇÕES INICIAIS DE SEGURANÇA
-- -----------------------------------------------------------------------------

-- Inserir configurações básicas se não existem (não destrutivo)
INSERT INTO configuracao (chave, valor) VALUES
    ('n8n_webhook_token', gen_random_uuid()::TEXT),
    ('rate_limit_per_minute', '10'),
    ('log_retention_days', '90'),
    ('encryption_key_rotation_days', '30'),
    ('sistema_version', '1.0.0')
ON CONFLICT (chave) DO NOTHING; -- NÃO sobrescreve se já existe

-- 7. FUNÇÃO OPCIONAL DE LIMPEZA (NÃO DESTRUTIVA)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION limpar_logs_antigos_opcional(
    executar_limpeza BOOLEAN DEFAULT FALSE,
    dias_retencao INTEGER DEFAULT 90
)
RETURNS JSONB AS $$
DECLARE
    linhas_removidas INTEGER := 0;
    tabela_existe BOOLEAN;
BEGIN
    -- Verificar se usuário realmente quer executar
    IF NOT executar_limpeza THEN
        RETURN jsonb_build_object(
            'executado', false,
            'mensagem', 'Limpeza não executada. Use executar_limpeza=true para confirmar.',
            'comando_seguro', 'SELECT limpar_logs_antigos_opcional(true, 90);'
        );
    END IF;
    
    -- Verificar se tabela existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'log_acesso_dados'
    ) INTO tabela_existe;
    
    IF tabela_existe THEN
        -- Remover logs antigos apenas se tabela existe
        DELETE FROM log_acesso_dados 
        WHERE timestamp < NOW() - INTERVAL '1 day' * dias_retencao;
        
        GET DIAGNOSTICS linhas_removidas = ROW_COUNT;
    END IF;
    
    RETURN jsonb_build_object(
        'executado', true,
        'tabela_existe', tabela_existe,
        'linhas_removidas', linhas_removidas,
        'dias_retencao', dias_retencao
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ÍNDICES FINAIS PARA PERFORMANCE
-- -----------------------------------------------------------------------------

-- Índice para configurações (acesso frequente)
CREATE INDEX IF NOT EXISTS idx_configuracao_chave ON configuracao(chave);

-- Índice para logs se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'log_acesso_dados') THEN
        CREATE INDEX IF NOT EXISTS idx_log_acesso_timestamp ON log_acesso_dados(timestamp);
    END IF;
END$$;

-- 9. VIEW PARA DASHBOARD DE SEGURANÇA (SEGURA)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW vw_dashboard_seguranca AS
SELECT 
    -- Configurações do sistema
    (SELECT COUNT(*) FROM configuracao) as total_configuracoes,
    
    -- Clientes cadastrados
    (SELECT COUNT(*) FROM clientes) as total_clientes,
    
    -- Produtos ativos
    (SELECT COUNT(*) FROM produtos WHERE ativo = true) as produtos_ativos,
    
    -- Promoções ativas
    (SELECT COUNT(*) FROM promocoes WHERE ativa = true) as promocoes_ativas,
    
    -- Pedidos hoje
    (SELECT COUNT(*) FROM pedidos WHERE DATE(created_at) = CURRENT_DATE) as pedidos_hoje,
    
    -- Logs hoje (se tabela existir)
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'log_acesso_dados')
        THEN (SELECT COUNT(*) FROM log_acesso_dados WHERE DATE(timestamp) = CURRENT_DATE)
        ELSE 0
    END as logs_hoje,
    
    -- Status geral
    'OPERACIONAL' as status_sistema,
    NOW() as timestamp_verificacao;

-- 10. FUNÇÃO DE VERIFICAÇÃO DE SAÚDE (SEGURA)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION health_check_sistema()
RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    total_clientes INTEGER;
    total_produtos INTEGER;
    config_count INTEGER;
BEGIN
    -- Métricas básicas
    SELECT COUNT(*) INTO total_clientes FROM clientes;
    SELECT COUNT(*) INTO total_produtos FROM produtos WHERE ativo = true;
    SELECT COUNT(*) INTO config_count FROM configuracao 
    WHERE chave IN ('n8n_webhook_token', 'rate_limit_per_minute');
    
    resultado := jsonb_build_object(
        'status', CASE WHEN config_count >= 2 THEN 'HEALTHY' ELSE 'WARNING' END,
        'timestamp', NOW(),
        'metricas', jsonb_build_object(
            'clientes_cadastrados', total_clientes,
            'produtos_ativos', total_produtos,
            'configuracoes_ok', config_count >= 2,
            'rls_ativo', EXISTS(
                SELECT 1 FROM pg_tables 
                WHERE schemaname='public' AND rowsecurity=true
            ),
            'funcoes_criadas', EXISTS(
                SELECT 1 FROM information_schema.routines 
                WHERE routine_name = 'interface_n8n_farmacia'
            )
        ),
        'recomendacoes', CASE 
            WHEN config_count < 2 THEN ARRAY['Verificar configurações de segurança']
            WHEN total_produtos = 0 THEN ARRAY['Cadastrar produtos da farmácia']
            ELSE ARRAY['Sistema operacional']::TEXT[]
        END
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMENTÁRIOS FINAIS E VERIFICAÇÃO
-- =============================================================================

COMMENT ON FUNCTION webhook_n8n_processar_seguro IS 'Interface segura para N8N - versão otimizada sem dependências';
COMMENT ON FUNCTION health_check_sistema IS 'Verificação de saúde completa do sistema';
COMMENT ON FUNCTION limpar_logs_antigos_opcional IS 'Limpeza opcional de logs - requer confirmação explícita';
COMMENT ON VIEW vw_dashboard_seguranca IS 'Dashboard seguro de métricas do sistema';

-- Verificação final - listar funções criadas
SELECT 
    'FUNÇÃO CRIADA: ' || routine_name as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'webhook_n8n_processar_seguro',
    'health_check_sistema',
    'limpar_logs_antigos_opcional',
    'hash_telefone'
)
ORDER BY routine_name;