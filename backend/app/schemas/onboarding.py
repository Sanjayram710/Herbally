from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.brand import BrandProfileRead
from app.schemas.product import ProductRead


class UniversalOnboardingRequest(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=120, description="Business or Brand Name")
    industry: str = Field(..., min_length=1, max_length=100, description="Primary industry or business category")
    website_url: Optional[str] = Field(default=None, description="Optional public website or storefront URL")
    marketing_goal: str = Field(default="Increase online sales and conversions", description="Primary marketing objective")
    target_audience: Optional[str] = Field(default=None, description="Target customer persona or demographics")
    geographic_market: Optional[str] = Field(default="India", description="Primary target geographic location")
    preferred_language: Optional[str] = Field(default="English", description="Primary content language")
    budget_range: Optional[str] = Field(default=None, description="Monthly ad/marketing budget range")
    preferred_channels: List[str] = Field(
        default_factory=lambda: ["Instagram", "Meta Ads", "Google Search"],
        description="Target distribution channels"
    )
    initial_product_name: Optional[str] = Field(default=None, description="Optional flagship product name")
    initial_product_price: Optional[float] = Field(default=None, description="Optional flagship product price")
    initial_product_description: Optional[str] = Field(default=None, description="Optional flagship product description")
    initial_product_category: Optional[str] = Field(default=None, description="Optional flagship product category")
    flagship_product_name: Optional[str] = Field(default=None, description="Alias for initial_product_name")
    flagship_product_price: Optional[float] = Field(default=None, description="Alias for initial_product_price")
    flagship_product_description: Optional[str] = Field(default=None, description="Alias for initial_product_description")


class UniversalOnboardingResponse(BaseModel):
    brand: BrandProfileRead
    product: Optional[ProductRead] = None
    workspace_id: str
    message: str


class OnboardingStatusResponse(BaseModel):
    is_onboarded: bool
    brand: Optional[BrandProfileRead] = None
    brands_count: int
    products_count: int
    workspace_id: str
