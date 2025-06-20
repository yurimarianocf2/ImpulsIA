# AGENT BACKEND

This file provides specialized guidance for Claude Code when working on backend development for the Farmácia Chatbot project.

## Backend Responsibilities
- API de integração com WhatsApp Business
- Gerenciamento do banco de dados Supabase
- Integração com APIs externas (ANVISA, CliqueFarma, etc.)
- Autenticação e autorização
- Processamento de webhooks
- Sincronização de dados em tempo real

## Tech Stack Backend
- **Database**: Supabase (PostgreSQL)
- **API Framework**: Node.js + Express/Fastify
- **ORM**: Supabase JavaScript Client
- **Authentication**: Supabase Auth
- **Webhooks**: Express middleware
- **Queue System**: Bull/BullMQ
- **Validation**: Zod
- **HTTP Client**: Axios

## Database Schema (Supabase)

### Core Tables
```sql
-- Produtos
CREATE TABLE produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_barras VARCHAR(14) UNIQUE,
    nome VARCHAR(255) NOT NULL,
    principio_ativo VARCHAR(255),
    laboratorio VARCHAR(100),
    categoria VARCHAR(50),
    dosagem VARCHAR(50),
    apresentacao VARCHAR(100),
    registro_anvisa VARCHAR(20),
    pmc_maximo DECIMAL(10,2),
    preco_venda DECIMAL(10,2),
    preco_custo DECIMAL(10,2),
    estoque_atual INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 5,
    data_vencimento DATE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Clientes
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(100),
    cpf VARCHAR(14),
    email VARCHAR(100),
    data_nascimento DATE,
    endereco JSONB,
    medicamentos_uso JSONB,
    preferencias JSONB,
    pontos_fidelidade INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversas
CREATE TABLE conversas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id),
    telefone VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'ativo',
    contexto JSONB,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Mensagens
CREATE TABLE mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id UUID REFERENCES conversas(id),
    tipo VARCHAR(20) NOT NULL, -- 'enviada' | 'recebida'
    conteudo TEXT NOT NULL,
    metadata JSONB,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pedidos
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id),
    status VARCHAR(20) DEFAULT 'pendente',
    itens JSONB NOT NULL,
    subtotal DECIMAL(10,2),
    desconto DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2),
    forma_pagamento VARCHAR(50),
    tipo_entrega VARCHAR(20),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_produtos_nome ON produtos USING gin(to_tsvector('portuguese', nome));
CREATE INDEX idx_produtos_codigo_barras ON produtos(codigo_barras);
CREATE INDEX idx_clientes_telefone ON clientes(telefone);
CREATE INDEX idx_mensagens_conversa ON mensagens(conversa_id);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
```

### Database Functions
```sql
-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar aos triggers
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar estoque baixo
CREATE OR REPLACE FUNCTION check_estoque_baixo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estoque_atual <= NEW.estoque_minimo THEN
        INSERT INTO notificacoes (tipo, produto_id, mensagem, created_at)
        VALUES ('estoque_baixo', NEW.id, 
                'Produto ' || NEW.nome || ' com estoque baixo: ' || NEW.estoque_atual,
                NOW());
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- View para dashboard
CREATE VIEW vendas_dashboard AS
SELECT 
    DATE(p.created_at) as data,
    COUNT(*) as total_pedidos,
    SUM(p.total) as faturamento,
    AVG(p.total) as ticket_medio
FROM pedidos p 
WHERE p.status = 'finalizado'
GROUP BY DATE(p.created_at)
ORDER BY data DESC;
```

## API Structure

### WhatsApp Webhook Handler
```typescript
// src/routes/whatsapp.ts
import express from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { processWhatsAppMessage } from '../services/whatsapp';

const router = express.Router();

const whatsappMessageSchema = z.object({
  object: z.string(),
  entry: z.array(z.object({
    changes: z.array(z.object({
      value: z.object({
        messages: z.array(z.object({
          from: z.string(),
          text: z.object({
            body: z.string()
          }),
          timestamp: z.string()
        })).optional()
      })
    }))
  }))
});

// Webhook verification
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Receive messages
router.post('/webhook', async (req, res) => {
  try {
    const data = whatsappMessageSchema.parse(req.body);
    
    for (const entry of data.entry) {
      for (const change of entry.changes) {
        if (change.value.messages) {
          for (const message of change.value.messages) {
            await processWhatsAppMessage(message);
          }
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send('Bad Request');
  }
});

export default router;
```

