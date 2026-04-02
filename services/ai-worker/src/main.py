import asyncio
import json
import logging
import os
import uuid
from datetime import UTC, datetime
from contextlib import asynccontextmanager
from typing import Any

import pybreaker
from db.session import AsyncSessionLocal, engine
from fastapi import FastAPI, HTTPException
from models.domain import Base
from pydantic import BaseModel, Field
from redis.asyncio import Redis
from services.ai_service import call_llm, generate_challenges
from services.repository import (count_static_challenges,
                                 create_or_update_generation_job,
                                 get_last_generation_result,
                                 save_static_challenges,
                                 update_generation_job_status)
from tenacity import (retry, retry_if_exception_type, stop_after_attempt,
                      wait_exponential)

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("ai-worker")

REDIS_URL = os.getenv("REDIS_QUEUE_URL", "redis://localhost:6379/0")
REFILL_STREAM_KEY = os.getenv("REFILL_STREAM_KEY", "stream:refill_jobs")
POOL_KEY_PREFIX = os.getenv("POOL_KEY_PREFIX", "pool:ad:")
MAX_RETRIES = int(os.getenv("AI_MAX_RETRIES", "3"))
CIRCUIT_FAIL_MAX = int(os.getenv("AI_CIRCUIT_FAIL_MAX", "5"))
CIRCUIT_RESET_TIMEOUT_SEC = int(os.getenv("AI_CIRCUIT_RESET_TIMEOUT_SEC", "60"))
STREAM_BLOCK_MS = int(os.getenv("REDIS_STREAM_BLOCK_MS", "5000"))
AI_DLQ_LIST_KEY = os.getenv("AI_DLQ_LIST_KEY", "dlq:ai:refill")

redis_client: Redis | None = None
last_job_status: dict[str, Any] = {"status": "idle"}
consumer_task: asyncio.Task[Any] | None = None

circuit_breaker = pybreaker.CircuitBreaker(
    fail_max=CIRCUIT_FAIL_MAX,
    reset_timeout=CIRCUIT_RESET_TIMEOUT_SEC,
    exclude=[ValueError],
)


