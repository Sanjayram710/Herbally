import base64
import json
import pytest
import httpx
from unittest.mock import patch

from app.main import app
from app.config import settings
from app.database import SessionLocal, init_db
from app.models.security import User, Workspace, WorkspaceMembership
from app.models.brand import BrandProfile
from app.models.product import Product
from app.services.authorization_service import AuthorizationService


@pytest.fixture
def studio_test_setup(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "ENV", "development")
    monkeypatch.setattr(settings, "AUTH_MODE", "token")
    monkeypatch.setattr(settings, "MEDIA_STORAGE_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "IMAGE_GENERATION_RATE_LIMIT", 50)
    monkeypatch.setattr(settings, "IMAGE_GENERATION_RATE_WINDOW_SECONDS", 3600)

    tokens = {
        "token-tenant-1": {
            "subject": "user-tenant-1",
            "workspace_id": "workspace-tenant-1",
            "role": "owner",
        },
        "token-tenant-2": {
            "subject": "user-tenant-2",
            "workspace_id": "workspace-tenant-2",
            "role": "owner",
        },
    }
    monkeypatch.setattr(settings, "AUTH_TOKENS_JSON", json.dumps(tokens))

    init_db()
    db = SessionLocal()
    try:
        AuthorizationService.bootstrap_identities_and_legacy_data(db)

        # Ensure Workspaces exist
        for ws_id in ["workspace-tenant-1", "workspace-tenant-2"]:
            if not db.query(Workspace).filter(Workspace.id == ws_id).first():
                db.add(Workspace(id=ws_id, name=ws_id.title()))

        # Seed Brand for Tenant 1
        brand_1 = BrandProfile(
            id="brand-tenant-1",
            workspace_id="workspace-tenant-1",
            name="Aura Botanicals",
            industry="Beauty & Skincare",
        )
        db.merge(brand_1)

        # Seed Product for Tenant 1
        prod_1 = Product(
            id="prod-tenant-1",
            workspace_id="workspace-tenant-1",
            brand_id="brand-tenant-1",
            name="Hydrating Herbal Serum",
            description="Botanical hydrating facial serum",
            price_inr=1299.0,
            category="Skincare",
        )
        db.merge(prod_1)

        # Seed Brand for Tenant 2
        brand_2 = BrandProfile(
            id="brand-tenant-2",
            workspace_id="workspace-tenant-2",
            name="Apex Dynamics",
            industry="Fitness & Apparel",
        )
        db.merge(brand_2)

        db.commit()
        yield {
            "db": db,
            "tmp_path": tmp_path,
            "headers_1": {"Authorization": "Bearer token-tenant-1"},
            "headers_2": {"Authorization": "Bearer token-tenant-2"},
        }
    finally:
        db.close()


@pytest.mark.asyncio
async def test_provider_configuration_and_listing(studio_test_setup):
    headers = studio_test_setup["headers_1"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/media/providers", headers=headers)
        assert res.status_code == 200
        providers = res.json()
        assert len(providers) >= 2

        ids = [p["id"] for p in providers]
        assert "openai" in ids
        assert "demo_mode" in ids

        demo_p = next(p for p in providers if p["id"] == "demo_mode")
        assert demo_p["is_configured"] is True
        assert demo_p["supports_image_to_image"] is True
        assert "1:1" in demo_p["supported_aspect_ratios"]


@pytest.mark.asyncio
async def test_media_library_listing_and_filtering(studio_test_setup):
    headers = studio_test_setup["headers_1"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Upload a product image
        png_1px = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/7UyNuwAAAABJRU5ErkJggg=="
        )
        upload_res = await client.post(
            "/api/products/prod-tenant-1/image",
            headers=headers,
            files={"file": ("serum.png", png_1px, "image/png")},
        )
        assert upload_res.status_code == 200
        upload_data = upload_res.json()
        assert upload_data["image_url"].startswith("/api/media/")

        # 2. Generate a studio image in demo mode
        studio_res = await client.post(
            "/api/media/studio/generate",
            headers=headers,
            json={
                "brand_id": "brand-tenant-1",
                "product_id": "prod-tenant-1",
                "style_preset": "clean_studio",
                "custom_prompt": "Professional studio photography of serum bottle on marble surface with soft diffuse lighting",
                "aspect_ratio": "1:1",
                "provider": "demo_mode",
                "confirmed": True,
                "allow_demo_fallback": True,
            },
        )
        assert studio_res.status_code == 200
        studio_data = studio_res.json()
        assert studio_data["is_demo"] is True
        generated_id = studio_data["media"]["id"]

        # 3. List all media for tenant 1
        list_res = await client.get("/api/media", headers=headers)
        assert list_res.status_code == 200
        assets = list_res.json()
        assert len(assets) >= 2

        # 4. Filter by asset_type
        uploads_res = await client.get("/api/media?asset_type=product_upload", headers=headers)
        assert uploads_res.status_code == 200
        upload_items = uploads_res.json()
        assert all(item["asset_type"] == "product_upload" for item in upload_items)

        studio_items_res = await client.get("/api/media?asset_type=studio_generation", headers=headers)
        assert studio_items_res.status_code == 200
        studio_items = studio_items_res.json()
        assert any(item["id"] == generated_id for item in studio_items)

        # 5. Search by prompt keyword
        search_res = await client.get("/api/media?search=marble", headers=headers)
        assert search_res.status_code == 200
        search_items = search_res.json()
        assert len(search_items) >= 1
        assert "marble" in search_items[0]["prompt"].lower()

        # 6. Authorized media delivery
        download_res = await client.get(f"/api/media/{generated_id}", headers=headers)
        assert download_res.status_code == 200
        assert download_res.headers["content-type"] == "image/png"
        assert len(download_res.content) > 0


@pytest.mark.asyncio
async def test_product_source_image_to_studio_variation_relationship(studio_test_setup):
    headers = studio_test_setup["headers_1"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Upload source photo
        png_1px = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/7UyNuwAAAABJRU5ErkJggg=="
        )
        upload_res = await client.post(
            "/api/products/prod-tenant-1/image",
            headers=headers,
            files={"file": ("source.png", png_1px, "image/png")},
        )
        assert upload_res.status_code == 200

        # Retrieve media asset ID of the upload
        list_res = await client.get("/api/media?product_id=prod-tenant-1&asset_type=product_upload", headers=headers)
        source_asset = list_res.json()[0]
        source_id = source_asset["id"]

        # Generate a variation linked to source asset
        variation_res = await client.post(
            "/api/media/studio/generate",
            headers=headers,
            json={
                "brand_id": "brand-tenant-1",
                "product_id": "prod-tenant-1",
                "source_asset_id": source_id,
                "style_preset": "lifestyle",
                "custom_prompt": "Lifestyle scene with serum bottle on bathroom shelf surrounded by lush green monstera leaves and natural sunlight",
                "aspect_ratio": "4:5",
                "provider": "demo_mode",
                "confirmed": True,
            },
        )
        assert variation_res.status_code == 200
        variation_data = variation_res.json()
        assert variation_data["media"]["source_asset_id"] == source_id
        assert variation_data["media"]["asset_type"] == "variation"
        assert variation_data["media"]["style_preset"] == "lifestyle"
        assert variation_data["source_media"]["id"] == source_id


@pytest.mark.asyncio
async def test_workspace_and_brand_isolation_for_media_and_deletion(studio_test_setup):
    headers_1 = studio_test_setup["headers_1"]
    headers_2 = studio_test_setup["headers_2"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Tenant 1 generates studio image
        gen_res = await client.post(
            "/api/media/studio/generate",
            headers=headers_1,
            json={
                "brand_id": "brand-tenant-1",
                "product_id": "prod-tenant-1",
                "style_preset": "ecommerce",
                "custom_prompt": "Crisp ecommerce packshot with clean white backdrop and soft shadow",
                "aspect_ratio": "1:1",
                "provider": "demo_mode",
                "confirmed": True,
            },
        )
        assert gen_res.status_code == 200
        media_id_1 = gen_res.json()["media"]["id"]

        # Tenant 2 attempts to query Tenant 1's brand media -> 404
        t2_brand_query = await client.get("/api/media?brand_id=brand-tenant-1", headers=headers_2)
        assert t2_brand_query.status_code == 404

        # Tenant 2 attempts to download Tenant 1's media file -> 404
        t2_dl = await client.get(f"/api/media/{media_id_1}", headers=headers_2)
        assert t2_dl.status_code == 404

        # Tenant 2 attempts to delete Tenant 1's media file -> 404
        t2_del = await client.delete(f"/api/media/{media_id_1}", headers=headers_2)
        assert t2_del.status_code == 404

        # Tenant 1 safely deletes their own media asset -> 200
        t1_del = await client.delete(f"/api/media/{media_id_1}", headers=headers_1)
        assert t1_del.status_code == 200
        assert t1_del.json()["success"] is True

        # Subsequent fetch by Tenant 1 is now 404
        t1_dl_after = await client.get(f"/api/media/{media_id_1}", headers=headers_1)
        assert t1_dl_after.status_code == 404


@pytest.mark.asyncio
async def test_studio_generation_validation_and_guardrails(studio_test_setup):
    headers = studio_test_setup["headers_1"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Unconfirmed request rejected
        unconfirmed_res = await client.post(
            "/api/media/studio/generate",
            headers=headers,
            json={
                "brand_id": "brand-tenant-1",
                "style_preset": "clean_studio",
                "custom_prompt": "Clean studio backdrop photo",
                "confirmed": False,
            },
        )
        assert unconfirmed_res.status_code == 400
        assert "confirm" in unconfirmed_res.json()["detail"].lower()

        # 2. Medical / AYUSH claim rejected by claim guardrails
        illegal_claim_res = await client.post(
            "/api/media/studio/generate",
            headers=headers,
            json={
                "brand_id": "brand-tenant-1",
                "style_preset": "clean_studio",
                "custom_prompt": "Miracle herbal serum that cures arthritis, eliminates cancer, and treats psoriasis permanently",
                "confirmed": True,
            },
        )
        assert illegal_claim_res.status_code == 400
        assert "claim" in illegal_claim_res.json()["detail"].lower()

        # 3. Provider unconfigured error when allow_demo_fallback=False and no credentials
        unconfigured_res = await client.post(
            "/api/media/studio/generate",
            headers=headers,
            json={
                "brand_id": "brand-tenant-1",
                "style_preset": "clean_studio",
                "custom_prompt": "Clean studio backdrop photo",
                "provider": "openai",
                "confirmed": True,
                "allow_demo_fallback": False,
            },
        )
        assert unconfigured_res.status_code == 503
        assert "unconfigured" in unconfigured_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_provider_timeout_and_error_handling(studio_test_setup, monkeypatch):
    headers = studio_test_setup["headers_1"]
    monkeypatch.setattr(settings, "IMAGE_PROVIDER", "openai")
    monkeypatch.setattr(settings, "OPENAI_IMAGE_API_KEY", "test-live-key")

    def mock_httpx_timeout(*args, **kwargs):
        raise httpx.ConnectTimeout("Connection timed out reaching OpenAI API")

    monkeypatch.setattr("app.services.image_providers.openai_provider.httpx.post", mock_httpx_timeout)

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/media/studio/generate",
            headers=headers,
            json={
                "brand_id": "brand-tenant-1",
                "style_preset": "clean_studio",
                "custom_prompt": "Studio shot of skincare bottle",
                "provider": "openai",
                "confirmed": True,
                "allow_demo_fallback": False,
            },
        )
        # Sanitized HTTP 502 with no raw token exposure
        assert res.status_code == 502
        assert "could not be reached" in res.json()["detail"]
        assert "test-live-key" not in res.json()["detail"]
