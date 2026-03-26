from datetime import datetime, timezone
from typing import List, Literal

from pydantic import BaseModel, Field


# Validação e transformação da resposta do LLM para o contrato oficial do desafio
class LLMChallengeItem(BaseModel):
    """
    Representa a estrutura de um item individual dentro da resposta normalizada esperada do serviço externo de IA.
    O worker é responsável por transformar essa resposta no contrato oficial de desafio.
    """
    question: str = Field(..., description="Enunciado da pergunta gerada")
    options: List[str] = Field(..., min_length=4, max_length=4, description="Lista contendo as alternativas da pergunta")
    correct_answer: str = Field(..., description="A resposta correta correspondente à pergunta")

class LLMResponse(BaseModel):
    """
    Representa o contrato da resposta completa esperada do LLM, que já deve vir normalizada.
    """
    items: List[LLMChallengeItem] = Field(..., description="Lista contendo as perguntas e opções geradas pelo serviço de IA")

# Estrutura salva no pool do Redis para consumo da API 
class Challenge(BaseModel):
    """
    Entidade oficial do Desafio.
    Este é o contrato principal estabelecido entre Worker, Redis, PostgreSQL, API e frontend.
    """
    id: str = Field(..., description="Identificador único obrigatório do desafio")
    ad_id: str = Field(..., description="Identificador obrigatório do anúncio ao qual o desafio está associado")
    type: Literal["multiple_choice"] = Field(
        default="multiple_choice", 
        description="Regra: O tipo inicialmente deve ser sempre 'multiple_choice' "
    )
    question: str = Field(..., description="O enunciado do desafio ")
    options: List[str] = Field(
        ..., 
        min_length=4, 
        max_length=4, 
        description="Regra: Deve ser obrigatoriamente um array com exatamente 4 itens "
    )
    correct_answer: str = Field(..., description="A alternativa designada como correta ")
    source: Literal["ai", "static"] = Field(
        ..., 
        description="Regra: A origem do desafio deve ser estritamente 'ai' (gerado) ou 'static' (fallback)"
    )
    status: Literal["available", "used", "failed"] = Field(
        default="available", 
        description="Regra: O status de consumo ou falha, podendo ser 'available', 'used' ou 'failed' "
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), 
        description="A data e hora de criação do registro "
    )