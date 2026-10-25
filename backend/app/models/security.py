import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, UniqueConstraint

from app.database import Base


class Workspace(Base):
    """Tenant boundary for the currently single-brand application."""

    __tablename__ = "workspaces"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class User(Base):
    """A locally provisioned API principal; external identity is configured outside this demo."""

    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    display_name = Column(String, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class WorkspaceMembership(Base):
    __tablename__ = "workspace_memberships"
    __table_args__ = (UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),)

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String, nullable=False, default="member")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