@retry(
    stop=stop_after_attempt(MAX_RETRIES),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
def protected_llm_call(prompt: str):
    return circuit_breaker.call(call_llm, prompt)


class GenerateRequest(BaseModel):
    ad_id: str = Field(..., min_length=1)
    requested_count: int = Field(default=3, ge=1, le=20)
    job_id: str | None = None


async def ensure_schema() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def push_to_dlq(
    payload: dict[str, Any],
    error: str,
    stage: str,
) -> None:
    """Dead Letter Queue (Redis): falhas permanentes no processamento IA/refill."""
    if redis_client is None:
        return
    record = {
        "payload": payload,
        "error": error[:2000],
        "stage": stage,
        "ts": datetime.now(UTC).isoformat(),
    }
    raw = json.dumps(record, default=str)
    await redis_client.rpush(AI_DLQ_LIST_KEY, raw)
    logger.warning("Evento enviado à DLQ (%s): %s", AI_DLQ_LIST_KEY, stage)


async def push_challenges_to_pool(ad_id: str, challenges: list[Any]) -> int:
    if redis_client is None:
        raise RuntimeError("Redis ainda não foi inicializado.")

    pool_key = f"{POOL_KEY_PREFIX}{ad_id}"
    serialized = [challenge.model_dump_json() for challenge in challenges]
    if not serialized:
        return 0
    await redis_client.lpush(pool_key, *serialized)
    return len(serialized)



async def consume_refill_stream() -> None:
    if redis_client is None:
        raise RuntimeError("Redis ainda não foi inicializado.")

    logger.info("Consumidor do stream iniciado em %s", REFILL_STREAM_KEY)
    last_id = "$"

    while True:
        try:
            entries = await redis_client.xread({REFILL_STREAM_KEY: last_id}, block=STREAM_BLOCK_MS, count=1)
            if not entries:
                continue

            for _stream_name, messages in entries:
                for message_id, fields in messages:
                    last_id = message_id
                    payload = {
                        (k.decode() if isinstance(k, bytes) else k): (
                            v.decode() if isinstance(v, bytes) else v
                        )
                        for k, v in fields.items()
                    }
                    logger.info("Job recebido do stream: id=%s payload=%s", message_id, payload)
                    try:
                        await process_job_payload(payload)
                    except Exception:
                        logger.exception(
                            "Falha ao processar job %s", payload.get("job_id")
                        )
        except asyncio.CancelledError:
            logger.info("Consumidor do stream finalizado.")
            raise
        except Exception:
            logger.exception("Erro no loop do consumidor. Reiniciando leitura...")
            await asyncio.sleep(2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client, consumer_task
    await ensure_schema()
    redis_client = Redis.from_url(REDIS_URL, decode_responses=False)
    consumer_task = asyncio.create_task(consume_refill_stream())
    yield
    if consumer_task:
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass
    if redis_client is not None:
        await redis_client.close()


app = FastAPI(title="ai-worker", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, Any]:
    redis_ok = False
    if redis_client is not None:
        redis_ok = bool(await redis_client.ping())

    # Verifica se a última tentativa falhou devido ao Kill Switch
    is_ai_killed = (
        last_job_status.get("status") == "failed" 
        and "Kill Switch ativado" in str(last_job_status.get("error", ""))
    )
    
    # Status global reflete a saúde do Worker
    status = "error" if (not redis_ok or is_ai_killed) else "ok"

    return {
        "status": status,
        "redis": "up" if redis_ok else "down",
        "circuit_breaker": str(circuit_breaker.current_state),
        "last_job_status": last_job_status,
    }


@app.post("/internal/generate")
async def internal_generate(request: GenerateRequest) -> dict[str, Any]:
    payload = request.model_dump()
    payload["job_id"] = payload.get("job_id") or f"manual_{uuid.uuid4().hex[:8]}"
    payload["reason"] = "manual"

    try:
        return await process_job_payload(payload)
    except pybreaker.CircuitBreakerError as exc:
        raise HTTPException(status_code=503, detail=f"Circuit breaker aberto: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/internal/last-job-status")
async def get_last_job_status() -> dict[str, Any]:
    async with AsyncSessionLocal() as session:
        db_last = await get_last_generation_result(session)

    return {
        "memory": last_job_status,
        "database": db_last,
    }

async def process_job_payload(payload: dict[str, Any]) -> dict[str, Any]:
    job_id = str(payload.get("job_id") or f"job_{uuid.uuid4().hex[:8]}")
    ad_id = str(payload.get("ad_id") or "").strip()
    requested_count = int(payload.get("requested_count") or 0)

    if not ad_id or requested_count <= 0:
        raise ValueError("Payload inválido: ad_id e requested_count são obrigatórios.")

    global last_job_status
    last_job_status = {
        "job_id": job_id,
        "ad_id": ad_id,
        "requested_count": requested_count,
        "status": "processing",
    }

    async with AsyncSessionLocal() as session:
        is_enabled = await redis_client.get("feature_flag:ai_enabled")
        if is_enabled == b"false":
            await create_or_update_generation_job(
                session=session, job_id=job_id, ad_id=ad_id,
                requested_count=requested_count, status="failed", reason=str(payload.get("reason") or "refill"),
            )
            last_job_status = {
                "job_id": job_id,
                "status": "failed",
                "error": "Kill Switch ativado: A API do Gemini foi desligada manualmente.",
            }
            raise RuntimeError("Kill Switch ativado: A API do Gemini foi desligada manualmente.")

        static_count = await count_static_challenges(session, ad_id)
        needs_static = static_count == 0
        
        # Pede  mais se o fallback estiver vazio
        total_to_request = requested_count + (3 if needs_static else 0)

        await create_or_update_generation_job(
            session=session, job_id=job_id, ad_id=ad_id,
            requested_count=requested_count, status="processing", reason=str(payload.get("reason") or "refill"),
        )

        try:
            challenges = await generate_challenges(
                session=session,
                job_id=job_id,
                ad_id=ad_id,
                requested_count=total_to_request, 
                llm_callable=protected_llm_call,
            )
            
            pool_challenges = challenges
            if needs_static and len(challenges) > requested_count:
                static_challenges = challenges[-3:] 
                pool_challenges = challenges[:-3]   
                await save_static_challenges(session, ad_id, static_challenges)

            pushed = await push_challenges_to_pool(ad_id, pool_challenges)
            await update_generation_job_status(session, job_id, "completed")

            last_job_status = {
                "job_id": job_id,
                "ad_id": ad_id,
                "requested_count": requested_count,
                "generated_count": len(challenges),
                "pushed_to_pool": pushed,
                "status": "completed",
            }
            return last_job_status
        except Exception as exc:
            await update_generation_job_status(session, job_id, "failed")
            last_job_status = {
                "job_id": job_id,
                "ad_id": ad_id,
                "requested_count": requested_count,
                "status": "failed",
                "error": str(exc),
            }
            try:
                await push_to_dlq(
                    {
                        "job_id": job_id,
                        "ad_id": ad_id,
                        "requested_count": requested_count,
                        "reason": str(payload.get("reason") or ""),
                    },
                    str(exc),
                    "process_job_payload",
                )
            except Exception:
                logger.exception("Falha ao gravar na DLQ após erro de geração")
            raise