import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ContentAssetCreate(BaseModel):
    brand_id: str = "herbally-brand"
    product_id: Optional[str] = None
    campaign_id: Optional[str] = None
    channel: str = "Instagram"
    asset_type: str = "social_post"  # social_post, ad_copy, reel_script, headline, product_desc, creative_brief
    title: str
    content: str
    headline: Optional[str] = None
    body_copy: Optional[str] = None
    call_to_action: Optional[str] = None
    hashtags: List[str] = Field(default_factory=list)
    image_prompt: Optional[str] = None
    generated_media_url: Optional[str] = None
    status: str = "draft"
    provider_source: str = "AI-Synthesized (Mock/Deterministic)"


class ContentAssetUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    headline: Optional[str] = None
    body_copy: Optional[str] = None
    call_to_action: Optional[str] = None
    hashtags: Optional[List[str]] = None
    image_prompt: Optional[str] = None
    status: Optional[str] = None
    channel: Optional[str] = None


class ContentAssetRead(BaseModel):
    id: str
    brand_id: str
    product_id: Optional[str] = None
    campaign_id: Optional[str] = None
    channel: str
    asset_type: str
    title: str
    content: str
    headline: Optional[str] = None
    body_copy: Optional[str] = None
    call_to_action: Optional[str] = None
    hashtags: List[str] = Field(default_factory=list)
    image_prompt: Optional[str] = None
    generated_media_url: Optional[str] = None
    status: str
    provider_source: str
    version: int = 1
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class ContentScheduleCreate(BaseModel):
    asset_id: str
    channel: str
    scheduled_time: str
    status: str = "scheduled"


class ContentScheduleRead(BaseModel):
    id: str
    asset_id: str
    channel: str
    scheduled_time: str
    status: str
    attempts_count: int = 0
    last_attempt_at: Optional[datetime.datetime] = None
    error_message: Optional[str] = None
    is_simulated: str
    created_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class ContentGenerateRequest(BaseModel):
    brand_id: str = "herbally-brand"
    product_id: Optional[str] = "herbally-neem-bedsheet"
    channels: List[str] = Field(default_factory=lambda: ["Instagram", "Meta Ads", "Google Search"])
    asset_types: List[str] = Field(default_factory=lambda: ["social_post", "ad_copy", "reel_script"])
    target_audience: Optional[str] = None
    goal: Optional[str] = "Conversions"
