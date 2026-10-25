import uuid
import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.brand import BrandProfile
from app.schemas.brand import BrandProfileCreate, BrandProfileUpdate, WebsiteIngestResponse
from app.services.scraper_service import SafeScraperService


class BrandService:
    @staticmethod
    def get_or_create_default_brand(db: Session) -> BrandProfile:
        brand = db.query(BrandProfile).filter(BrandProfile.id == "herbally-brand").first()
        if not brand:
            brand = BrandProfile(
                id="herbally-brand",
                name="Herbally",
                industry="Herbal Textiles & Sleep Wellness",
                description="Herbally crafts 100% GOTS organic cotton bedsheets infused with natural botanical Neem extracts for restorative, skin-conscious sleep.",
                website_url="https://herbally.in",
                target_audience="Holistic wellness seekers, eco-conscious homeowners, and high-performance urban professionals in Tier-1 metros.",
                marketing_objectives=["Increase online D2C conversions", "Build organic social engagement", "Position as sleep wellness category leader"],
                preferred_channels=["Instagram", "Meta Ads", "Google Search", "Email", "Blog SEO"],
                brand_voice="Grounded, premium, evidence-backed, serene, and authentically Ayurvedic without exaggerated claims.",
                brand_colors={"primary": "#10b981", "secondary": "#064e3b", "accent": "#f59e0b", "background": "#0b0f19"},
                brand_guidelines="Always emphasize 100% GOTS certified organic cotton and pure Neem extract wash. Never claim to cure eczema, treat insomnia, or make medical guarantees.",
                factual_claims=[
                    "100% GOTS certified organic cotton",
                    "Natural botanical Neem extract wash",
                    "300 Thread Count sateen weave",
                    "Hypoallergenic & breathable",
                    "Ethically sourced & crafted in India"
                ],
                prohibited_claims=[
                    "Cures eczema",
                    "Treats chronic insomnia",
                    "Clinically proven medical therapy",
                    "Guarantees permanent acne cure"
                ]
            )
            db.add(brand)
            db.commit()
            db.refresh(brand)
        return brand

    @staticmethod
    def list_brands(db: Session) -> List[BrandProfile]:
        brands = db.query(BrandProfile).all()
        if not brands:
            default = BrandService.get_or_create_default_brand(db)
            return [default]
        return brands

    @staticmethod
    def get_brand(db: Session, brand_id: str) -> Optional[BrandProfile]:
        return db.query(BrandProfile).filter(BrandProfile.id == brand_id).first()

    @staticmethod
    def create_brand(db: Session, data: BrandProfileCreate) -> BrandProfile:
        brand_id = data.id or f"brand-{uuid.uuid4().hex[:8]}"
        brand = BrandProfile(
            id=brand_id,
            name=data.name,
            industry=data.industry,
            description=data.description,
            website_url=data.website_url,
            target_audience=data.target_audience,
            marketing_objectives=data.marketing_objectives,
            preferred_channels=data.preferred_channels,
            brand_voice=data.brand_voice,
            brand_colors=data.brand_colors,
            logo_url=data.logo_url,
            brand_guidelines=data.brand_guidelines,
            factual_claims=data.factual_claims,
            prohibited_claims=data.prohibited_claims
        )
        db.add(brand)
        db.commit()
        db.refresh(brand)
        return brand

    @staticmethod
    def update_brand(db: Session, brand_id: str, data: BrandProfileUpdate) -> Optional[BrandProfile]:
        brand = db.query(BrandProfile).filter(BrandProfile.id == brand_id).first()
        if not brand:
            return None

        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(brand, key, value)

        brand.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(brand)
        return brand

    @staticmethod
    def ingest_website(url: str) -> WebsiteIngestResponse:
        data = SafeScraperService.extract_website_context(url)
        return WebsiteIngestResponse(
            url=data["url"],
            title=data.get("title", ""),
            description=data.get("description", ""),
            extracted_text=data.get("extracted_text", ""),
            status=data.get("status", "success")
        )
