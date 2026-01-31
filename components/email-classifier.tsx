'use client'

import React, { useState, useCallback } from 'react'
import {
  Upload, FileText, Mail, Sparkles, Copy, Check, Loader2, Trash2,
  TrendingUp, BarChart3, ArrowRight, CheckCircle2, AlertCircle,
  Download, User, Calendar, DollarSign, Building2, Tag, Zap,
  MessageSquare, AlertTriangle, Info, ThumbsUp, Timer, Layers,
  ChevronDown, ChevronUp, Edit3, Send, History, Briefcase
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// --- TIPOS DEFINIDOS LOCALMENTE ---
interface ClassificationResult {
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

interface HistoryItem {
  id: string
  fileName: string | null
  preview: string
  result: ClassificationResult
  timestamp: Date
  analyzedAt: string
}

// Configurações Visuais
const toneConfig: any = {
  Urgente: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  Formal: { icon: Briefcase, color: 'text-accent', bg: 'bg-accent/10' },
  Amigavel: { icon: ThumbsUp, color: 'text-success', bg: 'bg-success/10' },
  Neutro: { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted' },
  Critico: { icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/10' },
}

const urgencyConfig: any = {
  Baixa: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/30' },
  Media: { color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/30' },
  Alta: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' },
  Critica: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
}

const priorityConfig: any = {
  Baixa: { color: 'text-muted-foreground', bg: 'bg-muted' },
  Media: { color: 'text-accent', bg: 'bg-accent/10' },
  Alta: { color: 'text-destructive', bg: 'bg-destructive/10' },
}

const complexityConfig: any = {
  Simples: { color: 'text-success', icon: CheckCircle2 },
  Moderada: { color: 'text-warning', icon: Layers },
  Complexa: { color: 'text-destructive', icon: AlertTriangle },
}

export function EmailClassifier() {
  // Estados principais
  const [emailContent, setEmailContent] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ClassificationResult | null>(null)
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null)
  
  // Estados de UI
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'classify' | 'history'>('classify')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [editingResponse, setEditingResponse] = useState(false)
  const [editedResponse, setEditedResponse] = useState('')
  const [expandedSections, setExpandedSections] = useState({
    response: true,
    actions: true,
    entities: false,
    analysis: false,
  })

  // Estatisticas
  const stats = {
    total: history.length,
    productive: history.filter(h => h.result.category === 'Produtivo').length,
    unproductive: history.filter(h => h.result.category === 'Improdutivo').length,
    avgConfidence: history.length > 0 
      ? Math.round(history.reduce((acc, h) => acc + h.result.confidence, 0) / history.length)
      : 0,
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // --- FUNÇÃO DE UPLOAD (ATUALIZADA PARA PDF + PYTHON) ---
  const handleFileUpload = useCallback(async (file: File) => {
    setError(null)
    setFileName(file.name)
    setIsParsing(true) // Mostra loading

    try {
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const text = await file.text()
        setEmailContent(text)
      } 
      else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        // Envia o PDF para o Python extrair o texto
        const formData = new FormData()
        formData.append('file', file)

        console.log("📤 Enviando PDF para processamento no Python...")
        const response = await fetch('http://localhost:8000/api/parse-pdf', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
            throw new Error('Falha ao processar PDF no servidor Python')
        }
        
        const data = await response.json()
        console.log("📄 Texto extraído com sucesso")
        setEmailContent(data.text) // Joga o texto na caixa
      } 
      else {
        setError('Formato não suportado. Use .txt ou .pdf')
        setFileName(null)
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao processar arquivo. Verifique se o terminal do Python está aberto e sem erros.')
      setFileName(null)
    } finally {
      setIsParsing(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  // --- FUNÇÃO DE CLASSIFICAR ---
  const handleClassify = async () => {
    if (!emailContent.trim()) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log("🚀 Iniciando classificação com Python...")
      
      const response = await fetch('http://localhost:8000/api/classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailContent,
          fileName: fileName || undefined,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Erro Python:", errorText)
        throw new Error(`Erro no servidor Python: ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ Sucesso:", data)

      setResult(data.result)
      setAnalyzedAt(data.analyzedAt)
      setEditedResponse(data.result.suggestedResponse)

      // Adicionar ao historico
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        fileName,
        preview: emailContent.slice(0, 100) + (emailContent.length > 100 ? '...' : ''),
        result: data.result,
        timestamp: new Date(),
        analyzedAt: data.analyzedAt,
      }
      setHistory(prev => [historyItem, ...prev].slice(0, 20))
    } catch (err) {
      console.error(err)
      setError('Erro ao conectar com o Python. Verifique se a janela preta do terminal está aberta.')
    } finally {
      setIsLoading(false)
    }
  }

  // Copiar resposta
  const handleCopyResponse = async () => {
    const textToCopy = editingResponse ? editedResponse : result?.suggestedResponse
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Exportar analise
  const handleExport = () => {
    if (!result) return
    const exportData = {
      email: emailContent,
      fileName,
      analysis: result,
      analyzedAt,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analise-email-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Limpar tudo
  const handleClear = () => {
    setEmailContent('')
    setFileName(null)
    setResult(null)
    setError(null)
    setEditingResponse(false)
    setEditedResponse('')
  }

  const loadFromHistory = (item: HistoryItem) => {
    setResult(item.result)
    setAnalyzedAt(item.analyzedAt)
    setEditedResponse(item.result.suggestedResponse)
    setActiveTab('classify')
  }

  return (
    <div className="space-y-6">
      {/* Navegacao por Abas */}
      <div className="flex gap-2 p-1 bg-secondary/50 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('classify')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
            activeTab === 'classify'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Mail className="w-4 h-4 inline-block mr-2" />
          Classificar
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
            activeTab === 'history'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <History className="w-4 h-4 inline-block mr-2" />
          Historico
          {history.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {history.length}
            </Badge>
          )}
        </button>
      </div>

      {/* Dashboard de Estatisticas */}
      {history.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <BarChart3 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Analisados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">{stats.productive}</p>
                  <p className="text-xs text-muted-foreground">Produtivos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <AlertCircle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">{stats.unproductive}</p>
                  <p className="text-xs text-muted-foreground">Improdutivos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <TrendingUp className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.avgConfidence}%</p>
                  <p className="text-xs text-muted-foreground">Confianca Media</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Aba de Classificacao */}
      {activeTab === 'classify' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Painel de Input */}
          <div className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Mail className="w-5 h-5 text-accent" />
                    Conteudo do Email
                  </h3>
                  {(emailContent || fileName) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>

                {/* Zona de Upload */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300",
                    "hover:border-accent/50 hover:bg-accent/5",
                    "border-border/50 bg-secondary/20"
                  )}
                >
                  <input
                    type="file"
                    accept=".txt,.pdf"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-3">
                      {isParsing ? (
                        <Loader2 className="w-10 h-10 text-accent animate-spin" />
                      ) : (
                        <div className="p-3 rounded-full bg-accent/10">
                          <Upload className="w-6 h-6 text-accent" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground">
                          {isParsing ? 'Extraindo texto do arquivo...' : 'Arraste um arquivo ou clique para selecionar'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Suporta arquivos .txt e .pdf
                        </p>
                      </div>
                    </div>
                  </label>
                  {fileName && !isParsing && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-accent" />
                      <span className="text-foreground">{fileName}</span>
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    </div>
                  )}
                </div>

                {/* Divisor */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">ou cole o texto</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>

                {/* Textarea */}
                <Textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Cole o conteudo do email aqui..."
                  className="min-h-[200px] bg-secondary/30 border-border/50 resize-none text-foreground placeholder:text-muted-foreground"
                />

                {/* Erro */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {/* Botao de Classificar */}
                <Button
                  onClick={handleClassify}
                  disabled={isLoading || isParsing || !emailContent.trim()}
                  className="w-full h-12 text-base font-medium bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Classificar Email
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Painel de Resultados */}
          <div className="space-y-4">
            {result ? (
              <>
                {/* Card Principal de Classificacao */}
                <Card className={cn(
                  "border-2 overflow-hidden",
                  result.category === 'Produtivo' 
                    ? "border-success/30 bg-success/5" 
                    : "border-warning/30 bg-warning/5"
                )}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-3 rounded-xl",
                          result.category === 'Produtivo' ? "bg-success/20" : "bg-warning/20"
                        )}>
                          {result.category === 'Produtivo' ? (
                            <CheckCircle2 className="w-8 h-8 text-success" />
                          ) : (
                            <AlertCircle className="w-8 h-8 text-warning" />
                          )}
                        </div>
                        <div>
                          <h3 className={cn(
                            "text-2xl font-bold",
                            result.category === 'Produtivo' ? "text-success" : "text-warning"
                          )}>
                            {result.category}
                          </h3>
                          <p className="text-sm text-muted-foreground">{result.emailType}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-foreground">{result.confidence}%</p>
                        <p className="text-xs text-muted-foreground">Confianca</p>
                      </div>
                    </div>

                    {/* Barra de Confianca */}
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-4">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          result.category === 'Produtivo' ? "bg-success" : "bg-warning"
                        )}
                        style={{ width: `${result.confidence}%` }}
                      />
                    </div>

                    {/* Metricas Rapidas */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className={cn(
                        "p-3 rounded-lg border text-center",
                        toneConfig[result.sentiment.tone].bg,
                        "border-border/30"
                      )}>
                        {React.createElement(toneConfig[result.sentiment.tone].icon, {
                          className: cn("w-5 h-5 mx-auto mb-1", toneConfig[result.sentiment.tone].color)
                        })}
                        <p className={cn("text-sm font-medium", toneConfig[result.sentiment.tone].color)}>
                          {result.sentiment.tone}
                        </p>
                        <p className="text-xs text-muted-foreground">Tom</p>
                      </div>
                      <div className={cn(
                        "p-3 rounded-lg border text-center",
                        urgencyConfig[result.sentiment.urgency].bg,
                        urgencyConfig[result.sentiment.urgency].border
                      )}>
                        <Zap className={cn("w-5 h-5 mx-auto mb-1", urgencyConfig[result.sentiment.urgency].color)} />
                        <p className={cn("text-sm font-medium", urgencyConfig[result.sentiment.urgency].color)}>
                          {result.sentiment.urgency}
                        </p>
                        <p className="text-xs text-muted-foreground">Urgencia</p>
                      </div>
                      <div className="p-3 rounded-lg border border-border/30 bg-secondary/30 text-center">
                        {React.createElement(complexityConfig[result.complexity].icon, {
                          className: cn("w-5 h-5 mx-auto mb-1", complexityConfig[result.complexity].color)
                        })}
                        <p className={cn("text-sm font-medium", complexityConfig[result.complexity].color)}>
                          {result.complexity}
                        </p>
                        <p className="text-xs text-muted-foreground">Complexidade</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tags */}
                {result.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {result.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Resposta Automatica */}
                <Card className="bg-card/50 border-accent/30">
                  <CardContent className="p-4">
                    <button
                      onClick={() => toggleSection('response')}
                      className="w-full flex items-center justify-between mb-3"
                    >
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-accent" />
                        Resposta Automatica Sugerida
                      </h4>
                      {expandedSections.response ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                    
                    {expandedSections.response && (
                      <div className="space-y-3">
                        {editingResponse ? (
                          <Textarea
                            value={editedResponse}
                            onChange={(e) => setEditedResponse(e.target.value)}
                            className="min-h-[150px] bg-secondary/30 border-border/50 text-foreground"
                          />
                        ) : (
                          <div className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                              {editedResponse || result.suggestedResponse}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingResponse(!editingResponse)}
                            className="flex-1"
                          >
                            {editingResponse ? (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Salvar
                              </>
                            ) : (
                              <>
                                <Edit3 className="w-4 h-4 mr-1" />
                                Editar
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyResponse}
                            className="flex-1 bg-transparent"
                          >
                            {copied ? (
                              <>
                                <Check className="w-4 h-4 mr-1 text-success" />
                                Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-1" />
                                Copiar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Usar
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Acoes Sugeridas */}
                {result.suggestedActions.length > 0 && (
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-4">
                      <button
                        onClick={() => toggleSection('actions')}
                        className="w-full flex items-center justify-between mb-3"
                      >
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                          <Zap className="w-5 h-5 text-accent" />
                          Acoes Sugeridas
                        </h4>
                        {expandedSections.actions ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      
                      {expandedSections.actions && (
                        <div className="space-y-2">
                          {result.suggestedActions.map((action, i) => (
                            <div 
                              key={i}
                              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30"
                            >
                              <div className={cn(
                                "w-2 h-2 rounded-full flex-shrink-0",
                                action.priority === 'Alta' ? "bg-destructive" :
                                action.priority === 'Media' ? "bg-warning" : "bg-success"
                              )} />
                              <span className="text-sm text-foreground flex-1">{action.action}</span>
                              <Badge 
                                variant="secondary" 
                                className={cn("text-xs", priorityConfig[action.priority].bg, priorityConfig[action.priority].color)}
                              >
                                {action.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Entidades Detectadas */}
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-4">
                    <button
                      onClick={() => toggleSection('entities')}
                      className="w-full flex items-center justify-between mb-3"
                    >
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <User className="w-5 h-5 text-accent" />
                        Entidades Detectadas
                      </h4>
                      {expandedSections.entities ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                    
                    {expandedSections.entities && (
                      <div className="grid grid-cols-2 gap-3">
                        {result.entities.people.length > 0 && (
                          <div className="p-3 rounded-lg bg-secondary/30">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-accent" />
                              <span className="text-xs font-medium text-muted-foreground uppercase">Pessoas</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {result.entities.people.map((p, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {result.entities.dates.length > 0 && (
                          <div className="p-3 rounded-lg bg-secondary/30">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-accent" />
                              <span className="text-xs font-medium text-muted-foreground uppercase">Datas</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {result.entities.dates.map((d, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{d}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {result.entities.values.length > 0 && (
                          <div className="p-3 rounded-lg bg-secondary/30">
                            <div className="flex items-center gap-2 mb-2">
                              <DollarSign className="w-4 h-4 text-accent" />
                              <span className="text-xs font-medium text-muted-foreground uppercase">Valores</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {result.entities.values.map((v, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{v}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {result.entities.organizations.length > 0 && (
                          <div className="p-3 rounded-lg bg-secondary/30">
                            <div className="flex items-center gap-2 mb-2">
                              <Building2 className="w-4 h-4 text-accent" />
                              <span className="text-xs font-medium text-muted-foreground uppercase">Organizacoes</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {result.entities.organizations.map((o, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{o}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Analise Detalhada */}
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-4">
                    <button
                      onClick={() => toggleSection('analysis')}
                      className="w-full flex items-center justify-between mb-3"
                    >
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <Info className="w-5 h-5 text-accent" />
                        Analise Detalhada
                      </h4>
                      {expandedSections.analysis ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                    
                    {expandedSections.analysis && (
                      <div className="space-y-4">
                        <div>
                          <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2">Raciocinio</h5>
                          <p className="text-sm text-foreground leading-relaxed">{result.reasoning}</p>
                        </div>
                        
                        {result.keyPoints.length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2">Pontos-Chave</h5>
                            <ul className="space-y-1">
                              {result.keyPoints.map((point, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                  <ArrowRight className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex items-center gap-4 pt-2 border-t border-border/30">
                          <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Tempo estimado:</span>
                            <span className="text-sm font-medium text-foreground">{result.estimatedResponseTime}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Botao de Exportar */}
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="w-full bg-transparent"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Analise (JSON)
                </Button>
              </>
            ) : (
              <Card className="bg-card/50 border-border/50 h-full min-h-[400px] flex items-center justify-center">
                <CardContent className="text-center p-8">
                  <div className="p-4 rounded-full bg-accent/10 w-fit mx-auto mb-4">
                    <Sparkles className="w-10 h-10 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Pronto para Analisar
                  </h3>
                  <p className="text-muted-foreground max-w-xs mx-auto">
                    Cole o conteudo de um email ou faca upload de um arquivo para ver a analise completa com IA.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Aba de Historico */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhuma analise realizada
                </h3>
                <p className="text-muted-foreground">
                  As analises de emails aparecerao aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <Card 
                  key={item.id}
                  className={cn(
                    "bg-card/50 border-border/50 hover:border-accent/30 transition-colors cursor-pointer",
                  )}
                  onClick={() => loadFromHistory(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              item.result.category === 'Produtivo' 
                                ? "bg-success/10 text-success" 
                                : "bg-warning/10 text-warning"
                            )}
                          >
                            {item.result.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {item.result.emailType}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {item.result.confidence}% confianca
                          </span>
                        </div>
                        {item.fileName && (
                          <p className="text-sm font-medium text-foreground flex items-center gap-1 mb-1">
                            <FileText className="w-3 h-3" />
                            {item.fileName}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground truncate">
                          {item.preview}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}