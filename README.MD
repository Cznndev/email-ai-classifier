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
O servidor iniciará em http://localhost:8000

2. Configuração do Frontend (Interface)
Bash

# Em um novo terminal, volte para a raiz do projeto (se estiver na pasta backend)
cd ..

# Instale as dependências do Node.js
npm install

# Inicie o servidor de desenvolvimento
npm run dev
Acesse a aplicação em http://localhost:3000

🔒 Segurança
Este projeto utiliza variáveis de ambiente para proteger chaves sensíveis.

O arquivo .env contendo a GOOGLE_API_KEY não é enviado para o GitHub.

Utilize o arquivo .env.example como referência para criar sua própria configuração localmente.

🧪 Decisões Técnicas
Google Gemini 1.5 Flash: Escolhido por ser um modelo leve, rápido e com excelente janela de contexto, ideal para classificação de texto em tempo real sem custos elevados.

FastAPI: Utilizado pela sua performance (assíncrona) e pela facilidade de criar documentação automática, além de ser o padrão de mercado para microsserviços de IA em Python.

Next.js 14: Garante uma interface reativa, otimizada e moderna, com renderização do lado do servidor (SSR) para melhor performance.

👨‍💻 Autor
Desenvolvido por Caio Higino De Oliveira