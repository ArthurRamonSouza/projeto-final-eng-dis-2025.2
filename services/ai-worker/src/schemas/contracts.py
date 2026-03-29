from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field


# validacao e transformacao da resposta do LLM para o formato oficial do sistema
class LLMChallengeItem(BaseModel):
    """
    Representa a estrutura de um item dentro da resposta formatada esperada da IA.
    O worker é responsável por transformar essa resposta na estrutura oficial do sistema.
    """

    question: str = Field(..., description="Enunciado da pergunta gerada")
    options: list[str] = Field(
        ...,
        min_length=4,
        max_length=4,
        description="Lista contendo as alternativas da pergunta",
    )
    correct_answer: str = Field(..., description="A resposta correta correspondente à pergunta")


class LLMResponse(BaseModel):
    """
    Representa a resposta completa esperada do LLM, que já deve vir formatada.
    """

    items: list[LLMChallengeItem] = Field(
        ...,
        description="Lista contendo as perguntas e opções geradas pelo serviço de IA",
    )


# estrutura salva no pool do redis
class Challenge(BaseModel):
    """
    Entidade principal.
    """

    id: str = Field(..., description="Identificador único obrigatório do desafio")
    ad_id: str = Field(
        ...,
        description="Identificador obrigatório do anúncio ao qual o desafio está associado",
    )
    type: Literal["multiple_choice"] = Field(
        default="multiple_choice",
        description="Regra: O tipo inicialmente deve ser sempre 'multiple_choice' ",
    )
    question: str = Field(..., description="O enunciado do desafio ")
    options: list[str] = Field(
        ...,
        min_length=4,
        max_length=4,
        description="Regra: Deve ser obrigatoriamente um array com exatamente 4 itens ",
    )
    correct_answer: str = Field(..., description="A alternativa designada como correta ")
    source: Literal["ai", "static"] = Field(
        ...,
        description="Regra: A origem do desafio deve ser estritamente 'ai' (gerado) ou 'static' (fallback)",
    )
    status: Literal["available", "used", "failed"] = Field(
        default="available",
        description="Regra: O status de consumo ou falha, podendo ser 'available', 'used' ou 'failed' ",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="A data e hora de criação do registro ",
    )
