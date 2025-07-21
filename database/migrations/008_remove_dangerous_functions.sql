-- =============================================================================
-- REMOÇÃO DEFINITIVA DE FUNÇÕES PERIGOSAS
-- =============================================================================
-- Remove as funções que desabilitam RLS usando todas as assinaturas possíveis
-- =============================================================================

-- 1. REMOVER TODAS AS VERSÕES POSSÍVEIS DAS FUNÇÕES PERIGOSAS
-- -----------------------------------------------------------------------------

-- Remover import_produtos_from_csv com diferentes assinaturas possíveis
DROP FUNCTION IF EXISTS import_produtos_from_csv();
DROP FUNCTION IF EXISTS import_produtos_from_csv(text);
DROP FUNCTION IF EXISTS import_produtos_from_csv(jsonb);
DROP FUNCTION IF EXISTS import_produtos_from_csv(json);

-- Remover importar_promocoes com diferentes assinaturas possíveis  
DROP FUNCTION IF EXISTS importar_promocoes();
DROP FUNCTION IF EXISTS importar_promocoes(text);
DROP FUNCTION IF EXISTS importar_promocoes(jsonb);
DROP FUNCTION IF EXISTS importar_promocoes(json);

-- Verificar se ainda existem outras funções perigosas
DROP FUNCTION IF EXISTS public.import_produtos_from_csv();
DROP FUNCTION IF EXISTS public.import_produtos_from_csv(text);
DROP FUNCTION IF EXISTS public.import_produtos_from_csv(jsonb);
DROP FUNCTION IF EXISTS public.import_produtos_from_csv(json);

DROP FUNCTION IF EXISTS public.importar_promocoes();
DROP FUNCTION IF EXISTS public.importar_promocoes(text);
DROP FUNCTION IF EXISTS public.importar_promocoes(jsonb);
DROP FUNCTION IF EXISTS public.importar_promocoes(json);

-- 2. VERIFICAR SE FORAM REMOVIDAS COM SUCESSO
-- -----------------------------------------------------------------------------

-- Listar funções restantes para confirmação
SELECT 
    'FUNÇÃO RESTANTE: ' || routine_name as status,
    routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%import%'
ORDER BY routine_name;

-- 3. ATUALIZAR FUNÇÃO DE VERIFICAÇÃO PARA DETECTAR MELHOR
-- -----------------------------------------------------------------------------

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
    AND tablename IN ('clientes', 'pedidos', 'produtos', 'promocoes', 'configuracao')
    AND rowsecurity = FALSE;
    
    -- Verificar funções perigosas (busca mais abrangente)
    SELECT COUNT(*) INTO func_issues
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND (
        routine_name LIKE '%import_produtos_from_csv%' AND routine_name NOT LIKE '%_seguro%'
        OR routine_name LIKE '%importar_promocoes%' AND routine_name NOT LIKE '%_seguro%'
    );
    
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
                WHEN func_issues > 0 THEN 'Funções perigosas detectadas - executar remoção'
                ELSE 'Verificar configuração de RLS'
            END
        ),
        'timestamp_verificacao', NOW()
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. VERIFICAÇÃO FINAL DETALHADA
-- -----------------------------------------------------------------------------

-- Verificar status de segurança após remoção
SELECT verificar_seguranca_sistema() as resultado_final;

-- Listar apenas funções seguras restantes
SELECT 
    'FUNÇÃO SEGURA: ' || routine_name as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%import%'
AND routine_name LIKE '%_seguro%'
ORDER BY routine_name;