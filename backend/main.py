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

app = FastAPI(title="Email AI Classifier Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variável para guardar o modelo estável escolhido
ACTIVE_MODEL_NAME = None

def get_safe_model(api_key):
    """
    Filtra modelos para evitar o erro 429 visto nos logs (gemini-2.5-flash).
    """
    print("🔍 Buscando modelos estáveis para evitar erros de cota...")
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    
    try:
        response = requests.get(url)
        if response.status_code != 200:
            return "gemini-1.5-flash"
            
        data = response.json()
        candidates = [m['name'].replace('models/', '') for m in data.get('models', []) 
                     if 'generateContent' in m.get('supportedGenerationMethods', [])]

        # LISTA DE PRIORIDADE: Ignora '2.5' e 'experimental' para evitar erro 429
        # Baseado no log: gemini-2.5-flash deu erro de cota (limit 0)
        priority = ["gemini-1.5-flash", "gemini-1.5-flash-001", "gemini-1.0-pro"]
        
        for p in priority:
            if p in candidates:
                print(f"✅ Selecionado modelo estável: {p}")
                return p
        
        return "gemini-1.5-flash"
    except:
        return "gemini-1.5-flash"

def clean_json_string(text: str) -> str:
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
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
        text = "".join([page.extract_text() + "\n" for page in reader.pages])
        return {"text": text}
    except:
        raise HTTPException(status_code=500, detail="Erro no PDF")

@app.post("/api/classify", response_model=ClassifyResponse)
async def classify_email(request: ClassifyRequest):
    try:
        global ACTIVE_MODEL_NAME
        if not ACTIVE_MODEL_NAME:
            ACTIVE_MODEL_NAME = get_safe_model(API_KEY)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{ACTIVE_MODEL_NAME}:generateContent?key={API_KEY}"
        
        prompt = f"Analise o email e retorne APENAS um JSON: {{'category': 'Produtivo'|'Improdutivo', 'confidence': 0.9, 'urgency': 'Alta'|'Média'|'Baixa', 'sentiment': 'Positivo'|'Neutro'|'Negativo', 'summary': 'Resumo', 'action_suggested': 'Ação', 'entities': [], 'draft_response': 'Resposta'}}. EMAIL: {request.emailContent}"
        
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        response = requests.post(url, json=payload, timeout=30)
        
        if response.status_code != 200:
            # Se o modelo atual falhar (ex: erro 429), tenta resetar para a próxima
            ACTIVE_MODEL_NAME = None 
            raise Exception(f"Erro na API: {response.status_code}")

        raw_text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        json_result = json.loads(clean_json_string(raw_text))
        
        return ClassifyResponse(
            success=True,
            result=json_result,
            analyzedAt=datetime.datetime.now().isoformat()
        )
    except Exception as e:
        print(f"❌ ERRO: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)