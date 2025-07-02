-- SCRIPT PARA APLICAR ESQUEMA CONSOLIDADO
-- Remove duplicações, migra dados e configura permissões

-- =====================================================
-- BACKUP E PREPARAÇÃO
-- =====================================================

-- Criar schema de backup
CREATE SCHEMA IF NOT EXISTS backup_migration;

-- Backup das tabelas existentes
DO $$
BEGIN
    -- Backup produtos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'produtos') THEN
        EXECUTE 'CREATE TABLE backup_migration.produtos_backup AS SELECT * FROM produtos';
        RAISE NOTICE 'Backup da tabela produtos criado';
    END IF;
    
    -- Backup analises_preco
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analises_preco') THEN
        EXECUTE 'CREATE TABLE backup_migration.analises_preco_backup AS SELECT * FROM analises_preco';
        RAISE NOTICE 'Backup da tabela analises_preco criado';
    END IF;
    
    -- Backup conversas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversas') THEN
        EXECUTE 'CREATE TABLE backup_migration.conversas_backup AS SELECT * FROM conversas';
        RAISE NOTICE 'Backup da tabela conversas criado';
    END IF;
    
    -- Backup pedidos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pedidos') THEN
        EXECUTE 'CREATE TABLE backup_migration.pedidos_backup AS SELECT * FROM pedidos';
        RAISE NOTICE 'Backup da tabela pedidos criado';
    END IF;
END $$;

-- =====================================================
-- MIGRAÇÃO DE DADOS
-- =====================================================

-- Aplicar o schema consolidado primeiro
\i /mnt/f/Yuri/Instagram/Landing Page Mirella/mariano/database/schema-consolidado.sql

-- Migrar dados existentes
DO $$
DECLARE
    farmacia_padrao UUID := '550e8400-e29b-41d4-a716-446655440000'::uuid;
