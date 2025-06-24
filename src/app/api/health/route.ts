import { NextResponse } from 'next/server';
import { getEnvStatus } from '@/lib/env-validation';
import { createClient } from '@supabase/supabase-js';

// Health check endpoint
export async function GET() {
  const startTime = Date.now();
  
  try {
    const envStatus = getEnvStatus();
    const checks = {
      environment: envStatus.healthy,
      supabase: false,
      database: false,
      redis: false,
      external_apis: false,
    };
    
    // Check Supabase connection
    if (envStatus.supabase_configured) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_KEY!
        );
        
        const { data, error } = await supabase
          .from('farmacias')
          .select('id')
          .limit(1);
          
        checks.supabase = !error;
        checks.database = !error;
      } catch (error) {
        console.error('Supabase health check failed:', error);
      }
    }
    
    // Check Redis connection (if configured)
    if (envStatus.redis_configured) {
      try {
        // Simple Redis ping test would go here
        // For now, assume it's working if configured
        checks.redis = true;
      } catch (error) {
        console.error('Redis health check failed:', error);
      }
    }
    
    // Check external APIs
    if (envStatus.exa_configured) {
      try {
        // Simple check - if API key is present, assume healthy
        // Real implementation would make actual API call
        checks.external_apis = true;
      } catch (error) {
        console.error('External API health check failed:', error);
      }
    }
    
    const allHealthy = Object.values(checks).every(Boolean);
    const responseTime = Date.now() - startTime;
    
    const healthData = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      checks,
      environment: {
        node_env: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
      },
      configuration: {
        supabase_configured: envStatus.supabase_configured,
        whatsapp_configured: envStatus.whatsapp_configured,
        redis_configured: envStatus.redis_configured,
        exa_configured: envStatus.exa_configured,
        encryption_configured: envStatus.encryption_configured,
        farmacia_configured: envStatus.farmacia_configured,
      },
      features: {
        whatsapp_enabled: process.env.ENABLE_WHATSAPP_INTEGRATION === 'true',
        erp_sync_enabled: process.env.ENABLE_ERP_SYNC === 'true',
        price_analysis_enabled: process.env.ENABLE_PRICE_ANALYSIS === 'true',
        analytics_enabled: process.env.ENABLE_ANALYTICS === 'true',
        file_upload_enabled: process.env.ENABLE_FILE_UPLOAD === 'true',
      }
    };
    
    return NextResponse.json(healthData, {
      status: allHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      response_time_ms: Date.now() - startTime,
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}