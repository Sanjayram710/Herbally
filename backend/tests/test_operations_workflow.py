import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.analytics_service import AnalyticsService, safe_divide
from app.services.optimization_service import OptimizationService

client = TestClient(app)


def test_python_metric_calculations_and_zero_division():
    """Validates pure Python formulas and safe division protection."""
    assert safe_divide(10, 0) == 0.0
    assert safe_divide(0, 10) == 0.0
    assert safe_divide(None, 10) == 0.0
    assert safe_divide(10, None) == 0.0

    # Formulas verification:
    # CTR (%) = clicks / impressions * 100
    # CPC = spend / clicks
    # Conv Rate (%) = conversions / clicks * 100
    # CPA = spend / conversions
    # ROAS = revenue / spend
    raw = [{
        "campaign_id": "TEST-01",
        "campaign_name": "Test Math Campaign",
        "platform": "Instagram",
        "spend": 10000.0,
        "impressions": 100000,
        "clicks": 2500,
        "conversions": 100,
        "revenue": 35000.0
    }]
    output = AnalyticsService.process_campaign_metrics(raw)
    row = output.campaign_rows[0]

    assert row.ctr == 2.5  # 2500 / 100000 * 100
    assert row.cpc == 4.0  # 10000 / 2500
    assert row.conv_rate == 4.0  # 100 / 2500 * 100
    assert row.cpa == 100.0  # 10000 / 100
    assert row.roas == 3.5  # 35000 / 10000