BEGIN
    -- Migrar produtos para medicamentos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'produtos') THEN
        INSERT INTO medicamentos (
            id,
            farmacia_id,
            codigo_barras,
            nome,
            principio_ativo,
            apresentacao,
            fabricante,
            categoria,
            subcategoria,
            preco_venda,
            preco_custo,
            margem_lucro,
            estoque_atual,
            estoque_minimo,
            unidade,
            requer_receita,
            tipo_receita,
            validade,
            ativo,
            metadata,
            created_at,
            updated_at
        )
        SELECT 
            p.id,
            COALESCE(p.farmacia_id, farmacia_padrao),
            p.codigo_barras,
            p.nome,
            p.principio_ativo,
            p.apresentacao,
            p.fabricante,
            p.categoria,
            p.subcategoria,
            p.preco_venda,
            p.preco_custo,
            p.margem_lucro,
            p.estoque_atual,
            p.estoque_minimo,
            p.unidade,
            COALESCE(p.requer_receita, false),
            p.tipo_receita,
            COALESCE(
                p.validade, 
                p.data_validade, 
                p.data_vencimento, 
                CURRENT_DATE + INTERVAL '1 year'
            ) as validade,
            COALESCE(p.ativo, true),
            COALESCE(p.metadata, '{}'::jsonb),
            COALESCE(p.created_at, NOW()),
            COALESCE(p.updated_at, NOW())
        FROM produtos p
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Produtos migrados para medicamentos';
    END IF;
    
    -- Migrar análises de preço
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analises_preco') THEN
        INSERT INTO analises_preco_consolidada (
            id,
            medicamento_id,
            farmacia_id,
            preco_local,
            preco_medio_mercado,
            posicao_competitiva,
            margem_atual,
            precos_externos,
            recomendacao_preco,
            recomendacao_descricao,
            created_at
        )
        SELECT 
            ap.id,
            ap.produto_id,
            ap.farmacia_id,
            ap.preco_local,
            ap.preco_medio_mercado,
            ap.posicao_competitiva,
            ap.margem_atual,
            ap.precos_externos,
            CASE 
                WHEN ap.preco_medio_mercado > ap.preco_local * 1.1 THEN ap.preco_local * 1.05
                WHEN ap.preco_medio_mercado < ap.preco_local * 0.9 THEN ap.preco_local * 0.95
                ELSE ap.preco_local
            END,
            COALESCE(ap.recomendacao, 'Preço competitivo'),
            ap.created_at
        FROM analises_preco ap
        INNER JOIN medicamentos m ON ap.produto_id = m.id
        ON CONFLICT (medicamento_id, DATE(created_at)) DO NOTHING;
        
        RAISE NOTICE 'Análises de preço migradas';
    END IF;
    
    -- Migrar conversas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversas') THEN
        INSERT INTO conversas_whatsapp (
            id,
            farmacia_id,
            whatsapp_id,
            cliente_telefone,
            cliente_nome,
            status,
            contexto,
            ultima_mensagem,
            created_at,
            updated_at
        )
        SELECT 
            c.id,
            c.farmacia_id,
            c.whatsapp_id,
            c.cliente_telefone,
            c.cliente_nome,
            c.status,
            c.contexto,
            c.ultima_mensagem,
            c.created_at,
            c.updated_at
        FROM conversas c
        ON CONFLICT (farmacia_id, whatsapp_id) DO NOTHING;
        
        RAISE NOTICE 'Conversas migradas';
    END IF;
    
    -- Migrar mensagens
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mensagens') THEN
        INSERT INTO mensagens_whatsapp (
            id,
            conversa_id,
            whatsapp_message_id,
            tipo,
            conteudo,
            tipo_conteudo,
            metadata,
            processada,
            created_at
        )
        SELECT 
            m.id,
            m.conversa_id,
            m.whatsapp_message_id,
            m.tipo,
            m.conteudo,
            m.tipo_conteudo,
            m.metadata,
            m.processada,
            m.created_at
        FROM mensagens m
        INNER JOIN conversas_whatsapp cw ON m.conversa_id = cw.id
        ON CONFLICT (whatsapp_message_id) DO NOTHING;
        
        RAISE NOTICE 'Mensagens migradas';
    END IF;
    
    -- Migrar pedidos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pedidos') THEN
        INSERT INTO pedidos_consolidada (
            id,
            farmacia_id,
            conversa_id,
            numero_pedido,
            status,
            cliente_nome,
            cliente_telefone,
            cliente_cpf,
            valor_total,
            forma_pagamento,
            tipo_entrega,
            endereco_entrega,
            observacoes,
            created_at,
            updated_at
        )
        SELECT 
            p.id,
            p.farmacia_id,
            p.conversa_id,
            COALESCE(p.numero_pedido, 'PED-' || EXTRACT(EPOCH FROM p.created_at)::bigint),
            p.status,
            p.cliente_nome,
            p.cliente_telefone,
            p.cliente_cpf,
            p.valor_total,
            p.forma_pagamento,
            p.tipo_entrega,
            p.endereco_entrega,
            p.observacoes,
            p.created_at,
            p.updated_at
        FROM pedidos p
        ON CONFLICT (numero_pedido) DO NOTHING;
        
        RAISE NOTICE 'Pedidos migrados';
    END IF;
    
    -- Migrar itens do pedido
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pedido_itens') THEN
        INSERT INTO itens_pedido (
            id,
            pedido_id,
            medicamento_id,
            quantidade,
            preco_unitario,
            desconto_item,
            subtotal,
            nome_produto,
            created_at
        )
        SELECT 
            pi.id,
            pi.pedido_id,
            pi.produto_id,
            pi.quantidade,
            pi.preco_unitario,
            COALESCE(pi.desconto, 0),
            pi.subtotal,
            m.nome,
            NOW()
        FROM pedido_itens pi
        INNER JOIN pedidos_consolidada pc ON pi.pedido_id = pc.id
        INNER JOIN medicamentos m ON pi.produto_id = m.id
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Itens de pedido migrados';
    END IF;
    
END $$;

-- =====================================================
-- CONFIGURAÇÃO DE PERMISSÕES AVANÇADAS
-- =====================================================

-- Criar roles específicos
DO $$
BEGIN
    -- Role para farmácias
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'farmacia_user') THEN
        CREATE ROLE farmacia_user;
        RAISE NOTICE 'Role farmacia_user criado';
    END IF;
    
    -- Role para administradores
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'farmacia_admin') THEN
        CREATE ROLE farmacia_admin;
        RAISE NOTICE 'Role farmacia_admin criado';
    END IF;
    
    -- Role para API
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'api_user') THEN
        CREATE ROLE api_user;
        RAISE NOTICE 'Role api_user criado';
    END IF;
END $$;

-- Conceder permissões básicas
GRANT USAGE ON SCHEMA public TO farmacia_user, farmacia_admin, api_user;

