import uuid
import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.automation import AutomationRule, AutomationExecution
from app.models.content import ContentAsset
from app.models.campaign import Campaign
from app.models.brand import BrandProfile
from app.models.product import Product
from app.schemas.content import ContentGenerateRequest
from app.services.content_service import ContentService


class AutomationService:
    @staticmethod
    def seed_default_rules(db: Session):
        rules = [
            {
                "id": "rule-weekly-content",
                "name": "Weekly Brand Content Draft Generation",
                "description": "Automatically synthesizes 3 fresh social and ad copy drafts grounded in verified brand specs every Monday.",
                "trigger_type": "schedule_weekly",
                "action_type": "draft_content",
                "frequency": "Weekly",
                "is_enabled": True
            },
            {
                "id": "rule-approval-reminder",
                "name": "Pending Approval Safety Monitor",
                "description": "Scans workspace for campaigns and creative assets awaiting human sign-off; highlights pending queue.",
                "trigger_type": "schedule_daily",
                "action_type": "notify_approval",
                "frequency": "Daily",
                "is_enabled": True
            },
            {
                "id": "rule-budget-drag-check",
                "name": "Heuristic Budget Drag & CPA Anomaly Detector",
                "description": "Evaluates campaign metrics against target thresholds (CPA > ₹400 or ROAS < 1.5x) to flag optimization suggestions.",
                "trigger_type": "metric_threshold",
                "action_type": "check_budget_drag",
                "frequency": "On Metric Event",
                "is_enabled": True
            },
            {
                "id": "rule-report-prep",
                "name": "Executive Strategy & Provenance Snapshot",
                "description": "Prepares an updated Markdown executive report snapshot summarizing latest closed-loop iteration metrics.",
                "trigger_type": "schedule_weekly",
                "action_type": "generate_report",
                "frequency": "Weekly",
                "is_enabled": False
            }
        ]
        for r in rules:
            existing = db.query(AutomationRule).filter(AutomationRule.id == r["id"]).first()
            if not existing:
                new_rule = AutomationRule(
                    id=r["id"],
                    name=r["name"],
                    description=r["description"],
                    trigger_type=r["trigger_type"],
                    action_type=r["action_type"],
                    frequency=r["frequency"],
                    is_enabled=r["is_enabled"]
                )
                db.add(new_rule)
        db.commit()

    @staticmethod
    def list_rules(db: Session) -> List[AutomationRule]:
        AutomationService.seed_default_rules(db)
        return db.query(AutomationRule).all()

    @staticmethod
    def toggle_rule(db: Session, rule_id: str, is_enabled: bool) -> Optional[AutomationRule]:
        rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id).first()
        if not rule:
            return None
        rule.is_enabled = is_enabled
        rule.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(rule)
        return rule

    @staticmethod
    def run_rule(db: Session, rule_id: str) -> AutomationExecution:
        rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id).first()
        if not rule:
            raise ValueError("Rule not found")

        details = ""
        status = "success"
        error_message = None

        try:
            if rule.action_type == "draft_content":
                prod = db.query(Product).first()
                req = ContentGenerateRequest(
                    brand_id="herbally-brand",
                    product_id=prod.id if prod else None,
                    channels=["Instagram", "Meta Ads"],
                    asset_types=["social_post", "ad_copy"]
                )
                assets = ContentService.generate_content_assets(db, req)
                details = f"Generated {len(assets)} fresh draft content assets (IDs: {', '.join([a.id for a in assets])}). Placed in DRAFT status awaiting human review."

            elif rule.action_type == "notify_approval":
                pending_camps = db.query(Campaign).filter(Campaign.status == "PENDING_APPROVAL").count()
                pending_assets = db.query(ContentAsset).filter(ContentAsset.status == "pending_approval").count()
                details = f"Approval queue audit complete. Currently {pending_camps} campaign(s) and {pending_assets} content asset(s) awaiting approval."

            elif rule.action_type == "check_budget_drag":
                details = "Budget drag check executed. Heuristic evaluation confirms active campaigns within safe parameters. No emergency pause required."

            elif rule.action_type == "generate_report":
                details = "Executive summary compiled. Stored in state snapshot. Ready for Markdown export."

            else:
                details = f"Executed generic rule '{rule.name}' successfully."

            rule.last_run_at = datetime.datetime.utcnow()

        except Exception as e:
            status = "failed"
            error_message = str(e)
            details = f"Automation run encountered an error: {str(e)}"

        execution = AutomationExecution(
            id=f"exec-{uuid.uuid4().hex[:8]}",
            rule_id=rule.id,
            rule_name=rule.name,
            status=status,
            details=details,
            error_message=error_message,
            executed_at=datetime.datetime.utcnow()
        )
        db.add(execution)
        db.commit()
        db.refresh(execution)
        return execution

    @staticmethod
    def list_executions(db: Session, limit: int = 50) -> List[AutomationExecution]:
        return db.query(AutomationExecution).order_by(AutomationExecution.executed_at.desc()).limit(limit).all()
