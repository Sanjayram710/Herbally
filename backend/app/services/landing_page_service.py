import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.landing_page import LandingPageDraft


class LandingPageService:
    @staticmethod
    def get_or_create_draft(db: Session, brand_id: str = "herbally-brand") -> LandingPageDraft:
        page = db.query(LandingPageDraft).filter(LandingPageDraft.brand_id == brand_id).first()
        if not page:
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
