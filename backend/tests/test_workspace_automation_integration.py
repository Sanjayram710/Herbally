import json

import httpx
import pytest
from fastapi import HTTPException

from app.config import settings
from app.database import SessionLocal, init_db
from app.main import app
from app.models.automation import AutomationExecution, AutomationRule
from app.models.integration import IntegrationConfig
from app.schemas.automation import AutomationRuleCreate, AutomationRuleUpdate
from app.services.authorization_service import AuthorizationService, Principal
from app.services.automation_service import AutomationService
from app.services.integration_service import IntegrationService


@pytest.fixture
def db(monkeypatch):
    monkeypatch.setattr(settings, "AUTH_MODE", "token")
    monkeypatch.setattr(
        settings,
        "AUTH_TOKENS_JSON",
        json.dumps(
            {
                "workspace-a-token": {"subject": "workspace-a-user", "workspace_id": "workspace-a"},
                "workspace-b-token": {"subject": "workspace-b-user", "workspace_id": "workspace-b"},
            }
        ),
    )
    monkeypatch.setattr(settings, "LEGACY_WORKSPACE_ID", "workspace-a")
    init_db()
    session = SessionLocal()
    try:
        AuthorizationService.bootstrap_identities_and_legacy_data(session)
        yield session
    finally:
        session.close()


def _connector(items, key):
    return next(item for item in items if item.connector_key == key)


def test_workspace_rules_and_executions_are_isolated(db):
    rules_a = AutomationService.list_rules(db, "workspace-a")
    rules_b = AutomationService.list_rules(db, "workspace-b")
    assert rules_a and rules_b
    assert not {rule.id for rule in rules_a}.intersection(rule.id for rule in rules_b)

    foreign_rule = rules_b[0]
    assert AutomationService.toggle_rule(db, "workspace-a", foreign_rule.id, False) is None

    local_rule = next(rule for rule in rules_b if rule.action_type == "check_budget_drag")
    execution = AutomationService.run_rule(db, "workspace-b", local_rule.id)
    assert execution.workspace_id == "workspace-b"
    assert execution.rule_id == local_rule.id
    assert execution.id in {item.id for item in AutomationService.list_executions(db, "workspace-b")}
    assert execution.id not in {item.id for item in AutomationService.list_executions(db, "workspace-a")}

    with pytest.raises(HTTPException) as error:
        AuthorizationService.owned_automation_rule(db, Principal("workspace-a-user", "workspace-a"), local_rule.id)
    assert error.value.status_code == 404
    with pytest.raises(HTTPException) as error:
        AuthorizationService.owned_automation_execution(db, Principal("workspace-a-user", "workspace-a"), execution.id)
    assert error.value.status_code == 404


def test_workspace_rule_creation_and_update_are_scoped(db):
    created = AutomationService.create_rule(
        db,
        "workspace-a",
        AutomationRuleCreate(
            name="Workspace A rule",
            description="Only belongs to workspace A",
            trigger_type="manual",
            action_type="generate_report",
        ),
    )
    assert created.workspace_id == "workspace-a"
    assert AutomationService.update_rule(
        db, "workspace-b", created.id, AutomationRuleUpdate(name="Foreign update")
    ) is None
    updated = AutomationService.update_rule(
        db, "workspace-a", created.id, AutomationRuleUpdate(name="Updated locally")
    )
    assert updated and updated.name == "Updated locally"


def test_workspace_integrations_are_isolated(db):
    integrations_a = IntegrationService.list_integrations(db, "workspace-a")
    integrations_b = IntegrationService.list_integrations(db, "workspace-b")
    image_a = _connector(integrations_a, "openai_images")
    image_b = _connector(integrations_b, "openai_images")
    assert image_a.id != image_b.id
    assert image_a.workspace_id == "workspace-a"
    assert image_b.workspace_id == "workspace-b"

    with pytest.raises(ValueError, match="Integration not found"):
        IntegrationService.test_connection(db, "workspace-a", image_b.id)
    result = IntegrationService.test_connection(db, "workspace-b", image_b.id)
    assert result["integration_id"] == image_b.id
    assert result["status"] == "unconfigured"

    with pytest.raises(HTTPException) as error:
        AuthorizationService.owned_integration(db, Principal("workspace-a-user", "workspace-a"), image_b.id)
    assert error.value.status_code == 404


