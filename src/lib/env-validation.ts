import { z, infer as zInfer } from 'zod';

// Client-side environment variables (prefixed with NEXT_PUBLIC_)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  NEXT_PUBLIC_FARMACIA_ID: z.string().uuid('Farmacia ID must be a valid UUID').optional(),
  // Feature flags for client-side (optional since they may not be set)
  NEXT_PUBLIC_ENABLE_WHATSAPP_INTEGRATION: z.boolean().default(false),
  NEXT_PUBLIC_ENABLE_ERP_SYNC: z.boolean().default(false),
  NEXT_PUBLIC_ENABLE_PRICE_ANALYSIS: z.boolean().default(true),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.boolean().default(false),
  NEXT_PUBLIC_ENABLE_FILE_UPLOAD: z.boolean().default(true),
});

// Server-side environment variables
const serverEnvSchema = z.object({
  // Supabase - handle both naming conventions
  SUPABASE_SERVICE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // External APIs
  EXA_API_KEY: z.string().optional(), // Made optional for development
  GENERIC_PHARMACY_API_KEY: z.string().optional(),
  
  // WhatsApp Business API
  WHATSAPP_PHONE_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  
  // N8N Configuration
  N8N_WEBHOOK_URL: z.string().url().optional(),
  N8N_BASE_URL: z.string().url().optional(),
  N8N_BASIC_AUTH_USER: z.string().optional(),
  N8N_BASIC_AUTH_PASSWORD: z.string().optional(),
  
  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  
  // Security
  FIELD_ENCRYPTION_KEY: z.string().length(32, 'Encryption key must be 32 characters').optional(),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters').optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  USE_MOCK_DATA: z.string().transform(val => val === 'true').default('false'),
  
  // ERP Integrations
  VETOR_API_URL: z.string().url().optional(),
  VETOR_API_KEY: z.string().optional(),
  VETOR_STORE_ID: z.string().optional(),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Feature Flags
  ENABLE_WHATSAPP_INTEGRATION: z.string().transform(val => val === 'true').default('false'),
  ENABLE_ERP_SYNC: z.string().transform(val => val === 'true').default('false'),
  ENABLE_PRICE_ANALYSIS: z.string().transform(val => val === 'true').default('true'),
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('false'),
  ENABLE_FILE_UPLOAD: z.string().transform(val => val === 'true').default('true'),
});

type ClientEnv = zInfer<typeof clientEnvSchema>;
type ServerEnv = zInfer<typeof serverEnvSchema>;

// Validate client environment variables
function validateClientEnv(): ClientEnv {
  const clientEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_FARMACIA_ID: process.env.NEXT_PUBLIC_FARMACIA_ID,
    NEXT_PUBLIC_ENABLE_WHATSAPP_INTEGRATION: process.env.NEXT_PUBLIC_ENABLE_WHATSAPP_INTEGRATION === 'true',
    NEXT_PUBLIC_ENABLE_ERP_SYNC: process.env.NEXT_PUBLIC_ENABLE_ERP_SYNC === 'true',
    NEXT_PUBLIC_ENABLE_PRICE_ANALYSIS: process.env.NEXT_PUBLIC_ENABLE_PRICE_ANALYSIS !== 'false', // Default to true
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    NEXT_PUBLIC_ENABLE_FILE_UPLOAD: process.env.NEXT_PUBLIC_ENABLE_FILE_UPLOAD !== 'false', // Default to true
  };

  const result = clientEnvSchema.safeParse(clientEnv);
  
  if (!result.success) {
    console.warn('⚠️ Client environment validation issues:');
    result.error.issues.forEach(issue => {
      console.warn(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    // In development, return defaults rather than throwing
    if (process.env.NODE_ENV === 'development') {
      return clientEnvSchema.parse({});
    }
    throw new Error('Invalid client environment configuration');
  }
  
  return result.data;
}

// Validate server environment variables
function validateServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid server environment variables:');
    result.error.issues.forEach(issue => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    
    // In development, only warn about missing variables
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Running in development mode with missing environment variables');
      console.warn('💡 Copy .env.local.example to .env.local and configure your variables');
      // In development, return a partial ServerEnv based on process.env and schema defaults
      const partialEnv = serverEnvSchema.parse(process.env);
      return partialEnv; // Return validated data in development
    }
    
    throw new Error('Invalid server environment configuration');
  }
  
  // Handle both Supabase key naming conventions
  const data = result.data;
  if (data.SUPABASE_SERVICE_ROLE_KEY && !data.SUPABASE_SERVICE_KEY) {
    data.SUPABASE_SERVICE_KEY = data.SUPABASE_SERVICE_ROLE_KEY;
  }
  
  return data;
}

// Check for missing critical environment variables
export function checkCriticalEnvVars(): { missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Critical for basic functionality
  const critical = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'EXA_API_KEY',
  ];
  
  // Important for full functionality
  const important = [
    'NEXT_PUBLIC_FARMACIA_ID',
    'FIELD_ENCRYPTION_KEY',
    'JWT_SECRET',
    'REDIS_URL',
  ];
  
  critical.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });
  
  important.forEach(key => {
    if (!process.env[key]) {
      warnings.push(key);
    }
  });
  
  return { missing, warnings };
}

