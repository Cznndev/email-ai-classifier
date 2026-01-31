# 📧 EmailAI - Classificador Inteligente de Emails

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/backend-FastAPI-009688.svg)
![Frontend](https://img.shields.io/badge/frontend-Next.js-black.svg)
![AI](https://img.shields.io/badge/AI-Google%20Gemini-orange.svg)

> Uma solução Fullstack moderna para triagem automática de emails corporativos, capaz de ler PDFs, analisar sentimentos e sugerir respostas usando Inteligência Artificial Generativa.

---

## 📸 Demonstração

![Interface do Projeto](./public/demo-screenshot.png)

## 🚀 Funcionalidades

- **🧠 Classificação Inteligente:** Identifica automaticamente se um email é `Produtivo` ou `Improdutivo`.
- **📄 Leitura de PDF:** Suporte nativo para upload e extração de texto de arquivos PDF.
- **📊 Análise Profunda:** Detecta urgência, tom de voz (sentimento) e extrai entidades (Nomes, Datas, Valores).
- **✍️ Resposta Automática:** A IA redige uma sugestão de resposta profissional baseada no contexto.
- **⚡ Arquitetura Moderna:** Frontend reativo em Next.js e Backend robusto em Python/FastAPI.

## 🛠️ Tecnologias Utilizadas

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Estilização:** Tailwind CSS + Shadcn/ui
- **Ícones:** Lucide React
- **Linguagem:** TypeScript

### Backend
- **Framework:** FastAPI (Python)
- **IA:** Google Gemini 1.5 Flash (via Google Generative AI SDK)
- **Processamento de Arquivos:** PyPDF
- **Servidor:** Uvicorn

---

## 📦 Como Rodar o Projeto

Siga os passos abaixo para rodar a aplicação em seu ambiente local.

### Pré-requisitos
- Node.js (v18+)
- Python (v3.10+)

### 1. Configuração do Backend (API)

```bash
# Entre na pasta do backend
cd backend

# Crie um ambiente virtual (Opcional, mas recomendado)
python -m venv venv
# Ative o venv:
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# Instale as dependências
pip install -r requirements.txt

# Configure a chave de API
# 1. Crie um arquivo .env na pasta backend
# 2. Adicione sua chave: GOOGLE_API_KEY="sua_chave_aqui"

# Inicie o servidor
python main.py