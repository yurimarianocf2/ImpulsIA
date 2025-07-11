/**
 * Esquemas de Validação com Zod
 * Validação robusta de dados de entrada para todas as APIs
 */

import { z } from 'zod'
import { NextRequest } from 'next/server'

// ============================================================================
// VALIDADORES BÁSICOS
// ============================================================================

// UUID v4
export const uuidSchema = z.string().uuid('UUID inválido')

// Email
export const emailSchema = z.string().email('Email inválido')

// Business ID
export const businessIdSchema = z.string()
  .min(1, 'ID da empresa é obrigatório')
  .max(50, 'ID muito longo')

// Telefone brasileiro
export const phoneSchema = z.string()
  .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$|^\d{10,11}$/, 'Telefone inválido')

// Senha segura
export const passwordSchema = z.string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Senha deve conter ao menos: 1 minúscula, 1 maiúscula e 1 número')

// ============================================================================
// SCHEMAS DE AUTENTICAÇÃO
// ============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória')
})

export const registerUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword']
})

export const registerFarmaciaSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(200, 'Nome muito longo'),
  business_id: businessIdSchema,
  razaoSocial: z.string()
    .max(255, 'Razão social muito longa')
    .optional(),
  email: emailSchema.optional(),
  telefone: phoneSchema.optional()
})

export const completeRegistrationSchema = z.object({
  user: registerUserSchema,
  farmacia: registerFarmaciaSchema
})

export const resetPasswordSchema = z.object({
  email: emailSchema
})

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword']
})

// ============================================================================
// SCHEMAS DE PRODUTOS
// ============================================================================

export const productSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(255, 'Nome muito longo'),
  principio_ativo: z.string()
    .max(255, 'Princípio ativo muito longo')
    .optional(),
  categoria: z.string()
    .max(100, 'Categoria muito longa')
    .optional(),
  codigo_barras: z.string()
    .regex(/^\d{8,14}$/, 'Código de barras inválido')
    .optional(),
  preco_custo: z.number()
    .min(0, 'Preço de custo deve ser positivo')
    .max(999999.99, 'Preço muito alto'),
  preco_venda: z.number()
    .min(0, 'Preço de venda deve ser positivo')
    .max(999999.99, 'Preço muito alto'),
  estoque_atual: z.number()
    .int('Estoque deve ser número inteiro')
    .min(0, 'Estoque não pode ser negativo')
    .max(999999, 'Estoque muito alto'),
  estoque_minimo: z.number()
    .int('Estoque mínimo deve ser número inteiro')
    .min(0, 'Estoque mínimo não pode ser negativo')
    .max(999999, 'Estoque mínimo muito alto')
    .optional(),
  data_validade: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de validade inválida (use YYYY-MM-DD)')
    .optional()
    .transform(date => date ? new Date(date) : undefined),
  lote: z.string()
    .max(50, 'Lote muito longo')
    .optional(),
  fabricante: z.string()
    .max(100, 'Fabricante muito longo')
    .optional(),
  ativo: z.boolean().default(true)
})

export const bulkProductsSchema = z.object({
  produtos: z.array(productSchema)
    .min(1, 'Pelo menos um produto é obrigatório')
    .max(1000, 'Máximo 1000 produtos por vez')
})

export const updateProductSchema = productSchema.partial().extend({
  id: uuidSchema
})

// ============================================================================
// SCHEMAS DE ANÁLISE DE PREÇOS
// ============================================================================

export const priceAnalysisSchema = z.object({
  medicamento: z.string()
    .min(2, 'Nome do medicamento muito curto')
    .max(255, 'Nome do medicamento muito longo'),
  estado: z.string()
    .length(2, 'Estado deve ter 2 caracteres')
    .regex(/^[A-Z]{2}$/, 'Estado deve estar em maiúsculas')
    .optional()
    .default('SP')
})

export const priceAnalysisQuerySchema = z.object({
  medicamento: z.string()
    .min(2, 'Nome do medicamento muito curto'),
  estado: z.string()
    .length(2, 'Estado inválido')
    .optional()
    .default('SP')
})

// ============================================================================
// SCHEMAS DE UPLOAD
// ============================================================================

export const csvUploadSchema = z.object({
  farmacia_id: uuidSchema,
  validateOnly: z.boolean().optional().default(false),
  skipDuplicates: z.boolean().optional().default(true)
})

