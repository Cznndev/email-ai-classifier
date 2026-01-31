import React from 'react'
import { EmailClassifier } from '@/components/email-classifier'
import {
  Mail,
  Zap,
  Brain,
  Shield,
  Github,
  Sparkles,
  Tags,
  Users,
  FileSearch,
  MessageSquareText,
  BarChart2,
  Clock,
} from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                <Mail className="h-5 w-5 text-accent" />
              </div>
              <span className="text-lg font-semibold text-foreground">EmailAI</span>
              <span className="hidden sm:inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                Pro
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/Cznndev/email-ai-classifier"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-4 w-4" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative overflow-hidden pt-16">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-3xl" />
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-success/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-0 w-[300px] h-[300px] bg-warning/5 rounded-full blur-3xl" />
        </div>

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-2 text-sm backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-success pulse-glow" />
              <span className="text-muted-foreground">Classificador de Emails com Inteligência Artificial</span>
            </div>

            {/* Heading */}
            <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-balance">
              <span className="text-foreground">Análise completa de emails com </span>
              <span className="gradient-text">IA Avançada</span>
            </h1>

            {/* Subheading */}
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed text-pretty">
              Classifique emails como <span className="text-success font-medium">Produtivo</span> ou{' '}
              <span className="text-warning font-medium">Improdutivo</span>, detecte sentimentos, extraia entidades e
              receba respostas automáticas personalizadas.
            </p>

            {/* Feature Grid */}
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 max-w-4xl mx-auto">
              <FeatureCard icon={Brain} text="Classificação IA" />
              <FeatureCard icon={MessageSquareText} text="Resposta Automática" />
              <FeatureCard icon={BarChart2} text="Análise Sentimento" />
              <FeatureCard icon={Users} text="Detecção Entidades" />
              <FeatureCard icon={Tags} text="Tags Automáticas" />
              <FeatureCard icon={FileSearch} text="Ações Sugeridas" />
            </div>

            {/* Smaller Pills - ATUALIZADO AQUI */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <FeaturePill icon={Zap} text="Gemini Powered" />
              <FeaturePill icon={Shield} text="Análise Precisa" />
              <FeaturePill icon={Clock} text="Tempo Estimado" />
              <FeaturePill icon={Sparkles} text="Export JSON" />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="relative h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </header>

      {/* Main Content */}
      <main className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <EmailClassifier />
      </main>

      {/* Footer - ATUALIZADO AQUI */}
      <footer className="relative border-t border-border/30 mt-12">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <Mail className="h-4 w-4 text-accent" />
              </div>
              <span className="font-semibold text-foreground">EmailAI</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>Desenvolvido para o Desafio Técnico</span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:inline">Next.js + Python + Google Gemini</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="group flex flex-col items-center gap-2 rounded-xl border border-border/30 bg-card/30 p-4 backdrop-blur-sm hover:border-accent/30 hover:bg-card/50 transition-all cursor-default">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <span className="text-xs font-medium text-muted-foreground text-center group-hover:text-foreground transition-colors">
        {text}
      </span>
    </div>
  )
}

function FeaturePill({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border/20 bg-secondary/30 px-3 py-1.5 text-xs backdrop-blur-sm">
      <Icon className="h-3 w-3 text-accent" />
      <span className="text-muted-foreground">{text}</span>
    </div>
  )
}