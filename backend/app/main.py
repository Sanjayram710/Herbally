import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db, SessionLocal
from app.models import Product
from app.api.routes import router


def seed_sample_products():
    """Seeds default Herbally product and core brand data if not already seeded."""
    db = SessionLocal()
    try:
        sample_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "sample_products.json")
        if os.path.exists(sample_path):
            with open(sample_path, "r", encoding="utf-8") as f:
                products = json.load(f)
                for p in products:
                    existing = db.query(Product).filter(Product.id == p["id"]).first()
                    if not existing:
                        new_prod = Product(
                            id=p["id"],
                            name=p["name"],
                            brand=p.get("brand", "Herbally"),
                            category=p.get("category"),
                            price_inr=p.get("price_inr"),
                            description=p.get("description", ""),
                            verified_features=p.get("verified_features", []),
                            explicitly_supported_benefits=p.get("explicitly_supported_benefits", []),
                            prohibited_medical_claims=p.get("prohibited_medical_claims", []),
                            official_url=p.get("official_url")
                        )
                        db.add(new_prod)
                db.commit()

        # Seed brand profile, automations, integrations, customer messages & landing page
        from app.services.brand_service import BrandService
        from app.services.automation_service import AutomationService
        from app.services.integration_service import IntegrationService
        from app.services.customer_message_service import CustomerMessageService
        from app.services.landing_page_service import LandingPageService

        BrandService.get_or_create_default_brand(db)
        AutomationService.seed_default_rules(db)
        IntegrationService.seed_default_integrations(db)
        CustomerMessageService.seed_sample_messages(db)
        LandingPageService.get_or_create_draft(db)

    except Exception as e:
        print(f"Warning: Failed to seed sample data: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB tables & seed initial demo data
    init_db()
    seed_sample_products()
    yield
    # Shutdown logic if any


# Initialize DB and seed initial demo data on module import
init_db()
seed_sample_products()

app = FastAPI(
    title="AI-Powered Digital Marketing Strategist & Optimization Agent",
    description="Agentic digital marketing planning, audience intelligence, deterministic analytics, and Next Best Action engine.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vite application
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local development on any port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {
        "status": "online",
        "system": "AI-Powered Digital Marketing Strategist & Optimization Agent",
        "version": "1.0.0",
        "docs_url": "/docs"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
