import uuid
import json
import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, Response, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product, WorkflowRun, Recommendation, CampaignMetric, Campaign as CampaignModel, CampaignApprovalHistory
from app.models.brand import BrandProfile
from app.models.content import ContentAsset, ContentSchedule
from app.models.integration import IntegrationConfig
from app.models.automation import AutomationRule, AutomationExecution
from app.models.assistant import AssistantMessage
from app.models.customer_message import CustomerMessage
from app.models.landing_page import LandingPageDraft
from app.models.media import MediaAsset

from app.schemas.product import ProductCreate, ProductRead, ProductUpdate, WorkflowTriggerRequest
from app.schemas.analytics import CampaignRowInput, CampaignDataUploadResponse
from app.schemas.state import MarketingState
from app.schemas.brand import BrandProfileCreate, BrandProfileRead, BrandProfileUpdate, WebsiteIngestRequest, WebsiteIngestResponse
from app.schemas.content import ContentAssetCreate, ContentAssetRead, ContentAssetUpdate, ContentScheduleCreate, ContentScheduleRead, ContentGenerateRequest
from app.schemas.integration import IntegrationRead, IntegrationTestRequest, IntegrationTestResponse
from app.schemas.automation import AutomationRuleCreate, AutomationRuleRead, AutomationRuleToggle, AutomationRuleUpdate, AutomationExecutionRead
from app.schemas.assistant import AssistantMessageCreate, AssistantMessageRead, AssistantResponse
from app.schemas.dashboard import DashboardSummary
from app.schemas.media import (
    CampaignMediaAttachRequest,
    ImageGenerationRequest,
    MediaAssetRead,
    MediaGenerationResponse,
    ProviderInfoRead,
    StudioGenerateRequest,
    StudioGenerateResponse,
    MediaDeleteResponse,
)
from app.schemas.onboarding import UniversalOnboardingRequest, UniversalOnboardingResponse, OnboardingStatusResponse
from app.schemas.video import VideoJobCreateRequest, VideoJobRead, VideoProviderInfoRead
from app.schemas.campaign import (
    CampaignCreateRequest,
    CampaignUpdateRequest,
    CampaignApprovalActionRequest,
    CampaignApprovalHistoryRead,
    CampaignContentCreateRequest,
    CampaignContentUpdateRequest,
    CampaignContentVariantRequest,
    CampaignAssetAttachRequest,
    CampaignStrategyGenerateRequest,
    CampaignContentRead,
    CampaignCalendarEntryRead,
    CampaignRead,
)
from app.services.image_providers import provider_registry
from app.services.video_providers import video_provider_registry
from app.services.video_service import VideoService
from app.services.campaign_service import CampaignService, CampaignStateError

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
from app.services.onboarding_service import OnboardingService
from app.services.guardrails import GuardrailsService
from app.services.media_service import (
    MediaProviderNotConfiguredError,
    MediaProviderRequestError,
    MediaService,
    MediaValidationError,
)
from app.services.authorization_service import AuthorizationService, Principal, get_current_principal
from app.services.rate_limit_service import RateLimitService
from app.config import settings

# Every API endpoint requires a bearer token. Resource-level checks below then
# enforce the configured user's workspace boundary without leaking foreign IDs.
router = APIRouter(dependencies=[Depends(get_current_principal)])
orchestrator = MarketingOrchestrator()


# ==========================================
# Helpers
# ==========================================

def _resolve_workspace_brand(
    db: Session,
    principal: Principal,
    brand_id: Optional[str] = None
) -> BrandProfile:
    if brand_id:
        return AuthorizationService.owned_brand(db, principal, brand_id)
    brand = (
        db.query(BrandProfile)
        .filter(BrandProfile.workspace_id == principal.workspace_id)
        .order_by(BrandProfile.created_at.asc())
        .first()
    )
    if not brand:
        brand = BrandService.get_or_create_default_brand(db, workspace_id=principal.workspace_id)
    return brand


# ==========================================
# 0. Universal Business Onboarding Endpoints
# ==========================================

