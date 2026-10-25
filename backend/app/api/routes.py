import uuid
import json
import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product, WorkflowRun, Recommendation, CampaignMetric, Campaign as CampaignModel
from app.models.brand import BrandProfile
from app.models.content import ContentAsset, ContentSchedule
from app.models.integration import IntegrationConfig
from app.models.automation import AutomationRule, AutomationExecution
from app.models.assistant import AssistantMessage
from app.models.customer_message import CustomerMessage
from app.models.landing_page import LandingPageDraft

from app.schemas.product import ProductCreate, ProductRead, WorkflowTriggerRequest
from app.schemas.analytics import CampaignRowInput, CampaignDataUploadResponse
from app.schemas.state import MarketingState
from app.schemas.brand import BrandProfileCreate, BrandProfileRead, BrandProfileUpdate, WebsiteIngestRequest, WebsiteIngestResponse
from app.schemas.content import ContentAssetCreate, ContentAssetRead, ContentAssetUpdate, ContentScheduleCreate, ContentScheduleRead, ContentGenerateRequest
from app.schemas.integration import IntegrationRead, IntegrationTestRequest, IntegrationTestResponse
from app.schemas.automation import AutomationRuleRead, AutomationRuleToggle, AutomationExecutionRead
from app.schemas.assistant import AssistantMessageCreate, AssistantMessageRead, AssistantResponse
from app.schemas.dashboard import DashboardSummary

from app.services.orchestrator import MarketingOrchestrator
from app.services.analytics_service import AnalyticsService
from app.services.optimization_service import OptimizationService
from app.services.report_service import ReportService
from app.services.brand_service import BrandService
from app.services.content_service import ContentService
from app.services.assistant_service import AssistantService
from app.services.automation_service import AutomationService
from app.services.integration_service import IntegrationService
from app.services.dashboard_service import DashboardService
from app.services.customer_message_service import CustomerMessageService
from app.services.landing_page_service import LandingPageService

router = APIRouter()
orchestrator = MarketingOrchestrator()


# ==========================================
# 1. Products Endpoints
# ==========================================

