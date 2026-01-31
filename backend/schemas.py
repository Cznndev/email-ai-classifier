from pydantic import BaseModel, Field
from typing import List, Literal

# --- Sub-modelos ---

class Sentiment(BaseModel):
    tone: Literal["Urgente", "Formal", "Amigavel", "Neutro", "Critico"]
    urgency: Literal["Baixa", "Media", "Alta", "Critica"]

class Entity(BaseModel):
    people: List[str] = Field(description="Nomes de pessoas mencionadas")
    dates: List[str] = Field(description="Datas mencionadas")
    values: List[str] = Field(description="Valores monetarios ou numericos importantes")
    organizations: List[str] = Field(description="Empresas ou organizacoes mencionadas")

class SuggestedAction(BaseModel):
    action: str
    priority: Literal["Baixa", "Media", "Alta"]

# --- Modelo Principal de Resultado ---

class ClassificationResult(BaseModel):
    category: Literal["Produtivo", "Improdutivo"]
    # AQUI ESTAVA O ERRO: Removemos o Field(ge=0, le=100) e deixamos apenas int
    confidence: int = Field(description="Nivel de confianca de 0 a 100")
    
    sentiment: Sentiment
    emailType: Literal[
        'Solicitacao', 'Follow-up', 'Informativo', 'Reclamacao',
        'Agradecimento', 'Convite', 'Notificacao', 'Outro'
    ]
    tags: List[str]
    entities: Entity
    reasoning: str
    keyPoints: List[str]
    suggestedActions: List[SuggestedAction]
    suggestedResponse: str
    estimatedResponseTime: str
    complexity: Literal["Simples", "Moderada", "Complexa"]

# --- Request e Response da API ---

class ClassifyRequest(BaseModel):
    emailContent: str
    fileName: str | None = None

class ClassifyResponse(BaseModel):
    success: bool
    result: ClassificationResult
    analyzedAt: str