"""Classificação de erros transitórios para retentativas ao chamar a API LLM (Gemini / HTTP)."""

from __future__ import annotations

import httpx
import pybreaker
from google.api_core import exceptions as google_exceptions

# Erros de rede/transporte comuns a clientes HTTP (incl. OpenAI, Gemini via httpx).
_HTTPS_TRANSIENT = (
    httpx.ConnectError,
    httpx.ConnectTimeout,
    httpx.ReadTimeout,
    httpx.WriteTimeout,
    httpx.PoolTimeout,
    httpx.RemoteProtocolError,
    httpx.NetworkError,
)

# Erros típicos de APIs Google / throttling / indisponibilidade temporária.
_GOOGLE_TRANSIENT = (
    google_exceptions.ServiceUnavailable,
    google_exceptions.TooManyRequests,
    google_exceptions.InternalServerError,
    google_exceptions.DeadlineExceeded,
    google_exceptions.GatewayTimeout,
    google_exceptions.BadGateway,
)


def is_transient_llm_error(exc: BaseException) -> bool:
    """
    Indica se o erro merece nova tentativa com backoff exponencial.

    Não retentar: circuit breaker aberto, erros de validação/negócio.
    Retentar: falhas de rede, timeouts, 429/503, etc.
    """
    if isinstance(exc, pybreaker.CircuitBreakerError):
        return False
    if isinstance(exc, ValueError | TypeError | KeyError):
        return False

    current: BaseException | None = exc
    seen: set[int] = set()
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if isinstance(current, _HTTPS_TRANSIENT):
            return True
        if isinstance(current, _GOOGLE_TRANSIENT):
            return True
        if isinstance(current, TimeoutError | ConnectionError | OSError):
            return True
        current = current.__cause__

    return False
