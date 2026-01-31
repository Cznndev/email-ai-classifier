import os
import datetime
import json
import io
import re
import requests
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from dotenv import load_dotenv
from schemas import ClassifyRequest, ClassifyResponse

# --- CONFIGURAÇÃO ---
load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY") or os.environ.get("GOOGLE_API_KEY")

if not API_KEY:
    print("❌ ERRO CRÍTICO: Variável GOOGLE_API_KEY não encontrada.")

app = FastAPI(title="Email AI Classifier Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# LISTA DE MODELOS PARA TENTAR (Nomes técnicos específicos para evitar 404)
MODEL_VERSIONS = [
    "gemini-1.5-flash-002",  # Versão estável mais nova
    "gemini-1.5-flash-001",  # Versão estável anterior
    "gemini-1.5-flash",      # Apelido padrão
    "gemini-1.5-pro-002",    # Pro novo
    "gemini-1.0-pro"         # Versão legada (tanque de guerra)
]

def clean_json_string(text: str) -> str:
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    start = text.find('{')
    end = text.rfind('}') + 1
    if start != -1 and end != -1:
        text = text[start:end]
    return text.strip()

def classify_with_http_retry(email_content: str, api_key: str):
    """
    Tenta vários modelos em sequência até um funcionar.
    """
    last_error = None
    
    headers = {"Content-Type": "application/json"}
    
    prompt = f"""
    Analise o email e responda APENAS com JSON.
    {{
        "category": "Produtivo" ou "Improdutivo",
        "confidence": 0.9,
        "urgency": "Alta" ou "Média" ou "Baixa",
        "sentiment": "Positivo" ou "Neutro" ou "Negativo",
        "summary": "Resumo rápido",
        "action_suggested": "Ação",
        "entities": ["Entidade1"],
        "draft_response": "Resposta"
    }}
    EMAIL:
    {email_content}
    """
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    
    # Loop de Tentativas
    for model_name in MODEL_VERSIONS:
        try:
            print(f"🔄 Tentando conectar via HTTP no modelo: {model_name}...")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 200:
                print(f"✅ SUCESSO! Conectado ao modelo: {model_name}")
                data = response.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
            
            else:
                print(f"⚠️ Falha no {model_name}: {response.status_code} - {response.text[:100]}...")
                last_error = f"Erro {response.status_code}: {response.text}"
                
        except Exception as e:
            print(f"⚠️ Erro de conexão no {model_name}: {e}")
            last_error = str(e)
            
    # Se sair do loop, tudo falhou
    raise Exception(f"Todas as tentativas falharam. Último erro: {last_error}")

@app.post("/api/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        pdf_file = io.BytesIO(contents)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return {"text": text}
    except Exception as e:
        print(f"❌ Erro PDF: {e}")
        raise HTTPException(status_code=500, detail="Erro ao ler PDF")

@app.post("/api/classify", response_model=ClassifyResponse)
async def classify_email(request: ClassifyRequest):
    try:
        print(f"\n--- 📩 Processando Email (Modo Multi-Modelo) ---")
        
        raw_response = classify_with_http_retry(request.emailContent, API_KEY)
        
        cleaned_text = clean_json_string(raw_response)
        json_result = json.loads(cleaned_text)
        
        return ClassifyResponse(
            success=True,
            result=json_result,
            analyzedAt=datetime.datetime.now().isoformat()
        )

    except Exception as e:
        print(f"❌ ERRO FATAL: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)