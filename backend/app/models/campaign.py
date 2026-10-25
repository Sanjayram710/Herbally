import datetime
from sqlalchemy import Column, String, Float, Integer, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True, index=True)
    brand_id = Column(String, ForeignKey("brand_profiles.id"), nullable=True, index=True)
    workflow_id = Column(String, nullable=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    platform = Column(String, nullable=False, default="Omnichannel")
    objective = Column(String, nullable=False, default="Conversions")
    target_audience = Column(String, nullable=True)
    customer_segment = Column(String, nullable=True)
    geographic_target = Column(String, nullable=True, default="India")
    channels = Column(JSON, default=list)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    budget = Column(Float, nullable=False, default=50000.0)
    currency = Column(String, default="INR")
    duration_days = Column(Integer, default=30)
    content_frequency = Column(String, nullable=True, default="daily")
    preferred_publishing_windows = Column(JSON, default=list)
    primary_kpi = Column(String, nullable=True)
    secondary_kpis = Column(JSON, default=list)
    brief = Column(Text, nullable=True)
    key_messages = Column(JSON, default=list)
    offer = Column(String, nullable=True)
    cta = Column(String, nullable=True)
    brand_constraints = Column(Text, nullable=True)

    # State machine lifecycle:
    # draft -> planning -> pending_review -> approved -> ready_to_publish -> scheduled -> published
    # rejection / revision states: rejected, revision_requested, cancelled, failed
    status = Column(String, default="draft", index=True)
    rejection_reason = Column(Text, nullable=True)
    iteration_number = Column(Integer, default=1)

    strategy_recommendation = Column(JSON, nullable=True)
    linked_assets = Column(JSON, default=dict)
    kpi_targets = Column(JSON, default=dict)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    metrics = relationship("CampaignMetric", back_populates="campaign", cascade="all, delete-orphan")
    approval_history = relationship(
        "CampaignApprovalHistory",
        back_populates="campaign",
        cascade="all, delete-orphan",
        order_by="CampaignApprovalHistory.created_at.desc()"
    )


class CampaignApprovalHistory(Base):
    """Audit log tracking campaign status transitions, reviewing actors, and comments."""
    __tablename__ = "campaign_approval_history"

    id = Column(String, primary_key=True, index=True)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    actor_id = Column(String, nullable=False)
    action = Column(String, nullable=False)  # submit_for_review, approve, reject, request_revision, ready_to_publish, cancel
    from_status = Column(String, nullable=False)
    to_status = Column(String, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    campaign = relationship("Campaign", back_populates="approval_history")


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
    
    is_simulated = Column(String, default="SIMULATED DATA")
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)

    campaign = relationship("Campaign", back_populates="metrics")
