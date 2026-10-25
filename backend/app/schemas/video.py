import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


SUPPORTED_LANGUAGES = [
    "English",
    "Hindi",
    "Bengali",
    "Telugu",
    "Marathi",
    "Tamil",
    "Urdu",
    "Gujarati",
    "Kannada",
    "Odia",
    "Punjabi",
]

SUPPORTED_ASPECT_RATIOS = ["9:16", "16:9"]


class VideoProviderInfoRead(BaseModel):
    id: str
    name: str
    is_configured: bool
    models: List[str]
    supported_aspect_ratios: List[str]
    supported_durations: List[int]
    supports_image_to_video: bool
    supports_progress_reporting: bool
    supports_cancellation: bool
    requires_credentials: str
    official_pricing_note: str
    notes: str


class VideoJobCreateRequest(BaseModel):
    brand_id: str = Field(min_length=1, max_length=120, description="Owning brand profile ID")
    product_id: Optional[str] = Field(default=None, description="Optional flagship product ID")
    source_asset_id: Optional[str] = Field(default=None, description="Optional keyframe reference media asset ID")
    prompt: str = Field(min_length=3, max_length=4000, description="Video visual direction prompt")
    script: Optional[str] = Field(default=None, max_length=4000, description="Optional spoken voiceover or on-screen captions")
    template_id: str = Field(default="product_hero", description="Creative concept template")
    language: str = Field(default="English", description="Target video narrative and script language")
    aspect_ratio: str = Field(default="9:16", description="Target aspect ratio: 9:16 (Reel) or 16:9 (Landscape)")
    duration_seconds: int = Field(default=8, ge=4, le=60, description="Target duration in seconds")
    provider: Optional[str] = Field(default=None, description="Requested provider: luma | runway | demo_mode")
    model: Optional[str] = Field(default=None, description="Model identifier override")
    confirmed: bool = Field(default=False, description="Explicit confirmation guard")
    allow_demo_fallback: bool = Field(default=True, description="Fallback to watermarked demo mode if credentials unconfigured")

    @field_validator("language")
    @classmethod
    def validate_language(cls, val: str) -> str:
        matched = next((lang for lang in SUPPORTED_LANGUAGES if lang.lower() == val.lower()), None)
        if not matched:
            raise ValueError(f"Language '{val}' is not supported. Supported: {SUPPORTED_LANGUAGES}")
        return matched

    @field_validator("aspect_ratio")
    @classmethod
    def validate_aspect_ratio(cls, val: str) -> str:
        if val not in SUPPORTED_ASPECT_RATIOS:
            raise ValueError(f"Aspect ratio '{val}' is not supported. Supported: {SUPPORTED_ASPECT_RATIOS}")
        return val


class VideoJobRead(BaseModel):
    id: str
    workspace_id: str
    brand_id: str
    product_id: Optional[str] = None
    source_asset_id: Optional[str] = None
    output_media_id: Optional[str] = None
    output_media_url: Optional[str] = None
    provider: str
    provider_model: str
    provider_job_id: Optional[str] = None
    status: str
    progress_percent: Optional[int] = None
    prompt: str
    script: Optional[str] = None
    template_id: str
    language: str
    aspect_ratio: str
    duration_seconds: int
    error_details: Optional[str] = None
    is_demo: bool = False
    created_at: Optional[datetime.datetime] = None
    started_at: Optional[datetime.datetime] = None
    completed_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)
