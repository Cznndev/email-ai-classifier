import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    console.log("🔄 Encaminhando requisição para o Python...")

    // Chama o seu backend Python na porta 8000
    // Usamos 127.0.0.1 ao invés de localhost para evitar erros no Windows
    const pythonResponse = await fetch('http://127.0.0.1:8000/api/classify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text()
      throw new Error(`Erro no Python (${pythonResponse.status}): ${errorText}`)
    }

    const data = await pythonResponse.json()
    console.log("✅ Resposta do Python recebida com sucesso!")
    
    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Erro no Proxy:', error)
    return NextResponse.json(
      { error: 'Erro ao conectar com o servidor Python.' },
      { status: 500 }
    )
  }
}