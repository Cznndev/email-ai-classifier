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
# Tenta pegar a chave do .env ou das variáveis de ambiente do Render
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

@app.post("/api/classify", response_model=ClassifyResponse)
async def classify_email(request: ClassifyRequest):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API Key não configurada")

    # URL v1 estável para evitar o erro 404 visto nos logs
    model = "gemini-1.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent?key={API_KEY}"
    
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

    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        
        # Se der erro 404 ou 429, registra o erro exato para debug
        if response.status_code != 200:
            print(f"❌ Erro na API Google: {response.status_code} - {response.text}")
            raise Exception(f"Google API retornou {response.status_code}")

        data = response.json()
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        json_result = json.loads(clean_json_string(raw_text))
        
        return ClassifyResponse(
            success=True,
            result=json_result,
            analyzedAt=datetime.datetime.now().isoformat()
        )
    except Exception as e:
        print(f"❌ Falha técnica: {str(e)}")
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