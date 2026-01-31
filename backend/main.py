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

load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY") or os.environ.get("GOOGLE_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def clean_json_string(text: str) -> str:
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    start = text.find('{')
    end = text.rfind('}') + 1
    if start != -1 and end != -1:
        text = text[start:end]
    return text.strip()

def call_gemini_api(prompt: str):
    """
    Tenta chamar a API do Google usando diferentes versões de URL 
    para evitar o erro 404 visto nos logs.
    """
    # Testamos primeiro a v1 (estável) e depois a v1beta
    urls = [
        f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={API_KEY}",
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={API_KEY}"
    ]
    
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    last_error = ""

    for url in urls:
        try:
            print(f"🔄 Tentando requisição via: {url.split('models/')[0]}")
            response = requests.post(url, json=payload, timeout=30)
            if response.status_code == 200:
                return response.json()
            last_error = f"{response.status_code}: {response.text}"
        except Exception as e:
            last_error = str(e)
    
    raise Exception(f"Falha em todas as URLs da API. Último erro: {last_error}")

@app.post("/api/classify", response_model=ClassifyResponse)
async def classify_email(request: ClassifyRequest):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="Chave de API não configurada")

    prompt = f"""
    Analise o email e retorne APENAS um JSON válido:
    {{
        "category": "Produtivo" ou "Improdutivo",
        "confidence": 0.95,
        "urgency": "Alta",
        "sentiment": "Positivo",
        "summary": "Resumo aqui",
        "action_suggested": "Ação aqui",
        "entities": ["item1"],
        "draft_response": "Resposta aqui"
    }}
    EMAIL: {request.emailContent}
    """

    try:
        data = call_gemini_api(prompt)
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        json_result = json.loads(clean_json_string(raw_text))
        
        return ClassifyResponse(
            success=True,
            result=json_result,
            analyzedAt=datetime.datetime.now().isoformat()
        )
    except Exception as e:
        print(f"❌ Erro Crítico: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        reader = PdfReader(io.BytesIO(contents))
        text = "".join([page.extract_text() for page in reader.pages])
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)