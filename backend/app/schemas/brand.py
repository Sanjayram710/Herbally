import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class BrandProfileBase(BaseModel):
    name: str = "Herbally"
    industry: str = "Herbal Textiles & Sleep Wellness"
    description: str = "Herbally crafts 100% GOTS organic cotton bedsheets infused with natural botanical Neem extracts."
    website_url: Optional[str] = "https://herbally.in"
    target_audience: str = "Holistic wellness seekers, eco-conscious homeowners, and high-performance urban professionals in Tier-1 metros."
    marketing_objectives: List[str] = Field(default_factory=lambda: ["Increase online D2C conversions", "Build organic social engagement", "Position as sleep wellness category leader"])
    preferred_channels: List[str] = Field(default_factory=lambda: ["Instagram", "Meta Ads", "Google Search", "Email", "Blog SEO"])
    brand_voice: str = "Grounded, premium, evidence-backed, serene, and authentically Ayurvedic without exaggerated claims."
    brand_colors: Dict[str, str] = Field(default_factory=lambda: {"primary": "#10b981", "secondary": "#064e3b", "accent": "#f59e0b", "background": "#0b0f19"})
    logo_url: Optional[str] = None
    brand_guidelines: Optional[str] = "Always emphasize 100% GOTS certified organic cotton and pure Neem extract wash. Never claim to cure eczema, treat insomnia, or make medical guarantees."
    factual_claims: List[str] = Field(default_factory=lambda: [
        "100% GOTS certified organic cotton",
        "Natural botanical Neem extract wash",
        "300 Thread Count sateen weave",
        "Hypoallergenic & breathable",
        "Ethically sourced & crafted in India"
    ])
    prohibited_claims: List[str] = Field(default_factory=lambda: [
        "Cures eczema",
        "Treats chronic insomnia",
        "Clinically proven medical therapy",
        "Guarantees permanent acne cure"
    ])


class BrandProfileCreate(BrandProfileBase):
    id: Optional[str] = None


class BrandProfileUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    website_url: Optional[str] = None
    target_audience: Optional[str] = None
    marketing_objectives: Optional[List[str]] = None
    preferred_channels: Optional[List[str]] = None
    brand_voice: Optional[str] = None
    brand_colors: Optional[Dict[str, str]] = None
    logo_url: Optional[str] = None
    brand_guidelines: Optional[str] = None
    factual_claims: Optional[List[str]] = None
    prohibited_claims: Optional[List[str]] = None


class BrandProfileRead(BrandProfileBase):
    id: str
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class WebsiteIngestRequest(BaseModel):
    url: str


class WebsiteIngestResponse(BaseModel):
    url: str
    title: str
    description: str
    extracted_text: str
    status: str
