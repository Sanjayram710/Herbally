"""Universal AI Campaign Planning & Approval Workflow Service.

Manages persistent campaigns, AI-assisted strategy generation, creative orchestration,
state machine approval workflows, and publishing calendar schedules.
"""

import datetime
import json
import uuid
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.config import settings
from app.models.brand import BrandProfile
from app.models.campaign import Campaign, CampaignApprovalHistory
from app.models.content import ContentAsset, ContentSchedule
from app.models.media import MediaAsset
from app.schemas.campaign import (
    CampaignCreateRequest,
    CampaignUpdateRequest,
    CampaignContentCreateRequest,
    CampaignContentUpdateRequest,
    CampaignContentVariantRequest,
)
from app.services.authorization_service import AuthorizationService, Principal
from app.services.guardrails import GuardrailsService
from app.services.media_service import MediaValidationError


class CampaignStateError(MediaValidationError):
    """Raised when an illegal status transition is attempted."""
    pass


VALID_TRANSITIONS: Dict[str, List[str]] = {
    "draft": ["planning", "pending_review", "cancelled"],
    "planning": ["pending_review", "draft", "cancelled"],
    "pending_review": ["approved", "rejected", "revision_requested", "draft", "cancelled"],
    "revision_requested": ["draft", "planning", "pending_review", "cancelled"],
    "rejected": ["draft", "revision_requested", "planning", "pending_review", "cancelled"],
    "approved": ["ready_to_publish", "planning", "draft", "cancelled"],
    "ready_to_publish": ["scheduled", "approved", "draft", "cancelled"],
    "scheduled": ["ready_to_publish", "published", "draft", "cancelled"],
    "published": [],
    "cancelled": ["draft"],
    "failed": ["draft"],
}


