from datetime import UTC, datetime

from db.session import Base
from sqlalchemy import JSON, Column, Integer, String, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP


class AdContent(Base):
    __tablename__ = "ad_contents"

    id = Column(String, primary_key=True, index=True)
    ad_id = Column(String, index=True)
    content_type = Column(String)
    content_text = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(UTC))


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    job_id = Column(String, primary_key=True, index=True)
    ad_id = Column(String, index=True)
    requested_count = Column(Integer)
    reason = Column(String, nullable=True)
    status = Column(String)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(UTC))
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


class GenerationResult(Base):
    __tablename__ = "generation_results"

    id = Column(String, primary_key=True, index=True)
    job_id = Column(String, index=True)
    ad_id = Column(String, index=True)
    requested_count = Column(Integer)
    generated_count = Column(Integer)
    status = Column(String)
    error_message = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(UTC))

class StaticChallenge(Base):
    __tablename__ = "static_challenges"

    id = Column(String, primary_key=True, index=True)
    ad_id = Column(String, index=True)
    type = Column(String)
    question = Column(Text)
    options_json = Column(JSON)
    correct_answer = Column(String)
    source = Column(String, default="static")
    status = Column(String)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(UTC))