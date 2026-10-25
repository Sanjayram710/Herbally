import json
import pytest
import httpx
from datetime import datetime, timezone, timedelta

from app.main import app
from app.config import settings
from app.database import SessionLocal, init_db
from app.models.security import Workspace
from app.models.brand import BrandProfile
from app.models.product import Product
from app.models.media import MediaAsset
from app.models.campaign import Campaign, CampaignApprovalHistory
from app.models.content import ContentAsset
from app.services.authorization_service import AuthorizationService


@pytest.fixture
def campaign_test_setup(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "ENV", "development")
    monkeypatch.setattr(settings, "AUTH_MODE", "token")
    monkeypatch.setattr(settings, "MEDIA_STORAGE_DIR", str(tmp_path))

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

        # Clean up existing test tenant campaigns, content, and approval history
        for ws_id in ["workspace-tenant-1", "workspace-tenant-2"]:
            db.query(MediaAsset).filter(MediaAsset.workspace_id == ws_id).delete(synchronize_session=False)
            test_camps = db.query(Campaign).filter(Campaign.workspace_id == ws_id).all()
            for c in test_camps:
                db.query(CampaignApprovalHistory).filter(CampaignApprovalHistory.campaign_id == c.id).delete(synchronize_session=False)
                db.query(ContentAsset).filter(ContentAsset.campaign_id == c.id).delete(synchronize_session=False)
                db.delete(c)
            db.query(ContentAsset).filter(ContentAsset.workspace_id == ws_id).delete(synchronize_session=False)

        for ws_id in ["workspace-tenant-1", "workspace-tenant-2"]:
            if not db.query(Workspace).filter(Workspace.id == ws_id).first():
                db.add(Workspace(id=ws_id, name=ws_id.title()))

        # Workspace 1 Brand & Product
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

        # Workspace 1 Base ContentAsset
        ca_1 = ContentAsset(
            id="ca-tenant-1",
            workspace_id="workspace-tenant-1",
            brand_id="brand-tenant-1",
            title="Serum Photo Base",
            content="Base creative",
        )
        db.merge(ca_1)

        # Workspace 1 Media Asset
        media_1 = MediaAsset(
            id="media-tenant-1",
            workspace_id="workspace-tenant-1",
            brand_id="brand-tenant-1",
            product_id="prod-tenant-1",
            content_asset_id="ca-tenant-1",
            asset_type="image",
            provider="demo",
            provider_model="demo-v1",
            prompt="Botanical serum hero shot",
            storage_key="test-key-1",
            media_url="/api/media/test-key-1",
            mime_type="image/jpeg",
            byte_size=1024,
            checksum_sha256="abc123sha",
            status="generated",
        )
        db.merge(media_1)

        # Workspace 2 Brand & Product & Media
        brand_2 = BrandProfile(
            id="brand-tenant-2",
            workspace_id="workspace-tenant-2",
            name="Apex Dynamics",
            industry="Fitness & Apparel",
        )
        db.merge(brand_2)

        prod_2 = Product(
            id="prod-tenant-2",
            workspace_id="workspace-tenant-2",
            brand_id="brand-tenant-2",
            name="Carbon Grip Training Gloves",
            description="Durable workout gloves",
            price_inr=999.0,
            category="Fitness",
        )
        db.merge(prod_2)

        ca_2 = ContentAsset(
            id="ca-tenant-2",
            workspace_id="workspace-tenant-2",
            brand_id="brand-tenant-2",
            title="Gloves Photo Base",
            content="Base creative",
        )
        db.merge(ca_2)

        media_2 = MediaAsset(
            id="media-tenant-2",
            workspace_id="workspace-tenant-2",
            brand_id="brand-tenant-2",
            product_id="prod-tenant-2",
            content_asset_id="ca-tenant-2",
            asset_type="image",
            provider="demo",
            provider_model="demo-v1",
            prompt="Workout gloves product shot",
            storage_key="test-key-2",
            media_url="/api/media/test-key-2",
            mime_type="image/jpeg",
            byte_size=1024,
            checksum_sha256="xyz789sha",
            status="generated",
        )
        db.merge(media_2)

        db.commit()
        yield {
            "db": db,
            "headers_1": {"Authorization": "Bearer token-tenant-1"},
            "headers_2": {"Authorization": "Bearer token-tenant-2"},
        }
    finally:
        db.close()


