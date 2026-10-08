import datetime
from sqlalchemy import Column, String, Float, Text, JSON, DateTime
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    brand = Column(String, nullable=False, default="Herbally")
    category = Column(String, nullable=True)
    price_inr = Column(Float, nullable=True)
    description = Column(Text, nullable=False)
    verified_features = Column(JSON, default=list)
    explicitly_supported_benefits = Column(JSON, default=list)
    prohibited_medical_claims = Column(JSON, default=list)
    official_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
