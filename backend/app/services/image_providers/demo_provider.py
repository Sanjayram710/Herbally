"""Deterministic Demo Simulation Provider.

Strict adherence to user requirements:
- Explicitly labeled 'demo_mode'.
- Never pretends to be a real AI generation.
- Yields a valid, commercial studio preview PNG incorporating source product photography.
- Incurs zero billable API requests.
"""

import io
import struct
import zlib
from typing import Optional
from PIL import Image, ImageDraw, ImageFilter
from app.services.image_providers.base import BaseImageProvider, GeneratedImageResult, ProviderInfo


def _generate_studio_png(
    width: int,
    height: int,
    preset: str = "product_hero",
    prompt: str = "",
    source_bytes: Optional[bytes] = None,
    product_name: str = "Herbally",
) -> bytes:
    """Generate high-end commercial studio preview PNG using Pillow, cleanly compositing source photos."""
    try:
        canvas = Image.new("RGBA", (width, height), (15, 23, 42, 255))
        draw = ImageDraw.Draw(canvas)

        # Style palette definitions
        p_lower = (preset or "product_hero").lower()
        if "lifestyle" in p_lower:
            top_color = (40, 32, 26)
            bot_color = (22, 18, 14)
            accent_color = (217, 119, 6)  # Warm amber
        elif "ecommerce" in p_lower:
            top_color = (245, 247, 250)
            bot_color = (220, 226, 235)
            accent_color = (148, 163, 184)
        elif "ugc" in p_lower:
            top_color = (28, 25, 42)
            bot_color = (14, 12, 24)
            accent_color = (168, 85, 247)  # Purple
        else:  # product_hero, product_showcase, custom
            top_color = (15, 23, 42)
            bot_color = (7, 11, 20)
            accent_color = (16, 185, 129)  # Emerald

        # 1. Luxury gradient backdrop
        for y in range(height):
            factor = y / float(height)
            r = int(top_color[0] + (bot_color[0] - top_color[0]) * factor)
            g = int(top_color[1] + (bot_color[1] - top_color[1]) * factor)
            b = int(top_color[2] + (bot_color[2] - top_color[2]) * factor)
            draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

        # 2. Radial ambient studio spotlight glow
        glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow)
        center_x = width // 2
        center_y = int(height * 0.48)
        glow_radius = int(min(width, height) * 0.46)

        for radius in range(glow_radius, 0, -12):
            alpha = int(28 * (1.0 - radius / glow_radius))
            glow_draw.ellipse(
                [center_x - radius, center_y - radius, center_x + radius, center_y + radius],
                fill=(accent_color[0], accent_color[1], accent_color[2], alpha),
            )
        canvas = Image.alpha_composite(canvas, glow)

        # 3. Studio pedestal / floor surface
        floor_y = int(height * 0.72)
        floor = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        floor_draw = ImageDraw.Draw(floor)

        ped_w, ped_h = int(width * 0.68), int(height * 0.15)
        ped_box = [center_x - ped_w // 2, floor_y - ped_h // 2, center_x + ped_w // 2, floor_y + ped_h // 2]
        ped_fill = (240, 243, 248, 220) if "ecommerce" in p_lower else (18, 26, 46, 200)
        floor_draw.ellipse(
            ped_box,
            fill=ped_fill,
            outline=(accent_color[0], accent_color[1], accent_color[2], 90),
            width=2,
        )

        shadow_w, shadow_h = int(ped_w * 0.78), int(ped_h * 0.65)
        shadow_box = [
            center_x - shadow_w // 2,
            floor_y - shadow_h // 2 + 6,
            center_x + shadow_w // 2,
            floor_y + shadow_h // 2 + 6,
        ]
        floor_draw.ellipse(shadow_box, fill=(0, 0, 0, 110))

        floor = floor.filter(ImageFilter.GaussianBlur(radius=3))
        canvas = Image.alpha_composite(canvas, floor)

        # 4. Composite Source Image OR Generate 3D Packshot
        if source_bytes and len(source_bytes) > 20:
            try:
                src_img = Image.open(io.BytesIO(source_bytes)).convert("RGBA")
                max_w = int(width * 0.68)
                max_h = int(height * 0.60)
                src_img.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)

                pos_x = center_x - src_img.width // 2
                pos_y = floor_y - int(src_img.height * 0.88)

                # Grounding contact shadow
                contact = Image.new("RGBA", (width, height), (0, 0, 0, 0))
                c_draw = ImageDraw.Draw(contact)
                c_w = int(src_img.width * 0.82)
                c_h = int(src_img.height * 0.13)
                c_draw.ellipse(
                    [
                        center_x - c_w // 2,
                        pos_y + src_img.height - c_h // 2,
                        center_x + c_w // 2,
                        pos_y + src_img.height + c_h // 2,
                    ],
                    fill=(0, 0, 0, 170),
                )
                contact = contact.filter(ImageFilter.GaussianBlur(radius=6))
                canvas = Image.alpha_composite(canvas, contact)

                # Composite the product
                canvas.paste(src_img, (pos_x, pos_y), src_img)
            except Exception as e:
                print(f"Notice: Failed to composite source image, falling back to 3D packshot: {e}")
                source_bytes = None

        if not source_bytes or len(source_bytes) <= 20:
            # 3D Packshot render
            prod_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            p_draw = ImageDraw.Draw(prod_layer)

            bw, bh = int(width * 0.28), int(height * 0.44)
            bx0 = center_x - bw // 2
            by0 = floor_y - int(bh * 0.95)
            bx1 = bx0 + bw
            by1 = by0 + bh

            # Bottle body
            p_draw.rounded_rectangle(
                [bx0, by0, bx1, by1],
                radius=16,
                fill=(28, 39, 58, 235),
                outline=(255, 255, 255, 90),
                width=2,
            )
            # Neck & Cap
            nw, nh = int(bw * 0.4), int(bh * 0.18)
            p_draw.rectangle(
                [center_x - nw // 2, by0 - nh, center_x + nw // 2, by0],
                fill=(45, 55, 72, 245),
                outline=(255, 255, 255, 90),
            )
            cw, ch = int(nw * 1.1), int(nh * 0.45)
            p_draw.rectangle(
                [center_x - cw // 2, by0 - nh - ch, center_x + cw // 2, by0 - nh],
                fill=(217, 119, 6, 255),
            )

            # Label
            lw, lh = int(bw * 0.82), int(bh * 0.48)
            lx0, ly0 = center_x - lw // 2, by0 + int(bh * 0.28)
            p_draw.rectangle([lx0, ly0, lx0 + lw, ly0 + lh], fill=(248, 250, 252, 245))
            clean_name = (product_name or "Herbally")[:18].upper()
            p_draw.text((center_x, ly0 + 12), clean_name, fill=(15, 23, 42, 255), anchor="mt")
            p_draw.text((center_x, ly0 + 32), "PURE BOTANICAL", fill=(100, 116, 139, 255), anchor="mt")
            p_draw.text(
                (center_x, ly0 + 46),
                "100% ORGANIC",
                fill=(accent_color[0], accent_color[1], accent_color[2], 255),
                anchor="mt",
            )
            p_draw.line([(bx0 + 8, by0 + 10), (bx0 + 8, by1 - 10)], fill=(255, 255, 255, 120), width=3)
            canvas = Image.alpha_composite(canvas, prod_layer)

        # 5. Clean studio preview watermark badge
        badge_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        b_draw = ImageDraw.Draw(badge_layer)
        badge_text = f"SCALIO STUDIO PREVIEW - {p_lower.upper()}"
        badge_w, badge_h = len(badge_text) * 7 + 24, 24
        bx = (width - badge_w) // 2
        by = height - 36
        b_draw.rounded_rectangle(
            [bx, by, bx + badge_w, by + badge_h],
            radius=6,
            fill=(0, 0, 0, 160),
            outline=(255, 255, 255, 45),
        )
        b_draw.text((width // 2, by + 12), badge_text, fill=(203, 213, 225, 220), anchor="mm")
        canvas = Image.alpha_composite(canvas, badge_layer)

        out = io.BytesIO()
        canvas.convert("RGB").save(out, format="PNG", optimize=True)
        return out.getvalue()
    except Exception as exc:
        print(f"Fallback to raw bytearray generator due to: {exc}")
        return _generate_raw_fallback_png(width, height)


def _generate_raw_fallback_png(width: int, height: int) -> bytes:
    """Fallback 8-bit RGBA PNG builder without external dependencies."""
    png = bytearray(b"\x89PNG\r\n\x1a\n")
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png.extend(struct.pack(">I", 13))
    png.extend(b"IHDR")
    png.extend(ihdr_data)
    png.extend(struct.pack(">I", zlib.crc32(b"IHDR" + ihdr_data)))

    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)
        t_y = y / height
        for x in range(width):
            t_x = x / width
            r = int(15 + 18 * t_y + 12 * t_x)
            g = int(22 + 25 * t_y + 15 * t_x)
            b = int(36 + 45 * t_y + 25 * t_x)
            raw_data.extend(bytes([r, g, b, 255]))

    compressed = zlib.compress(bytes(raw_data), 6)
    png.extend(struct.pack(">I", len(compressed)))
    png.extend(b"IDAT")
    png.extend(compressed)
    png.extend(struct.pack(">I", zlib.crc32(b"IDAT" + compressed)))

    png.extend(struct.pack(">I", 0))
    png.extend(b"IEND")
    png.extend(struct.pack(">I", zlib.crc32(b"IEND")))
    return bytes(png)


class DemoSimulationProvider(BaseImageProvider):
    """Fallback mock provider clearly flagged as a demonstration simulator."""

    @property
    def provider_id(self) -> str:
        return "demo_mode"

    def get_info(self) -> ProviderInfo:
        return ProviderInfo(
            id="demo_mode",
            name="Demo Simulation Studio",
            is_configured=True,
            models=["watermarked-studio-sim-v1"],
            supported_aspect_ratios=["1:1", "9:16", "16:9", "4:5", "3:2"],
            supports_image_to_image=True,
            requires_credentials="None (Active Demonstration Mode)",
            notes=(
                "Generates high-end studio visual compositions and packshots for offline validation and UI testing. "
                "Incurs zero cost and makes zero paid API calls."
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
        style_preset: str = "product_hero",
        product_name: Optional[str] = None,
        **kwargs,
    ) -> GeneratedImageResult:
        dimensions = {
            "1:1": (512, 512),
            "9:16": (512, 910),
            "16:9": (910, 512),
            "4:5": (512, 640),
            "3:2": (768, 512),
        }
        width, height = dimensions.get(aspect_ratio, (512, 512))
        image_bytes = _generate_studio_png(
            width=width,
            height=height,
            preset=style_preset,
            prompt=prompt,
            source_bytes=source_image_bytes,
            product_name=product_name or "Herbally",
        )

        warning = (
            "DEMO MODE: This image is a synthetic local demonstration preview. "
            "To generate genuine AI product imagery, configure OPENAI_IMAGE_API_KEY."
        )

        return GeneratedImageResult(
            image_bytes=image_bytes,
            mime_type="image/png",
            width=width,
            height=height,
            provider="demo_mode",
            model="watermarked-studio-sim-v1",
            prompt=prompt,
            is_mock=True,
            warning=warning,
        )
