import os
import datetime
import json
import io
import re
import requests  # <--- NOVA BIBLIOTECA
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

def clean_json_string(text: str) -> str:
    # Limpa marcadores de markdown que o Gemini adora colocar
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    start = text.find('{')
    end = text.rfind('}') + 1
    if start != -1 and end != -1:
        text = text[start:end]
    return text.strip()

# --- CLASSIFICAÇÃO VIA HTTP DIRETO (SEM SDK) ---
def classify_with_http(email_content: str, api_key: str):
    """
    Faz a chamada direta para a API REST do Google.
    Isso evita erros de versão da biblioteca Python (404/429).
    """
    # URL oficial da API REST
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    headers = {
        "Content-Type": "application/json"
    }
    
    prompt = f"""
    Analise o email abaixo e responda APENAS com um JSON válido.
    Não use Markdown. Não explique nada. Apenas o JSON.
    
    Formato do JSON:
    {{
        "category": "Produtivo" ou "Improdutivo",
        "confidence": 0.9,
        "urgency": "Alta" ou "Média" ou "Baixa",
        "sentiment": "Positivo" ou "Neutro" ou "Negativo",
        "summary": "Resumo em 1 frase",
        "action_suggested": "Ação recomendada",
        "entities": ["Nome", "Empresa", "Data"],
        "draft_response": "Sugestão de resposta"
    }}

    EMAIL:
    {email_content}
    """
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    
    print(f"🔄 Enviando requisição HTTP direta para o Google...")
    response = requests.post(url, headers=headers, json=payload)
    
    if response.status_code != 200:
        print(f"⚠️ Erro na API HTTP: {response.status_code} - {response.text}")
        # Tenta fallback para o modelo Pro se o Flash falhar
        if response.status_code == 404:
             print("🔄 Tentando modelo alternativo (gemini-pro)...")
             url_backup = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={api_key}"
             response = requests.post(url_backup, headers=headers, json=payload)
             if response.status_code != 200:
                 raise Exception(f"Google API Error: {response.text}")
        else:
             raise Exception(f"Google API Error: {response.text}")

    data = response.json()
    
    try:
        # Extrai o texto da resposta complexa do Google
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        return raw_text
    except (KeyError, IndexError) as e:
        print(f"❌ Erro ao ler JSON do Google: {data}")
        raise Exception("Resposta inválida da API do Google")

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
        print(f"\n--- 📩 Processando Email (Modo HTTP Direto) ---")
        
        # Chama nossa função nova
        raw_response = classify_with_http(request.emailContent, API_KEY)
        
        # Limpa e converte
        cleaned_text = clean_json_string(raw_response)
        json_result = json.loads(cleaned_text)
        
        print(f"✅ Sucesso! Categoria: {json_result.get('category')}")
        
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