def test_end_to_end_operations_lifecycle_and_lineage():
    """
    Validates complete operational workflow:
    1. Product & Goal with validated URL and budget
    2. Strategy & Content Assets generated
    3. Custom campaign created in DRAFT status
    4. State transitions: DRAFT -> PENDING_APPROVAL -> APPROVED -> SIMULATED_RUNNING -> COMPLETED
    5. Selected campaign analytics binding
    6. Optimization recommendations citing exact numbers
    7. Revised campaign creation with explicit lineage (source_campaign_id)
    8. Pause and Reset state transitions
    """
    # 1. Product & Goal brief
    payload = {
        "product_name": "Herbally Pure Neem Infused Organic Bedsheet",
        "brand": "Herbally",
        "product_url": "https://herbally.in/products/neem-organic-bedsheet",
        "market": "India",
        "marketing_goal": "Increase online D2C sales",
        "budget": 50000.0,
        "duration_days": 30,
        "target_audience_hint": "Conscious wellness seekers"
    }
    create_res = client.post("/api/marketing/analyze", json=payload)
    assert create_res.status_code == 200
    wf_data = create_res.json()
    wf_id = wf_data["workflow_id"]
    state = wf_data["state"]

    # Verify content assets exist
    assets = state["content_strategy"]["asset_bundle"]
    assert "instagram_post" in assets
    assert "meta_ad_copy" in assets
    assert "cta_variants" in assets

    # 2. Create custom campaign from selected assets in DRAFT status
    custom_camp = {
        "id": "CAMP-CUSTOM-01",
        "campaign_name": "Custom UGC Neem Campaign",
        "platform": "Instagram",
        "objective": "Conversions (Sales)",
        "target_audience": "Conscious Skincare Seekers",
        "creative_type": "Instagram Reel Video",
        "messaging": assets["meta_ad_copy"].get("headline", "Pure Neem Sleep"),
        "call_to_action": "Shop Pure Neem Bedsheets",
        "budget_inr": 15000.0,
        "duration_days": 30,
        "linked_assets": {"selected_asset": "meta_ad_copy"}
    }
    create_camp_res = client.post("/api/campaigns/create", json={"workflow_id": wf_id, "campaign": custom_camp})
    assert create_camp_res.status_code == 200
    updated_state = create_camp_res.json()["state"]
    created_item = next((c for c in updated_state["campaign_plan"] if c["id"] == "CAMP-CUSTOM-01"), None)
    assert created_item is not None
    assert created_item["status"] == "DRAFT"

    # 3. Transition DRAFT -> PENDING_APPROVAL
    status_res = client.post(
        "/api/campaigns/CAMP-CUSTOM-01/status",
        json={"workflow_id": wf_id, "status": "PENDING_APPROVAL"}
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "PENDING_APPROVAL"

    # 4. Transition PENDING_APPROVAL -> APPROVED
    appr_res = client.post(
        "/api/campaigns/CAMP-CUSTOM-01/approve",
        json={"workflow_id": wf_id}
    )
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "APPROVED"

    # 5. Launch Campaign in Simulated Sandbox (APPROVED -> SIMULATED_RUNNING -> COMPLETED)
    launch_res = client.post(
        "/api/campaigns/launch",
        json={"workflow_id": wf_id, "campaign_id": "CAMP-CUSTOM-01"}
    )
    assert launch_res.status_code == 200
    exec_state = launch_res.json()["state"]
    launched_camp = next(c for c in exec_state["campaign_plan"] if c["id"] == "CAMP-CUSTOM-01")
    assert launched_camp["status"] == "COMPLETED"
    assert exec_state["campaign_data_loaded"] is True
    assert exec_state["selected_campaign_id"] == "CAMP-CUSTOM-01"

    # 6. Selected campaign analytics binding
    analytics = exec_state["analytics"]
    camp_row = next(r for r in analytics["campaign_rows"] if r["campaign_id"] == "CAMP-CUSTOM-01")
    assert camp_row["is_simulated"] == "SIMULATED DATA"
    assert camp_row["spend"] > 0
    assert camp_row["impressions"] > 0
    assert camp_row["clicks"] > 0
    assert camp_row["conversions"] > 0
    assert camp_row["revenue"] > 0
    # Independent verification of formulas
    expected_ctr = round((camp_row["clicks"] / camp_row["impressions"]) * 100, 2)
    expected_cpc = round(camp_row["spend"] / camp_row["clicks"], 2)
    expected_conv = round((camp_row["conversions"] / camp_row["clicks"]) * 100, 2)
    expected_cpa = round(camp_row["spend"] / camp_row["conversions"], 2)
    expected_roas = round(camp_row["revenue"] / camp_row["spend"], 2)

    assert camp_row["ctr"] == expected_ctr
    assert camp_row["cpc"] == expected_cpc
    assert camp_row["conv_rate"] == expected_conv
    assert camp_row["cpa"] == expected_cpa
    assert camp_row["roas"] == expected_roas

    # 7. Optimization recommendations citing exact numbers
    recs = exec_state["recommendations"]
    assert len(recs) >= 1
    rec1 = recs[0]
    assert rec1["campaign_id"] == "CAMP-CUSTOM-01"
    assert str(camp_row["roas"]) in rec1["evidence"]
    assert str(camp_row["conversions"]) in rec1["evidence"]

    # 8. Revised Campaign creation with explicit lineage
    revise_res = client.post(
        "/api/campaigns/CAMP-CUSTOM-01/revise",
        json={"workflow_id": wf_id, "recommendation_id": rec1["id"]}
    )
    assert revise_res.status_code == 200
    revised_state = revise_res.json()["state"]
    revised_camp = next(c for c in revised_state["campaign_plan"] if c["source_campaign_id"] == "CAMP-CUSTOM-01")
    assert revised_camp is not None
    assert revised_camp["status"] == "DRAFT"
    assert revised_camp["revised_from_id"] == "CAMP-CUSTOM-01"
    assert rec1["id"] in revised_camp["applied_recommendation_ids"]

    # 9. Test pause and reset controls
    pause_res = client.post(
        f"/api/campaigns/{revised_camp['id']}/status",
        json={"workflow_id": wf_id, "status": "PAUSED"}
    )
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "PAUSED"

    reset_res = client.post(
        "/api/campaigns/CAMP-CUSTOM-01/reset",
        json={"workflow_id": wf_id}
    )
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "DRAFT"
