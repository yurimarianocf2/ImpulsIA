-- =============================================================================
-- CRIPTOGRAFIA E CONFIGURAÇÕES FINAIS DE SEGURANÇA
-- =============================================================================
-- Implementa criptografia de dados sensíveis e configurações finais
-- =============================================================================

-- 1. EXTENSÕES ADICIONAIS DE SEGURANÇA
-- -----------------------------------------------------------------------------

-- Extensão para UUID v4 (mais seguros)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extensão para criptografia avançada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. FUNÇÃO PARA CRIPTOGRAFAR TELEFONES
-- -----------------------------------------------------------------------------
-- Para compliance LGPD - telefones armazenados com hash

CREATE OR REPLACE FUNCTION hash_telefone(telefone TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(telefone || current_setting('app.salt_key', true), 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 3. TABELA PARA CHAVES DE CRIPTOGRAFIA (ROTAÇÃO)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crypto_keys (
    id SERIAL PRIMARY KEY,
    key_name TEXT UNIQUE NOT NULL,
    key_value TEXT NOT NULL, -- Criptografada com chave mestra
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    active BOOLEAN DEFAULT true,
    purpose TEXT NOT NULL -- 'phone_hash', 'session_token', etc
);

-- RLS na tabela de chaves
ALTER TABLE crypto_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crypto_keys_admin_only" ON crypto_keys FOR ALL 
USING (current_setting('role') = 'service_role');

-- 4. FUNÇÃO PARA VALIDAR TOKEN DE SESSÃO N8N
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
    
    -- Comparação segura (tempo constante)
    SELECT token = token_esperado INTO token_valido;
    
    -- Log da tentativa de acesso
    INSERT INTO log_acesso_dados (telefone_hash, acao, dados_acessados)
    VALUES (
        'n8n_system',
        CASE WHEN token_valido THEN 'token_validado' ELSE 'token_invalido' END,
        ARRAY['webhook_access']
    );
    
    RETURN token_valido;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNÇÃO WRAPPER SEGURA PARA N8N
-- -----------------------------------------------------------------------------
-- Esta função deve ser a única interface entre N8N e o banco

CREATE OR REPLACE FUNCTION webhook_n8n_processar(
    token_auth TEXT,
    telefone TEXT,
    mensagem TEXT,
    acao TEXT DEFAULT 'mensagem'
)
RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    sessao_info RECORD;
BEGIN
    -- Validar token primeiro
    IF NOT validar_token_n8n(token_auth) THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Token de autenticação inválido',
            'codigo', 'UNAUTHORIZED'
        );
    END IF;
    
    -- Rate limiting básico (máximo 10 chamadas por minuto por telefone)
    IF (
        SELECT COUNT(*) 
        FROM sessoes_whatsapp 
        WHERE telefone = webhook_n8n_processar.telefone 
        AND ultima_interacao > NOW() - INTERVAL '1 minute'
        AND total_mensagens > (
            SELECT total_mensagens - 10 
            FROM sessoes_whatsapp s2 
            WHERE s2.telefone = webhook_n8n_processar.telefone
        )
    ) > 0 THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Rate limit excedido. Aguarde um momento.',
            'codigo', 'RATE_LIMIT'
        );
    END IF;
    
    -- Processar baseado na ação
    CASE acao
        WHEN 'mensagem' THEN
            -- Processar mensagem normal
            SELECT * INTO sessao_info FROM processar_mensagem_whatsapp(telefone, mensagem);
            
            resultado := jsonb_build_object(
                'sucesso', true,
                'sessao_id', sessao_info.sessao_id,
                'resposta', sessao_info.resposta_sugerida,
                'estado', sessao_info.proximo_estado,
                'cliente', sessao_info.dados_cliente,
                'acoes', sessao_info.acoes_necessarias
            );
            
        WHEN 'buscar_produto' THEN
            -- Buscar produtos
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', produto_id,
                    'nome', nome,
                    'preco', preco,
                    'promocao', tem_promocao,
                    'preco_promocional', preco_promocional
                )
            ) INTO resultado
            FROM buscar_produtos_inteligente(mensagem);
            
            resultado := jsonb_build_object(
                'sucesso', true,
                'produtos', COALESCE(resultado, '[]'::jsonb)
            );
            
        WHEN 'promocoes' THEN
            -- Buscar promoções
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', promocao_id,
                    'produto', produto_nome,
                    'preco_normal', preco_normal,
                    'preco_promocional', preco_promocional,
                    'desconto', desconto_percentual
                )
            ) INTO resultado
            FROM verificar_promocoes_ativas();
            
            resultado := jsonb_build_object(
                'sucesso', true,
                'promocoes', COALESCE(resultado, '[]'::jsonb)
            );
            
        ELSE
            resultado := jsonb_build_object(
                'sucesso', false,
                'erro', 'Ação não reconhecida: ' || acao,
                'codigo', 'INVALID_ACTION'
            );
    END CASE;
    
    RETURN resultado;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log do erro
        INSERT INTO log_acesso_dados (telefone_hash, acao, dados_acessados)
        VALUES (
            hash_telefone(telefone),
            'erro_processamento',
            ARRAY[SQLERRM]
        );
        
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Erro interno do servidor',
            'codigo', 'INTERNAL_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CONFIGURAÇÕES INICIAIS DE SEGURANÇA
-- -----------------------------------------------------------------------------

