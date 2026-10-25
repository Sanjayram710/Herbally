import datetime
from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class ContentAsset(Base):
    __tablename__ = "content_assets"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, nullable=True, index=True)
    brand_id = Column(String, nullable=False, default="herbally-brand")
    product_id = Column(String, nullable=True)
    campaign_id = Column(String, nullable=True, index=True)
    channel = Column(String, nullable=False, default="Instagram")
    asset_type = Column(String, nullable=False, default="social_post")  # social_post, ad_copy, reel_script, headline, product_desc, creative_brief
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    headline = Column(String, nullable=True)
    body_copy = Column(Text, nullable=True)
    call_to_action = Column(String, nullable=True)
    hashtags = Column(JSON, default=list)
    image_prompt = Column(Text, nullable=True)  # Clearly noted as text prompt for image generation
    generated_media_url = Column(String, nullable=True)
    
    # Status lifecycle: draft | pending_approval | approved | scheduled | published_demo | failed | cancelled
    status = Column(String, default="draft")
    provider_source = Column(String, default="AI-Synthesized (Mock/Deterministic)")
    version = Column(Integer, default=1)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    schedules = relationship("ContentSchedule", back_populates="asset", cascade="all, delete-orphan")


class ContentSchedule(Base):
    __tablename__ = "content_schedules"

    id = Column(String, primary_key=True, index=True)
    asset_id = Column(String, ForeignKey("content_assets.id"), nullable=False)
    channel = Column(String, nullable=False)
    scheduled_time = Column(String, nullable=False)  # ISO string or date
    # Status: scheduled | published_demo | failed | cancelled
    status = Column(String, default="scheduled")
    attempts_count = Column(Integer, default=0)
    last_attempt_at = Column(DateTime, nullable=True)
    error_message = Column(String, nullable=True)
    is_simulated = Column(String, default="SIMULATED SANDBOX")
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    asset = relationship("ContentAsset", back_populates="schedules")
