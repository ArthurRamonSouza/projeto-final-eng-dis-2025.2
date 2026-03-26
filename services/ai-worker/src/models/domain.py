from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP

from db.session import Base


class AdContent(Base):
    """
    Tabela que armazena o conteúdo textual do anúncio que servirá de base para a IA.
    """
    __tablename__ = "ad_contents"

    id = Column(String, primary_key=True, index=True)
    ad_id = Column(String, index=True)
    content_type = Column(String)
    content_text = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

class GenerationResult(Base):
    """
    Tabela de log persistida pelo worker para registrar o sucesso ou falha da geração de desafios.
    """
    __tablename__ = "generation_results"

    id = Column(String, primary_key=True, index=True)
    job_id = Column(String, index=True)
    ad_id = Column(String, index=True)
    requested_count = Column(Integer)
    generated_count = Column(Integer)
    status = Column(String)
    error_message = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))