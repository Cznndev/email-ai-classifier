import google.generativeai as genai

# Sua chave atual
API_KEY = "AIzaSyBr590b-0o7hsUYrmPsrmRtTSirnD8e1zQ"
genai.configure(api_key=API_KEY)

print("\n--- CONSULTANDO MODELOS DISPONÍVEIS ---")
try:
    # Lista todos os modelos que sua chave pode acessar
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ Disponível: {m.name}")
            
except Exception as e:
    print(f"❌ Erro ao listar: {e}")
    
print("\n---------------------------------------")