import re
import string

# NLTK foi removido para evitar erros de download (Erro 403)
# O Gemini funciona muito bem (até melhor) com o texto original.

def preprocess_text(text: str) -> str:
    """
    Realiza uma limpeza básica no texto sem depender de bibliotecas externas.
    """
    if not text:
        return ""

    # 1. Conversão para minúsculas
    text = text.lower()
    
    # 2. Remover caracteres estranhos/pontuação (mantém letras e números)
    # Regex simples para limpar sujeira
    text = re.sub(r'[^\w\s]', ' ', text)
    
    # 3. Remover espaços duplos criados pela remoção acima
    # Exemplo: "ola   mundo" vira "ola mundo"
    clean_text = " ".join(text.split())
    
    return clean_text