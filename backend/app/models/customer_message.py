import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime
from app.database import Base


class CustomerMessage(Base):
    __tablename__ = "customer_messages"

    id = Column(String, primary_key=True, index=True)
    brand_id = Column(String, nullable=False, default="herbally-brand")
    channel = Column(String, nullable=False, default="Instagram DM")  # Instagram DM, Google Review, WhatsApp, Email
    customer_name = Column(String, nullable=False)
    message_text = Column(Text, nullable=False)
    draft_reply = Column(Text, nullable=True)
    
    # Status: draft_reply | approved_to_send | sent_demo | failed
    status = Column(String, default="draft_reply")
    is_simulated = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
