import json
from pathlib import Path

import httpx
import pytest

from app.config import settings
from app.config import Settings
from app.main import app
from app.database import SessionLocal, init_db
from app.models.brand import BrandProfile
from app.models.content import ContentAsset
from app.models.media import MediaAsset
from app.models.workflow import WorkflowRun
from app.schemas.state import CampaignPlanItem, MarketingState
from app.services.authorization_service import AuthorizationService
from app.services.rate_limit_service import RateLimitService


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def anyio_backend():
    return "asyncio"


def test_production_rejects_development_identity_mode():
    with pytest.raises(ValueError, match="AUTH_MODE=development is not allowed"):
        Settings(ENV="production", AUTH_MODE="development")


def test_legacy_records_are_assigned_additively(client_and_records):
    """The bootstrap assigns a workspace without replacing legacy record content."""
    db = SessionLocal()
    try:
        db.query(WorkflowRun).filter(WorkflowRun.id == "legacy-workflow-security").delete()
        db.query(BrandProfile).filter(BrandProfile.id == "legacy-brand-security").delete()
        db.add(BrandProfile(id="legacy-brand-security", name="Preserved legacy brand"))
        db.add(
            WorkflowRun(
                id="legacy-workflow-security",
                marketing_goal="Preserved legacy workflow",
                budget=321,
                state_snapshot={"product_name": "Preserved product"},
            )
        )
        db.commit()

        AuthorizationService.bootstrap_identities_and_legacy_data(db)
        brand = db.query(BrandProfile).filter(BrandProfile.id == "legacy-brand-security").one()
        workflow = db.query(WorkflowRun).filter(WorkflowRun.id == "legacy-workflow-security").one()
        assert brand.workspace_id == "workspace-a"
        assert brand.name == "Preserved legacy brand"
        assert workflow.workspace_id == "workspace-a"
        assert workflow.marketing_goal == "Preserved legacy workflow"
        assert workflow.budget == 321
    finally:
        db.close()


@pytest.fixture
def client_and_records(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "AUTH_MODE", "token")
    monkeypatch.setattr(
        settings,
        "AUTH_TOKENS_JSON",
        json.dumps(
            {
                "owner-a-token": {"subject": "user-a", "workspace_id": "workspace-a", "display_name": "Owner A"},
                "owner-b-token": {"subject": "user-b", "workspace_id": "workspace-b", "display_name": "Owner B"},
            }
        ),
    )
    monkeypatch.setattr(settings, "LEGACY_WORKSPACE_ID", "workspace-a")
    monkeypatch.setattr(settings, "MEDIA_STORAGE_DIR", str(tmp_path / "media"))
    monkeypatch.setattr(settings, "IMAGE_PROVIDER", "unconfigured")
    monkeypatch.setattr(settings, "OPENAI_IMAGE_API_KEY", "")
    RateLimitService.reset()
    init_db()
    db = SessionLocal()
    try:
        AuthorizationService.bootstrap_identities_and_legacy_data(db)
        db.query(MediaAsset).filter(MediaAsset.id == "media-b").delete()
        db.query(WorkflowRun).filter(WorkflowRun.id == "workflow-b").delete()
        db.query(ContentAsset).filter(ContentAsset.id.in_(["asset-a", "asset-b"])).delete(synchronize_session=False)
        db.query(BrandProfile).filter(BrandProfile.id.in_(["brand-a", "brand-b"])).delete(synchronize_session=False)
        db.commit()
        for brand_id, workspace_id in (("brand-a", "workspace-a"), ("brand-b", "workspace-b")):
            if not db.query(BrandProfile).filter(BrandProfile.id == brand_id).first():
                db.add(BrandProfile(id=brand_id, workspace_id=workspace_id, name=brand_id))

        asset_a = ContentAsset(
            id="asset-a",
            brand_id="brand-a",
            title="Asset A",
            content="Grounded creative",
            image_prompt="Simple product photo",
        )
        asset_b = ContentAsset(
            id="asset-b",
            brand_id="brand-b",
            title="Asset B",
            content="Grounded creative",
            image_prompt="Simple product photo",
        )
        db.add_all([asset_a, asset_b])

        state = MarketingState(
            product_name="Test product",
            campaign_plan=[
                CampaignPlanItem(
                    id="CAMP-B",
                    campaign_name="Workspace B campaign",
                    platform="Instagram",
                    objective="Conversions",
                    target_audience="Test",
                    creative_type="Static image",
                    messaging="Grounded creative",
                    call_to_action="Shop now",
                    budget_inr=1000,
                    duration_days=7,
                )
            ],
        )
        db.add(
            WorkflowRun(
                id="workflow-b",
                workspace_id="workspace-b",
                marketing_goal="Conversions",
                budget=1000,
                state_snapshot=state.model_dump(),
            )
        )
        db.commit()

        media_dir = Path(settings.MEDIA_STORAGE_DIR)
        media_dir.mkdir(parents=True, exist_ok=True)
        file_name = "med-b.png"
        image_bytes = b"\x89PNG\r\n\x1a\nprivate-image"
        (media_dir / file_name).write_bytes(image_bytes)
        db.add(
            MediaAsset(
                id="media-b",
                content_asset_id="asset-b",
                provider="test",
                provider_model="test-model",
                prompt="Simple product photo",
                storage_key=file_name,
                media_url="/api/media/media-b",
                mime_type="image/png",
                byte_size=len(image_bytes),
                checksum_sha256="test-checksum",
                status="generated",
            )
        )
        db.commit()
        yield image_bytes
    finally:
        db.close()
        RateLimitService.reset()


