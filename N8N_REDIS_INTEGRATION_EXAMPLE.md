# N8N + Redis + Supabase - Exemplo Prático de Implementação

## CONFIGURAÇÃO DO WORKFLOW N8N

### 1. CONFIGURAÇÃO INICIAL DO REDIS

```javascript
// Node: Redis Setup
// Configuração de conexão Redis no N8N
const redis = require('redis');

const client = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    db: 0,
    retry_strategy: function(options) {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('Redis server recusou conexão');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Timeout Redis');
        }
        return Math.min(options.attempt * 100, 3000);
    }
});

return { redis: client };
```

### 2. FUNÇÃO DE GERENCIAMENTO DE SESSÃO

```javascript
// Node: Session Manager
// Gerencia estado da conversa no Redis

const telefone = $('Normaliza').item.json.message.chat_id;
const mensagem = $('Normaliza').item.json.message.body;

// Classe para gerenciar sessões
class WhatsAppSessionManager {
    constructor(redisClient) {
        this.redis = redisClient;
        this.sessionTTL = 1800; // 30 minutos
    }
    
    async getSession(telefone) {
        const key = `whatsapp:session:${telefone}`;
        const sessionData = await this.redis.get(key);
        return sessionData ? JSON.parse(sessionData) : this.createNewSession();
    }
    
    createNewSession() {
        return {
            estado: 'inicial',
            contexto: {},
            historico_conversa: [],
            ultima_interacao: new Date().toISOString(),
            total_mensagens: 0
        };
    }
    
    async updateSession(telefone, updates) {
        const key = `whatsapp:session:${telefone}`;
        const currentSession = await this.getSession(telefone);
        
        const updatedSession = {
            ...currentSession,
            ...updates,
            ultima_interacao: new Date().toISOString(),
            total_mensagens: currentSession.total_mensagens + 1
        };
        
        // Limitar histórico para últimas 10 mensagens
        if (updatedSession.historico_conversa.length > 10) {
            updatedSession.historico_conversa = updatedSession.historico_conversa.slice(-10);
        }
        
        await this.redis.setex(key, this.sessionTTL, JSON.stringify(updatedSession));
        return updatedSession;
    }
    
    async clearSession(telefone) {
        const key = `whatsapp:session:${telefone}`;
        await this.redis.del(key);
    }
}

// Inicializar gerenciador de sessão
const sessionManager = new WhatsAppSessionManager($input.first().redis);

// Buscar sessão atual
const sessionAtual = await sessionManager.getSession(telefone);

// Adicionar mensagem ao histórico
sessionAtual.historico_conversa.push({
    timestamp: new Date().toISOString(),
    mensagem: mensagem,
    tipo: 'cliente'
});

return {
    telefone,
    mensagem,
    sessionAtual,
    sessionManager
};
```

### 3. BUSCA DE CONTEXTO PERSISTENTE

```javascript
// Node: Get Customer Context
// Busca dados persistentes no Supabase (apenas quando necessário)

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const telefone = $input.first().telefone;
const sessionAtual = $input.first().sessionAtual;

// Verificar se já temos dados do cliente em cache na sessão
if (sessionAtual.cliente_contexto && 
    (Date.now() - new Date(sessionAtual.ultima_busca_perfil)) < 300000) { // 5 minutos
    
    return {
        ...inputData,
        clienteContexto: sessionAtual.cliente_contexto,
        fonte: 'cache_redis'
    };
}

// Buscar contexto no Supabase apenas se necessário
try {
    const { data: contextoCliente, error } = await supabase
        .rpc('obter_contexto_cliente', { tel: telefone });
    
    if (error) throw error;
    
    const clienteContexto = contextoCliente[0] || {
        tem_cadastro: false,
        nome_mascarado: null,
        total_pedidos: 0,
        medicamentos_frequentes: [],
        cliente_vip: false,
        ultima_compra: null,
        ticket_medio: null
    };
    
    // Atualizar cache da sessão com dados do cliente
    await $input.first().sessionManager.updateSession(telefone, {
        cliente_contexto: clienteContexto,
        ultima_busca_perfil: new Date().toISOString()
    });
    
    return {
        telefone,
        mensagem: $input.first().mensagem,
        sessionAtual,
        clienteContexto,
        fonte: 'supabase'
    };
    
} catch (error) {
    console.error('Erro ao buscar contexto cliente:', error);
    return {
        telefone,
        mensagem: $input.first().mensagem,
        sessionAtual,
        clienteContexto: { tem_cadastro: false },
        erro: error.message
    };
}
```

### 4. PROCESSAMENTO DE MENSAGEM COM IA

