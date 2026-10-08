import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from app.database import Base


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String, primary_key=True, index=True)
    workflow_run_id = Column(String, ForeignKey("workflow_runs.id"), nullable=True)
    finding = Column(Text, nullable=False)
    evidence = Column(Text, nullable=False)
    recommendation_text = Column(Text, nullable=False)
    expected_impact = Column(Text, nullable=False)
    priority = Column(String, nullable=False, default="MEDIUM")  # HIGH, MEDIUM, LOW
    concrete_action = Column(Text, nullable=False)
    is_next_best_action = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
