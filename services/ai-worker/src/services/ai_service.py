import os
import uuid
from typing import List

from dotenv import load_dotenv
from google import genai
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession

from models.domain import GenerationResult
from schemas.contracts import Challenge, LLMResponse
from services.repository import get_ad_content, save_generation_result

# Força a leitura do .env
load_dotenv()

# Inicializa o novo cliente do Gemini puxando a chave da variável de ambiente
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

async def generate_challenges(
    session: AsyncSession, 
    job_id: str, 
    ad_id: str, 
    requested_count: int
) -> List[Challenge]:
    
    # 1. Busca o conteúdo no banco
    content_text = await get_ad_content(session, ad_id)
    if not content_text:
        await save_generation_result(
            session=session, job_id=job_id, ad_id=ad_id, 
            requested_count=requested_count, generated_count=0, 
            status="failed", error_message="Conteúdo do anúncio não encontrado no banco."
        )
        raise ValueError(f"Conteúdo para o ad_id {ad_id} não encontrado.")

    # 2. Monta o Prompt para o Gemini
    prompt = f"""
    Você é um especialista em marketing e criação de quizzes educacionais.
    Com base no texto do anúncio abaixo, gere exatamente {requested_count} perguntas de múltipla escolha.
    
    Texto do anúncio:
    "{content_text}"
    
    Regras estritas:
    - Retorne APENAS um JSON válido. Não inclua blocos de código markdown.
    - Cada pergunta deve ter exatamente 4 opções.
    - A resposta correta deve ser exatamente igual a uma das 4 opções.
    
    EXEMPLO DE FORMATO DE SAÍDA OBRIGATÓRIO:
    {{
      "items": [
        {{
          "question": "Qual benefício foi destacado no anúncio?",
          "options": [
            "Conforto e amortecimento",
            "Baixa resistência",
            "Maior consumo de energia",
            "Uso hospitalar"
          ],
          "correct_answer": "Conforto e amortecimento"
        }}
      ]
    }}
    """

    try:
        # 3. Chama o serviço usando o NOVO SDK
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        # 4. Normaliza a resposta com Pydantic
        llm_data = LLMResponse.model_validate_json(response.text)
        
        # 5. Transforma na entidade oficial do sistema
        oficial_challenges = []
        for item in llm_data.items:
            challenge = Challenge(
                id=f"ch_{uuid.uuid4().hex[:8]}",
                ad_id=ad_id,
                question=item.question,
                options=item.options,
                correct_answer=item.correct_answer,
                source="ai"
            )
            oficial_challenges.append(challenge)
            
        # 6. Registra o sucesso
        await save_generation_result(
            session=session, job_id=job_id, ad_id=ad_id, 
            requested_count=requested_count, generated_count=len(oficial_challenges), 
            status="completed"
        )
        
        return oficial_challenges

    except Exception as e:
        await save_generation_result(
            session=session, job_id=job_id, ad_id=ad_id, 
            requested_count=requested_count, generated_count=0, 
            status="failed", error_message=str(e)
        )
        raise e