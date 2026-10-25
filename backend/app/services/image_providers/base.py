"""Base interfaces and data structures for image generation providers.

Milestone 2 Provider Architecture:
- Disconnects the UI and media storage from vendor-specific endpoints.
- Accurately declares provider capabilities (Text-to-Image vs Image-to-Image).
- Never claims transformation occurred when provider only supports text-to-image.
- Explicitly labels mock/demo outputs with provenance warnings.
"""

from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel, Field


class ProviderInfo(BaseModel):
    id: str
    name: str
    is_configured: bool
    models: List[str]
    supported_aspect_ratios: List[str]
    supports_image_to_image: bool
    requires_credentials: str
    notes: str


class GeneratedImageResult(BaseModel):
    image_bytes: bytes
    mime_type: str
    width: int
    height: int
    provider: str
    model: str
    prompt: str
    is_mock: bool = False
    warning: Optional[str] = None


class BaseImageProvider(ABC):
    @property
    @abstractmethod
    def provider_id(self) -> str:
        pass

    @abstractmethod
    def get_info(self) -> ProviderInfo:
        """Return provider configuration status and supported features."""
        pass

    @abstractmethod
    def generate(
        self,
        *,
        prompt: str,
        aspect_ratio: str = "1:1",
        output_quality: str = "standard",
        model: Optional[str] = None,
        source_image_bytes: Optional[bytes] = None,
        source_mime_type: Optional[str] = None,
        **kwargs,
    ) -> GeneratedImageResult:
        """Execute image generation or variation according to genuine provider specifications."""
        pass
