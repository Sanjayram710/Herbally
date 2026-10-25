"""Base interfaces and data structures for video generation providers.

Milestone 3 Architecture:
- Real provider contracts (Luma Dream Machine, Runway Gen-3 Alpha Turbo, Demo Simulation).
- Honest capability declaration: supported durations, aspect ratios, image-to-video, progress reporting.
- Transparent limitations: diffusion video models produce visual video; speech requires separate TTS.
- Transparent pricing and credit documentation per official API specifications.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class VideoProviderInfo(BaseModel):
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


class VideoJobResult(BaseModel):
    status: str  # queued | processing | completed | failed | cancelled
    provider_job_id: Optional[str] = None
    progress_percent: Optional[int] = None
    video_bytes: Optional[bytes] = None
    video_url: Optional[str] = None
    mime_type: Optional[str] = "video/mp4"
    error_message: Optional[str] = None
    is_mock: bool = False
    warning: Optional[str] = None
    metadata: Dict[str, Any] = {}


class BaseVideoProvider(ABC):
    @property
    @abstractmethod
    def provider_id(self) -> str:
        pass

    @abstractmethod
    def get_info(self) -> VideoProviderInfo:
        """Return provider configuration status and official capability matrix."""
        pass

    @abstractmethod
    def submit_job(
        self,
        *,
        prompt: str,
        script: Optional[str] = None,
        aspect_ratio: str = "9:16",
        duration_seconds: int = 8,
        source_image_bytes: Optional[bytes] = None,
        source_mime_type: Optional[str] = None,
        settings: Optional[Dict[str, Any]] = None,
    ) -> VideoJobResult:
        """Initiate video generation task with provider."""
        pass

    @abstractmethod
    def check_job_status(self, provider_job_id: str) -> VideoJobResult:
        """Poll task progression and retrieve video payload upon completion."""
        pass

    @abstractmethod
    def cancel_job(self, provider_job_id: str) -> bool:
        """Attempt to cancel an ongoing generation task."""
        pass
