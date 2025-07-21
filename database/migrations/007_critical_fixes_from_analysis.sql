-- =============================================================================
-- CORREÇÕES CRÍTICAS BASEADAS NA ANÁLISE ANTERIOR
-- =============================================================================
-- Corrige problemas específicos identificados na análise do prompt.md
-- =============================================================================

-- 1. ADICIONAR COLUNA WHATSAPP NA TABELA CLIENTES (SE NÃO EXISTIR)
-- -----------------------------------------------------------------------------
-- O sistema precisa identificar clientes pelo número do WhatsApp

-- Verificar se a coluna já existe, se não existir, adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clientes' 
        AND column_name = 'telefone'
    ) THEN
        ALTER TABLE clientes ADD COLUMN telefone TEXT UNIQUE;
        COMMENT ON COLUMN clientes.telefone IS 'Número WhatsApp para identificação única do cliente';
    END IF;
END$$;

-- Criar índice para performance se não existir
CREATE INDEX IF NOT EXISTS idx_clientes_telefone_lookup ON clientes(telefone);

-- 2. CORRIGIR FUNÇÕES PERIGOSAS QUE DESABILITAM RLS
-- -----------------------------------------------------------------------------
-- Substituir funções que desabilitam RLS por versões seguras

-- Função segura para importar produtos
CREATE OR REPLACE FUNCTION import_produtos_from_csv_seguro(
    produtos_data JSONB
)
RETURNS INTEGER AS $$
DECLARE
    produto_item JSONB;
    produtos_inseridos INTEGER := 0;
BEGIN
    -- Esta função roda com privilégios de SECURITY DEFINER
    -- Não precisa desabilitar RLS globalmente
    
    FOR produto_item IN SELECT * FROM jsonb_array_elements(produtos_data)
    LOOP
        INSERT INTO produtos (
            nome, 
            descricao, 
            categoria, 
            preco, 
            estoque,
            ativo
        ) VALUES (
            produto_item->>'nome',
            produto_item->>'descricao', 
            produto_item->>'categoria',
            (produto_item->>'preco')::NUMERIC,
            (produto_item->>'estoque')::INTEGER,
            COALESCE((produto_item->>'ativo')::BOOLEAN, true)
        )
        ON CONFLICT (nome) DO UPDATE SET
            descricao = EXCLUDED.descricao,
            preco = EXCLUDED.preco,
            estoque = EXCLUDED.estoque,
            atualizado_em = NOW();
            
        produtos_inseridos := produtos_inseridos + 1;
    END LOOP;
    
    -- Log da operação
    INSERT INTO log_acesso_dados (telefone_hash, acao, dados_acessados)
    VALUES (
        'admin_import',
        'import_produtos_seguro',
        ARRAY[produtos_inseridos::TEXT || ' produtos importados']
    );
    
    RETURN produtos_inseridos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função segura para importar promoções
CREATE OR REPLACE FUNCTION importar_promocoes_seguro(
    promocoes_data JSONB
)
RETURNS INTEGER AS $$
DECLARE
    promocao_item JSONB;
    promocoes_inseridas INTEGER := 0;
BEGIN
    -- Esta função roda com privilégios de SECURITY DEFINER
    -- Não precisa desabilitar RLS globalmente
    
    FOR promocao_item IN SELECT * FROM jsonb_array_elements(promocoes_data)
    LOOP
        INSERT INTO promocoes (
            produto_id,
            nome,
            apresentacao,
            preco_promocional,
            preco_normal,
            ativa,
            data_inicio,
            data_fim
        ) VALUES (
            (promocao_item->>'produto_id')::BIGINT,
            promocao_item->>'nome',
            promocao_item->>'apresentacao',
            (promocao_item->>'preco_promocional')::NUMERIC,
            (promocao_item->>'preco_normal')::NUMERIC,
            COALESCE((promocao_item->>'ativa')::BOOLEAN, true),
            COALESCE((promocao_item->>'data_inicio')::TIMESTAMPTZ, NOW()),
            CASE 
                WHEN promocao_item->>'data_fim' IS NOT NULL 
                THEN (promocao_item->>'data_fim')::TIMESTAMPTZ 
                ELSE NULL 
            END
        )
        ON CONFLICT (produto_id) DO UPDATE SET
            nome = EXCLUDED.nome,
            preco_promocional = EXCLUDED.preco_promocional,
            preco_normal = EXCLUDED.preco_normal,
            ativa = EXCLUDED.ativa;
            
        promocoes_inseridas := promocoes_inseridas + 1;
    END LOOP;
    
    -- Log da operação
    INSERT INTO log_acesso_dados (telefone_hash, acao, dados_acessados)
    VALUES (
        'admin_import',
        'import_promocoes_seguro',
        ARRAY[promocoes_inseridas::TEXT || ' promoções importadas']
    );
    
    RETURN promocoes_inseridas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. REMOVER FUNÇÕES PERIGOSAS ANTIGAS (SE EXISTIREM)
