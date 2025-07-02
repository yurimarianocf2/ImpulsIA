# 📋 INSTRUÇÕES PARA APLICAR ESQUEMA CONSOLIDADO

## ⚠️ IMPORTANTE: Backup Obrigatório

Antes de aplicar qualquer mudança no banco de dados, faça backup completo:

1. Acesse o Supabase Dashboard
2. Vá para **Settings** > **Database** 
3. Clique em **Backup** e faça download do backup atual
4. Salve o backup em local seguro

## 🚀 Passos para Aplicar o Esquema Consolidado

### 1. Conectar ao Supabase

1. Abra o [Supabase Dashboard](https://supabase.com/dashboard)
2. Acesse seu projeto FarmaBot Pro
3. Vá para **SQL Editor**

### 2. Aplicar Esquema Consolidado

Execute os scripts na seguinte ordem:

#### Passo 1: Aplicar Schema Base
```sql
-- Copie e cole o conteúdo completo do arquivo:
-- database/schema-consolidado.sql
```

#### Passo 2: Migrar Dados Existentes
```sql
-- Copie e cole o conteúdo completo do arquivo:
-- database/aplicar-esquema-consolidado.sql
```

### 3. Verificar Aplicação

Execute este comando para verificar se as tabelas foram criadas:

```sql
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'medicamentos',
    'analises_preco_consolidada', 
    'conversas_whatsapp',
    'pedidos_consolidada',
    'historico_precos'
  )
ORDER BY table_name;
```

### 4. Verificar Views

```sql
SELECT 
  table_name as view_name
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'v_%'
ORDER BY table_name;
```

### 5. Verificar Funções

```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN (
    'buscar_medicamentos',
    'obter_medicamentos_vencendo',
    'verificar_integridade_dados'
  );
```

## 🧪 Teste da Aplicação

Após aplicar o schema, execute os testes:

```bash
# No terminal do projeto
npm install  # se necessário
node scripts/test-schema-consolidado.js
```

O resultado esperado é **100% de testes aprovados**.

## 📊 Principais Mudanças Aplicadas

### 1. Tabela `medicamentos` (Nova - Consolidada)
- Substitui a tabela `produtos`
- Inclui **todos** os campos necessários para medicamentos
- Campo `validade` obrigatório
- Campos calculados automáticos: `dias_para_vencer`, `status_validade`
- Índices otimizados para busca e validade

### 2. Tabela `analises_preco_consolidada` (Nova)
- Substitui `analises_preco`
- Estrutura otimizada sem duplicação
- Relacionamento consolidado com medicamentos

### 3. Views Otimizadas
- `v_medicamentos_vencendo`: Lista medicamentos próximos ao vencimento
- `v_medicamentos_disponiveis`: Medicamentos disponíveis para venda
- `v_relatorio_vendas`: Relatórios de vendas consolidados

### 4. Funções Especializadas
- `buscar_medicamentos()`: Busca inteligente com similaridade
- `obter_medicamentos_vencendo()`: Lista medicamentos por vencimento
- `verificar_integridade_dados()`: Validação de consistência

### 5. Segurança (RLS)
- Políticas por farmácia
- Isolamento de dados por tenant
- Permissões granulares por role

## 🔄 APIs Atualizadas

As seguintes APIs foram atualizadas para usar o novo schema:

1. **`/api/expiring-products`**:
   - Agora usa `v_medicamentos_vencendo`
   - Retorna dados enriquecidos com urgência e recomendações

2. **`/api/price-analysis/history`**:
   - Usa `analises_preco_consolidada`
   - Includes dados do medicamento via relacionamento

3. **Upload de CSV**:
   - Template atualizado com novos campos
   - Suporte a campos estendidos de medicamentos

## ⚠️ Pontos de Atenção

### 1. Aplicação Gradual
- Execute primeiro o schema base
- Depois execute a migração de dados
- Verifique cada passo antes do próximo

### 2. Downtime Mínimo
- A migração mantém tabelas antigas como backup
- APIs continuam funcionando durante transição
- RLS evita conflitos de acesso

### 3. Validação Pós-Migração
- Execute os testes automatizados
- Verifique se o dashboard carrega corretamente
- Teste upload de produtos
- Confirme relatórios de vencimento

## 🆘 Rollback (Se Necessário)

Se algo der errado, você pode voltar rapidamente:

```sql
-- Renomear tabelas para voltar ao estado anterior
DROP TABLE IF EXISTS medicamentos CASCADE;
DROP VIEW IF EXISTS v_medicamentos_vencendo CASCADE;
DROP VIEW IF EXISTS v_medicamentos_disponiveis CASCADE;

-- Restaurar tabela produtos original (se ainda existir)
-- ALTER TABLE produtos_backup RENAME TO produtos;
```

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do Supabase Dashboard
2. Execute `node scripts/test-schema-consolidado.js` para diagnóstico
3. Consulte os arquivos de backup criados
4. Se necessário, restaure o backup e tente novamente

## 🎯 Benefícios Após Aplicação

### ✅ Organização
- Uma única tabela `medicamentos` por farmácia
- Eliminação de duplicações
- Estrutura clara e consistente

### ✅ Performance
- Índices otimizados
- Views materializadas para consultas complexas
- Queries mais eficientes

### ✅ Funcionalidades
- Cálculo automático de dias para vencimento
- Status de validade em tempo real
- Busca inteligente com similaridade
- Relatórios consolidados

### ✅ Segurança
- Row Level Security por farmácia
- Políticas granulares
- Isolamento de dados

### ✅ Manutenção
- Schema versionado
- Funções de integridade
- Logs de auditoria automáticos

---

**📅 Data de Criação**: 01/07/2025  
**👨‍💻 Versão**: 1.0  
**🔄 Status**: Pronto para aplicação