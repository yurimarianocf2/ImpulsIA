-- Otimização da Estrutura do Banco de Dados FarmaBot Pro
-- Este script consolida o esquema e remove redundâncias

-- ===================================
-- 1. BACKUP DE SEGURANÇA
-- ===================================

-- Criar schema de backup caso não exista
CREATE SCHEMA IF NOT EXISTS backup;

-- Backup das tabelas principais antes das mudanças
CREATE TABLE IF NOT EXISTS backup.produtos_backup AS SELECT * FROM produtos;
CREATE TABLE IF NOT EXISTS backup.conversas_backup AS SELECT * FROM conversas;
CREATE TABLE IF NOT EXISTS backup.analises_preco_backup AS SELECT * FROM analises_preco;

-- ===================================
-- 2. MIGRAÇÃO PARA ESQUEMA CONSOLIDADO
-- ===================================

-- Migrar dados de 'produtos' para 'medicamentos' (se a tabela medicamentos existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medicamentos') THEN
        -- Migrar dados apenas se medicamentos estiver vazia
        INSERT INTO medicamentos (
            id, farmacia_id, nome, principio_ativo, categoria, 
            preco_venda, preco_custo, margem_lucro, estoque_atual,
            estoque_minimo, fornecedor, codigo_barras, dosagem,
            apresentacao, validade, ativo, created_at, updated_at
        )
        SELECT 
            id, farmacia_id, nome, principio_ativo, categoria,
            preco_venda, preco_custo, margem_lucro, estoque_atual,
            estoque_minimo, fornecedor, codigo_barras, dosagem,
            apresentacao, 
            COALESCE(validade, data_vencimento, data_validade) as validade,
            ativo, created_at, updated_at
        FROM produtos
        WHERE NOT EXISTS (SELECT 1 FROM medicamentos WHERE medicamentos.id = produtos.id);
        
        RAISE NOTICE 'Dados migrados de produtos para medicamentos';
    END IF;
END $$;

-- Migrar dados de 'conversas' para 'conversas_whatsapp'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversas_whatsapp') THEN
        INSERT INTO conversas_whatsapp (
            id, farmacia_id, cliente_telefone, status, canal,
            created_at, updated_at, metadata
        )
        SELECT 
            id, farmacia_id, cliente_telefone, status, 'whatsapp' as canal,
            created_at, updated_at, '{}'::jsonb as metadata
        FROM conversas
        WHERE NOT EXISTS (SELECT 1 FROM conversas_whatsapp WHERE conversas_whatsapp.id = conversas.id);
        
        RAISE NOTICE 'Dados migrados de conversas para conversas_whatsapp';
    END IF;
END $$;

-- ===================================
-- 3. PADRONIZAÇÃO DE COLUNAS
-- ===================================

-- Padronizar nome da coluna de validade
DO $$
BEGIN
    -- Na tabela medicamentos
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medicamentos' AND column_name = 'data_vencimento') THEN
        ALTER TABLE medicamentos RENAME COLUMN data_vencimento TO validade;
        RAISE NOTICE 'Coluna data_vencimento renomeada para validade na tabela medicamentos';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medicamentos' AND column_name = 'data_validade') THEN
        ALTER TABLE medicamentos RENAME COLUMN data_validade TO validade;
        RAISE NOTICE 'Coluna data_validade renomeada para validade na tabela medicamentos';
    END IF;
    
    -- Na tabela produtos (caso ainda exista)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'produtos') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'data_vencimento') THEN
            ALTER TABLE produtos RENAME COLUMN data_vencimento TO validade;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'data_validade') THEN
            ALTER TABLE produtos RENAME COLUMN data_validade TO validade;
        END IF;
    END IF;
END $$;

-- ===================================
-- 4. LIMPEZA DE TABELAS REDUNDANTES
-- ===================================

-- Remover views órfãos (views que referenciam tabelas que não existem mais)
DO $$
DECLARE
    view_record RECORD;
BEGIN
    FOR view_record IN 
        SELECT viewname FROM pg_views WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE 'SELECT * FROM ' || view_record.viewname || ' LIMIT 1';
        EXCEPTION WHEN OTHERS THEN
            EXECUTE 'DROP VIEW IF EXISTS ' || view_record.viewname || ' CASCADE';
            RAISE NOTICE 'View órfão removido: %', view_record.viewname;
        END;
    END LOOP;
END $$;

-- ===================================
-- 5. OTIMIZAÇÃO DE ÍNDICES
-- ===================================

