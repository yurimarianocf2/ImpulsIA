# AGENT SECURITY

This file provides specialized guidance for Claude Code when working on security aspects of the FarmaBot project.

## Security Responsibilities
- API security and rate limiting
- Data protection and encryption
- Authentication and authorization
- LGPD compliance (Brazilian data protection law)
- WhatsApp Business API security
- Database security and access control
- Environment and secrets management

## Security Context for Pharmacy Systems

### Regulatory Compliance
- **LGPD** (Lei Geral de Proteção de Dados) - Brazilian GDPR equivalent
- **ANVISA** regulations for pharmaceutical data
- **CRF** (Conselho Regional de Farmácia) requirements
- **SNGPC** (Sistema Nacional de Gerenciamento de Produtos Controlados)

### Sensitive Data Types
- Customer personal information (CPF, phone, address)
- Medical data (medications in use, prescriptions)
- Financial data (payment information, pricing)
- Controlled substances data
- Business metrics and analytics

## Authentication & Authorization

### Supabase Auth Integration
```typescript
// lib/auth.ts
import { createServerClient } from '@supabase/ssr';

export async function createAuthClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      cookies: {
        get: (name: string) => cookies().get(name)?.value,
        set: (name: string, value: string, options: any) => {
          cookies().set({ name, value, ...options });
        },
        remove: (name: string, options: any) => {
          cookies().delete({ name, ...options });
        },
      },
    }
  );
}

export async function getUser() {
  const supabase = await createAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}
```

### API Route Protection
```typescript
// lib/auth-middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export async function authMiddleware(request: NextRequest) {
  const user = await getUser();
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Check user permissions for specific routes
  const path = request.nextUrl.pathname;
  if (path.startsWith('/api/admin') && !user.role?.includes('admin')) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }
  
  return NextResponse.next();
}
```

### Role-Based Access Control
```typescript
// lib/rbac.ts
export enum Permission {
  READ_PRODUCTS = 'read:products',
  WRITE_PRODUCTS = 'write:products',
  READ_CUSTOMERS = 'read:customers',
  WRITE_CUSTOMERS = 'write:customers',
  READ_ANALYTICS = 'read:analytics',
  ADMIN_ACCESS = 'admin:access'
}

export enum Role {
  PHARMACIST = 'pharmacist',
  ASSISTANT = 'assistant',
  ADMIN = 'admin',
  VIEWER = 'viewer'
}

const rolePermissions: Record<Role, Permission[]> = {
  [Role.VIEWER]: [
    Permission.READ_PRODUCTS
  ],
  [Role.ASSISTANT]: [
    Permission.READ_PRODUCTS,
    Permission.READ_CUSTOMERS,
    Permission.WRITE_PRODUCTS
  ],
  [Role.PHARMACIST]: [
    Permission.READ_PRODUCTS,
    Permission.WRITE_PRODUCTS,
    Permission.READ_CUSTOMERS,
    Permission.WRITE_CUSTOMERS,
    Permission.READ_ANALYTICS
  ],
  [Role.ADMIN]: Object.values(Permission)
};

export function hasPermission(userRole: Role, permission: Permission): boolean {
  return rolePermissions[userRole]?.includes(permission) || false;
}
```

## Data Protection & Encryption

### Field-Level Encryption
```typescript
// lib/encryption.ts
import { createCipher, createDecipher, randomBytes } from 'crypto';

export class FieldEncryption {
  private static algorithm = 'aes-256-cbc';
  private static key = process.env.FIELD_ENCRYPTION_KEY!;
  
  static encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipher(this.algorithm, this.key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }
  
  static decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipher(this.algorithm, this.key);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Usage for sensitive fields
export const encryptSensitiveData = {
  cpf: (cpf: string) => FieldEncryption.encrypt(cpf),
  phone: (phone: string) => FieldEncryption.encrypt(phone),
  address: (address: string) => FieldEncryption.encrypt(address)
};
```

### Database Security
```sql
-- Row Level Security (RLS) policies in Supabase
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own pharmacy's customers
CREATE POLICY "Users can view own pharmacy customers" ON clientes
  FOR SELECT USING (
    farmacia_id = (
      SELECT farmacia_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only pharmacists can modify customer data
CREATE POLICY "Pharmacists can modify customers" ON clientes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('pharmacist', 'admin')
      AND farmacia_id = clientes.farmacia_id
    )
  );
```

## API Security

