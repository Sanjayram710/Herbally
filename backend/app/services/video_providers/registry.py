"""Video provider registry and factory."""

from typing import Dict, List, Optional
from app.config import settings
from app.services.video_providers.base import BaseVideoProvider, VideoProviderInfo
from app.services.video_providers.demo_provider import DemoVideoSimulationProvider
from app.services.video_providers.luma_provider import LumaVideoProvider
from app.services.video_providers.runway_provider import RunwayVideoProvider


class VideoProviderRegistry:
    def __init__(self):
        self._providers: Dict[str, BaseVideoProvider] = {
            "demo_mode": DemoVideoSimulationProvider(),
            "luma": LumaVideoProvider(),
            "runway": RunwayVideoProvider(),
        }

    def list_providers(self) -> List[VideoProviderInfo]:
        """Return declared capabilities and status for all video providers."""
        return [provider.get_info() for provider in self._providers.values()]

    def get_provider(
        self,
        name: Optional[str] = None,
        *,
        allow_demo_fallback: bool = True,
    ) -> BaseVideoProvider:
        """Resolve requested provider or default from settings with safe demo fallback."""
        if name and name.strip():
            key = name.strip().lower()
            if key in self._providers:
                p = self._providers[key]
                info = p.get_info()
                if info.is_configured or key == "demo_mode":
                    return p
                if allow_demo_fallback:
                    return self._providers["demo_mode"]
                return p

        # Check configured provider from settings
        cfg_name = settings.VIDEO_PROVIDER.strip().lower()
        if cfg_name in self._providers:
            provider = self._providers[cfg_name]
            if provider.get_info().is_configured:
                return provider

        # Default fallback
        if allow_demo_fallback:
            return self._providers["demo_mode"]
        return self._providers.get("runway", self._providers["demo_mode"])


video_provider_registry = VideoProviderRegistry()
