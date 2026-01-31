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

# --- VARIÁVEL GLOBAL PARA GUARDAR O MODELO QUE FUNCIONA ---
# O servidor vai preencher isso assim que ligar
ACTIVE_MODEL_NAME = None

def get_available_model(api_key):
    """
    Pergunta ao Google quais modelos estão disponíveis para esta chave/região.
    Retorna o nome técnico exato do primeiro modelo compatível.
    """
    print("🔍 Consultando lista de modelos disponíveis no Google...")
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    
    try:
        response = requests.get(url)
        if response.status_code != 200:
            print(f"⚠️ Erro ao listar modelos: {response.status_code} - {response.text}")
            return "gemini-1.5-flash" # Fallback cego
            
        data = response.json()
        models = data.get('models', [])
        
        # Procura um modelo que sirva para 'generateContent'
        candidates = []
        for m in models:
            if 'generateContent' in m.get('supportedGenerationMethods', []):
                name = m['name'].replace('models/', '') # Remove o prefixo 'models/'
                candidates.append(name)
                print(f"   - Encontrado: {name}")

        # Prioridade de escolha (do mais leve para o mais pesado)
        preferred_order = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.0-pro', 'gemini-pro']
        
        # 1. Tenta achar um dos preferidos na lista real
        for pref in preferred_order:
            for cand in candidates:
                if pref in cand:
                    print(f"🏆 Modelo escolhido (Por preferência): {cand}")
                    return cand
        
        # 2. Se não achar nenhum preferido, pega o primeiro da lista que seja 'gemini'
        for cand in candidates:
            if 'gemini' in cand:
                print(f"⚠️ Modelo escolhido (Primeiro disponível): {cand}")
                return cand
                
        return "gemini-1.5-flash" # Última esperança
        
    except Exception as e:
        print(f"❌ Erro na conexão de listagem: {e}")
        return "gemini-1.5-flash"

# Inicializa o modelo ao ligar o servidor
if API_KEY:
    ACTIVE_MODEL_NAME = get_available_model(API_KEY)
else:
    ACTIVE_MODEL_NAME = "gemini-1.5-flash"

def clean_json_string(text: str) -> str:
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    start = text.find('{')
    end = text.rfind('}') + 1
    if start != -1 and end != -1:
        text = text[start:end]
    return text.strip()

def classify_email_logic(email_content: str, api_key: str, model_name: str):
    headers = {"Content-Type": "application/json"}
    
    # URL dinâmica baseada no modelo descoberto
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    
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
    {email_content}
    """
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    
    print(f"🔄 Enviando para modelo: {model_name}...")
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    
    if response.status_code == 200:
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]
    else:
        raise Exception(f"Erro Google ({response.status_code}): {response.text}")

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
        
        # Usa o modelo que descobrimos no início, ou tenta descobrir de novo se falhou antes
        global ACTIVE_MODEL_NAME
        if not ACTIVE_MODEL_NAME:
            ACTIVE_MODEL_NAME = get_available_model(API_KEY)
            
        raw_response = classify_email_logic(request.emailContent, API_KEY, ACTIVE_MODEL_NAME)
        
        cleaned_text = clean_json_string(raw_response)
        json_result = json.loads(cleaned_text)
        
        print(f"✅ Sucesso! Categoria: {json_result.get('category')}")
        
        return ClassifyResponse(
            success=True,
            result=json_result,
            analyzedAt=datetime.datetime.now().isoformat()
        )

    except Exception as e:
        print(f"❌ ERRO: {e}")
        # Se der erro 404 mesmo com o modelo listado, tenta resetar a descoberta
        if "404" in str(e):
             print("⚠️ Erro 404 detectado. Forçando nova busca de modelos na próxima requisição.")
             ACTIVE_MODEL_NAME = None 
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)