@pytest.mark.anyio
async def test_api_requires_bearer_authentication(client_and_records):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.get("/api/content/assets/asset-b/media")
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


@pytest.mark.anyio
async def test_cross_workspace_media_and_campaign_access_is_hidden(client_and_records):
    headers = _headers("owner-a-token")

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        assert (await client.get("/api/marketing/workflow/workflow-b", headers=headers)).status_code == 404
        assert (await client.get("/api/content/assets/asset-b/media", headers=headers)).status_code == 404
        assert (await client.get("/api/media/media-b", headers=headers)).status_code == 404
        assert (
            await client.post(
                "/api/workflows/workflow-b/campaigns/CAMP-B/media",
                headers=headers,
                json={"media_asset_id": "media-b"},
            )
        ).status_code == 404


@pytest.mark.anyio
async def test_authorized_media_delivery_and_campaign_attachment(client_and_records):
    image_bytes = client_and_records
    headers = _headers("owner-b-token")

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        media_response = await client.get("/api/media/media-b", headers=headers)
        assert media_response.status_code == 200
        assert media_response.content == image_bytes
        assert media_response.headers["cache-control"] == "private, no-store"
        assert media_response.headers["x-content-type-options"] == "nosniff"
        assert (await client.get("/media/med-b.png", headers=headers)).status_code == 404
        attach_response = await client.post(
            "/api/workflows/workflow-b/campaigns/CAMP-B/media",
            headers=headers,
            json={"media_asset_id": "media-b"},
        )
    assert attach_response.status_code == 200
    assert "media-b" in attach_response.json()["state"]["campaign_plan"][0]["linked_assets"]["media_asset_ids"]


@pytest.mark.anyio
async def test_expensive_generation_is_size_limited_and_rate_limited(client_and_records, monkeypatch):
    headers = _headers("owner-a-token")
    monkeypatch.setattr(settings, "IMAGE_GENERATION_RATE_LIMIT", 1)

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        oversized = await client.post(
            "/api/content/assets/asset-a/media/generate",
            headers={**headers, "Content-Type": "application/json"},
            content=b"x" * (settings.IMAGE_GENERATION_REQUEST_MAX_BYTES + 1),
        )
        assert oversized.status_code == 413

        first = await client.post(
            "/api/content/assets/asset-a/media/generate",
            headers=headers,
            json={"confirmed": True, "size": "1024x1024", "quality": "low"},
        )
        assert first.status_code == 503  # provider deliberately remains unconfigured
        limited = await client.post(
            "/api/content/assets/asset-a/media/generate",
            headers=headers,
            json={"confirmed": True, "size": "1024x1024", "quality": "low"},
        )
    assert limited.status_code == 429
    assert "retry-after" in limited.headers
