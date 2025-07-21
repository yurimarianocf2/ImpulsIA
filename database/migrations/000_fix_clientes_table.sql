-- =============================================================================
-- CORREÇÃO EMERGENCIAL - ADICIONAR COLUNA TELEFONE
-- =============================================================================
-- Deve ser executado ANTES da migração 001
-- Corrige a estrutura da tabela clientes para incluir telefone WhatsApp
-- =============================================================================

-- 1. ADICIONAR COLUNA TELEFONE NA TABELA CLIENTES
-- -----------------------------------------------------------------------------

ALTER TABLE clientes ADD COLUMN telefone TEXT;

-- 2. TORNAR A COLUNA ÚNICA APÓS ADICIONAR
-- -----------------------------------------------------------------------------

-- Primeiro vamos adicionar um índice único
CREATE UNIQUE INDEX idx_clientes_telefone_unique ON clientes(telefone) WHERE telefone IS NOT NULL;

-- 3. POPULAR ALGUNS DADOS DE TESTE (OPCIONAL)
-- -----------------------------------------------------------------------------
-- Você pode descomentar se quiser dados de teste

/*
-- Exemplo de como popular dados de teste
UPDATE clientes SET telefone = '5511999999999' WHERE cliente_id = (SELECT cliente_id FROM clientes LIMIT 1);
*/

-- 4. DOCUMENTAR A COLUNA
-- -----------------------------------------------------------------------------

COMMENT ON COLUMN clientes.telefone IS 'Número do WhatsApp para identificação única do cliente no atendimento IA';

-- 5. VERIFICAR ESTRUTURA FINAL
-- -----------------------------------------------------------------------------

-- Ver estrutura atualizada da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE WHEN column_name = 'telefone' THEN '✅ ADICIONADA' ELSE '📋 EXISTIA' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'clientes'
ORDER BY ordinal_position;