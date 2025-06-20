# 🗄️ Database Setup - FarmaBot Pro

## 📋 Instruções de Configuração

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Clique em "New Project"
3. Configure:
   - **Organization**: Sua organização
   - **Name**: `farmabot-pro`
   - **Database Password**: Senha forte (anote!)
   - **Region**: `South America (São Paulo)`
   - **Pricing Plan**: Pro (recomendado para produção)

### 2. Executar Migrações

Execute os arquivos SQL na seguinte ordem:

#### 2.1 Schema Principal
```sql
-- Copie e execute o conteúdo de: schema.sql
-- Isso criará todas as tabelas, índices, funções e triggers
```

#### 2.2 Configurações de Segurança
```sql
-- Copie e execute o conteúdo de: security.sql
-- Isso configurará RLS, políticas de segurança e validações
```

#### 2.3 Dados de Teste
```sql
-- Copie e execute o conteúdo de: seeds.sql
-- Isso populará o banco com produtos e dados de exemplo
```

### 3. Configurar Variáveis de Ambiente

1. Copie `.env.example` para `.env.local`
2. No Supabase Dashboard:
   - Vá em **Settings** → **API**
   - Copie a **URL** e **anon key**
   - Copie a **service_role key** (privada)
3. Configure no arquivo `.env.local`:

```bash
SUPABASE_URL=https://seuprojetoid.supabase.co
SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

### 4. Configurar Autenticação

No Dashboard do Supabase:

1. **Authentication** → **Settings**
2. Configure os providers necessários
3. **Email Templates**: Personalize se necessário
4. **URL Configuration**: 
   - Site URL: `http://localhost:3000` (dev) ou seu domínio
   - Redirect URLs: Adicione URLs permitidas

### 5. Configurar Storage (Opcional)

Para upload de imagens de produtos:

1. **Storage** → **Create Bucket**
2. Nome: `produtos-imagens`
3. **Policies**: Configure acesso público para leitura

### 6. Verificar Instalação

Execute estas queries para verificar se tudo foi criado corretamente:

```sql
-- Verificar tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar se há produtos
SELECT COUNT(*) as total_produtos FROM produtos;

-- Verificar farmácia padrão
SELECT nome, telefone, whatsapp FROM farmacias LIMIT 1;

-- Testar busca de produtos
SELECT * FROM buscar_produtos(
  (SELECT id FROM farmacias LIMIT 1), 
  'dipirona', 
  5
);
```

## 🔧 Manutenção e Operações

### Backup Automático

O Supabase faz backup automático, mas você pode configurar backups adicionais:

```sql
-- Executar diariamente via cron job
SELECT calcular_metricas_diarias(
  (SELECT id FROM farmacias WHERE nome = 'Farmácia São João'),
  CURRENT_DATE
);

-- Refresh das views materializadas
SELECT refresh_dashboard_views();
```

### Limpeza de Dados Antigos

```sql
-- Executar mensalmente
SELECT limpar_dados_antigos();
```

### Monitoramento

Queries úteis para monitoramento:

```sql
-- Verificar performance das consultas
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Verificar tamanho das tabelas
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Verificar índices não utilizados
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_tup_read = 0
ORDER BY schemaname, tablename;
```

## 📊 Métricas e Dashboard

### Views Principais

- `mv_vendas_dashboard`: Métricas de vendas por dia
- `mv_produtos_populares`: Produtos mais vendidos
- `vendas_dashboard`: View simples de vendas

### Funções Úteis

- `buscar_produtos(farmacia_id, query, limit)`: Busca produtos
- `calcular_metricas_diarias(farmacia_id, data)`: Calcula métricas
- `refresh_dashboard_views()`: Atualiza views materializadas

## 🔐 Segurança

### Row Level Security (RLS)

Todas as tabelas têm RLS habilitado com isolamento por farmácia.

### Auditoria

Todas as operações são logadas na tabela `audit_logs`.

### Validações

- CPF, CNPJ e telefones são validados automaticamente
- Emails têm validação de formato
- Constraints de integridade em todas as FK

## 🚨 Troubleshooting

### Problemas Comuns

1. **Erro de permissão**: Verifique se está usando a service_role key
2. **RLS bloqueando consultas**: Teste com `SET ROLE postgres;`
3. **Performance lenta**: Execute `ANALYZE;` nas tabelas
4. **Espaço em disco**: Monitore via Dashboard do Supabase

### Logs

```sql
-- Ver últimos erros
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Ver locks
SELECT * FROM pg_locks WHERE NOT granted;
```

## 📞 Suporte

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Issues**: Crie issues no repositório do projeto

---

✅ **Banco configurado com sucesso!**

Próximos passos:
1. Configurar n8n workflows
2. Configurar WhatsApp Business API
3. Iniciar desenvolvimento da API
4. Configurar dashboard frontend