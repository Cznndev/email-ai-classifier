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
from schemas import ClassifyRequest, ClassifyResponse

load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY") or os.environ.get("GOOGLE_API_KEY")

# Configuração da SDK oficial (mais estável que chamadas HTTP manuais para o Gemini)
genai.configure(api_key=API_KEY)

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
    try:
        # Usando o modelo Flash 1.5 estável
        # Esta chamada via SDK evita o erro 404 de URL manual
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        Analise o email e retorne APENAS um objeto JSON válido:
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

        response = model.generate_content(prompt)
        
        if not response.text:
            raise Exception("Resposta vazia da IA")

        json_result = json.loads(clean_json_string(response.text))
        
        return ClassifyResponse(
            success=True,
            result=json_result,
            analyzedAt=datetime.datetime.now().isoformat()
        )
    except Exception as e:
        print(f"❌ Erro na Classificação: {str(e)}")
        # Tratamento para erro de cota (429) visto nos logs
        if "429" in str(e):
             raise HTTPException(status_code=429, detail="Limite de requisições atingido. Tente em 1 minuto.")
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