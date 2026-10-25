import datetime
from sqlalchemy import Column, String, Text, JSON, DateTime
from app.database import Base


class BrandProfile(Base):
    __tablename__ = "brand_profiles"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, default="Herbally")
    industry = Column(String, nullable=False, default="Herbal Textiles & Sleep Wellness")
    description = Column(Text, nullable=False, default="Herbally crafts 100% GOTS organic cotton bedsheets infused with natural botanical Neem extracts for restorative, skin-conscious sleep.")
    website_url = Column(String, nullable=True, default="https://herbally.in")
    target_audience = Column(String, nullable=False, default="Holistic wellness seekers, eco-conscious homeowners, and high-performance urban professionals in Tier-1 metros.")
    marketing_objectives = Column(JSON, default=lambda: ["Increase online D2C conversions", "Build organic social engagement", "Position as sleep wellness category leader"])
    preferred_channels = Column(JSON, default=lambda: ["Instagram", "Meta Ads", "Google Search", "Email", "Blog SEO"])
    brand_voice = Column(String, default="Grounded, premium, evidence-backed, serene, and authentically Ayurvedic without exaggerated claims.")
    brand_colors = Column(JSON, default=lambda: {"primary": "#10b981", "secondary": "#064e3b", "accent": "#f59e0b", "background": "#0b0f19"})
    logo_url = Column(String, nullable=True)
    brand_guidelines = Column(Text, default="Always emphasize 100% GOTS certified organic cotton and pure Neem extract wash. Never claim to cure eczema, treat insomnia, or make medical guarantees.")
    factual_claims = Column(JSON, default=lambda: [
        "100% GOTS certified organic cotton",
        "Natural botanical Neem extract wash",
        "300 Thread Count sateen weave",
        "Hypoallergenic & breathable",
        "Ethically sourced & crafted in India"
    ])
    prohibited_claims = Column(JSON, default=lambda: [
        "Cures eczema",
        "Treats chronic insomnia",
        "Clinically proven medical therapy",
        "Guarantees permanent acne cure"
    ])
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
