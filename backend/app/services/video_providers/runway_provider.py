"""RunwayML Gen-3 Alpha Turbo Video Generation Provider.

Implements official Runway Gen-3 REST API specification:
- Endpoints: https://api.runwayml.com/v1/image_to_video and /tasks/{id}
- Version Header: X-Runway-Version: 2024-09-13
- Models: gen3a_turbo
- Supported durations: 5 or 10 seconds.
- Supported aspect ratios: 16:9, 9:16
- Official API Pricing: 5 credits per second on Turbo (~$0.25 for 5s, ~$0.50 for 10s).
"""

from typing import Any, Dict, Optional
import httpx
from app.config import settings
from app.services.video_providers.base import BaseVideoProvider, VideoJobResult, VideoProviderInfo


class RunwayVideoProvider(BaseVideoProvider):
    _TASK_URL = "https://api.runwayml.com/v1/image_to_video"
    _POLL_URL = "https://api.runwayml.com/v1/tasks"

    @property
    def provider_id(self) -> str:
        return "runway"

    def get_info(self) -> VideoProviderInfo:
        is_configured = bool(settings.RUNWAY_API_KEY and settings.VIDEO_PROVIDER.lower() == "runway")
        return VideoProviderInfo(
            id="runway",
            name="Runway Gen-3 Alpha Turbo",
            is_configured=is_configured,
            models=["gen3a_turbo"],
            supported_aspect_ratios=["9:16", "16:9"],
            supported_durations=[5, 10],  # Runway natively generates 5s or 10s
            supports_image_to_video=True,
            supports_progress_reporting=True,  # Runway reports progressRatio (0.0 to 1.0)
            supports_cancellation=True,
            requires_credentials="RUNWAY_API_KEY and VIDEO_PROVIDER=runway",
            official_pricing_note="5 credits per second on Gen-3 Alpha Turbo (~$0.05/sec).",
            notes=(
                "Ultra-fast video generation with high character consistency. "
                "Diffusion video outputs visual frames; captions and narrative are translated from selected language."
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
        if not settings.RUNWAY_API_KEY:
            from app.services.media_service import MediaProviderNotConfiguredError
            raise MediaProviderNotConfiguredError(
                "Runway Gen-3 is unconfigured. Set VIDEO_PROVIDER=runway and supply RUNWAY_API_KEY."
            )

        # Runway accepts 5 or 10 seconds
        runway_duration = 10 if duration_seconds > 7 else 5

        payload: Dict[str, Any] = {
            "model": settings.RUNWAY_MODEL or "gen3a_turbo",
            "promptText": prompt,
            "duration": runway_duration,
            "ratio": "768:1280" if aspect_ratio == "9:16" else "1280:768",
        }

        if source_image_bytes and len(source_image_bytes) > 0:
            import base64
            b64_img = base64.b64encode(source_image_bytes).decode("ascii")
            payload["promptImage"] = f"data:{source_mime_type or 'image/png'};base64,{b64_img}"

        headers = {
            "Authorization": f"Bearer {settings.RUNWAY_API_KEY}",
            "X-Runway-Version": "2024-09-13",
            "Content-Type": "application/json",
        }

        try:
            res = httpx.post(
                self._TASK_URL,
                headers=headers,
                json=payload,
                timeout=settings.VIDEO_REQUEST_TIMEOUT_SECONDS,
            )
        except httpx.RequestError as exc:
            from app.services.media_service import MediaProviderRequestError
            raise MediaProviderRequestError("Runway API could not be reached") from exc

        if res.status_code >= 400:
            from app.services.media_service import MediaProviderRequestError
            raise MediaProviderRequestError(
                f"Runway API rejected task (HTTP {res.status_code}): {res.text[:200]}"
            )

        task_id = res.json().get("id")
        return VideoJobResult(
            status="queued",
            provider_job_id=task_id,
            progress_percent=0,
            is_mock=False,
        )

    def check_job_status(self, provider_job_id: str) -> VideoJobResult:
        if not settings.RUNWAY_API_KEY:
            from app.services.media_service import MediaProviderNotConfiguredError
            raise MediaProviderNotConfiguredError("Runway API key is unconfigured.")

        headers = {
            "Authorization": f"Bearer {settings.RUNWAY_API_KEY}",
            "X-Runway-Version": "2024-09-13",
        }
        url = f"{self._POLL_URL}/{provider_job_id}"

        try:
            res = httpx.get(url, headers=headers, timeout=settings.VIDEO_REQUEST_TIMEOUT_SECONDS)
        except httpx.RequestError as exc:
            from app.services.media_service import MediaProviderRequestError
            raise MediaProviderRequestError("Runway task polling failed") from exc

        if res.status_code >= 400:
            from app.services.media_service import MediaProviderRequestError
            raise MediaProviderRequestError(f"Runway API returned HTTP {res.status_code}")

        data = res.json()
        raw_status = data.get("status")
        progress_ratio = data.get("progressRatio", 0.0)
        progress_percent = int(progress_ratio * 100) if progress_ratio is not None else None

        if raw_status == "SUCCEEDED":
            outputs = data.get("output", [])
            video_url = outputs[0] if outputs else None
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
                progress_percent=100,
                video_bytes=video_bytes,
                video_url=video_url,
                mime_type="video/mp4",
                is_mock=False,
            )

        if raw_status in ("FAILED", "CANCELLED"):
            return VideoJobResult(
                status="failed" if raw_status == "FAILED" else "cancelled",
                provider_job_id=provider_job_id,
                error_message=data.get("failure") or data.get("failureCode") or "Runway task ended unsuccessfully",
                is_mock=False,
            )

        return VideoJobResult(
            status="processing" if raw_status == "RUNNING" else "queued",
            provider_job_id=provider_job_id,
            progress_percent=progress_percent,
            is_mock=False,
        )

    def cancel_job(self, provider_job_id: str) -> bool:
        if not settings.RUNWAY_API_KEY:
            return False
        headers = {
            "Authorization": f"Bearer {settings.RUNWAY_API_KEY}",
            "X-Runway-Version": "2024-09-13",
        }
        url = f"{self._POLL_URL}/{provider_job_id}/cancel"
        try:
            res = httpx.post(url, headers=headers, timeout=10.0)
            return res.status_code in (200, 204)
        except Exception:
            return False