### WhatsApp Service
```typescript
// src/services/whatsapp.ts
import axios from 'axios';
import { supabase } from '../lib/supabase';

interface WhatsAppMessage {
  from: string;
  text: { body: string };
  timestamp: string;
}

export async function processWhatsAppMessage(message: WhatsAppMessage) {
  const { from, text, timestamp } = message;
  
  // 1. Salvar mensagem no banco
  const { data: conversa } = await supabase
    .from('conversas')
    .select('id')
    .eq('telefone', from)
    .single();
  
  let conversaId = conversa?.id;
  
  if (!conversaId) {
    // Criar nova conversa
    const { data: novaConversa } = await supabase
      .from('conversas')
      .insert({ telefone: from })
      .select('id')
      .single();
    conversaId = novaConversa?.id;
  }
  
  // Salvar mensagem
  await supabase
    .from('mensagens')
    .insert({
      conversa_id: conversaId,
      tipo: 'recebida',
      conteudo: text.body,
      metadata: { timestamp }
    });
  
  // 2. Processar mensagem (enviar para n8n)
  await axios.post(`${process.env.N8N_WEBHOOK_URL}/whatsapp-message`, {
    from,
    text: text.body,
    conversaId,
    timestamp
  });
}

export async function sendWhatsAppMessage(to: string, message: string) {
  const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
  
  const response = await axios.post(url, {
    messaging_product: 'whatsapp',
    to,
    text: { body: message }
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data;
}
```

## External APIs Integration

### ANVISA/CMED Integration
```typescript
// src/services/anvisa.ts
import axios from 'axios';
import { z } from 'zod';

const cmedSchema = z.object({
  produto: z.string(),
  laboratorio: z.string(),
  pmc: z.number(),
  pmvg: z.number()
});

export async function consultarCMED(produto: string) {
  try {
    const response = await axios.get(
      `https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos`,
      { params: { produto } }
    );
    
    // Parse XML/Excel response and convert to JSON
    const data = parseAnvisaResponse(response.data);
    return cmedSchema.array().parse(data);
  } catch (error) {
    console.error('Erro ao consultar CMED:', error);
    return [];
  }
}

function parseAnvisaResponse(data: any) {
  // Implementation to parse ANVISA XML/Excel format
  return [];
}
```

### CliqueFarma Integration
```typescript
// src/services/cliquefarma.ts
export async function consultarCliqueFarma(medicamento: string) {
  const response = await axios.get(
    `https://api.cliquefarma.com.br/search`,
    { 
      params: { q: medicamento },
      headers: { 'Authorization': `Bearer ${process.env.CLIQUEFARMA_API_KEY}` }
    }
  );
  
  return response.data.results.map((item: any) => ({
    produto: item.name,
    preco: item.price,
    farmacia: item.pharmacy,
    disponivel: item.available
  }));
}
```

## Background Jobs

### Queue Configuration
```typescript
// src/lib/queue.ts
import Bull from 'bull';

export const messageQueue = new Bull('message processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
});

export const priceUpdateQueue = new Bull('price updates', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
});

// Process jobs
messageQueue.process('process-message', async (job) => {
  const { message, conversaId } = job.data;
  
  // Process message logic
  await processMessageWithAI(message, conversaId);
});

priceUpdateQueue.process('update-prices', async (job) => {
  const { productIds } = job.data;
  
  // Update prices from external APIs
  await updateProductPrices(productIds);
});
```

## Authentication & Security

### Supabase Auth
```typescript
// src/middleware/auth.ts
import { supabase } from '../lib/supabase';

export async function authenticateUser(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = user;
  next();
}
```

### Data Encryption
```typescript
// src/lib/encryption.ts
import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const secretKey = process.env.ENCRYPTION_KEY || '';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, secretKey);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipher(algorithm, secretKey);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

