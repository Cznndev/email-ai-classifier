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

# Variável para guardar o modelo escolhido
ACTIVE_MODEL_NAME = None

def get_safe_model(api_key):
    """
    Busca modelos disponíveis e filtra APENAS os gratuitos/seguros.
    Evita pegar modelos experimentais (2.5, exp) que dão erro de cota.
    """
    print("🔍 Consultando Google para encontrar modelos GRATUITOS...")
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    
    try:
        response = requests.get(url)
        if response.status_code != 200:
            print(f"⚠️ Erro ao listar: {response.status_code}. Usando fallback.")
            return "gemini-1.5-flash"
            
        data = response.json()
        candidates = []
        
        # Limpa os nomes (tira o prefixo 'models/')
        for m in data.get('models', []):
            if 'generateContent' in m.get('supportedGenerationMethods', []):
                name = m['name'].replace('models/', '')
                candidates.append(name)
                print(f"   - Disponível: {name}")

        # --- LÓGICA DE SELEÇÃO ESTRITA ---
        # Ordem de preferência: Flash (Rápido/Gratis) -> 1.5 Pro -> 1.0 Pro
        # IGNORA modelos experimentais ou muito novos que não têm free tier
        
        keywords_priority = [
            "gemini-1.5-flash",      # O melhor para esse app
            "gemini-1.5-pro-001",    # Estável
            "gemini-1.0-pro"         # O clássico indestrutível
        ]
        
        for keyword in keywords_priority:
            for cand in candidates:
                # Se o candidato contém a palavra chave E NÃO É experimental
                if keyword in cand and "experimental" not in cand and "2.5" not in cand:
                    print(f"✅ MODELO SEGURO ESCOLHIDO: {cand}")
                    return cand
        
        # Se não achou nenhum perfeito, tenta qualquer Flash
        for cand in candidates:
            if "flash" in cand and "8b" not in cand: # 8b as vezes é restrito
                 print(f"⚠️ Modelo alternativo escolhido: {cand}")
                 return cand

        # Se tudo der errado, chuta o flash padrão
        return "gemini-1.5-flash"
        
    except Exception as e:
        print(f"❌ Erro na seleção: {e}")
        return "gemini-1.5-flash"

# Inicializa
if API_KEY:
    ACTIVE_MODEL_NAME = get_safe_model(API_KEY)

def clean_json_string(text: str) -> str:
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    start = text.find('{')
    end = text.rfind('}') + 1
    if start != -1 and end != -1:
        text = text[start:end]
    return text.strip()

def classify_email_http(email_content: str, api_key: str, model_name: str):
    headers = {"Content-Type": "application/json"}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    
    prompt = f"""
    Analise este email e responda APENAS um JSON válido.
    {{
        "category": "Produtivo" ou "Improdutivo",
        "confidence": 0.9,
        "urgency": "Alta" ou "Média" ou "Baixa",
        "sentiment": "Positivo" ou "Neutro" ou "Negativo",
        "summary": "Resumo",
        "action_suggested": "Ação",
        "entities": ["Entidade"],
        "draft_response": "Resposta"
    }}
    EMAIL:
    {email_content}
    """
    
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    
    print(f"🚀 Enviando para {model_name}...")
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    
    if response.status_code == 200:
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]
    elif response.status_code == 429:
        raise Exception("Erro de Cota (429). O modelo escolhido está lotado.")
    else:
        raise Exception(f"Erro Google {response.status_code}: {response.text}")

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
        
        global ACTIVE_MODEL_NAME
        if not ACTIVE_MODEL_NAME:
            ACTIVE_MODEL_NAME = get_safe_model(API_KEY)
            
        raw_response = classify_email_http(request.emailContent, API_KEY, ACTIVE_MODEL_NAME)
        
        cleaned_text = clean_json_string(raw_response)
        json_result = json.loads(cleaned_text)
        
        print(f"✅ Sucesso! {json_result.get('category')}")
        
        return ClassifyResponse(
            success=True,
            result=json_result,
            analyzedAt=datetime.datetime.now().isoformat()
        )

    except Exception as e:
        print(f"❌ ERRO: {e}")
        # Se der cota ou 404, reseta para tentar achar outro modelo na próxima vez
        if "429" in str(e) or "404" in str(e):
            ACTIVE_MODEL_NAME = None
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)