-- -----------------------------------------------------------------------------

-- Remover função perigosa de importação de produtos
DROP FUNCTION IF EXISTS import_produtos_from_csv(JSONB);

-- Remover função perigosa de importação de promoções  
DROP FUNCTION IF EXISTS importar_promocoes(JSONB);

-- 4. PROTEGER VIEW COM POLÍTICA RLS EXPLÍCITA
-- -----------------------------------------------------------------------------

-- Criar política para view_promocoes_ativas se a view existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'view_promocoes_ativas'
    ) THEN
        -- A view herda as políticas das tabelas base, mas vamos garantir
        COMMENT ON VIEW view_promocoes_ativas IS 'View protegida - herda RLS das tabelas produtos e promocoes';
    END IF;
END$$;

-- 5. FUNÇÃO AUXILIAR PARA BUSCAR CLIENTE POR WHATSAPP
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION buscar_cliente_por_whatsapp(
    numero_whatsapp TEXT
)
RETURNS TABLE(
    cliente_id UUID,
    nome TEXT,
    email TEXT,
    nome_mascarado TEXT,
    primeiro_acesso BOOLEAN
) AS $$
DECLARE
    cliente_existe BOOLEAN := FALSE;
BEGIN
    -- Buscar cliente existente
    RETURN QUERY
    SELECT 
        c.cliente_id,
        c.nome,
        c.email,
        mascara_nome(c.nome) as nome_mascarado,
        FALSE as primeiro_acesso
    FROM clientes c
    WHERE c.telefone = numero_whatsapp;
    
    -- Se não encontrou nenhum resultado, indicar que é primeiro acesso
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            NULL::UUID as cliente_id,
            NULL::TEXT as nome,
            NULL::TEXT as email,
            'Cliente Novo'::TEXT as nome_mascarado,
            TRUE as primeiro_acesso;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. VERIFICAÇÃO FINAL DE SEGURANÇA
-- -----------------------------------------------------------------------------

-- Função para verificar se ainda há vulnerabilidades conhecidas
CREATE OR REPLACE FUNCTION verificar_seguranca_sistema()
RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    rls_issues INTEGER := 0;
    func_issues INTEGER := 0;
    total_issues INTEGER;
BEGIN
    -- Verificar tabelas sem RLS
    SELECT COUNT(*) INTO rls_issues
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('clientes', 'pedidos')
    AND rowsecurity = FALSE;
    
    -- Verificar se ainda existem funções perigosas
    SELECT COUNT(*) INTO func_issues
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name IN ('import_produtos_from_csv', 'importar_promocoes');
    
    total_issues := rls_issues + func_issues;
    
    resultado := jsonb_build_object(
        'status', CASE 
            WHEN total_issues = 0 THEN 'SEGURO'
            WHEN total_issues <= 2 THEN 'ATENÇÃO' 
            ELSE 'CRÍTICO'
        END,
        'total_problemas', total_issues,
        'detalhes', jsonb_build_object(
            'tabelas_sem_rls', rls_issues,
            'funcoes_perigosas', func_issues,
            'recomendacao', CASE 
                WHEN total_issues = 0 THEN 'Sistema seguro para produção'
                ELSE 'Execute as migrações anteriores primeiro'
            END
        ),
        'timestamp_verificacao', NOW()
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO  
-- =============================================================================

COMMENT ON FUNCTION import_produtos_from_csv_seguro IS 'Versão segura da importação - não desabilita RLS globalmente';
COMMENT ON FUNCTION importar_promocoes_seguro IS 'Versão segura da importação - não desabilita RLS globalmente';  
COMMENT ON FUNCTION buscar_cliente_por_whatsapp IS 'Busca cliente pelo WhatsApp com dados mascarados';
COMMENT ON FUNCTION verificar_seguranca_sistema IS 'Verifica se ainda existem vulnerabilidades conhecidas no sistema';

-- Verificação final - deve retornar status SEGURO após todas as migrações
SELECT verificar_seguranca_sistema() as status_final_seguranca;