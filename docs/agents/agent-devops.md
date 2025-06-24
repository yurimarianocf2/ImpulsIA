# AGENT DEVOPS

This file provides specialized guidance for Claude Code when working on DevOps and infrastructure for the FarmaBot project.

## DevOps Responsibilities
- Container orchestration with Docker Compose
- Database management and migrations
- Environment configuration and secrets
- CI/CD pipeline maintenance
- Monitoring and logging setup
- Backup and disaster recovery

## Current Infrastructure Stack
- **Containers**: Docker + Docker Compose
- **Database**: Supabase (PostgreSQL)
- **Cache**: Redis (via Docker)
- **Process Automation**: n8n (self-hosted)
- **Frontend**: Next.js (deployed on Vercel/similar)
- **Environment Management**: .env files

## Docker Setup

### Current docker-compose.yml Structure
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: farmabot
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  n8n:
    image: n8nio/n8n:latest
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  redis_data:
  n8n_data:
```

### Container Management Commands
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f [service_name]

# Restart specific service
docker-compose restart n8n

# Stop all services
docker-compose down

# Rebuild containers
docker-compose up --build -d

# Clean up unused resources
docker system prune -a
```

## Database Management

### Supabase Integration
```typescript
// Database connection management
export class DatabaseManager {
  private supabase: SupabaseClient;
  
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('health_check')
        .select('1')
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }
  
  async backupDatabase(): Promise<void> {
    // Implementation for database backup
    const { data, error } = await this.supabase
      .from('backup_jobs')
      .insert({
        type: 'full_backup',
        status: 'started',
        created_at: new Date()
      });
  }
}
```

### Database Scripts
```bash
# Database migration (manual)
npm run db:migrate

# Seed development data
npm run db:seed

# Backup database
npm run db:backup

# Restore from backup
npm run db:restore
```

## Environment Configuration

### Environment Variables Structure
```bash
# .env.local (development)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# WhatsApp Business API
WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_VERIFY_TOKEN=your-verify-token

# n8n Configuration
N8N_WEBHOOK_URL=http://localhost:5678/webhook
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=secure-password

# External APIs
EXA_API_KEY=your-exa-api-key
CLIQUEFARMA_API_KEY=your-cliquefarma-key

# Redis (for Docker setup)
REDIS_URL=redis://localhost:6379

# Application Settings
NODE_ENV=development
PORT=3000
```

### Environment Management
```typescript
// lib/env-validator.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_KEY: z.string(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  EXA_API_KEY: z.string().optional(),
  PORT: z.string().transform(Number).default('3000')
});

export const env = envSchema.parse(process.env);
```

## Monitoring and Health Checks

