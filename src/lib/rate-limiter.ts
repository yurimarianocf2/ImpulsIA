/**
 * Sistema de Rate Limiting
 * Proteção contra abuso de APIs e ataques DDoS
 */

import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number // Janela de tempo em milissegundos
  maxRequests: number // Máximo de requests por janela
  message?: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// Store em memória (em produção, usar Redis)
const store: RateLimitStore = {}

// Configurações padrão para diferentes tipos de endpoint
export const RATE_LIMIT_CONFIGS = {
  // APIs críticas - mais restritivo
  CRITICAL: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 100, // 100 requests por 15 min
    message: 'Muitas requisições. Tente novamente em 15 minutos.'
  },
  
  // APIs normais
  NORMAL: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 300, // 300 requests por 15 min
    message: 'Muitas requisições. Tente novamente em alguns minutos.'
  },
  
  // Login/Auth - muito restritivo
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 5, // 5 tentativas por 15 min
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  
  // Upload de arquivos
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hora
    maxRequests: 20, // 20 uploads por hora
    message: 'Muitos uploads. Tente novamente em 1 hora.'
  },
  
  // Análise de preços
  PRICE_ANALYSIS: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 10, // 10 análises por minuto
    message: 'Muitas análises de preço. Aguarde 1 minuto.'
  }
} as const

/**
 * Gera chave única para o rate limiting
 */
function generateKey(request: NextRequest, identifier?: string): string {
  // Usar IP como identificador padrão
  const ip = getClientIP(request)
  
  // Se tiver identificador específico (ex: user_id), usar junto
  if (identifier) {
    return `${ip}:${identifier}`
  }
  
  return ip
}

/**
 * Obtém IP do cliente considerando proxies
 */
function getClientIP(request: NextRequest): string {
  // Verificar headers de proxy
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  // Fallback para desenvolvimento
  return request.ip || 'unknown'
}

/**
 * Verifica se request está dentro do limite
 */
export function checkRateLimit(
  request: NextRequest, 
  config: RateLimitConfig,
  identifier?: string
): {
  allowed: boolean
  remaining: number
  resetTime: number
  message?: string
} {
  const key = generateKey(request, identifier)
  const now = Date.now()
  
  // Limpar entradas expiradas periodicamente
  cleanupExpiredEntries(now)
  
  // Verificar se já existe entrada para esta chave
  let entry = store[key]
  
  if (!entry || now > entry.resetTime) {
    // Criar nova entrada ou resetar se expirou
    entry = {
      count: 0,
      resetTime: now + config.windowMs
    }
    store[key] = entry
  }
  
  // Incrementar contador
  entry.count++
  
  const allowed = entry.count <= config.maxRequests
  const remaining = Math.max(0, config.maxRequests - entry.count)
  
  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
    message: allowed ? undefined : config.message
  }
}

/**
 * Middleware para aplicar rate limiting
 */
export function createRateLimitMiddleware(
  config: RateLimitConfig,
  getIdentifier?: (request: NextRequest) => string | undefined
) {
  return (request: NextRequest) => {
    const identifier = getIdentifier?.(request)
    const result = checkRateLimit(request, config, identifier)
    
    return result
  }
}

/**
 * Rate limiter específico para autenticação
 */
