# AGENT N8N INTEGRATION

This file provides specialized guidance for Claude Code when working on n8n workflows and integrations for the Farmácia Chatbot project.

## n8n Responsibilities
- Orquestração de fluxos de automação
- Integração entre WhatsApp, Supabase e APIs externas
- Processamento de mensagens em tempo real
- Automações de negócio (estoque, preços, notificações)
- Workflows de backup e monitoramento
- Integrações com sistemas da farmácia

## n8n Setup & Configuration

### 1. Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - NODE_ENV=production
      - WEBHOOK_URL=${N8N_WEBHOOK_URL}
      - GENERIC_TIMEZONE=${TIMEZONE}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=${SUPABASE_HOST}
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=${SUPABASE_USER}
      - DB_POSTGRESDB_PASSWORD=${SUPABASE_PASSWORD}
    volumes:
      - n8n_data:/home/node/.n8n
      - ./n8n/workflows:/home/node/.n8n/workflows
    depends_on:
      - supabase
    restart: unless-stopped

  supabase:
    image: supabase/postgres:15.1.0.117
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: ${SUPABASE_PASSWORD}
    volumes:
      - supabase_data:/var/lib/postgresql/data

volumes:
  n8n_data:
  supabase_data:
```

### 2. Environment Variables
```bash
# .env for n8n
N8N_HOST=localhost
N8N_WEBHOOK_URL=http://localhost:5678/webhook
N8N_ENCRYPTION_KEY=your-32-character-encryption-key
TIMEZONE=America/Sao_Paulo

# Supabase connection
SUPABASE_HOST=localhost
SUPABASE_USER=postgres
SUPABASE_PASSWORD=your-password

# WhatsApp Business API
WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token

