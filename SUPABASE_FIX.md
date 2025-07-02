# 🚨 CORREÇÃO URGENTE - Coluna `validade` Missing

## Problema
```
Error: column produtos.validade does not exist
```

## Causa
A API está procurando `produtos.validade` mas a tabela pode ter `data_vencimento` ou a coluna pode estar missing.

## Solução

### 1. Execute o Script de Correção
No Supabase SQL Editor, execute:
```sql
-- Copie e cole o conteúdo de: database/fix-validade-column.sql
```

### 2. Verificar Schema Atual
Primeiro, execute para verificar:
```sql
-- Copie e cole o conteúdo de: database/check-produtos-schema.sql
```

### 3. Alternativa Manual
Se preferir fazer manualmente no Supabase:

```sql
-- Opção A: Se não existe nenhuma coluna de validade
ALTER TABLE produtos ADD COLUMN validade DATE;

-- Opção B: Se existe data_vencimento, renomeie
ALTER TABLE produtos RENAME COLUMN data_vencimento TO validade;

-- Adicione índice para performance
CREATE INDEX idx_produtos_validade 
ON produtos(farmacia_id, validade) 
WHERE ativo = true AND validade IS NOT NULL;

-- Adicione dados de teste
INSERT INTO produtos (
    farmacia_id, 
    nome, 
    preco_venda, 
    estoque_atual, 
    validade, 
    ativo
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Dipirona 500mg - Teste',
    8.90,
    45,
    CURRENT_DATE + INTERVAL '30 days',
    true
);
```

### 4. Verificação
Após executar, teste:
```sql
SELECT nome, validade FROM produtos 
WHERE farmacia_id = '550e8400-e29b-41d4-a716-446655440000'
AND validade IS NOT NULL;
```

## Scripts Criados
- ✅ `database/fix-validade-column.sql` - Correção automática
- ✅ `database/check-produtos-schema.sql` - Verificação de schema

## Após a Correção
O dashboard mostrará produtos próximos do vencimento corretamente.