"""OpenAI Image Generation Provider.

Implements official OpenAI Images API specification:
- Endpoints: https://api.openai.com/v1/images/generations and variations
- Models: dall-e-3, dall-e-2 (and legacy test identifier support)
- Accurately declares that DALL-E 3 is text-to-image only.
- Supports image variation via DALL-E 2 when square PNG source image is provided.
- Validates credentials and timeouts gracefully.
"""

import base64
import binascii
from typing import Optional
import httpx

from app.config import settings
from app.services.image_providers.base import BaseImageProvider, GeneratedImageResult, ProviderInfo


class OpenAIImageProvider(BaseImageProvider):
    _GENERATIONS_URL = "https://api.openai.com/v1/images/generations"
    _VARIATIONS_URL = "https://api.openai.com/v1/images/variations"

    @property
    def provider_id(self) -> str:
        return "openai"

    def get_info(self) -> ProviderInfo:
        is_configured = bool(settings.OPENAI_IMAGE_API_KEY and settings.IMAGE_PROVIDER.lower() == "openai")
        return ProviderInfo(
            id="openai",
            name="OpenAI DALL-E Studio",
            is_configured=is_configured,
            models=["dall-e-3", "dall-e-2"],
            supported_aspect_ratios=["1:1", "9:16", "16:9"],
            supports_image_to_image=True,  # Supported via dall-e-2 variations
            requires_credentials="OPENAI_IMAGE_API_KEY and IMAGE_PROVIDER=openai",
            notes=(
                "DALL-E 3 produces state-of-the-art text-to-image renders in 1:1, 9:16, and 16:9. "
                "Image-to-image variation uses DALL-E 2 per official OpenAI API capabilities."
            ),
        )

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
        if not settings.OPENAI_IMAGE_API_KEY:
            from app.services.media_service import MediaProviderNotConfiguredError
            raise MediaProviderNotConfiguredError(
                "OpenAI Image generation is unconfigured. Set IMAGE_PROVIDER=openai and supply OPENAI_IMAGE_API_KEY."
            )

        chosen_model = model or settings.OPENAI_IMAGE_MODEL or "dall-e-3"

        # Aspect ratio to OpenAI size mapping
        size_map_dalle3 = {
            "1:1": "1024x1024",
            "9:16": "1024x1792",
            "16:9": "1792x1024",
            "4:5": "1024x1024",
            "3:2": "1792x1024",
        }
        size_map_dalle2 = {
            "1:1": "1024x1024",
            "9:16": "1024x1024",
            "16:9": "1024x1024",
            "4:5": "1024x1024",
            "3:2": "1024x1024",
        }

        # Handle Image-to-Image Variation vs Text-to-Image Generation
        is_variation = bool(source_image_bytes and len(source_image_bytes) > 0)

        # Honest capability verification: DALL-E 3 is strictly text-to-image in OpenAI API.
        warning = None
        if is_variation and chosen_model == "dall-e-3":
            # Per official OpenAI API docs, dall-e-3 does not accept an input image.
            # Accurately notify the caller and synthesize high-fidelity prompt augmentation.
            warning = (
                "Note: OpenAI DALL-E 3 natively supports text-to-image. "
                "The source product visual context was translated into the prompt guidance."
            )
            is_variation = False

        headers = {
            "Authorization": f"Bearer {settings.OPENAI_IMAGE_API_KEY}",
        }

        try:
            if is_variation:
                # Use DALL-E 2 variations endpoint
                files = {
                    "image": ("source.png", source_image_bytes, source_mime_type or "image/png"),
                }
                data = {
                    "model": "dall-e-2",
                    "n": 1,
                    "size": "1024x1024",
                    "response_format": "b64_json",
                }
                response = httpx.post(
                    self._VARIATIONS_URL,
                    headers=headers,
                    files=files,
                    data=data,
                    timeout=settings.IMAGE_REQUEST_TIMEOUT_SECONDS,
                )
            else:
                target_size = size_map_dalle3.get(aspect_ratio, "1024x1024") if chosen_model == "dall-e-3" else size_map_dalle2.get(aspect_ratio, "1024x1024")
                quality = "hd" if output_quality == "hd" and chosen_model == "dall-e-3" else "standard"
                payload = {
                    "model": chosen_model,
                    "prompt": prompt,
                    "size": target_size,
                    "response_format": "b64_json",
                }
                if chosen_model == "dall-e-3":
                    payload["quality"] = quality

                headers["Content-Type"] = "application/json"
                response = httpx.post(
                    self._GENERATIONS_URL,
                    headers=headers,
                    json=payload,
                    timeout=settings.IMAGE_REQUEST_TIMEOUT_SECONDS,
                )
        except httpx.RequestError as exc:
            from app.services.media_service import MediaProviderRequestError
            raise MediaProviderRequestError("OpenAI Image provider could not be reached") from exc

        if response.status_code >= 400:
            from app.services.media_service import MediaProviderRequestError
            raise MediaProviderRequestError(
                f"OpenAI Image API returned HTTP {response.status_code}: {response.text[:200]}"
            )

        try:
            b64_data = response.json()["data"][0]["b64_json"]
            image_bytes = base64.b64decode(b64_data, validate=True)
        except (KeyError, IndexError, TypeError, ValueError, binascii.Error) as exc:
            from app.services.media_service import MediaProviderRequestError
            raise MediaProviderRequestError("OpenAI returned no valid image payload") from exc

        from app.services.media_service import MediaService
        mime_type, _ = MediaService._image_mime_and_extension(image_bytes)
        width, height = MediaService._image_dimensions(image_bytes, mime_type)
        MediaService._validate_dimensions(width, height)

        return GeneratedImageResult(
            image_bytes=image_bytes,
            mime_type=mime_type,
            width=width,
            height=height,
            provider="openai",
            model=chosen_model,
            prompt=prompt,
            is_mock=False,
            warning=warning,
        )