## Real-time Features

### Supabase Realtime
```typescript
// src/services/realtime.ts
import { supabase } from '../lib/supabase';

export function setupRealtimeSubscriptions() {
  // Listen to new messages
  supabase
    .channel('mensagens')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'mensagens'
    }, (payload) => {
      console.log('Nova mensagem:', payload.new);
      // Broadcast to connected clients
    })
    .subscribe();
  
  // Listen to stock changes
  supabase
    .channel('produtos')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'produtos'
    }, (payload) => {
      console.log('Produto atualizado:', payload.new);
      // Update dashboard in real-time
    })
    .subscribe();
}
```

## Common Operations

### Product Management
```typescript
// src/services/products.ts
export async function createProduct(productData: any) {
  const { data, error } = await supabase
    .from('produtos')
    .insert(productData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateProductStock(productId: string, quantity: number) {
  const { data, error } = await supabase
    .from('produtos')
    .update({ estoque_atual: quantity })
    .eq('id', productId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function searchProducts(query: string) {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .textSearch('nome', query)
    .limit(10);
  
  if (error) throw error;
  return data;
}
```

## Error Handling

### Global Error Handler
```typescript
// src/middleware/errorHandler.ts
export function errorHandler(error: any, req: any, res: any, next: any) {
  console.error('Error:', error);
  
  if (error.code === 'PGRST116') {
    return res.status(404).json({ error: 'Resource not found' });
  }
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: error.message });
  }
  
  res.status(500).json({ error: 'Internal server error' });
}
```

## Testing

### Unit Tests
```typescript
// src/tests/services/whatsapp.test.ts
import { processWhatsAppMessage } from '../../services/whatsapp';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');

describe('WhatsApp Service', () => {
  it('should process message correctly', async () => {
    const mockMessage = {
      from: '5511999999999',
      text: { body: 'Olá' },
      timestamp: '1234567890'
    };
    
    await processWhatsAppMessage(mockMessage);
    
    expect(supabase.from).toHaveBeenCalledWith('mensagens');
  });
});
```

## Deployment

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Environment Variables
```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# WhatsApp
WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_VERIFY_TOKEN=your-verify-token

# n8n
N8N_WEBHOOK_URL=http://n8n:5678/webhook

# External APIs
CLIQUEFARMA_API_KEY=your-api-key
ANVISA_API_KEY=your-api-key

# Security
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET=your-jwt-secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Common Commands
```bash
# Development
npm run dev                 # Run in development mode
npm run build              # Build for production
npm run start              # Start production server
npm run test               # Run tests
npm run test:watch         # Run tests in watch mode

# Database
npm run db:migrate         # Run database migrations
npm run db:seed            # Seed database with test data
npm run db:reset           # Reset database

# Queue
npm run queue:start        # Start queue workers
npm run queue:clear        # Clear all queues
```

## 🏗️ Microservices Architecture

### Service Decomposition
```typescript
// services/
├── gateway-service/        # API Gateway (Kong/Express Gateway)
├── auth-service/          # Authentication & Authorization
├── product-service/       # Product catalog & inventory
├── chat-service/          # WhatsApp messaging
├── order-service/         # Order processing
├── analytics-service/     # Analytics & reporting
├── notification-service/  # Push notifications & alerts
└── integration-service/   # External API integrations
```

### Service Communication
```typescript
// src/lib/service-mesh.ts
import { createClient } from '@buf/pharmacybot_api.grpc_web';
import { CircuitBreaker } from 'opossum';

export class ServiceMesh {
  private breakers = new Map<string, CircuitBreaker>();
  
  async callService<T>(
    serviceName: string,
    method: string,
    payload: any
  ): Promise<T> {
    const breaker = this.getBreaker(serviceName);
    
    return breaker.fire(async () => {
      // Service discovery
      const endpoint = await this.discoverService(serviceName);
      
      // Call with retry logic
      return this.callWithRetry(endpoint, method, payload);
    });
  }
  
