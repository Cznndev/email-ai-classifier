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

# --- CONFIGURAÇÃO ---
load_dotenv()

# Tenta pegar a chave de várias formas para garantir
API_KEY = os.getenv("GOOGLE_API_KEY") or os.environ.get("GOOGLE_API_KEY")

if not API_KEY:
    print("❌ ERRO CRÍTICO: Variável GOOGLE_API_KEY não encontrada.")
    # Não vamos travar o app aqui para permitir debug nos logs
else:
    print(f"🔑 API Key encontrada: {API_KEY[:5]}...******")

genai.configure(api_key=API_KEY)

app = FastAPI(title="Email AI Classifier Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- FUNÇÃO INTELIGENTE PARA ESCOLHER O MODELO ---
def get_best_model():
    """
    Lista os modelos disponíveis na conta e escolhe o melhor.
    Isso evita o erro 404 se o nome mudar na região do servidor.
    """
    try:
        print("\n🔍 Buscando modelos disponíveis na sua conta...")
        available_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                available_models.append(m.name)
                print(f"   - Encontrado: {m.name}")
        
        # Prioridade de escolha
        for model_name in available_models:
            if 'gemini-1.5-flash' in model_name: return model_name
        
        for model_name in available_models:
            if 'gemini-pro' in model_name: return model_name
            
        # Se não achou nenhum conhecido, pega o primeiro da lista
        if available_models:
            return available_models[0]
            
        return 'gemini-pro' # Última esperança
        
    except Exception as e:
        print(f"⚠️ Erro ao listar modelos (Provável erro de Chave API): {e}")
        return 'gemini-pro'

# Define o modelo dinamicamente
selected_model_name = get_best_model()
print(f"🏆 Modelo Selecionado para uso: {selected_model_name}\n")
model = genai.GenerativeModel(selected_model_name)

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
        print(f"\n--- 📩 Processando Email ---")
        
        prompt = f"""
        Você é um classificador de emails. Responda APENAS com JSON.
        Formato obrigatório:
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

        response = model.generate_content(prompt)
        cleaned_text = clean_json_string(response.text)
        json_result = json.loads(cleaned_text)
        
        print(f"✅ Classificado: {json_result.get('category')}")
        
        return ClassifyResponse(
            success=True,
            result=json_result,
            analyzedAt=datetime.datetime.now().isoformat()
        )

    except Exception as e:
        print(f"❌ ERRO: {e}")
        raise HTTPException(status_code=500, detail=f"Erro no servidor: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)