def test_legacy_automation_and_connector_records_are_backfilled_additively(db):
    db.query(AutomationExecution).filter(AutomationExecution.id == "legacy-execution-workspace-test").delete()
    db.query(AutomationRule).filter(AutomationRule.id == "legacy-rule-workspace-test").delete()
    db.query(IntegrationConfig).filter(IntegrationConfig.id == "legacy-connector-workspace-test").delete()
    db.add(
        AutomationRule(
            id="legacy-rule-workspace-test",
            name="Preserved rule",
            description="Legacy record",
            trigger_type="manual",
            action_type="generate_report",
        )
    )
    db.add(
        AutomationExecution(
            id="legacy-execution-workspace-test",
            rule_id="legacy-rule-workspace-test",
            rule_name="Preserved rule",
            details="Legacy execution details",
        )
    )
    db.add(
        IntegrationConfig(
            id="legacy-connector-workspace-test",
            name="Preserved connector",
            category="test",
        )
    )
    db.commit()

    AuthorizationService.bootstrap_identities_and_legacy_data(db)
    rule = db.query(AutomationRule).filter(AutomationRule.id == "legacy-rule-workspace-test").one()
    execution = db.query(AutomationExecution).filter(AutomationExecution.id == "legacy-execution-workspace-test").one()
    connector = db.query(IntegrationConfig).filter(IntegrationConfig.id == "legacy-connector-workspace-test").one()
    assert rule.workspace_id == "workspace-a" and rule.name == "Preserved rule"
    assert execution.workspace_id == "workspace-a" and execution.details == "Legacy execution details"
    assert connector.workspace_id == "workspace-a"
    assert connector.connector_key == "legacy-connector-workspace-test"


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.anyio
async def test_automation_and_integration_endpoints_require_bearer_auth(db):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        assert (await client.get("/api/automations/rules")).status_code == 401
        assert (
            await client.post(
                "/api/automations/rules",
                json={
                    "name": "test",
                    "description": "test",
                    "trigger_type": "manual",
                    "action_type": "test",
                },
            )
        ).status_code == 401
        assert (await client.get("/api/automations/executions")).status_code == 401
        assert (await client.get("/api/integrations")).status_code == 401
        assert (await client.post("/api/integrations/test", json={"integration_id": "test"})).status_code == 401


@pytest.mark.anyio
async def test_cross_workspace_automation_and_integration_api_access_is_rejected(db):
    headers_a = _headers("workspace-a-token")
    headers_b = _headers("workspace-b-token")

    # Get Workspace B rule and integration
    rules_b = AutomationService.list_rules(db, "workspace-b")
    rule_b = rules_b[0]
    exec_b = AutomationService.run_rule(db, "workspace-b", rule_b.id)
    integrations_b = IntegrationService.list_integrations(db, "workspace-b")
    integration_b = integrations_b[0]

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        # Workspace A attempting to read/mutate Workspace B rule
        assert (await client.get(f"/api/automations/rules/{rule_b.id}", headers=headers_a)).status_code == 404
        assert (
            await client.put(
                f"/api/automations/rules/{rule_b.id}",
                headers=headers_a,
                json={"name": "Hacked"},
            )
        ).status_code == 404
        assert (
            await client.post(
                f"/api/automations/rules/{rule_b.id}/toggle",
                headers=headers_a,
                json={"is_enabled": False},
            )
        ).status_code == 404
        assert (await client.post(f"/api/automations/rules/{rule_b.id}/run", headers=headers_a)).status_code == 404

        # Workspace A attempting to read Workspace B execution
        assert (await client.get(f"/api/automations/executions/{exec_b.id}", headers=headers_a)).status_code == 404

        # Workspace A attempting to read/test Workspace B integration
        assert (await client.get(f"/api/integrations/{integration_b.id}", headers=headers_a)).status_code == 404
        assert (
            await client.post(
                "/api/integrations/test",
                headers=headers_a,
                json={"integration_id": integration_b.id},
            )
        ).status_code == 404

        # Verify Workspace B can access its own resources
        assert (await client.get(f"/api/automations/rules/{rule_b.id}", headers=headers_b)).status_code == 200
        assert (await client.get(f"/api/automations/executions/{exec_b.id}", headers=headers_b)).status_code == 200
        assert (await client.get(f"/api/integrations/{integration_b.id}", headers=headers_b)).status_code == 200


@pytest.mark.anyio
async def test_valid_same_workspace_automation_and_integration_operations(db):
    headers_a = _headers("workspace-a-token")

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        # Create rule
        create_res = await client.post(
            "/api/automations/rules",
            headers=headers_a,
            json={
                "name": "Audit Task",
                "description": "Checks pending approvals",
                "trigger_type": "schedule_weekly",
                "action_type": "notify_approval",
                "frequency": "Weekly",
                "is_enabled": True,
            },
        )
        assert create_res.status_code == 200
        rule = create_res.json()
        rule_id = rule["id"]
        assert rule["workspace_id"] == "workspace-a"

        # Update rule
        update_res = await client.put(
            f"/api/automations/rules/{rule_id}",
            headers=headers_a,
            json={"name": "Audit Task Updated"},
        )
        assert update_res.status_code == 200
        assert update_res.json()["name"] == "Audit Task Updated"

        # Toggle rule
        toggle_res = await client.post(
            f"/api/automations/rules/{rule_id}/toggle",
            headers=headers_a,
            json={"is_enabled": False},
        )
        assert toggle_res.status_code == 200
        assert toggle_res.json()["is_enabled"] is False

        # Run rule
        run_res = await client.post(
            f"/api/automations/rules/{rule_id}/run",
            headers=headers_a,
        )
        assert run_res.status_code == 200
        execution = run_res.json()
        assert execution["workspace_id"] == "workspace-a"
        assert execution["rule_id"] == rule_id

        # List executions
        execs_res = await client.get("/api/automations/executions", headers=headers_a)
        assert execs_res.status_code == 200
        exec_ids = [e["id"] for e in execs_res.json()]
        assert execution["id"] in exec_ids

        # Integrations list and test
        integrations_res = await client.get("/api/integrations", headers=headers_a)
        assert integrations_res.status_code == 200
        integrations = integrations_res.json()
        assert len(integrations) >= 1
        local_mock = next(i for i in integrations if i["connector_key"] == "llm_adapter")

        test_res = await client.post(
            "/api/integrations/test",
            headers=headers_a,
            json={"integration_id": local_mock["id"]},
        )
        assert test_res.status_code == 200
        assert test_res.json()["status"] == "connected"