// Get validated environment variables (lazy loading to avoid SSR issues)
export const env: ClientEnv | ServerEnv = (() => {
  try {
    if (typeof window !== 'undefined') {
      // Client-side
      return validateClientEnv();
    } else {
      // Server-side
      return validateServerEnv();
    }
  } catch (error) {
    console.warn('Environment validation failed, using defaults:', error);
    // Return safe defaults
    if (typeof window !== 'undefined') {
      return {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        NEXT_PUBLIC_FARMACIA_ID: process.env.NEXT_PUBLIC_FARMACIA_ID,
        NEXT_PUBLIC_ENABLE_WHATSAPP_INTEGRATION: false,
        NEXT_PUBLIC_ENABLE_ERP_SYNC: false,
        NEXT_PUBLIC_ENABLE_PRICE_ANALYSIS: true,
        NEXT_PUBLIC_ENABLE_ANALYTICS: false,
        NEXT_PUBLIC_ENABLE_FILE_UPLOAD: true,
      } as ClientEnv;
    } else {
      // Return minimal server defaults
      return {
        NODE_ENV: (process.env.NODE_ENV as any) || 'development',
        ENABLE_PRICE_ANALYSIS: true,
        ENABLE_FILE_UPLOAD: true,
        ENABLE_WHATSAPP_INTEGRATION: false,
        ENABLE_ERP_SYNC: false,
        ENABLE_ANALYTICS: false,
        PORT: 3000,
        RATE_LIMIT_WINDOW_MS: 60000,
        RATE_LIMIT_MAX_REQUESTS: 100,
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        LOG_LEVEL: 'info',
        USE_MOCK_DATA: false,
      } as any;
    }
  }
})();

// Export client env separately for use in client components
// Only validate on client-side to avoid SSR issues
export const clientEnv = (() => {
  try {
    return typeof window !== 'undefined' ? validateClientEnv() : {} as ClientEnv;
  } catch (error) {
    console.warn('Client env validation failed:', error);
    return {} as ClientEnv;
  }
})();

// Environment status checker
export function getEnvStatus() {
  const { missing, warnings } = checkCriticalEnvVars();
  
  const status = {
    healthy: missing.length === 0,
    critical_missing: missing,
    warnings: warnings,
    supabase_configured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
    whatsapp_configured: !!(process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_ACCESS_TOKEN),
    redis_configured: !!(process.env.REDIS_URL || process.env.REDIS_HOST),
    exa_configured: !!process.env.EXA_API_KEY,
    encryption_configured: !!process.env.FIELD_ENCRYPTION_KEY,
    farmacia_configured: !!process.env.NEXT_PUBLIC_FARMACIA_ID,
  };
  
  return status;
}

// Development helper to print environment status
export function printEnvStatus() {
  if (process.env.NODE_ENV === 'development') {
    try {
      const status = getEnvStatus();
      
      console.log('\n🔧 Environment Configuration Status:');
      console.log(`  Overall Health: ${status.healthy ? '✅ Healthy' : '❌ Issues Found'}`);
      console.log(`  Supabase: ${status.supabase_configured ? '✅' : '❌'}`);
      console.log(`  Farmacia ID: ${status.farmacia_configured ? '✅' : '⚠️'}`);
      console.log(`  EXA API: ${status.exa_configured ? '✅' : '❌'}`);
      console.log(`  WhatsApp: ${status.whatsapp_configured ? '✅' : '⚠️'}`);
      console.log(`  Redis: ${status.redis_configured ? '✅' : '⚠️'}`);
      console.log(`  Encryption: ${status.encryption_configured ? '✅' : '⚠️'}`);
      
      if (status.critical_missing.length > 0) {
        console.log('\n❌ Critical Missing Variables:');
        status.critical_missing.forEach(key => console.log(`  - ${key}`));
      }
      
      if (status.warnings.length > 0) {
        console.log('\n⚠️ Missing Optional Variables:');
        status.warnings.forEach(key => console.log(`  - ${key}`));
      }
      
      if (!status.healthy) {
        console.log('\n💡 Copy .env.local.example to .env.local and configure your variables');
      }
      
      console.log('');
    } catch (error) {
      console.warn('⚠️ Could not print environment status:', error);
    }
  }
}

// Feature flag helpers (with safe defaults)
export const features = {
  whatsappEnabled: (() => {
    try {
      return typeof window !== 'undefined' 
        ? (env as ClientEnv).NEXT_PUBLIC_ENABLE_WHATSAPP_INTEGRATION 
        : (env as ServerEnv).ENABLE_WHATSAPP_INTEGRATION;
    } catch { return false; }
  })(),
  erpSyncEnabled: (() => {
    try {
      return typeof window !== 'undefined' 
        ? (env as ClientEnv).NEXT_PUBLIC_ENABLE_ERP_SYNC 
        : (env as ServerEnv).ENABLE_ERP_SYNC;
    } catch { return false; }
  })(),
  priceAnalysisEnabled: (() => {
    try {
      return typeof window !== 'undefined' 
        ? (env as ClientEnv).NEXT_PUBLIC_ENABLE_PRICE_ANALYSIS 
        : (env as ServerEnv).ENABLE_PRICE_ANALYSIS;
    } catch { return true; }
  })(),
  analyticsEnabled: (() => {
    try {
      return typeof window !== 'undefined' 
        ? (env as ClientEnv).NEXT_PUBLIC_ENABLE_ANALYTICS 
        : (env as ServerEnv).ENABLE_ANALYTICS;
    } catch { return false; }
  })(),
  fileUploadEnabled: (() => {
    try {
      return typeof window !== 'undefined' 
        ? (env as ClientEnv).NEXT_PUBLIC_ENABLE_FILE_UPLOAD 
        : (env as ServerEnv).ENABLE_FILE_UPLOAD;
    } catch { return true; }
  })(),
};

// Export validation functions for use in middleware
export { validateClientEnv, validateServerEnv };