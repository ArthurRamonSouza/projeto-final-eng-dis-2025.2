import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.domain import AdContent, GenerationResult


async def get_ad_content(session: AsyncSession, ad_id: str) -> str | None:
    """
    Busca o texto base do anúncio na tabela ad_contents para enviar como contexto para a IA.
    """
    stmt = select(AdContent).where(AdContent.ad_id == ad_id)
    
    # Executa a query de forma assíncrona
    result = await session.execute(stmt)
    ad_content = result.scalar_one_or_none()
    
    if ad_content:
        return ad_content.content_text
    return None

async def save_generation_result(
    session: AsyncSession,
    job_id: str,
    ad_id: str,
    requested_count: int,
    generated_count: int,
    status: str,
    error_message: str | None = None
) -> GenerationResult:
    """
    Registra o resultado final do processamento (sucesso ou falha) na tabela generation_results .
    """
    new_result = GenerationResult(
        id=f"gen_{uuid.uuid4().hex[:8]}",  
        job_id=job_id, 
        ad_id=ad_id,
        requested_count=requested_count, 
        generated_count=generated_count, 
        status=status, 
        error_message=error_message 
    )
    
    # Adiciona na sessão e commita no banco de dados
    session.add(new_result)
    await session.commit()
    await session.refresh(new_result)
    
    return new_result