@router.post("/products", response_model=ProductRead)
def create_product(product_in: ProductCreate, db: Session = Depends(get_db)):
    prod_id = product_in.id or f"prod-{uuid.uuid4().hex[:8]}"
    existing = db.query(Product).filter(Product.id == prod_id).first()
    if existing:
        return ProductRead(
            id=existing.id,
            name=existing.name,
            brand=existing.brand,
            category=existing.category,
            price_inr=existing.price_inr,
            description=existing.description,
            verified_features=existing.verified_features or [],
            explicitly_supported_benefits=existing.explicitly_supported_benefits or [],
            prohibited_medical_claims=existing.prohibited_medical_claims or [],
            official_url=existing.official_url
        )

    product = Product(
        id=prod_id,
        name=product_in.name,
        brand=product_in.brand,
        category=product_in.category,
        price_inr=product_in.price_inr,
        description=product_in.description,
        verified_features=product_in.verified_features,
        explicitly_supported_benefits=product_in.explicitly_supported_benefits,
        prohibited_medical_claims=product_in.prohibited_medical_claims,
        official_url=product_in.official_url
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return ProductRead(
        id=product.id,
        name=product.name,
        brand=product.brand,
        category=product.category,
        price_inr=product.price_inr,
        description=product.description,
        verified_features=product.verified_features or [],
        explicitly_supported_benefits=product.explicitly_supported_benefits or [],
        prohibited_medical_claims=product.prohibited_medical_claims or [],
        official_url=product.official_url
    )


@router.get("/products", response_model=List[ProductRead])
def list_products(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    return [
        ProductRead(
            id=p.id,
            name=p.name,
            brand=p.brand,
            category=p.category,
            price_inr=p.price_inr,
            description=p.description,
            verified_features=p.verified_features or [],
            explicitly_supported_benefits=p.explicitly_supported_benefits or [],
            prohibited_medical_claims=p.prohibited_medical_claims or [],
            official_url=p.official_url
        )
        for p in products
    ]


@router.get("/products/{product_id}", response_model=ProductRead)
def get_product(product_id: str, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductRead(
        id=p.id,
        name=p.name,
        brand=p.brand,
        category=p.category,
        price_inr=p.price_inr,
        description=p.description,
        verified_features=p.verified_features or [],
        explicitly_supported_benefits=p.explicitly_supported_benefits or [],
        prohibited_medical_claims=p.prohibited_medical_claims or [],
        official_url=p.official_url
    )


# ==========================================
# 2. Marketing Workflow Endpoints
# ==========================================

@router.post("/marketing/analyze", response_model=Dict[str, Any])
def run_marketing_analysis(req: WorkflowTriggerRequest, db: Session = Depends(get_db)):
    """Executes the synchronous marketing strategy workflow and saves state in SQLite."""
    workflow_id = f"wf-{uuid.uuid4().hex[:8]}"

    # Execute orchestrator flow
    state: MarketingState = orchestrator.run_strategy_workflow(req)

    # Save to database
    wf_record = WorkflowRun(
        id=workflow_id,
        product_id=req.product_id or "herbally-neem-bedsheet",
        brand=req.brand,
        marketing_goal=req.marketing_goal,
        budget=req.budget,
        market=req.market,
        status="completed",
        state_snapshot=state.model_dump(),
        sources=[s.model_dump() for s in state.sources],
        assumptions=[a.model_dump() for a in state.assumptions],
        errors=[e.model_dump() for e in state.errors]
    )
    db.add(wf_record)
    db.commit()

    return {
        "workflow_id": workflow_id,
        "status": "completed",
        "state": state.model_dump()
    }


@router.get("/marketing/workflow/{workflow_id}")
def get_workflow_state(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.query(WorkflowRun).filter(WorkflowRun.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow run not found")
    return {
        "workflow_id": wf.id,
        "status": wf.status,
        "state": wf.state_snapshot
    }


# ==========================================
# 3. Closed-Loop Campaign Lifecycle Endpoints
# ==========================================

@router.post("/campaigns/{campaign_id}/approve")
def approve_campaign(
    campaign_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Human approval action transitioning campaign to APPROVED status."""
    workflow_id = payload.get("workflow_id")
    if not workflow_id:
        raise HTTPException(status_code=400, detail="workflow_id is required")

    wf = db.query(WorkflowRun).filter(WorkflowRun.id == workflow_id).first()
    if not wf or not wf.state_snapshot:
        raise HTTPException(status_code=404, detail="Workflow run not found")

    state = MarketingState.model_validate(wf.state_snapshot)
    matched = False
    for c in state.campaign_plan:
        if c.id == campaign_id or campaign_id == "all":
            c.status = "APPROVED"
            matched = True

    if not matched:
        raise HTTPException(status_code=404, detail="Campaign not found in workflow")

    wf.state_snapshot = state.model_dump()
    db.commit()

    return {
        "workflow_id": workflow_id,
        "campaign_id": campaign_id,
        "status": "APPROVED",
        "state": state.model_dump()
    }


@router.post("/campaigns/{campaign_id}/status")
def update_campaign_status(
    campaign_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Updates campaign status e.g. DRAFT -> PENDING_APPROVAL, SIMULATED_RUNNING -> PAUSED."""
    workflow_id = payload.get("workflow_id")
    new_status = payload.get("status")
    if not workflow_id or not new_status:
        raise HTTPException(status_code=400, detail="workflow_id and status are required")

    wf = db.query(WorkflowRun).filter(WorkflowRun.id == workflow_id).first()
    if not wf or not wf.state_snapshot:
        raise HTTPException(status_code=404, detail="Workflow run not found")

    state = MarketingState.model_validate(wf.state_snapshot)
    updated_state = orchestrator.update_campaign_status(state, campaign_id, new_status)

    wf.state_snapshot = updated_state.model_dump()
    db.commit()

    return {
        "workflow_id": workflow_id,
        "campaign_id": campaign_id,
        "status": new_status,
        "state": updated_state.model_dump()
    }


@router.post("/campaigns/{campaign_id}/reset")
def reset_campaign_endpoint(
    campaign_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Resets campaign execution status back to DRAFT and clears simulated metrics."""
    workflow_id = payload.get("workflow_id")
    if not workflow_id:
        raise HTTPException(status_code=400, detail="workflow_id is required")

    wf = db.query(WorkflowRun).filter(WorkflowRun.id == workflow_id).first()
    if not wf or not wf.state_snapshot:
        raise HTTPException(status_code=404, detail="Workflow run not found")

    state = MarketingState.model_validate(wf.state_snapshot)
    updated_state = orchestrator.reset_campaign_run(state, campaign_id)

    wf.state_snapshot = updated_state.model_dump()
    db.commit()

    return {
        "workflow_id": workflow_id,
        "campaign_id": campaign_id,
        "status": "DRAFT",
        "message": "Campaign run reset successfully.",
        "state": updated_state.model_dump()
    }


@router.post("/campaigns/{campaign_id}/select")
def select_campaign_endpoint(
    campaign_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Selects an active campaign and re-scopes optimizations to it."""
    workflow_id = payload.get("workflow_id")
    if not workflow_id:
        raise HTTPException(status_code=400, detail="workflow_id is required")

    wf = db.query(WorkflowRun).filter(WorkflowRun.id == workflow_id).first()
    if not wf or not wf.state_snapshot:
        raise HTTPException(status_code=404, detail="Workflow run not found")

    state = MarketingState.model_validate(wf.state_snapshot)
    updated_state = orchestrator.select_campaign(state, campaign_id)

    wf.state_snapshot = updated_state.model_dump()
    db.commit()

    return {
        "workflow_id": workflow_id,
        "selected_campaign_id": campaign_id,
        "state": updated_state.model_dump()
    }


@router.post("/campaigns/{campaign_id}/revise")
def revise_campaign_endpoint(
    campaign_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Generates a revised campaign derived from the specified source campaign."""
    workflow_id = payload.get("workflow_id")
    recommendation_id = payload.get("recommendation_id")
    if not workflow_id:
        raise HTTPException(status_code=400, detail="workflow_id is required")

    wf = db.query(WorkflowRun).filter(WorkflowRun.id == workflow_id).first()
    if not wf or not wf.state_snapshot:
        raise HTTPException(status_code=404, detail="Workflow run not found")

    state = MarketingState.model_validate(wf.state_snapshot)
    updated_state = orchestrator.revise_campaign(state, campaign_id, recommendation_id=recommendation_id)

    wf.state_snapshot = updated_state.model_dump()
    db.commit()

    return {
        "workflow_id": workflow_id,
        "source_campaign_id": campaign_id,
        "current_iteration": updated_state.current_iteration,
        "state": updated_state.model_dump()
    }


@router.post("/campaigns/create")
def create_campaign_endpoint(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Creates and appends a new campaign from user-selected assets."""
    from app.schemas.state import CampaignPlanItem

    workflow_id = payload.get("workflow_id")
    campaign_data = payload.get("campaign")
    if not workflow_id or not campaign_data:
        raise HTTPException(status_code=400, detail="workflow_id and campaign data are required")

    wf = db.query(WorkflowRun).filter(WorkflowRun.id == workflow_id).first()
    if not wf or not wf.state_snapshot:
        raise HTTPException(status_code=404, detail="Workflow run not found")

    state = MarketingState.model_validate(wf.state_snapshot)

    camp_id = campaign_data.get("id") or f"CAMP-{len(state.campaign_plan)+1:03d}"
    new_campaign = CampaignPlanItem(
        id=camp_id,
        campaign_name=campaign_data.get("campaign_name", f"Campaign {camp_id}"),
        platform=campaign_data.get("platform", "Instagram"),
        objective=campaign_data.get("objective", "Conversions (Sales)"),
        target_audience=campaign_data.get("target_audience", "Wellness Seekers"),
        creative_type=campaign_data.get("creative_type", "Selected Asset Creative"),
        messaging=campaign_data.get("messaging", "Experience 100% organic Neem sleep comfort."),
        call_to_action=campaign_data.get("call_to_action", "Shop Now"),
        budget_inr=float(campaign_data.get("budget_inr", 10000.0)),
        duration_days=int(campaign_data.get("duration_days", state.duration_days)),
        status="DRAFT",
        iteration_number=state.current_iteration,
        linked_assets=campaign_data.get("linked_assets", {}),
        kpi_targets=campaign_data.get("kpi_targets", {})
    )

    state.campaign_plan.append(new_campaign)
    state.selected_campaign_id = new_campaign.id

    wf.state_snapshot = state.model_dump()
    db.commit()

    return {
        "workflow_id": workflow_id,
        "campaign_id": camp_id,
        "state": state.model_dump()
    }


@router.post("/campaigns/launch")
def launch_simulated_campaign(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Launches APPROVED campaign(s) in the Simulated Sandbox:
    Transitions status: APPROVED -> SIMULATED_RUNNING -> COMPLETED.
    Generates simulated metrics, runs deterministic analytics and optimization.
    """
    workflow_id = payload.get("workflow_id")
    campaign_id = payload.get("campaign_id")

    if not workflow_id:
        raise HTTPException(status_code=400, detail="workflow_id is required")

    wf = db.query(WorkflowRun).filter(WorkflowRun.id == workflow_id).first()
    if not wf or not wf.state_snapshot:
        raise HTTPException(status_code=404, detail="Workflow run not found")

    state = MarketingState.model_validate(wf.state_snapshot)
    updated_state = orchestrator.launch_simulated_execution(state, campaign_id=campaign_id)

    wf.state_snapshot = updated_state.model_dump()
    db.commit()

    return {
        "workflow_id": workflow_id,
        "status": "COMPLETED",
        "message": "Campaign successfully executed in Simulated Sandbox.",
        "state": updated_state.model_dump()
    }


@router.post("/campaigns/iterate")
def create_next_campaign_iteration(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Closed-Loop Engine:
    Uses the Next Best Action findings to generate Campaign Iteration #N+1.
    Appends the iterated campaign in PENDING_APPROVAL status.
    """
    workflow_id = payload.get("workflow_id")
    if not workflow_id:
        raise HTTPException(status_code=400, detail="workflow_id is required")

    wf = db.query(WorkflowRun).filter(WorkflowRun.id == workflow_id).first()
    if not wf or not wf.state_snapshot:
        raise HTTPException(status_code=404, detail="Workflow run not found")

    state = MarketingState.model_validate(wf.state_snapshot)
    updated_state = orchestrator.create_next_campaign_iteration(state)

    wf.state_snapshot = updated_state.model_dump()
    db.commit()

    return {
        "workflow_id": workflow_id,
        "current_iteration": updated_state.current_iteration,
        "message": f"Successfully generated Campaign Iteration {updated_state.current_iteration}.",
        "state": updated_state.model_dump()
    }


# ==========================================
# 4. Analytics & CSV Upload Endpoints
# ==========================================

@router.post("/analytics/upload", response_model=Dict[str, Any])
async def upload_campaign_csv(
    file: UploadFile = File(...),
    workflow_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Safely validates and parses uploaded CSV, calculates metrics,
    and updates the associated workflow with analytics and optimization recommendations.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="File size exceeds safe limit (5MB).")

    try:
        raw_rows, msg = AnalyticsService.parse_csv(content)
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))

    # Calculate metrics
    analytics_output = AnalyticsService.process_campaign_metrics(raw_rows)
    recommendations, next_best_action = OptimizationService.generate_optimizations(analytics_output)

    # Persist metrics in DB
    for row in analytics_output.campaign_rows:
        metric_rec = CampaignMetric(
            id=f"metric-{uuid.uuid4().hex[:8]}",
            campaign_id=row.campaign_id,
            campaign_name=row.campaign_name,
            platform=row.platform,
            creative_variant=row.creative_variant,
            spend=row.spend,
            impressions=row.impressions,
            clicks=row.clicks,
            conversions=row.conversions,
            revenue=row.revenue,
            ctr=row.ctr,
            cpc=row.cpc,
            conv_rate=row.conv_rate,
            cpa=row.cpa,
            roas=row.roas,
            is_simulated="SIMULATED DATA"
        )
        db.add(metric_rec)

    # If associated with a workflow, update state snapshot
    updated_state = None
    if workflow_id:
        wf = db.query(WorkflowRun).filter(WorkflowRun.id == workflow_id).first()
        if wf and wf.state_snapshot:
            current_state = MarketingState.model_validate(wf.state_snapshot)
            orchestrator.attach_campaign_metrics_and_optimize(current_state, raw_rows)
            wf.state_snapshot = current_state.model_dump()
            db.commit()
            updated_state = current_state.model_dump()
    else:
        db.commit()

    return {
        "filename": file.filename,
        "rows_parsed": len(raw_rows),
        "message": msg,
        "analytics": analytics_output.model_dump(),
        "recommendations": [r.model_dump() for r in recommendations],
        "next_best_action": next_best_action.model_dump() if next_best_action else None,
        "updated_state": updated_state
    }


# ==========================================
# 5. Reports Endpoints
# ==========================================

@router.get("/reports/{workflow_id}/markdown")
def get_markdown_report(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.query(WorkflowRun).filter(WorkflowRun.id == workflow_id).first()
    if not wf or not wf.state_snapshot:
        raise HTTPException(status_code=404, detail="Workflow run not found")

    state = MarketingState.model_validate(wf.state_snapshot)
    report_md = ReportService.generate_markdown_report(state)
    return Response(content=report_md, media_type="text/markdown")


@router.get("/reports/{workflow_id}/json")
def get_json_report(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.query(WorkflowRun).filter(WorkflowRun.id == workflow_id).first()
    if not wf or not wf.state_snapshot:
        raise HTTPException(status_code=404, detail="Workflow run not found")

    return wf.state_snapshot


# ==========================================
# 6. Executive Dashboard Endpoints
# ==========================================

@router.get("/dashboard/summary")
def get_dashboard_summary(brand_id: str = "herbally-brand", db: Session = Depends(get_db)):
    return DashboardService.get_summary(db, brand_id=brand_id)


# ==========================================
# 7. Brand Intelligence & Onboarding Endpoints
# ==========================================

@router.get("/brands", response_model=List[BrandProfileRead])
def list_brands_endpoint(db: Session = Depends(get_db)):
    return BrandService.list_brands(db)


@router.get("/brands/{brand_id}", response_model=BrandProfileRead)
def get_brand_endpoint(brand_id: str, db: Session = Depends(get_db)):
    brand = BrandService.get_brand(db, brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand profile not found")
    return brand


@router.post("/brands", response_model=BrandProfileRead)
def create_brand_endpoint(data: BrandProfileCreate, db: Session = Depends(get_db)):
    return BrandService.create_brand(db, data)


@router.put("/brands/{brand_id}", response_model=BrandProfileRead)
def update_brand_endpoint(brand_id: str, data: BrandProfileUpdate, db: Session = Depends(get_db)):
    updated = BrandService.update_brand(db, brand_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Brand profile not found")
    return updated


@router.post("/brands/ingest-website", response_model=WebsiteIngestResponse)
def ingest_website_endpoint(req: WebsiteIngestRequest):
    """Safely extracts website metadata and context with SSRF protection."""
    try:
        return BrandService.ingest_website(req.url)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch website context: {str(e)}")


# ==========================================
# 8. AI Content Studio & Calendar Endpoints
# ==========================================

@router.get("/content/assets", response_model=List[ContentAssetRead])
def list_content_assets_endpoint(
    brand_id: Optional[str] = None,
    channel: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return ContentService.list_assets(db, brand_id=brand_id, channel=channel)


@router.post("/content/assets", response_model=ContentAssetRead)
def create_content_asset_endpoint(data: ContentAssetCreate, db: Session = Depends(get_db)):
    return ContentService.create_asset(db, data)


@router.post("/content/generate", response_model=List[ContentAssetRead])
def generate_content_endpoint(req: ContentGenerateRequest, db: Session = Depends(get_db)):
    return ContentService.generate_content_assets(db, req)


@router.get("/content/assets/{asset_id}", response_model=ContentAssetRead)
def get_content_asset_endpoint(asset_id: str, db: Session = Depends(get_db)):
    asset = ContentService.get_asset(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Content asset not found")
    return asset


@router.put("/content/assets/{asset_id}", response_model=ContentAssetRead)
def update_content_asset_endpoint(asset_id: str, data: ContentAssetUpdate, db: Session = Depends(get_db)):
    asset = ContentService.update_asset(db, asset_id, data)
    if not asset:
        raise HTTPException(status_code=404, detail="Content asset not found")
    return asset


@router.post("/content/assets/{asset_id}/duplicate", response_model=ContentAssetRead)
def duplicate_content_asset_endpoint(asset_id: str, db: Session = Depends(get_db)):
    dupe = ContentService.duplicate_asset(db, asset_id)
    if not dupe:
        raise HTTPException(status_code=404, detail="Content asset not found")
    return dupe


@router.delete("/content/assets/{asset_id}")
def delete_content_asset_endpoint(asset_id: str, db: Session = Depends(get_db)):
    success = ContentService.delete_asset(db, asset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Content asset not found")
    return {"message": "Content asset deleted successfully", "asset_id": asset_id}


@router.post("/content/assets/{asset_id}/schedule", response_model=ContentScheduleRead)
def schedule_content_asset_endpoint(
    asset_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    channel = payload.get("channel", "Instagram")
    scheduled_time = payload.get("scheduled_time", datetime.datetime.utcnow().isoformat())
    try:
        return ContentService.schedule_asset(db, asset_id, channel, scheduled_time)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.get("/content/schedules", response_model=List[ContentScheduleRead])
def list_content_schedules_endpoint(db: Session = Depends(get_db)):
    return ContentService.list_schedules(db)


@router.post("/content/schedules/{schedule_id}/publish-demo", response_model=ContentScheduleRead)
def trigger_publish_demo_endpoint(schedule_id: str, db: Session = Depends(get_db)):
    """Executes safe demo sandbox publishing transition."""
    try:
        return ContentService.trigger_scheduled_publish_demo(db, schedule_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


# ==========================================
# 9. Campaign Manager List Endpoint
# ==========================================

@router.get("/campaigns")
def list_all_campaigns(db: Session = Depends(get_db)):
    camps = db.query(CampaignModel).all()
    # If no standalone campaigns saved yet, check latest workflow
    if not camps:
        latest_wf = db.query(WorkflowRun).order_by(WorkflowRun.created_at.desc()).first()
        if latest_wf and latest_wf.state_snapshot and "campaign_plan" in latest_wf.state_snapshot:
            return latest_wf.state_snapshot["campaign_plan"]
    return [
        {
            "id": c.id,
            "campaign_name": c.name,
            "platform": c.platform,
            "objective": c.objective,
            "target_audience": c.target_audience,
            "budget_inr": c.budget,
            "duration_days": c.duration_days,
            "status": c.status,
            "iteration_number": c.iteration_number,
            "linked_assets": c.linked_assets,
            "created_at": c.created_at.isoformat() if c.created_at else ""
        }
        for c in camps
    ]


# ==========================================
# 10. AI Marketing Assistant Endpoints
# ==========================================

@router.post("/assistant/chat")
def assistant_chat_endpoint(
    payload: AssistantMessageCreate,
    db: Session = Depends(get_db)
):
    return AssistantService.process_message(db, payload.brand_id, payload.content)


@router.get("/assistant/history")
def assistant_history_endpoint(
    brand_id: str = "herbally-brand",
    db: Session = Depends(get_db)
):
    history = AssistantService.list_history(db, brand_id=brand_id)
    return [
        {
            "id": m.id,
            "brand_id": m.brand_id,
            "role": m.role,
            "content": m.content,
            "tool_called": m.tool_called,
            "tool_result": m.tool_result,
            "created_at": m.created_at.isoformat() if m.created_at else ""
        }
        for m in history
    ]


# ==========================================
# 11. Automation Center Endpoints
# ==========================================

@router.get("/automations/rules", response_model=List[AutomationRuleRead])
def list_automation_rules_endpoint(db: Session = Depends(get_db)):
    return AutomationService.list_rules(db)


@router.post("/automations/rules/{rule_id}/toggle", response_model=AutomationRuleRead)
def toggle_automation_rule_endpoint(
    rule_id: str,
    payload: AutomationRuleToggle,
    db: Session = Depends(get_db)
):
    rule = AutomationService.toggle_rule(db, rule_id, payload.is_enabled)
    if not rule:
        raise HTTPException(status_code=404, detail="Automation rule not found")
    return rule


@router.post("/automations/rules/{rule_id}/run", response_model=AutomationExecutionRead)
def run_automation_rule_endpoint(rule_id: str, db: Session = Depends(get_db)):
    try:
        return AutomationService.run_rule(db, rule_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.get("/automations/executions", response_model=List[AutomationExecutionRead])
def list_automation_executions_endpoint(db: Session = Depends(get_db)):
    return AutomationService.list_executions(db)


# ==========================================
# 12. Integrations Endpoints
# ==========================================

@router.get("/integrations", response_model=List[IntegrationRead])
def list_integrations_endpoint(db: Session = Depends(get_db)):
    return IntegrationService.list_integrations(db)


@router.post("/integrations/test", response_model=IntegrationTestResponse)
def test_integration_endpoint(payload: IntegrationTestRequest, db: Session = Depends(get_db)):
    try:
        res = IntegrationService.test_connection(db, payload.integration_id)
        return IntegrationTestResponse(**res)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


# ==========================================
# 13. Customer Messages & Reputation Endpoints
# ==========================================

@router.get("/customer-messages")
def list_customer_messages_endpoint(db: Session = Depends(get_db)):
    msgs = CustomerMessageService.list_messages(db)
    return [
        {
            "id": m.id,
            "brand_id": m.brand_id,
            "channel": m.channel,
            "customer_name": m.customer_name,
            "message_text": m.message_text,
            "draft_reply": m.draft_reply,
            "status": m.status,
            "is_simulated": m.is_simulated,
            "created_at": m.created_at.isoformat() if m.created_at else ""
        }
        for m in msgs
    ]


@router.put("/customer-messages/{message_id}")
def update_customer_message_draft(
    message_id: str,
    payload: Dict[str, str] = Body(...),
    db: Session = Depends(get_db)
):
    new_reply = payload.get("draft_reply", "")
    msg = CustomerMessageService.update_draft(db, message_id, new_reply)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message_id": msg.id, "status": msg.status, "draft_reply": msg.draft_reply}


@router.post("/customer-messages/{message_id}/approve-send")
def approve_and_send_customer_message(message_id: str, db: Session = Depends(get_db)):
    msg = CustomerMessageService.approve_and_send_demo(db, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message_id": msg.id, "status": msg.status, "message": "Reply approved and simulated send recorded."}


# ==========================================
# 14. Landing Page Draft Endpoints
# ==========================================

@router.get("/landing-page")
def get_landing_page_endpoint(brand_id: str = "herbally-brand", db: Session = Depends(get_db)):
    draft = LandingPageService.get_or_create_draft(db, brand_id)
    return {
        "id": draft.id,
        "brand_id": draft.brand_id,
        "title": draft.title,
        "hero_headline": draft.hero_headline,
        "hero_subheadline": draft.hero_subheadline,
        "value_props": draft.value_props,
        "call_to_action": draft.call_to_action,
        "seo_title": draft.seo_title,
        "seo_description": draft.seo_description,
        "status": draft.status
    }


@router.put("/landing-page")
def update_landing_page_endpoint(
    payload: Dict[str, Any] = Body(...),
    brand_id: str = "herbally-brand",
    db: Session = Depends(get_db)
):
    updated = LandingPageService.update_draft(db, brand_id, payload)
    return {
        "id": updated.id,
        "brand_id": updated.brand_id,
        "title": updated.title,
        "hero_headline": updated.hero_headline,
        "hero_subheadline": updated.hero_subheadline,
        "value_props": updated.value_props,
        "call_to_action": updated.call_to_action,
        "seo_title": updated.seo_title,
        "seo_description": updated.seo_description,
        "status": updated.status
    }

