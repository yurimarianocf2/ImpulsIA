# Diagrama Visual da Arquitetura WhatsApp + Redis + Supabase

## VISÃO GERAL DO SISTEMA

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA FARMÁCIA WHATSAPP                   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FLUXO DE DADOS                            │
│                                                                 │
│  [WhatsApp] → [N8N] → [Redis + Supabase] → [N8N] → [WhatsApp] │
│     ▲              ▲        ▲         ▲              ▲           │
│     │              │        │         │              │           │
│  Mensagem       Orquestra   │    Dados Negócio   Resposta       │
│  Cliente        Lógica      │                    Inteligente    │
│                            │                                    │
│                      Dados Temporários                         │
└─────────────────────────────────────────────────────────────────┘
```

## ARQUITETURA DETALHADA

```
┌───────────────┐
│   WHATSAPP    │
│               │
│ 📱 Cliente    │
│ envia mensagem│
└───────┬───────┘
        │ 1. Mensagem: "quero dipirona"
        ▼
┌───────────────┐
│     N8N       │
│               │
│ 🤖 Recebe     │
│ e processa    │
└───────┬───────┘
        │ 2. Busca estado da conversa
        ▼
┌───────────────┐    ┌─────────────────────────────────────────┐
│    REDIS      │    │               SUPABASE                  │
│               │    │                                         │
│ ⚡ Temporário │    │ 💾 Permanente                          │
│ (30min TTL)   │    │                                         │
│               │    │                                         │
│ Dados:        │    │ Tabelas:                               │
│ • Estado conv.│    │ • clientes (cadastro)                  │
│ • Contexto    │    │ • produtos (catálogo)                  │  
│ • Histórico   │    │ • pedidos (vendas)                     │
│ • Cache       │    │ • cliente_perfil (comportamento)       │
│               │    │ • consultas_precos (analytics)         │
└───────┬───────┘    └───────────────┬─────────────────────────┘
        │ 3. Se cliente conhecido,   │ 4. Buscar dados do cliente
        │    busca dados persistentes │    e produto consultado
        ▼                            ▼
┌───────────────┐
│     N8N       │
│               │
│ 🧠 Inteligência│
│ • Analisa contexto
│ • Monta resposta
│ • Atualiza estados
└───────┬───────┘
        │ 5. Resposta: "Dipirona 500mg por R$ 8,90"
        ▼
┌───────────────┐
│   WHATSAPP    │
│               │
│ 📱 Cliente    │
│ recebe resposta│
└───────────────┘
```

## DIVISÃO DE RESPONSABILIDADES DETALHADA

### 🚀 REDIS (Dados Temporários - Velocidade)

```
┌─────────────────────────────────────────┐
│              REDIS STORE                │
├─────────────────────────────────────────┤
│                                         │
│ Key: whatsapp:session:5511940005678     │
│ TTL: 1800 segundos (30 minutos)        │
│ Value: {                               │
│   "estado": "consultando_produto",     │
│   "contexto": {                        │
│     "produtos_vistos": ["dipirona"],   │
│     "carrinho_temp": [],               │
│     "step": "confirmando"              │
│   },                                   │
│   "historico_conversa": [              │
│     {                                  │
│       "timestamp": "14:30:15",         │
│       "mensagem": "oi",                │
│       "resposta": "Olá! Como posso..."│
│     },                                 │
│     {                                  │
│       "timestamp": "14:31:20",         │
│       "mensagem": "quero dipirona",    │
│       "resposta": "Dipirona 500mg..." │
│     }                                  │
│   ],                                   │
│   "cliente_cache": {                   │
│     "nome": "João M****",              │
│     "vip": true,                       │
│     "cache_valido_ate": "14:45:00"     │
│   },                                   │
│   "ultima_interacao": "2024-01-15T14:31:20Z"│
│ }                                      │
└─────────────────────────────────────────┘
        ▲                        ▲
        │                        │
   ⚡ < 1ms                 🔄 Auto-expire
   Acesso                   Limpa sozinho
```

### 💾 SUPABASE (Dados Persistentes - Negócio)

```
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE TABLES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 📊 CLIENTES                     📦 PRODUTOS                     │
│ ┌─────────────────────┐        ┌──────────────────────┐         │
│ │ cliente_id (UUID)   │        │ produto_id (UUID)    │         │
│ │ nome: "João Silva"  │        │ nome: "Dipirona 500mg"│         │
│ │ telefone: "5511..." │        │ preco: 8.90          │         │
│ │ endereco: "Rua..."  │        │ categoria: "Analgésico"│       │
│ └─────────────────────┘        └──────────────────────┘         │
│                                                                 │
│ 🛒 PEDIDOS                      👤 CLIENTE_PERFIL               │
│ ┌─────────────────────┐        ┌──────────────────────┐         │
│ │ id (UUID)           │        │ cliente_id (FK)      │         │
│ │ cliente_id (FK)     │        │ medicamentos_freq.:  │         │
│ │ total: 25.70        │        │ ["dipirona", "dorflex"]│        │
│ │ status: "entregue"  │        │ cliente_vip: true    │         │
│ │ data: "2024-01-10"  │        │ ticket_medio: 32.50  │         │
│ └─────────────────────┘        │ total_pedidos: 15    │         │
│                                │ ultima_compra: "2024-01-10"│   │
│ 📈 CONSULTAS_PRECOS            └──────────────────────┘         │
│ ┌─────────────────────┐                                        │
│ │ id (UUID)           │        🎯 ANALYTICS & RELATÓRIOS:      │
│ │ telefone: "5511..." │        • Produtos mais consultados     │
│ │ produto_pesquisado: │        • Taxa de conversão            │
│ │ "dipirona"          │        • Padrões de comportamento     │
│ │ levou_ao_pedido: true│        • Segmentação de clientes     │
│ │ timestamp: NOW()    │                                        │
│ └─────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
        ▲                                            ▲
        │                                            │
   🔒 Seguro & Confiável                        📊 Consultas Complexas
   Dados nunca perdem                           JOINs, Relatórios
