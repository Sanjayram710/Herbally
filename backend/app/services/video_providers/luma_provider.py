"""Luma Dream Machine (Ray) Video Generation Provider.

Implements official Luma Dream Machine REST API specification:
- Endpoints: https://api.lumalabs.ai/dream-machine/v1/generations
- Models: ray-2, ray-1-6
- Native generation duration: 5 seconds (can be extended in 5s increments).
- Native aspect ratios: 16:9, 9:16, 1:1, 4:3, 3:4, 21:9
- Progress states: queued -> dreaming -> completed | failed
- Official API Pricing: ~30-40 API credits per 5s clip (~$0.32 - $0.40).
"""

from typing import Any, Dict, Optional
import httpx
from app.config import settings
from app.services.video_providers.base import BaseVideoProvider, VideoJobResult, VideoProviderInfo


class LumaVideoProvider(BaseVideoProvider):
    _API_BASE = "https://api.lumalabs.ai/dream-machine/v1/generations"

    @property
    def provider_id(self) -> str:
        return "luma"

    def get_info(self) -> VideoProviderInfo:
        is_configured = bool(settings.LUMA_API_KEY and settings.VIDEO_PROVIDER.lower() == "luma")
        return VideoProviderInfo(
            id="luma",
            name="Luma Dream Machine (Ray-2)",
            is_configured=is_configured,
            models=["ray-2", "ray-1-6"],
            supported_aspect_ratios=["9:16", "16:9", "1:1", "4:3", "3:4"],
            supported_durations=[5],  # Official native duration is 5s
            supports_image_to_video=True,
            supports_progress_reporting=False,  # Luma reports status ('dreaming'), not exact integer percent
            supports_cancellation=False,
            requires_credentials="LUMA_API_KEY and VIDEO_PROVIDER=luma",
            official_pricing_note="~30-40 credits per 5-second video (~$0.32 - $0.40 USD).",
            notes=(
                "Generates high-fidelity 5-second cinematic motion clips with coherent 3D physics. "
                "Diffusion model renders silent visual video; audio/voiceover requires separate synthesis."
            ),
        )

    def submit_job(
        self,
        *,
        prompt: str,
        script: Optional[str] = None,
        aspect_ratio: str = "9:16",
        duration_seconds: int = 8,
        source_image_bytes: Optional[bytes] = None,
        source_mime_type: Optional[str] = None,
        settings_dict: Optional[Dict[str, Any]] = None,
    ) -> VideoJobResult:
        if not settings.LUMA_API_KEY:
            from app.services.media_service import MediaProviderNotConfiguredError
            raise MediaProviderNotConfiguredError(
                "Luma Dream Machine is unconfigured. Set VIDEO_PROVIDER=luma and configure LUMA_API_KEY on the backend."
            )

        payload: Dict[str, Any] = {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio if aspect_ratio in ["16:9", "9:16", "1:1", "4:3", "3:4"] else "9:16",
            "model": settings.LUMA_MODEL or "ray-2",
        }

        # If source image is provided, upload / reference keyframe
        if source_image_bytes and len(source_image_bytes) > 0:
            # Per official Luma API: keyframes.frame0 accepts public or data URI
            import base64
            b64_img = base64.b64encode(source_image_bytes).decode("ascii")
            payload["keyframes"] = {
                "frame0": {
                    "type": "image",
                    "url": f"data:{source_mime_type or 'image/png'};base64,{b64_img}",
                }
            }

        headers = {
            "Authorization": f"Bearer {settings.LUMA_API_KEY}",
            "Content-Type": "application/json",
        }

        try:
            res = httpx.post(
                self._API_BASE,
                headers=headers,
                json=payload,
                timeout=settings.VIDEO_REQUEST_TIMEOUT_SECONDS,
            )
        except httpx.RequestError as exc:
            from app.services.media_service import MediaProviderRequestError
            raise MediaProviderRequestError("Luma Dream Machine API could not be reached") from exc

        if res.status_code >= 400:
            from app.services.media_service import MediaProviderRequestError
            raise MediaProviderRequestError(
                f"Luma API rejected the request (HTTP {res.status_code}): {res.text[:200]}"
            )

        data = res.json()
        provider_job_id = data.get("id")
        raw_state = data.get("state", "queued")
        status_map = {
            "queued": "queued",
            "dreaming": "processing",
            "completed": "completed",
            "failed": "failed",
        }

        return VideoJobResult(
            status=status_map.get(raw_state, "queued"),
            provider_job_id=provider_job_id,
            progress_percent=None,
            is_mock=False,
        )

    def check_job_status(self, provider_job_id: str) -> VideoJobResult:
        if not settings.LUMA_API_KEY:
            from app.services.media_service import MediaProviderNotConfiguredError
            raise MediaProviderNotConfiguredError("Luma API key is unconfigured.")

        headers = {"Authorization": f"Bearer {settings.LUMA_API_KEY}"}
        url = f"{self._API_BASE}/{provider_job_id}"

        try:
            res = httpx.get(url, headers=headers, timeout=settings.VIDEO_REQUEST_TIMEOUT_SECONDS)
        except httpx.RequestError as exc:
            from app.services.media_service import MediaProviderRequestError
            raise MediaProviderRequestError("Luma API status polling failed") from exc

        if res.status_code >= 400:
            from app.services.media_service import MediaProviderRequestError
            raise MediaProviderRequestError(f"Luma API polling returned HTTP {res.status_code}")

        data = res.json()
        raw_state = data.get("state", "queued")

        if raw_state == "completed":
            video_url = data.get("assets", {}).get("video")
            video_bytes = None
            if video_url:
                try:
                    v_res = httpx.get(video_url, timeout=60.0)
                    if v_res.status_code == 200:
                        video_bytes = v_res.content
                except Exception:
                    pass

            return VideoJobResult(
                status="completed",
                provider_job_id=provider_job_id,
                video_bytes=video_bytes,
                video_url=video_url,
                mime_type="video/mp4",
                is_mock=False,
            )

        if raw_state == "failed":
            return VideoJobResult(
                status="failed",
                provider_job_id=provider_job_id,
                error_message=data.get("failure_reason") or "Luma generation failed",
                is_mock=False,
            )

        return VideoJobResult(
            status="processing" if raw_state == "dreaming" else "queued",
            provider_job_id=provider_job_id,
            is_mock=False,
        )

    def cancel_job(self, provider_job_id: str) -> bool:
        # Luma does not support explicit cancellation via generations endpoint
        return False
