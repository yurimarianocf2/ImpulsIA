# 🔧 CORREÇÕES PARA ANALISADOR DE PREÇOS

## 🚨 Problemas Identificados

### 1. **Esquema Desatualizado no Supabase**
- ❌ Sistema usa esquema ANTIGO (`produtos`, `analises_preco`)
- ❌ Código atualizado para esquema NOVO (`medicamentos`, `analises_preco_consolidada`)
- ❌ Views consolidadas não existem (`v_medicamentos_vencendo`)

### 2. **Dados Inventados (Mock)**
- ⚠️ Analisador usa dados MOCK quando não encontra produto real
- ⚠️ Usuário vê preços fictícios sem saber que são mock
- ⚠️ Não há indicação visual de que são dados de teste

### 3. **Inconsistência de Tabelas**
- 📊 **API medicamentos vencendo**: Busca `v_medicamentos_vencendo` (novo)
- 📊 **Price Analyzer**: Busca `produtos` (antigo)
- 📊 **Salvar análise**: Salva em `analises_preco` (antigo)

## 🎯 Correções Prioritárias

### ✅ **CORREÇÃO 1: Aplicar Esquema Consolidado**

**Status**: 🔴 CRÍTICO - Deve ser feito PRIMEIRO

**Ação**: Aplicar scripts SQL no Supabase Dashboard:

1. **Executar no Supabase SQL Editor**:
```sql
-- 1. Aplicar schema consolidado
-- (Copiar conteúdo de database/schema-consolidado.sql)

-- 2. Migrar dados existentes  
-- (Copiar conteúdo de database/aplicar-esquema-consolidado.sql)
```

**Resultado Esperado**:
- ✅ Tabela `medicamentos` criada
- ✅ View `v_medicamentos_vencendo` funcionando
- ✅ Dados migrados da tabela `produtos`

### ✅ **CORREÇÃO 2: Atualizar Price Analyzer para Novo Schema**

**Arquivo**: `src/lib/price-analyzer.ts`

**Linhas a alterar**:
```typescript
// ANTES (linha 52-59):
const { data, error } = await supabase
  .from('produtos')  // ❌ Tabela antiga
  .select('*')
  .eq('farmacia_id', this.farmaciaId)

// DEPOIS:
const { data, error } = await supabase
  .from('medicamentos')  // ✅ Tabela nova
  .select('*')
  .eq('farmacia_id', this.farmaciaId)
```

```typescript
// ANTES (linha 224-236):
await supabase
  .from('analises_preco')  // ❌ Tabela antiga
  .insert({

// DEPOIS:
await supabase
  .from('analises_preco_consolidada')  // ✅ Tabela nova
  .insert({
    medicamento_id: analise.produto_local?.id,  // ✅ Campo atualizado
    // ... outros campos
```

### ✅ **CORREÇÃO 3: Indicador Visual de Dados Mock**

**Arquivo**: `src/components/price-analyzer-component.tsx`

**Adicionar alerta quando usar mock**:
```tsx
{result.isMockData && (
  <Alert className="bg-yellow-950/20 border-yellow-800/30 mb-4">
    <AlertTriangle className="h-4 w-4 text-yellow-400" />
    <AlertDescription className="text-yellow-200">
      ⚠️ <strong>Dados de Demonstração</strong>: Este produto não foi encontrado 
      no seu estoque. Os dados mostrados são fictícios para demonstração.
    </AlertDescription>
  </Alert>
)}
```

### ✅ **CORREÇÃO 4: Validação de Dados Reais**

**Adicionar flag para indicar origem dos dados**:
```typescript
interface PriceAnalysis {
  produto_local: Product | null
  precos_externos: ExternalPrice[]
  preco_medio_mercado: number
  posicao_competitiva: 'abaixo' | 'medio' | 'acima'
  recomendacao: string
  margem_atual: number
  isMockData: boolean  // ✅ Nova flag
  dataSource: 'database' | 'mock' | 'fallback'  // ✅ Origem dos dados
}
```

## 📋 Script de Correção Automática

Vou criar um script para aplicar todas as correções:

### Passo 1: Backup Atual
```bash
# Fazer backup antes das mudanças
cp src/lib/price-analyzer.ts src/lib/price-analyzer.ts.backup
```

### Passo 2: Aplicar Schema no Supabase
```sql
-- Execute no Supabase Dashboard > SQL Editor
-- 1. Copiar conteúdo de database/schema-consolidado.sql
-- 2. Copiar conteúdo de database/aplicar-esquema-consolidado.sql
```

### Passo 3: Atualizar Código
```bash
# Aplicar correções automaticamente
node scripts/fix-price-analyzer.js
```

## 🧪 Teste Após Correções

### Verificar se funcionou:
1. **Dashboard carrega sem erros** ✅
2. **Medicamentos vencendo aparecem** ✅  
3. **Busca por Dipirona encontra produto real** ✅
4. **Não mostra mais dados mock** ✅
5. **Preços externos continuam funcionando** ✅

### Logs esperados:
```
✅ Produto encontrado no banco: Dipirona 500mg
✅ EXA encontrou 4 resultados para Dipirona 500mg  
✅ Análise salva em analises_preco_consolidada
```

## 🎯 Resultado Final

### ANTES:
- ❌ Dados inventados (mock)
- ❌ Tabelas não existem
- ❌ Erros 500 no dashboard
- ❌ Usuário não sabe que são dados falsos

### DEPOIS:
- ✅ Dados reais do estoque
- ✅ Schema consolidado funcionando
- ✅ Dashboard sem erros
- ✅ Indicação clara de origem dos dados
- ✅ Preços externos reais da EXA API

---

**🔥 AÇÃO IMEDIATA**: Aplicar o esquema consolidado no Supabase é CRÍTICO para resolver todos os problemas identificados.