export const authRateLimit = createRateLimitMiddleware(
  RATE_LIMIT_CONFIGS.AUTH,
  (request) => {
    // Para auth, usar IP + email se disponível
    const body = request.body
    if (body) {
      try {
        // Tentar extrair email do body (se for JSON)
        const data = JSON.parse(body.toString())
        if (data.email) {
          return data.email
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    return undefined
  }
)

/**
 * Rate limiter para análise de preços
 */
export const priceAnalysisRateLimit = createRateLimitMiddleware(
  RATE_LIMIT_CONFIGS.PRICE_ANALYSIS,
  (request) => {
    // Para análise de preços, usar farmacia_id se disponível
    const farmaciaId = request.headers.get('x-farmacia-id')
    return farmaciaId || undefined
  }
)

/**
 * Rate limiter para upload
 */
export const uploadRateLimit = createRateLimitMiddleware(
  RATE_LIMIT_CONFIGS.UPLOAD,
  (request) => {
    const farmaciaId = request.headers.get('x-farmacia-id')
    return farmaciaId || undefined
  }
)

/**
 * Rate limiter para APIs críticas
 */
export const criticalRateLimit = createRateLimitMiddleware(
  RATE_LIMIT_CONFIGS.CRITICAL
)

/**
 * Rate limiter normal
 */
export const normalRateLimit = createRateLimitMiddleware(
  RATE_LIMIT_CONFIGS.NORMAL
)

/**
 * Limpa entradas expiradas do store
 */
function cleanupExpiredEntries(now: number) {
  // Executar limpeza apenas ocasionalmente (5% de chance)
  if (Math.random() > 0.05) return
  
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}

/**
 * Cria resposta de rate limit excedido
 */
export function createRateLimitResponse(
  message: string,
  resetTime: number,
  remaining: number = 0
): Response {
  const resetDate = new Date(resetTime)
  
  return new Response(
    JSON.stringify({
      error: 'RATE_LIMIT_EXCEEDED',
      message,
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      resetTime: resetDate.toISOString(),
      remaining
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetDate.toISOString()
      }
    }
  )
}

/**
 * Adiciona headers de rate limit à resposta
 */
export function addRateLimitHeaders(
  response: Response,
  remaining: number,
  resetTime: number,
  limit: number
): Response {
  const newHeaders = new Headers(response.headers)
  
  newHeaders.set('X-RateLimit-Limit', limit.toString())
  newHeaders.set('X-RateLimit-Remaining', remaining.toString())
  newHeaders.set('X-RateLimit-Reset', new Date(resetTime).toISOString())
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  })
}

/**
 * Wrapper para aplicar rate limiting em API routes
 */
export function withRateLimit<T = any>(
  handler: (request: NextRequest) => Promise<Response>,
  config: RateLimitConfig,
  getIdentifier?: (request: NextRequest) => string | undefined
) {
  return async (request: NextRequest): Promise<Response> => {
    const identifier = getIdentifier?.(request)
    const rateLimitResult = checkRateLimit(request, config, identifier)
    
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(
        rateLimitResult.message!,
        rateLimitResult.resetTime,
        rateLimitResult.remaining
      )
    }
    
    // Executar handler original
    const response = await handler(request)
    
    // Adicionar headers de rate limit
    return addRateLimitHeaders(
      response,
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      config.maxRequests
    )
  }
}

/**
 * Estatísticas do rate limiter (para monitoramento)
 */
export function getRateLimitStats(): {
  totalKeys: number
  activeWindows: number
  topKeys: Array<{ key: string; count: number }>
} {
  const now = Date.now()
  const activeKeys = Object.entries(store).filter(([_, entry]) => entry.resetTime > now)
  
  const topKeys = activeKeys
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([key, entry]) => ({ key, count: entry.count }))
  
  return {
    totalKeys: Object.keys(store).length,
    activeWindows: activeKeys.length,
    topKeys
  }
}

/**
 * Reset manual de rate limit (para administração)
 */
export function resetRateLimit(key: string): boolean {
  if (store[key]) {
    delete store[key]
    return true
  }
  return false
}

/**
 * Bloquear IP temporariamente (para casos extremos)
 */
const blockedIPs = new Set<string>()

export function blockIP(ip: string, durationMs: number = 60 * 60 * 1000) {
  blockedIPs.add(ip)
  
  // Auto-remover após duração
  setTimeout(() => {
    blockedIPs.delete(ip)
  }, durationMs)
}

export function isIPBlocked(request: NextRequest): boolean {
  const ip = getClientIP(request)
  return blockedIPs.has(ip)
}

export function createIPBlockResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'IP_BLOCKED',
      message: 'Seu IP foi temporariamente bloqueado devido a atividade suspeita.'
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}