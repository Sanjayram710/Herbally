import datetime
from sqlalchemy import Column, String, Text, JSON, DateTime
from app.database import Base


class LandingPageDraft(Base):
    __tablename__ = "landing_page_drafts"

    id = Column(String, primary_key=True, index=True)
    brand_id = Column(String, nullable=False, default="herbally-brand")
    title = Column(String, nullable=False, default="Herbally Neem Bedsheets - Clean Sleep")
    hero_headline = Column(String, nullable=False, default="Transform Your Sleep with 100% Organic Neem-Infused Comfort")
    hero_subheadline = Column(Text, nullable=False, default="Pure 300 Thread Count GOTS organic cotton meets ancient Ayurvedic botanical wash. Hypoallergenic, breathable, and crafted for restorative rest.")
    value_props = Column(JSON, default=lambda: [
        {"title": "100% GOTS Organic Cotton", "description": "Sustainably grown without harmful chemicals or pesticides."},
        {"title": "Botanical Neem Infusion", "description": "Naturally antibacterial and soothing for sensitive skin."},
        {"title": "Lustrous Sateen Weave", "description": "Cooling 300 TC weave designed for Indian climates."}
    ])
    call_to_action = Column(String, default="Order Herbally Neem Bedding - Free Shipping")
    seo_title = Column(String, default="Herbally Organic Neem Bedding | Natural Sleep Wellness")
    seo_description = Column(Text, default="Experience luxurious sleep with Herbally's certified organic cotton bedsheets infused with natural Neem extract.")
    status = Column(String, default="draft")  # draft | published_demo
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
