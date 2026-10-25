import base64
import uuid

import pytest

from app.api.routes import attach_media_to_workflow_campaign_endpoint, router
from app.config import settings
from app.database import SessionLocal, init_db
from app.models.workflow import WorkflowRun
from app.schemas.content import ContentAssetCreate
from app.schemas.media import CampaignMediaAttachRequest
from app.schemas.state import CampaignPlanItem, MarketingState
from app.services.content_service import ContentService
from app.services.integration_service import IntegrationService
from app.services.media_service import MediaProviderNotConfiguredError, MediaService
from app.services.authorization_service import AuthorizationService, Principal
from app.services.brand_service import BrandService


def _create_content_asset(db):
    return ContentService.create_asset(
        db,
        ContentAssetCreate(
            brand_id="herbally-brand",
            channel="Instagram",
            asset_type="social_post",
            title="Generated image test asset",
            content="A grounded product post for an organic cotton bedsheet.",
            image_prompt="Editorial product photo of folded organic cotton bedding with soft botanical leaves in a sunlit bedroom.",
        ),
    )


@pytest.fixture
def db(monkeypatch):
    # This module exercises the configured legacy workspace. Pin it explicitly
    # so it remains isolated from multi-workspace security tests in the same run.
    monkeypatch.setattr(settings, "LEGACY_WORKSPACE_ID", "local-workspace")
    init_db()
    session = SessionLocal()
    try:
        BrandService.get_or_create_default_brand(session)
        AuthorizationService.bootstrap_identities_and_legacy_data(session)
        yield session
    finally:
        session.close()


def test_image_generation_is_truthfully_unconfigured_without_credentials(monkeypatch, db):
    monkeypatch.setattr(settings, "IMAGE_PROVIDER", "unconfigured")
    monkeypatch.setattr(settings, "OPENAI_IMAGE_API_KEY", "")
    asset = _create_content_asset(db)

    with pytest.raises(MediaProviderNotConfiguredError, match="unconfigured"):
        MediaService.generate_for_content_asset(
            db, asset.id, confirmed=True, size="1024x1024", quality="low"
        )


def test_image_connector_refreshes_without_claiming_a_live_connection(monkeypatch, db):
    monkeypatch.setattr(settings, "IMAGE_PROVIDER", "openai")
    monkeypatch.setattr(settings, "OPENAI_IMAGE_API_KEY", "test-key")
    IntegrationService.seed_default_integrations(db, settings.LEGACY_WORKSPACE_ID)
    connector = next(
        item
        for item in IntegrationService.list_integrations(db, settings.LEGACY_WORKSPACE_ID)
        if item.connector_key == "openai_images"
    )
    assert connector.status == "configured_not_verified"
    assert connector.is_configured is True
    assert connector.last_sync_at is None

    monkeypatch.setattr(settings, "IMAGE_PROVIDER", "unconfigured")
    monkeypatch.setattr(settings, "OPENAI_IMAGE_API_KEY", "")
    IntegrationService.seed_default_integrations(db, settings.LEGACY_WORKSPACE_ID)
    db.refresh(connector)
    assert connector.status == "unconfigured"
    assert connector.is_configured is False


def test_confirmed_generation_persists_validated_media_and_attaches_to_campaign(monkeypatch, tmp_path, db):
    monkeypatch.setattr(settings, "IMAGE_PROVIDER", "openai")
    monkeypatch.setattr(settings, "OPENAI_IMAGE_API_KEY", "test-key")
    monkeypatch.setattr(settings, "OPENAI_IMAGE_MODEL", "gpt-image-2.5-sunburst")
    monkeypatch.setattr(settings, "MEDIA_STORAGE_DIR", str(tmp_path))

    png_bytes = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/7UyNuwAAAABJRU5ErkJggg=="
    )

    class FakeResponse:
        status_code = 200

        def json(self):
            return {"data": [{"b64_json": base64.b64encode(png_bytes).decode("ascii")}]}

    def fake_post(url, *, headers, json, timeout):
        assert url == "https://api.openai.com/v1/images/generations"
        assert json["model"] == "gpt-image-2.5-sunburst"
        assert json["prompt"].startswith("Editorial product photo")
        assert json["quality"] == "low"
        assert timeout == settings.IMAGE_REQUEST_TIMEOUT_SECONDS
        return FakeResponse()

    monkeypatch.setattr("app.services.media_service.httpx.post", fake_post)
    asset = _create_content_asset(db)

    media = MediaService.generate_for_content_asset(
        db, asset.id, confirmed=True, size="1024x1024", quality="low"
    )
    assert media.provider == "openai"
    assert media.mime_type == "image/png"
    assert media.byte_size == len(png_bytes)
    assert (tmp_path / media.storage_key).read_bytes() == png_bytes
    assert ContentService.get_asset(db, asset.id).generated_media_url == media.media_url
    assert MediaService.list_for_content_asset(db, asset.id)[0].id == media.id

    campaign_id = f"CAMP-MEDIA-{uuid.uuid4().hex[:8]}"
    workflow_id = f"wf-media-{uuid.uuid4().hex[:8]}"
    state = MarketingState(
        product_name="Herbally product",
        campaign_plan=[
            CampaignPlanItem(
                id=campaign_id,
                campaign_name="Media attachment test campaign",
                platform="Instagram",
                objective="Conversions",
                target_audience="Test audience",
                creative_type="Static image",
                messaging="Grounded product creative",
                call_to_action="Shop now",
                budget_inr=1000,
                duration_days=7,
            )
        ],
    )
    db.add(
        WorkflowRun(
            id=workflow_id,
            workspace_id=settings.LEGACY_WORKSPACE_ID,
            marketing_goal="Conversions",
            budget=1000,
            state_snapshot=state.model_dump(),
        )
    )
    db.commit()

    attach = attach_media_to_workflow_campaign_endpoint(
        workflow_id,
        campaign_id,
        CampaignMediaAttachRequest(media_asset_id=media.id),
        db,
        principal=Principal(settings.AUTH_DEV_USER_ID, settings.AUTH_DEV_WORKSPACE_ID, "owner"),
    )
    linked = attach["state"]["campaign_plan"][0]["linked_assets"]
    assert media.id in linked["media_asset_ids"]
    assert linked["latest_generated_media_url"] == media.media_url
    assert any(route.path == "/content/assets/{asset_id}/media/generate" for route in router.routes)
