from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.brand import BrandProfile
from app.models.campaign import Campaign
from app.models.content import ContentAsset
from app.models.workflow import WorkflowRun
from app.models.automation import AutomationExecution
from app.models.integration import IntegrationConfig
from app.schemas.state import MarketingState
from app.services.brand_service import BrandService
from app.services.automation_service import AutomationService
from app.services.integration_service import IntegrationService


class DashboardService:
    @staticmethod
    def get_summary(db: Session, brand_id: str = "herbally-brand") -> Dict[str, Any]:
        brand = db.query(BrandProfile).filter(BrandProfile.id == brand_id).first()
        if not brand:
            brand = BrandService.get_or_create_default_brand(db)

        # Campaign counts
        campaigns = db.query(Campaign).all()
        total_campaigns = len(campaigns)
        active_campaigns = sum(1 for c in campaigns if c.status in ("APPROVED", "SIMULATED_RUNNING", "COMPLETED"))

        # Content counts by status
        assets = db.query(ContentAsset).filter(ContentAsset.brand_id == brand.id).all()
        content_counts = {
            "draft": sum(1 for a in assets if a.status == "draft"),
            "pending_approval": sum(1 for a in assets if a.status == "pending_approval"),
            "approved": sum(1 for a in assets if a.status == "approved"),
            "scheduled": sum(1 for a in assets if a.status == "scheduled"),
            "published_demo": sum(1 for a in assets if a.status == "published_demo"),
            "failed": sum(1 for a in assets if a.status == "failed")
        }

        # Pending approvals
        pending_approvals = []
        for a in assets:
            if a.status == "pending_approval":
                pending_approvals.append({
                    "id": a.id,
                    "type": "Content Asset",
                    "title": a.title,
                    "channel": a.channel,
                    "created_at": a.created_at.isoformat() if a.created_at else ""
                })
        for c in campaigns:
            if c.status == "PENDING_APPROVAL":
                pending_approvals.append({
                    "id": c.id,
                    "type": "Campaign Plan",
                    "title": c.name,
                    "channel": c.platform,
                    "budget_inr": c.budget,
                    "created_at": c.created_at.isoformat() if c.created_at else ""
                })

        # Recent automations
        executions = db.query(AutomationExecution).order_by(AutomationExecution.executed_at.desc()).limit(5).all()
        recent_automations = [
            {
                "id": e.id,
                "rule_name": e.rule_name,
                "status": e.status,
                "details": e.details,
                "executed_at": e.executed_at.isoformat() if e.executed_at else ""
            }
            for e in executions
        ]

        # Integration status
        integrations = IntegrationService.list_integrations(db)
        connected_count = sum(1 for i in integrations if i.status == "connected")
        unconfigured_count = sum(1 for i in integrations if i.status == "unconfigured")
        integration_health = {
            "total": len(integrations),
            "connected": connected_count,
            "unconfigured": unconfigured_count,
            "mode": "Simulated Sandbox (Zero Ad Spend)"
        }

        # Latest KPI summary & Next Best Action from latest WorkflowRun
        latest_kpi_summary = None
        next_best_action = None
        latest_wf = db.query(WorkflowRun).order_by(WorkflowRun.created_at.desc()).first()
        if latest_wf and latest_wf.state_snapshot:
            state = MarketingState.model_validate(latest_wf.state_snapshot)
            if state.analytics and state.analytics.campaign_rows:
                an = state.analytics
                latest_kpi_summary = {
                    "total_spend": an.total_spend,
                    "total_impressions": an.total_impressions,
                    "total_clicks": an.total_clicks,
                    "total_conversions": an.total_conversions,
                    "total_revenue": an.total_revenue,
                    "overall_ctr": an.overall_ctr,
                    "overall_cpc": an.overall_cpc,
                    "overall_cpa": an.overall_cpa,
                    "overall_roas": an.overall_roas,
                    "best_campaign": an.best_campaign
                }
            if state.next_best_action:
                next_best_action = state.next_best_action.model_dump()

        return {
            "brand_id": brand.id,
            "brand_name": brand.name,
            "brand_industry": brand.industry,
            "active_campaigns_count": active_campaigns,
            "total_campaigns_count": total_campaigns,
            "content_counts": content_counts,
            "pending_approvals": pending_approvals,
            "recent_automations": recent_automations,
            "integration_health": integration_health,
            "latest_kpi_summary": latest_kpi_summary,
            "metric_provenance": "SIMULATED SANDBOX DATA (Safe Local Demo Mode)",
            "next_best_action": next_best_action
        }
