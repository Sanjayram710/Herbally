import uuid
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product, WorkflowRun, Recommendation, CampaignMetric, Campaign as CampaignModel
from app.schemas.product import ProductCreate, ProductRead, WorkflowTriggerRequest
from app.schemas.analytics import CampaignRowInput, CampaignDataUploadResponse
from app.schemas.state import MarketingState
from app.services.orchestrator import MarketingOrchestrator
from app.services.analytics_service import AnalyticsService
from app.services.optimization_service import OptimizationService
from app.services.report_service import ReportService

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
