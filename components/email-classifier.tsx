"use client"

import { useState, useRef } from "react"
import { 
  Loader2, Send, FileText, Upload, CheckCircle2, 
  AlertCircle, Copy, Check, RefreshCcw, History, Clock, Info, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

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

interface HistoryItem {
  id: string
  date: string
  preview: string
  result: ClassificationResult
}

export function EmailClassifier() {
  const [emailContent, setEmailContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ClassificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  // Novo estado para controlar o balão da ação
  const [showActionTooltip, setShowActionTooltip] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setLoading(true)
    setError(null)
    try {
      if (file.type === "application/pdf") {
        const formData = new FormData()
        formData.append("file", file)
        const response = await fetch(`${API_BASE}/api/parse-pdf`, { method: "POST", body: formData })
        if (!response.ok) throw new Error("Falha ao ler o PDF")
        const data = await response.json()
        setEmailContent(data.text)
      } else {
        const text = await file.text()
        setEmailContent(text)
      }
    } catch (err) {
      setError("Erro ao ler arquivo.")
    } finally {
      setLoading(false)
    }
  }

  const handleClassify = async () => {
    if (!emailContent.trim()) {
      setError("Insira o conteúdo do email.")
      return
    }
    setLoading(true)
    setError(null)
    setShowActionTooltip(false) // Reseta o tooltip
    
    try {
      const response = await fetch(`${API_BASE}/api/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailContent }),
      })

      if (!response.ok) throw new Error(`Erro no servidor: ${response.status}`)
      
      const data = await response.json()
      
      if (data.success && data.result) {
        const newResult = data.result
        setResult(newResult)
        
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          preview: emailContent.slice(0, 40) + "...",
          result: newResult
        }
        setHistory(prev => [newItem, ...prev])
      } else {
        throw new Error("Resposta inválida da IA.")
      }
    } catch (err) {
      setError("Erro ao classificar. Verifique a conexão.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadHistoryItem = (item: HistoryItem) => {
    setResult(item.result)
    setShowActionTooltip(false)
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
    setShowActionTooltip(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Coluna Esquerda */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Entrada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`relative rounded-xl border-2 border-dashed p-6 transition-colors ${fileName ? "border-success/50 bg-success/5" : "border-muted-foreground/20 hover:border-primary/50"}`}>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.pdf" className="absolute inset-0 cursor-pointer opacity-0" />
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">{fileName || "Arraste PDF ou TXT"}</p>
              </div>
            </div>
            
            <div className="relative">
              <Textarea
                placeholder="Ou cole o texto do email aqui..."
                className="min-h-[200px] resize-none bg-background/50"
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="ghost" onClick={clearAll} size="sm" className="flex-1">
              Limpar
            </Button>
            <Button onClick={handleClassify} disabled={loading || !emailContent} className="flex-[2] bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Classificar
            </Button>
          </CardFooter>
        </Card>

        {history.length > 0 && (
          <Card className="border-border/50 bg-card/30">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <History className="h-4 w-4" />
                Histórico da Sessão
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[200px]">
                <div className="flex flex-col">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => loadHistoryItem(item)}
                      className="flex flex-col gap-1 border-b border-border/50 p-4 text-left hover:bg-accent/50 transition-colors last:border-0"
                    >
                      <div className="flex items-center justify-between w-full">
                        <Badge variant={item.result.category === "Produtivo" ? "default" : "secondary"} className="text-[10px] h-5 px-2">
                          {item.result.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {item.date}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1 font-mono opacity-80">
                        {item.preview}
                      </p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Coluna Direita */}
      <div className="lg:col-span-2 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!result && !loading && (
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/10 bg-muted/5 p-8 text-center">
            <div className="rounded-full bg-muted/20 p-6 mb-4">
              <RefreshCcw className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-medium text-foreground">Pronto para analisar</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Envie um email para ver a classificação da IA em tempo real.
            </p>
          </div>
        )}

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm shadow-xl relative">
              <div className={`h-1.5 w-full ${result.category === "Produtivo" ? "bg-success" : "bg-warning"}`} />
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge 
                        className={`px-3 py-1 text-sm ${
                          result.category === "Produtivo" 
                            ? "bg-success/20 text-success hover:bg-success/30" 
                            : "bg-warning/20 text-warning hover:bg-warning/30"
                        }`}
                      >
                        {result.category}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        Confiança: {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">
                      {result.summary}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3 items-start">
                <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Urgência</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`h-2 w-2 rounded-full ${
                      result.urgency === "Alta" ? "bg-destructive animate-pulse" : 
                      result.urgency === "Média" ? "bg-warning" : "bg-success"
                    }`} />
                    <span className="font-semibold">{result.urgency}</span>
                  </div>
                </div>
                
                <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sentimento</span>
                  <div className="mt-1 font-semibold">{result.sentiment}</div>
                </div>
                
                {/* --- BOTÃO DE AÇÃO COM POPOVER --- */}
                <div 
                  className="relative rounded-lg bg-muted/30 p-3 border border-border/50 cursor-pointer transition-all hover:bg-muted/50 hover:border-primary/20 group select-none"
                  onClick={() => setShowActionTooltip(!showActionTooltip)}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ação Sugerida</span>
                    <Info className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </div>
                  {/* Texto cortado (Layout bonito) */}
                  <div className="mt-1 font-semibold truncate text-sm">
                    {result.action_suggested}
                  </div>

                  {/* O Balão Flutuante (Aparece ao clicar) */}
                  {showActionTooltip && (
                    <div className="absolute top-full right-0 mt-2 w-[280px] sm:w-[350px] z-50 p-4 rounded-xl border bg-popover text-popover-foreground shadow-2xl animate-in fade-in zoom-in-95 ring-1 ring-border">
                       <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold text-primary uppercase">Texto Completo</span>
                          <X className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" />
                       </div>
                       <p className="text-sm leading-relaxed text-foreground">
                         {result.action_suggested}
                       </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="response" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/30">
                <TabsTrigger value="response">Sugestão de Resposta</TabsTrigger>
                <TabsTrigger value="details">Entidades e Detalhes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="response" className="mt-4">
                <Card className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between py-3 bg-muted/10">
                    <CardTitle className="text-sm font-medium">Rascunho Automático</CardTitle>
                    <Button variant="ghost" size="icon" h-8 w-8 onClick={copyResponse}>
                      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap bg-card">
                      {result.draft_response}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="details" className="mt-4">
                <Card className="border-border/50">
                  <CardContent className="pt-6 space-y-6">
                    <div>
                      <h4 className="mb-3 text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Ação Recomendada Completa
                      </h4>
                      <div className="rounded-lg bg-accent/5 p-4 text-sm border border-accent/20">
                        {result.action_suggested}
                      </div>
                    </div>
                    
                    {result.entities.length > 0 && (
                      <div>
                        <h4 className="mb-3 text-sm font-medium text-muted-foreground">Entidades Identificadas</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.entities.map((entity, i) => (
                            <Badge key={i} variant="outline" className="bg-background hover:bg-accent cursor-default py-1.5 px-3">
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