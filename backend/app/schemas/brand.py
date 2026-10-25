import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class BrandProfileBase(BaseModel):
    name: str = "My Brand"
    industry: str = "General"
    description: str = ""
    website_url: Optional[str] = None
    target_audience: str = ""
    marketing_objectives: List[str] = Field(default_factory=lambda: ["Increase conversions", "Build brand awareness"])
    preferred_channels: List[str] = Field(default_factory=lambda: ["Instagram", "Meta Ads", "Google Search"])
    brand_voice: str = "Grounded, premium, authentic, and compelling"
    brand_colors: Dict[str, str] = Field(default_factory=lambda: {"primary": "#3b82f6", "secondary": "#1d4ed8", "accent": "#f59e0b", "background": "#0b0f19"})
    logo_url: Optional[str] = None
    brand_guidelines: Optional[str] = None
    factual_claims: List[str] = Field(default_factory=list)
    prohibited_claims: List[str] = Field(default_factory=list)
    geographic_market: Optional[str] = "India"
    preferred_language: Optional[str] = "English"
    budget_range: Optional[str] = None
    workspace_id: Optional[str] = None


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
    geographic_market: Optional[str] = None
    preferred_language: Optional[str] = None
    budget_range: Optional[str] = None


class BrandProfileRead(BrandProfileBase):
    id: str
    workspace_id: Optional[str] = None
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