### Application Health Monitoring
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: false,
    redis: false,
    n8n: false,
    external_apis: false
  };
  
  try {
    // Database check
    const dbManager = new DatabaseManager();
    checks.database = await dbManager.healthCheck();
    
    // Redis check (if applicable)
    checks.redis = await checkRedisHealth();
    
    // n8n check
    checks.n8n = await checkN8nHealth();
    
    // External APIs check
    checks.external_apis = await checkExternalAPIs();
    
    const allHealthy = Object.values(checks).every(Boolean);
    
    return Response.json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
      version: process.env.npm_package_version || '1.0.0'
    }, {
      status: allHealthy ? 200 : 503
    });
    
  } catch (error) {
    return Response.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
```

### Logging Strategy
```typescript
// lib/logger.ts
export class Logger {
  private context: string;
  
  constructor(context: string) {
    this.context = context;
  }
  
  info(message: string, data?: any) {
    console.log(JSON.stringify({
      level: 'info',
      context: this.context,
      message,
      data,
      timestamp: new Date().toISOString()
    }));
  }
  
  error(message: string, error?: Error) {
    console.error(JSON.stringify({
      level: 'error',
      context: this.context,
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    }));
  }
  
  warn(message: string, data?: any) {
    console.warn(JSON.stringify({
      level: 'warn',
      context: this.context,
      message,
      data,
      timestamp: new Date().toISOString()
    }));
  }
}
```

## Backup and Recovery

### Database Backup Strategy
```bash
#!/bin/bash
# scripts/backup-database.sh

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="farmabot_backup_${TIMESTAMP}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup Supabase data (requires pg_dump access)
pg_dump $DATABASE_URL > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "farmabot_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

### File System Backup
```bash
# Backup important application files
tar -czf "/backups/app_backup_$(date +%Y%m%d).tar.gz" \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  .
```

## Security Practices

### Secret Management
```typescript
// lib/secrets.ts
export class SecretManager {
  private static secrets = new Map<string, string>();
  
  static load() {
    // Load secrets from environment or external service
    const requiredSecrets = [
      'SUPABASE_SERVICE_KEY',
      'WHATSAPP_ACCESS_TOKEN',
      'EXA_API_KEY'
    ];
    
    for (const secret of requiredSecrets) {
      const value = process.env[secret];
      if (!value) {
        throw new Error(`Missing required secret: ${secret}`);
      }
      this.secrets.set(secret, value);
    }
  }
  
  static get(key: string): string {
    const value = this.secrets.get(key);
    if (!value) {
      throw new Error(`Secret not found: ${key}`);
    }
    return value;
  }
}
```

### Security Headers
```typescript
// next.config.mjs
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
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
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  }
};
```

## Performance Optimization

### Application Performance
```typescript
// lib/performance.ts
export class PerformanceMonitor {
  static measureApiCall<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const start = performance.now();
    
    return operation().finally(() => {
      const duration = performance.now() - start;
      
      if (duration > 1000) {
        console.warn(`Slow operation: ${operationName} took ${duration}ms`);
      }
      
      // Send to monitoring service if available
      this.recordMetric(operationName, duration);
    });
  }
  
  private static recordMetric(name: string, duration: number) {
    // Implementation for metrics collection
  }
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Docker Services Not Starting
```bash
# Check Docker daemon
systemctl status docker

# Check port conflicts
netstat -tulpn | grep :5432

# View container logs
docker-compose logs postgres
docker-compose logs n8n
```

#### 2. Database Connection Issues
```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     "https://your-project.supabase.co/rest/v1/health"

# Check local PostgreSQL
docker exec -it postgres_container psql -U postgres -d farmabot
```

#### 3. n8n Workflow Issues
```bash
# Access n8n interface
open http://localhost:5678

# Check n8n logs
docker-compose logs -f n8n

# Restart n8n service
docker-compose restart n8n
```

#### 4. Environment Variable Issues
```bash
# Validate environment variables
npm run env:check

# Show current environment (careful with secrets)
printenv | grep -E "(NEXT_|SUPABASE_|N8N_)"
```

## Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Docker services tested
- [ ] Health checks passing
- [ ] Security headers configured
- [ ] Backup strategy in place

### Production Deployment
- [ ] Use production environment variables
- [ ] Enable database connection pooling
- [ ] Configure proper logging
- [ ] Set up monitoring alerts
- [ ] Document rollback procedures

## Development Workflow

### Local Development Setup
```bash
# 1. Clone repository
git clone [repository-url]
cd farmabot

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Start Docker services
docker-compose up -d

# 5. Wait for services to be ready
npm run wait-for-services

# 6. Start development server
npm run dev
```

### CI/CD Pipeline (Future)
```yaml
# .github/workflows/deploy.yml
name: Deploy FarmaBot
on:
  push:
    branches: [main]
    
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Production
        run: |
          # Deployment commands
```

## Monitoring and Alerts

### Key Metrics to Monitor
- API response times
- Database connection pool usage
- n8n workflow execution success rate
- WhatsApp API rate limits
- Disk space usage
- Memory consumption

### Alert Thresholds
- API response time > 2 seconds
- Database connections > 80% of pool
- Disk usage > 85%
- Failed workflows > 5% in 1 hour
- WhatsApp API errors > 10 in 5 minutes

This agent focuses on the actual infrastructure and DevOps needs of the current Next.js application with Docker Compose services.