// Schema para validar linha do CSV
export const csvRowSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  principio_ativo: z.string().optional(),
  categoria: z.string().optional(),
  codigo_barras: z.string().optional(),
  preco_custo: z.string()
    .transform(val => parseFloat(val.replace(',', '.')))
    .pipe(z.number().min(0, 'Preço de custo deve ser positivo')),
  preco_venda: z.string()
    .transform(val => parseFloat(val.replace(',', '.')))
    .pipe(z.number().min(0, 'Preço de venda deve ser positivo')),
  estoque_atual: z.string()
    .transform(val => parseInt(val))
    .pipe(z.number().int().min(0, 'Estoque deve ser positivo')),
  estoque_minimo: z.string()
    .transform(val => val ? parseInt(val) : 0)
    .pipe(z.number().int().min(0))
    .optional(),
  data_validade: z.string()
    .optional()
    .transform(val => val && val.trim() ? val : undefined),
  lote: z.string().optional(),
  fabricante: z.string().optional()
})

// ============================================================================
// SCHEMAS DE DASHBOARD
// ============================================================================

export const dashboardQuerySchema = z.object({
  farmacia_id: uuidSchema.optional(), // Opcional pois vem do contexto de auth
  periodo: z.enum(['hoje', 'semana', 'mes', 'ano']).optional().default('mes')
})

export const expiringProductsQuerySchema = z.object({
  farmacia_id: uuidSchema.optional(), // Opcional pois vem do contexto de auth
  dias: z.string()
    .transform(val => parseInt(val))
    .pipe(z.number().int().min(1).max(365))
    .optional()
    .default("60")
})

// ============================================================================
// SCHEMAS DE USUÁRIOS E PERMISSÕES
// ============================================================================

export const inviteUserSchema = z.object({
  email: emailSchema,
  role: z.enum(['owner', 'admin', 'staff']),
  permissions: z.array(z.string()).optional().default([])
})

export const updateUserRoleSchema = z.object({
  user_id: uuidSchema,
  role: z.enum(['admin', 'staff']), // Owner não pode ser alterado
  permissions: z.array(z.string()).optional()
})

export const updateUserPermissionsSchema = z.object({
  user_id: uuidSchema,
  permissions: z.array(z.string())
})

// ============================================================================
// SCHEMAS DE CONFIGURAÇÕES
// ============================================================================

export const updateFarmaciaSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(200, 'Nome muito longo')
    .optional(),
  razao_social: z.string()
    .max(255, 'Razão social muito longa')
    .optional(),
  email: emailSchema.optional(),
  telefone: phoneSchema.optional(),
  endereco: z.object({
    logradouro: z.string().max(255).optional(),
    numero: z.string().max(20).optional(),
    complemento: z.string().max(100).optional(),
    bairro: z.string().max(100).optional(),
    cidade: z.string().max(100).optional(),
    estado: z.string().length(2).optional(),
    cep: z.string().regex(/^\d{5}-?\d{3}$/).optional()
  }).optional()
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Valida e sanitiza dados usando um schema Zod
 */
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const validData = schema.parse(data)
    return { success: true, data: validData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}

/**
 * Middleware para validação de request body
 */
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (data: T, request: NextRequest) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const body = await request.json()
      const result = validateAndSanitize(schema, body)
      
      if (!result.success) {
        return new Response(
          JSON.stringify({
            error: 'VALIDATION_ERROR',
            message: 'Dados inválidos',
            details: result.errors.errors
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      
      return handler(result.data, request)
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'INVALID_JSON',
          message: 'JSON inválido no corpo da requisição'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

/**
 * Middleware para validação de query parameters
 */
export function withQueryValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (query: any, request: NextRequest) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    const { searchParams } = new URL(request.url)
    const queryObject = Object.fromEntries(searchParams.entries())
    
    const result = validateAndSanitize(schema, queryObject)
    
    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: 'Parâmetros de consulta inválidos',
          details: result.errors.errors
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    return handler(result.data, request)
  }
}

/**
 * Formatar erros de validação para exibição amigável
 */
export function formatValidationErrors(errors: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {}
  
  errors.errors.forEach(error => {
    const path = error.path.join('.')
    formatted[path] = error.message
  })
  
  return formatted
}

// ============================================================================
// TIPOS TYPESCRIPT INFERIDOS
// ============================================================================

export type LoginData = z.infer<typeof loginSchema>
export type RegisterUserData = z.infer<typeof registerUserSchema>
export type RegisterFarmaciaData = z.infer<typeof registerFarmaciaSchema>
export type CompleteRegistrationData = z.infer<typeof completeRegistrationSchema>
export type ProductData = z.infer<typeof productSchema>
export type PriceAnalysisData = z.infer<typeof priceAnalysisSchema>
export type CsvUploadData = z.infer<typeof csvUploadSchema>
export type CsvRowData = z.infer<typeof csvRowSchema>
export type DashboardQueryData = z.infer<typeof dashboardQuerySchema>
export type InviteUserData = z.infer<typeof inviteUserSchema>
export type UpdateFarmaciaData = z.infer<typeof updateFarmaciaSchema>