### Rate Limiting
```typescript
// lib/rate-limiter.ts
import { Redis } from 'ioredis';

export class RateLimiter {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
  }
  
  async checkRateLimit(
    key: string, 
    windowMs: number = 60000, 
    maxRequests: number = 100
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const redisKey = `rate_limit:${key}:${window}`;
    
    const current = await this.redis.incr(redisKey);
    
    if (current === 1) {
      await this.redis.expire(redisKey, Math.ceil(windowMs / 1000));
    }
    
    const remaining = Math.max(0, maxRequests - current);
    const resetTime = (window + 1) * windowMs;
    
    return {
      allowed: current <= maxRequests,
      remaining,
      resetTime
    };
  }
}

// Middleware for API routes
export function withRateLimit(
  handler: Function,
  options: { windowMs?: number; maxRequests?: number } = {}
) {
  return async (req: NextRequest) => {
    const limiter = new RateLimiter();
    const clientIP = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
    
    const { allowed, remaining, resetTime } = await limiter.checkRateLimit(
      clientIP,
      options.windowMs,
      options.maxRequests
    );
    
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': resetTime.toString()
          }
        }
      );
    }
    
    const response = await handler(req);
    
    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', resetTime.toString());
    
    return response;
  };
}
```

### Input Validation & Sanitization
```typescript
// lib/validation.ts
import { z } from 'zod';
import DOMPurify from 'dompurify';

// CPF validation (Brazilian document)
const cpfSchema = z.string().refine((cpf) => {
  // Remove non-digits
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Check length and validate checksum
  if (cleanCPF.length !== 11) return false;
  
  // Validate CPF algorithm
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF[10])) return false;
  
  return true;
}, 'CPF inválido');

export const customerSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode exceder 100 caracteres')
    .transform(val => DOMPurify.sanitize(val)),
  
  cpf: cpfSchema.optional(),
  
  telefone: z.string()
    .regex(/^\+?5511\d{8,9}$/, 'Formato de telefone inválido')
    .transform(val => val.replace(/\D/g, '')),
  
  email: z.string().email('Email inválido').optional(),
  
  endereco: z.object({
    rua: z.string().max(200),
    numero: z.string().max(20),
    cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
    cidade: z.string().max(100),
    estado: z.string().length(2, 'Estado deve ter 2 caracteres')
  }).optional()
});

export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
```

## WhatsApp Business API Security

### Webhook Security
```typescript
// app/api/webhooks/whatsapp/route.ts
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  
  // Verify webhook signature
  if (!verifyWhatsAppSignature(body, signature)) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }
  
  // Process webhook safely
  const data = JSON.parse(body);
  await processWhatsAppWebhook(data);
  
  return NextResponse.json({ success: true });
}

function verifyWhatsAppSignature(payload: string, signature: string | null): boolean {
  if (!signature) return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET!)
    .update(payload, 'utf8')
    .digest('hex');
  
  const expectedSignatureWithPrefix = `sha256=${expectedSignature}`;
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignatureWithPrefix)
  );
}
```

### WhatsApp Message Sanitization
```typescript
// lib/message-security.ts
export class MessageSecurity {
  static sanitizeIncomingMessage(message: string): string {
    // Remove potentially dangerous content
    return message
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 1000); // Limit length
  }
  
  static validatePhoneNumber(phone: string): boolean {
    // Validate WhatsApp phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  }
  
  static detectSpam(message: string): boolean {
    const spamKeywords = [
      'promoção', 'desconto', 'grátis', 'clique aqui',
      'oferta limitada', 'ganhe dinheiro'
    ];
    
    const lowerMessage = message.toLowerCase();
    return spamKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}
```

## LGPD Compliance

### Data Processing Consent
```typescript
// lib/lgpd-compliance.ts
export interface ConsentRecord {
  userId: string;
  consentType: 'data_processing' | 'marketing' | 'analytics';
  granted: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class LGPDCompliance {
  static async recordConsent(consent: ConsentRecord): Promise<void> {
    const { data, error } = await supabase
      .from('consent_records')
      .insert({
        user_id: consent.userId,
        consent_type: consent.consentType,
        granted: consent.granted,
        timestamp: consent.timestamp,
        ip_address: consent.ipAddress,
        user_agent: consent.userAgent
      });
    
    if (error) {
      throw new Error(`Failed to record consent: ${error.message}`);
    }
  }
  
  static async hasValidConsent(
    userId: string, 
    consentType: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('consent_records')
      .select('*')
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .eq('granted', true)
      .order('timestamp', { ascending: false })
      .limit(1);
    
    if (error || !data?.length) return false;
    
    // Check if consent is still valid (e.g., within 2 years)
    const consentDate = new Date(data[0].timestamp);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    return consentDate > twoYearsAgo;
  }
  
  static async deleteUserData(userId: string): Promise<void> {
    // LGPD Right to Erasure (Right to be Forgotten)
    const tables = [
      'clientes',
      'mensagens',
      'pedidos',
      'consent_records'
    ];
    
    for (const table of tables) {
      await supabase
        .from(table)
        .delete()
        .eq('user_id', userId);
    }
    
    // Log deletion for audit
    await supabase
      .from('data_deletion_log')
      .insert({
        user_id: userId,
        deleted_at: new Date(),
        requested_by: 'user'
      });
  }
}
```

