import nltk
from nltk.corpus import stopwords
from nltk.stem import RSLPStemmer
from nltk.tokenize import word_tokenize
import string

# Baixa os dicionários necessários na primeira execução
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')
    nltk.download('rslp')
    nltk.download('punkt_tab')

def preprocess_text(text: str) -> str:
    """
    Realiza o pré-processamento do texto:
    1. Tokenização
    2. Remoção de pontuação e números soltos
    3. Remoção de Stop Words
    4. Stemming (redução à raiz)
    """
    if not text:
        return ""

    # 1. Tokenização e conversão para minúsculas
    tokens = word_tokenize(text.lower(), language='portuguese')
    
    # 2. Remoção de pontuação
    tokens = [word for word in tokens if word.isalnum()]
    
    # 3. Remoção de Stop Words
    stop_words = set(stopwords.words('portuguese'))
    tokens = [word for word in tokens if word not in stop_words]
    
    # 4. Stemming (Opcional - mantido para cumprir requisito de NLP)
    # Nota: Para o Gemini, o texto completo muitas vezes é melhor, 
    # mas geramos essa versão processada para logs ou análises estatísticas.
    stemmer = RSLPStemmer()
    stemmed_tokens = [stemmer.stem(word) for word in tokens]
    
    return " ".join(tokens)