@router.post("/onboarding", response_model=UniversalOnboardingResponse)
def submit_onboarding_endpoint(
    payload: UniversalOnboardingRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    try:
        return OnboardingService.process_onboarding(db, principal.workspace_id, payload)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.get("/onboarding/status", response_model=OnboardingStatusResponse)
def get_onboarding_status_endpoint(
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return OnboardingService.get_status(db, principal.workspace_id)


# ==========================================
# 1. Products Endpoints
# ==========================================

@router.post("/products", response_model=ProductRead)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    prod_id = product_in.id or f"prod-{uuid.uuid4().hex[:8]}"
    existing = (
        db.query(Product)
        .filter(Product.id == prod_id, Product.workspace_id == principal.workspace_id)
        .first()
    )
    if existing:
        return ProductRead(
            id=existing.id,
            workspace_id=existing.workspace_id,
            brand_id=existing.brand_id,
            name=existing.name,
            brand=existing.brand,
            category=existing.category,
            price_inr=existing.price_inr,
            description=existing.description,
            verified_features=existing.verified_features or [],
            explicitly_supported_benefits=existing.explicitly_supported_benefits or [],
            prohibited_medical_claims=existing.prohibited_medical_claims or [],
            official_url=existing.official_url,
            image_url=existing.image_url,
        )

    # Claim guardrails check on description
    is_safe, violations = GuardrailsService.validate_claims(product_in.description)
    if not is_safe:
        raise HTTPException(
            status_code=400,
            detail=f"Product description contains prohibited medical assertions: {', '.join(violations)}"
        )

    brand = None
    if product_in.brand_id:
        brand = AuthorizationService.owned_brand(db, principal, product_in.brand_id)
    elif product_in.brand:
        brand = (
            db.query(BrandProfile)
            .filter(BrandProfile.workspace_id == principal.workspace_id, BrandProfile.name == product_in.brand)
            .first()
        )
    if not brand:
        brand = _resolve_workspace_brand(db, principal)

    product = Product(
        id=prod_id,
        workspace_id=principal.workspace_id,
        brand_id=brand.id,
        name=product_in.name,
        brand=product_in.brand or brand.name,
        category=product_in.category or brand.industry,
        price_inr=product_in.price_inr,
        description=product_in.description,
        verified_features=product_in.verified_features or [],
        explicitly_supported_benefits=product_in.explicitly_supported_benefits or [],
        prohibited_medical_claims=product_in.prohibited_medical_claims or [],
        official_url=product_in.official_url,
        image_url=product_in.image_url,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return ProductRead(
        id=product.id,
        workspace_id=product.workspace_id,
        brand_id=product.brand_id,
        name=product.name,
        brand=product.brand,
        category=product.category,
        price_inr=product.price_inr,
        description=product.description,
        verified_features=product.verified_features or [],
        explicitly_supported_benefits=product.explicitly_supported_benefits or [],
        prohibited_medical_claims=product.prohibited_medical_claims or [],
        official_url=product.official_url,
        image_url=product.image_url,
    )


@router.get("/products", response_model=List[ProductRead])
def list_products(
    brand_id: Optional[str] = None,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    query = db.query(Product).filter(Product.workspace_id == principal.workspace_id)
    if brand_id:
        query = query.filter(Product.brand_id == brand_id)
    products = query.order_by(Product.created_at.asc()).all()
    return [
        ProductRead(
            id=p.id,
            workspace_id=p.workspace_id,
            brand_id=p.brand_id,
            name=p.name,
            brand=p.brand,
            category=p.category,
            price_inr=p.price_inr,
            description=p.description,
            verified_features=p.verified_features or [],
            explicitly_supported_benefits=p.explicitly_supported_benefits or [],
            prohibited_medical_claims=p.prohibited_medical_claims or [],
            official_url=p.official_url,
            image_url=p.image_url,
        )
        for p in products
    ]


@router.get("/products/{product_id}", response_model=ProductRead)
def get_product(
    product_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    p = AuthorizationService.owned_product(db, principal, product_id)
    return ProductRead(
        id=p.id,
        workspace_id=p.workspace_id,
        brand_id=p.brand_id,
        name=p.name,
        brand=p.brand,
        category=p.category,
        price_inr=p.price_inr,
        description=p.description,
        verified_features=p.verified_features or [],
        explicitly_supported_benefits=p.explicitly_supported_benefits or [],
        prohibited_medical_claims=p.prohibited_medical_claims or [],
        official_url=p.official_url,
        image_url=p.image_url,
    )


@router.put("/products/{product_id}", response_model=ProductRead)
def update_product_endpoint(
    product_id: str,
    update_in: ProductUpdate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    p = AuthorizationService.owned_product(db, principal, product_id)
    update_dict = update_in.model_dump(exclude_unset=True)
    if "description" in update_dict and update_dict["description"]:
        is_safe, violations = GuardrailsService.validate_claims(update_dict["description"])
        if not is_safe:
            raise HTTPException(
                status_code=400,
                detail=f"Product description contains prohibited medical assertions: {', '.join(violations)}"
            )
    if "brand_id" in update_dict and update_dict["brand_id"]:
        AuthorizationService.owned_brand(db, principal, update_dict["brand_id"])

    for key, value in update_dict.items():
        setattr(p, key, value)
    db.commit()
    db.refresh(p)
    return ProductRead(
        id=p.id,
        workspace_id=p.workspace_id,
        brand_id=p.brand_id,
        name=p.name,
        brand=p.brand,
        category=p.category,
        price_inr=p.price_inr,
        description=p.description,
        verified_features=p.verified_features or [],
        explicitly_supported_benefits=p.explicitly_supported_benefits or [],
        prohibited_medical_claims=p.prohibited_medical_claims or [],
        official_url=p.official_url,
        image_url=p.image_url,
    )


@router.delete("/products/{product_id}")
def delete_product_endpoint(
    product_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    p = AuthorizationService.owned_product(db, principal, product_id)
    db.delete(p)
    db.commit()
    return {"message": "Product deleted successfully", "id": product_id}


@router.post("/products/{product_id}/image", response_model=ProductRead)
def upload_product_image_endpoint(
    product_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    p = AuthorizationService.owned_product(db, principal, product_id)
    try:
        image_bytes = file.file.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Unable to read uploaded file") from exc

    try:
        media = MediaService.save_product_image(
            db,
            product_id=p.id,
            workspace_id=principal.workspace_id,
            image_bytes=image_bytes,
            original_filename=file.filename or "product.jpg",
        )
    except MediaValidationError as mve:
        raise HTTPException(status_code=400, detail=str(mve))
    except MediaProviderRequestError as mpre:
        raise HTTPException(status_code=500, detail=str(mpre))

    p.image_url = media.media_url
    db.commit()
    db.refresh(p)
    return ProductRead(
        id=p.id,
        workspace_id=p.workspace_id,
        brand_id=p.brand_id,
        name=p.name,
        brand=p.brand,
        category=p.category,
        price_inr=p.price_inr,
        description=p.description,
        verified_features=p.verified_features or [],
        explicitly_supported_benefits=p.explicitly_supported_benefits or [],
        prohibited_medical_claims=p.prohibited_medical_claims or [],
        official_url=p.official_url,
        image_url=p.image_url,
    )



# ==========================================
# 2. Marketing Workflow Endpoints
# ==========================================

@router.post("/marketing/analyze", response_model=Dict[str, Any])
def run_marketing_analysis(
    req: WorkflowTriggerRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Executes the synchronous marketing strategy workflow and saves state in SQLite."""
    workflow_id = f"wf-{uuid.uuid4().hex[:8]}"

    # Execute orchestrator flow
    state: MarketingState = orchestrator.run_strategy_workflow(req)

    # Resolve product_id dynamically for workspace
    resolved_product_id = req.product_id
    if resolved_product_id:
        AuthorizationService.owned_product(db, principal, resolved_product_id)
    else:
        first_prod = db.query(Product).filter(Product.workspace_id == principal.workspace_id).first()
        if first_prod:
            resolved_product_id = first_prod.id
        elif principal.workspace_id == "workspace-default":
            resolved_product_id = "herbally-neem-bedsheet"
        else:
            resolved_product_id = None

    # Save to database
    wf_record = WorkflowRun(
        id=workflow_id,
        workspace_id=principal.workspace_id,
        product_id=resolved_product_id,
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
def get_workflow_state(
    workflow_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    wf = AuthorizationService.owned_workflow(db, principal, workflow_id)
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
    payload: Dict[str, Any] = Body(default={}),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Human approval action transitioning campaign to APPROVED status."""
    workflow_id = payload.get("workflow_id")
    comment = payload.get("comment")

    if workflow_id:
        wf = AuthorizationService.owned_workflow(db, principal, workflow_id)
        if not wf.state_snapshot:
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

        # If a durable campaign row exists, sync its status as well
        db_camp = (
            db.query(CampaignModel)
            .filter(CampaignModel.id == campaign_id, CampaignModel.workspace_id == principal.workspace_id)
            .first()
        )
        if db_camp:
            try:
                CampaignService.approve_campaign(db, principal, campaign_id, comment=comment)
            except Exception:
                pass

        return {
            "workflow_id": workflow_id,
            "campaign_id": campaign_id,
            "status": "APPROVED",
            "state": state.model_dump(),
        }

    # Durable Milestone 4 campaign approval
    try:
        camp = CampaignService.approve_campaign(db, principal, campaign_id, comment=comment)
        return _serialize_campaign(db, camp)
    except CampaignStateError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except MediaValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/campaigns/{campaign_id}/status")
def update_campaign_status(
    campaign_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Updates campaign status e.g. DRAFT -> PENDING_APPROVAL, SIMULATED_RUNNING -> PAUSED."""
    workflow_id = payload.get("workflow_id")
    new_status = payload.get("status")
    if not workflow_id or not new_status:
        raise HTTPException(status_code=400, detail="workflow_id and status are required")

    wf = AuthorizationService.owned_workflow(db, principal, workflow_id)
    if not wf.state_snapshot:
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
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Resets campaign execution status back to DRAFT and clears simulated metrics."""
    workflow_id = payload.get("workflow_id")
    if not workflow_id:
        raise HTTPException(status_code=400, detail="workflow_id is required")

    wf = AuthorizationService.owned_workflow(db, principal, workflow_id)
    if not wf.state_snapshot:
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
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Selects an active campaign and re-scopes optimizations to it."""
    workflow_id = payload.get("workflow_id")
    if not workflow_id:
        raise HTTPException(status_code=400, detail="workflow_id is required")

    wf = AuthorizationService.owned_workflow(db, principal, workflow_id)
    if not wf.state_snapshot:
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
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Generates a revised campaign derived from the specified source campaign."""
    workflow_id = payload.get("workflow_id")
    recommendation_id = payload.get("recommendation_id")
    if not workflow_id:
        raise HTTPException(status_code=400, detail="workflow_id is required")

    wf = AuthorizationService.owned_workflow(db, principal, workflow_id)
    if not wf.state_snapshot:
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
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Creates and appends a new campaign from user-selected assets."""
    from app.schemas.state import CampaignPlanItem

    workflow_id = payload.get("workflow_id")
    campaign_data = payload.get("campaign")
    if not workflow_id or not campaign_data:
        raise HTTPException(status_code=400, detail="workflow_id and campaign data are required")

    wf = AuthorizationService.owned_workflow(db, principal, workflow_id)
    if not wf.state_snapshot:
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


@router.post("/workflows/{workflow_id}/campaigns/{campaign_id}/media")
def attach_media_to_workflow_campaign_endpoint(
    workflow_id: str,
    campaign_id: str,
    payload: CampaignMediaAttachRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Attach a stored generated image without replacing other campaign assets."""
    media = AuthorizationService.owned_media_asset(db, principal, payload.media_asset_id)

    workflow = AuthorizationService.owned_workflow(db, principal, workflow_id)
    if not workflow.state_snapshot:
        raise HTTPException(status_code=404, detail="Workflow run not found")

    state = MarketingState.model_validate(workflow.state_snapshot)
    campaign = next((item for item in state.campaign_plan if item.id == campaign_id), None)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found in this workflow")

    linked_assets = dict(campaign.linked_assets or {})
    media_ids = list(linked_assets.get("media_asset_ids", []))
    if media.id not in media_ids:
        media_ids.append(media.id)
    linked_assets["media_asset_ids"] = media_ids
    linked_assets["latest_generated_media_url"] = media.media_url
    campaign.linked_assets = linked_assets
    media.campaign_id = campaign_id
    workflow.state_snapshot = state.model_dump()
    db.commit()

    return {
        "workflow_id": workflow_id,
        "campaign_id": campaign_id,
        "media_asset_id": media.id,
        "state": state.model_dump(),
    }


@router.post("/campaigns/launch")
def launch_simulated_campaign(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
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

    wf = AuthorizationService.owned_workflow(db, principal, workflow_id)
    if not wf.state_snapshot:
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
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """
    Closed-Loop Engine:
    Uses the Next Best Action findings to generate Campaign Iteration #N+1.
    Appends the iterated campaign in PENDING_APPROVAL status.
    """
    workflow_id = payload.get("workflow_id")
    if not workflow_id:
        raise HTTPException(status_code=400, detail="workflow_id is required")

    wf = AuthorizationService.owned_workflow(db, principal, workflow_id)
    if not wf.state_snapshot:
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
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
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
        wf = AuthorizationService.owned_workflow(db, principal, workflow_id)
        if wf.state_snapshot:
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
def get_markdown_report(
    workflow_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    wf = AuthorizationService.owned_workflow(db, principal, workflow_id)
    if not wf.state_snapshot:
        raise HTTPException(status_code=404, detail="Workflow run not found")

    state = MarketingState.model_validate(wf.state_snapshot)
    report_md = ReportService.generate_markdown_report(state)
    return Response(content=report_md, media_type="text/markdown")


@router.get("/reports/{workflow_id}/json")
def get_json_report(
    workflow_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    wf = AuthorizationService.owned_workflow(db, principal, workflow_id)
    if not wf.state_snapshot:
        raise HTTPException(status_code=404, detail="Workflow run not found")

    return wf.state_snapshot


# ==========================================
# 6. Executive Dashboard Endpoints
# ==========================================

@router.get("/dashboard/summary")
def get_dashboard_summary(
    brand_id: Optional[str] = None,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    brand = _resolve_workspace_brand(db, principal, brand_id)
    return DashboardService.get_summary(db, brand_id=brand.id, workspace_id=principal.workspace_id)


# ==========================================
# 7. Brand Intelligence & Onboarding Endpoints
# ==========================================

@router.get("/brands", response_model=List[BrandProfileRead])
def list_brands_endpoint(
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return (
        db.query(BrandProfile)
        .filter(BrandProfile.workspace_id == principal.workspace_id)
        .order_by(BrandProfile.created_at.asc())
        .all()
    )


@router.get("/brands/{brand_id}", response_model=BrandProfileRead)
def get_brand_endpoint(
    brand_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return AuthorizationService.owned_brand(db, principal, brand_id)


@router.post("/brands", response_model=BrandProfileRead)
def create_brand_endpoint(
    data: BrandProfileCreate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return BrandService.create_brand(db, data, workspace_id=principal.workspace_id)


@router.put("/brands/{brand_id}", response_model=BrandProfileRead)
def update_brand_endpoint(
    brand_id: str,
    data: BrandProfileUpdate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    AuthorizationService.owned_brand(db, principal, brand_id)
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
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    permitted_brand_ids = AuthorizationService.accessible_brand_ids(db, principal)
    if brand_id:
        AuthorizationService.owned_brand(db, principal, brand_id)
        permitted_brand_ids = [brand_id]
    query = db.query(ContentAsset).filter(ContentAsset.brand_id.in_(permitted_brand_ids))
    if channel:
        query = query.filter(ContentAsset.channel == channel)
    return query.order_by(ContentAsset.created_at.desc()).all()


@router.post("/content/assets", response_model=ContentAssetRead)
def create_content_asset_endpoint(
    data: ContentAssetCreate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    AuthorizationService.owned_brand(db, principal, data.brand_id)
    return ContentService.create_asset(db, data)


@router.post("/content/generate", response_model=List[ContentAssetRead])
def generate_content_endpoint(
    req: ContentGenerateRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    AuthorizationService.owned_brand(db, principal, req.brand_id)
    return ContentService.generate_content_assets(db, req)


@router.get("/content/assets/{asset_id}/media", response_model=List[MediaAssetRead])
def list_content_asset_media_endpoint(
    asset_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    AuthorizationService.owned_content_asset(db, principal, asset_id)
    return MediaService.list_for_content_asset(db, asset_id)


@router.get("/media", response_model=List[MediaAssetRead])
def list_media_library_endpoint(
    brand_id: Optional[str] = None,
    product_id: Optional[str] = None,
    asset_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """List assets belonging to caller's workspace with optional filtering."""
    if brand_id:
        AuthorizationService.owned_brand(db, principal, brand_id)
    return MediaService.list_workspace_media(
        db,
        principal.workspace_id,
        brand_id=brand_id,
        product_id=product_id,
        asset_type=asset_type,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get("/media/providers", response_model=List[ProviderInfoRead])
def get_media_providers_endpoint(
    principal: Principal = Depends(get_current_principal),
):
    """Return registered image providers and their capabilities and status."""
    return provider_registry.list_providers()


@router.post("/media/studio/generate", response_model=StudioGenerateResponse)
def generate_studio_image_endpoint(
    payload: StudioGenerateRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Generate high-end product imagery via provider abstraction with source linkage and provenance."""
    try:
        media, source_media, is_demo, warning = MediaService.generate_studio_asset(
            db, principal, payload
        )
        return StudioGenerateResponse(
            media=MediaAssetRead.model_validate(media),
            source_media=MediaAssetRead.model_validate(source_media) if source_media else None,
            message="Studio asset generated and stored with cryptographic provenance.",
            is_demo=is_demo,
            warning=warning,
        )
    except MediaProviderNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except MediaValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except MediaProviderRequestError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/media/{media_id}")
def get_protected_media_endpoint(
    media_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Return a stored creative only after workspace ownership is verified."""
    media = AuthorizationService.owned_media_asset(db, principal, media_id)
    try:
        path = MediaService.file_path(media)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Stored media file is unavailable") from exc
    except MediaValidationError as exc:
        raise HTTPException(status_code=500, detail="Stored media record is invalid") from exc
    return FileResponse(
        path,
        media_type=media.mime_type,
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"},
    )


@router.delete("/media/{media_id}", response_model=MediaDeleteResponse)
def delete_media_endpoint(
    media_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Permanently delete a media asset and local file within caller's workspace."""
    success = MediaService.delete_media_asset(db, principal, media_id)
    return MediaDeleteResponse(
        success=success,
        media_id=media_id,
        message="Media asset successfully removed from library and storage.",
    )


# ---------------------------------------------------------------------------
# AI Video Generation & Animation Studio Endpoints
# ---------------------------------------------------------------------------
@router.get("/video/providers", response_model=List[VideoProviderInfoRead])
def get_video_providers_endpoint(
    principal: Principal = Depends(get_current_principal),
):
    """Return registered video providers, official capabilities, durations, and pricing notes."""
    return video_provider_registry.list_providers()


@router.post("/video/jobs", response_model=VideoJobRead)
def create_video_job_endpoint(
    payload: VideoJobCreateRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Submit an asynchronous video generation task with capability checks and claim guardrails."""
    try:
        job = VideoService.create_video_job(db, principal, payload)
        output_url = f"/api/media/{job.output_media_id}" if job.output_media_id else None
        read_obj = VideoJobRead.model_validate(job)
        read_obj.output_media_url = output_url
        read_obj.is_demo = job.provider == "demo_mode"
        return read_obj
    except MediaProviderNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except MediaValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except MediaProviderRequestError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/video/jobs", response_model=List[VideoJobRead])
def list_video_jobs_endpoint(
    brand_id: Optional[str] = None,
    product_id: Optional[str] = None,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """List historical video generation jobs for the caller's workspace."""
    jobs = VideoService.list_video_jobs(db, principal, brand_id=brand_id, product_id=product_id)
    results = []
    for j in jobs:
        read_obj = VideoJobRead.model_validate(j)
        read_obj.output_media_url = f"/api/media/{j.output_media_id}" if j.output_media_id else None
        read_obj.is_demo = j.provider == "demo_mode"
        results.append(read_obj)
    return results


@router.get("/video/jobs/{job_id}", response_model=VideoJobRead)
def get_video_job_status_endpoint(
    job_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Poll asynchronous job progression and retrieve output media once completed."""
    try:
        job = VideoService.poll_video_job(db, principal, job_id)
        read_obj = VideoJobRead.model_validate(job)
        read_obj.output_media_url = f"/api/media/{job.output_media_id}" if job.output_media_id else None
        read_obj.is_demo = job.provider == "demo_mode"
        return read_obj
    except MediaProviderRequestError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/video/jobs/{job_id}/cancel", response_model=VideoJobRead)
def cancel_video_job_endpoint(
    job_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Cancel an active or queued video generation job."""
    job = VideoService.cancel_video_job(db, principal, job_id)
    read_obj = VideoJobRead.model_validate(job)
    read_obj.output_media_url = f"/api/media/{job.output_media_id}" if job.output_media_id else None
    read_obj.is_demo = job.provider == "demo_mode"
    return read_obj


@router.post("/video/jobs/{job_id}/retry", response_model=VideoJobRead)
def retry_video_job_endpoint(
    job_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Retry a failed or cancelled video generation job."""
    try:
        job = VideoService.retry_video_job(db, principal, job_id)
        read_obj = VideoJobRead.model_validate(job)
        read_obj.output_media_url = f"/api/media/{job.output_media_id}" if job.output_media_id else None
        read_obj.is_demo = job.provider == "demo_mode"
        return read_obj
    except MediaValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except MediaProviderRequestError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/content/assets/{asset_id}/media/generate", response_model=MediaGenerationResponse)
def generate_content_asset_media_endpoint(
    asset_id: str,
    payload: ImageGenerationRequest,
    request: Request,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Generate one explicitly-confirmed image and store it locally with its provenance."""
    AuthorizationService.owned_content_asset(db, principal, asset_id)
    RateLimitService.enforce(
        key=f"image-generation:{principal.workspace_id}:{principal.subject_id}",
        limit=settings.IMAGE_GENERATION_RATE_LIMIT,
        window_seconds=settings.IMAGE_GENERATION_RATE_WINDOW_SECONDS,
    )
    try:
        media = MediaService.generate_for_content_asset(
            db,
            asset_id,
            confirmed=payload.confirmed,
            size=payload.size,
            quality=payload.quality,
        )
        return MediaGenerationResponse(
            media=media,
            content_asset_id=asset_id,
            generated_media_url=media.media_url,
            message="Image generated by the configured provider and stored locally.",
        )
    except MediaProviderNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except MediaValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except MediaProviderRequestError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/content/assets/{asset_id}", response_model=ContentAssetRead)
def get_content_asset_endpoint(
    asset_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return AuthorizationService.owned_content_asset(db, principal, asset_id)


@router.put("/content/assets/{asset_id}", response_model=ContentAssetRead)
def update_content_asset_endpoint(
    asset_id: str,
    data: ContentAssetUpdate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    AuthorizationService.owned_content_asset(db, principal, asset_id)
    asset = ContentService.update_asset(db, asset_id, data)
    if not asset:
        raise HTTPException(status_code=404, detail="Content asset not found")
    return asset


@router.post("/content/assets/{asset_id}/duplicate", response_model=ContentAssetRead)
def duplicate_content_asset_endpoint(
    asset_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    AuthorizationService.owned_content_asset(db, principal, asset_id)
    dupe = ContentService.duplicate_asset(db, asset_id)
    if not dupe:
        raise HTTPException(status_code=404, detail="Content asset not found")
    return dupe


@router.delete("/content/assets/{asset_id}")
def delete_content_asset_endpoint(
    asset_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    AuthorizationService.owned_content_asset(db, principal, asset_id)
    success = ContentService.delete_asset(db, asset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Content asset not found")
    return {"message": "Content asset deleted successfully", "asset_id": asset_id}


@router.post("/content/assets/{asset_id}/schedule", response_model=ContentScheduleRead)
def schedule_content_asset_endpoint(
    asset_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    AuthorizationService.owned_content_asset(db, principal, asset_id)
    channel = payload.get("channel", "Instagram")
    scheduled_time = payload.get("scheduled_time", datetime.datetime.utcnow().isoformat())
    try:
        return ContentService.schedule_asset(db, asset_id, channel, scheduled_time)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.get("/content/schedules", response_model=List[ContentScheduleRead])
def list_content_schedules_endpoint(
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    permitted_brand_ids = AuthorizationService.accessible_brand_ids(db, principal)
    return (
        db.query(ContentSchedule)
        .join(ContentAsset, ContentSchedule.asset_id == ContentAsset.id)
        .filter(ContentAsset.brand_id.in_(permitted_brand_ids))
        .order_by(ContentSchedule.scheduled_time.asc())
        .all()
    )


@router.post("/content/schedules/{schedule_id}/publish-demo", response_model=ContentScheduleRead)
def trigger_publish_demo_endpoint(
    schedule_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Executes safe demo sandbox publishing transition."""
    try:
        schedule = db.query(ContentSchedule).filter(ContentSchedule.id == schedule_id).first()
        if not schedule:
            raise AuthorizationService._not_found()
        AuthorizationService.owned_content_asset(db, principal, schedule.asset_id)
        return ContentService.trigger_scheduled_publish_demo(db, schedule_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


# ==========================================
# 9. AI Campaign Planner, Creative Orchestration & Approval Workflow
# ==========================================

def _serialize_campaign(db: Session, camp: CampaignModel) -> CampaignRead:
    history_records = (
        db.query(CampaignApprovalHistory)
        .filter(CampaignApprovalHistory.campaign_id == camp.id)
        .order_by(CampaignApprovalHistory.created_at.desc())
        .all()
    )
    content_records = (
        db.query(ContentAsset)
        .filter(ContentAsset.campaign_id == camp.id)
        .order_by(ContentAsset.created_at.desc())
        .all()
    )
    media_count = (
        db.query(MediaAsset)
        .filter(MediaAsset.campaign_id == camp.id)
        .count()
    )
    content_ids = [c.id for c in content_records]
    media_map = {}
    if content_ids:
        linked_media = db.query(MediaAsset).filter(MediaAsset.content_asset_id.in_(content_ids)).all()
        media_map = {m.content_asset_id: m.id for m in linked_media}

    return CampaignRead(
        id=camp.id,
        workspace_id=camp.workspace_id,
        brand_id=camp.brand_id,
        product_id=camp.product_id,
        name=camp.name,
        description=camp.description,
        platform=camp.platform,
        objective=camp.objective,
        target_audience=camp.target_audience,
        customer_segment=camp.customer_segment,
        geographic_target=camp.geographic_target,
        channels=camp.channels or [],
        start_date=camp.start_date,
        end_date=camp.end_date,
        budget=float(camp.budget or 0.0),
        currency=camp.currency or "INR",
        duration_days=int(camp.duration_days or 30),
        content_frequency=camp.content_frequency,
        preferred_publishing_windows=camp.preferred_publishing_windows or [],
        primary_kpi=camp.primary_kpi,
        secondary_kpis=camp.secondary_kpis or [],
        brief=camp.brief,
        key_messages=camp.key_messages or [],
        offer=camp.offer,
        cta=camp.cta,
        brand_constraints=camp.brand_constraints,
        status=camp.status,
        rejection_reason=camp.rejection_reason,
        iteration_number=camp.iteration_number or 1,
        strategy_recommendation=camp.strategy_recommendation,
        linked_assets=camp.linked_assets or {},
        kpi_targets=camp.kpi_targets or {},
        created_at=camp.created_at,
        updated_at=camp.updated_at,
        approval_history=[CampaignApprovalHistoryRead.model_validate(h) for h in history_records],
        content_items=[
            CampaignContentRead(
                id=c.id,
                workspace_id=c.workspace_id,
                brand_id=c.brand_id,
                product_id=c.product_id,
                campaign_id=c.campaign_id,
                channel=c.channel,
                asset_type=c.asset_type,
                title=c.title,
                content=c.content,
                headline=c.headline,
                body=c.body_copy,
                body_copy=c.body_copy,
                call_to_action=c.call_to_action,
                hashtags=c.hashtags or [],
                image_prompt=c.image_prompt,
                generated_media_url=c.generated_media_url,
                media_asset_id=media_map.get(c.id) or (c.generated_media_url.split("/")[-1] if (c.generated_media_url or "").startswith("/api/media/") else None),
                status=c.status,
                provider_source=c.provider_source,
                version=c.version or 1,
                scheduled_time=c.schedules[0].scheduled_time if c.schedules else None,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
            for c in content_records
        ],
        content_count=len(content_records),
        media_count=media_count,
    )


@router.get("/campaigns")
def list_all_campaigns(
    brand_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """List persistent campaigns in workspace; falls back to workflow snapshot if none exist."""
    db_campaigns = CampaignService.list_campaigns(db, principal, brand_id=brand_id, status=status)
    if db_campaigns:
        return [_serialize_campaign(db, c) for c in db_campaigns]

    latest_wf = (
        db.query(WorkflowRun)
        .filter(WorkflowRun.workspace_id == principal.workspace_id)
        .order_by(WorkflowRun.created_at.desc())
        .first()
    )
    if latest_wf and latest_wf.state_snapshot and "campaign_plan" in latest_wf.state_snapshot:
        return latest_wf.state_snapshot["campaign_plan"]
    return []


@router.post("/campaigns", response_model=CampaignRead, status_code=201)
def create_persistent_campaign_endpoint(
    payload: CampaignCreateRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Create a persistent multi-channel campaign via the Campaign Creation Wizard."""
    try:
        camp = CampaignService.create_campaign(db, principal, payload)
        return _serialize_campaign(db, camp)
    except MediaValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/campaigns/{campaign_id}", response_model=CampaignRead)
def get_campaign_detail_endpoint(
    campaign_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Retrieve full campaign details, approval history, linked assets, and content items."""
    camp = CampaignService.get_campaign(db, principal, campaign_id)
    return _serialize_campaign(db, camp)


@router.put("/campaigns/{campaign_id}", response_model=CampaignRead)
def update_persistent_campaign_endpoint(
    campaign_id: str,
    payload: CampaignUpdateRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Update campaign parameters, budget, brief, and targeting within caller workspace."""
    try:
        camp = CampaignService.update_campaign(db, principal, campaign_id, payload)
        return _serialize_campaign(db, camp)
    except CampaignStateError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except MediaValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/campaigns/{campaign_id}")
def delete_persistent_campaign_endpoint(
    campaign_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Delete campaign and detach its content/media assets."""
    success = CampaignService.delete_campaign(db, principal, campaign_id)
    return {"success": success, "campaign_id": campaign_id, "message": "Campaign deleted successfully"}


@router.post("/campaigns/{campaign_id}/strategy")
def generate_campaign_strategy_endpoint(
    campaign_id: str,
    payload: CampaignStrategyGenerateRequest = Body(default=CampaignStrategyGenerateRequest()),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Generate or refresh structured AI campaign strategy with audience, channel mix, and budget ceiling."""
    try:
        return CampaignService.generate_strategy(
            db,
            principal,
            campaign_id,
            confirmed=payload.confirmed,
            allow_demo_fallback=payload.allow_demo_fallback,
        )
    except MediaValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/campaigns/{campaign_id}/strategy")
def get_campaign_strategy_endpoint(
    campaign_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Retrieve existing strategy recommendation or generate deterministic default."""
    camp = CampaignService.get_campaign(db, principal, campaign_id)
    if camp.strategy_recommendation:
        return camp.strategy_recommendation
    return CampaignService.generate_strategy(db, principal, campaign_id, confirmed=True, allow_demo_fallback=True)


@router.get("/campaigns/{campaign_id}/content", response_model=List[CampaignContentRead])
def list_campaign_content_endpoint(
    campaign_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """List creative content assets associated with this campaign."""
    items = CampaignService.list_campaign_content(db, principal, campaign_id)
    item_ids = [c.id for c in items]
    media_map = {}
    if item_ids:
        linked_media = db.query(MediaAsset).filter(MediaAsset.content_asset_id.in_(item_ids)).all()
        media_map = {m.content_asset_id: m.id for m in linked_media}

    return [
        CampaignContentRead(
            id=c.id,
            workspace_id=c.workspace_id,
            brand_id=c.brand_id,
            product_id=c.product_id,
            campaign_id=c.campaign_id,
            channel=c.channel,
            asset_type=c.asset_type,
            title=c.title,
            content=c.content,
            headline=c.headline,
            body=c.body_copy,
            body_copy=c.body_copy,
            call_to_action=c.call_to_action,
            hashtags=c.hashtags or [],
            image_prompt=c.image_prompt,
            generated_media_url=c.generated_media_url,
            media_asset_id=media_map.get(c.id) or (c.generated_media_url.split("/")[-1] if (c.generated_media_url or "").startswith("/api/media/") else None),
            status=c.status,
            provider_source=c.provider_source,
            version=c.version or 1,
            scheduled_time=c.schedules[0].scheduled_time if c.schedules else None,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in items
    ]


@router.post("/campaigns/{campaign_id}/content", response_model=CampaignContentRead, status_code=201)
def create_campaign_content_endpoint(
    campaign_id: str,
    payload: CampaignContentCreateRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Create platform-specific creative copy, captions, hashtags, and schedule for campaign."""
    try:
        c = CampaignService.create_content_item(db, principal, campaign_id, payload)
        return CampaignContentRead(
            id=c.id,
            workspace_id=c.workspace_id,
            brand_id=c.brand_id,
            product_id=c.product_id,
            campaign_id=c.campaign_id,
            channel=c.channel,
            asset_type=c.asset_type,
            title=c.title,
            content=c.content,
            headline=c.headline,
            body_copy=c.body_copy,
            call_to_action=c.call_to_action,
            hashtags=c.hashtags or [],
            image_prompt=c.image_prompt,
            generated_media_url=c.generated_media_url,
            media_asset_id=c.generated_media_url.split("/")[-1] if (c.generated_media_url or "").startswith("/api/media/") else None,
            status=c.status,
            provider_source=c.provider_source,
            version=c.version or 1,
            scheduled_time=c.schedules[0].scheduled_time if c.schedules else None,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
    except MediaValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/campaigns/{campaign_id}/content/{content_id}", response_model=CampaignContentRead)
def update_campaign_content_endpoint(
    campaign_id: str,
    content_id: str,
    payload: CampaignContentUpdateRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Edit creative content copy, hashtags, or scheduled publishing timestamp."""
    try:
        c = CampaignService.update_content_item(db, principal, campaign_id, content_id, payload)
        return CampaignContentRead(
            id=c.id,
            workspace_id=c.workspace_id,
            brand_id=c.brand_id,
            product_id=c.product_id,
            campaign_id=c.campaign_id,
            channel=c.channel,
            asset_type=c.asset_type,
            title=c.title,
            content=c.content,
            headline=c.headline,
            body_copy=c.body_copy,
            call_to_action=c.call_to_action,
            hashtags=c.hashtags or [],
            image_prompt=c.image_prompt,
            generated_media_url=c.generated_media_url,
            media_asset_id=c.generated_media_url.split("/")[-1] if (c.generated_media_url or "").startswith("/api/media/") else None,
            status=c.status,
            provider_source=c.provider_source,
            version=c.version or 1,
            scheduled_time=c.schedules[0].scheduled_time if c.schedules else None,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
    except MediaValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/campaigns/{campaign_id}/content/{content_id}/variants", response_model=List[CampaignContentRead])
def generate_campaign_content_variants_endpoint(
    campaign_id: str,
    content_id: str,
    payload: CampaignContentVariantRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Generate multiple creative angles and copy variants (Direct Response, Storytelling, Social Proof)."""
    variants = CampaignService.generate_content_variants(db, principal, campaign_id, content_id, payload)
    return [
        CampaignContentRead(
            id=c.id,
            workspace_id=c.workspace_id,
            brand_id=c.brand_id,
            product_id=c.product_id,
            campaign_id=c.campaign_id,
            channel=c.channel,
            asset_type=c.asset_type,
            title=c.title,
            content=c.content,
            headline=c.headline,
            body_copy=c.body_copy,
            call_to_action=c.call_to_action,
            hashtags=c.hashtags or [],
            image_prompt=c.image_prompt,
            generated_media_url=c.generated_media_url,
            media_asset_id=c.generated_media_url.split("/")[-1] if (c.generated_media_url or "").startswith("/api/media/") else None,
            status=c.status,
            provider_source=c.provider_source,
            version=c.version or 1,
            angle=getattr(c, "angle", None),
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in variants
    ]


@router.post("/campaigns/{campaign_id}/assets/attach")
def attach_asset_to_campaign_endpoint(
    campaign_id: str,
    payload: CampaignAssetAttachRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Associate a generated image or video asset from Media Library to campaign and content."""
    media = CampaignService.attach_asset(
        db, principal, campaign_id, payload.media_asset_id, payload.content_asset_id
    )
    return {
        "success": True,
        "status": "attached",
        "campaign_id": campaign_id,
        "media_asset_id": media.id,
        "media_url": media.media_url,
        "content_asset_id": media.content_asset_id,
    }


@router.post("/campaigns/{campaign_id}/submit-review", response_model=CampaignRead)
def submit_campaign_for_review_endpoint(
    campaign_id: str,
    payload: CampaignApprovalActionRequest = Body(default=CampaignApprovalActionRequest()),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Submit draft or planning campaign to pending_review."""
    try:
        camp = CampaignService.submit_for_review(db, principal, campaign_id, comment=payload.comment)
        return _serialize_campaign(db, camp)
    except CampaignStateError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except MediaValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/campaigns/{campaign_id}/reject", response_model=CampaignRead)
def reject_campaign_endpoint(
    campaign_id: str,
    payload: CampaignApprovalActionRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Reject campaign with mandatory feedback comment, returning to editing."""
    try:
        camp = CampaignService.reject_campaign(db, principal, campaign_id, comment=payload.comment)
        return _serialize_campaign(db, camp)
    except CampaignStateError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except MediaValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/campaigns/{campaign_id}/request-revision", response_model=CampaignRead)
def request_campaign_revision_endpoint(
    campaign_id: str,
    payload: CampaignApprovalActionRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Request revisions with mandatory feedback comments."""
    try:
        camp = CampaignService.request_revision(db, principal, campaign_id, comment=payload.comment)
        return _serialize_campaign(db, camp)
    except CampaignStateError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except MediaValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/campaigns/{campaign_id}/ready-publish", response_model=CampaignRead)
def ready_publish_campaign_endpoint(
    campaign_id: str,
    payload: CampaignApprovalActionRequest = Body(default=CampaignApprovalActionRequest()),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Mark campaign ready to publish; stops at ready_to_publish without claiming live deployment."""
    try:
        camp = CampaignService.mark_ready_to_publish(db, principal, campaign_id, comment=payload.comment)
        return _serialize_campaign(db, camp)
    except CampaignStateError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except MediaValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/campaigns/{campaign_id}/history", response_model=List[CampaignApprovalHistoryRead])
def get_campaign_history_endpoint(
    campaign_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Retrieve full audit log and approval state machine history for this campaign."""
    records = CampaignService.get_approval_history(db, principal, campaign_id)
    return [CampaignApprovalHistoryRead.model_validate(r) for r in records]


@router.get("/calendar/entries", response_model=List[CampaignCalendarEntryRead])
def get_calendar_entries_endpoint(
    campaign_id: Optional[str] = None,
    brand_id: Optional[str] = None,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """List scheduled publishing entries across campaigns in the workspace."""
    entries = CampaignService.get_calendar_entries(db, principal, campaign_id=campaign_id, brand_id=brand_id)
    return [CampaignCalendarEntryRead.model_validate(e) for e in entries]


@router.put("/calendar/entries/{schedule_id}/reschedule")
def reschedule_calendar_entry_endpoint(
    schedule_id: str,
    payload: Dict[str, str] = Body(...),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    """Reschedule content calendar entry with date validation."""
    new_time = payload.get("scheduled_time")
    if not new_time:
        raise HTTPException(status_code=400, detail="scheduled_time is required")
    try:
        sched = CampaignService.reschedule_calendar_entry(db, principal, schedule_id, new_time)
        return {"success": True, "status": "rescheduled", "schedule_id": sched.id, "scheduled_time": sched.scheduled_time}
    except MediaValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ==========================================
# 10. AI Marketing Assistant Endpoints
# ==========================================

@router.post("/assistant/chat")
def assistant_chat_endpoint(
    payload: AssistantMessageCreate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    AuthorizationService.owned_brand(db, principal, payload.brand_id)
    return AssistantService.process_message(db, payload.brand_id, payload.content)


@router.get("/assistant/history")
def assistant_history_endpoint(
    brand_id: Optional[str] = None,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    brand = _resolve_workspace_brand(db, principal, brand_id)
    history = AssistantService.list_history(db, brand_id=brand.id)
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
def list_automation_rules_endpoint(
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return AutomationService.list_rules(db, principal.workspace_id)


@router.post("/automations/rules", response_model=AutomationRuleRead)
def create_automation_rule_endpoint(
    payload: AutomationRuleCreate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return AutomationService.create_rule(db, principal.workspace_id, payload)


@router.get("/automations/rules/{rule_id}", response_model=AutomationRuleRead)
def get_automation_rule_endpoint(
    rule_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return AuthorizationService.owned_automation_rule(db, principal, rule_id)


@router.put("/automations/rules/{rule_id}", response_model=AutomationRuleRead)
def update_automation_rule_endpoint(
    rule_id: str,
    payload: AutomationRuleUpdate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    rule = AutomationService.update_rule(db, principal.workspace_id, rule_id, payload)
    if not rule:
        raise HTTPException(status_code=404, detail="Automation rule not found")
    return rule


@router.post("/automations/rules/{rule_id}/toggle", response_model=AutomationRuleRead)
def toggle_automation_rule_endpoint(
    rule_id: str,
    payload: AutomationRuleToggle,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    rule = AutomationService.toggle_rule(db, principal.workspace_id, rule_id, payload.is_enabled)
    if not rule:
        raise HTTPException(status_code=404, detail="Automation rule not found")
    return rule


@router.post("/automations/rules/{rule_id}/run", response_model=AutomationExecutionRead)
def run_automation_rule_endpoint(
    rule_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    try:
        return AutomationService.run_rule(db, principal.workspace_id, rule_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.get("/automations/executions", response_model=List[AutomationExecutionRead])
def list_automation_executions_endpoint(
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return AutomationService.list_executions(db, principal.workspace_id)


@router.get("/automations/executions/{execution_id}", response_model=AutomationExecutionRead)
def get_automation_execution_endpoint(
    execution_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return AuthorizationService.owned_automation_execution(db, principal, execution_id)


# ==========================================
# 12. Integrations Endpoints
# ==========================================

@router.get("/integrations", response_model=List[IntegrationRead])
def list_integrations_endpoint(
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return IntegrationService.list_integrations(db, principal.workspace_id)


@router.get("/integrations/{integration_id}", response_model=IntegrationRead)
def get_integration_endpoint(
    integration_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return AuthorizationService.owned_integration(db, principal, integration_id)


@router.post("/integrations/test", response_model=IntegrationTestResponse)
def test_integration_endpoint(
    payload: IntegrationTestRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    try:
        res = IntegrationService.test_connection(db, principal.workspace_id, payload.integration_id)
        return IntegrationTestResponse(**res)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


# ==========================================
# 13. Customer Messages & Reputation Endpoints
# ==========================================

@router.get("/customer-messages")
def list_customer_messages_endpoint(
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    permitted_brand_ids = AuthorizationService.accessible_brand_ids(db, principal)
    CustomerMessageService.seed_sample_messages(db)
    msgs = db.query(CustomerMessage).filter(CustomerMessage.brand_id.in_(permitted_brand_ids)).all()
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
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    existing = db.query(CustomerMessage).filter(CustomerMessage.id == message_id).first()
    if not existing:
        raise AuthorizationService._not_found()
    AuthorizationService.owned_brand(db, principal, existing.brand_id)
    new_reply = payload.get("draft_reply", "")
    msg = CustomerMessageService.update_draft(db, message_id, new_reply)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message_id": msg.id, "status": msg.status, "draft_reply": msg.draft_reply}


@router.post("/customer-messages/{message_id}/approve-send")
def approve_and_send_customer_message(
    message_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    existing = db.query(CustomerMessage).filter(CustomerMessage.id == message_id).first()
    if not existing:
        raise AuthorizationService._not_found()
    AuthorizationService.owned_brand(db, principal, existing.brand_id)
    msg = CustomerMessageService.approve_and_send_demo(db, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message_id": msg.id, "status": msg.status, "message": "Reply approved and simulated send recorded."}


# ==========================================
# 14. Landing Page Draft Endpoints
# ==========================================

@router.get("/landing-page")
def get_landing_page_endpoint(
    brand_id: Optional[str] = None,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    brand = _resolve_workspace_brand(db, principal, brand_id)
    draft = LandingPageService.get_or_create_draft(db, brand.id)
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
    brand_id: Optional[str] = None,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    brand = _resolve_workspace_brand(db, principal, brand_id)
    updated = LandingPageService.update_draft(db, brand.id, payload)
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

