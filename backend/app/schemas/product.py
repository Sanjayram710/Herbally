from typing import List, Optional
from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., json_schema_extra={"example": "Herbally Pure Neem Infused Organic Bedsheet"})
    brand: str = Field(default="Herbally")
    category: Optional[str] = "Herbal Textiles & Wellness Bedding"
    price_inr: Optional[float] = 3499.0
    description: str
    verified_features: List[str] = Field(default_factory=list)
    explicitly_supported_benefits: List[str] = Field(default_factory=list)
    prohibited_medical_claims: List[str] = Field(default_factory=list)
    official_url: Optional[str] = None


class ProductRead(ProductCreate):
    id: str


class WorkflowTriggerRequest(BaseModel):
    product_id: Optional[str] = None
    product_name: str = "Herbally Pure Neem Infused Organic Bedsheet"
    brand: str = "Herbally"
    description: Optional[str] = None
    market: str = "India"
    marketing_goal: str = "Increase online sales"
    budget: float = 50000.0
    duration_days: int = 30
    target_audience_hint: Optional[str] = "Premium wellness and conscious lifestyle consumers"
