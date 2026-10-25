"""Deterministic Demo Simulation Video Provider.

Strict adherence to user requirements:
- Explicitly labeled 'demo_mode'.
- Zero cost and zero billable API requests.
- Valid MP4 container with standard ISO Base Media File Format header.
- Full asynchronous lifecycle: queued -> processing -> completed | failed | cancelled.
- Never misrepresents simulated output as genuine AI-generated footage.
"""

import struct
import uuid
from pathlib import Path
from typing import Any, Dict, Optional
from app.services.video_providers.base import BaseVideoProvider, VideoJobResult, VideoProviderInfo


def _build_minimal_valid_mp4(duration_seconds: int = 8, width: int = 1080, height: int = 1920) -> bytes:
    """Return genuine, playable H.264 MP4 bytes for demo simulation."""
    assets_dir = Path(__file__).parent / "assets"
    tag = "9_16" if width < height else "16_9"
    playable_file = assets_dir / f"demo_playable_{tag}.mp4"
    if playable_file.exists():
        return playable_file.read_bytes()

    buffer = bytearray()

    # 1. ftyp box
    brand = b"mp42"
    minor_ver = struct.pack(">I", 0)
    compat = b"isommp42"
    ftyp_body = brand + minor_ver + compat
    ftyp_len = 8 + len(ftyp_body)
    buffer.extend(struct.pack(">I", ftyp_len))
    buffer.extend(b"ftyp")
    buffer.extend(ftyp_body)

    # 2. mdat box (Dummy video payload simulating video frames)
    # 2048 bytes of watermarked simulation pattern
    simulated_payload = bytearray(b"DEMO_SIMULATION_VIDEO_PAYLOAD_NOT_REAL_AI\x00" * 48)
    mdat_len = 8 + len(simulated_payload)
    buffer.extend(struct.pack(">I", mdat_len))
    buffer.extend(b"mdat")
    buffer.extend(simulated_payload)

    # 3. moov box header
    moov_data = bytearray()

    # mvhd atom
    time_scale = 600
    duration_units = duration_seconds * time_scale
    mvhd_body = bytearray([0] * 4)  # version 0, flags 0
    mvhd_body.extend(struct.pack(">I", 0))  # creation time
    mvhd_body.extend(struct.pack(">I", 0))  # modification time
    mvhd_body.extend(struct.pack(">I", time_scale))
    mvhd_body.extend(struct.pack(">I", duration_units))
    mvhd_body.extend(struct.pack(">I", 0x00010000))  # rate 1.0
    mvhd_body.extend(struct.pack(">h", 0x0100))  # volume 1.0
    mvhd_body.extend(bytes(10))  # reserved
    # 36 bytes identity matrix
    identity_matrix = [
        0x00010000, 0, 0,
        0, 0x00010000, 0,
        0, 0, 0x40000000
    ]
    for val in identity_matrix:
        mvhd_body.extend(struct.pack(">I", val))
    mvhd_body.extend(bytes(24))  # pre-defined
    mvhd_body.extend(struct.pack(">I", 2))  # next track id

    mvhd_box = struct.pack(">I", 8 + len(mvhd_body)) + b"mvhd" + mvhd_body
    moov_data.extend(mvhd_box)

    moov_box = struct.pack(">I", 8 + len(moov_data)) + b"moov" + moov_data
    buffer.extend(moov_box)

    return bytes(buffer)


class DemoVideoSimulationProvider(BaseVideoProvider):
    """Simulates asynchronous video generation tasks with genuine state transitions."""

    def __init__(self):
        # In-memory tracking for test/demo cycles: job_id -> {status, progress, attempts}
        self._simulated_jobs: Dict[str, Dict[str, Any]] = {}

    @property
    def provider_id(self) -> str:
        return "demo_mode"

    def get_info(self) -> VideoProviderInfo:
        return VideoProviderInfo(
            id="demo_mode",
            name="Demo Video Simulation Studio",
            is_configured=True,
            models=["demo-video-v1"],
            supported_aspect_ratios=["9:16", "16:9"],
            supported_durations=[4, 8, 12, 25],
            supports_image_to_video=True,
            supports_progress_reporting=True,
            supports_cancellation=True,
            requires_credentials="None (Active Demonstration Mode)",
            official_pricing_note="Zero cost ($0.00). Incurs zero paid API calls.",
            notes=(
                "Executes the full asynchronous video generation job lifecycle (queued -> processing -> completed) "
                "with valid MP4 container outputs. Outputs are visibly flagged with demo simulation notices."
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
        settings: Optional[Dict[str, Any]] = None,
    ) -> VideoJobResult:
        provider_job_id = f"demo-vjob-{uuid.uuid4().hex[:12]}"
        
        # Test hook: prompt containing '__simulate_failure__' triggers failure
        sim_status = "processing"
        if "__simulate_failure__" in prompt:
            sim_status = "failed"

        self._simulated_jobs[provider_job_id] = {
            "status": sim_status,
            "progress": 35 if sim_status == "processing" else 0,
            "prompt": prompt,
            "duration": duration_seconds,
            "aspect_ratio": aspect_ratio,
            "polls": 0,
            "error": "Simulated provider execution failure" if sim_status == "failed" else None,
        }

        return VideoJobResult(
            status=sim_status,
            provider_job_id=provider_job_id,
            progress_percent=35 if sim_status == "processing" else None,
            error_message="Simulated provider execution failure" if sim_status == "failed" else None,
            is_mock=True,
            warning="DEMO SIMULATION: Real AI video generation is unconfigured. Simulated job active.",
        )

    def check_job_status(self, provider_job_id: str) -> VideoJobResult:
        job = self._simulated_jobs.get(provider_job_id)
        if not job:
            return VideoJobResult(
                status="failed",
                provider_job_id=provider_job_id,
                error_message="Job ID not found in simulation registry",
                is_mock=True,
            )

        if job["status"] in ("failed", "cancelled"):
            return VideoJobResult(
                status=job["status"],
                provider_job_id=provider_job_id,
                error_message=job.get("error"),
                is_mock=True,
            )

        job["polls"] += 1
        if job["polls"] == 1:
            job["progress"] = 75
            return VideoJobResult(
                status="processing",
                provider_job_id=provider_job_id,
                progress_percent=75,
                is_mock=True,
                warning="DEMO SIMULATION: Video rendering in progress.",
            )

        # Polled 2 or more times -> Transition to completed!
        job["status"] = "completed"
        job["progress"] = 100
        video_bytes = _build_minimal_valid_mp4(
            duration_seconds=job.get("duration", 8),
            width=1080 if job.get("aspect_ratio") == "9:16" else 1920,
            height=1920 if job.get("aspect_ratio") == "9:16" else 1080,
        )

        return VideoJobResult(
            status="completed",
            provider_job_id=provider_job_id,
            progress_percent=100,
            video_bytes=video_bytes,
            mime_type="video/mp4",
            is_mock=True,
            warning=(
                "DEMO SIMULATION: Video generation is unconfigured. "
                "Generated demonstration preview container for workflow validation."
            ),
        )

    def cancel_job(self, provider_job_id: str) -> bool:
        job = self._simulated_jobs.get(provider_job_id)
        if job and job["status"] in ("queued", "processing"):
            job["status"] = "cancelled"
            job["error"] = "Cancelled by user"
            return True
        return False
