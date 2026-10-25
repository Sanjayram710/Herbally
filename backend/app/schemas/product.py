from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict


class ProductCreate(BaseModel):
    id: Optional[str] = None
    workspace_id: Optional[str] = None
    brand_id: Optional[str] = None
    name: str = Field(..., json_schema_extra={"example": "Premium Product"})
    brand: Optional[str] = ""
    category: Optional[str] = None
    price_inr: Optional[float] = None
    description: str
    verified_features: List[str] = Field(default_factory=list)
    explicitly_supported_benefits: List[str] = Field(default_factory=list)
    prohibited_medical_claims: List[str] = Field(default_factory=list)
    official_url: Optional[str] = None
    image_url: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    brand_id: Optional[str] = None
    category: Optional[str] = None
    price_inr: Optional[float] = None
    description: Optional[str] = None
    verified_features: Optional[List[str]] = None
    explicitly_supported_benefits: Optional[List[str]] = None
    prohibited_medical_claims: Optional[List[str]] = None
    official_url: Optional[str] = None
    image_url: Optional[str] = None


class ProductRead(ProductCreate):
    id: str
    model_config = ConfigDict(from_attributes=True)


class WorkflowTriggerRequest(BaseModel):
    product_id: Optional[str] = None
    product_name: str = "Flagship Product"
    brand: str = "My Brand"
    description: Optional[str] = None
    product_url: Optional[str] = None
    market: str = "India"
    marketing_goal: str = "Increase online sales"
    budget: float = Field(default=50000.0, gt=0, description="Budget must be greater than zero")
    duration_days: int = Field(default=30, gt=0, description="Duration in days must be greater than zero")
    target_audience_hint: Optional[str] = None

    @field_validator("product_url")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v_str = str(v).strip()
            if v_str and not (v_str.startswith("http://") or v_str.startswith("https://")):
                raise ValueError("Product URL must start with http:// or https://")
            return v_str
        return v
