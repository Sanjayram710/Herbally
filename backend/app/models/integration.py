import datetime
from sqlalchemy import Column, String, Boolean, JSON, DateTime, ForeignKey
from app.database import Base


class IntegrationConfig(Base):
    __tablename__ = "integration_configs"

    # Legacy rows retain their provider ID. New workspaces use a unique record
    # ID while connector_key retains the provider identifier.
    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True, index=True)
    connector_key = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # advertising, social, analytics, ai, search
    # Status: connected | unconfigured | disconnected | simulated_sandbox
    status = Column(String, default="unconfigured")
    is_configured = Column(Boolean, default=False)
    credentials_mask = Column(String, default="")  # e.g. "••••••••" or empty, never raw secrets
    permissions = Column(JSON, default=list)
    supported_actions = Column(JSON, default=list)
    last_sync_at = Column(DateTime, nullable=True)
    error_message = Column(String, nullable=True)
    setup_instructions = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