class CampaignService:
    @classmethod
    def create_campaign(
        cls,
        db: Session,
        principal: Principal,
        req: CampaignCreateRequest,
    ) -> Campaign:
        # 1. Authorize Workspace Brand
        AuthorizationService.owned_brand(db, principal, req.brand_id)

        # 2. Authorize Product if specified
        if req.product_id:
            AuthorizationService.owned_product(db, principal, req.product_id)

        # 3. Medical/FDA Claim Guardrails
        cls._validate_claim_guardrails(req.name, req.brief, req.offer, req.key_messages)

        # 4. Budget validation
        if req.budget <= 0:
            raise MediaValidationError("Campaign budget must be greater than zero.")

        # 5. Date validation
        if req.start_date and req.end_date and req.end_date < req.start_date:
            raise MediaValidationError("End date cannot precede start date.")

        campaign_id = f"camp-{uuid.uuid4().hex[:10]}"
        campaign = Campaign(
            id=campaign_id,
            workspace_id=principal.workspace_id,
            brand_id=req.brand_id,
            product_id=req.product_id,
            name=req.name,
            description=req.description,
            platform=req.channels[0] if req.channels else "Omnichannel",
            objective=req.objective,
            target_audience=req.target_audience,
            customer_segment=req.customer_segment,
            geographic_target=req.geographic_target or "India",
            channels=req.channels,
            start_date=req.start_date or datetime.datetime.utcnow(),
            end_date=req.end_date or (datetime.datetime.utcnow() + datetime.timedelta(days=req.duration_days)),
            budget=req.budget,
            currency=req.currency,
            duration_days=req.duration_days,
            content_frequency=req.content_frequency or "daily",
            preferred_publishing_windows=req.preferred_publishing_windows,
            primary_kpi=req.primary_kpi or "ROAS",
            secondary_kpis=req.secondary_kpis,
            brief=req.brief,
            key_messages=req.key_messages,
            offer=req.offer,
            cta=req.cta or "Shop Now",
            brand_constraints=req.brand_constraints,
            status="draft",
            iteration_number=1,
            linked_assets={},
            kpi_targets={
                "primary_kpi": req.primary_kpi or "ROAS",
                "secondary_kpis": req.secondary_kpis,
                "target_budget": req.budget,
            },
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow(),
        )

        db.add(campaign)

        # Log creation in audit history
        history = CampaignApprovalHistory(
            id=f"cah-{uuid.uuid4().hex[:12]}",
            campaign_id=campaign_id,
            workspace_id=principal.workspace_id,
            actor_id=principal.subject_id,
            action="create_draft",
            from_status="none",
            to_status="draft",
            comment="Initial campaign draft created via Campaign Creation Wizard.",
            created_at=datetime.datetime.utcnow(),
        )
        db.add(history)

        db.commit()
        db.refresh(campaign)
        return campaign

    @classmethod
    def get_campaign(cls, db: Session, principal: Principal, campaign_id: str) -> Campaign:
        return AuthorizationService.owned_campaign(db, principal, campaign_id)

    @classmethod
    def list_campaigns(
        cls,
        db: Session,
        principal: Principal,
        *,
        brand_id: Optional[str] = None,
        status: Optional[str] = None,
        product_id: Optional[str] = None,
    ) -> List[Campaign]:
        query = db.query(Campaign).filter(Campaign.workspace_id == principal.workspace_id)
        if brand_id:
            query = query.filter(Campaign.brand_id == brand_id)
        if status:
            query = query.filter(Campaign.status == status.lower())
        if product_id:
            query = query.filter(Campaign.product_id == product_id)

        return query.order_by(Campaign.created_at.desc()).all()

    @classmethod
    def update_campaign(
        cls,
        db: Session,
        principal: Principal,
        campaign_id: str,
        req: CampaignUpdateRequest,
    ) -> Campaign:
        campaign = AuthorizationService.owned_campaign(db, principal, campaign_id)

        if campaign.status in ("approved", "published", "scheduled"):
            raise CampaignStateError(
                f"Campaign is currently '{campaign.status}'. Please request revision before editing."
            )

        if req.name is not None:
            cls._validate_claim_guardrails(req.name)
            campaign.name = req.name
        if req.description is not None:
            campaign.description = req.description
        if req.product_id is not None:
            if req.product_id:
                AuthorizationService.owned_product(db, principal, req.product_id)
            campaign.product_id = req.product_id
        if req.objective is not None:
            campaign.objective = req.objective
        if req.target_audience is not None:
            campaign.target_audience = req.target_audience
        if req.customer_segment is not None:
            campaign.customer_segment = req.customer_segment
        if req.geographic_target is not None:
            campaign.geographic_target = req.geographic_target
        if req.channels is not None:
            campaign.channels = req.channels
            if req.channels:
                campaign.platform = req.channels[0]
        if req.start_date is not None:
            campaign.start_date = req.start_date
        if req.end_date is not None:
            campaign.end_date = req.end_date
        if req.budget is not None:
            if req.budget <= 0:
                raise MediaValidationError("Budget must be positive.")
            campaign.budget = req.budget
        if req.currency is not None:
            campaign.currency = req.currency
        if req.duration_days is not None:
            campaign.duration_days = req.duration_days
        if req.content_frequency is not None:
            campaign.content_frequency = req.content_frequency
        if req.preferred_publishing_windows is not None:
            campaign.preferred_publishing_windows = req.preferred_publishing_windows
        if req.primary_kpi is not None:
            campaign.primary_kpi = req.primary_kpi
        if req.secondary_kpis is not None:
            campaign.secondary_kpis = req.secondary_kpis
        if req.brief is not None:
            cls._validate_claim_guardrails(req.brief)
            campaign.brief = req.brief
        if req.key_messages is not None:
            cls._validate_claim_guardrails(*req.key_messages)
            campaign.key_messages = req.key_messages
        if req.offer is not None:
            cls._validate_claim_guardrails(req.offer)
            campaign.offer = req.offer
        if req.cta is not None:
            campaign.cta = req.cta
        if req.brand_constraints is not None:
            campaign.brand_constraints = req.brand_constraints

        # Date coherence check
        if campaign.start_date and campaign.end_date and campaign.end_date < campaign.start_date:
            raise MediaValidationError("End date cannot precede start date.")

        campaign.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(campaign)
        return campaign

    @classmethod
    def delete_campaign(cls, db: Session, principal: Principal, campaign_id: str) -> bool:
        campaign = AuthorizationService.owned_campaign(db, principal, campaign_id)

        # Detach content assets from campaign
        db.query(ContentAsset).filter(ContentAsset.campaign_id == campaign_id).update(
            {ContentAsset.campaign_id: None}, synchronize_session=False
        )
        # Detach media assets from campaign
        db.query(MediaAsset).filter(MediaAsset.campaign_id == campaign_id).update(
            {MediaAsset.campaign_id: None}, synchronize_session=False
        )

        db.delete(campaign)
        db.commit()
        return True

    @classmethod
    def generate_strategy(
        cls,
        db: Session,
        principal: Principal,
        campaign_id: str,
        *,
        confirmed: bool = True,
        allow_demo_fallback: bool = True,
    ) -> Dict[str, Any]:
        campaign = AuthorizationService.owned_campaign(db, principal, campaign_id)
        brand = AuthorizationService.owned_brand(db, principal, campaign.brand_id)

        prod_name = "Brand Catalog"
        if campaign.product_id:
            try:
                prod = AuthorizationService.owned_product(db, principal, campaign.product_id)
                prod_name = prod.name
            except Exception:
                pass

        # Build realistic budget allocation strictly respecting user budget limit
        total_budget = float(campaign.budget)
        channels = campaign.channels or ["Instagram", "Google Ads"]
        num_channels = max(1, len(channels))

        # Weight allocation evenly or per channel archetype
        budget_allocation = {}
        spent_so_far = 0.0
        for i, ch in enumerate(channels):
            if i == num_channels - 1:
                budget_allocation[ch] = round(total_budget - spent_so_far, 2)
            else:
                share = round(total_budget / num_channels, 2)
                budget_allocation[ch] = share
                spent_so_far += share

        budget_items = [
            {"channel": ch, "allocated_amount": amt}
            for ch, amt in budget_allocation.items()
        ]

        summary_text = (
            f"Multi-channel {campaign.objective.title()} campaign for {brand.name} ({prod_name}). "
            f"Focuses on {campaign.geographic_target} targeting conscious buyers across {', '.join(channels)}."
        )

        audience_hypotheses = [
            {
                "segment": campaign.customer_segment or "Conscious Urban Consumers",
                "pain_point": "Seeking natural, transparent products with verified purity and zero synthetic compromises.",
                "hook": f"Why switch to {brand.name}? Clean botanical formulation engineered for genuine daily results.",
            },
            {
                "segment": "Value-Oriented Wellness Enthusiasts",
                "pain_point": "Frustrated with overpriced lifestyle items that lack verified substance.",
                "hook": f"Premium botanical performance at an honest price. Discover {prod_name}.",
            },
        ]

        channel_recs = [
            {
                "channel": ch,
                "allocated_budget": budget_allocation.get(ch, round(total_budget / num_channels, 2)),
                "recommended_format": "9:16 Vertical Reel Video" if "instagram" in ch.lower() or "youtube" in ch.lower() else "High-Res Studio Packshot",
                "role_in_funnel": "Top of Funnel Discovery & Consideration" if i == 0 else "Bottom of Funnel Conversion",
                "rationale": f"High engagement concentration for {campaign.geographic_target} demographic.",
            }
            for i, ch in enumerate(channels)
        ]

        content_pillars = [
            {
                "pillar": "Authentic Ritual & Application",
                "theme": "Macro sensory visuals demonstrating smooth absorption and verified benefits.",
            },
            {
                "pillar": "Pure Botanical Heritage",
                "theme": "Educational storytelling on ethical sourcing and clean active ingredients.",
            },
            {
                "pillar": "Customer Social Proof",
                "theme": "Real user unboxings and daily routine integrations without exaggerated claims.",
            },
        ]

        asset_formats = [
            "9:16 Vertical Video (Instagram Reels / YouTube Shorts)",
            "1:1 Square Studio Photography (Feed Ads / Catalog)",
            "16:9 Landscape Video Banner (Web / Display)",
        ]

        draft_content_plan = [
            {
                "day": 1,
                "channel": channels[0],
                "asset_type": "reel_script",
                "title": f"{brand.name} Launch Hero Story",
                "concept": "Product Hero 3D showcase with smooth turntable motion",
            },
            {
                "day": 3,
                "channel": channels[min(1, len(channels) - 1)],
                "asset_type": "social_post",
                "title": "Clean Ingredients Breakdown",
                "concept": "Pristine white marble packshot highlighting clean formula",
            },
            {
                "day": 7,
                "channel": channels[0],
                "asset_type": "ad_copy",
                "title": "Limited Launch Offer",
                "concept": f"{campaign.offer or 'Special Launch Discount'} with clear Call To Action",
            },
        ]

        publishing_calendar = [
            {
                "window": "Morning 09:00 - 11:00 IST",
                "best_days": ["Tuesday", "Thursday", "Saturday"],
                "focus": "Educational & Ritual Reels",
            },
            {
                "window": "Evening 18:00 - 21:00 IST",
                "best_days": ["Wednesday", "Sunday"],
                "focus": "Promotional Ads & Direct CTAs",
            },
        ]

        strategy = {
            "summary": summary_text,
            "campaign_summary": summary_text,
            "objective": campaign.objective,
            "audience_hypotheses": audience_hypotheses,
            "audience_and_messaging_hypotheses": audience_hypotheses,
            "channel_recommendations": channel_recs,
            "content_pillars": content_pillars,
            "asset_formats": asset_formats,
            "recommended_asset_formats": asset_formats,
            "draft_content_plan": draft_content_plan,
            "publishing_calendar": publishing_calendar,
            "proposed_publishing_calendar": publishing_calendar,
            "kpi_targets": {
                "primary_kpi": campaign.primary_kpi or "ROAS",
                "target_value": "3.5x ROAS" if (campaign.primary_kpi or "").upper() == "ROAS" else "CTR > 2.2%",
                "budget_ceiling": total_budget,
                "measurement_frequency": "Weekly Deterministic Review",
            },
            "budget_allocation": budget_items,
            "budget_by_channel": budget_allocation,
            "risks_and_assumptions": [
                "Assumes baseline audience receptivity in target metropolitan clusters.",
                "Compliance note: AYUSH/FDA guardrails prohibit unproven therapeutic or disease-curing claims.",
                "Zero ad spend policy: budget figures represent strategic allocation targets; no money is spent without user authorization.",
            ],
            "provider_source": "Deterministic Strategy Planner (Demo Simulation Mode)",
            "is_demo": True,
            "generated_at": datetime.datetime.utcnow().isoformat(),
        }

        campaign.strategy_recommendation = strategy
        if campaign.status == "draft":
            campaign.status = "planning"

        db.commit()
        db.refresh(campaign)
        return strategy

    @classmethod
    def create_content_item(
        cls,
        db: Session,
        principal: Principal,
        campaign_id: str,
        req: CampaignContentCreateRequest,
    ) -> ContentAsset:
        campaign = AuthorizationService.owned_campaign(db, principal, campaign_id)
        body_text = req.body_copy or getattr(req, "body", None) or req.content or ""
        title_text = req.title or req.headline or f"{req.channel.title()} Creative"
        content_text = req.content or body_text or title_text
        headline_text = req.headline or title_text

        cls._validate_claim_guardrails(title_text, content_text, headline_text, body_text)

        content_id = f"cnt-{uuid.uuid4().hex[:12]}"

        # Link media asset if provided
        media_url = None
        if req.media_asset_id:
            media = AuthorizationService.owned_media_asset(db, principal, req.media_asset_id)
            media_url = media.media_url
            media.campaign_id = campaign.id
            media.content_asset_id = content_id

        asset = ContentAsset(
            id=content_id,
            workspace_id=principal.workspace_id,
            brand_id=campaign.brand_id,
            product_id=campaign.product_id,
            campaign_id=campaign.id,
            channel=req.channel,
            asset_type=req.asset_type,
            title=title_text,
            content=content_text,
            headline=headline_text,
            body_copy=body_text,
            call_to_action=req.call_to_action or campaign.cta,
            hashtags=req.hashtags,
            image_prompt=req.image_prompt,
            generated_media_url=media_url,
            status="draft",
            provider_source="User Draft / Campaign Orchestrator",
            version=1,
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow(),
        )
        db.add(asset)

        # Create calendar schedule entry if scheduled_time is provided
        if req.scheduled_time:
            cls._validate_iso_time(req.scheduled_time)
            sched = ContentSchedule(
                id=f"sched-{uuid.uuid4().hex[:12]}",
                asset_id=content_id,
                channel=req.channel,
                scheduled_time=req.scheduled_time,
                status="scheduled",
                is_simulated="PLANNED SCHEDULE",
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow(),
            )
            db.add(sched)

        db.commit()
        db.refresh(asset)
        return asset

    @classmethod
    def list_campaign_content(
        cls,
        db: Session,
        principal: Principal,
        campaign_id: str,
    ) -> List[ContentAsset]:
        AuthorizationService.owned_campaign(db, principal, campaign_id)
        return (
            db.query(ContentAsset)
            .filter(
                ContentAsset.campaign_id == campaign_id,
                ContentAsset.workspace_id == principal.workspace_id,
            )
            .order_by(ContentAsset.created_at.desc())
            .all()
        )

    @classmethod
    def update_content_item(
        cls,
        db: Session,
        principal: Principal,
        campaign_id: str,
        content_id: str,
        req: CampaignContentUpdateRequest,
    ) -> ContentAsset:
        campaign = AuthorizationService.owned_campaign(db, principal, campaign_id)
        asset = (
            db.query(ContentAsset)
            .filter(
                ContentAsset.id == content_id,
                ContentAsset.campaign_id == campaign.id,
                ContentAsset.workspace_id == principal.workspace_id,
            )
            .first()
        )
        if not asset:
            raise AuthorizationService._not_found()

        if req.title is not None:
            cls._validate_claim_guardrails(req.title)
            asset.title = req.title
        if req.content is not None:
            cls._validate_claim_guardrails(req.content)
            asset.content = req.content
        if req.headline is not None:
            cls._validate_claim_guardrails(req.headline)
            asset.headline = req.headline
        body_to_update = req.body_copy if req.body_copy is not None else getattr(req, "body", None)
        if body_to_update is not None:
            cls._validate_claim_guardrails(body_to_update)
            asset.body_copy = body_to_update
            if req.content is None:
                asset.content = body_to_update
        if req.call_to_action is not None:
            asset.call_to_action = req.call_to_action
        if req.hashtags is not None:
            asset.hashtags = req.hashtags
        if req.image_prompt is not None:
            asset.image_prompt = req.image_prompt
        if req.status is not None:
            asset.status = req.status
        if req.media_asset_id is not None:
            if req.media_asset_id:
                media = AuthorizationService.owned_media_asset(db, principal, req.media_asset_id)
                asset.generated_media_url = media.media_url
                media.campaign_id = campaign.id
                media.content_asset_id = asset.id
            else:
                asset.generated_media_url = None

        if req.scheduled_time:
            cls._validate_iso_time(req.scheduled_time)
            sched = db.query(ContentSchedule).filter(ContentSchedule.asset_id == asset.id).first()
            if sched:
                sched.scheduled_time = req.scheduled_time
                sched.updated_at = datetime.datetime.utcnow()
            else:
                sched = ContentSchedule(
                    id=f"sched-{uuid.uuid4().hex[:12]}",
                    asset_id=asset.id,
                    channel=asset.channel,
                    scheduled_time=req.scheduled_time,
                    status="scheduled",
                    is_simulated="PLANNED SCHEDULE",
                )
                db.add(sched)

        asset.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(asset)
        return asset

    @classmethod
    def generate_content_variants(
        cls,
        db: Session,
        principal: Principal,
        campaign_id: str,
        content_id: str,
        req: CampaignContentVariantRequest,
    ) -> List[ContentAsset]:
        campaign = AuthorizationService.owned_campaign(db, principal, campaign_id)
        base = (
            db.query(ContentAsset)
            .filter(
                ContentAsset.id == content_id,
                ContentAsset.campaign_id == campaign.id,
                ContentAsset.workspace_id == principal.workspace_id,
            )
            .first()
        )
        if not base:
            raise AuthorizationService._not_found()

        angle_map = {
            "direct_response": ("direct_response", "Direct Response", "Tired of unproven promises? Switch to clean botanical efficacy today.", "Order Now"),
            "storytelling": ("storytelling", "Sensory Storytelling", "Awaken your daily ritual with pure plant-powered harmony.", "Experience Botanical Care"),
            "social_proof": ("social_proof", "Social Proof", "Loved by conscious wellness enthusiasts. Read why thousands made the switch.", "Claim Launch Benefit"),
            "urgency": ("urgency", "Urgency / Exclusive", "Limited initial harvest batch. Secure yours before stock depletes.", "Shop Exclusive Batch"),
        }

        if req.angles:
            variant_angles = []
            for a in req.angles:
                clean_a = a.strip().lower()
                if clean_a in angle_map:
                    variant_angles.append(angle_map[clean_a])
                else:
                    variant_angles.append((clean_a, clean_a.replace("_", " ").title(), f"Engineered around {clean_a} for target audiences.", base.call_to_action or "Learn More"))
        else:
            variant_angles = list(angle_map.values())[:req.number_of_variants]

        created_variants: List[ContentAsset] = []
        for i, (angle_key, angle_name, copy_snippet, cta) in enumerate(variant_angles):
            var_id = f"cnt-var-{uuid.uuid4().hex[:10]}"
            var_title = f"{base.title} [Variant {chr(65 + i)} - {angle_name}]"
            var_content = f"{copy_snippet}\n\n{base.content}\n\nCTA: {cta}"

            variant_asset = ContentAsset(
                id=var_id,
                workspace_id=principal.workspace_id,
                brand_id=campaign.brand_id,
                product_id=campaign.product_id,
                campaign_id=campaign.id,
                channel=base.channel,
                asset_type=base.asset_type,
                title=var_title,
                content=var_content,
                headline=f"{angle_name}: {base.headline or base.title}",
                body_copy=copy_snippet,
                call_to_action=cta,
                hashtags=base.hashtags,
                image_prompt=base.image_prompt,
                generated_media_url=base.generated_media_url,
                status="draft",
                provider_source=f"Campaign Variant Generator ({angle_key})",
                version=base.version + 1,
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow(),
            )
            variant_asset.angle = angle_key
            db.add(variant_asset)
            created_variants.append(variant_asset)

        db.commit()
        for v in created_variants:
            db.refresh(v)
        return created_variants

    @classmethod
    def attach_asset(
        cls,
        db: Session,
        principal: Principal,
        campaign_id: str,
        media_asset_id: str,
        content_asset_id: Optional[str] = None,
    ) -> MediaAsset:
        campaign = AuthorizationService.owned_campaign(db, principal, campaign_id)
        media = AuthorizationService.owned_media_asset(db, principal, media_asset_id)

        media.campaign_id = campaign.id
        if content_asset_id:
            content = (
                db.query(ContentAsset)
                .filter(
                    ContentAsset.id == content_asset_id,
                    ContentAsset.campaign_id == campaign.id,
                )
                .first()
            )
            if content:
                media.content_asset_id = content_asset_id
                content.generated_media_url = media.media_url

        # Add to linked_assets dictionary on campaign
        linked = dict(campaign.linked_assets or {})
        linked[media.id] = {
            "media_url": media.media_url,
            "asset_type": media.asset_type,
            "attached_at": datetime.datetime.utcnow().isoformat(),
        }
        campaign.linked_assets = linked

        db.commit()
        db.refresh(media)
        return media

    # -------------------------------------------------------------------------
    # State Machine Approval Transitions
    # -------------------------------------------------------------------------
    @classmethod
    def transition_status(
        cls,
        db: Session,
        principal: Principal,
        campaign_id: str,
        new_status: str,
        action: str,
        comment: Optional[str] = None,
    ) -> Campaign:
        campaign = AuthorizationService.owned_campaign(db, principal, campaign_id)
        from_status = campaign.status.lower()
        target_status = new_status.lower()

        allowed = VALID_TRANSITIONS.get(from_status, [])
        if target_status not in allowed and target_status != from_status:
            raise CampaignStateError(
                f"Invalid transition from '{from_status}' to '{target_status}'. "
                f"Permitted next states: {allowed}"
            )

        campaign.status = target_status
        if target_status in ("rejected", "revision_requested"):
            campaign.rejection_reason = comment or "Revision requested by campaign reviewer."
        elif target_status in ("draft", "approved", "planning"):
            campaign.rejection_reason = None

        campaign.updated_at = datetime.datetime.utcnow()

        history = CampaignApprovalHistory(
            id=f"cah-{uuid.uuid4().hex[:12]}",
            campaign_id=campaign.id,
            workspace_id=principal.workspace_id,
            actor_id=principal.subject_id,
            action=action,
            from_status=from_status,
            to_status=target_status,
            comment=comment or f"Campaign status transitioned from {from_status} to {target_status}.",
            created_at=datetime.datetime.utcnow(),
        )
        db.add(history)

        db.commit()
        db.refresh(campaign)
        return campaign

    @classmethod
    def submit_for_review(
        cls,
        db: Session,
        principal: Principal,
        campaign_id: str,
        comment: Optional[str] = None,
    ) -> Campaign:
        # Pre-condition: check that campaign has a brief or at least one content asset
        campaign = AuthorizationService.owned_campaign(db, principal, campaign_id)
        content_count = (
            db.query(ContentAsset)
            .filter(ContentAsset.campaign_id == campaign.id, ContentAsset.workspace_id == principal.workspace_id)
            .count()
        )
        if not campaign.brief and content_count == 0:
            raise MediaValidationError("Cannot submit campaign for review without a campaign brief or creative content.")

        return cls.transition_status(
            db,
            principal,
            campaign_id,
            new_status="pending_review",
            action="submit_for_review",
            comment=comment or "Campaign submitted for stakeholder and compliance review.",
        )

    @classmethod
    def approve_campaign(
        cls,
        db: Session,
        principal: Principal,
        campaign_id: str,
        comment: Optional[str] = None,
    ) -> Campaign:
        return cls.transition_status(
            db,
            principal,
            campaign_id,
            new_status="approved",
            action="approve",
            comment=comment or "Campaign approved for staging.",
        )

    @classmethod
    def reject_campaign(
        cls,
        db: Session,
        principal: Principal,
        campaign_id: str,
        comment: Optional[str] = None,
    ) -> Campaign:
        if not comment or not comment.strip():
            raise MediaValidationError("A specific rejection reason comment is required.")

        return cls.transition_status(
            db,
            principal,
            campaign_id,
            new_status="rejected",
            action="reject",
            comment=comment,
        )

    @classmethod
    def request_revision(
        cls,
        db: Session,
        principal: Principal,
        campaign_id: str,
        comment: Optional[str] = None,
    ) -> Campaign:
        if not comment or not comment.strip():
            raise MediaValidationError("Revision feedback details are required.")

        return cls.transition_status(
            db,
            principal,
            campaign_id,
            new_status="draft",
            action="revision_requested",
            comment=comment,
        )

    @classmethod
    def mark_ready_to_publish(
        cls,
        db: Session,
        principal: Principal,
        campaign_id: str,
        comment: Optional[str] = None,
    ) -> Campaign:
        # User constraint: If no live external integration exists, stop at ready_to_publish
        return cls.transition_status(
            db,
            principal,
            campaign_id,
            new_status="ready_to_publish",
            action="ready_to_publish",
            comment=(
                comment
                or "Campaign marked Ready to Publish. Awaiting live ad account integration authorization."
            ),
        )

    @classmethod
    def get_approval_history(
        cls,
        db: Session,
        principal: Principal,
        campaign_id: str,
    ) -> List[CampaignApprovalHistory]:
        AuthorizationService.owned_campaign(db, principal, campaign_id)
        return (
            db.query(CampaignApprovalHistory)
            .filter(
                CampaignApprovalHistory.campaign_id == campaign_id,
                CampaignApprovalHistory.workspace_id == principal.workspace_id,
            )
            .order_by(CampaignApprovalHistory.created_at.desc())
            .all()
        )

    # -------------------------------------------------------------------------
    # Calendar & Scheduling
    # -------------------------------------------------------------------------
    @classmethod
    def get_calendar_entries(
        cls,
        db: Session,
        principal: Principal,
        *,
        campaign_id: Optional[str] = None,
        brand_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = (
            db.query(ContentSchedule, ContentAsset, Campaign)
            .join(ContentAsset, ContentSchedule.asset_id == ContentAsset.id)
            .outerjoin(Campaign, ContentAsset.campaign_id == Campaign.id)
            .filter(ContentAsset.workspace_id == principal.workspace_id)
        )
        if campaign_id:
            query = query.filter(ContentAsset.campaign_id == campaign_id)
        if brand_id:
            query = query.filter(ContentAsset.brand_id == brand_id)

        records = query.order_by(ContentSchedule.scheduled_time.asc()).all()

        # Collect unique brand IDs
        brand_ids = {asset.brand_id for _, asset, _ in records if asset.brand_id}
        brand_map = {}
        if brand_ids:
            brands = db.query(BrandProfile).filter(BrandProfile.id.in_(list(brand_ids))).all()
            brand_map = {b.id: b.name for b in brands}

        results = []
        for sched, asset, camp in records:
            b_name = brand_map.get(asset.brand_id, camp.name if camp else asset.brand_id)
            results.append({
                "id": sched.id,
                "schedule_id": sched.id,
                "asset_id": asset.id,
                "content_asset_id": asset.id,
                "campaign_id": camp.id if camp else None,
                "campaign_name": camp.name if camp else "Direct Content Schedule",
                "brand_id": asset.brand_id,
                "brand_name": b_name,
                "channel": sched.channel or asset.channel,
                "title": asset.title,
                "headline": asset.headline or asset.title,
                "content_snippet": (asset.content or "")[:120],
                "scheduled_time": sched.scheduled_time,
                "status": sched.status,
                "is_simulated": sched.is_simulated,
                "media_url": asset.generated_media_url,
            })
        return results

    @classmethod
    def reschedule_calendar_entry(
        cls,
        db: Session,
        principal: Principal,
        schedule_id: str,
        new_time_iso: str,
    ) -> ContentSchedule:
        cls._validate_iso_time(new_time_iso)
        sched = (
            db.query(ContentSchedule)
            .join(ContentAsset, ContentSchedule.asset_id == ContentAsset.id)
            .filter(
                (ContentSchedule.id == schedule_id) | (ContentSchedule.asset_id == schedule_id),
                ContentAsset.workspace_id == principal.workspace_id,
            )
            .first()
        )
        if not sched:
            raise AuthorizationService._not_found()

        sched.scheduled_time = new_time_iso
        sched.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(sched)
        return sched

    # -------------------------------------------------------------------------
    # Helper Validation
    # -------------------------------------------------------------------------
    @staticmethod
    def _validate_claim_guardrails(*texts: Any) -> None:
        flat_texts: List[str] = []
        for t in texts:
            if not t:
                continue
            if isinstance(t, (list, tuple, set)):
                for sub in t:
                    if sub and isinstance(sub, str):
                        flat_texts.append(sub)
                    elif sub:
                        flat_texts.append(str(sub))
            elif isinstance(t, str):
                flat_texts.append(t)
            else:
                flat_texts.append(str(t))

        for text_item in flat_texts:
            is_safe, violations = GuardrailsService.validate_claims(text_item)
            if not is_safe:
                raise MediaValidationError(
                    f"Content contains prohibited health or medical claims: {', '.join(violations)}"
                )

    @staticmethod
    def _validate_iso_time(time_str: str) -> None:
        try:
            # Check ISO format
            datetime.datetime.fromisoformat(time_str.replace("Z", "+00:00"))
        except Exception as exc:
            raise MediaValidationError(f"Invalid scheduled time format. Must be valid ISO-8601: {exc}") from exc
