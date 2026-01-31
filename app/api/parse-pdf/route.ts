import pdf from 'pdf-parse'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return Response.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    if (!file.name.endsWith('.pdf') && file.type !== 'application/pdf') {
      return Response.json(
        { error: 'O arquivo deve ser um PDF' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const data = await pdf(buffer)
    
    return Response.json({ 
      success: true,
      text: data.text,
      numPages: data.numpages,
      info: data.info
    })
  } catch (error) {
    console.error('PDF parsing error:', error)
    return Response.json(
      { error: 'Erro ao processar o arquivo PDF. Por favor, tente novamente.' },
      { status: 500 }
    )
  }
}