# External APIs
CLIQUEFARMA_API_KEY=your-api-key
CONSULTAREMEDIOS_API_KEY=your-api-key
ANVISA_API_KEY=your-api-key
```

## Core Workflows

### 1. WhatsApp Message Processing Workflow

**Workflow Name**: `whatsapp-message-processor`

**Trigger**: Webhook `/webhook/whatsapp-message`

**Workflow JSON**:
```json
{
  "name": "WhatsApp Message Processor",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "whatsapp-message",
        "responseMode": "onReceived"
      },
      "name": "WhatsApp Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "functionCode": "// Extract and validate message data\nconst { from, text, timestamp } = $input.first().json;\n\nif (!from || !text) {\n  throw new Error('Invalid message format');\n}\n\n// Clean phone number\nconst cleanPhone = from.replace(/\\D/g, '');\n\n// Extract message content\nconst messageText = text.body || text;\n\nreturn {\n  phone: cleanPhone,\n  message: messageText,\n  timestamp: timestamp || new Date().toISOString(),\n  originalData: $input.first().json\n};"
      },
      "name": "Process Message Data",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [460, 300]
    },
    {
      "parameters": {
        "operation": "select",
        "table": "conversas",
        "where": {
          "conditions": [
            {
              "column": "telefone",
              "operation": "=",
              "value": "={{$json[\"phone\"]}}"
            }
          ]
        }
      },
      "name": "Find Existing Conversation",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [680, 300]
    },
    {
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{$json.length > 0}}",
              "value2": true
            }
          ]
        }
      },
      "name": "Conversation Exists?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [900, 300]
    },
    {
      "parameters": {
        "operation": "insert",
        "table": "conversas",
        "records": {
          "telefone": "={{$('Process Message Data').first().json.phone}}",
          "status": "ativo"
        }
      },
      "name": "Create New Conversation",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [1120, 400]
    },
    {
      "parameters": {
        "operation": "insert",
        "table": "mensagens",
        "records": {
          "conversa_id": "={{$('Find Existing Conversation').first().json.id || $('Create New Conversation').first().json.id}}",
          "tipo": "recebida",
          "conteudo": "={{$('Process Message Data').first().json.message}}",
          "metadata": "={{JSON.stringify($('Process Message Data').first().json.originalData)}}"
        }
      },
      "name": "Save Message",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [1340, 300]
    },
    {
      "parameters": {
        "functionCode": "// Classify message intent\nconst message = $('Process Message Data').first().json.message.toLowerCase();\n\n// Intent classification patterns\nconst intents = {\n  price_query: /(preço|preco|quanto custa|valor|custo)\\s+(.+)/,\n  product_info: /(informação|informacao|bula|para que serve)\\s+(.+)/,\n  order: /(comprar|pedido|quero|reservar)/,\n  greeting: /(ola|olá|oi|bom dia|boa tarde|boa noite)/,\n  help: /(ajuda|help|menu|opções|opcoes)/,\n  human: /(atendente|humano|pessoa|farmaceutico|farmacêutico)/\n};\n\nlet intent = 'unknown';\nlet entities = {};\n\nfor (const [intentName, pattern] of Object.entries(intents)) {\n  const match = message.match(pattern);\n  if (match) {\n    intent = intentName;\n    if (match[2]) {\n      entities.product = match[2].trim();\n    }\n    break;\n  }\n}\n\nreturn {\n  intent,\n  entities,\n  message: $('Process Message Data').first().json.message,\n  phone: $('Process Message Data').first().json.phone,\n  conversationId: $('Find Existing Conversation').first().json.id || $('Create New Conversation').first().json.id\n};"
      },
      "name": "Classify Intent",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [1560, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json[\"intent\"]}}",
              "value2": "price_query"
            }
          ]
        }
      },
      "name": "Route by Intent",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 1,
      "position": [1780, 300]
    }
  ],
  "connections": {
    "WhatsApp Webhook": {
      "main": [
        [
          {
            "node": "Process Message Data",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Process Message Data": {
      "main": [
        [
          {
            "node": "Find Existing Conversation",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Find Existing Conversation": {
      "main": [
        [
          {
            "node": "Conversation Exists?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Conversation Exists?": {
      "main": [
        [
          {
            "node": "Save Message",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Create New Conversation",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Create New Conversation": {
      "main": [
        [
          {
            "node": "Save Message",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Save Message": {
      "main": [
        [
          {
            "node": "Classify Intent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Classify Intent": {
      "main": [
        [
          {
            "node": "Route by Intent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
}
```

### 2. Price Query Workflow

**Workflow Name**: `price-query-processor`

**Key Nodes**:

**A. Product Search in Supabase**
```json
{
  "parameters": {
    "operation": "select",
    "table": "produtos",
    "where": {
      "conditions": [
        {
          "column": "nome",
          "operation": "ilike",
          "value": "=%{{$json.entities.product}}%"
        }
      ]
    },
    "options": {
      "limit": 5
    }
  },
  "name": "Search Products",
  "type": "n8n-nodes-base.supabase"
}
```

**B. External Price Comparison**
```json
{
  "parameters": {
    "requestMethod": "GET",
    "url": "=https://api.cliquefarma.com.br/search?q={{encodeURIComponent($json.entities.product)}}",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "httpHeaderAuth": {
      "name": "Authorization",
      "value": "=Bearer {{$credentials.CliqueFarmaAPI.apiKey}}"
    }
  },
  "name": "Compare External Prices",
  "type": "n8n-nodes-base.httpRequest"
}
```

**C. Format Response**
```javascript
// Function node code
const localProducts = $('Search Products').all();
const externalPrices = $('Compare External Prices').first().json;

let response = `🔍 *Resultados para: ${$json.entities.product}*\n\n`;

// Local products
if (localProducts.length > 0) {
  response += "📍 *Nossa Farmácia:*\n";
  localProducts.forEach(product => {
    response += `• ${product.json.nome} - R$ ${product.json.preco_venda.toFixed(2)}\n`;
    if (product.json.estoque_atual > 0) {
      response += `  ✅ Disponível (${product.json.estoque_atual} unidades)\n`;
    } else {
      response += "  ❌ Fora de estoque\n";
    }
  });
  response += "\n";
}

// External comparison
if (externalPrices && externalPrices.results) {
  response += "🏪 *Outras farmácias:*\n";
  externalPrices.results.slice(0, 3).forEach(item => {
    response += `• ${item.name} - R$ ${item.price}\n`;
    response += `  📍 ${item.pharmacy}\n`;
  });
  response += "\n";
}

response += "💬 *Posso ajudar com algo mais?*\n";
response += "1️⃣ Reservar produto\n";
response += "2️⃣ Ver mais informações\n";
response += "3️⃣ Buscar outro medicamento\n";
response += "4️⃣ Falar com farmacêutico";

return {
  phone: $json.phone,
  response: response,
  conversationId: $json.conversationId
};
```

**D. Send WhatsApp Response**
```json
{
  "parameters": {
    "requestMethod": "POST",
    "url": "=https://graph.facebook.com/v18.0/{{$credentials.WhatsAppAPI.phoneId}}/messages",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "httpHeaderAuth": {
      "name": "Authorization",
      "value": "=Bearer {{$credentials.WhatsAppAPI.accessToken}}"
    },
    "sendBody": true,
    "bodyContentType": "json",
    "jsonBody": "={\n  \"messaging_product\": \"whatsapp\",\n  \"to\": \"{{$json.phone}}\",\n  \"text\": {\n    \"body\": \"{{$json.response}}\"\n  }\n}"
  },
  "name": "Send WhatsApp Response",
  "type": "n8n-nodes-base.httpRequest"
}
```

### 3. Stock Alert Workflow

**Workflow Name**: `stock-alert-system`

**Trigger**: Database trigger ou Cron job (daily at 9 AM)

**Key Components**:

**A. Check Low Stock Products**
```sql
-- Custom SQL query in Supabase node
SELECT 
  id,
  nome,
  estoque_atual,
  estoque_minimo,
  categoria,
  preco_venda
FROM produtos 
WHERE estoque_atual <= estoque_minimo 
AND ativo = true
ORDER BY estoque_atual ASC;
```

**B. Format Alert Message**
```javascript
// Function node
const lowStockProducts = $input.all();

if (lowStockProducts.length === 0) {
  return { skip: true };
}

let message = "⚠️ *ALERTA DE ESTOQUE BAIXO*\n\n";
message += `${lowStockProducts.length} produto(s) precisam de atenção:\n\n`;

lowStockProducts.forEach((product, index) => {
  const p = product.json;
  message += `${index + 1}. *${p.nome}*\n`;
  message += `   Estoque: ${p.estoque_atual} unidades\n`;
  message += `   Mínimo: ${p.estoque_minimo} unidades\n`;
  message += `   Categoria: ${p.categoria}\n\n`;
});

message += "📋 *Ações recomendadas:*\n";
message += "• Verificar fornecedores\n";
message += "• Fazer pedido de reposição\n";
message += "• Considerar promoção para produtos parados\n\n";
message += "Acesse o dashboard para mais detalhes.";

return {
  message: message,
  productCount: lowStockProducts.length,
  products: lowStockProducts.map(p => p.json)
};
```

**C. Send to Pharmacist WhatsApp**
```json
{
  "parameters": {
    "requestMethod": "POST",
    "url": "=https://graph.facebook.com/v18.0/{{$credentials.WhatsAppAPI.phoneId}}/messages",
    "sendBody": true,
    "bodyContentType": "json",
    "jsonBody": "={\n  \"messaging_product\": \"whatsapp\",\n  \"to\": \"{{$credentials.PharmacistPhone.number}}\",\n  \"text\": {\n    \"body\": \"{{$json.message}}\"\n  }\n}"
  },
  "name": "Alert Pharmacist",
  "type": "n8n-nodes-base.httpRequest"
}
```

### 4. Price Update Workflow

**Workflow Name**: `price-update-automation`

**Schedule**: Daily at 6 AM

**Process**:

**A. Fetch CMED Prices**
```javascript
// Function to fetch CMED data
const axios = require('axios');

// Get all active products
const products = $('Get Active Products').all();
const updatedPrices = [];

for (const product of products) {
  try {
    // Simulate CMED API call
    const response = await axios.get(`https://api.anvisa.gov.br/cmed/produto/${product.json.registro_anvisa}`);
    
    if (response.data && response.data.pmc) {
      updatedPrices.push({
        productId: product.json.id,
        currentPrice: product.json.pmc_maximo,
        newPrice: response.data.pmc,
        productName: product.json.nome
      });
    }
  } catch (error) {
    console.log(`Error fetching price for ${product.json.nome}:`, error.message);
  }
}

return updatedPrices;
```

**B. Update Prices in Database**
```json
{
  "parameters": {
    "operation": "update",
    "table": "produtos",
    "updateKey": "id",
    "columnsUi": {
      "column": [
        {
          "column": "pmc_maximo",
          "keyValue": "={{$json.newPrice}}"
        },
        {
          "column": "updated_at",
          "keyValue": "=NOW()"
        }
      ]
    },
    "where": {
      "conditions": [
        {
          "column": "id",
          "operation": "=",
          "value": "={{$json.productId}}"
        }
      ]
    }
  },
  "name": "Update Product Price",
  "type": "n8n-nodes-base.supabase"
}
```

## Advanced Workflows

### 1. Customer Segmentation Workflow

**Purpose**: Automatically segment customers based on behavior

```javascript
// Customer segmentation logic
const customers = $('Get All Customers').all();
const segments = {
  vip: [],
  regular: [],
  new: [],
  inactive: []
};

customers.forEach(customer => {
  const c = customer.json;
  const daysSinceLastOrder = (new Date() - new Date(c.last_order_date)) / (1000 * 60 * 60 * 24);
  
  if (c.total_orders > 20 && c.total_spent > 1000) {
    segments.vip.push(c);
  } else if (daysSinceLastOrder > 90) {
    segments.inactive.push(c);
  } else if (c.total_orders < 3) {
    segments.new.push(c);
  } else {
    segments.regular.push(c);
  }
});

return segments;
```

### 2. Automated Marketing Campaigns

**A. Birthday Campaign**
```sql
-- Find customers with birthday today
SELECT 
  id,
  nome,
  telefone,
  data_nascimento
FROM clientes 
WHERE EXTRACT(MONTH FROM data_nascimento) = EXTRACT(MONTH FROM CURRENT_DATE)
AND EXTRACT(DAY FROM data_nascimento) = EXTRACT(DAY FROM CURRENT_DATE);
```

**B. Birthday Message**
```javascript
const birthdayMessage = `🎉 *Parabéns, ${customer.nome}!*

Hoje é o seu dia especial e temos um presente para você:

🎁 *20% de desconto* em qualquer compra
Válido até o final do mês!

Código: ANIVER20

Como podemos tornar seu dia ainda melhor? 
Que tal consultar algum medicamento?

Farmácia [Nome] - Cuidando de você sempre! 💊`;
```

### 3. Inventory Integration Workflow

**Purpose**: Sync with pharmacy management system

```javascript
// Integration with pharmacy system
const syncInventory = async () => {
  // Fetch from pharmacy system API
  const pharmacyData = await $httpRequest({
    method: 'GET',
    url: 'https://pharmacy-system.com/api/products',
    headers: {
      'Authorization': 'Bearer ' + $credentials.PharmacySystem.token
    }
  });
  
  // Update Supabase
  for (const item of pharmacyData.products) {
    await $supabase.from('produtos').upsert({
      codigo_barras: item.barcode,
      nome: item.name,
      estoque_atual: item.stock,
      preco_venda: item.price,
      updated_at: new Date().toISOString()
    });
  }
  
  return { synced: pharmacyData.products.length };
};
```

## Error Handling & Monitoring

### 1. Error Handling Patterns

```javascript
// Robust error handling in function nodes
try {
  const result = await processMessage(input);
  return result;
} catch (error) {
  // Log error
  console.error('Message processing failed:', error);
  
  // Send fallback response
  await sendWhatsAppMessage(phone, 
    "Desculpe, ocorreu um problema. Por favor, tente novamente ou fale com nosso atendente."
  );
  
  // Alert administrators
  await sendAdminAlert({
    type: 'processing_error',
    message: error.message,
    phone: phone,
    timestamp: new Date().toISOString()
  });
  
  throw error; // Re-throw to mark workflow as failed
}
```

### 2. Monitoring Workflow

**A. Health Check Endpoint**
```json
{
  "parameters": {
    "httpMethod": "GET",
    "path": "health",
    "responseMode": "onReceived",
    "responseData": "={\n  \"status\": \"ok\",\n  \"timestamp\": \"{{new Date().toISOString()}}\",\n  \"version\": \"1.0.0\"\n}"
  },
  "name": "Health Check",
  "type": "n8n-nodes-base.webhook"
}
```

**B. Performance Metrics**
```javascript
// Collect workflow performance metrics
const metrics = {
  timestamp: new Date().toISOString(),
  workflow_name: $workflow.name,
  execution_time: $execution.executionTime,
  success: $execution.finished,
  error_count: $execution.error ? 1 : 0,
  message_count: $('WhatsApp Webhook').length,
  response_time: Date.now() - $execution.startedAt
};

// Send to monitoring system
await $httpRequest({
  method: 'POST',
  url: 'https://monitoring.farmacia.com/metrics',
  json: metrics
});
```

## Testing n8n Workflows

### 1. Unit Testing with Mock Data

```javascript
// Test data generator
const generateTestMessage = (intent = 'price_query', product = 'Dipirona') => {
  return {
    from: '5511999999999',
    text: {
      body: intent === 'price_query' ? `Quanto custa ${product}?` : 'Olá'
    },
    timestamp: new Date().toISOString()
  };
};

// Test workflow execution
const testResults = [];

// Test price query
const priceQueryTest = await $workflow.execute('price-query-processor', {
  data: generateTestMessage('price_query', 'Paracetamol')
});

testResults.push({
  test: 'price_query',
  success: priceQueryTest.finished,
  response_time: priceQueryTest.executionTime
});
```

### 2. Integration Testing

```bash
#!/bin/bash
# Integration test script

# Test webhook endpoint
curl -X POST http://localhost:5678/webhook/whatsapp-message \
  -H "Content-Type: application/json" \
  -d '{
    "from": "5511999999999",
    "text": {"body": "Quanto custa Dipirona?"},
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }'

# Verify response in database
sleep 2
echo "Checking if message was processed..."

# Query Supabase to verify message was saved
curl -X GET "${SUPABASE_URL}/rest/v1/mensagens" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Range: 0-0" \
  -G -d "order=created_at.desc"
```

## Deployment & Scaling

### 1. Production Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=${N8N_HOST}
      - N8N_PROTOCOL=https
      - N8N_SSL_KEY=/certs/privkey.pem
      - N8N_SSL_CERT=/certs/fullchain.pem
      - WEBHOOK_URL=https://${N8N_HOST}/webhook
      - N8N_LOG_LEVEL=info
      - N8N_METRICS=true
    volumes:
      - n8n_data:/home/node/.n8n
      - ./certs:/certs:ro
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 2. Load Balancing

```nginx
# nginx.conf
upstream n8n_backend {
    server n8n_1:5678;
    server n8n_2:5678;
}

server {
    listen 443 ssl;
    server_name n8n.farmacia.com;
    
    location / {
        proxy_pass http://n8n_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Common n8n Patterns

### 1. Retry Logic
```javascript
// Exponential backoff retry
const maxRetries = 3;
let attempt = 0;

while (attempt < maxRetries) {
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    attempt++;
    if (attempt >= maxRetries) throw error;
    
    const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

### 2. Rate Limiting
```javascript
// Simple rate limiting
const rateLimiter = {
  requests: new Map(),
  limit: 10, // requests per minute
  window: 60000 // 1 minute
};

const phone = $json.phone;
const now = Date.now();
const requests = rateLimiter.requests.get(phone) || [];

// Clean old requests
const validRequests = requests.filter(time => now - time < rateLimiter.window);

if (validRequests.length >= rateLimiter.limit) {
  throw new Error('Rate limit exceeded');
}

validRequests.push(now);
rateLimiter.requests.set(phone, validRequests);
```

### 3. Data Validation
```javascript
// Input validation with Joi-like structure
const validateMessage = (data) => {
  const schema = {
    from: { type: 'string', required: true, pattern: /^\d{10,15}$/ },
    text: { type: 'object', required: true },
    timestamp: { type: 'string', required: false }
  };
  
  for (const [key, rules] of Object.entries(schema)) {
    if (rules.required && !data[key]) {
      throw new Error(`Missing required field: ${key}`);
    }
    
    if (data[key] && rules.pattern && !rules.pattern.test(data[key])) {
      throw new Error(`Invalid format for field: ${key}`);
    }
  }
  
  return true;
};
```

## Common Commands

```bash
# Start n8n in development
npm run dev

# Export workflows
n8n export:workflow --backup --output=./backups/

# Import workflows
n8n import:workflow --input=./workflows/

# Execute workflow manually
n8n execute --id=1

# List all workflows
n8n list:workflow

# Database operations
n8n db:revert
n8n db:migrate

# Clear execution data
n8n db:prune

# Health check
curl http://localhost:5678/healthz
```

This comprehensive guide covers all aspects of n8n integration for the pharmacy chatbot project, from basic setup to advanced workflows and monitoring.

## 📊 Observability & Metrics

### Prometheus Metrics Integration
```javascript
// n8n-custom-nodes/prometheus-metrics.js
const promClient = require('prom-client');

// Create metrics
const workflowExecutionCounter = new promClient.Counter({
  name: 'n8n_workflow_executions_total',
  help: 'Total number of workflow executions',
  labelNames: ['workflow_name', 'status']
});

const workflowDurationHistogram = new promClient.Histogram({
  name: 'n8n_workflow_duration_seconds',
  help: 'Workflow execution duration in seconds',
  labelNames: ['workflow_name'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
});

const messageProcessingGauge = new promClient.Gauge({
  name: 'n8n_messages_processing',
  help: 'Current number of messages being processed',
  labelNames: ['type']
});

// Custom metrics node
module.exports = {
  description: 'Collect and expose metrics',
  execute: async function() {
    const workflowName = this.getWorkflow().name;
    const startTime = Date.now();
    
    try {
      // Your workflow logic here
      const result = await processWorkflow();
      
      // Record success
      workflowExecutionCounter.inc({ 
        workflow_name: workflowName, 
        status: 'success' 
      });
      
      return result;
    } catch (error) {
      // Record failure
      workflowExecutionCounter.inc({ 
        workflow_name: workflowName, 
        status: 'error' 
      });
      throw error;
    } finally {
      // Record duration
      const duration = (Date.now() - startTime) / 1000;
      workflowDurationHistogram.observe(
        { workflow_name: workflowName }, 
        duration
      );
    }
  }
};
```

### Grafana Dashboard Configuration
```json
{
  "dashboard": {
    "title": "FarmaBot n8n Monitoring",
    "panels": [
      {
        "title": "Workflow Executions Rate",
        "targets": [{
          "expr": "rate(n8n_workflow_executions_total[5m])"
        }]
      },
      {
        "title": "Workflow Success Rate",
        "targets": [{
          "expr": "rate(n8n_workflow_executions_total{status='success'}[5m]) / rate(n8n_workflow_executions_total[5m]) * 100"
        }]
      },
      {
        "title": "Message Processing Time",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(n8n_workflow_duration_seconds_bucket{workflow_name='whatsapp-message-processor'}[5m]))"
        }]
      },
      {
        "title": "Active Conversations",
        "targets": [{
          "expr": "n8n_messages_processing{type='whatsapp'}"
        }]
      }
    ]
  }
}
```

## 🔍 Distributed Tracing

### OpenTelemetry Integration
```javascript
// n8n-custom-nodes/tracing-node.js
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');
const tracer = trace.getTracer('n8n-workflows', '1.0.0');

module.exports = {
  displayName: 'Trace Workflow',
  name: 'traceWorkflow',
  group: ['transform'],
  version: 1,
  description: 'Add distributed tracing to workflows',
  defaults: {
    name: 'Trace',
  },
  inputs: ['main'],
  outputs: ['main'],
  properties: [
    {
      displayName: 'Operation Name',
      name: 'operationName',
      type: 'string',
      default: 'workflow-operation',
    }
  ],
  
  async execute() {
    const items = this.getInputData();
    const operationName = this.getNodeParameter('operationName', 0);
    
    // Start a new span
    const span = tracer.startSpan(operationName);
    
    try {
      // Add span attributes
      span.setAttributes({
        'workflow.name': this.getWorkflow().name,
        'workflow.id': this.getWorkflow().id,
        'node.name': this.getNode().name,
        'items.count': items.length
      });
      
      // Process items with context
      const result = await context.with(
        trace.setSpan(context.active(), span),
        async () => {
          // Your processing logic here
          return this.helpers.returnJsonArray(items);
        }
      );
      
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
      
    } catch (error) {
      span.recordException(error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      throw error;
    } finally {
      span.end();
    }
  }
};
```

### Jaeger Configuration
```yaml
# docker-compose.yml addition
jaeger:
  image: jaegertracing/all-in-one:latest
  ports:
    - "16686:16686"  # Jaeger UI
    - "14268:14268"  # Accept jaeger.thrift
  environment:
    - COLLECTOR_ZIPKIN_HOST_PORT=:9411
```

## 📝 Structured Logging

### Custom Logging Node
```javascript
// n8n-custom-nodes/structured-logger.js
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

// Configure logger
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: { 
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200' 
      },
      index: 'n8n-logs'
    })
  ]
});

module.exports = {
  displayName: 'Structured Logger',
  name: 'structuredLogger',
  group: ['transform'],
  version: 1,
  description: 'Log structured data for analysis',
  defaults: {
    name: 'Logger',
  },
  inputs: ['main'],
  outputs: ['main'],
  properties: [
    {
      displayName: 'Log Level',
      name: 'level',
      type: 'options',
      options: [
        { name: 'Debug', value: 'debug' },
        { name: 'Info', value: 'info' },
        { name: 'Warning', value: 'warn' },
        { name: 'Error', value: 'error' }
      ],
      default: 'info',
    },
    {
      displayName: 'Log Context',
      name: 'context',
      type: 'json',
      default: '{}',
    }
  ],
  
  async execute() {
    const items = this.getInputData();
    const level = this.getNodeParameter('level', 0);
    const context = this.getNodeParameter('context', 0);
    
    // Log each item with context
    items.forEach((item, index) => {
      logger[level]({
        workflow: this.getWorkflow().name,
        node: this.getNode().name,
        execution_id: this.getExecutionId(),
        item_index: index,
        data: item.json,
        context: typeof context === 'string' ? JSON.parse(context) : context,
        timestamp: new Date().toISOString()
      });
    });
    
    return this.helpers.returnJsonArray(items);
  }
};
```

## 🤖 AI Integration Workflows

### GPT-4 Integration for Complex Queries
```json
{
  "name": "AI-Enhanced Price Query",
  "nodes": [
    {
      "parameters": {
        "functionCode": "// Extract intent and entities using GPT-4\nconst openai = require('openai');\nconst client = new openai.OpenAI({ apiKey: $credentials.openai.apiKey });\n\nconst userMessage = $json.message;\n\nconst systemPrompt = `Você é um assistente de farmácia. Extraia a intenção e entidades da mensagem do cliente.\nRetorne um JSON com:\n- intent: price_query|product_info|order|general\n- products: array de produtos mencionados\n- attributes: dosagem, quantidade, etc.`;\n\ntry {\n  const response = await client.chat.completions.create({\n    model: 'gpt-4',\n    messages: [\n      { role: 'system', content: systemPrompt },\n      { role: 'user', content: userMessage }\n    ],\n    response_format: { type: 'json_object' }\n  });\n  \n  const analysis = JSON.parse(response.choices[0].message.content);\n  \n  return {\n    ...analysis,\n    original_message: userMessage,\n    confidence: 0.95\n  };\n} catch (error) {\n  // Fallback to regex patterns\n  return {\n    intent: 'unknown',\n    products: [],\n    original_message: userMessage,\n    confidence: 0.3,\n    error: error.message\n  };\n}"
      },
      "name": "AI Intent Classification",
      "type": "n8n-nodes-base.function",
      "position": [1000, 300]
    },
    {
      "parameters": {
        "functionCode": "// Generate natural response using context\nconst products = $('Search Products').all();\nconst intent = $json.intent;\nconst customerHistory = $('Get Customer History').first().json;\n\nconst contextPrompt = `\nCliente: ${customerHistory.nome || 'Cliente'}\nHistórico: ${customerHistory.total_pedidos || 0} pedidos\nÚltima compra: ${customerHistory.ultima_compra || 'Primeira vez'}\n\nProdutos encontrados:\n${products.map(p => `- ${p.json.nome}: R$ ${p.json.preco_venda}`).join('\\n')}\n\nGere uma resposta personalizada e empática para o cliente.`;\n\nconst response = await generateAIResponse(contextPrompt);\n\nreturn {\n  message: response,\n  personalized: true,\n  context_used: {\n    customer_segment: customerHistory.segmento,\n    products_count: products.length\n  }\n};"
      },
      "name": "AI Response Generator",
      "type": "n8n-nodes-base.function",
      "position": [1600, 300]
    }
  ]
}
```

### Semantic Search Enhancement
```javascript
// Custom node for semantic product search
const { PineconeClient } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');

module.exports = {
  displayName: 'Semantic Product Search',
  name: 'semanticProductSearch',
  group: ['transform'],
  version: 1,
  description: 'Search products using semantic similarity',
  
  credentials: [
    {
      name: 'pineconeApi',
      required: true,
    },
    {
      name: 'openAiApi',
      required: true,
    }
  ],
  
  properties: [
    {
      displayName: 'Search Query',
      name: 'query',
      type: 'string',
      default: '',
      required: true,
    },
    {
      displayName: 'Max Results',
      name: 'maxResults',
      type: 'number',
      default: 10,
    }
  ],
  
  async execute() {
    const query = this.getNodeParameter('query', 0);
    const maxResults = this.getNodeParameter('maxResults', 0);
    
    // Get embeddings for query
    const openai = new OpenAI({ 
      apiKey: this.getCredentials('openAiApi').apiKey 
    });
    
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Search in Pinecone
    const pinecone = new PineconeClient();
    await pinecone.init({
      apiKey: this.getCredentials('pineconeApi').apiKey,
      environment: 'us-east1-gcp'
    });
    
    const index = pinecone.Index('pharmacy-products');
    const searchResponse = await index.query({
      vector: queryEmbedding,
      topK: maxResults,
      includeMetadata: true,
    });
    
    // Format results
    const results = searchResponse.matches.map(match => ({
      product_id: match.id,
      score: match.score,
      ...match.metadata
    }));
    
    return this.helpers.returnJsonArray(results);
  }
};
```

## 🔄 Advanced Error Handling

### Dead Letter Queue Implementation
```json
{
  "name": "Error Handler with DLQ",
  "nodes": [
    {
      "parameters": {
        "functionCode": "// Implement exponential backoff retry\nconst maxRetries = 3;\nconst retryCount = $json.retry_count || 0;\n\nif (retryCount >= maxRetries) {\n  // Send to dead letter queue\n  await sendToDeadLetterQueue({\n    original_data: $json,\n    error: $json.error,\n    workflow: $workflow.name,\n    timestamp: new Date().toISOString(),\n    retry_count: retryCount\n  });\n  \n  // Alert administrators\n  await notifyAdmins({\n    type: 'workflow_failure',\n    workflow: $workflow.name,\n    error: $json.error,\n    data: $json\n  });\n  \n  throw new Error('Max retries exceeded - sent to DLQ');\n}\n\n// Calculate delay with exponential backoff\nconst delay = Math.pow(2, retryCount) * 1000;\nawait new Promise(resolve => setTimeout(resolve, delay));\n\n// Increment retry count\nreturn {\n  ...$json,\n  retry_count: retryCount + 1,\n  last_retry: new Date().toISOString()\n};"
      },
      "name": "Retry with Backoff",
      "type": "n8n-nodes-base.function"
    },
    {
      "parameters": {
        "operation": "insert",
        "table": "dead_letter_queue",
        "columns": "workflow_name,error_message,payload,created_at,retry_count",
        "values": "={{$json.workflow}},={{$json.error}},={{JSON.stringify($json.original_data)}},={{$json.timestamp}},={{$json.retry_count}}"
      },
      "name": "Save to DLQ",
      "type": "n8n-nodes-base.supabase"
    }
  ]
}
```

## 🎯 Performance Optimization

### Parallel Processing Pattern
```javascript
// Custom node for parallel batch processing
module.exports = {
  displayName: 'Parallel Batch Processor',
  name: 'parallelBatchProcessor',
  group: ['transform'],
  version: 1,
  description: 'Process items in parallel batches',
  
  properties: [
    {
      displayName: 'Batch Size',
      name: 'batchSize',
      type: 'number',
      default: 10,
    },
    {
      displayName: 'Max Concurrent',
      name: 'maxConcurrent',
      type: 'number',
      default: 5,
    }
  ],
  
  async execute() {
    const items = this.getInputData();
    const batchSize = this.getNodeParameter('batchSize', 0);
    const maxConcurrent = this.getNodeParameter('maxConcurrent', 0);
    
    // Create batches
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    // Process batches with concurrency control
    const results = [];
    const queue = [...batches];
    const processing = new Set();
    
    while (queue.length > 0 || processing.size > 0) {
      // Start new batch if under limit
      while (processing.size < maxConcurrent && queue.length > 0) {
        const batch = queue.shift();
        const promise = this.processBatch(batch)
          .then(result => {
            results.push(...result);
            processing.delete(promise);
          })
          .catch(error => {
            console.error('Batch processing error:', error);
            processing.delete(promise);
          });
        
        processing.add(promise);
      }
      
      // Wait for at least one to complete
      if (processing.size > 0) {
        await Promise.race(processing);
      }
    }
    
    return this.helpers.returnJsonArray(results);
  },
  
  async processBatch(batch) {
    // Process batch items
    return batch.map(item => ({
      ...item.json,
      processed_at: new Date().toISOString(),
      batch_size: batch.length
    }));
  }
};
```

### Caching Strategy
```javascript
// Redis caching node
module.exports = {
  displayName: 'Redis Cache',
  name: 'redisCache',
  group: ['transform'],
  version: 1,
  description: 'Cache workflow data in Redis',
  
  properties: [
    {
      displayName: 'Operation',
      name: 'operation',
      type: 'options',
      options: [
        { name: 'Get', value: 'get' },
        { name: 'Set', value: 'set' },
        { name: 'Delete', value: 'delete' }
      ],
      default: 'get',
    },
    {
      displayName: 'Key',
      name: 'key',
      type: 'string',
      default: '',
    },
    {
      displayName: 'TTL (seconds)',
      name: 'ttl',
      type: 'number',
      default: 300,
      displayOptions: {
        show: {
          operation: ['set']
        }
      }
    }
  ],
  
  async execute() {
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });
    
    const operation = this.getNodeParameter('operation', 0);
    const key = this.getNodeParameter('key', 0);
    
    try {
      switch (operation) {
        case 'get':
          const cached = await redis.get(key);
          if (cached) {
            return this.helpers.returnJsonArray([{
              cached: true,
              data: JSON.parse(cached),
              key
            }]);
          }
          return this.helpers.returnJsonArray([{
            cached: false,
            key
          }]);
          
        case 'set':
          const items = this.getInputData();
          const ttl = this.getNodeParameter('ttl', 0);
          await redis.setex(key, ttl, JSON.stringify(items[0].json));
          return this.helpers.returnJsonArray([{
            cached: true,
            key,
            ttl
          }]);
          
        case 'delete':
          await redis.del(key);
          return this.helpers.returnJsonArray([{
            deleted: true,
            key
          }]);
      }
    } finally {
      redis.disconnect();
    }
  }
};
```

## 📈 Analytics Integration

### Custom Analytics Workflow
```json
{
  "name": "Real-time Analytics Pipeline",
  "nodes": [
    {
      "parameters": {
        "functionCode": "// Aggregate metrics for dashboard\nconst metrics = {\n  timestamp: new Date().toISOString(),\n  hour: new Date().getHours(),\n  metrics: {\n    messages_processed: await getMessageCount(),\n    average_response_time: await getAvgResponseTime(),\n    active_conversations: await getActiveConversations(),\n    conversion_rate: await getConversionRate(),\n    popular_products: await getPopularProducts(),\n    customer_satisfaction: await getSatisfactionScore()\n  }\n};\n\n// Send to analytics platforms\nawait Promise.all([\n  sendToMixpanel(metrics),\n  sendToAmplitude(metrics),\n  updateSupabaseDashboard(metrics)\n]);\n\nreturn metrics;"
      },
      "name": "Aggregate Analytics",
      "type": "n8n-nodes-base.function"
    },
    {
      "parameters": {
        "url": "https://api.mixpanel.com/track",
        "method": "POST",
        "authentication": "genericCredentialType",
        "sendBody": true,
        "bodyContentType": "json",
        "jsonBody": "={\"event\": \"workflow_metrics\", \"properties\": {{$json}}}"
      },
      "name": "Send to Mixpanel",
      "type": "n8n-nodes-base.httpRequest"
    }
  ]
}
```

## 🔐 Security Enhancements

### API Key Rotation Workflow
```json
{
  "name": "Automated API Key Rotation",
  "nodes": [
    {
      "parameters": {
        "rule": "0 0 * * 0", // Every Sunday at midnight
        "timezone": "America/Sao_Paulo"
      },
      "name": "Weekly Trigger",
      "type": "n8n-nodes-base.scheduleTrigger"
    },
    {
      "parameters": {
        "functionCode": "// Generate new API keys\nconst crypto = require('crypto');\n\nconst services = ['whatsapp', 'supabase', 'cliquefarma', 'anvisa'];\nconst newKeys = {};\n\nfor (const service of services) {\n  // Generate new key\n  const newKey = crypto.randomBytes(32).toString('hex');\n  \n  // Update in secure vault\n  await updateVault(service, newKey);\n  \n  // Schedule key deployment\n  newKeys[service] = {\n    key: newKey,\n    rotation_date: new Date().toISOString(),\n    previous_key: await getOldKey(service)\n  };\n}\n\n// Keep old keys for 24h grace period\nsetTimeout(async () => {\n  for (const service of services) {\n    await removeOldKey(service);\n  }\n}, 24 * 60 * 60 * 1000);\n\nreturn newKeys;"
      },
      "name": "Rotate Keys",
      "type": "n8n-nodes-base.function"
    }
  ]
}
```

## 🚀 Deployment Best Practices

### Blue-Green Deployment for n8n
```yaml
# k8s/n8n-blue-green.yaml
apiVersion: v1
kind: Service
metadata:
  name: n8n-service
spec:
  selector:
    app: n8n
    version: green  # Switch between blue/green
  ports:
    - port: 5678
      targetPort: 5678
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: n8n-blue
spec:
  replicas: 2
  selector:
    matchLabels:
      app: n8n
      version: blue
  template:
    metadata:
      labels:
        app: n8n
        version: blue
    spec:
      containers:
      - name: n8n
        image: n8nio/n8n:0.234.0
        env:
        - name: N8N_METRICS
          value: "true"
        - name: N8N_METRICS_PREFIX
          value: "n8n_"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: n8n-green
spec:
  replicas: 2
  selector:
    matchLabels:
      app: n8n
      version: green
  template:
    metadata:
      labels:
        app: n8n
        version: green
    spec:
      containers:
      - name: n8n
        image: n8nio/n8n:0.235.0  # New version
```

### Workflow Version Control
```bash
#!/bin/bash
# backup-workflows.sh

# Export all workflows
n8n export:workflow --all --output=./workflows/export_$(date +%Y%m%d_%H%M%S).json

# Commit to git
git add ./workflows/
git commit -m "Backup workflows - $(date)"
git push origin main

# Tag stable versions
git tag -a "v$(date +%Y%m%d)" -m "Stable workflow version"
git push origin --tags
```