# Integração EXA Search para Análise de Preços

## Resumo da Implementação

Implementei uma solução usando **EXA Search API**, que faz pesquisas inteligentes na internet para encontrar preços de medicamentos em farmácias online.

## O que foi implementado

### 1. Nova Classe ExaSearchAPI

**Arquivo**: `src/lib/external-price-apis.ts`

**Funcionalidades principais:**
- ✅ Pesquisa semântica usando EXA API
- ✅ Busca direcionada para domínios de farmácias conhecidas
- ✅ Extração automática de preços do conteúdo web
- ✅ Identificação automática de farmácias pelos domínios
- ✅ Fallback para dados mock quando API não disponível
- ✅ Cache inteligente para otimizar performance
- ✅ Timeout configurável para evitar travamentos

### 2. Domínios de Farmácias Incluídos

A busca é focada nos principais sites de farmácias brasileiras:
- Farmácia A (farmacia-a.example.com)
- Farmácia B (farmacia-b.example.com)
- Farmácia C (farmacia-c.example.com)
- Drogaria Central (drogaria-central.example.com)
- Farmácia Norte (farmacia-norte.example.com)
- Drogaria Sul (drogaria-sul.example.com)
- Farmácia Leste (farmacia-leste.example.com)
- Farmácia Oeste (farmacia-oeste.example.com)
- Farmácia Online (farmacia-online.example.com)

### 3. Algoritmo de Busca Inteligente

**Query Otimizada:**
```javascript
`preço ${medicamento} farmácia online ${estadoNome} Brasil comprar valor`
```

**Processamento dos Resultados:**
1. Extração automática de preços com regex brasileira (R$ formato)
2. Identificação de farmácias por domínio e título
3. Validação de preços (faixa de R$ 1,00 a R$ 1.000,00)
4. Geração de dados alternativos quando preços não encontrados

### 4. Configuração Atualizada

**`.env.local`:**
```env
# API EXA para Pesquisa de Precos na Internet
EXA_API_KEY=your_exa_api_key_here

# Configuracoes das APIs
USE_MOCK_DATA=false
NEXT_PUBLIC_USE_MOCK_DATA=false
API_TIMEOUT=15000
MAX_RESULTS_PER_API=8
```

### 5. Interface Atualizada

- ✅ Badge "EXA Search" para identificar resultados da nova API
- ✅ Ícone roxo para distinguir EXA dos outros tipos
- ✅ Compatibilidade total com sistema de mock/real

## Como Usar

### 1. Obter API Key do EXA

1. Acesse: https://dashboard.exa.ai/api-keys
2. Crie uma conta gratuita
3. Gere uma API key
4. Adicione no `.env.local`:
   ```env
   EXA_API_KEY=sua_api_key_aqui
   ```

### 2. Testar a Implementação

```bash
# Teste básico
node scripts/test-exa-search.js

# Ou através da interface web
npm run dev
# Acesse o analisador de preços e teste com "Dipirona"
```

### 3. Modo de Operação

**Com API Key configurada:**
- Faz busca real na internet via EXA
- Extrai preços de sites de farmácias
- Retorna URLs dos produtos encontrados

**Sem API Key ou modo mock:**
- Usa dados simulados realistas
- Mantém funcionalidade completa
- Ideal para desenvolvimento/demo

## Vantagens da Nova Implementação

### 🔍 **Busca Inteligente**
- Pesquisa semântica mais precisa que APIs específicas
- Encontra preços em tempo real de múltiplas fontes
- Adaptável a novos sites de farmácias automaticamente

### 🌐 **Cobertura Ampla**
- Não limitado a APIs específicas de farmácias
- Busca em toda internet, focando em domínios relevantes
- Maior probabilidade de encontrar preços atualizados

### 💡 **Inteligência de Extração**
- Regex avançada para preços brasileiros
- Identificação automática de farmácias
- Validação de dados extraídos

### ⚡ **Performance**
- Cache inteligente
- Timeout configurável
- Fallback robusto para dados mock

### 🔧 **Manutenibilidade**
- Código mais limpo e focado
- Menos dependências de APIs externas
- Fácil de expandir para novos domínios

## Estrutura do Resultado

```typescript
interface ExternalPrice {
  farmacia: string        // Nome da farmácia identificada
  preco: number          // Preço extraído (R$)
  disponivel: boolean    // Sempre true para EXA results
  estado: string         // Estado pesquisado
  fonte: 'exa_search'    // Identificador da fonte
  url?: string           // URL do produto encontrado
}
```

## Exemplo de Uso

```javascript
import { ExaSearchAPI } from './external-price-apis'

const exaApi = new ExaSearchAPI()

// Busca com dados reais
const precos = await exaApi.search('Dipirona 500mg', 'SP')

// Resultado esperado:
[
  {
    farmacia: "Farmácia A",
    preco: 12.50,
    disponivel: true,
    estado: "SP", 
    fonte: "exa_search",
    url: "https://www.farmacia-a.example.com/dipirona-500mg"
  },
  // ... mais resultados
]
```

## Debug e Logs

O sistema inclui logs detalhados:
- ✅ Cache hits/misses
- ✅ Número de resultados encontrados
- ✅ Erros de parsing e extração
- ✅ Fallbacks para dados mock

## Estado Atual

- ✅ **Implementação completa** da ExaSearchAPI
- ✅ **Interface atualizada** com badges e ícones
- ✅ **Configuração simplificada** (apenas EXA_API_KEY)
- ✅ **Testes funcionais** disponíveis
- ✅ **Fallback robusto** para dados mock
- ✅ **Cache implementado** para performance
- ⚠️ **Requer API key** do EXA para dados reais
- ✅ **Compatível** com sistema existente

A nova implementação oferece maior flexibilidade, inteligência e cobertura para análise de preços de medicamentos.