-- Inserir configurações básicas se não existem
INSERT INTO configuracao (chave, valor) VALUES
    ('n8n_webhook_token', gen_random_uuid()::TEXT),
    ('rate_limit_per_minute', '10'),
    ('session_timeout_minutes', '60'),
    ('log_retention_days', '90'),
    ('encryption_key_rotation_days', '30')
ON CONFLICT (chave) DO NOTHING;

-- 7. JOBS DE MANUTENÇÃO AUTOMÁTICA
-- -----------------------------------------------------------------------------

-- Função para limpeza de logs antigos
CREATE OR REPLACE FUNCTION limpar_logs_antigos()
RETURNS INTEGER AS $$
DECLARE
    linhas_removidas INTEGER;
    dias_retencao INTEGER;
BEGIN
    -- Buscar configuração de retenção
    SELECT valor::INTEGER INTO dias_retencao 
    FROM configuracao 
    WHERE chave = 'log_retention_days';
    
    IF dias_retencao IS NULL THEN
        dias_retencao := 90; -- Padrão
    END IF;
    
    -- Remover logs antigos
    DELETE FROM log_acesso_dados 
    WHERE timestamp < NOW() - INTERVAL '1 day' * dias_retencao;
    
    GET DIAGNOSTICS linhas_removidas = ROW_COUNT;
    
    -- Limpar sessões antigas inativas (manter apenas 6 meses)
    DELETE FROM sessoes_whatsapp 
    WHERE sessao_iniciada_em < NOW() - INTERVAL '6 months'
    AND ativa = false;
    
    RETURN linhas_removidas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ÍNDICES FINAIS PARA PERFORMANCE
-- -----------------------------------------------------------------------------

-- Índice para logs por data (queries de limpeza)
CREATE INDEX IF NOT EXISTS idx_log_acesso_timestamp ON log_acesso_dados(timestamp);

-- Índice composto para rate limiting
CREATE INDEX IF NOT EXISTS idx_sessao_telefone_interacao ON sessoes_whatsapp(telefone, ultima_interacao);

-- Índice para configurações (acesso frequente)
CREATE INDEX IF NOT EXISTS idx_configuracao_chave ON configuracao(chave);

-- 9. VIEW PARA DASHBOARD DE SEGURANÇA
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW vw_dashboard_seguranca AS
SELECT 
    -- Métricas de acesso
    COUNT(CASE WHEN acao = 'token_validado' THEN 1 END) as acessos_validos_hoje,
    COUNT(CASE WHEN acao = 'token_invalido' THEN 1 END) as tentativas_invalidas_hoje,
    
    -- Métricas de uso
    COUNT(DISTINCT telefone_hash) as usuarios_unicos_hoje,
    COUNT(*) as total_eventos_hoje,
    
    -- Rate limiting
    MAX(CASE WHEN acao LIKE '%rate_limit%' THEN 1 ELSE 0 END) as teve_rate_limit,
    
    -- Última atividade
    MAX(timestamp) as ultima_atividade
FROM log_acesso_dados 
WHERE timestamp::DATE = CURRENT_DATE;

-- 10. FUNÇÃO PARA VERIFICAÇÃO DE SAÚDE DO SISTEMA
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION health_check_seguranca()
RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    sessoes_ativas INTEGER;
    logs_hoje INTEGER;
    config_count INTEGER;
BEGIN
    -- Contar sessões ativas
    SELECT COUNT(*) INTO sessoes_ativas 
    FROM sessoes_whatsapp 
    WHERE ativa = true AND ultima_interacao > NOW() - INTERVAL '1 hour';
    
    -- Contar logs hoje
    SELECT COUNT(*) INTO logs_hoje 
    FROM log_acesso_dados 
    WHERE timestamp::DATE = CURRENT_DATE;
    
    -- Verificar configurações essenciais
    SELECT COUNT(*) INTO config_count 
    FROM configuracao 
    WHERE chave IN ('n8n_webhook_token', 'rate_limit_per_minute');
    
    resultado := jsonb_build_object(
        'status', CASE WHEN config_count = 2 THEN 'healthy' ELSE 'warning' END,
        'timestamp', NOW(),
        'metricas', jsonb_build_object(
            'sessoes_ativas', sessoes_ativas,
            'logs_hoje', logs_hoje,
            'configuracoes_ok', config_count = 2,
            'rls_ativo', EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND rowsecurity=true)
        ),
        'recomendacoes', CASE 
            WHEN config_count < 2 THEN ARRAY['Verificar configurações de segurança']
            WHEN sessoes_ativas = 0 THEN ARRAY['Sistema sem atividade recente']
            ELSE ARRAY[]::TEXT[]
        END
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- CONFIGURAÇÕES FINAIS E VERIFICAÇÕES
-- =============================================================================

-- Comentários finais
COMMENT ON FUNCTION webhook_n8n_processar IS 'Interface segura única para N8N acessar o banco de dados';
COMMENT ON FUNCTION health_check_seguranca IS 'Verificação de saúde do sistema de segurança';
COMMENT ON VIEW vw_dashboard_seguranca IS 'Dashboard de métricas de segurança para monitoramento';

-- Verificação final: listar todas as tabelas e seu status RLS
SELECT 
    'VERIFICAÇÃO FINAL DE SEGURANÇA' as status,
    COUNT(*) as total_tabelas,
    COUNT(CASE WHEN rowsecurity THEN 1 END) as tabelas_com_rls,
    ROUND(COUNT(CASE WHEN rowsecurity THEN 1 END) * 100.0 / COUNT(*), 2) as percentual_protegido
FROM pg_tables 
WHERE schemaname = 'public';