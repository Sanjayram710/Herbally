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
from app.models.video import VideoJob
from app.services.authorization_service import AuthorizationService


@pytest.fixture
def video_test_setup(monkeypatch, tmp_path):
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

        # Clean up test tenant video jobs from previous runs
        db.query(VideoJob).filter(
            VideoJob.workspace_id.in_(["workspace-tenant-1", "workspace-tenant-2"])
        ).delete(synchronize_session=False)

        for ws_id in ["workspace-tenant-1", "workspace-tenant-2"]:
            if not db.query(Workspace).filter(Workspace.id == ws_id).first():
                db.add(Workspace(id=ws_id, name=ws_id.title()))

        # Seed Brand 1 & Product 1
        brand_1 = BrandProfile(
            id="brand-tenant-1",
            workspace_id="workspace-tenant-1",
            name="Aura Botanicals",
            industry="Beauty & Skincare",
        )
        db.merge(brand_1)

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

        # Seed Brand 2
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
async def test_video_provider_capability_reporting(video_test_setup):
    headers = video_test_setup["headers_1"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/video/providers", headers=headers)
        assert res.status_code == 200
        providers = res.json()
        assert len(providers) >= 3

        ids = [p["id"] for p in providers]
        assert "demo_mode" in ids
        assert "luma" in ids
        assert "runway" in ids

        demo_p = next(p for p in providers if p["id"] == "demo_mode")
        assert demo_p["is_configured"] is True
        assert demo_p["supports_image_to_video"] is True
        assert "9:16" in demo_p["supported_aspect_ratios"]
        assert 8 in demo_p["supported_durations"]
        assert "Zero cost" in demo_p["official_pricing_note"]

        luma_p = next(p for p in providers if p["id"] == "luma")
        assert "Dream Machine" in luma_p["name"]
        assert "LUMA_API_KEY" in luma_p["requires_credentials"]
        assert 5 in luma_p["supported_durations"]

        runway_p = next(p for p in providers if p["id"] == "runway")
        assert "Gen-3" in runway_p["name"]
        assert "RUNWAY_API_KEY" in runway_p["requires_credentials"]
        assert 5 in runway_p["supported_durations"]
        assert 10 in runway_p["supported_durations"]


@pytest.mark.asyncio
async def test_unconfigured_provider_rejection_without_demo_fallback(video_test_setup):
    headers = video_test_setup["headers_1"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/video/jobs",
            headers=headers,
            json={
                "brand_id": "brand-tenant-1",
                "product_id": "prod-tenant-1",
                "prompt": "Cinematic slow motion shot of serum dropper",
                "provider": "luma",
                "allow_demo_fallback": False,
                "confirmed": True,
            },
        )
        assert res.status_code == 503
        assert "LUMA_API_KEY" in res.json()["detail"]


@pytest.mark.asyncio
async def test_aspect_ratio_and_duration_validation(video_test_setup):
    headers = video_test_setup["headers_1"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Invalid aspect ratio (only 9:16 and 16:9 supported)
        res_ratio = await client.post(
            "/api/video/jobs",
            headers=headers,
            json={
                "brand_id": "brand-tenant-1",
                "prompt": "Cinematic product pan",
                "aspect_ratio": "4:3",
                "confirmed": True,
            },
        )
        assert res_ratio.status_code == 422

        # Invalid language (must be from the 11 supported languages)
        res_lang = await client.post(
            "/api/video/jobs",
            headers=headers,
            json={
                "brand_id": "brand-tenant-1",
                "prompt": "Cinematic product pan",
                "language": "Klingon",
                "confirmed": True,
            },
        )
        assert res_lang.status_code == 422


@pytest.mark.asyncio
async def test_guardrails_claim_validation_on_prompt_and_script(video_test_setup):
    headers = video_test_setup["headers_1"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Prohibited claim in prompt
        res_prompt = await client.post(
            "/api/video/jobs",
            headers=headers,
            json={
                "brand_id": "brand-tenant-1",
                "prompt": "Clinical video showing this herbal serum provides a complete cure for diabetes and chronic illness",
                "confirmed": True,
            },
        )
        assert res_prompt.status_code == 400
        assert "medical/health claims" in res_prompt.json()["detail"]

        # Prohibited claim in script
        res_script = await client.post(
            "/api/video/jobs",
            headers=headers,
            json={
                "brand_id": "brand-tenant-1",
                "prompt": "Cinematic showcase of serum bottle",
                "script": "Use this daily to permanently eliminate cancer and cure heart disease.",
                "confirmed": True,
            },
        )
        assert res_script.status_code == 400
        assert "medical/health claims" in res_script.json()["detail"]


@pytest.mark.asyncio
async def test_confirmation_requirement(video_test_setup):
    headers = video_test_setup["headers_1"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/video/jobs",
            headers=headers,
            json={
                "brand_id": "brand-tenant-1",
                "prompt": "Cinematic aesthetic product reveal",
                "confirmed": False,
            },
        )
        assert res.status_code == 400
        assert "Confirmation required" in res.json()["detail"]


@pytest.mark.asyncio
async def test_job_creation_and_async_lifecycle(video_test_setup):
    headers = video_test_setup["headers_1"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create Job
        create_res = await client.post(
            "/api/video/jobs",
            headers=headers,
            json={
                "brand_id": "brand-tenant-1",
                "product_id": "prod-tenant-1",
                "prompt": "Aesthetic close-up of herbal serum droplets glistening under morning sunlight",
                "script": "Experience pure botanical hydration.",
                "language": "Hindi",
                "template_id": "product_hero",
                "aspect_ratio": "9:16",
                "duration_seconds": 8,
                "confirmed": True,
                "allow_demo_fallback": True,
            },
        )
        assert create_res.status_code == 200
        job_data = create_res.json()
        job_id = job_data["id"]
        assert job_data["status"] == "processing"
        assert job_data["progress_percent"] == 35
        assert job_data["is_demo"] is True
        assert job_data["language"] == "Hindi"

        # 2. Poll 1 -> Progress advances to 75%
        poll_1 = await client.get(f"/api/video/jobs/{job_id}", headers=headers)
        assert poll_1.status_code == 200
        p1_data = poll_1.json()
        assert p1_data["status"] == "processing"
        assert p1_data["progress_percent"] == 75

        # 3. Poll 2 -> Reaches completed, media asset linked
        poll_2 = await client.get(f"/api/video/jobs/{job_id}", headers=headers)
        assert poll_2.status_code == 200
        p2_data = poll_2.json()
        assert p2_data["status"] == "completed"
        assert p2_data["progress_percent"] == 100
        assert p2_data["output_media_id"] is not None
        assert p2_data["output_media_url"] == f"/api/media/{p2_data['output_media_id']}"

        # 4. Download generated video asset and verify MP4 structure
        media_id = p2_data["output_media_id"]
        media_res = await client.get(f"/api/media/{media_id}", headers=headers)
        assert media_res.status_code == 200
        assert media_res.headers["content-type"].startswith("video/mp4")
        video_bytes = media_res.content
        assert len(video_bytes) > 100
        # Check ISO MP4 ftyp atom
        assert b"ftyp" in video_bytes[:16]
        assert b"moov" in video_bytes


@pytest.mark.asyncio
async def test_duplicate_submission_prevention(video_test_setup):
    headers = video_test_setup["headers_1"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "brand_id": "brand-tenant-1",
            "product_id": "prod-tenant-1",
            "prompt": "Identical prompt duplicate prevention test",
            "confirmed": True,
        }
        res_1 = await client.post("/api/video/jobs", headers=headers, json=payload)
        assert res_1.status_code == 200

        # Submitting the exact same active prompt within 2 minutes should be blocked
        res_2 = await client.post("/api/video/jobs", headers=headers, json=payload)
        assert res_2.status_code == 400
        assert "Duplicate active video job already in progress" in res_2.json()["detail"]


@pytest.mark.asyncio
async def test_job_cancellation(video_test_setup):
    headers = video_test_setup["headers_1"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        create_res = await client.post(
            "/api/video/jobs",
            headers=headers,
            json={
                "brand_id": "brand-tenant-1",
                "prompt": "Job destined for cancellation test",
                "confirmed": True,
            },
        )
        assert create_res.status_code == 200
        job_id = create_res.json()["id"]

        cancel_res = await client.post(f"/api/video/jobs/{job_id}/cancel", headers=headers)
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "cancelled"

        # Polling cancelled job keeps cancelled status
        poll_res = await client.get(f"/api/video/jobs/{job_id}", headers=headers)
        assert poll_res.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_job_retry_flow(video_test_setup):
    headers = video_test_setup["headers_1"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Trigger simulated failure via test hook
        create_res = await client.post(
            "/api/video/jobs",
            headers=headers,
            json={
                "brand_id": "brand-tenant-1",
                "prompt": "Trigger failure __simulate_failure__",
                "confirmed": True,
            },
        )
        assert create_res.status_code == 200
        job_id = create_res.json()["id"]
        assert create_res.json()["status"] == "failed"

        # Retry the failed job
        retry_res = await client.post(f"/api/video/jobs/{job_id}/retry", headers=headers)
        assert retry_res.status_code == 200
        retried_data = retry_res.json()
        assert retried_data["id"] == job_id


@pytest.mark.asyncio
async def test_workspace_isolation_on_video_jobs_and_media(video_test_setup):
    headers_1 = video_test_setup["headers_1"]
    headers_2 = video_test_setup["headers_2"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Tenant 1 creates a video job
        create_res = await client.post(
            "/api/video/jobs",
            headers=headers_1,
            json={
                "brand_id": "brand-tenant-1",
                "prompt": "Workspace isolation private video generation",
                "confirmed": True,
            },
        )
        assert create_res.status_code == 200
        job_id = create_res.json()["id"]

        # Advance job to completion so media asset is created
        await client.get(f"/api/video/jobs/{job_id}", headers=headers_1)
        complete_res = await client.get(f"/api/video/jobs/{job_id}", headers=headers_1)
        output_media_id = complete_res.json()["output_media_id"]
        assert output_media_id is not None

        # Tenant 2 attempts to access Tenant 1's job -> 404
        tenant_2_poll = await client.get(f"/api/video/jobs/{job_id}", headers=headers_2)
        assert tenant_2_poll.status_code == 404

        # Tenant 2 attempts to cancel Tenant 1's job -> 404
        tenant_2_cancel = await client.post(f"/api/video/jobs/{job_id}/cancel", headers=headers_2)
        assert tenant_2_cancel.status_code == 404

        # Tenant 2 attempts to retry Tenant 1's job -> 404
        tenant_2_retry = await client.post(f"/api/video/jobs/{job_id}/retry", headers=headers_2)
        assert tenant_2_retry.status_code == 404

        # Tenant 2 attempts to download Tenant 1's generated video media asset -> 404
        tenant_2_media = await client.get(f"/api/media/{output_media_id}", headers=headers_2)
        assert tenant_2_media.status_code == 404

        # Tenant 2 lists jobs -> does not contain Tenant 1's job
        tenant_2_list = await client.get("/api/video/jobs", headers=headers_2)
        assert tenant_2_list.status_code == 200
        assert not any(j["id"] == job_id for j in tenant_2_list.json())


@pytest.mark.asyncio
async def test_keyframe_source_image_integration(video_test_setup):
    headers = video_test_setup["headers_1"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Upload a source image for the product
        png_1px = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/7UyNuwAAAABJRU5ErkJggg=="
        )
        upload_res = await client.post(
            "/api/products/prod-tenant-1/image",
            headers=headers,
            files={"file": ("keyframe.png", png_1px, "image/png")},
        )
        assert upload_res.status_code == 200
        upload_data = upload_res.json()
        assert upload_data["image_url"].startswith("/api/media/")
        source_asset_id = upload_data["image_url"].split("/")[-1]

        # 2. Create video job using source_asset_id as keyframe
        video_res = await client.post(
            "/api/video/jobs",
            headers=headers,
            json={
                "brand_id": "brand-tenant-1",
                "product_id": "prod-tenant-1",
                "source_asset_id": source_asset_id,
                "prompt": "Animate smooth fluid splash around the bottle",
                "confirmed": True,
            },
        )
        assert video_res.status_code == 200
        job_data = video_res.json()
        assert job_data["source_asset_id"] == source_asset_id
