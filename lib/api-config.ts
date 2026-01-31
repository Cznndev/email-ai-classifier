/**
 * Configuracao da API - Facilita integracao com backend Python
 * 
 * Para usar com backend Python:
 * 1. Defina NEXT_PUBLIC_API_URL no .env.local
 * 2. Exemplo: NEXT_PUBLIC_API_URL=http://localhost:8000
 * 
 * O backend Python deve implementar os seguintes endpoints:
 * - POST /api/classify - Classificacao de emails
 * - POST /api/parse-pdf - Extracao de texto de PDFs (opcional)
 */

// URL base da API - pode ser alterada para apontar para backend Python
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

// Endpoints da API
export const API_ENDPOINTS = {
  classify: `${API_BASE_URL}/api/classify`,
  parsePdf: `${API_BASE_URL}/api/parse-pdf`,
} as const

// Tipos para integracao
export interface ClassifyRequest {
  emailContent: string
  fileName?: string
}

export interface SuggestedAction {
  action: string
  priority: 'Baixa' | 'Media' | 'Alta'
}

export interface ClassificationResult {
  category: 'Produtivo' | 'Improdutivo'
  confidence: number
  sentiment: {
    tone: 'Urgente' | 'Formal' | 'Amigavel' | 'Neutro' | 'Critico'
    urgency: 'Baixa' | 'Media' | 'Alta' | 'Critica'
  }
  emailType: string
  tags: string[]
  entities: {
    people: string[]
    dates: string[]
    values: string[]
    organizations: string[]
  }
  reasoning: string
  keyPoints: string[]
  suggestedActions: SuggestedAction[]
  suggestedResponse: string
  estimatedResponseTime: string
  complexity: 'Simples' | 'Moderada' | 'Complexa'
}

export interface ClassifyResponse {
  success: boolean
  result: ClassificationResult
  analyzedAt: string
  metadata?: {
    model: string
    provider: string
    version: string
  }
}

export interface ApiError {
  error: string
  details?: string
}

// Funcao helper para fazer requisicoes
export async function classifyEmail(request: ClassifyRequest): Promise<ClassifyResponse> {
  const response = await fetch(API_ENDPOINTS.classify, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error: ApiError = await response.json()
    throw new Error(error.error || 'Erro ao classificar email')
  }

  return response.json()
}

export async function parsePdf(file: File): Promise<{ text: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(API_ENDPOINTS.parsePdf, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error: ApiError = await response.json()
    throw new Error(error.error || 'Erro ao processar PDF')
  }

  return response.json()
}
