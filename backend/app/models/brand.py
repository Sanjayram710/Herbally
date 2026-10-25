import datetime
from sqlalchemy import Column, ForeignKey, String, Text, JSON, DateTime
from app.database import Base


class BrandProfile(Base):
    __tablename__ = "brand_profiles"

    id = Column(String, primary_key=True, index=True)
    # Nullable for the additive migration of existing single-tenant databases.
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True, index=True)
    name = Column(String, nullable=False, default="My Brand")
    industry = Column(String, nullable=False, default="General")
    description = Column(Text, nullable=False, default="")
    website_url = Column(String, nullable=True)
    target_audience = Column(String, nullable=False, default="")
    marketing_objectives = Column(JSON, default=list)
    preferred_channels = Column(JSON, default=lambda: ["Instagram", "Meta Ads", "Google Search"])
    brand_voice = Column(String, default="Grounded, premium, and authentic")
    brand_colors = Column(JSON, default=lambda: {"primary": "#3b82f6", "secondary": "#1d4ed8", "accent": "#f59e0b", "background": "#0b0f19"})
    logo_url = Column(String, nullable=True)
    brand_guidelines = Column(Text, nullable=True)
    factual_claims = Column(JSON, default=list)
    prohibited_claims = Column(JSON, default=list)
    geographic_market = Column(String, nullable=True, default="India")
    preferred_language = Column(String, nullable=True, default="English")
    budget_range = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
