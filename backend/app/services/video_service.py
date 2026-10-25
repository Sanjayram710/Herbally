"""Durable Video Generation Service.

Orchestrates asynchronous video jobs, provider capability enforcement,
prompt claim guardrails, SQLite job persistence, and authenticated media linkage.
"""

import datetime
import hashlib
import json
import os
import uuid
from typing import List, Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.models.media import MediaAsset
from app.models.video import VideoJob
from app.schemas.video import VideoJobCreateRequest
from app.services.authorization_service import AuthorizationService, Principal
from app.services.guardrails import GuardrailsService
from app.services.media_service import MediaProviderNotConfiguredError, MediaService, MediaValidationError
from app.services.rate_limit_service import RateLimitService
from app.services.video_providers import video_provider_registry


class VideoService:
    @classmethod
    def create_video_job(
        cls,
        db: Session,
        principal: Principal,
        req: VideoJobCreateRequest,
    ) -> VideoJob:
        if not req.confirmed:
            raise MediaValidationError("Confirmation required: video generation calls provider pipelines.")

        # 1. Authorize Workspace and Brand
        AuthorizationService.owned_brand(db, principal, req.brand_id)

        # 2. Authorize Product if specified
        if req.product_id:
            AuthorizationService.owned_product(db, principal, req.product_id)

        # 3. Authorize and load Source Media Asset if specified
        source_bytes = None
        source_mime = None
        if req.source_asset_id:
            source_media = AuthorizationService.owned_media_asset(db, principal, req.source_asset_id)
            try:
                source_path = MediaService.file_path(source_media)
                source_bytes = source_path.read_bytes()
                source_mime = source_media.mime_type
            except Exception as exc:
                raise MediaValidationError(f"Could not load keyframe media: {exc}") from exc

        # 4. Enforce AYUSH/FDA Claim Guardrails on prompt and script
        is_safe_prompt, prompt_violations = GuardrailsService.validate_claims(req.prompt)
        if not is_safe_prompt:
            raise MediaValidationError(
                f"Video prompt contains prohibited medical/health claims: {', '.join(prompt_violations)}"
            )

        if req.script:
            is_safe_script, script_violations = GuardrailsService.validate_claims(req.script)
            if not is_safe_script:
                raise MediaValidationError(
                    f"Video script contains prohibited medical/health claims: {', '.join(script_violations)}"
                )

        # 5. Enforce Rate Limiting
        RateLimitService.enforce(
            key=f"video-generation:{principal.workspace_id}:{principal.subject_id}",
            limit=settings.IMAGE_GENERATION_RATE_LIMIT,
            window_seconds=settings.IMAGE_GENERATION_RATE_WINDOW_SECONDS,
        )

        # 6. Prevent Duplicate Simultaneous Submissions
        two_mins_ago = datetime.datetime.utcnow() - datetime.timedelta(minutes=2)
        duplicate = (
            db.query(VideoJob)
            .filter(
                VideoJob.workspace_id == principal.workspace_id,
                VideoJob.brand_id == req.brand_id,
                VideoJob.product_id == req.product_id,
                VideoJob.prompt == req.prompt,
                VideoJob.status.in_(["queued", "processing"]),
                VideoJob.created_at >= two_mins_ago,
            )
            .first()
        )
        if duplicate:
            raise MediaValidationError("Duplicate active video job already in progress. Please allow it to complete.")

        # 7. Resolve Provider & Validate Capabilities
        provider = video_provider_registry.get_provider(
            req.provider,
            allow_demo_fallback=req.allow_demo_fallback,
        )
        info = provider.get_info()

        if not info.is_configured and not req.allow_demo_fallback:
            raise MediaProviderNotConfiguredError(
                f"Video provider '{info.name}' is unconfigured. {info.requires_credentials}"
            )

        if req.aspect_ratio not in info.supported_aspect_ratios:
            raise MediaValidationError(
                f"Provider '{info.name}' does not support aspect ratio '{req.aspect_ratio}'. "
                f"Supported: {info.supported_aspect_ratios}"
            )

        if info.id != "demo_mode" and req.duration_seconds not in info.supported_durations:
            raise MediaValidationError(
                f"Provider '{info.name}' natively generates {info.supported_durations}s videos. "
                f"Requested {req.duration_seconds}s is not supported directly."
            )

        # 8. Create Durable Job Record
        job_id = f"vjob-{uuid.uuid4().hex[:12]}"
        job = VideoJob(
            id=job_id,
            workspace_id=principal.workspace_id,
            brand_id=req.brand_id,
            product_id=req.product_id,
            source_asset_id=req.source_asset_id,
            provider=provider.provider_id,
            provider_model=info.models[0] if info.models else "default",
            status="queued",
            progress_percent=0,
            prompt=req.prompt,
            script=req.script,
            template_id=req.template_id,
            language=req.language,
            aspect_ratio=req.aspect_ratio,
            duration_seconds=req.duration_seconds,
            created_at=datetime.datetime.utcnow(),
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        # 9. Submit to Provider
        submit_result = provider.submit_job(
            prompt=req.prompt,
            script=req.script,
            aspect_ratio=req.aspect_ratio,
            duration_seconds=req.duration_seconds,
            source_image_bytes=source_bytes,
            source_mime_type=source_mime,
            settings={"template_id": req.template_id, "language": req.language},
        )

        job.provider_job_id = submit_result.provider_job_id
        job.status = submit_result.status
        job.progress_percent = submit_result.progress_percent
        job.started_at = datetime.datetime.utcnow()
        job.error_details = submit_result.error_message
        job.settings_json = json.dumps({
            "is_demo": submit_result.is_mock,
            "warning": submit_result.warning,
            "pricing_note": info.official_pricing_note,
        })

        # If provider returned completed payload synchronously
        if submit_result.status == "completed" and submit_result.video_bytes:
            cls._attach_completed_video_asset(db, principal, job, submit_result.video_bytes, submit_result.mime_type)

        db.commit()
        db.refresh(job)
        return job

    @classmethod
    def poll_video_job(cls, db: Session, principal: Principal, job_id: str) -> VideoJob:
        job = AuthorizationService.owned_video_job(db, principal, job_id)

        if job.status in ("queued", "processing") and job.provider_job_id:
            provider = video_provider_registry.get_provider(job.provider, allow_demo_fallback=True)
            poll_result = provider.check_job_status(job.provider_job_id)

            job.status = poll_result.status
            job.progress_percent = poll_result.progress_percent
            job.error_details = poll_result.error_message

            if poll_result.status == "completed" and poll_result.video_bytes:
                cls._attach_completed_video_asset(
                    db, principal, job, poll_result.video_bytes, poll_result.mime_type
                )
            elif poll_result.status in ("failed", "cancelled"):
                job.completed_at = datetime.datetime.utcnow()

            db.commit()
            db.refresh(job)

        return job

    @classmethod
    def list_video_jobs(
        cls,
        db: Session,
        principal: Principal,
        *,
        brand_id: Optional[str] = None,
        product_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[VideoJob]:
        query = db.query(VideoJob).filter(VideoJob.workspace_id == principal.workspace_id)
        if brand_id:
            query = query.filter(VideoJob.brand_id == brand_id)
        if product_id:
            query = query.filter(VideoJob.product_id == product_id)
        return query.order_by(VideoJob.created_at.desc()).limit(limit).all()

    @classmethod
    def cancel_video_job(cls, db: Session, principal: Principal, job_id: str) -> VideoJob:
        job = AuthorizationService.owned_video_job(db, principal, job_id)
        if job.status in ("queued", "processing"):
            provider = video_provider_registry.get_provider(job.provider, allow_demo_fallback=True)
            if job.provider_job_id:
                provider.cancel_job(job.provider_job_id)
            job.status = "cancelled"
            job.error_details = "Cancelled by user"
            job.completed_at = datetime.datetime.utcnow()
            db.commit()
            db.refresh(job)
        return job

    @classmethod
    def retry_video_job(cls, db: Session, principal: Principal, job_id: str) -> VideoJob:
        job = AuthorizationService.owned_video_job(db, principal, job_id)
        if job.status not in ("failed", "cancelled"):
            raise MediaValidationError("Only failed or cancelled jobs can be retried.")

        provider = video_provider_registry.get_provider(job.provider, allow_demo_fallback=True)
        res = provider.submit_job(
            prompt=job.prompt,
            script=job.script,
            aspect_ratio=job.aspect_ratio,
            duration_seconds=job.duration_seconds,
            settings={"template_id": job.template_id, "language": job.language},
        )
        job.provider_job_id = res.provider_job_id
        job.status = res.status
        job.progress_percent = res.progress_percent
        job.error_details = res.error_message
        job.started_at = datetime.datetime.utcnow()
        job.completed_at = None

        if res.status == "completed" and res.video_bytes:
            cls._attach_completed_video_asset(db, principal, job, res.video_bytes, res.mime_type)

        db.commit()
        db.refresh(job)
        return job

    @classmethod
    def _attach_completed_video_asset(
        cls,
        db: Session,
        principal: Principal,
        job: VideoJob,
        video_bytes: bytes,
        mime_type: Optional[str] = "video/mp4",
    ) -> MediaAsset:
        """Persist generated video file to storage and link MediaAsset record."""
        media_id = f"med-vid-{uuid.uuid4().hex[:10]}"
        ext = "mp4" if "mp4" in (mime_type or "") else "webm"
        file_name = f"{media_id}.{ext}"

        storage_dir = MediaService.storage_directory()
        final_path = storage_dir / file_name
        temp_path = storage_dir / f".{file_name}.tmp"

        temp_path.write_bytes(video_bytes)
        os.replace(temp_path, final_path)

        media_url = f"/api/media/{media_id}"
        is_demo = job.provider == "demo_mode"

        meta = {
            "job_id": job.id,
            "provider": job.provider,
            "template_id": job.template_id,
            "language": job.language,
            "duration_seconds": job.duration_seconds,
            "aspect_ratio": job.aspect_ratio,
            "is_mock": is_demo,
        }

        media = MediaAsset(
            id=media_id,
            workspace_id=principal.workspace_id,
            brand_id=job.brand_id,
            product_id=job.product_id,
            source_asset_id=job.source_asset_id,
            content_asset_id=f"video-{job.id}",
            campaign_id=None,
            asset_type="video",
            style_preset=job.template_id,
            aspect_ratio=job.aspect_ratio,
            provider=job.provider,
            provider_model=job.provider_model,
            prompt=job.prompt,
            storage_key=file_name,
            media_url=media_url,
            mime_type=mime_type or "video/mp4",
            byte_size=len(video_bytes),
            checksum_sha256=hashlib.sha256(video_bytes).hexdigest(),
            status="demo_simulation" if is_demo else "generated",
            metadata_json=json.dumps(meta),
        )

        db.add(media)
        job.output_media_id = media_id
        job.completed_at = datetime.datetime.utcnow()
        return media
