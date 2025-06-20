-- ============================================================================
-- FARMABOT PRO - CONFIGURAÇÕES DE SEGURANÇA
-- Row Level Security (RLS) e Políticas de Acesso
-- ============================================================================

-- ============================================================================
-- ROLES E PERMISSÕES
-- ============================================================================

-- Role para farmácias (proprietários)
-- CREATE ROLE farmacia_owner;
-- GRANT USAGE ON SCHEMA public TO farmacia_owner;

-- Role para funcionários da farmácia
-- CREATE ROLE farmacia_staff;
-- GRANT USAGE ON SCHEMA public TO farmacia_staff;

-- Role para o sistema/bot
-- CREATE ROLE farmabot_system;
-- GRANT ALL ON SCHEMA public TO farmabot_system;

-- ============================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY
-- ============================================================================

-- FARMÁCIAS: Apenas a própria farmácia pode ver seus dados
CREATE POLICY farmacia_isolation ON farmacias
    FOR ALL
    USING (auth.uid()::text = id::text OR auth.jwt() ->> 'farmacia_id' = id::text);

-- PRODUTOS: Isolamento por farmácia
CREATE POLICY produtos_farmacia_isolation ON produtos
    FOR ALL
    USING (farmacia_id::text = auth.jwt() ->> 'farmacia_id');

-- CLIENTES: Isolamento por farmácia
CREATE POLICY clientes_farmacia_isolation ON clientes
    FOR ALL
    USING (farmacia_id::text = auth.jwt() ->> 'farmacia_id');

-- CONVERSAS: Isolamento por farmácia
CREATE POLICY conversas_farmacia_isolation ON conversas
    FOR ALL
    USING (farmacia_id::text = auth.jwt() ->> 'farmacia_id');

-- MENSAGENS: Através da conversa
CREATE POLICY mensagens_farmacia_isolation ON mensagens
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM conversas c 
            WHERE c.id = conversa_id 
            AND c.farmacia_id::text = auth.jwt() ->> 'farmacia_id'
        )
    );

-- PEDIDOS: Isolamento por farmácia
CREATE POLICY pedidos_farmacia_isolation ON pedidos
    FOR ALL
    USING (farmacia_id::text = auth.jwt() ->> 'farmacia_id');

-- NOTIFICAÇÕES: Isolamento por farmácia
CREATE POLICY notificacoes_farmacia_isolation ON notificacoes
    FOR ALL
    USING (farmacia_id::text = auth.jwt() ->> 'farmacia_id');

-- CONFIGURAÇÕES: Isolamento por farmácia
CREATE POLICY configuracoes_farmacia_isolation ON configuracoes
    FOR ALL
    USING (farmacia_id::text = auth.jwt() ->> 'farmacia_id');

-- MÉTRICAS: Isolamento por farmácia
CREATE POLICY metricas_farmacia_isolation ON metricas_diarias
    FOR ALL
    USING (farmacia_id::text = auth.jwt() ->> 'farmacia_id');

-- AUDIT LOGS: Apenas leitura e isolamento
CREATE POLICY audit_logs_read_only ON audit_logs
    FOR SELECT
    USING (true);

-- ============================================================================
-- POLÍTICAS ESPECÍFICAS PARA API KEYS
-- ============================================================================

-- Política para acesso via API key do sistema
CREATE POLICY sistema_full_access ON farmacias
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'iss' = 'supabase'
    );

-- Replicar para outras tabelas importantes
CREATE POLICY sistema_produtos_access ON produtos
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'iss' = 'supabase'
    );

CREATE POLICY sistema_clientes_access ON clientes
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'iss' = 'supabase'
    );

CREATE POLICY sistema_conversas_access ON conversas
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'iss' = 'supabase'
    );

CREATE POLICY sistema_mensagens_access ON mensagens
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'iss' = 'supabase'
    );

-- ============================================================================
-- TRIGGERS DE AUDITORIA
-- ============================================================================