  private getBreaker(serviceName: string): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker(
        this.serviceCall.bind(this),
        {
          timeout: 3000,
          errorThresholdPercentage: 50,
          resetTimeout: 30000
        }
      ));
    }
    return this.breakers.get(serviceName)!;
  }
}
```

## 📊 Event-Driven Architecture

### Event Bus Implementation
```typescript
// src/events/event-bus.ts
import { EventEmitter } from 'events';
import { Redis } from 'ioredis';

export interface DomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  timestamp: Date;
  data: any;
  metadata?: any;
}

export class EventBus {
  private localEmitter = new EventEmitter();
  private redis: Redis;
  private subscribers = new Map<string, Set<Function>>();
  
  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
    this.setupRedisSubscriber();
  }
  
  async publish(event: DomainEvent): Promise<void> {
    // Store event in event store
    await this.storeEvent(event);
    
    // Publish locally
    this.localEmitter.emit(event.type, event);
    
    // Publish to Redis for other services
    await this.redis.publish('domain-events', JSON.stringify(event));
  }
  
  subscribe(eventType: string, handler: Function): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(handler);
    this.localEmitter.on(eventType, handler);
  }
  
  private async storeEvent(event: DomainEvent): Promise<void> {
    await supabase
      .from('event_store')
      .insert({
        event_id: event.id,
        event_type: event.type,
        aggregate_id: event.aggregateId,
        event_data: event.data,
        metadata: event.metadata,
        created_at: event.timestamp
      });
  }
}
```

### Event Sourcing Pattern
```typescript
// src/aggregates/order-aggregate.ts
export class OrderAggregate {
  private id: string;
  private version: number = 0;
  private uncommittedEvents: DomainEvent[] = [];
  
  constructor(private eventBus: EventBus) {}
  
  static async load(id: string, eventBus: EventBus): Promise<OrderAggregate> {
    const aggregate = new OrderAggregate(eventBus);
    aggregate.id = id;
    
    // Load events from event store
    const events = await aggregate.loadEvents();
    
    // Replay events to rebuild state
    events.forEach(event => aggregate.apply(event, false));
    
    return aggregate;
  }
  
  async createOrder(data: CreateOrderData): Promise<void> {
    const event: DomainEvent = {
      id: generateId(),
      type: 'OrderCreated',
      aggregateId: this.id,
      timestamp: new Date(),
      data: {
        orderId: this.id,
        customerId: data.customerId,
        items: data.items,
        total: data.total
      }
    };
    
    this.apply(event);
    this.addEvent(event);
  }
  
  private apply(event: DomainEvent, isNew = true): void {
    switch (event.type) {
      case 'OrderCreated':
        this.onOrderCreated(event.data);
        break;
      case 'OrderConfirmed':
        this.onOrderConfirmed(event.data);
        break;
      // More event handlers...
    }
    
    if (isNew) {
      this.version++;
    }
  }
  
  async commit(): Promise<void> {
    for (const event of this.uncommittedEvents) {
      await this.eventBus.publish(event);
    }
    this.uncommittedEvents = [];
  }
}
```

## 🔍 Observability & Monitoring

### OpenTelemetry Integration
```typescript
// src/lib/telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';

export function setupTelemetry() {
  const sdk = new NodeSDK({
    resource: new Resource({
      'service.name': 'pharmacy-backend',
      'service.version': process.env.VERSION || '1.0.0',
    }),
    traceExporter: new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT,
    }),
    metricExporter: new PrometheusExporter({
      port: 9090,
    }),
  });
  
  sdk.start();
}

