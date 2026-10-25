import uuid
import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models.brand import BrandProfile
from app.models.product import Product
from app.schemas.brand import BrandProfileRead
from app.schemas.product import ProductRead
from app.schemas.onboarding import (
    UniversalOnboardingRequest,
    UniversalOnboardingResponse,
    OnboardingStatusResponse,
)
from app.services.scraper_service import SafeScraperService
from app.services.guardrails import GuardrailsService


class OnboardingService:
    @staticmethod
    def process_onboarding(
        db: Session,
        workspace_id: str,
        request: UniversalOnboardingRequest
    ) -> UniversalOnboardingResponse:
        # 1. Claim validation on all provided inputs
        text_to_check = (
            f"{request.business_name} "
            f"{request.initial_product_name or ''} "
            f"{request.flagship_product_name or ''} "
            f"{request.initial_product_description or ''} "
            f"{request.flagship_product_description or ''}"
        )
        is_safe, violations = GuardrailsService.validate_claims(text_to_check)
        if not is_safe:
            raise ValueError(f"Onboarding data contains prohibited assertions: {', '.join(violations)}")

        # 2. Optional website context extraction (SSRF-protected)
        extracted_description = ""
        if request.website_url:
            try:
                scraped = SafeScraperService.extract_website_context(request.website_url)
                if scraped and scraped.extracted_context:
                    extracted_description = scraped.extracted_context.get("description", "")
            except Exception:
                # Do not block onboarding if website scraping is rejected or unreachable
                pass

        # 3. Create or update brand scoped to current workspace
        existing_brand = (
            db.query(BrandProfile)
            .filter(
                BrandProfile.workspace_id == workspace_id,
                BrandProfile.name == request.business_name
            )
            .first()
        )

        final_description = (
            extracted_description
            or f"{request.business_name} offers premium products and services in the {request.industry} category."
        )

        target_audience = (
            request.target_audience
            or f"Customers and audiences seeking quality {request.industry} offerings in {request.geographic_market or 'target markets'}."
        )

        if existing_brand:
            brand = existing_brand
            brand.industry = request.industry
            brand.website_url = request.website_url
            brand.target_audience = target_audience
            brand.marketing_objectives = [request.marketing_goal]
            brand.preferred_channels = request.preferred_channels or ["Instagram", "Meta Ads", "Google Search"]
            brand.geographic_market = request.geographic_market or "India"
            brand.preferred_language = request.preferred_language or "English"
            brand.budget_range = request.budget_range
            brand.updated_at = datetime.datetime.utcnow()
        else:
            brand_id = f"brand-{uuid.uuid4().hex[:8]}"
            brand = BrandProfile(
                id=brand_id,
                workspace_id=workspace_id,
                name=request.business_name,
                industry=request.industry,
                description=final_description,
                website_url=request.website_url,
                target_audience=target_audience,
                marketing_objectives=[request.marketing_goal],
                preferred_channels=request.preferred_channels or ["Instagram", "Meta Ads", "Google Search"],
                brand_voice=f"Authentic, compelling, and professional for {request.industry}",
                brand_colors={"primary": "#3b82f6", "secondary": "#1d4ed8", "accent": "#f59e0b", "background": "#0b0f19"},
                factual_claims=[],
                prohibited_claims=[],
                geographic_market=request.geographic_market or "India",
                preferred_language=request.preferred_language or "English",
                budget_range=request.budget_range,
            )
            db.add(brand)

        db.commit()
        db.refresh(brand)

        # 4. Create initial flagship product if requested
        created_product: Optional[Product] = None
        prod_name = request.initial_product_name or request.flagship_product_name
        prod_desc = request.initial_product_description or request.flagship_product_description
        prod_price = request.initial_product_price or request.flagship_product_price
        prod_category = request.initial_product_category or brand.industry

        if prod_name:
            prod_id = f"prod-{uuid.uuid4().hex[:8]}"
            product = Product(
                id=prod_id,
                workspace_id=workspace_id,
                brand_id=brand.id,
                name=prod_name,
                brand=brand.name,
                category=prod_category,
                price_inr=prod_price or 1999.0,
                description=prod_desc or f"Core flagship offering from {brand.name} in {brand.industry}.",
                verified_features=[f"Engineered for {brand.industry} standards"],
                explicitly_supported_benefits=["Verified performance and customer satisfaction"],
                prohibited_medical_claims=[],
                official_url=request.website_url,
            )
            db.add(product)
            db.commit()
            db.refresh(product)
            created_product = product

        return UniversalOnboardingResponse(
            brand=BrandProfileRead.model_validate(brand),
            product=ProductRead.model_validate(created_product) if created_product else None,
            workspace_id=workspace_id,
            message="Business onboarding completed and brand workspace established.",
        )

    @staticmethod
    def get_status(db: Session, workspace_id: str) -> OnboardingStatusResponse:
        brands = (
            db.query(BrandProfile)
            .filter(BrandProfile.workspace_id == workspace_id)
            .all()
        )
        products = (
            db.query(Product)
            .filter(Product.workspace_id == workspace_id)
            .all()
        )
        primary_brand = brands[0] if brands else None

        return OnboardingStatusResponse(
            is_onboarded=len(brands) > 0,
            brand=BrandProfileRead.model_validate(primary_brand) if primary_brand else None,
            brands_count=len(brands),
            products_count=len(products),
            workspace_id=workspace_id,
        )
