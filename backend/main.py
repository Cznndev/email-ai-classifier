import os
import datetime
import json
import io
import re
import time
import uvicorn
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from dotenv import load_dotenv
from google.api_core import exceptions as google_exceptions

from schemas import ClassifyRequest, ClassifyResponse, ClassificationResult

# --- CONFIGURAÇÃO ---
load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY") or os.environ.get("GOOGLE_API_KEY")

if not API_KEY:
    print("❌ ERRO: Sem API KEY.")

genai.configure(api_key=API_KEY)

app = FastAPI(title="Email AI Classifier Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lista de modelos para tentar (do mais novo/rápido para o mais antigo/compatível)
MODEL_CANDIDATES = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-1.0-pro'
]

def clean_json_string(text: str) -> str:
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    start = text.find('{')
    end = text.rfind('}') + 1
    if start != -1 and end != -1:
        text = text[start:end]
    return text.strip()

def try_generate_content(prompt):
    """
    Tenta gerar conteúdo usando uma lista de modelos.
    Se um falhar (404 ou 429), pula para o próximo.
    """
    last_error = None
    
    for model_name in MODEL_CANDIDATES:
        try:
            print(f"🔄 Tentando modelo: {model_name}...")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            print(f"✅ Sucesso com o modelo: {model_name}")
            return response
        except Exception as e:
            error_msg = str(e)
            print(f"⚠️ Falha no modelo {model_name}: {error_msg}")
            
            # Se for erro de cota (429) ou não encontrado (404), continua.
            # Se for outro erro, talvez valha a pena continuar também.
            last_error = e
            time.sleep(1) # Espera 1seg antes de tentar o próximo
            
    # Se sair do loop, todos falharam
    raise last_error

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
        print(f"\n--- 📩 Processando Email (Modo Robusto) ---")
        
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
        {request.emailContent}
        """

        # Usa a função de tentativa e erro
        response = try_generate_content(prompt)
        
        cleaned_text = clean_json_string(response.text)
        json_result = json.loads(cleaned_text)
        
        return ClassifyResponse(
            success=True,
            result=json_result,
            analyzedAt=datetime.datetime.now().isoformat()
        )

    except Exception as e:
        print(f"❌ ERRO FATAL: Todos os modelos falharam. {e}")
        raise HTTPException(status_code=500, detail=f"Erro no processamento de IA: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)