import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


VALID_OBJECTIVES = [
    "awareness",
    "traffic",
    "engagement",
    "leads",
    "conversions",
    "sales",
]

VALID_STATUSES = [
    "draft",
    "planning",
    "pending_review",
    "approved",
    "ready_to_publish",
    "scheduled",
    "published",
    "rejected",
    "revision_requested",
    "cancelled",
    "failed",
]

SUPPORTED_CHANNELS = [
    "Instagram",
    "Facebook",
    "Google Ads",
    "LinkedIn",
    "YouTube",
    "Twitter / X",
    "Email",
    "Blog / SEO",
]


class CampaignApprovalHistoryRead(BaseModel):
    id: str
    campaign_id: str
    workspace_id: str
    actor_id: str
    action: str
    from_status: str
    to_status: str
    comment: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CampaignCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255, description="Campaign title")
    description: Optional[str] = Field(default=None, max_length=4000)
    brand_id: str = Field(min_length=1, description="Owning brand profile ID")
    product_id: Optional[str] = Field(default=None, description="Featured flagship product ID")
    objective: str = Field(default="conversions", description="Marketing goal")
    target_audience: Optional[str] = Field(default=None, max_length=1000)
    customer_segment: Optional[str] = Field(default=None, max_length=255)
    geographic_target: Optional[str] = Field(default="India", max_length=255)
    channels: List[str] = Field(default_factory=lambda: ["Instagram", "Google Ads"])
    start_date: Optional[datetime.datetime] = None
    end_date: Optional[datetime.datetime] = None
    budget: float = Field(default=50000.0, gt=0, description="Total planned budget (not permission to spend)")
    currency: str = Field(default="INR", max_length=10)
    duration_days: int = Field(default=30, ge=1, le=365)
    content_frequency: Optional[str] = Field(default="daily", max_length=100)
    preferred_publishing_windows: List[str] = Field(default_factory=lambda: ["morning_09_11", "evening_18_21"])
    primary_kpi: Optional[str] = Field(default="ROAS", max_length=100)
    secondary_kpis: List[str] = Field(default_factory=lambda: ["CTR", "CPA"])
    brief: Optional[str] = Field(default=None, max_length=5000)
    key_messages: List[str] = Field(default_factory=list)
    offer: Optional[str] = Field(default=None, max_length=500)
    cta: Optional[str] = Field(default="Shop Now", max_length=200)
    brand_constraints: Optional[str] = Field(default=None, max_length=4000)

    @field_validator("objective")
    @classmethod
    def validate_objective(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if v_clean not in VALID_OBJECTIVES:
            raise ValueError(f"Objective '{v}' is not valid. Must be one of: {VALID_OBJECTIVES}")
        return v_clean

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, end_val: Optional[datetime.datetime], info) -> Optional[datetime.datetime]:
        start_val = info.data.get("start_date")
        if start_val and end_val and end_val < start_val:
            raise ValueError("Campaign end_date cannot be earlier than start_date")
        return end_val


class CampaignUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = None
    product_id: Optional[str] = None
    objective: Optional[str] = None
    target_audience: Optional[str] = None
    customer_segment: Optional[str] = None
    geographic_target: Optional[str] = None
    channels: Optional[List[str]] = None
    start_date: Optional[datetime.datetime] = None
    end_date: Optional[datetime.datetime] = None
    budget: Optional[float] = Field(default=None, gt=0)
    currency: Optional[str] = None
    duration_days: Optional[int] = Field(default=None, ge=1, le=365)
    content_frequency: Optional[str] = None
    preferred_publishing_windows: Optional[List[str]] = None
    primary_kpi: Optional[str] = None
    secondary_kpis: Optional[List[str]] = None
    brief: Optional[str] = None
    key_messages: Optional[List[str]] = None
    offer: Optional[str] = None
    cta: Optional[str] = None
    brand_constraints: Optional[str] = None

    @field_validator("objective")
    @classmethod
    def validate_objective(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_clean = v.strip().lower()
            if v_clean not in VALID_OBJECTIVES:
                raise ValueError(f"Objective '{v}' is not valid. Must be one of: {VALID_OBJECTIVES}")
            return v_clean
        return v


class CampaignApprovalActionRequest(BaseModel):
    comment: Optional[str] = Field(default=None, max_length=2000)
    confirmed: bool = Field(default=True, description="Explicit user confirmation guard")


class CampaignContentCreateRequest(BaseModel):
    channel: str = Field(min_length=1, max_length=100)
    asset_type: str = Field(default="social_post", max_length=100)
    title: Optional[str] = Field(default=None, max_length=255)
    content: Optional[str] = Field(default=None, max_length=10000)
    headline: Optional[str] = Field(default=None, max_length=500)
    body: Optional[str] = Field(default=None, max_length=8000)
    body_copy: Optional[str] = Field(default=None, max_length=8000)
    call_to_action: Optional[str] = Field(default=None, max_length=200)
    hashtags: List[str] = Field(default_factory=list)
    image_prompt: Optional[str] = Field(default=None, max_length=2000)
    media_asset_id: Optional[str] = Field(default=None, description="Associated Media Library / Video asset ID")
    scheduled_time: Optional[str] = Field(default=None, description="ISO timestamp for calendar scheduling")


class CampaignContentUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    headline: Optional[str] = None
    body: Optional[str] = None
    body_copy: Optional[str] = None
    call_to_action: Optional[str] = None
    hashtags: Optional[List[str]] = None
    image_prompt: Optional[str] = None
    media_asset_id: Optional[str] = None
    status: Optional[str] = None
    scheduled_time: Optional[str] = None


class CampaignContentVariantRequest(BaseModel):
    number_of_variants: int = Field(default=3, ge=1, le=5)
    angle_style: str = Field(default="benefit_driven", description="benefit_driven | direct_response | social_proof | urgency")
    angles: Optional[List[str]] = Field(default=None, description="Optional custom angle names")


class CampaignAssetAttachRequest(BaseModel):
    media_asset_id: str = Field(min_length=1, description="Media asset ID to associate")
    content_asset_id: Optional[str] = Field(default=None, description="Optional content asset to link")


class CampaignStrategyGenerateRequest(BaseModel):
    confirmed: bool = Field(default=True, description="Confirmation to generate strategic plan")
    allow_demo_fallback: bool = Field(default=True, description="Fallback to deterministic demo strategy if unconfigured")


class CampaignContentRead(BaseModel):
    id: str
    workspace_id: Optional[str] = None
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
    media_asset_id: Optional[str] = None
    status: str
    provider_source: str
    version: int
    angle: Optional[str] = None
    scheduled_time: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CampaignCalendarEntryRead(BaseModel):
    id: str
    schedule_id: str
    asset_id: str
    content_asset_id: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    brand_id: str
    brand_name: Optional[str] = None
    channel: str
    title: str
    headline: Optional[str] = None
    content_snippet: str
    scheduled_time: str
    status: str
    is_simulated: str
    media_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CampaignRead(BaseModel):
    id: str
    workspace_id: Optional[str] = None
    brand_id: Optional[str] = None
    product_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    platform: str
    objective: str
    target_audience: Optional[str] = None
    customer_segment: Optional[str] = None
    geographic_target: Optional[str] = None
    channels: List[str] = Field(default_factory=list)
    start_date: Optional[datetime.datetime] = None
    end_date: Optional[datetime.datetime] = None
    budget: float
    currency: str = "INR"
    duration_days: int = 30
    content_frequency: Optional[str] = None
    preferred_publishing_windows: List[str] = Field(default_factory=list)
    primary_kpi: Optional[str] = None
    secondary_kpis: List[str] = Field(default_factory=list)
    brief: Optional[str] = None
    key_messages: List[str] = Field(default_factory=list)
    offer: Optional[str] = None
    cta: Optional[str] = None
    brand_constraints: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    iteration_number: int = 1
    strategy_recommendation: Optional[Dict[str, Any]] = None
    linked_assets: Optional[Dict[str, Any]] = None
    kpi_targets: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    approval_history: List[CampaignApprovalHistoryRead] = Field(default_factory=list)
    content_items: List[CampaignContentRead] = Field(default_factory=list)
    content_count: int = 0
    media_count: int = 0

    model_config = ConfigDict(from_attributes=True)
