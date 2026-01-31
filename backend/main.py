import os
import datetime
import json
import io
import uvicorn
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from dotenv import load_dotenv  # Importa a biblioteca que lê o .env

# Importando os módulos locais
from schemas import ClassifyRequest, ClassifyResponse, ClassificationResult
from nlp_utils import preprocess_text

# --- CONFIGURAÇÃO DE SEGURANÇA (.ENV) ---
# 1. Carrega as variáveis do arquivo .env
load_dotenv()

# 2. Busca a chave no sistema
API_KEY = os.getenv("GOOGLE_API_KEY")

# 3. Validação de Segurança: Se não achar a chave, o programa avisa e para.
if not API_KEY:
    print("❌ ERRO CRÍTICO: Variável GOOGLE_API_KEY não encontrada.")
    print("👉 Crie um arquivo chamado .env na pasta backend e adicione: GOOGLE_API_KEY='sua_chave'")
    raise ValueError("A chave de API não foi configurada!")

# 4. Configura o Gemini com a chave segura
genai.configure(api_key=API_KEY)

# Inicializando o App FastAPI
app = FastAPI(title="Email AI Classifier Backend")

# --- CONFIGURAÇÃO DE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelo (usando o alias estável e gratuito)
model = genai.GenerativeModel('gemini-flash-latest')

# --- ROTA 1: LER PDF ---
@app.post("/api/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    try:
        # Lê o arquivo PDF na memória
        contents = await file.read()
        pdf_file = io.BytesIO(contents)
        
        # Extrai texto usando PyPDF
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
            
        print(f"📄 PDF Processado. Tamanho extraído: {len(text)} caracteres")
        return {"text": text}
        
    except Exception as e:
        print(f"❌ Erro ao ler PDF: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar o arquivo PDF")

# --- ROTA 2: CLASSIFICAR EMAIL ---
@app.post("/api/classify", response_model=ClassifyResponse)
async def classify_email(request: ClassifyRequest):
    try:
        print(f"\n--- 📩 Novo Email Recebido ---")
        print(f"Conteúdo: {request.emailContent[:60]}...")

        # Prompt Otimizado para o Gemini
        prompt = f"""
        Você é um classificador de emails corporativos.
        Analise o texto abaixo e gere um JSON estrito seguindo o schema.
        
        CONTEXTO:
        - Classifique como 'Produtivo' (trabalho/ação necessária) ou 'Improdutivo'.
        - Analise o sentimento e extraia dados importantes.
        
        EMAIL:
        {request.emailContent}
        """

        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=ClassificationResult
            )
        )

        json_result = json.loads(response.text)
        print("✅ Classificação realizada com sucesso!")
        
        return ClassifyResponse(
            success=True,
            result=json_result,
            analyzedAt=datetime.datetime.now().isoformat()
        )

    except Exception as e:
        print(f"❌ ERRO NO PYTHON: {e}")
        # Tratamento específico para erro de limite de cota (429)
        if "429" in str(e):
            print("⚠️ AVISO: Limite de requisições excedido. Aguarde um momento.")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Inicia o servidor
    uvicorn.run(app, host="0.0.0.0", port=8000)