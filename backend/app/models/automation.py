import datetime
from sqlalchemy import Column, String, Boolean, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class AutomationRule(Base):
    __tablename__ = "automation_rules"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    trigger_type = Column(String, nullable=False)  # schedule_daily, schedule_weekly, metric_threshold, approval_pending
    action_type = Column(String, nullable=False)   # draft_content, check_budget_drag, notify_approval, generate_report
    frequency = Column(String, default="Weekly")
    is_enabled = Column(Boolean, default=True)
    config = Column(JSON, default=dict)
    last_run_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    executions = relationship("AutomationExecution", back_populates="rule", cascade="all, delete-orphan")


class AutomationExecution(Base):
    __tablename__ = "automation_executions"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True, index=True)
    rule_id = Column(String, ForeignKey("automation_rules.id"), nullable=False)
    rule_name = Column(String, nullable=False)
    # Status: success | failed | skipped
    status = Column(String, default="success")
    details = Column(String, nullable=False)
    error_message = Column(String, nullable=True)
    executed_at = Column(DateTime, default=datetime.datetime.utcnow)

    rule = relationship("AutomationRule", back_populates="executions")
