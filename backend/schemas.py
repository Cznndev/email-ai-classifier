from pydantic import BaseModel
from typing import List, Optional, Any

# Modelo para receber o pedido (Frontend -> Backend)
class ClassifyRequest(BaseModel):
    emailContent: str

# Modelo para o resultado da IA (IA -> Backend)
class ClassificationResult(BaseModel):
    category: str
    confidence: float          # Mudamos de int para float (aceita 0.95)
    urgency: str
    sentiment: str             # Mudamos para str simples
    summary: str
    action_suggested: str      # Ajustado para o nome que está no prompt
    entities: List[str]        # Lista de strings simples
    draft_response: str

# Modelo final da resposta (Backend -> Frontend)
class ClassifyResponse(BaseModel):
    success: bool
    result: ClassificationResult
    analyzedAt: str