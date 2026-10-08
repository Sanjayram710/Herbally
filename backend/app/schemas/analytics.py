from typing import List, Optional
from pydantic import BaseModel, Field


class CampaignRowInput(BaseModel):
    campaign_id: str
    campaign_name: str
    platform: str
    creative_variant: str = "Standard"
    spend: float = Field(..., ge=0)
    impressions: int = Field(..., ge=0)
    clicks: int = Field(..., ge=0)
    conversions: int = Field(..., ge=0)
    revenue: float = Field(default=0.0, ge=0)


class CampaignDataUploadResponse(BaseModel):
    filename: str
    rows_parsed: int
    total_spend: float
    total_conversions: int
    message: str


class AnalyticsRequest(BaseModel):
    workflow_id: Optional[str] = None
    campaign_rows: Optional[List[CampaignRowInput]] = None