-- Índices essenciais para performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medicamentos_farmacia_ativo 
    ON medicamentos(farmacia_id, ativo) WHERE ativo = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medicamentos_validade 
    ON medicamentos(validade) WHERE validade IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medicamentos_nome_busca 
    ON medicamentos USING gin(to_tsvector('portuguese', nome));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mensagens_created_at 
    ON mensagens(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analises_preco_farmacia_data 
    ON analises_preco(farmacia_id, created_at);

-- ===================================
-- 6. POLÍTICAS DE RETENÇÃO DE DADOS
-- ===================================

-- Função para limpeza automática de dados antigos
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
BEGIN
    -- Remover mensagens antigas (mais de 1 ano)
    DELETE FROM mensagens 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Remover análises de preço antigas (mais de 6 meses)
    DELETE FROM analises_preco 
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    -- Remover logs de sincronização antigos (mais de 3 meses)
    DELETE FROM sync_logs 
    WHERE created_at < NOW() - INTERVAL '3 months';
    
    RAISE NOTICE 'Limpeza de dados antigos concluída';
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 7. VALIDAÇÕES E CONSTRAINTS
-- ===================================

-- Adicionar constraints de validação para dados críticos
DO $$
BEGIN
    -- Validação de preços
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medicamentos') THEN
        ALTER TABLE medicamentos ADD CONSTRAINT check_preco_venda_positivo 
            CHECK (preco_venda > 0);
        ALTER TABLE medicamentos ADD CONSTRAINT check_preco_custo_positivo 
            CHECK (preco_custo >= 0);
        ALTER TABLE medicamentos ADD CONSTRAINT check_margem_lucro_valida 
            CHECK (margem_lucro >= 0 AND margem_lucro <= 100);
    END IF;
    
    -- Validação de estoque
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medicamentos') THEN
        ALTER TABLE medicamentos ADD CONSTRAINT check_estoque_nao_negativo 
            CHECK (estoque_atual >= 0);
    END IF;
    
    RAISE NOTICE 'Constraints de validação adicionados';
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Constraints já existem, pulando...';
END $$;

-- ===================================
-- 8. SEGURANÇA - RLS CONSISTENTE
-- ===================================

-- Habilitar RLS nas tabelas principais
ALTER TABLE farmacias ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

-- Política consistente de isolamento por farmácia
DROP POLICY IF EXISTS farmacia_isolation ON medicamentos;
CREATE POLICY farmacia_isolation ON medicamentos
    FOR ALL
    USING (farmacia_id::text = COALESCE(
        auth.jwt() ->> 'farmacia_id',
        current_setting('app.current_farmacia_id', true)
    ));

-- ===================================
-- 9. MONITORAMENTO E ALERTAS
-- ===================================

-- View para monitoramento de saúde do banco
CREATE OR REPLACE VIEW db_health_monitor AS
SELECT 
    'medicamentos' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE ativo = true) as registros_ativos,
    COUNT(*) FILTER (WHERE validade < CURRENT_DATE) as produtos_vencidos,
    COUNT(*) FILTER (WHERE validade < CURRENT_DATE + INTERVAL '30 days') as produtos_vencendo
FROM medicamentos
UNION ALL
SELECT 
    'conversas_whatsapp' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE status = 'ativa') as registros_ativos,
    0 as produtos_vencidos,
    0 as produtos_vencendo
FROM conversas_whatsapp;

-- ===================================
-- 10. CONCLUSÃO E VERIFICAÇÃO
-- ===================================

-- Função para verificar integridade após otimização
CREATE OR REPLACE FUNCTION verify_optimization() RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Verificar se medicamentos tem dados
    RETURN QUERY
    SELECT 
        'medicamentos_data'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
        'Total de medicamentos: ' || COUNT(*)::TEXT
    FROM medicamentos;
    
    -- Verificar índices criados
    RETURN QUERY
    SELECT 
        'indices_created'::TEXT,
        'OK'::TEXT,
        'Índices de performance criados'::TEXT
    WHERE EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_medicamentos_farmacia_ativo'
    );
    
    -- Verificar RLS habilitado
    RETURN QUERY
    SELECT 
        'rls_enabled'::TEXT,
        CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE 'WARNING' END::TEXT,
        'Tabelas com RLS: ' || COUNT(*)::TEXT
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public' 
    AND t.tablename IN ('farmacias', 'medicamentos', 'conversas_whatsapp', 'mensagens')
    AND c.relrowsecurity = true;
    
END;
$$ LANGUAGE plpgsql;

-- Executar verificação
SELECT * FROM verify_optimization();

-- Log final
DO $$
BEGIN
    RAISE NOTICE '=== OTIMIZAÇÃO CONCLUÍDA ===';
    RAISE NOTICE 'Data: %', NOW();
    RAISE NOTICE 'Execute SELECT * FROM verify_optimization(); para verificar o status';
    RAISE NOTICE 'Execute SELECT * FROM db_health_monitor; para monitorar a saúde';
END $$;