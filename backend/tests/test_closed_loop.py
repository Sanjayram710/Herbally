import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.orchestrator import MarketingOrchestrator
from app.schemas.product import WorkflowTriggerRequest

client = TestClient(app, headers={"Authorization": "Bearer herbally-local-dev-token"})


def test_closed_loop_workflow_and_simulation():
    """
    Validates the complete closed-loop lifecycle:
    1. Product Setup & Strategy Generation (including 8 asset formats)
    2. Human Approval Gate (PENDING_APPROVAL -> APPROVED)
    3. Campaign Launch in Simulated Sandbox (APPROVED -> COMPLETED)
    4. Deterministic Analytics Calculation
    5. Next Best Action & Closed-Loop Next Campaign Iteration Generation (Iteration 2)
    """
    # 1. Trigger marketing strategy workflow
    payload = {
        "product_name": "Herbally Pure Neem Infused Organic Bedsheet",
        "brand": "Herbally",
        "market": "India",
        "marketing_goal": "Increase online D2C sales",
        "budget": 50000.0,
        "duration_days": 30
    }
    res = client.post("/api/marketing/analyze", json=payload)
    assert res.status_code == 200
    data = res.json()
    wf_id = data["workflow_id"]
    state = data["state"]

    # Verify 8 asset formats exist in asset_bundle
    assets = state["content_strategy"]["asset_bundle"]
    assert "instagram_post" in assets
    assert "instagram_reel_script" in assets
    assert "meta_ad_copy" in assets
    assert "google_search_ad" in assets
    assert "email_marketing" in assets
    assert "blog_seo_content" in assets
    assert len(assets["cta_variants"]) >= 3
    assert len(assets["headline_variants"]) >= 3

    # Check initial campaign plan is PENDING_APPROVAL
    campaigns = state["campaign_plan"]
    assert len(campaigns) >= 3
    assert all(c["status"] == "PENDING_APPROVAL" for c in campaigns)

    # 2. Human Approval Gate
    approve_res = client.post(
        f"/api/campaigns/{campaigns[0]['id']}/approve",
        json={"workflow_id": wf_id}
    )
    assert approve_res.status_code == 200
    app_data = approve_res.json()
    assert any(c["id"] == campaigns[0]["id"] and c["status"] == "APPROVED" for c in app_data["state"]["campaign_plan"])

    # 3. Launch in Simulated Sandbox
    launch_res = client.post(
        "/api/campaigns/launch",
        json={"workflow_id": wf_id, "campaign_id": campaigns[0]["id"]}
    )
    assert launch_res.status_code == 200
    launch_data = launch_res.json()
    updated_state = launch_data["state"]

    # Verify campaign completed and metrics simulated
    assert updated_state["campaign_data_loaded"] is True
    assert updated_state["analytics"] is not None
    assert updated_state["analytics"]["total_spend"] > 0
    assert updated_state["analytics"]["total_conversions"] > 0
    assert updated_state["analytics"]["overall_roas"] > 0
    assert updated_state["next_best_action"] is not None
    assert updated_state["next_best_action"]["next_campaign_iteration"] is not None

    # 4. Closed Loop: Deploy Next Best Campaign Iteration (Iteration 2)
    iterate_res = client.post(
        "/api/campaigns/iterate",
        json={"workflow_id": wf_id}
    )
    assert iterate_res.status_code == 200
    iter_data = iterate_res.json()
    assert iter_data["current_iteration"] == 2
    
    # Check that new campaign iteration exists in PENDING_APPROVAL status
    final_campaigns = iter_data["state"]["campaign_plan"]
    new_camp = final_campaigns[-1]
    assert new_camp["iteration_number"] == 2
    assert new_camp["status"] == "PENDING_APPROVAL"
    assert "Scaled" in new_camp["campaign_name"] or "V2" in new_camp["campaign_name"]
