import datetime
from sqlalchemy import Column, String, Float, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=True)
    name = Column(String, nullable=False)
    platform = Column(String, nullable=False)
    objective = Column(String, nullable=False)
    budget = Column(Float, nullable=False)
    duration_days = Column(Integer, default=30)
    status = Column(String, default="simulated_pending_approval")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    metrics = relationship("CampaignMetric", back_populates="campaign", cascade="all, delete-orphan")


class CampaignMetric(Base):
    __tablename__ = "campaign_metrics"

    id = Column(String, primary_key=True, index=True)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=True)
    campaign_name = Column(String, nullable=False)
    platform = Column(String, nullable=False)
    creative_variant = Column(String, nullable=True)
    spend = Column(Float, nullable=False, default=0.0)
    impressions = Column(Integer, nullable=False, default=0)
    clicks = Column(Integer, nullable=False, default=0)
    conversions = Column(Integer, nullable=False, default=0)
    revenue = Column(Float, nullable=False, default=0.0)
    
    # Deterministic computed KPIs
    ctr = Column(Float, nullable=False, default=0.0)
    cpc = Column(Float, nullable=False, default=0.0)
    conv_rate = Column(Float, nullable=False, default=0.0)
    cpa = Column(Float, nullable=False, default=0.0)
    roas = Column(Float, nullable=False, default=0.0)
    
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)

    campaign = relationship("Campaign", back_populates="metrics")
