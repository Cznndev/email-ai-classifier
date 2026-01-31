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

model = genai.GenerativeModel('gemini-1.5-flash')

# Função auxiliar para limpar o JSON que a IA devolve
def clean_json_string(text: str) -> str:
    # Remove blocos de código markdown (```json ... ```)
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    return text.strip()

# --- ROTA 1: LER PDF ---
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

# --- ROTA 2: CLASSIFICAR EMAIL ---
@app.post("/api/classify", response_model=ClassifyResponse)
async def classify_email(request: ClassifyRequest):
    try:
        print(f"\n--- 📩 Processando Email ---")
        
        prompt = f"""
        Analise o email abaixo e responda APENAS com um JSON.
        
        Classifique como: 'Produtivo' (trabalho, projetos, urgente) ou 'Improdutivo' (spam, pessoal, newsletters).
        
        EMAIL:
        {request.emailContent}
        """

        # Configuração para forçar JSON e reduzir bloqueios de segurança
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=ClassificationResult
            )
        )

        # Limpeza e Conversão do Resultado
        cleaned_text = clean_json_string(response.text)
        json_result = json.loads(cleaned_text)
        
        print(f"✅ Classificado como: {json_result.get('category', 'Desconhecido')}")
        
        return ClassifyResponse(
            success=True,
            result=json_result,
            analyzedAt=datetime.datetime.now().isoformat()
        )

    except Exception as e:
        print(f"❌ ERRO NA CLASSIFICAÇÃO: {e}")
        # Se a IA bloquear o conteúdo (comum em spam), devolvemos um erro legível
        if "429" in str(e):
            raise HTTPException(status_code=429, detail="Muitas requisições. Tente de novo em 1 minuto.")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)