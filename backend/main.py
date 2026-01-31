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

@app.post("/api/classify", response_model=ClassifyResponse)
async def classify_email(request: ClassifyRequest):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API Key ausente no ambiente.")

    # URL estável v1 com o modelo gemini-pro (evita o erro 404 do flash)
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key={API_KEY}"
    
    prompt = f"""
    Analise o email e retorne APENAS um JSON:
    {{
        "category": "Produtivo" ou "Improdutivo",
        "confidence": 1.0,
        "urgency": "Alta" ou "Baixa",
        "sentiment": "Positivo" ou "Neutro",
        "summary": "Resumo curto",
        "action_suggested": "Ação imediata",
        "entities": [],
        "draft_response": "Texto da resposta"
    }}
    EMAIL: {request.emailContent}
    """

    try:
        response = requests.post(url, json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ Erro Google: {response.status_code} - {response.text}")
            raise Exception(f"API Error {response.status_code}")

        raw_text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        json_result = json.loads(clean_json_string(raw_text))
        
        return ClassifyResponse(
            success=True,
            result=json_result,
            analyzedAt=datetime.datetime.now().isoformat()
        )
    except Exception as e:
        print(f"❌ Falha: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    try:
        reader = PdfReader(io.BytesIO(await file.read()))
        return {"text": "".join([p.extract_text() for p in reader.pages])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)