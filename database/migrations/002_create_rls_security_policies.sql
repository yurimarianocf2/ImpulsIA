-- =============================================================================
-- POLÍTICAS DE SEGURANÇA RLS - FARMÁCIA WHATSAPP
-- =============================================================================
-- Implementa políticas de acesso baseadas no princípio do menor privilégio
-- Cada cliente só pode acessar seus próprios dados
-- =============================================================================

-- 1. POLÍTICAS PARA TABELA CLIENTES
-- -----------------------------------------------------------------------------

-- POLÍTICA: Cliente só acessa seus próprios dados
-- Baseada no telefone que vem do WhatsApp via JWT ou contexto
CREATE POLICY "cliente_acesso_proprio_perfil" 
ON clientes FOR ALL 
USING (
    telefone = current_setting('app.current_user_phone', true)
    OR 
    -- Fallback para service_role (usado pelo N8N)
    current_setting('role') = 'service_role'
);

-- POLÍTICA: Permitir inserção de novos clientes (cadastro via WhatsApp)
CREATE POLICY "permitir_cadastro_cliente" 
ON clientes FOR INSERT 
WITH CHECK (
    -- Permite inserção se for service_role ou se o telefone corresponde ao usuário atual
    current_setting('role') = 'service_role' 
    OR 
    telefone = current_setting('app.current_user_phone', true)
);

-- 2. POLÍTICAS PARA TABELA PEDIDOS
-- -----------------------------------------------------------------------------

-- POLÍTICA: Cliente só vê seus próprios pedidos
CREATE POLICY "cliente_acesso_proprios_pedidos" 
ON pedidos FOR ALL 
USING (
    cliente_id IN (
        SELECT cliente_id 
        FROM clientes 
        WHERE telefone = current_setting('app.current_user_phone', true)
    )
    OR 
    -- Service role pode acessar todos (para N8N)
    current_setting('role') = 'service_role'
);

-- POLÍTICA: Permitir criação de pedidos pelo cliente
CREATE POLICY "permitir_criacao_pedidos" 
ON pedidos FOR INSERT 
WITH CHECK (
    cliente_id IN (
        SELECT cliente_id 
        FROM clientes 
        WHERE telefone = current_setting('app.current_user_phone', true)
    )
    OR 
    current_setting('role') = 'service_role'
);

-- 3. POLÍTICAS PARA TABELAS DE PRODUTOS E PROMOÇÕES
-- -----------------------------------------------------------------------------

-- Produtos e promoções são públicas (apenas leitura para todos)
CREATE POLICY "produtos_leitura_publica" 
ON produtos FOR SELECT 
USING (ativo = true);

CREATE POLICY "promocoes_leitura_publica" 
ON promocoes FOR SELECT 
USING (ativa = true);

-- Apenas service_role pode modificar produtos/promoções
CREATE POLICY "produtos_admin_only" 
ON produtos FOR ALL 
USING (current_setting('role') = 'service_role');

CREATE POLICY "promocoes_admin_only" 
ON promocoes FOR ALL 
USING (current_setting('role') = 'service_role');

-- 4. POLÍTICAS PARA CONFIGURAÇÕES
-- -----------------------------------------------------------------------------

-- Configurações são read-only para aplicação, write para admin
CREATE POLICY "configuracao_leitura_app" 
ON configuracao FOR SELECT 
USING (true); -- Qualquer um pode ler configurações

CREATE POLICY "configuracao_admin_only" 
ON configuracao FOR ALL 
USING (current_setting('role') = 'service_role');

-- =============================================================================
-- FUNÇÃO PARA DEFINIR CONTEXTO DO USUÁRIO ATUAL
-- =============================================================================

-- Esta função deve ser chamada pelo N8N antes de fazer operações
-- para definir o telefone do cliente atual
CREATE OR REPLACE FUNCTION set_current_user_phone(phone_number TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_phone', phone_number, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TESTE DAS POLÍTICAS
-- =============================================================================

-- Para testar, execute:
-- SELECT set_current_user_phone('5511999999999');
-- SELECT * FROM clientes; -- Deve mostrar apenas o cliente com esse telefone

-- =============================================================================
-- VERIFICAÇÃO DAS POLÍTICAS CRIADAS
-- =============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as comando,
    CASE 
        WHEN cmd = 'ALL' THEN '🔒 Controle Total'
        WHEN cmd = 'SELECT' THEN '👁️ Apenas Leitura'
        WHEN cmd = 'INSERT' THEN '➕ Apenas Inserção'
        WHEN cmd = 'UPDATE' THEN '✏️ Apenas Atualização'
        WHEN cmd = 'DELETE' THEN '🗑️ Apenas Exclusão'
    END as tipo_acesso
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;