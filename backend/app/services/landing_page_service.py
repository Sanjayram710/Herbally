import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.landing_page import LandingPageDraft


class LandingPageService:
    @staticmethod
    def get_or_create_draft(db: Session, brand_id: str = "herbally-brand") -> LandingPageDraft:
        from app.models.brand import BrandProfile
        page = db.query(LandingPageDraft).filter(LandingPageDraft.brand_id == brand_id).first()
        if not page:
            if brand_id == "herbally-brand":
                page = LandingPageDraft(
                    id="lp-herbally-main",
                    brand_id=brand_id,
                    title="Herbally Pure Neem Infused Organic Bedsheet",
                    hero_headline="Pure 100% Organic Cotton Infused with Ancient Botanical Neem",
                    hero_subheadline="Crafted for skin-conscious rest, natural breathability, and Ayurvedic sleep wellness. No synthetic polyesters, no harsh chemical finishes.",
                    value_props=[
                        {"title": "100% GOTS Certified Cotton", "description": "Lustrous 300 Thread Count sateen weave grown sustainably without pesticides."},
                        {"title": "Botanical Neem Wash", "description": "Bathed in natural Neem extract for skin-soothing, cooling sleep."},
                        {"title": "Cooling & Hypoallergenic", "description": "Engineered for hot Indian nights, naturally resistant to dust and sweat buildup."}
                    ],
                    call_to_action="Experience Restorative Rest — Order Herbally Today",
                    seo_title="Herbally Pure Neem Bedding | Ayurvedic Sleep Wellness",
                    seo_description="Discover India's premier organic Neem-infused cotton bedsheets. 100% GOTS certified, hypoallergenic, and soothing for sensitive skin.",
                    status="draft"
                )
            else:
                brand = db.query(BrandProfile).filter(BrandProfile.id == brand_id).first()
                bname = brand.name if brand else "Brand"
                bindustry = brand.industry if brand else "E-commerce"
                bdesc = (brand.description if brand and brand.description else f"Official experience for {bname}.")
                page = LandingPageDraft(
                    id=f"lp-{brand_id}",
                    brand_id=brand_id,
                    title=f"{bname} — Official Experience",
                    hero_headline=f"Welcome to {bname}",
                    hero_subheadline=bdesc,
                    value_props=[
                        {"title": "Premium Quality", "description": f"Crafted with top-tier standards for modern {bindustry} consumers."},
                        {"title": "Verified Performance", "description": "Engineered for excellence and customer satisfaction."},
                        {"title": "Direct Guarantee", "description": "Authentic items shipped directly to your door."}
                    ],
                    call_to_action=f"Discover {bname} Today",
                    seo_title=f"{bname} | Premium {bindustry}",
                    seo_description=bdesc[:150],
                    status="draft"
                )
            db.add(page)
            db.commit()
            db.refresh(page)
        return page

    @staticmethod
    def update_draft(db: Session, brand_id: str, updates: Dict[str, Any]) -> LandingPageDraft:
        page = LandingPageService.get_or_create_draft(db, brand_id)
        for key, val in updates.items():
            if hasattr(page, key):
                setattr(page, key, val)
        page.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(page)
        return page