@pytest.mark.asyncio
async def test_campaign_creation_and_field_validation(campaign_test_setup):
    headers = campaign_test_setup["headers_1"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Valid Campaign Creation
        now = datetime.now(timezone.utc)
        start_date = (now + timedelta(days=1)).isoformat()
        end_date = (now + timedelta(days=30)).isoformat()

        payload = {
            "name": "Spring Glow Launch 2026",
            "description": "Launch campaign for the new hydrating botanical serum.",
            "brand_id": "brand-tenant-1",
            "product_id": "prod-tenant-1",
            "objective": "sales",
            "customer_segment": "Eco-conscious women aged 25-45 looking for organic skincare",
            "geographic_target": "India Tier-1 metros and Tier-2 wellness hubs",
            "channels": ["meta", "instagram", "google_search"],
            "start_date": start_date,
            "end_date": end_date,
            "budget": 25000.0,
            "currency": "INR",
            "content_frequency": "4x per week",
            "preferred_publishing_windows": ["Morning 09:00 - 11:00", "Evening 18:00 - 20:00"],
            "primary_kpi": "ROAS >= 3.5x",
            "secondary_kpis": ["CTR > 2.0%", "Conversion Rate > 3.0%"],
            "brief": "Highlight natural plant-derived hydration and gentle daily nourishment.",
            "key_messages": ["100% botanical hydration", "Dermatologically tested gentle formula"],
            "offer": "15% off first order with code GLOW15",
            "cta": "Shop Now",
            "brand_constraints": "Do not make claims regarding treating medical skin conditions.",
        }

        res = await client.post("/api/campaigns", json=payload, headers=headers)
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["name"] == "Spring Glow Launch 2026"
        assert data["status"] == "draft"
        assert data["budget"] == 25000.0
        assert data["brand_id"] == "brand-tenant-1"
        assert data["product_id"] == "prod-tenant-1"
        campaign_id = data["id"]

        # 2. Validation: budget <= 0 should fail with 400 or 422
        invalid_budget = payload.copy()
        invalid_budget["budget"] = 0.0
        res_bad_budget = await client.post("/api/campaigns", json=invalid_budget, headers=headers)
        assert res_bad_budget.status_code in [400, 422]

        # 3. Validation: end_date < start_date should fail with 400 or 422
        invalid_dates = payload.copy()
        invalid_dates["start_date"] = (now + timedelta(days=10)).isoformat()
        invalid_dates["end_date"] = (now + timedelta(days=5)).isoformat()
        res_bad_dates = await client.post("/api/campaigns", json=invalid_dates, headers=headers)
        assert res_bad_dates.status_code in [400, 422]

        # 4. Validation: prohibited medical claims should fail with 400
        invalid_claims = payload.copy()
        invalid_claims["brief"] = "Guaranteed to cure eczema and eliminate psoriasis completely."
        res_bad_claims = await client.post("/api/campaigns", json=invalid_claims, headers=headers)
        assert res_bad_claims.status_code == 400
        assert "medical claim" in res_bad_claims.text.lower() or "guardrail" in res_bad_claims.text.lower()

        # 5. Validation: Cross-brand or cross-workspace brand selection fails
        invalid_brand = payload.copy()
        invalid_brand["brand_id"] = "brand-tenant-2"  # Belongs to Workspace 2
        res_bad_brand = await client.post("/api/campaigns", json=invalid_brand, headers=headers)
        assert res_bad_brand.status_code in [400, 404]


@pytest.mark.asyncio
async def test_campaign_workspace_isolation(campaign_test_setup):
    headers_1 = campaign_test_setup["headers_1"]
    headers_2 = campaign_test_setup["headers_2"]

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Create campaign in Workspace 1
        payload = {
            "name": "Secret WS1 Campaign",
            "brand_id": "brand-tenant-1",
            "objective": "awareness",
            "budget": 10000.0,
            "brief": "Brand awareness for natural cosmetics.",
        }
        res = await client.post("/api/campaigns", json=payload, headers=headers_1)
        assert res.status_code == 201
        camp_id = res.json()["id"]

        # Workspace 2 attempts to GET the campaign -> 404
        get_res = await client.get(f"/api/campaigns/{camp_id}", headers=headers_2)
        assert get_res.status_code == 404

        # Workspace 2 attempts to UPDATE the campaign -> 404
        put_res = await client.put(f"/api/campaigns/{camp_id}", json={"name": "Hacked Name"}, headers=headers_2)
        assert put_res.status_code == 404

        # Workspace 2 attempts to DELETE the campaign -> 404
        del_res = await client.delete(f"/api/campaigns/{camp_id}", headers=headers_2)
        assert del_res.status_code == 404

        # Workspace 2 listing campaigns should NOT include camp_id
        list_res = await client.get("/api/campaigns", headers=headers_2)
        assert list_res.status_code == 200
        listed_ids = [c["id"] for c in list_res.json()]
        assert camp_id not in listed_ids


@pytest.mark.asyncio
async def test_campaign_strategy_generation_demo_mode_and_budget_cap(campaign_test_setup):
    headers = campaign_test_setup["headers_1"]

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create a campaign with total budget 45000 INR
        total_budget = 45000.0
        payload = {
            "name": "Ayurvedic Glow Campaign",
            "brand_id": "brand-tenant-1",
            "product_id": "prod-tenant-1",
            "objective": "conversions",
            "channels": ["meta", "instagram", "google_search"],
            "budget": total_budget,
            "currency": "INR",
            "brief": "Promote daily hydration and glowing skin naturally.",
            "cta": "Shop Now",
        }
        res = await client.post("/api/campaigns", json=payload, headers=headers)
        assert res.status_code == 201
        camp_id = res.json()["id"]

        # 2. Request AI Strategy Generation (in deterministic demo mode)
        strat_res = await client.post(f"/api/campaigns/{camp_id}/strategy", headers=headers)
        assert strat_res.status_code == 200, strat_res.text
        strat = strat_res.json()

        assert strat["is_demo"] is True
        assert "summary" in strat
        assert "audience_hypotheses" in strat
        assert "channel_recommendations" in strat
        assert "content_pillars" in strat
        assert "budget_allocation" in strat
        assert "publishing_calendar" in strat

        # 3. Budget Allocation Guardrail: Sum of channel allocations must not exceed total budget
        allocations = strat["budget_allocation"]
        assert len(allocations) > 0
        allocated_sum = sum(item["allocated_amount"] for item in allocations)
        assert allocated_sum <= total_budget
        assert abs(allocated_sum - total_budget) < 1.0  # Exactly distributed

        # 4. Verify cached strategy retrieval via GET
        get_strat = await client.get(f"/api/campaigns/{camp_id}/strategy", headers=headers)
        assert get_strat.status_code == 200
        assert get_strat.json()["is_demo"] is True
        assert get_strat.json()["summary"] == strat["summary"]


@pytest.mark.asyncio
async def test_campaign_content_crud_and_variants(campaign_test_setup):
    headers = campaign_test_setup["headers_1"]

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Create campaign
        res = await client.post("/api/campaigns", json={
            "name": "Content Test Campaign",
            "brand_id": "brand-tenant-1",
            "product_id": "prod-tenant-1",
            "objective": "engagement",
            "budget": 15000.0,
            "brief": "Gentle daily herbal serum.",
            "cta": "Learn More",
        }, headers=headers)
        camp_id = res.json()["id"]

        # 1. Add content item
        content_payload = {
            "channel": "instagram",
            "headline": "Pure Herbal Dew for Radiant Skin",
            "body": "Nourish your skin barrier with 100% cold-pressed botanical extracts.",
            "hashtags": ["#CleanBeauty", "#BotanicalGlow", "#HerbalSerum"],
            "call_to_action": "Shop Now",
            "scheduled_time": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        }
        c_res = await client.post(f"/api/campaigns/{camp_id}/content", json=content_payload, headers=headers)
        assert c_res.status_code == 201, c_res.text
        content_item = c_res.json()
        assert content_item["channel"] == "instagram"
        assert content_item["headline"] == "Pure Herbal Dew for Radiant Skin"
        content_id = content_item["id"]

        # 2. Update content item
        update_res = await client.put(f"/api/campaigns/{camp_id}/content/{content_id}", json={
            "headline": "Updated: Daily Botanical Glow Serum",
        }, headers=headers)
        assert update_res.status_code == 200
        assert update_res.json()["headline"] == "Updated: Daily Botanical Glow Serum"

        # 3. Guardrail: Medical claim in content update is blocked
        bad_claim_res = await client.put(f"/api/campaigns/{camp_id}/content/{content_id}", json={
            "body": "Clinically proven to cure eczema and reverse autoimmune conditions.",
        }, headers=headers)
        assert bad_claim_res.status_code == 400
        assert "medical claim" in bad_claim_res.text.lower() or "guardrail" in bad_claim_res.text.lower()

        # 4. Generate variants (Direct Response, Storytelling, Social Proof)
        var_res = await client.post(f"/api/campaigns/{camp_id}/content/{content_id}/variants", json={
            "angles": ["direct_response", "storytelling", "social_proof"]
        }, headers=headers)
        assert var_res.status_code == 200, var_res.text
        variants = var_res.json()
        assert len(variants) >= 3
        angles = [v["angle"] for v in variants]
        assert "direct_response" in angles
        assert "storytelling" in angles
        assert "social_proof" in angles

        # Verify that variants are safe from medical claims
        for v in variants:
            body_val = (v.get("body_copy") or v.get("body") or v.get("content") or "").lower()
            assert "cure" not in body_val


@pytest.mark.asyncio
async def test_asset_association_and_creative_orchestration(campaign_test_setup):
    headers_1 = campaign_test_setup["headers_1"]
    headers_2 = campaign_test_setup["headers_2"]

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Create campaign and content in WS1
        res = await client.post("/api/campaigns", json={
            "name": "Creative Asset Campaign",
            "brand_id": "brand-tenant-1",
            "budget": 20000.0,
            "brief": "Visual showcase of serum.",
        }, headers=headers_1)
        camp_id = res.json()["id"]

        c_res = await client.post(f"/api/campaigns/{camp_id}/content", json={
            "channel": "meta",
            "headline": "Botanical Radiance",
            "body": "Organic serum in recyclable glass bottle.",
        }, headers=headers_1)
        content_id = c_res.json()["id"]

        # 1. Attach Workspace 1 asset
        attach_res = await client.post(f"/api/campaigns/{camp_id}/assets/attach", json={
            "media_asset_id": "media-tenant-1",
            "content_asset_id": content_id,
        }, headers=headers_1)
        assert attach_res.status_code == 200, attach_res.text
        attach_data = attach_res.json()
        assert attach_data["status"] == "attached"

        # Verify content has media_asset_id
        list_c = await client.get(f"/api/campaigns/{camp_id}/content", headers=headers_1)
        items = list_c.json()
        matched = [i for i in items if i["id"] == content_id]
        assert len(matched) == 1
        assert matched[0]["media_asset_id"] == "media-tenant-1"

        # 2. Attempting to attach Workspace 2 asset to Workspace 1 campaign -> 404
        bad_attach = await client.post(f"/api/campaigns/{camp_id}/assets/attach", json={
            "media_asset_id": "media-tenant-2",  # Belongs to WS2
            "content_asset_id": content_id,
        }, headers=headers_1)
        assert bad_attach.status_code == 404


@pytest.mark.asyncio
async def test_approval_workflow_state_machine_and_history(campaign_test_setup):
    headers = campaign_test_setup["headers_1"]

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create a draft campaign
        res = await client.post("/api/campaigns", json={
            "name": "Approval State Machine Campaign",
            "brand_id": "brand-tenant-1",
            "budget": 30000.0,
            "brief": "Campaign for approval testing.",
            "offer": "10% off",
            "cta": "Buy Now",
        }, headers=headers)
        camp_id = res.json()["id"]
        assert res.json()["status"] == "draft"

        # 2. Invalid transition: Direct approval from draft should fail (must be submitted for review first)
        bad_approve = await client.post(f"/api/campaigns/{camp_id}/approve", json={"comment": "Fast approval"}, headers=headers)
        assert bad_approve.status_code == 400

        # 3. Submit for review -> pending_review
        sub_res = await client.post(f"/api/campaigns/{camp_id}/submit-review", json={"comment": "Ready for team review"}, headers=headers)
        assert sub_res.status_code == 200
        assert sub_res.json()["status"] == "pending_review"

        # 4. Reject campaign: requires a comment
        empty_reject = await client.post(f"/api/campaigns/{camp_id}/reject", json={"comment": ""}, headers=headers)
        assert empty_reject.status_code == 400
        assert "comment" in empty_reject.text.lower()

        # Reject with valid comment -> rejected
        reject_res = await client.post(f"/api/campaigns/{camp_id}/reject", json={"comment": "Budget too high for initial test"}, headers=headers)
        assert reject_res.status_code == 200
        assert reject_res.json()["status"] == "rejected"
        assert reject_res.json()["rejection_reason"] == "Budget too high for initial test"

        # 5. Invalid transition: cannot approve a rejected campaign directly
        bad_rej_approve = await client.post(f"/api/campaigns/{camp_id}/approve", json={"comment": "Skip revision"}, headers=headers)
        assert bad_rej_approve.status_code == 400

        # 6. Request revision -> moves back to draft
        rev_res = await client.post(f"/api/campaigns/{camp_id}/request-revision", json={"comment": "Reopening for budget adjustment"}, headers=headers)
        assert rev_res.status_code == 200
        assert rev_res.json()["status"] == "draft"

        # 7. Resubmit for review -> pending_review
        await client.post(f"/api/campaigns/{camp_id}/submit-review", json={"comment": "Adjusted and resubmitted"}, headers=headers)

        # 8. Approve campaign -> approved
        app_res = await client.post(f"/api/campaigns/{camp_id}/approve", json={"comment": "Approved for staging"}, headers=headers)
        assert app_res.status_code == 200
        assert app_res.json()["status"] == "approved"

        # 9. Mark ready to publish -> ready_to_publish
        pub_res = await client.post(f"/api/campaigns/{camp_id}/ready-publish", json={"comment": "Staged and ready for connectors"}, headers=headers)
        assert pub_res.status_code == 200
        assert pub_res.json()["status"] == "ready_to_publish"

        # 10. Audit History check: Verify complete history trail
        hist_res = await client.get(f"/api/campaigns/{camp_id}/history", headers=headers)
        assert hist_res.status_code == 200
        history = hist_res.json()
        assert len(history) >= 5

        actions = [h["action"] for h in history]
        assert any(a in ("submit_for_review", "submitted_for_review") for a in actions)
        assert any(a in ("reject", "rejected") for a in actions)
        assert any(a in ("revision_requested", "request_revision") for a in actions)
        assert any(a in ("approve", "approved") for a in actions)
        assert any(a in ("ready_to_publish", "marked_ready_to_publish") for a in actions)

        for h in history:
            assert h["actor_id"] == "user-tenant-1"
            assert h["created_at"] is not None


@pytest.mark.asyncio
async def test_campaign_calendar_and_rescheduling(campaign_test_setup):
    headers = campaign_test_setup["headers_1"]

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Create campaign and 2 scheduled content items
        c_res = await client.post("/api/campaigns", json={
            "name": "Calendar Content Campaign",
            "brand_id": "brand-tenant-1",
            "budget": 12000.0,
            "brief": "Calendar testing schedule.",
        }, headers=headers)
        camp_id = c_res.json()["id"]

        now = datetime.now(timezone.utc)
        sched_time_1 = (now + timedelta(days=3)).isoformat()
        sched_time_2 = (now + timedelta(days=7)).isoformat()

        res1 = await client.post(f"/api/campaigns/{camp_id}/content", json={
            "channel": "instagram",
            "headline": "Post 1: Botanical Dew",
            "body": "Organic moisture everyday.",
            "scheduled_time": sched_time_1,
        }, headers=headers)
        c1_id = res1.json()["id"]

        res2 = await client.post(f"/api/campaigns/{camp_id}/content", json={
            "channel": "meta",
            "headline": "Post 2: Vitamin Glow",
            "body": "Cold-pressed daily nourishment.",
            "scheduled_time": sched_time_2,
        }, headers=headers)
        c2_id = res2.json()["id"]

        # 1. Fetch Calendar Entries
        cal_res = await client.get("/api/calendar/entries", headers=headers)
        assert cal_res.status_code == 200, cal_res.text
        cal_entries = cal_res.json()
        assert len(cal_entries) >= 2

        entry_ids = [e["content_asset_id"] for e in cal_entries]
        assert c1_id in entry_ids
        assert c2_id in entry_ids

        # Verify entry properties
        first_entry = next(e for e in cal_entries if e["content_asset_id"] == c1_id)
        assert first_entry["brand_name"] == "Aura Botanicals"
        assert first_entry["channel"] == "instagram"
        assert first_entry["headline"] == "Post 1: Botanical Dew"

        # 2. Reschedule Entry 1
        new_time = (now + timedelta(days=5)).isoformat()
        sched_res = await client.put(f"/api/calendar/entries/{c1_id}/reschedule", json={
            "scheduled_time": new_time,
        }, headers=headers)
        assert sched_res.status_code == 200
        assert sched_res.json()["status"] == "rescheduled"

        # Verify entry has new scheduled time
        cal_res_after = await client.get("/api/calendar/entries", headers=headers)
        updated_entry = next(e for e in cal_res_after.json() if e["content_asset_id"] == c1_id)
        assert updated_entry["scheduled_time"] == new_time

        # 3. Invalid Reschedule format should return 400
        bad_time_res = await client.put(f"/api/calendar/entries/{c1_id}/reschedule", json={
            "scheduled_time": "not-a-valid-iso-date",
        }, headers=headers)
        assert bad_time_res.status_code == 400
