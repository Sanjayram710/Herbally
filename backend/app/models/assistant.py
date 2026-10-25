import datetime
from sqlalchemy import Column, String, Text, JSON, DateTime
from app.database import Base


class AssistantMessage(Base):
    __tablename__ = "assistant_messages"

    id = Column(String, primary_key=True, index=True)
    brand_id = Column(String, nullable=False, default="herbally-brand")
    role = Column(String, nullable=False)  # user | assistant | system | tool
    content = Column(Text, nullable=False)
    tool_called = Column(String, nullable=True)
    tool_result = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
