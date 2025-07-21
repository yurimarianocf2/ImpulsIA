# Agente de Segurança e Boas Práticas do Supabase

> **Foco Principal:** Garantir a implementação segura, eficiente e escalável de projetos utilizando Supabase, com ênfase na proteção de dados e na integridade do banco de dados.

## 1. Credenciais e Chaves de API

- **REGRA CRÍTICA:** A chave `service_role_key` é um segredo absoluto. **NUNCA** deve ser exposta no lado do cliente (navegador, aplicativo móvel) ou em qualquer código de front-end.
- **Uso Correto:**
  - `anon_key`: Chave pública, segura para ser usada no front-end para operações de usuário autenticado (com RLS ativado).
  - `service_role_key`: Usada **APENAS** no back-end (ex: em Edge Functions, servidores Node.js, etc.) para tarefas administrativas que precisam ignorar as políticas de RLS.
- **Armazenamento:** Todas as chaves e segredos (como senhas de banco de dados, JWT secret) devem ser armazenados como variáveis de ambiente (`.env` files) e nunca hardcoded no código.

## 2. Segurança a Nível de Linha (Row-Level Security - RLS)

- **OBRIGATÓRIO:** O RLS **DEVE** ser ativado em todas as tabelas que contêm dados sensíveis ou que pertencem a usuários específicos.
- **Princípio:** Por padrão, o acesso a todas as linhas é negado. Você deve criar políticas explícitas para permitir o acesso.
- **Verificação:** Antes de colocar qualquer tabela em produção, verifique se o RLS está ativado com `ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;`.

## 3. Políticas de Acesso (Policies)

- **Mínimo Privilégio:** As políticas de RLS devem ser o mais restritivas possível. Conceda apenas as permissões estritamente necessárias para uma operação.
- **Políticas `USING` e `WITH CHECK`:**
  - `USING (expression)`: Aplica-se a linhas que já existem no banco de dados (para `SELECT`, `UPDATE`, `DELETE`).
  - `WITH CHECK (expression)`: Aplica-se a novas linhas que estão sendo inseridas ou atualizadas (para `INSERT`, `UPDATE`).
- **Exemplo de Política Comum:** Permitir que um usuário veja apenas seus próprios dados.
  ```sql
  CREATE POLICY "Permitir que usuários leiam seus próprios perfis"
  ON profiles FOR SELECT
  USING ( auth.uid() = user_id );
  ```

## 4. Migrações (Migrations)

- **PROIBIDO:** **NUNCA** faça alterações de esquema (criar tabelas, adicionar colunas) diretamente na interface do Supabase em um projeto em produção.
- **Fluxo de Trabalho Correto:**
  1. Use a CLI do Supabase para desenvolver localmente.
  2. Crie uma nova migração para qualquer alteração de esquema: `supabase migration new nome_da_migracao`.
  3. Aplique as migrações ao seu projeto de produção: `supabase db push`.
- **Benefício:** Isso garante que seu esquema seja versionado, repetível e consistente em todos os ambientes (desenvolvimento, staging, produção).

## 5. Funções de Banco de Dados (PostgreSQL Functions)

- **Abstração de Lógica:** Encapsule lógica de negócios complexa ou operações sensíveis em funções PostgreSQL.
- **Segurança:** Use a opção `SECURITY DEFINER` com cuidado. Funções `SECURITY DEFINER` rodam com os privilégios do usuário que definiu a função (geralmente um superusuário), permitindo contornar o RLS para operações controladas.
  ```sql
  CREATE FUNCTION criar_pedido(cliente_id uuid, produto_id int)
  RETURNS void AS $$
    -- Lógica de verificação de estoque e criação de pedido aqui
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```
- **Invocação:** Chame essas funções a partir do seu código cliente via RPC (`supabase.rpc('nome_da_funcao', { ... })`).

## 6. Edge Functions

- **Lógica de Back-end:** Use Edge Functions para qualquer lógica que precise da `service_role_key` ou que não deva ser exposta ao cliente.
- **Exemplos:** Processamento de pagamentos, integrações com APIs de terceiros, tarefas administrativas.
- **Segurança:** Valide sempre os dados de entrada e autentique as chamadas para as Edge Functions.

## 7. Boas Práticas Gerais

- **Validação de Entrada:** Sempre valide e sanitize os dados de entrada no lado do servidor (Edge Functions, funções de banco de dados) para prevenir injeção de SQL e outros ataques, mesmo que o SDK do Supabase já ofereça proteção.
- **Índices:** Crie índices em colunas que são frequentemente usadas em cláusulas `WHERE` de suas políticas de RLS e consultas para garantir um bom desempenho.
- **Backups:** Embora o Supabase gerencie backups automáticos, entenda a política de retenção e considere estratégias de backup adicionais para dados críticos.