// Instrumentation middleware
export function traceMiddleware(req: any, res: any, next: any) {
  const span = tracer.startSpan(`${req.method} ${req.path}`);
  
  span.setAttributes({
    'http.method': req.method,
    'http.url': req.url,
    'http.target': req.path,
    'user.id': req.user?.id,
  });
  
  res.on('finish', () => {
    span.setAttributes({
      'http.status_code': res.statusCode,
    });
    span.end();
  });
  
  next();
}
```

### Health Checks & Readiness
```typescript
// src/health/health-controller.ts
export class HealthController {
  async checkHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkWhatsApp(),
      this.checkExternalAPIs(),
    ]);
    
    const status = checks.every(c => c.status === 'fulfilled') 
      ? 'healthy' 
      : 'unhealthy';
    
    return {
      status,
      timestamp: new Date(),
      checks: {
        database: this.getCheckResult(checks[0]),
        redis: this.getCheckResult(checks[1]),
        whatsapp: this.getCheckResult(checks[2]),
        external_apis: this.getCheckResult(checks[3]),
      },
      version: process.env.VERSION,
      uptime: process.uptime(),
    };
  }
  
  private async checkDatabase(): Promise<void> {
    const start = Date.now();
    await supabase.from('health_check').select('1').single();
    
    const latency = Date.now() - start;
    if (latency > 1000) throw new Error('Database latency too high');
  }
}
```

## 🛡️ Advanced Security Patterns

### API Rate Limiting with Sliding Window
```typescript
// src/middleware/rate-limiter.ts
export class SlidingWindowRateLimiter {
  private windows = new Map<string, number[]>();
  
  constructor(
    private windowSize: number = 60000, // 1 minute
    private maxRequests: number = 100
  ) {}
  
  async isAllowed(key: string): Promise<boolean> {
    const now = Date.now();
    const window = this.windows.get(key) || [];
    
    // Remove old entries
    const validWindow = window.filter(
      timestamp => now - timestamp < this.windowSize
    );
    
    if (validWindow.length >= this.maxRequests) {
      return false;
    }
    
    validWindow.push(now);
    this.windows.set(key, validWindow);
    
    return true;
  }
}

