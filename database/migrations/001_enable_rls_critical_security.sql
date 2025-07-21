-- =============================================================================
-- MIGRAÇÃO CRÍTICA DE SEGURANÇA - RLS
-- =============================================================================
-- Esta migração corrige vulnerabilidades CRÍTICAS identificadas na análise
-- DEVE ser executada IMEDIATAMENTE antes de qualquer deploy em produção
-- =============================================================================

-- 1. ATIVAR RLS EM TABELAS CRÍTICAS COM DADOS PESSOAIS
-- -----------------------------------------------------------------------------

-- Tabela clientes: contém dados pessoais (nome, email, telefone)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE clientes IS 'RLS habilitado - protege dados pessoais dos clientes (LGPD)';

-- Tabela pedidos: contém dados transacionais vinculados aos clientes  
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE pedidos IS 'RLS habilitado - protege dados transacionais dos clientes';

-- 2. CRIAR ÍNDICES PARA PERFORMANCE DAS POLÍTICAS RLS
-- -----------------------------------------------------------------------------

-- Índice para busca por telefone (usado na autenticação WhatsApp)
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);

-- Índice para relacionamento cliente-pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON pedidos(cliente_id);

-- Índice para busca por número do pedido
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON pedidos(pedido_numero);

-- 3. VERIFICAR STATUS DO RLS
-- -----------------------------------------------------------------------------
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ PROTEGIDA'
        ELSE '❌ VULNERÁVEL'
    END as status_seguranca
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =============================================================================
-- RESULTADO ESPERADO:
-- Todas as tabelas devem mostrar rls_enabled = true
-- Status de segurança deve ser '✅ PROTEGIDA' para todas
-- =============================================================================