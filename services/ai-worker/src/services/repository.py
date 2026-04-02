import uuid
from typing import Any

from sqlalchemy import desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.domain import AdContent, GenerationJob, GenerationResult, StaticChallenge
from schemas.contracts import Challenge


async def get_ad_content(session: AsyncSession, ad_id: str) -> str | None:
    stmt = select(AdContent).where(AdContent.ad_id == ad_id)
    result = await session.execute(stmt)
    ad_content = result.scalar_one_or_none()
    return ad_content.content_text if ad_content else None


async def save_generation_result(
    session: AsyncSession,
    job_id: str,
    ad_id: str,
    requested_count: int,
    generated_count: int,
    status: str,
    error_message: str | None = None,
) -> GenerationResult:
    new_result = GenerationResult(
        id=f"gen_{uuid.uuid4().hex[:8]}",
        job_id=job_id,
        ad_id=ad_id,
        requested_count=requested_count,
        generated_count=generated_count,
        status=status,
        error_message=error_message,
    )
    session.add(new_result)
    await session.commit()
    await session.refresh(new_result)
    return new_result


async def create_or_update_generation_job(
    session: AsyncSession,
    job_id: str,
    ad_id: str,
    requested_count: int,
    status: str,
    reason: str | None = None,
) -> GenerationJob:
    stmt = select(GenerationJob).where(GenerationJob.job_id == job_id)
    result = await session.execute(stmt)
    job = result.scalar_one_or_none()

    if job is None:
        job = GenerationJob(
            job_id=job_id,
            ad_id=ad_id,
            requested_count=requested_count,
            reason=reason,
            status=status,
        )
        session.add(job)
    else:
        job.status = status
        job.reason = reason or job.reason
        job.requested_count = requested_count
        job.ad_id = ad_id

    await session.commit()
    await session.refresh(job)
    return job


async def update_generation_job_status(
    session: AsyncSession,
    job_id: str,
    status: str,
) -> GenerationJob | None:
    stmt = select(GenerationJob).where(GenerationJob.job_id == job_id)
    result = await session.execute(stmt)
    job = result.scalar_one_or_none()
    if job is None:
        return None

    job.status = status
    await session.commit()
    await session.refresh(job)
    return job


async def get_last_generation_result(session: AsyncSession) -> dict[str, Any] | None:
    stmt = select(GenerationResult).order_by(desc(GenerationResult.created_at)).limit(1)
    result = await session.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        return None

    return {
        "id": row.id,
        "job_id": row.job_id,
        "ad_id": row.ad_id,
        "requested_count": row.requested_count,
        "generated_count": row.generated_count,
        "status": row.status,
        "error_message": row.error_message,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


async def count_static_challenges(session: AsyncSession, ad_id: str) -> int:
    stmt = select(func.count()).select_from(StaticChallenge).where(StaticChallenge.ad_id == ad_id)
    result = await session.execute(stmt)
    return result.scalar() or 0


async def save_static_challenges(session: AsyncSession, ad_id: str, challenges: list[Challenge]) -> None:
    for c in challenges:
        new_static = StaticChallenge(
            id=f"st_{uuid.uuid4().hex[:8]}",
            ad_id=ad_id,
            type=c.type,
            question=c.question,
            options_json=c.options,
            correct_answer=c.correct_answer,
            source="static",
            status="active",
        )
        session.add(new_static)
    await session.commit()