-- Permissões para farmacia_user (usuário padrão)
GRANT SELECT, INSERT, UPDATE ON medicamentos TO farmacia_user;
GRANT SELECT, INSERT, UPDATE ON conversas_whatsapp TO farmacia_user;
GRANT SELECT, INSERT, UPDATE ON mensagens_whatsapp TO farmacia_user;
GRANT SELECT, INSERT, UPDATE ON pedidos_consolidada TO farmacia_user;
GRANT SELECT, INSERT, UPDATE ON itens_pedido TO farmacia_user;
GRANT SELECT ON analises_preco_consolidada TO farmacia_user;
GRANT SELECT ON v_medicamentos_disponiveis TO farmacia_user;
GRANT SELECT ON v_medicamentos_vencendo TO farmacia_user;
GRANT SELECT ON v_relatorio_vendas TO farmacia_user;

-- Permissões para farmacia_admin (admin da farmácia)
GRANT ALL ON ALL TABLES IN SCHEMA public TO farmacia_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO farmacia_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO farmacia_admin;

-- Permissões para api_user (APIs internas)
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO api_user;
GRANT EXECUTE ON FUNCTION buscar_medicamentos TO api_user;
GRANT EXECUTE ON FUNCTION obter_medicamentos_vencendo TO api_user;

-- =====================================================
-- POLÍTICAS RLS REFINADAS
-- =====================================================

-- Limpar políticas existentes
DROP POLICY IF EXISTS "Farmácias podem ver seus próprios dados" ON produtos;
DROP POLICY IF EXISTS "Farmácias podem gerenciar suas conversas" ON conversas;
DROP POLICY IF EXISTS "Farmácias veem seus dados" ON medicamentos;
DROP POLICY IF EXISTS "Farmácias veem suas conversas" ON conversas_whatsapp;
DROP POLICY IF EXISTS "Farmácias veem seus pedidos" ON pedidos_consolidada;

-- Função auxiliar para obter farmacia_id do usuário
CREATE OR REPLACE FUNCTION get_current_farmacia_id()
RETURNS UUID AS $$
BEGIN
    -- Por enquanto, retorna a farmácia padrão
    -- Deve ser ajustado conforme sistema de autenticação
    RETURN '550e8400-e29b-41d4-a716-446655440000'::uuid;
    
    -- Implementação futura com JWT:
    -- RETURN (current_setting('request.jwt.claims', true)::json->>'farmacia_id')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para medicamentos
CREATE POLICY "farmacia_medicamentos_policy" ON medicamentos
    FOR ALL 
    USING (farmacia_id = get_current_farmacia_id())
    WITH CHECK (farmacia_id = get_current_farmacia_id());

-- Políticas para conversas
CREATE POLICY "farmacia_conversas_policy" ON conversas_whatsapp
    FOR ALL 
    USING (farmacia_id = get_current_farmacia_id())
    WITH CHECK (farmacia_id = get_current_farmacia_id());

-- Políticas para pedidos
CREATE POLICY "farmacia_pedidos_policy" ON pedidos_consolidada
    FOR ALL 
    USING (farmacia_id = get_current_farmacia_id())
    WITH CHECK (farmacia_id = get_current_farmacia_id());

-- Políticas para análises de preço
CREATE POLICY "farmacia_analises_policy" ON analises_preco_consolidada
    FOR ALL 
    USING (farmacia_id = get_current_farmacia_id())
    WITH CHECK (farmacia_id = get_current_farmacia_id());

-- Política especial para super admins
CREATE POLICY "super_admin_policy" ON medicamentos
    FOR ALL 
    TO farmacia_admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY "super_admin_conversas_policy" ON conversas_whatsapp
    FOR ALL 
    TO farmacia_admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY "super_admin_pedidos_policy" ON pedidos_consolidada
    FOR ALL 
    TO farmacia_admin
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- FUNÇÕES DE MIGRAÇÃO E UTILITÁRIOS
-- =====================================================

