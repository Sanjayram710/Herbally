from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.brand import BrandProfile
from app.models.campaign import Campaign
from app.models.content import ContentAsset
from app.models.workflow import WorkflowRun
from app.models.automation import AutomationExecution
from app.models.integration import IntegrationConfig
from app.models.media import MediaAsset
from app.models.video import VideoJob
from app.schemas.state import MarketingState
from app.services.brand_service import BrandService
from app.services.automation_service import AutomationService
from app.services.integration_service import IntegrationService


class DashboardService:
    @staticmethod
    def get_summary(db: Session, brand_id: str = "", workspace_id: str = "") -> Dict[str, Any]:
        brand = None
        if brand_id:
            brand = db.query(BrandProfile).filter(BrandProfile.id == brand_id).first()
        if not brand and workspace_id:
            brand = db.query(BrandProfile).filter(BrandProfile.workspace_id == workspace_id).first()
        if not brand:
            brand = BrandService.get_or_create_default_brand(db)

        # Campaign counts and pipeline stats
        campaigns_query = db.query(Campaign)
        if workspace_id:
            campaigns_query = campaigns_query.filter(Campaign.workspace_id == workspace_id)
        if brand and brand.id:
            campaigns_query = campaigns_query.filter(Campaign.brand_id == brand.id)
        campaigns: List[Campaign] = campaigns_query.all()

        total_campaigns = len(campaigns)
        active_campaigns = sum(1 for c in campaigns if str(c.status).lower() in ("approved", "ready_to_publish", "simulated_running", "completed"))

        campaign_pipeline = {
            "draft": sum(1 for c in campaigns if str(c.status).lower() == "draft"),
            "pending_review": sum(1 for c in campaigns if str(c.status).lower() == "pending_review"),
            "approved": sum(1 for c in campaigns if str(c.status).lower() == "approved"),
            "ready_to_publish": sum(1 for c in campaigns if str(c.status).lower() == "ready_to_publish"),
            "rejected": sum(1 for c in campaigns if str(c.status).lower() == "rejected"),
            "total_budget": sum(float(c.budget or 0) for c in campaigns),
            "currency": campaigns[0].currency if campaigns and campaigns[0].currency else "INR"
        }

        recent_campaigns = [
            {
                "id": c.id,
                "name": c.name,
                "status": c.status,
                "channels": c.channels or [],
                "budget": c.budget or 0,
                "currency": c.currency or "INR",
                "primary_kpi": c.primary_kpi or "ROAS",
                "created_at": c.created_at.isoformat() if c.created_at else ""
            }
            for c in sorted(campaigns, key=lambda x: x.created_at or "", reverse=True)[:4]
        ]

        # Creative Studio Assets Telemetry
        media_query = db.query(MediaAsset)
        if workspace_id:
            media_query = media_query.filter(MediaAsset.workspace_id == workspace_id)
        if brand and brand.id:
            media_query = media_query.filter(MediaAsset.brand_id == brand.id)
        media_assets: List[MediaAsset] = media_query.all()

        total_media = len(media_assets)
        image_media = sum(1 for m in media_assets if (m.asset_type or "").lower() == "image")
        video_media = sum(1 for m in media_assets if (m.asset_type or "").lower() == "video")

        # Video Generation Jobs
        video_jobs_query = db.query(VideoJob)
        if workspace_id:
            video_jobs_query = video_jobs_query.filter(VideoJob.workspace_id == workspace_id)
        if brand and brand.id:
            video_jobs_query = video_jobs_query.filter(VideoJob.brand_id == brand.id)
        video_jobs: List[VideoJob] = video_jobs_query.all()

        creative_studio_stats = {
            "total_media_assets": total_media,
            "image_assets": image_media,
            "video_assets": video_media,
            "video_jobs_total": len(video_jobs),
            "video_jobs_completed": sum(1 for v in video_jobs if v.status == "completed"),
            "video_jobs_processing": sum(1 for v in video_jobs if v.status in ("queued", "processing"))
        }

        recent_media = [
            {
                "id": m.id,
                "asset_type": m.asset_type or "image",
                "prompt": m.prompt or "Studio Media Creative",
                "media_url": m.media_url,
                "aspect_ratio": m.aspect_ratio or "1:1",
                "provider": m.provider or "Local Studio",
                "created_at": m.created_at.isoformat() if m.created_at else ""
            }
            for m in sorted(media_assets, key=lambda x: x.created_at or "", reverse=True)[:4]
        ]

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
            if str(c.status).lower() in ("pending_approval", "pending_review"):
                pending_approvals.append({
                    "id": c.id,
                    "type": "Campaign Plan",
                    "title": c.name,
                    "channel": c.platform or (c.channels[0] if c.channels else "Omnichannel"),
                    "budget_inr": c.budget,
                    "created_at": c.created_at.isoformat() if c.created_at else ""
                })

        # Recent automations
        executions = (
            db.query(AutomationExecution)
            .filter(AutomationExecution.workspace_id == workspace_id)
            .order_by(AutomationExecution.executed_at.desc())
            .limit(5)
            .all()
        )
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
        integrations = IntegrationService.list_integrations(db, workspace_id)
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
        latest_wf = (
            db.query(WorkflowRun)
            .filter(WorkflowRun.workspace_id == workspace_id)
            .order_by(WorkflowRun.created_at.desc())
            .first()
        )
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
            "brand_description": brand.description,
            "target_audience": brand.target_audience,
            "geographic_market": brand.geographic_market or "Global",
            "preferred_language": brand.preferred_language or "English",
            "budget_range": brand.budget_range or "Not specified",
            "active_campaigns_count": active_campaigns,
            "total_campaigns_count": total_campaigns,
            "campaign_pipeline": campaign_pipeline,
            "recent_campaigns": recent_campaigns,
            "creative_studio_stats": creative_studio_stats,
            "recent_media": recent_media,
            "content_counts": content_counts,
            "pending_approvals": pending_approvals,
            "recent_automations": recent_automations,
            "integration_health": integration_health,
            "latest_kpi_summary": latest_kpi_summary,
            "metric_provenance": "SIMULATED SANDBOX DATA (Safe Local Demo Mode)",
            "next_best_action": next_best_action
        }
