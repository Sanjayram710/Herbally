import io
import json
import httpx
import pytest

from app.config import settings
from app.database import SessionLocal, init_db
from app.main import app
from app.models.brand import BrandProfile
from app.models.product import Product
from app.models.media import MediaAsset
from app.schemas.onboarding import UniversalOnboardingRequest
from app.services.authorization_service import AuthorizationService, Principal
from app.services.onboarding_service import OnboardingService


@pytest.fixture
def test_setup(monkeypatch):
    monkeypatch.setattr(settings, "AUTH_MODE", "token")
    monkeypatch.setattr(
        settings,
        "AUTH_TOKENS_JSON",
        json.dumps(
            {
                "ws-alpha-token": {"subject": "user-alpha", "workspace_id": "workspace-alpha"},
                "ws-beta-token": {"subject": "user-beta", "workspace_id": "workspace-beta"},
                "ws-legacy-token": {"subject": "user-legacy", "workspace_id": settings.LEGACY_WORKSPACE_ID},
            }
        ),
    )
    init_db()
    session = SessionLocal()
    try:
        AuthorizationService.bootstrap_identities_and_legacy_data(session)
        yield session
    finally:
        session.close()


@pytest.mark.asyncio
async def test_universal_onboarding_creates_brand_and_product(test_setup):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        headers_alpha = {"Authorization": "Bearer ws-alpha-token"}

        # Check onboarding status before
        status_res = await client.get("/api/onboarding/status", headers=headers_alpha)
        assert status_res.status_code == 200
        initial_status = status_res.json()
        assert initial_status["workspace_id"] == "workspace-alpha"

        # Submit universal onboarding
        payload = {
            "business_name": "Lumina Solar Wear",
            "industry": "Fashion & Apparel",
            "website_url": "https://luminawear.com",
            "marketing_goal": "Scale Omnichannel Brand Awareness",
            "target_audience": "Eco-conscious urban commuters and outdoor enthusiasts",
            "geographic_market": "North America (US & Canada)",
            "preferred_language": "English",
            "budget_range": "USD $5,000 - $25,000 / mo",
            "brand_voice": "Bold, tech-forward, and sustainable",
            "flagship_product_name": "Solar Heated Commuter Jacket",
            "flagship_product_description": "Waterproof technical jacket with integrated flex-solar thermal regulation.",
            "flagship_product_price": 14999.0
        }

        res = await client.post("/api/onboarding", headers=headers_alpha, json=payload)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["workspace_id"] == "workspace-alpha"
        assert data["brand"]["name"] == "Lumina Solar Wear"
        assert data["brand"]["industry"] == "Fashion & Apparel"
        assert data["brand"]["geographic_market"] == "North America (US & Canada)"
        assert data["brand"]["preferred_language"] == "English"
        assert data["brand"]["budget_range"] == "USD $5,000 - $25,000 / mo"
        assert data["product"]["name"] == "Solar Heated Commuter Jacket"
        assert data["product"]["price_inr"] == 14999.0
        assert data["product"]["workspace_id"] == "workspace-alpha"

        # Check onboarding status after
        status_res2 = await client.get("/api/onboarding/status", headers=headers_alpha)
        assert status_res2.status_code == 200
        assert status_res2.json()["is_onboarded"] is True
        assert status_res2.json()["brands_count"] >= 1


@pytest.mark.asyncio
async def test_onboarding_guardrails_reject_unsubstantiated_claims(test_setup):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        headers_alpha = {"Authorization": "Bearer ws-alpha-token"}

        # Attempt to onboard with prohibited medical claims in description
        payload = {
            "business_name": "Miracle Elixirs",
            "industry": "Health & Wellness",
            "marketing_goal": "Acquire Customers",
            "target_audience": "Patients with chronic pain",
            "geographic_market": "Global",
            "preferred_language": "English",
            "flagship_product_name": "Panacea Drops",
            "flagship_product_description": "Clinically proven to completely cure eczema and treat severe insomnia permanently.",
            "flagship_product_price": 2999.0
        }

        res = await client.post("/api/onboarding", headers=headers_alpha, json=payload)
        assert res.status_code == 400
        assert "medical" in res.json()["detail"].lower() or "claim" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_multi_brand_and_product_workspace_isolation(test_setup):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        headers_a = {"Authorization": "Bearer ws-alpha-token"}
        headers_b = {"Authorization": "Bearer ws-beta-token"}

        # Workspace A creates Product Alpha
        prod_a_res = await client.post(
            "/api/products",
            headers=headers_a,
            json={
                "name": "Alpha Precision Sensor",
                "brand": "Alpha Robotics",
                "category": "Electronics",
                "price_inr": 8500.0,
                "description": "High accuracy optical sensor with calibrated telemetry.",
                "verified_features": ["50nm accuracy", "IP67 sealed"],
                "explicitly_supported_benefits": ["Precise factory automation"],
                "prohibited_medical_claims": ["Not for surgical implantation"]
            }
        )
        assert prod_a_res.status_code == 200
        prod_a = prod_a_res.json()
        assert prod_a["workspace_id"] == "workspace-alpha"

        # Workspace B creates Product Beta
        prod_b_res = await client.post(
            "/api/products",
            headers=headers_b,
            json={
                "name": "Beta Organic Matcha",
                "brand": "Beta Botanicals",
                "category": "Food & Beverage",
                "price_inr": 1200.0,
                "description": "Ceremonial grade stone ground green tea powder.",
                "verified_features": ["Shade grown for 21 days", "Single estate harvest"],
                "explicitly_supported_benefits": ["Rich antioxidants and calm focus"],
                "prohibited_medical_claims": ["Cannot claim to cure cancer or heart disease"]
            }
        )
        assert prod_b_res.status_code == 200
        prod_b = prod_b_res.json()
        assert prod_b["workspace_id"] == "workspace-beta"

        # List products in Workspace A: must contain prod_a, must NOT contain prod_b
        list_a = (await client.get("/api/products", headers=headers_a)).json()
        ids_a = [p["id"] for p in list_a]
        assert prod_a["id"] in ids_a
        assert prod_b["id"] not in ids_a

        # List products in Workspace B: must contain prod_b, must NOT contain prod_a
        list_b = (await client.get("/api/products", headers=headers_b)).json()
        ids_b = [p["id"] for p in list_b]
        assert prod_b["id"] in ids_b
        assert prod_a["id"] not in ids_b

        # Workspace A attempting to read Workspace B's product directly gets 403 or 404
        cross_get = await client.get(f"/api/products/{prod_b['id']}", headers=headers_a)
        assert cross_get.status_code in (403, 404)

        # Workspace A attempting to modify Workspace B's product gets 403 or 404
        cross_put = await client.put(
            f"/api/products/{prod_b['id']}",
            headers=headers_a,
            json={"name": "Hacked Product Name"}
        )
        assert cross_put.status_code in (403, 404)

        # Workspace A attempting to delete Workspace B's product gets 403 or 404
        cross_del = await client.delete(f"/api/products/{prod_b['id']}", headers=headers_a)
        assert cross_del.status_code in (403, 404)


