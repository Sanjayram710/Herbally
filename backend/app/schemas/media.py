import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class ImageGenerationRequest(BaseModel):
    """Generation is billable, so callers must explicitly confirm every request."""

    confirmed: bool = False
    size: str = "1024x1024"
    quality: Literal["low", "medium", "high"] = "low"

    @field_validator("size")
    @classmethod
    def validate_size(cls, value: str) -> str:
        parts = value.lower().split("x")
        if len(parts) != 2:
            raise ValueError("Image size must use WIDTHxHEIGHT format")
        try:
            width, height = (int(part) for part in parts)
        except ValueError as exc:
            raise ValueError("Image size must use numeric dimensions") from exc
        if width < 256 or height < 256 or width > 3840 or height > 3840:
            raise ValueError("Image dimensions must be between 256 and 3840 pixels")
        return f"{width}x{height}"


class CampaignMediaAttachRequest(BaseModel):
    media_asset_id: str = Field(min_length=1, max_length=128)


class MediaAssetRead(BaseModel):
    id: str
    workspace_id: Optional[str] = None
    brand_id: Optional[str] = None
    product_id: Optional[str] = None
    source_asset_id: Optional[str] = None
    content_asset_id: Optional[str] = None
    campaign_id: Optional[str] = None
    asset_type: Optional[str] = "image"
    style_preset: Optional[str] = None
    aspect_ratio: Optional[str] = "1:1"
    metadata_json: Optional[str] = None
    provider: str
    provider_model: str
    prompt: str
    media_url: str
    mime_type: str
    byte_size: int
    checksum_sha256: str
    status: str
    created_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class MediaGenerationResponse(BaseModel):
    media: MediaAssetRead
    content_asset_id: Optional[str] = None
    generated_media_url: str
    message: str


class ProviderInfoRead(BaseModel):
    id: str
    name: str
    is_configured: bool
    models: list[str]
    supported_aspect_ratios: list[str]
    supports_image_to_image: bool
    requires_credentials: str
    notes: str


class StudioGenerateRequest(BaseModel):
    brand_id: str = Field(min_length=1, max_length=120, description="Brand to associate the asset with")
    product_id: Optional[str] = Field(default=None, description="Optional product to associate with")
    source_asset_id: Optional[str] = Field(default=None, description="Optional source media asset ID for variation or reference")
    style_preset: str = Field(default="clean_studio", description="Creative style preset template")
    custom_prompt: str = Field(min_length=3, max_length=4000, description="Creative direction prompt")
    aspect_ratio: str = Field(default="1:1", description="Target aspect ratio: 1:1, 9:16, 16:9, 4:5, 3:2")
    provider: Optional[str] = Field(default=None, description="Requested provider: openai | demo_mode")
    model: Optional[str] = Field(default=None, description="Optional model identifier override")
    output_quality: Literal["standard", "hd"] = "standard"
    confirmed: bool = Field(default=False, description="Billable execution confirmation guard")
    allow_demo_fallback: bool = Field(default=True, description="Permit labeled demo mode when credentials are unconfigured")

    @field_validator("aspect_ratio")
    @classmethod
    def validate_aspect_ratio(cls, val: str) -> str:
        allowed = {"1:1", "9:16", "16:9", "4:5", "3:2"}
        if val not in allowed:
            raise ValueError(f"Invalid aspect_ratio '{val}'. Must be one of {allowed}")
        return val


class StudioGenerateResponse(BaseModel):
    media: MediaAssetRead
    source_media: Optional[MediaAssetRead] = None
    message: str
    is_demo: bool = False
    warning: Optional[str] = None


class MediaDeleteResponse(BaseModel):
    success: bool
    media_id: str
    message: str