```

## COMPARAÇÃO: ANTES vs DEPOIS

### ❌ ARQUITETURA ANTERIOR (Problemática)

```
N8N → SUPABASE (para tudo)
     ├── sessoes_whatsapp (REDUNDANTE ❌)
     ├── cliente_perfil (ok ✅)
     └── consultas_precos (ok ✅)

Problemas:
• Lenta (50-100ms por consulta)
• Cara (conta como rows no Supabase)
• Complexa (dados temporários no BD)
• Não escalável (muitas escritas)
```

### ✅ ARQUITETURA NOVA (Otimizada)

```
N8N → REDIS (temporário) + SUPABASE (persistente)
Redis:                    Supabase:
├── Estado conversa       ├── clientes ✅
├── Cache temporário      ├── produtos ✅
├── Histórico sessão      ├── pedidos ✅
└── TTL automático        ├── cliente_perfil ✅
                         └── consultas_precos ✅

Vantagens:
• Rápida (< 1ms Redis + consultas otimizadas)
• Econômica (menos rows no Supabase)
• Escalável (Redis suporta milhões de ops/seg)
• Simples (cada sistema faz o que faz melhor)
```

## FLUXO DE DADOS STEP-BY-STEP VISUAL

```
1. CHEGADA DA MENSAGEM
┌─────────┐    📱 "quero dipirona"
│WhatsApp │ ──────────────────────────▶ ┌─────┐
└─────────┘                             │ N8N │
                                        └─────┘

2. BUSCA ESTADO ATUAL (REDIS)
┌─────┐    GET session:5511940005678    ┌───────┐
│ N8N │ ──────────────────────────────▶│ Redis │
└─────┘◀───────────────────────────────│       │
      {"estado": "inicial", ...}       └───────┘

3. BUSCA DADOS CLIENTE (SUPABASE - se necessário)
┌─────┐    SELECT * FROM clientes       ┌─────────┐
│ N8N │ ──────────────────────────────▶│Supabase │
└─────┘◀───────────────────────────────│         │
      {"nome": "João", "vip": true}    └─────────┘

4. BUSCA PRODUTO (SUPABASE)
┌─────┐    SELECT * FROM produtos       ┌─────────┐
│ N8N │ ──────────────────────────────▶│Supabase │
└─────┘◀───────────────────────────────│         │
      {"dipirona 500mg": 8.90}         └─────────┘

5. REGISTRA CONSULTA (SUPABASE - async)
┌─────┐    INSERT consultas_precos      ┌─────────┐
│ N8N │ ──────────────────────────────▶│Supabase │
└─────┘                                └─────────┘

6. ATUALIZA ESTADO (REDIS)
┌─────┐    SET session:5511... TTL      ┌───────┐
│ N8N │ ──────────────────────────────▶│ Redis │
└─────┘    {"estado": "produto_encontrado"} └───────┘

7. RESPOSTA INTELIGENTE
┌─────┐    📱 "Dipirona 500mg por R$ 8,90"   ┌─────────┐
│ N8N │ ──────────────────────────────────▶│WhatsApp │
└─────┘                                     └─────────┘
```

## MÉTRICAS DE PERFORMANCE ESPERADAS

### ⚡ REDIS (Temporário)
- **Latência**: < 1ms
- **Throughput**: 100k+ ops/segundo
- **Memória**: ~1KB por sessão ativa
- **TTL**: 30 minutos (limpeza automática)

### 💾 SUPABASE (Persistente)
- **Latência**: 10-50ms (queries otimizadas)
- **Throughput**: 1k+ queries/segundo
- **Armazenamento**: Cresce com dados reais
- **Backup**: Automático e versionado

### 🎯 RESULTADO FINAL
- **Resposta total**: < 200ms (95% dos casos)
- **Economia**: ~60% redução custos Supabase
- **Escalabilidade**: Milhares de conversas simultâneas
- **Confiabilidade**: 99.9% uptime

Esta arquitetura garante que o sistema seja rápido para o usuário, econômico para a farmácia e escalável para o futuro!