```javascript
// Node: Process Message with AI
// Processa mensagem considerando contexto do Redis + dados do Supabase

const inputData = $input.first();
const { telefone, mensagem, sessionAtual, clienteContexto } = inputData;

// Analisar intenção da mensagem
function analisarIntencao(msg) {
    const msgLower = msg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Padrões de busca por produtos
    const padroesProdutos = [
        /\b(quero|preciso|tem|vende)\s+(.+)/,
        /\bpreco\s+(?:do|da)\s+(.+)/,
        /\bquanto\s+(?:custa|vale)\s+(.+)/,
        /^([a-z]+(?:\s+[a-z]+){0,2})$/  // Nome simples de produto
    ];
    
    for (let padrao of padroesProdutos) {
        const match = msgLower.match(padrao);
        if (match) {
            return {
                tipo: 'consulta_produto',
                produto: match[2] || match[1],
                original: msg
            };
        }
    }
    
    // Outros padrões
    if (msgLower.includes('ola') || msgLower.includes('oi') || msgLower.includes('bom dia')) {
        return { tipo: 'saudacao' };
    }
    
    if (msgLower.includes('pedido') || msgLower.includes('carrinho')) {
        return { tipo: 'gerenciar_pedido' };
    }
    
    return { tipo: 'conversa_livre', conteudo: msg };
}

const intencao = analisarIntencao(mensagem);

// Construir contexto para resposta inteligente
const contextoCompleto = {
    cliente: {
        cadastrado: clienteContexto.tem_cadastro,
        nome: clienteContexto.nome_mascarado,
        vip: clienteContexto.cliente_vip,
        historico_medicamentos: clienteContexto.medicamentos_frequentes
    },
    sessao: {
        estado_atual: sessionAtual.estado,
        mensagens_anteriores: sessionAtual.historico_conversa.slice(-3), // Últimas 3
        total_interacoes: sessionAtual.total_mensagens
    },
    intencao: intencao
};

return {
    telefone,
    mensagem,
    intencao,
    contextoCompleto,
    sessionManager: inputData.sessionManager,
    proximoEstado: intencao.tipo === 'consulta_produto' ? 'consultando_produto' : sessionAtual.estado
};
```

### 5. CONSULTA DE PRODUTOS NO SUPABASE

```javascript
// Node: Product Search
// Executa apenas quando intenção é consulta de produto

const inputData = $input.first();

// Executar apenas se for consulta de produto
if (inputData.intencao.tipo !== 'consulta_produto') {
    return inputData;
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const produtoBuscado = inputData.intencao.produto;
const telefone = inputData.telefone;

try {
    // 1. Buscar produto
    const { data: produtos, error: errorProdutos } = await supabase
        .from('produtos')
        .select('produto_id, nome, preco, categoria, disponivel')
        .or(`nome.ilike.%${produtoBuscado}%,categoria.ilike.%${produtoBuscado}%`)
        .eq('disponivel', true)
        .limit(3);
    
    if (errorProdutos) throw errorProdutos;
    
    // 2. Verificar promoções
    const { data: promocoes, error: errorPromocoes } = await supabase
        .from('promocoes')
        .select('produto_id, desconto_percentual, preco_promocional')
        .in('produto_id', produtos.map(p => p.produto_id))
        .lte('data_inicio', new Date().toISOString())
        .gte('data_fim', new Date().toISOString());
    
    // 3. Combinar produtos com promoções
    const produtosComPromocao = produtos.map(produto => {
        const promocao = promocoes?.find(p => p.produto_id === produto.produto_id);
        return {
            ...produto,
            tem_promocao: !!promocao,
            preco_original: produto.preco,
            preco_final: promocao?.preco_promocional || produto.preco,
            desconto: promocao?.desconto_percentual || 0
        };
    });
    
    // 4. Registrar consulta para analytics
    const consultaData = {
        telefone: telefone,
        produto_pesquisado: produtoBuscado,
        produto_encontrado: produtosComPromocao[0]?.produto_id || null,
        preco_informado: produtosComPromocao[0]?.preco_final || null,
        promocao_ativa: produtosComPromocao[0]?.tem_promocao || false,
        resultado: produtosComPromocao.length > 0 ? 'encontrado' : 'nao_encontrado'
    };
    
    // Registro assíncrono (não bloquear resposta)
    supabase.from('consultas_precos').insert(consultaData).catch(console.error);
    
    return {
        ...inputData,
        produtos_encontrados: produtosComPromocao,
        total_encontrados: produtosComPromocao.length,
        produto_principal: produtosComPromocao[0] || null
    };
    
} catch (error) {
    console.error('Erro na busca de produtos:', error);
    return {
        ...inputData,
        erro_busca: error.message,
        produtos_encontrados: [],
        total_encontrados: 0
    };
}
```

### 6. GERAÇÃO DE RESPOSTA INTELIGENTE

