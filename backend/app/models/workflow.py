import datetime
from sqlalchemy import Column, String, Float, Text, JSON, DateTime
from app.database import Base


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, nullable=True)
    brand = Column(String, default="Herbally")
    marketing_goal = Column(String, nullable=False)
    budget = Column(Float, nullable=False)
    market = Column(String, default="India")
    status = Column(String, default="completed")  # pending, running, completed, failed
    
    # Complete serialized MarketingState snapshot
    state_snapshot = Column(JSON, default=dict)
    
    # Explicit source, error and assumption audit logs
    sources = Column(JSON, default=list)
    assumptions = Column(JSON, default=list)
    errors = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
