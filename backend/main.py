import os
import datetime
import json
import io
import re
import uvicorn
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from dotenv import load_dotenv

# Importando os schemas
from schemas import ClassifyRequest, ClassifyResponse, ClassificationResult

# --- CONFIGURAÇÃO DE SEGURANÇA (.ENV) ---
load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY")

if not API_KEY:
    # Tenta pegar do ambiente do sistema (caso o .env falhe no Render)
    API_KEY = os.environ.get("GOOGLE_API_KEY")

if not API_KEY:
    print("❌ ERRO CRÍTICO: Variável GOOGLE_API_KEY não encontrada.")
    raise ValueError("A chave de API não foi configurada!")

genai.configure(api_key=API_KEY)

app = FastAPI(title="Email AI Classifier Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MUDANÇA 1: Usando o modelo mais estável (gemini-pro)
model = genai.GenerativeModel('gemini-pro')

def clean_json_string(text: str) -> str:
    """Limpa a resposta da IA para garantir que seja um JSON válido"""
    # Remove crases de markdown
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    # Remove qualquer texto antes da primeira { ou depois da última }
    start = text.find('{')
    end = text.rfind('}') + 1
    if start != -1 and end != -1:
        text = text[start:end]
    return text.strip()

@app.post("/api/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        pdf_file = io.BytesIO(contents)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        print(f"📄 PDF Processado: {len(text)} caracteres")
        return {"text": text}
    except Exception as e:
        print(f"❌ Erro PDF: {e}")
        raise HTTPException(status_code=500, detail="Erro ao ler PDF")

@app.post("/api/classify", response_model=ClassifyResponse)
async def classify_email(request: ClassifyRequest):
    try:
        print(f"\n--- 📩 Processando Email (Modelo: gemini-pro) ---")
        
        # MUDANÇA 2: Prompt reforçado para garantir JSON (já que tiramos a config automática)
        prompt = f"""
        Você é um classificador de emails corporativos.
        Analise o email abaixo e responda ESTRITAMENTE com um objeto JSON.
        NÃO escreva nada além do JSON. Não use Markdown.
        
        O JSON deve seguir exatamente este formato:
        {{
            "category": "Produtivo" ou "Improdutivo",
            "confidence": 0.9,
            "urgency": "Alta" ou "Média" ou "Baixa",
            "sentiment": "Positivo" ou "Neutro" ou "Negativo",
            "summary": "Resumo em 1 frase",
            "action_suggested": "Ação recomendada",
            "entities": ["Nome", "Empresa", "Data"],
            "draft_response": "Sugestão de resposta curta e formal"
        }}

        EMAIL PARA ANALISAR:
        {request.emailContent}
        """

        # Chamada simplificada (sem generation_config que quebra o gemini-pro)
        response = model.generate_content(prompt)

        # Limpeza e Conversão
        cleaned_text = clean_json_string(response.text)
        print(f"🤖 Resposta da IA: {cleaned_text[:50]}...") # Log para debug
        
        json_result = json.loads(cleaned_text)
        
        print(f"✅ Classificado como: {json_result.get('category', 'Desconhecido')}")
        
        return ClassifyResponse(
            success=True,
            result=json_result,
            analyzedAt=datetime.datetime.now().isoformat()
        )

    except Exception as e:
        print(f"❌ ERRO NA CLASSIFICAÇÃO: {e}")
        if "429" in str(e):
            raise HTTPException(status_code=429, detail="Muitas requisições. Aguarde.")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)