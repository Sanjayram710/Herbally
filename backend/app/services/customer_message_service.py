import uuid
import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.customer_message import CustomerMessage
from app.services.guardrails import GuardrailsService


class CustomerMessageService:
    @staticmethod
    def seed_sample_messages(db: Session):
        samples = [
            {
                "id": "msg-001",
                "brand_id": "herbally-brand",
                "channel": "Instagram DM",
                "customer_name": "Pooja Sharma (@pooja_wellness)",
                "message_text": "Hi Herbally team! I have sensitive acne-prone skin. Does your Neem bedsheet help with skin irritation?",
                "draft_reply": "Hello Pooja! Thank you for reaching out. The Herbally Pure Neem Bedsheet is crafted from 100% GOTS certified organic cotton washed in pure botanical Neem extract. It is naturally hypoallergenic and highly breathable, which helps reduce sweat and friction against sensitive skin during sleep. We don't claim to cure medical skin conditions, but our customers love how gentle and cooling it feels on delicate skin! Let us know if you'd like a size guide.",
                "status": "draft_reply"
            },
            {
                "id": "msg-002",
                "brand_id": "herbally-brand",
                "channel": "Google Review",
                "customer_name": "Rohan Deshmukh",
                "message_text": "Is the neem scent overpowering? How long does the botanical wash last after washing?",
                "draft_reply": "Hi Rohan, great question! The botanical Neem infusion leaves a very subtle, natural herbal freshness—it is not pungent or perfume-heavy. With normal gentle cold-water laundering using mild detergents, the botanical wash retains its soothing properties through 30+ domestic washes. Happy to assist if you have any questions before ordering!",
                "status": "draft_reply"
            }
        ]
        for s in samples:
            existing = db.query(CustomerMessage).filter(CustomerMessage.id == s["id"]).first()
            if not existing:
                msg = CustomerMessage(
                    id=s["id"],
                    brand_id=s["brand_id"],
                    channel=s["channel"],
                    customer_name=s["customer_name"],
                    message_text=s["message_text"],
                    draft_reply=s["draft_reply"],
                    status=s["status"],
                    is_simulated=True
                )
                db.add(msg)
        db.commit()

    @staticmethod
    def list_messages(db: Session) -> List[CustomerMessage]:
        CustomerMessageService.seed_sample_messages(db)
        return db.query(CustomerMessage).order_by(CustomerMessage.created_at.desc()).all()

    @staticmethod
    def update_draft(db: Session, message_id: str, new_reply: str) -> Optional[CustomerMessage]:
        msg = db.query(CustomerMessage).filter(CustomerMessage.id == message_id).first()
        if not msg:
            return None
        msg.draft_reply = GuardrailsService.filter_ad_copy(new_reply)
        db.commit()
        db.refresh(msg)
        return msg

    @staticmethod
    def approve_and_send_demo(db: Session, message_id: str) -> Optional[CustomerMessage]:
        """Human approval gate: transitions to sent_demo. Never claims live external API delivery without connector."""
        msg = db.query(CustomerMessage).filter(CustomerMessage.id == message_id).first()
        if not msg:
            return None
        msg.status = "sent_demo"
        db.commit()
        db.refresh(msg)
        return msg