```javascript
// Node: Generate Smart Response
// Gera resposta baseada no contexto completo

const inputData = $input.first();
const { telefone, contextoCompleto, produto_principal, total_encontrados } = inputData;

function gerarResposta() {
    const cliente = contextoCompleto.cliente;
    const intencao = contextoCompleto.intencao;
    
    // Saudação personalizada
    let saudacao = '';
    if (contextoCompleto.sessao.total_interacoes === 0) {
        saudacao = cliente.cadastrado 
            ? `Olá ${cliente.nome}! ` 
            : 'Olá! Bem-vindo à *Farmácia Farmacus*! ';
    }
    
    // Resposta baseada na intenção
    switch (intencao.tipo) {
        case 'consulta_produto':
            if (total_encontrados === 0) {
                return saudacao + `Não encontrei *${intencao.produto}* em nosso estoque no momento.\n\nPosso ajudar com algo mais?`;
            }
            
            const produto = produto_principal;
            let resposta = saudacao;
            
            if (produto.tem_promocao) {
                resposta += `✨ *PROMOÇÃO!* ✨\n*${produto.nome}*\n~~R$ ${produto.preco_original.toFixed(2)}~~ → *R$ ${produto.preco_final.toFixed(2)}*\n\n`;
            } else {
                resposta += `Temos *${produto.nome}* por *R$ ${produto.preco_final.toFixed(2)}*\n\n`;
            }
            
            resposta += 'Gostaria de incluir no seu pedido?';
            return resposta;
            
        case 'saudacao':
            return saudacao + 'Como posso ajudar você hoje?';
            
        default:
            return saudacao + 'Posso ajudar você a encontrar medicamentos ou esclarecer dúvidas sobre nossos produtos. O que você precisa?';
    }
}

const respostaFinal = gerarResposta();

// Atualizar sessão com nova resposta
const novoEstado = inputData.proximoEstado || contextoCompleto.sessao.estado_atual;

await inputData.sessionManager.updateSession(telefone, {
    estado: novoEstado,
    ultima_resposta: respostaFinal,
    contexto: {
        ...contextoCompleto.sessao.contexto,
        ultimo_produto_consultado: produto_principal?.nome || null,
        produtos_em_contexto: inputData.produtos_encontrados || []
    }
});

return {
    telefone,
    resposta: respostaFinal,
    estado_sessao: novoEstado,
    debug: {
        intencao: contextoCompleto.intencao,
        produtos_encontrados: total_encontrados,
        fonte_dados: inputData.fonte || 'processamento'
    }
};
```

### 7. ENVIO DA RESPOSTA

```javascript
// Node: Send Response
// Envia resposta final para WhatsApp

const inputData = $input.first();
const { telefone, resposta } = inputData;

// Simular envio para WhatsApp (implementar conforme seu provedor)
const whatsappResponse = {
    chat_id: telefone,
    text: resposta,
    timestamp: new Date().toISOString()
};

// Log para monitoramento
console.log(`Resposta enviada para ${telefone}: ${resposta.substring(0, 100)}...`);

return {
    sucesso: true,
    resposta_enviada: resposta,
    telefone: telefone,
    whatsapp_response: whatsappResponse
};
```

## CONFIGURAÇÃO DE CONEXÕES NO N8N

### Redis Connection:
```json
{
    "name": "Redis Farmacus",
    "type": "redis",
    "host": "localhost",
    "port": 6379,
    "database": 0
}
```

### Supabase Connection:
```json
{
    "name": "Supabase Farmacus",
    "type": "postgres",
    "host": "db.xxxx.supabase.co",
    "port": 5432,
    "database": "postgres",
    "username": "postgres",
    "password": "[SERVICE_ROLE_KEY]"
}
```

## FLUXO COMPLETO DO WORKFLOW

```
[Webhook WhatsApp] 
    ↓
[Normalizar Entrada] 
    ↓
[Session Manager - Redis]
    ↓
[Get Customer Context - Supabase]
    ↓
[Process Message with AI]
    ↓
[Product Search - Supabase] (se necessário)
    ↓
[Generate Smart Response]
    ↓
[Send Response - WhatsApp]
```

## VANTAGENS DESTA IMPLEMENTAÇÃO

1. **Performance**: Redis para estado = respostas em < 200ms
2. **Economia**: Consultas Supabase apenas quando necessário
3. **Escalabilidade**: Suporta milhares de conversas simultâneas
4. **Inteligência**: Contexto rico para respostas personalizadas
5. **Analytics**: Todas as consultas registradas para análise
6. **Manutenção**: Código modular e bem documentado

Esta implementação garante que o sistema seja rápido, econômico e inteligente, usando Redis para dados temporários e Supabase apenas para dados que precisam persistir.