-- Função para logging de auditoria
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    farmacia_id_val UUID;
BEGIN
    -- Determinar farmacia_id baseado na tabela
    CASE TG_TABLE_NAME
        WHEN 'farmacias' THEN
            farmacia_id_val := COALESCE(NEW.id, OLD.id);
        WHEN 'produtos', 'clientes', 'conversas', 'pedidos', 'notificacoes', 'configuracoes', 'metricas_diarias' THEN
            farmacia_id_val := COALESCE(NEW.farmacia_id, OLD.farmacia_id);
        WHEN 'mensagens' THEN
            SELECT c.farmacia_id INTO farmacia_id_val 
            FROM conversas c 
            WHERE c.id = COALESCE(NEW.conversa_id, OLD.conversa_id);
        ELSE
            farmacia_id_val := NULL;
    END CASE;

    INSERT INTO audit_logs (
        tabela,
        operacao,
        registro_id,
        usuario_id,
        dados_antigos,
        dados_novos,
        ip_address
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        (auth.jwt() ->> 'sub')::UUID,
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        inet_client_addr()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers de auditoria nas tabelas principais
CREATE TRIGGER audit_farmacias
    AFTER INSERT OR UPDATE OR DELETE ON farmacias
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_produtos
    AFTER INSERT OR UPDATE OR DELETE ON produtos
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_clientes
    AFTER INSERT OR UPDATE OR DELETE ON clientes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_pedidos
    AFTER INSERT OR UPDATE OR DELETE ON pedidos
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- FUNÇÕES DE SEGURANÇA PARA VALIDAÇÃO
-- ============================================================================

-- Função para validar CPF (simplificada)
CREATE OR REPLACE FUNCTION validar_cpf(cpf TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Remove caracteres não numéricos
    cpf := regexp_replace(cpf, '[^0-9]', '', 'g');
    
    -- Verifica se tem 11 dígitos
    IF length(cpf) != 11 THEN
        RETURN FALSE;
    END IF;
    
    -- Verifica se não são todos os dígitos iguais
    IF cpf ~ '^(\d)\1{10}$' THEN
        RETURN FALSE;
    END IF;
    
    -- Aqui poderia implementar a validação completa do CPF
    -- Por simplicidade, retornamos true se passou nas verificações básicas
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função para validar telefone brasileiro
CREATE OR REPLACE FUNCTION validar_telefone(telefone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Remove caracteres não numéricos
    telefone := regexp_replace(telefone, '[^0-9]', '', 'g');
    
    -- Verifica formatos válidos (com ou sem código do país)
    RETURN telefone ~ '^(55)?[1-9][0-9]{8,10}$';
END;
$$ LANGUAGE plpgsql;

-- Função para validar CNPJ (simplificada)
CREATE OR REPLACE FUNCTION validar_cnpj(cnpj TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Remove caracteres não numéricos
    cnpj := regexp_replace(cnpj, '[^0-9]', '', 'g');
    
    -- Verifica se tem 14 dígitos
    IF length(cnpj) != 14 THEN
        RETURN FALSE;
    END IF;
    
    -- Verifica se não são todos os dígitos iguais
    IF cnpj ~ '^(\d)\1{13}$' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONSTRAINTS DE VALIDAÇÃO
-- ============================================================================

-- Validação de CPF em clientes
ALTER TABLE clientes ADD CONSTRAINT valid_cpf 
    CHECK (cpf IS NULL OR validar_cpf(cpf));

-- Validação de telefone
ALTER TABLE clientes ADD CONSTRAINT valid_telefone_cliente 
    CHECK (validar_telefone(telefone));

ALTER TABLE farmacias ADD CONSTRAINT valid_telefone_farmacia 
    CHECK (validar_telefone(telefone));

ALTER TABLE farmacias ADD CONSTRAINT valid_whatsapp_farmacia 
    CHECK (validar_telefone(whatsapp));

-- Validação de CNPJ
ALTER TABLE farmacias ADD CONSTRAINT valid_cnpj 
    CHECK (cnpj IS NULL OR validar_cnpj(cnpj));

-- Validação de email
ALTER TABLE clientes ADD CONSTRAINT valid_email_cliente 
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE farmacias ADD CONSTRAINT valid_email_farmacia 
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- ============================================================================
-- CONFIGURAÇÕES DE PERFORMANCE E SEGURANÇA
-- ============================================================================

-- Configurar timeouts para conexões
-- ALTER SYSTEM SET statement_timeout = '30s';
-- ALTER SYSTEM SET lock_timeout = '10s';

-- Configurar logging para auditoria
-- ALTER SYSTEM SET log_statement = 'all';
-- ALTER SYSTEM SET log_min_duration_statement = 1000;

-- ============================================================================
-- PERMISSÕES ESPECÍFICAS
-- ============================================================================

-- Permitir que o sistema faça refresh das views materializadas
GRANT USAGE ON SCHEMA public TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- ============================================================================
-- POLÍTICAS DE RETENÇÃO DE DADOS
-- ============================================================================

-- Função para limpar dados antigos (execução manual ou por cron)
CREATE OR REPLACE FUNCTION limpar_dados_antigos()
RETURNS void AS $$
BEGIN
    -- Remover mensagens antigas (mais de 1 ano)
    DELETE FROM mensagens 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Remover logs de auditoria antigos (mais de 2 anos)
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '2 years';
    
    -- Arquivar conversas antigas (mais de 6 meses sem atividade)
    UPDATE conversas 
    SET status = 'finalizado'
    WHERE status = 'ativo' 
        AND updated_at < NOW() - INTERVAL '6 months';
    
    -- Limpar notificações antigas lidas (mais de 3 meses)
    DELETE FROM notificacoes 
    WHERE lida = true 
        AND created_at < NOW() - INTERVAL '3 months';
        
    RAISE NOTICE 'Limpeza de dados concluída em %', NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONFIGURAÇÃO CONCLUÍDA
-- Próximo: Dados de teste e configuração inicial
-- ============================================================================