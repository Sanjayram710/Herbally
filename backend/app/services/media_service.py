import base64
import binascii
import hashlib
import os
import re
import struct
import uuid
from pathlib import Path
from typing import List, Optional, Tuple

import json
import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models.content import ContentAsset
from app.models.media import MediaAsset
from app.models.product import Product
from app.services.guardrails import GuardrailsService


class MediaProviderNotConfiguredError(RuntimeError):
    """Raised when a billable image provider has not been intentionally configured."""


class MediaProviderRequestError(RuntimeError):
    """Provider errors are intentionally sanitized before reaching an API client."""


class MediaValidationError(ValueError):
    """Raised for invalid generated output before it is stored locally."""


class MediaService:
    """Generates and persistently stores media without placing provider secrets in the client."""

    _OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations"

    @staticmethod
    def storage_directory() -> Path:
        configured = Path(settings.MEDIA_STORAGE_DIR)
        if not configured.is_absolute():
            configured = Path(__file__).resolve().parents[2] / configured
        configured.mkdir(parents=True, exist_ok=True)
        return configured.resolve()

    @staticmethod
    def list_for_content_asset(db: Session, content_asset_id: str) -> List[MediaAsset]:
        return (
            db.query(MediaAsset)
            .filter(MediaAsset.content_asset_id == content_asset_id)
            .order_by(MediaAsset.created_at.desc())
            .all()
        )

    @staticmethod
    def get_media_asset(db: Session, media_asset_id: str) -> Optional[MediaAsset]:
        return db.query(MediaAsset).filter(MediaAsset.id == media_asset_id).first()

    @staticmethod
    def _configured_provider() -> Tuple[str, str, str]:
        provider = settings.IMAGE_PROVIDER.strip().lower()
        if provider != "openai":
            raise MediaProviderNotConfiguredError(
                "Image generation is unconfigured. Set IMAGE_PROVIDER=openai and provide OPENAI_IMAGE_API_KEY on the backend."
            )
        if not settings.OPENAI_IMAGE_API_KEY:
            raise MediaProviderNotConfiguredError(
                "OpenAI Images is unconfigured. Provide OPENAI_IMAGE_API_KEY on the backend before generating a billable image."
            )
        return provider, settings.OPENAI_IMAGE_API_KEY, settings.OPENAI_IMAGE_MODEL

    @staticmethod
    def _image_mime_and_extension(image_bytes: bytes) -> Tuple[str, str]:
        if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png", "png"
        if image_bytes.startswith(b"\xff\xd8\xff"):
            return "image/jpeg", "jpg"
        if image_bytes.startswith(b"RIFF") and len(image_bytes) >= 12 and image_bytes[8:12] == b"WEBP":
            return "image/webp", "webp"
        if len(image_bytes) >= 8 and (image_bytes[4:8] == b"ftyp" or b"ftyp" in image_bytes[:16]):
            return "video/mp4", "mp4"
        if image_bytes.startswith(b"\x1a\x45\xdf\xa3"):
            return "video/webm", "webm"
        raise MediaValidationError("Media provider returned an unsupported format")

    @staticmethod
    def _image_dimensions(image_bytes: bytes, mime_type: str) -> Tuple[int, int]:
        """Read dimensions without decoding the image into an unbounded bitmap."""
        try:
            if mime_type == "image/png":
                if len(image_bytes) < 24 or image_bytes[12:16] != b"IHDR":
                    raise ValueError("missing PNG IHDR")
                return struct.unpack(">II", image_bytes[16:24])

            if mime_type == "image/jpeg":
                position = 2
                while position + 9 < len(image_bytes):
                    if image_bytes[position] != 0xFF:
                        position += 1
                        continue
                    marker = image_bytes[position + 1]
                    position += 2
                    while marker == 0xFF and position < len(image_bytes):
                        marker = image_bytes[position]
                        position += 1
                    if marker in (0xD8, 0xD9):
                        continue
                    if position + 2 > len(image_bytes):
                        break
                    segment_length = int.from_bytes(image_bytes[position:position + 2], "big")
                    if segment_length < 2 or position + segment_length > len(image_bytes):
                        break
                    if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                        if segment_length < 7:
                            break
                        height = int.from_bytes(image_bytes[position + 3:position + 5], "big")
                        width = int.from_bytes(image_bytes[position + 5:position + 7], "big")
                        return width, height
                    position += segment_length
                raise ValueError("missing JPEG frame dimensions")

            if mime_type == "image/webp":
                if len(image_bytes) < 30:
                    raise ValueError("truncated WebP")
                chunk_type = image_bytes[12:16]
                if chunk_type == b"VP8X":
                    width = int.from_bytes(image_bytes[24:27], "little") + 1
                    height = int.from_bytes(image_bytes[27:30], "little") + 1
                    return width, height
                if chunk_type == b"VP8 ":
                    if image_bytes[23:26] != b"\x9d\x01\x2a":
                        raise ValueError("invalid VP8 frame header")
                    width = int.from_bytes(image_bytes[26:28], "little") & 0x3FFF
                    height = int.from_bytes(image_bytes[28:30], "little") & 0x3FFF
                    return width, height
                if chunk_type == b"VP8L":
                    if image_bytes[20] != 0x2F or len(image_bytes) < 25:
                        raise ValueError("invalid VP8L frame header")
                    bits = int.from_bytes(image_bytes[21:25], "little")
                    return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
                raise ValueError("unsupported WebP encoding")

            if mime_type in ("video/mp4", "video/webm"):
                return 1080, 1920
        except (IndexError, struct.error, ValueError) as exc:
            raise MediaValidationError("Image provider returned malformed image dimensions") from exc
        raise MediaValidationError("Image provider returned an unsupported image format")

    @staticmethod
    def _validate_dimensions(width: int, height: int) -> None:
        if width < 1 or height < 1:
            raise MediaValidationError("Generated image has invalid dimensions")
        if width > settings.MAX_IMAGE_DIMENSION or height > settings.MAX_IMAGE_DIMENSION:
            raise MediaValidationError("Generated image dimensions exceed the configured limit")
        if width * height > settings.MAX_IMAGE_PIXELS:
            raise MediaValidationError("Generated image pixel count exceeds the configured limit")

    @classmethod
    def file_path(cls, media: MediaAsset) -> Path:
        """Resolve only application-generated file names inside MEDIA_STORAGE_DIR."""
        storage_dir = cls.storage_directory()
        if Path(media.storage_key).name != media.storage_key:
            raise MediaValidationError("Stored media path is invalid")
        path = (storage_dir / media.storage_key).resolve()
        if path.parent != storage_dir:
            raise MediaValidationError("Stored media path is outside the media directory")
        if not path.is_file():
            raise FileNotFoundError("Stored media file is unavailable")
        return path

    @staticmethod
    def _safe_prompt(asset: ContentAsset) -> str:
        prompt = (asset.image_prompt or "").strip()
        if not prompt:
            raise MediaValidationError("This content asset needs an image prompt before an image can be generated")
        if len(prompt) > settings.IMAGE_MAX_PROMPT_CHARS:
            raise MediaValidationError("Image prompt exceeds the configured maximum length")
        is_safe, violations = GuardrailsService.validate_claims(prompt)
        if not is_safe:
            raise MediaValidationError("Image prompt contains a prohibited medical or health claim")
        return re.sub(r"\s+", " ", prompt)

    @classmethod
    def generate_for_content_asset(
        cls,
        db: Session,
        content_asset_id: str,
        *,
        confirmed: bool,
        size: str,
        quality: str,
    ) -> MediaAsset:
        if not confirmed:
            raise MediaValidationError(
                "Confirm image generation before continuing. This calls a configured provider and may incur charges."
            )

        asset = db.query(ContentAsset).filter(ContentAsset.id == content_asset_id).first()
        if not asset:
            raise MediaValidationError("Content asset not found")

        provider, api_key, model = cls._configured_provider()
        prompt = cls._safe_prompt(asset)
        try:
            response = httpx.post(
                cls._OPENAI_IMAGES_URL,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "prompt": prompt, "size": size, "quality": quality},
                timeout=settings.IMAGE_REQUEST_TIMEOUT_SECONDS,
            )
        except httpx.RequestError as exc:
            raise MediaProviderRequestError("Image provider could not be reached") from exc

        if response.status_code >= 400:
            raise MediaProviderRequestError(
                f"Image provider rejected the request (HTTP {response.status_code}). Check the configured model, account permissions, and request settings."
            )

        try:
            encoded_image = response.json()["data"][0]["b64_json"]
            image_bytes = base64.b64decode(encoded_image, validate=True)
        except (KeyError, IndexError, TypeError, ValueError, binascii.Error) as exc:
            raise MediaProviderRequestError("Image provider returned no valid image data") from exc

        if not image_bytes or len(image_bytes) > settings.MEDIA_MAX_BYTES:
            raise MediaValidationError("Generated image is empty or exceeds the configured storage limit")

        mime_type, extension = cls._image_mime_and_extension(image_bytes)
        width, height = cls._image_dimensions(image_bytes, mime_type)
        cls._validate_dimensions(width, height)
        media_id = f"med-{uuid.uuid4().hex[:12]}"
        file_name = f"{media_id}.{extension}"
        storage_dir = cls.storage_directory()
        final_path = storage_dir / file_name
        temporary_path = storage_dir / f".{file_name}.tmp"
        try:
            temporary_path.write_bytes(image_bytes)
            os.replace(temporary_path, final_path)
        except OSError as exc:
            if temporary_path.exists():
                temporary_path.unlink(missing_ok=True)
            raise MediaProviderRequestError("Generated image could not be saved to durable storage") from exc

        # The API route is authenticated; do not expose storage keys through a
        # public StaticFiles mount.
        media_url = f"/api/media/{media_id}"
        media = MediaAsset(
            id=media_id,
            content_asset_id=asset.id,
            provider=provider,
            provider_model=model,
            prompt=prompt,
            storage_key=file_name,
            media_url=media_url,
            mime_type=mime_type,
            byte_size=len(image_bytes),
            checksum_sha256=hashlib.sha256(image_bytes).hexdigest(),
            status="generated",
        )
        try:
            db.add(media)
            # Preserve the established ContentAsset contract while recording full media metadata separately.
            asset.generated_media_url = media_url
            db.commit()
            db.refresh(media)
        except Exception:
            db.rollback()
            final_path.unlink(missing_ok=True)
            raise
        return media

    @classmethod
    def list_workspace_media(
        cls,
        db: Session,
        workspace_id: str,
        *,
        brand_id: Optional[str] = None,
        product_id: Optional[str] = None,
        asset_type: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[MediaAsset]:
        query = db.query(MediaAsset).filter(MediaAsset.workspace_id == workspace_id)
        if brand_id:
            query = query.filter(MediaAsset.brand_id == brand_id)
        if product_id:
            query = query.filter(MediaAsset.product_id == product_id)
        if asset_type:
            query = query.filter(MediaAsset.asset_type == asset_type)
        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            query = query.filter(
                (MediaAsset.prompt.ilike(term))
                | (MediaAsset.id.ilike(term))
                | (MediaAsset.provider.ilike(term))
                | (MediaAsset.style_preset.ilike(term))
            )
        return query.order_by(MediaAsset.created_at.desc()).offset(offset).limit(limit).all()

    @classmethod
    def save_product_image(
        cls,
        db: Session,
        *,
        product_id: str,
        workspace_id: str,
        image_bytes: bytes,
        original_filename: str = "product.jpg",
        brand_id: Optional[str] = None,
    ) -> MediaAsset:
        if not image_bytes:
            raise MediaValidationError("Uploaded image file is empty")
        if len(image_bytes) > settings.MEDIA_MAX_BYTES:
            raise MediaValidationError("Uploaded file exceeds maximum permitted image size")

        mime_type, extension = cls._image_mime_and_extension(image_bytes)
        width, height = cls._image_dimensions(image_bytes, mime_type)
        cls._validate_dimensions(width, height)

        resolved_brand_id = brand_id
        if not resolved_brand_id:
            prod = db.query(Product).filter(Product.id == product_id).first()
            if prod:
                resolved_brand_id = prod.brand_id

        media_id = f"med-{uuid.uuid4().hex[:12]}"
        file_name = f"{media_id}.{extension}"
        storage_dir = cls.storage_directory()
        final_path = storage_dir / file_name
        temporary_path = storage_dir / f".{file_name}.tmp"
        try:
            temporary_path.write_bytes(image_bytes)
            os.replace(temporary_path, final_path)
        except OSError as exc:
            if temporary_path.exists():
                temporary_path.unlink(missing_ok=True)
            raise MediaProviderRequestError("Uploaded image could not be saved to durable storage") from exc

        media_url = f"/api/media/{media_id}"
        media = MediaAsset(
            id=media_id,
            workspace_id=workspace_id,
            brand_id=resolved_brand_id,
            product_id=product_id,
            source_asset_id=None,
            content_asset_id=f"product-photo-{product_id}",
            campaign_id=None,
            asset_type="product_upload",
            style_preset="original_upload",
            aspect_ratio=f"{width}:{height}" if width == height else "1:1",
            provider="upload",
            provider_model="original",
            prompt=f"Uploaded product photography ({original_filename[:50]})",
            storage_key=file_name,
            media_url=media_url,
            mime_type=mime_type,
            byte_size=len(image_bytes),
            checksum_sha256=hashlib.sha256(image_bytes).hexdigest(),
            status="uploaded",
            metadata_json=json.dumps({"original_filename": original_filename, "width": width, "height": height}),
        )
        try:
            db.add(media)
            db.commit()
            db.refresh(media)
        except Exception:
            db.rollback()
            final_path.unlink(missing_ok=True)
            raise
        return media

    @classmethod
    def generate_studio_asset(
        cls,
        db: Session,
        principal,
        payload,
    ) -> Tuple[MediaAsset, Optional[MediaAsset], bool, Optional[str]]:
        """Generate high-end product photography asset via provider abstraction with provenance tracking."""
        from app.services.authorization_service import AuthorizationService
        from app.services.rate_limit_service import RateLimitService
        from app.services.image_providers import provider_registry

        if not payload.confirmed:
            raise MediaValidationError(
                "Please confirm your generation request before proceeding. "
                "This action generates assets using the selected studio pipeline."
            )

        # 1. Authorize Brand & Workspace
        AuthorizationService.owned_brand(db, principal, payload.brand_id)

        # 2. Authorize Product if provided
        product = None
        if payload.product_id:
            product = AuthorizationService.owned_product(db, principal, payload.product_id)

        # 3. Authorize Source Asset if provided or fallback to product image
        source_media = None
        source_bytes = None
        effective_source_id = payload.source_asset_id
        if not effective_source_id and product and product.image_url:
            candidate = product.image_url.strip("/").split("/")[-1].split(".")[0]
            if candidate.startswith("med-"):
                effective_source_id = candidate

        if effective_source_id:
            try:
                source_media = AuthorizationService.owned_media_asset(db, principal, effective_source_id)
                source_path = cls.file_path(source_media)
                if source_path.exists():
                    source_bytes = source_path.read_bytes()
            except Exception as exc:
                if payload.source_asset_id:
                    raise MediaValidationError(f"Could not load source media asset: {exc}") from exc
                source_media = None
                source_bytes = None

        # 4. Enforce Rate Limiting
        RateLimitService.enforce(
            key=f"image-generation:{principal.workspace_id}:{principal.subject_id}",
            limit=settings.IMAGE_GENERATION_RATE_LIMIT,
            window_seconds=settings.IMAGE_GENERATION_RATE_WINDOW_SECONDS,
        )

        # 5. Guardrails & Prohibited Claim Checking
        prompt = (payload.custom_prompt or "").strip()
        if not prompt:
            raise MediaValidationError("Custom creative prompt is required")
        if len(prompt) > settings.IMAGE_MAX_PROMPT_CHARS:
            raise MediaValidationError(f"Prompt length exceeds {settings.IMAGE_MAX_PROMPT_CHARS} characters limit")
        is_safe, violations = GuardrailsService.validate_claims(prompt)
        if not is_safe:
            raise MediaValidationError(f"Creative prompt contains prohibited medical/health claims: {', '.join(violations)}")

        # 6. Execute Generation via Provider
        provider = provider_registry.get_provider(
            payload.provider,
            allow_demo_fallback=payload.allow_demo_fallback,
        )
        gen_result = provider.generate(
            prompt=prompt,
            aspect_ratio=payload.aspect_ratio,
            output_quality=payload.output_quality,
            model=payload.model,
            source_image_bytes=source_bytes,
            source_mime_type=source_media.mime_type if source_media else None,
            style_preset=payload.style_preset,
            product_name=product.name if product else None,
        )

        # 7. Validate Output
        if not gen_result.image_bytes or len(gen_result.image_bytes) > settings.MEDIA_MAX_BYTES:
            raise MediaValidationError("Generated image is empty or exceeds the configured storage limit")
        mime_type, extension = cls._image_mime_and_extension(gen_result.image_bytes)
        width, height = cls._image_dimensions(gen_result.image_bytes, mime_type)
        cls._validate_dimensions(width, height)

        # 8. Persist to Storage Atomically
        media_id = f"med-{uuid.uuid4().hex[:12]}"
        file_name = f"{media_id}.{extension}"
        storage_dir = cls.storage_directory()
        final_path = storage_dir / file_name
        temporary_path = storage_dir / f".{file_name}.tmp"
        try:
            temporary_path.write_bytes(gen_result.image_bytes)
            os.replace(temporary_path, final_path)
        except OSError as exc:
            if temporary_path.exists():
                temporary_path.unlink(missing_ok=True)
            raise MediaProviderRequestError("Generated image could not be saved to durable storage") from exc

        media_url = f"/api/media/{media_id}"
        asset_type = "variation" if source_media else "studio_generation"
        status_val = "demo_simulation" if gen_result.is_mock else "generated"

        meta = {
            "is_mock": gen_result.is_mock,
            "warning": gen_result.warning,
            "width": width,
            "height": height,
            "style_preset": payload.style_preset,
            "aspect_ratio": payload.aspect_ratio,
            "quality": payload.output_quality,
        }

        media = MediaAsset(
            id=media_id,
            workspace_id=principal.workspace_id,
            brand_id=payload.brand_id,
            product_id=payload.product_id,
            source_asset_id=source_media.id if source_media else None,
            content_asset_id=f"studio-{payload.product_id or payload.brand_id}",
            campaign_id=None,
            asset_type=asset_type,
            style_preset=payload.style_preset,
            aspect_ratio=payload.aspect_ratio,
            provider=gen_result.provider,
            provider_model=gen_result.model,
            prompt=prompt,
            storage_key=file_name,
            media_url=media_url,
            mime_type=mime_type,
            byte_size=len(gen_result.image_bytes),
            checksum_sha256=hashlib.sha256(gen_result.image_bytes).hexdigest(),
            status=status_val,
            metadata_json=json.dumps(meta),
        )

        try:
            db.add(media)
            db.commit()
            db.refresh(media)
        except Exception:
            db.rollback()
            final_path.unlink(missing_ok=True)
            raise

        return media, source_media, gen_result.is_mock, gen_result.warning

    @classmethod
    def delete_media_asset(cls, db: Session, principal, media_id: str) -> bool:
        """Safely delete media asset and physical disk file with workspace authorization."""
        from app.services.authorization_service import AuthorizationService

        media = AuthorizationService.owned_media_asset(db, principal, media_id)
        # Clear references from products if product.image_url matches
        db.query(Product).filter(
            Product.image_url == media.media_url,
            Product.workspace_id == principal.workspace_id,
        ).update({"image_url": None})

        # Remove local file
        try:
            path = cls.file_path(media)
            if path.exists():
                path.unlink(missing_ok=True)
        except Exception:
            pass

        db.delete(media)
        db.commit()
        return True