-- Função para verificar integridade dos dados
CREATE OR REPLACE FUNCTION verificar_integridade_dados()
RETURNS TABLE (
    tabela VARCHAR,
    total_registros BIGINT,
    registros_validos BIGINT,
    problemas TEXT[]
) AS $$
BEGIN
    -- Verificar medicamentos
    RETURN QUERY
    SELECT 
        'medicamentos'::VARCHAR,
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE nome IS NOT NULL AND validade IS NOT NULL)::BIGINT,
        ARRAY[
            CASE WHEN COUNT(*) FILTER (WHERE nome IS NULL) > 0 
                THEN COUNT(*) FILTER (WHERE nome IS NULL) || ' registros sem nome' END,
            CASE WHEN COUNT(*) FILTER (WHERE validade IS NULL) > 0 
                THEN COUNT(*) FILTER (WHERE validade IS NULL) || ' registros sem validade' END,
            CASE WHEN COUNT(*) FILTER (WHERE validade < '2020-01-01') > 0 
                THEN COUNT(*) FILTER (WHERE validade < '2020-01-01') || ' registros com data inválida' END
        ]::TEXT[]
    FROM medicamentos;
    
    -- Verificar pedidos
    RETURN QUERY
    SELECT 
        'pedidos_consolidada'::VARCHAR,
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE numero_pedido IS NOT NULL AND valor_total >= 0)::BIGINT,
        ARRAY[
            CASE WHEN COUNT(*) FILTER (WHERE numero_pedido IS NULL) > 0 
                THEN COUNT(*) FILTER (WHERE numero_pedido IS NULL) || ' pedidos sem número' END,
            CASE WHEN COUNT(*) FILTER (WHERE valor_total < 0) > 0 
                THEN COUNT(*) FILTER (WHERE valor_total < 0) || ' pedidos com valor negativo' END
        ]::TEXT[]
    FROM pedidos_consolidada;
    
END;
$$ LANGUAGE plpgsql;

-- Função para limpar dados órfãos
CREATE OR REPLACE FUNCTION limpar_dados_orfaos()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    count_deleted INTEGER;
BEGIN
    -- Remover análises de preço órfãs
    DELETE FROM analises_preco_consolidada 
    WHERE medicamento_id NOT IN (SELECT id FROM medicamentos);
    GET DIAGNOSTICS count_deleted = ROW_COUNT;
    result := result || 'Análises órfãs removidas: ' || count_deleted || E'\n';
    
    -- Remover itens de pedido órfãos
    DELETE FROM itens_pedido 
    WHERE pedido_id NOT IN (SELECT id FROM pedidos_consolidada);
    GET DIAGNOSTICS count_deleted = ROW_COUNT;
    result := result || 'Itens de pedido órfãos removidos: ' || count_deleted || E'\n';
    
    -- Remover mensagens órfãs
    DELETE FROM mensagens_whatsapp 
    WHERE conversa_id NOT IN (SELECT id FROM conversas_whatsapp);
    GET DIAGNOSTICS count_deleted = ROW_COUNT;
    result := result || 'Mensagens órfãs removidas: ' || count_deleted || E'\n';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ATUALIZAÇÃO DE ESTATÍSTICAS
-- =====================================================

-- Atualizar estatísticas das tabelas
ANALYZE farmacias;
ANALYZE medicamentos;
ANALYZE conversas_whatsapp;
ANALYZE mensagens_whatsapp;
ANALYZE pedidos_consolidada;
ANALYZE itens_pedido;
ANALYZE analises_preco_consolidada;

-- =====================================================
-- VERIFICAÇÕES FINAIS
-- =====================================================

-- Executar verificação de integridade
SELECT * FROM verificar_integridade_dados();

-- Limpar dados órfãos
SELECT limpar_dados_orfaos();

-- Verificar se todas as views funcionam
DO $$
DECLARE
    view_name TEXT;
    view_count INTEGER;
BEGIN
    FOR view_name IN 
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'v_%'
    LOOP
        EXECUTE 'SELECT COUNT(*) FROM ' || view_name INTO view_count;
        RAISE NOTICE 'View % funciona corretamente: % registros', view_name, view_count;
    END LOOP;
END $$;

-- Relatório final
SELECT 
    'MIGRAÇÃO CONCLUÍDA' as status,
    NOW() as data_migracao,
    (SELECT COUNT(*) FROM medicamentos) as total_medicamentos,
    (SELECT COUNT(*) FROM pedidos_consolidada) as total_pedidos,
    (SELECT COUNT(*) FROM conversas_whatsapp) as total_conversas;

RAISE NOTICE 'MIGRAÇÃO PARA ESQUEMA CONSOLIDADO CONCLUÍDA COM SUCESSO!';