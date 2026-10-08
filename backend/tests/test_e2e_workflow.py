import os
from fastapi.testclient import TestClient
from app.main import app
from app.services.orchestrator import MarketingOrchestrator
from app.schemas.product import WorkflowTriggerRequest
from app.services.report_service import ReportService

client = TestClient(app)


def test_e2e_orchestrator_and_reporting():
    """
    Automated end-to-end test:
    Product Input -> Research -> Strategy -> Content -> Campaign Plan -> Campaign Metrics -> Analytics -> Optimization -> Next Best Action -> Reports
    """
    orchestrator = MarketingOrchestrator()

    # 1. Product & Strategy Trigger
    req = WorkflowTriggerRequest(
        product_name="Herbally Pure Neem Infused Organic Bedsheet",
        brand="Herbally",
        market="India",
        marketing_goal="Increase online sales",
        budget=50000.0,
        duration_days=30
    )

    state = orchestrator.run_strategy_workflow(req)

    assert state.product is not None
    assert state.product.brand == "Herbally"
    assert len(state.product.verified_features) >= 3
    assert state.research is not None
    assert len(state.competitors) >= 2
    assert len(state.audience_analysis) >= 2
    assert state.strategy is not None
    assert len(state.strategy.channels) >= 3
    # Check budget split sums to total budget
    total_channel_budget = sum(c.budget_allocated_inr for c in state.strategy.channels)
    assert abs(total_channel_budget - 50000.0) < 1.0
    assert state.seo_strategy is not None
    assert state.content_strategy is not None
    assert len(state.content_strategy.ad_copy_variations) >= 3
    assert len(state.campaign_plan) >= 3

    # 2. Attach Campaign Data
    sample_csv_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "data",
        "sample_campaign.csv"
    )
    assert os.path.exists(sample_csv_path)

    with open(sample_csv_path, "rb") as f:
        csv_bytes = f.read()

    from app.services.analytics_service import AnalyticsService
    rows, _ = AnalyticsService.parse_csv(csv_bytes)
    assert len(rows) == 5

    # 3. Analytics & Optimization
    updated_state = orchestrator.attach_campaign_metrics_and_optimize(state, rows)
    assert updated_state.campaign_data_loaded is True
    assert updated_state.analytics is not None
    assert updated_state.analytics.total_spend > 0
    assert updated_state.analytics.total_conversions > 0
    assert updated_state.analytics.overall_roas > 0
    assert len(updated_state.recommendations) >= 2
    assert updated_state.next_best_action is not None
    assert updated_state.next_best_action.priority == "HIGH"

    # 4. Report Generation
    md_report = ReportService.generate_markdown_report(updated_state)
    assert "# Digital Marketing Strategy & Optimization Report" in md_report
    assert "PRIORITY NEXT BEST ACTION" in md_report
    assert "Herbally Pure Neem Infused Organic Bedsheet" in md_report

    json_report = ReportService.generate_json_report(updated_state)
    assert json_report["brand"] == "Herbally"
    assert json_report["campaign_data_loaded"] is True


def test_fastapi_endpoints():
    """Verify primary REST endpoints respond correctly."""
    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    # 2. Products listing (seeded on startup)
    res = client.get("/api/products")
    assert res.status_code == 200
    products = res.json()
    assert len(products) >= 1
    assert any(p["brand"] == "Herbally" for p in products)

    # 3. Marketing strategy execution endpoint
    payload = {
        "product_name": "Herbally Pure Neem Infused Organic Bedsheet",
        "brand": "Herbally",
        "market": "India",
        "marketing_goal": "Increase online sales",
        "budget": 50000.0,
        "duration_days": 30
    }
    res = client.post("/api/marketing/analyze", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "workflow_id" in data
    wf_id = data["workflow_id"]
    assert data["status"] == "completed"
    assert data["state"]["product"]["brand"] == "Herbally"

    # 4. Upload campaign CSV to the created workflow
    sample_csv_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "data",
        "sample_campaign.csv"
    )
    with open(sample_csv_path, "rb") as f:
        res = client.post(
            "/api/analytics/upload",
            data={"workflow_id": wf_id},
            files={"file": ("sample_campaign.csv", f, "text/csv")}
        )
    assert res.status_code == 200
    upload_res = res.json()
    assert upload_res["rows_parsed"] == 5
    assert upload_res["next_best_action"] is not None

    # 5. Retrieve Markdown report
    res = client.get(f"/api/reports/{wf_id}/markdown")
    assert res.status_code == 200
    assert "Digital Marketing Strategy" in res.text