### Data Anonymization
```typescript
// lib/data-anonymization.ts
export class DataAnonymizer {
  static anonymizeCustomer(customer: any) {
    return {
      ...customer,
      nome: this.anonymizeName(customer.nome),
      cpf: this.anonymizeCPF(customer.cpf),
      telefone: this.anonymizePhone(customer.telefone),
      email: this.anonymizeEmail(customer.email),
      endereco: customer.endereco ? {
        ...customer.endereco,
        rua: 'Rua ***',
        numero: '***'
      } : null
    };
  }
  
  private static anonymizeName(name: string): string {
    if (!name) return '';
    const parts = name.split(' ');
    return parts[0] + ' ' + '*'.repeat(parts.slice(1).join(' ').length);
  }
  
  private static anonymizeCPF(cpf: string): string {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})\d{6}(\d{2})/, '$1****$2');
  }
  
  private static anonymizePhone(phone: string): string {
    if (!phone) return '';
    return phone.replace(/(\d{2})\d{5}(\d{4})/, '$1*****$2');
  }
  
  private static anonymizeEmail(email: string): string {
    if (!email) return '';
    const [user, domain] = email.split('@');
    return user.charAt(0) + '*'.repeat(user.length - 1) + '@' + domain;
  }
}
```

## Security Monitoring & Logging

### Security Event Logging
```typescript
// lib/security-logger.ts
export enum SecurityEventType {
  AUTH_FAILURE = 'auth_failure',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_ACCESS = 'data_access',
  PERMISSION_DENIED = 'permission_denied'
}

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class SecurityLogger {
  static async logEvent(event: SecurityEvent): Promise<void> {
    // Log to database
    await supabase
      .from('security_events')
      .insert({
        event_type: event.type,
        user_id: event.userId,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        details: event.details,
        timestamp: event.timestamp,
        severity: event.severity
      });
    
    // Log to console for immediate visibility
    const logLevel = event.severity === 'critical' ? 'error' : 'warn';
    console[logLevel]('Security Event:', {
      type: event.type,
      severity: event.severity,
      details: event.details
    });
    
    // Send alerts for critical events
    if (event.severity === 'critical') {
      await this.sendSecurityAlert(event);
    }
  }
  
  private static async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    // Implementation for sending security alerts
    // Could be email, Slack, or other notification systems
  }
}
```

### Intrusion Detection
```typescript
// lib/intrusion-detection.ts
export class IntrusionDetector {
  static async analyzeRequest(req: NextRequest): Promise<boolean> {
    const suspicious = [
      this.checkSQLInjection(req),
      this.checkXSSAttempt(req),
      this.checkPathTraversal(req),
      this.checkBruteForce(req),
      await this.checkRatePattern(req)
    ];
    
    return suspicious.some(Boolean);
  }
  
  private static checkSQLInjection(req: NextRequest): boolean {
    const body = req.body?.toString() || '';
    const url = req.url;
    
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
      /(UNION\s+SELECT)/i,
      /(\-\-|\#|\/\*|\*\/)/,
      /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i
    ];
    
    return sqlPatterns.some(pattern => 
      pattern.test(body) || pattern.test(url)
    );
  }
  
  private static checkXSSAttempt(req: NextRequest): boolean {
    const body = req.body?.toString() || '';
    const url = req.url;
    
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi
    ];
    
    return xssPatterns.some(pattern => 
      pattern.test(body) || pattern.test(url)
    );
  }
  
  private static checkPathTraversal(req: NextRequest): boolean {
    const url = req.url;
    const pathPatterns = [
      /\.\.\//g,
      /\.\.\\{2}/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi
    ];
    
    return pathPatterns.some(pattern => pattern.test(url));
  }
  
  private static checkBruteForce(req: NextRequest): boolean {
    // Check for rapid repeated requests from same IP
    // Implementation would use Redis to track request frequency
    return false; // Placeholder
  }
  
  private static async checkRatePattern(req: NextRequest): Promise<boolean> {
    // Check for suspicious rate patterns
    // Implementation would analyze request patterns over time
    return false; // Placeholder
  }
}
```

## Security Configuration

### Next.js Security Headers
```typescript
// next.config.mjs
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.exa.ai https://*.supabase.co"
    ].join('; ')
  }
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      }
    ];
  }
};
```

### Environment Security
```bash
# .env.security-template
# Use strong, unique passwords for all services
SUPABASE_SERVICE_KEY=your-very-long-service-key-here
FIELD_ENCRYPTION_KEY=32-character-encryption-key-here
WHATSAPP_WEBHOOK_SECRET=webhook-secret-from-meta
JWT_SECRET=strong-jwt-secret-for-sessions

# Rate limiting configuration
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Security settings
SECURITY_HEADERS_ENABLED=true
INTRUSION_DETECTION_ENABLED=true
AUDIT_LOGGING_ENABLED=true
```

This security agent focuses on the practical security needs of the current Next.js application while ensuring LGPD compliance and pharmaceutical industry security requirements.