from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


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
    product_url: Optional[str] = "https://herbally.in/products/neem-organic-bedsheet"
    market: str = "India"
    marketing_goal: str = "Increase online sales"
    budget: float = Field(default=50000.0, gt=0, description="Budget must be greater than zero")
    duration_days: int = Field(default=30, gt=0, description="Duration in days must be greater than zero")
    target_audience_hint: Optional[str] = "Premium wellness and conscious lifestyle consumers"

    @field_validator("product_url")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v_str = str(v).strip()
            if v_str and not (v_str.startswith("http://") or v_str.startswith("https://")):
                raise ValueError("Product URL must start with http:// or https://")
            return v_str
        return v
