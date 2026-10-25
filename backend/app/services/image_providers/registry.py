"""Registry and factory for image generation providers."""

from typing import Dict, List, Optional
from app.config import settings
from app.services.image_providers.base import BaseImageProvider, ProviderInfo
from app.services.image_providers.demo_provider import DemoSimulationProvider
from app.services.image_providers.openai_provider import OpenAIImageProvider


class ImageProviderRegistry:
    def __init__(self):
        self._providers: Dict[str, BaseImageProvider] = {
            "openai": OpenAIImageProvider(),
            "demo_mode": DemoSimulationProvider(),
        }

    def list_providers(self) -> List[ProviderInfo]:
        """Return information for all registered providers."""
        return [provider.get_info() for provider in self._providers.values()]

    def get_provider(
        self,
        name: Optional[str] = None,
        *,
        allow_demo_fallback: bool = True,
    ) -> BaseImageProvider:
        """Resolve the appropriate provider based on name or global settings."""
        # Explicit request
        if name and name.strip():
            key = name.strip().lower()
            if key in self._providers:
                provider = self._providers[key]
                info = provider.get_info()
                if info.is_configured or key == "demo_mode":
                    return provider
                if allow_demo_fallback:
                    return self._providers["demo_mode"]
                return provider

        # Default configured provider from environment
        configured_provider = settings.IMAGE_PROVIDER.strip().lower()
        if configured_provider == "openai" and settings.OPENAI_IMAGE_API_KEY:
            return self._providers["openai"]

        # If not configured, either fallback to demo_mode or return unconfigured openai provider
        if allow_demo_fallback:
            return self._providers["demo_mode"]
        return self._providers.get("openai", self._providers["demo_mode"])


provider_registry = ImageProviderRegistry()
