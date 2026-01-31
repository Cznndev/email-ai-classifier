"use client"

import { useState, useRef } from "react"
import { 
  Loader2, 
  Send, 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Copy, 
  Check, 
  RefreshCcw 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// --- CONFIGURAÇÃO DA API (PRODUÇÃO VS LOCALHOST) ---
// Se existir uma variável de ambiente (no Render), usa ela. Se não, usa localhost.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface ClassificationResult {
  category: "Produtivo" | "Improdutivo"
  confidence: number
  urgency: "Baixa" | "Média" | "Alta"
  sentiment: "Positivo" | "Neutro" | "Negativo"
  summary: string
  action_suggested: string
  entities: string[]
  draft_response: string
}

export function EmailClassifier() {
  const [emailContent, setEmailContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ClassificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)

  // Função para ler arquivos (PDF ou TXT)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      if (file.type === "application/pdf") {
        // Envia PDF para o backend processar
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch(`${API_BASE}/api/parse-pdf`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) throw new Error("Falha ao ler o PDF")

        const data = await response.json()
        setEmailContent(data.text)
      } else {
        // Lê arquivo de texto direto no navegador
        const text = await file.text()
        setEmailContent(text)
      }
    } catch (err) {
      setError("Erro ao ler o arquivo. Tente copiar e colar o texto.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Função Principal: Enviar para Classificação
  const handleClassify = async () => {
    if (!emailContent.trim()) {
      setError("Por favor, insira o conteúdo do email.")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`${API_BASE}/api/classify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emailContent }),
      })

      if (!response.ok) {
        throw new Error("Falha na conexão com o servidor.")
      }

      const data = await response.json()
      
      if (data.success && data.result) {
        setResult(data.result)
      } else {
        throw new Error("Resposta inválida da IA.")
      }
    } catch (err) {
      setError("Erro ao classificar. Verifique se o Backend (Python) está rodando.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const copyResponse = () => {
    if (result?.draft_response) {
      navigator.clipboard.writeText(result.draft_response)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const clearAll = () => {
    setEmailContent("")
    setResult(null)
    setError(null)
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Coluna da Esquerda: Entrada */}
      <div className="space-y-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Conteúdo do Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className={`relative rounded-xl border-2 border-dashed p-8 transition-colors ${
                fileName ? "border-success/50 bg-success/5" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/5"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.pdf"
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <div className="rounded-full bg-background p-3 shadow-sm ring-1 ring-border">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {fileName ? fileName : "Solte seu arquivo aqui"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fileName ? "Clique para trocar" : "Suporta PDF ou TXT"}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-3 left-4 bg-background px-2 text-xs text-muted-foreground">
                Ou cole o texto
              </div>
              <Textarea
                placeholder="Cole o corpo do email aqui para análise..."
                className="min-h-[300px] resize-none border-border/50 bg-background/50 text-base leading-relaxed focus:border-primary focus:ring-1 focus:ring-primary"
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-3 border-t border-border/50 bg-muted/20 p-4">
            <Button variant="ghost" onClick={clearAll} disabled={loading}>
              Limpar
            </Button>
            <Button 
              onClick={handleClassify} 
              disabled={loading || !emailContent} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Classificar com IA
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Coluna da Direita: Resultados */}
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-bottom-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!result && !loading && (
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/20 bg-muted/5 p-8 text-center text-muted-foreground">
            <div className="mb-4 rounded-full bg-muted/10 p-4">
              <RefreshCcw className="h-8 w-8 opacity-20" />
            </div>
            <h3 className="text-lg font-medium">Aguardando Análise</h3>
            <p className="text-sm">Envie um email para ver a mágica acontecer.</p>
          </div>
        )}

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-6">
            {/* Cartão de Resumo */}
            <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
              <div className={`h-2 w-full ${result.category === "Produtivo" ? "bg-success" : "bg-warning"}`} />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={result.category === "Produtivo" ? "default" : "secondary"}
                    className={`px-4 py-1.5 text-sm font-semibold ${
                      result.category === "Produtivo" 
                        ? "bg-success/15 text-success hover:bg-success/25" 
                        : "bg-warning/15 text-warning hover:bg-warning/25"
                    }`}
                  >
                    {result.category}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">
                    Confiança: {Math.round(result.confidence * 100)}%
                  </span>
                </div>
                <CardTitle className="mt-4 text-2xl">
                  {result.category === "Produtivo" ? "Email de Trabalho" : "Email Pessoal/Spam"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {result.summary}
                </p>
                
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="space-y-1 rounded-lg bg-muted/30 p-3">
                    <span className="text-xs font-medium text-muted-foreground">Urgência</span>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${
                        result.urgency === "Alta" ? "bg-destructive animate-pulse" : 
                        result.urgency === "Média" ? "bg-warning" : "bg-success"
                      }`} />
                      <span className="font-semibold">{result.urgency}</span>
                    </div>
                  </div>
                  <div className="space-y-1 rounded-lg bg-muted/30 p-3">
                    <span className="text-xs font-medium text-muted-foreground">Sentimento</span>
                    <p className="font-semibold">{result.sentiment}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Abas para Detalhes e Resposta */}
            <Tabs defaultValue="response" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="response">Sugestão de Resposta</TabsTrigger>
                <TabsTrigger value="details">Detalhes & Entidades</TabsTrigger>
              </TabsList>
              
              <TabsContent value="response" className="mt-4">
                <Card className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Rascunho Automático
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={copyResponse}>
                      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg bg-muted/30 p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                      {result.draft_response}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="details" className="mt-4">
                <Card className="border-border/50">
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-muted-foreground">Ação Sugerida</h4>
                      <div className="flex items-start gap-2 rounded-lg bg-accent/10 p-3 text-sm text-accent-foreground">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                        {result.action_suggested}
                      </div>
                    </div>
                    
                    {result.entities.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-sm font-medium text-muted-foreground">Entidades Identificadas</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.entities.map((entity, i) => (
                            <Badge key={i} variant="outline" className="bg-background">
                              {entity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}