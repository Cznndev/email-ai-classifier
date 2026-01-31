// Arquivo: lib/api-config.ts

// 1. Definimos os tipos aqui para garantir que o TypeScript não reclame
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
  suggestedActions: { action: string; priority: 'Baixa' | 'Media' | 'Alta' }[]
  suggestedResponse: string
  estimatedResponseTime: string
  complexity: 'Simples' | 'Moderada' | 'Complexa'
}

export interface ClassifyResponse {
  success: boolean
  result: ClassificationResult
  analyzedAt: string
}

// 2. Esta é a função que o seu botão "Classificar" chama
export async function classifyEmail(data: { emailContent: string; fileName?: string }): Promise<ClassifyResponse> {
  // AQUI ESTÁ O SEGREDO: Chamamos direto o Python (porta 8000)
  // Usamos localhost pois o navegador (client-side) consegue resolver isso bem
  const response = await fetch('http://localhost:8000/api/classify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Erro ao classificar email no Python')
  }

  return response.json()
}

// 3. Função auxiliar para PDF (mantemos para compatibilidade)
export async function parsePdf(file: File): Promise<{ text: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/parse-pdf', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Erro ao processar PDF')
  }

  return response.json()
}