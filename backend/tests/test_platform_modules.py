import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.services.scraper_service import SafeScraperService
from app.services.brand_service import BrandService
from app.services.content_service import ContentService
from app.services.automation_service import AutomationService
from app.services.integration_service import IntegrationService
from app.services.dashboard_service import DashboardService
from app.services.assistant_service import AssistantService
from app.schemas.content import ContentGenerateRequest

client = TestClient(app, headers={"Authorization": "Bearer herbally-local-dev-token"})


def test_ssrf_protection_rejects_forbidden_hosts():
    """Verify SSRF protection blocks localhost, loopback, private IPs, and AWS metadata."""
    is_safe, msg = SafeScraperService.is_safe_url("http://localhost:8000/internal")
    assert not is_safe
    assert "forbidden" in msg.lower() or "restricted" in msg.lower()

    is_safe, msg = SafeScraperService.is_safe_url("http://127.0.0.1:8001/admin")
    assert not is_safe

    is_safe, msg = SafeScraperService.is_safe_url("http://169.254.169.254/latest/meta-data")
    assert not is_safe

    is_safe, msg = SafeScraperService.is_safe_url("ftp://example.com/file")
    assert not is_safe
    assert "unsupported protocol" in msg.lower()


def test_brand_intelligence_endpoints():
    """Test BrandProfile listing, retrieval, update, and persistence."""
    res = client.get("/api/brands")
    assert res.status_code == 200
    brands = res.json()
    assert len(brands) >= 1
    default_brand = brands[0]
    assert default_brand["name"] == "Herbally"

    # Test update
    update_res = client.put(f"/api/brands/{default_brand['id']}", json={
        "brand_voice": "Pure, calming, evidence-backed Ayurvedic sleep comfort."
    })
    assert update_res.status_code == 200
    assert update_res.json()["brand_voice"] == "Pure, calming, evidence-backed Ayurvedic sleep comfort."


def test_content_studio_generation_and_lifecycle():
    """Test generating content assets grounded in brand context, editing, and scheduling."""
    # Generate content
    res = client.post("/api/content/generate", json={
        "brand_id": "herbally-brand",
        "channels": ["Instagram", "Meta Ads"],
        "asset_types": ["social_post", "reel_script"]
    })
    assert res.status_code == 200
    assets = res.json()
    assert len(assets) >= 2
    
    asset = assets[0]
    assert asset["status"] == "draft"
    assert "prompt" in asset["image_prompt"].lower() or len(asset["image_prompt"]) > 0

    # Duplicate asset
    dup_res = client.post(f"/api/content/assets/{asset['id']}/duplicate")
    assert dup_res.status_code == 200
    assert "(Copy)" in dup_res.json()["title"]

    # Schedule asset
    sched_res = client.post(f"/api/content/assets/{asset['id']}/schedule", json={
        "channel": "Instagram",
        "scheduled_time": "2026-11-01T09:00:00Z"
    })
    assert sched_res.status_code == 200
    sched = sched_res.json()
    assert sched["status"] == "scheduled"

    # Trigger safe demo publishing
    pub_res = client.post(f"/api/content/schedules/{sched['id']}/publish-demo")
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "published_demo"


def test_ai_marketing_assistant_tool_execution():
    """Test AI assistant responding with grounded tools for content generation and approvals."""
    res = client.post("/api/assistant/chat", json={
        "brand_id": "herbally-brand",
        "content": "Check pending approvals in our queue"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["assistant_message"]["tool_called"] == "check_pending_approvals"
    assert "Pending Approvals Queue" in data["assistant_message"]["content"]


def test_automation_rules_and_execution_history():
    """Test Automation Center rules listing, toggling, and running."""
    res = client.get("/api/automations/rules")
    assert res.status_code == 200
    rules = res.json()
    assert len(rules) >= 3

    target_rule = rules[0]
    # Toggle rule
    toggle_res = client.post(f"/api/automations/rules/{target_rule['id']}/toggle", json={"is_enabled": False})
    assert toggle_res.status_code == 200
    assert not toggle_res.json()["is_enabled"]

    # Run rule
    run_res = client.post(f"/api/automations/rules/{target_rule['id']}/run")
    assert run_res.status_code == 200
    assert run_res.json()["status"] == "success"

    # List executions
    exec_res = client.get("/api/automations/executions")
    assert exec_res.status_code == 200
    assert len(exec_res.json()) >= 1


def test_integrations_connector_status():
    """Verify integration connectors list truthful status and unconfigured handling."""
    res = client.get("/api/integrations")
    assert res.status_code == 200
    connectors = res.json()
    assert len(connectors) >= 4

    meta_conn = next(c for c in connectors if c["id"] == "meta_ads")
    assert meta_conn["status"] == "unconfigured"
    assert not meta_conn["is_configured"]

    # Test ping on unconfigured connector
    test_res = client.post("/api/integrations/test", json={"integration_id": "meta_ads"})
    assert test_res.status_code == 200
    assert test_res.json()["status"] == "unconfigured"
    assert "Cannot connect" in test_res.json()["message"]


def test_dashboard_summary():
    """Test executive dashboard summary endpoint returns counts and provenance."""
    res = client.get("/api/dashboard/summary?brand_id=herbally-brand")
    assert res.status_code == 200
    dash = res.json()
    assert dash["brand_name"] == "Herbally"
    assert "content_counts" in dash
    assert "metric_provenance" in dash
    assert "SIMULATED" in dash["metric_provenance"]