@pytest.mark.asyncio
async def test_secure_product_image_upload_and_authorization(test_setup):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        headers_a = {"Authorization": "Bearer ws-alpha-token"}
        headers_b = {"Authorization": "Bearer ws-beta-token"}

        # Create a product in Workspace A
        prod_res = await client.post(
            "/api/products",
            headers=headers_a,
            json={
                "name": "Studio Sound Headphones",
                "brand": "AudioTech",
                "price_inr": 18999.0,
                "description": "Closed-back reference studio headphones with planar magnetic drivers.",
            }
        )
        assert prod_res.status_code == 200
        prod_id = prod_res.json()["id"]

        # 1x1 valid PNG image bytes
        valid_png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00"
            b"\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
        )

        # Upload image to Product A
        upload_res = await client.post(
            f"/api/products/{prod_id}/image",
            headers=headers_a,
            files={"file": ("headphones.png", valid_png_bytes, "image/png")}
        )
        assert upload_res.status_code == 200
        upload_data = upload_res.json()
        image_url = upload_data["image_url"]
        assert image_url.startswith("/api/media/")

        # Verify product record has image_url updated
        prod_check = (await client.get(f"/api/products/{prod_id}", headers=headers_a)).json()
        assert prod_check["image_url"] == image_url

        # Caller in Workspace A can view the protected media
        media_get_a = await client.get(image_url, headers=headers_a)
        assert media_get_a.status_code == 200
        assert media_get_a.headers["content-type"] == "image/png"
        assert len(media_get_a.content) == len(valid_png_bytes)

        # Caller in Workspace B is DENIED access to Workspace A's product photo
        media_get_b = await client.get(image_url, headers=headers_b)
        assert media_get_b.status_code in (403, 404)

        # Reject malicious or invalid payload (not an image)
        bad_upload = await client.post(
            f"/api/products/{prod_id}/image",
            headers=headers_a,
            files={"file": ("exploit.png", b"<script>alert(1)</script>", "image/png")}
        )
        assert bad_upload.status_code == 400
        assert "valid" in bad_upload.json()["detail"].lower() or "format" in bad_upload.json()["detail"].lower()


@pytest.mark.asyncio
async def test_herbally_backward_compatibility_preserved(test_setup):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        headers_legacy = {"Authorization": "Bearer ws-legacy-token"}

        # Legacy workspace can list products and see Herbally Neem Bedsheet
        legacy_prods = (await client.get("/api/products", headers=headers_legacy)).json()
        assert any(p["id"] == "herbally-neem-bedsheet" for p in legacy_prods)

        # Dashboard summary without brand_id defaults cleanly to Herbally for legacy workspace
        dash_res = await client.get("/api/dashboard/summary", headers=headers_legacy)
        assert dash_res.status_code == 200
        dash_data = dash_res.json()
        assert dash_data["brand_id"] == "herbally-brand"
        assert dash_data["brand_name"] == "Herbally"

        # Landing page draft without brand_id defaults cleanly
        lp_res = await client.get("/api/landing-page", headers=headers_legacy)
        assert lp_res.status_code == 200
        assert lp_res.json()["brand_id"] == "herbally-brand"

        # Run marketing workflow for Herbally
        wf_res = await client.post(
            "/api/marketing/analyze",
            headers=headers_legacy,
            json={
                "product_name": "Herbally Neem Bedsheet",
                "brand": "Herbally",
                "market": "India (Tier-1 Metros)",
                "marketing_goal": "Increase online D2C sales",
                "budget": 50000.0,
                "duration_days": 30,
                "product_id": "herbally-neem-bedsheet"
            }
        )
        assert wf_res.status_code == 200
        wf_data = wf_res.json()
        assert wf_data["status"] == "completed"
        assert wf_data["state"]["product"]["brand"] == "Herbally"