// Usage in middleware
export const rateLimitMiddleware = (limiter: SlidingWindowRateLimiter) => {
  return async (req: any, res: any, next: any) => {
    const key = `${req.ip}:${req.user?.id || 'anonymous'}`;
    
    if (!(await limiter.isAllowed(key))) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: 60,
      });
    }
    
    next();
  };
};
```

### Data Encryption Layer
```typescript
// src/lib/encryption-service.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyDerivation = 'pbkdf2';
  
  async encryptField(data: string, context: string): Promise<EncryptedData> {
    const iv = randomBytes(16);
    const salt = randomBytes(32);
    
    // Derive key from master key + context
    const key = await this.deriveKey(
      process.env.MASTER_ENCRYPTION_KEY!,
      salt,
      context
    );
    
    const cipher = createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      data: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      salt: salt.toString('hex'),
      algorithm: this.algorithm,
      version: 1,
    };
  }
  
  async decryptField(encrypted: EncryptedData, context: string): Promise<string> {
    const key = await this.deriveKey(
      process.env.MASTER_ENCRYPTION_KEY!,
      Buffer.from(encrypted.salt, 'hex'),
      context
    );
    
    const decipher = createDecipheriv(
      encrypted.algorithm,
      key,
      Buffer.from(encrypted.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

## 🚀 Performance Optimization

### Database Query Optimization
```typescript
// src/repositories/product-repository.ts
export class OptimizedProductRepository {
  // Use prepared statements
  private searchStmt = sql.prepare`
    SELECT p.*, 
           ts_rank(p.search_vector, plainto_tsquery('portuguese', ${sql.param('query')})) as rank
    FROM produtos p
    WHERE p.farmacia_id = ${sql.param('farmaciaId')}
    AND p.search_vector @@ plainto_tsquery('portuguese', ${sql.param('query')})
    ORDER BY rank DESC
    LIMIT ${sql.param('limit')}
  `;
  
  async searchProducts(
    farmaciaId: string,
    query: string,
    limit = 10
  ): Promise<Product[]> {
    // Use connection pooling
    const result = await this.pool.query(this.searchStmt, {
      farmaciaId,
      query,
      limit
    });
    
    return result.rows.map(this.mapToProduct);
  }
  
  // Batch operations
  async updatePricesBatch(updates: PriceUpdate[]): Promise<void> {
    const chunks = chunk(updates, 1000); // Process in chunks
    
    for (const chunk of chunks) {
      await this.pool.transaction(async (tx) => {
        const values = chunk.map(u => 
          `('${u.productId}'::uuid, ${u.price}, NOW())`
        ).join(',');
        
        await tx.query(`
          UPDATE produtos p
          SET preco_venda = v.price,
              updated_at = v.updated_at
          FROM (VALUES ${values}) AS v(id, price, updated_at)
          WHERE p.id = v.id
        `);
      });
    }
  }
}
```

### Caching Strategy
```typescript
// src/lib/cache-manager.ts
export class CacheManager {
  private l1Cache = new LRUCache<string, any>({ max: 1000 });
  private redis: Redis;
  
  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }
  
  async get<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Check L1 cache
    if (this.l1Cache.has(key)) {
      return this.l1Cache.get(key)!;
    }
    
    // Check L2 cache (Redis)
    const cached = await this.redis.get(key);
    if (cached) {
      const value = JSON.parse(cached);
      this.l1Cache.set(key, value);
      return value;
    }
    
    // Generate value
    const value = await factory();
    
    // Cache in both layers
    this.l1Cache.set(key, value);
    await this.redis.setex(
      key,
      options.ttl || 300,
      JSON.stringify(value)
    );
    
    return value;
  }
  
  async invalidate(pattern: string): Promise<void> {
    // Clear L1 cache
    for (const key of this.l1Cache.keys()) {
      if (key.match(pattern)) {
        this.l1Cache.delete(key);
      }
    }
    
    // Clear Redis
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

## 🔄 Advanced Integration Patterns

### Saga Pattern for Distributed Transactions
```typescript
// src/sagas/order-saga.ts
export class OrderSaga {
  private steps: SagaStep[] = [];
  private compensations: CompensationStep[] = [];
  
  async execute(order: Order): Promise<void> {
    try {
      // Step 1: Reserve inventory
      const reservation = await this.reserveInventory(order);
      this.compensations.push(() => this.releaseInventory(reservation));
      
      // Step 2: Process payment
      const payment = await this.processPayment(order);
      this.compensations.push(() => this.refundPayment(payment));
      
      // Step 3: Create delivery
      const delivery = await this.createDelivery(order);
      this.compensations.push(() => this.cancelDelivery(delivery));
      
      // Step 4: Send notifications
      await this.notifyCustomer(order);
      
      // Commit the saga
      await this.commitSaga(order);
      
    } catch (error) {
      // Compensate in reverse order
      await this.compensate();
      throw error;
    }
  }
  
  private async compensate(): Promise<void> {
    for (const compensation of this.compensations.reverse()) {
      try {
        await compensation();
      } catch (error) {
        console.error('Compensation failed:', error);
        // Log to dead letter queue
      }
    }
  }
}
```

### Circuit Breaker for External APIs
```typescript
// src/lib/circuit-breaker.ts
export class CircuitBreakerWithFallback {
  private failureCount = 0;
  private lastFailureTime?: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold = 5,
    private timeout = 60000,
    private fallback?: Function
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime!.getTime() > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        if (this.fallback) {
          return this.fallback();
        }
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

## 📦 Deployment & DevOps

### Kubernetes Deployment
```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pharmacy-backend
  labels:
    app: pharmacy-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pharmacy-backend
  template:
    metadata:
      labels:
        app: pharmacy-backend
    spec:
      containers:
      - name: backend
        image: pharmacy-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: pharmacy-secrets
              key: supabase-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Automated Testing Strategy
```typescript
// src/tests/integration/order.test.ts
describe('Order Service Integration Tests', () => {
  let testDb: TestDatabase;
  let app: Application;
  
  beforeAll(async () => {
    testDb = await TestDatabase.create();
    app = await createTestApp(testDb);
  });
  
  afterAll(async () => {
    await testDb.destroy();
  });
  
  describe('Order Creation Flow', () => {
    it('should create order with inventory reservation', async () => {
      // Arrange
      const product = await testDb.createProduct({
        name: 'Dipirona',
        stock: 10,
        price: 5.50
      });
      
      // Act
      const response = await request(app)
        .post('/api/orders')
        .send({
          items: [{
            productId: product.id,
            quantity: 2
          }]
        });
      
      // Assert
      expect(response.status).toBe(201);
      expect(response.body.total).toBe(11.00);
      
      // Verify inventory was updated
      const updatedProduct = await testDb.getProduct(product.id);
      expect(updatedProduct.stock).toBe(8);
    });
  });
});
```