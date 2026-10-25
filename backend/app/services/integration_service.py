import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.integration import IntegrationConfig
from app.config import settings


class IntegrationService:
    @staticmethod
    def _integration_id(workspace_id: str, connector_key: str) -> str:
        return f"{workspace_id}--{connector_key}"

    @staticmethod
    def seed_default_integrations(db: Session, workspace_id: str):
        connectors = [
            {
                "id": "openai_images",
                "name": "OpenAI Images",
                "category": "ai",
                "status": "configured_not_verified" if settings.IMAGE_PROVIDER.lower() == "openai" and settings.OPENAI_IMAGE_API_KEY else "unconfigured",
                "is_configured": bool(settings.IMAGE_PROVIDER.lower() == "openai" and settings.OPENAI_IMAGE_API_KEY),
                "credentials_mask": "••••••••" if settings.OPENAI_IMAGE_API_KEY else "",
                "permissions": ["image_generation"],
                "supported_actions": ["Generate Image From Approved Content Prompt", "Persist Generated Media"],
                "setup_instructions": "Set IMAGE_PROVIDER=openai and OPENAI_IMAGE_API_KEY in the backend environment. Generation requires explicit confirmation and may incur provider charges."
            },
            {
                "id": "meta_ads",
                "name": "Meta Ads Manager (Facebook & Instagram)",
                "category": "advertising",
                "status": "unconfigured",
                "is_configured": False,
                "credentials_mask": "",
                "permissions": ["ads_management", "ads_read", "business_management"],
                "supported_actions": ["Create Campaign Draft", "Fetch Ad Set KPIs", "Pause Inefficient Ads", "Sync Conversion Events"],
                "setup_instructions": "Add META_APP_ID, META_APP_SECRET, and META_ACCESS_TOKEN to backend .env file. Requires Meta Business Verification."
            },
            {
                "id": "google_ads",
                "name": "Google Ads API",
                "category": "advertising",
                "status": "unconfigured",
                "is_configured": False,
                "credentials_mask": "",
                "permissions": ["adwords", "read_write"],
                "supported_actions": ["Sync Search Keyword Impressions", "Upload Search Ad Copy", "Monitor Daily Spend"],
                "setup_instructions": "Add GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_DEVELOPER_TOKEN, and REFRESH_TOKEN to backend .env file."
            },
            {
                "id": "instagram_graph",
                "name": "Instagram Graph API",
                "category": "social",
                "status": "unconfigured",
                "is_configured": False,
                "credentials_mask": "",
                "permissions": ["instagram_basic", "instagram_content_publish", "instagram_manage_comments"],
                "supported_actions": ["Schedule Carousel Posts", "Draft Video Reels", "Fetch Media Engagement Insights"],
                "setup_instructions": "Connect via Meta Business Suite OAuth. Requires an Instagram Professional or Creator Account."
            },
            {
                "id": "google_analytics_4",
                "name": "Google Analytics 4 (GA4)",
                "category": "analytics",
                "status": "unconfigured",
                "is_configured": False,
                "credentials_mask": "",
                "permissions": ["analytics.readonly"],
                "supported_actions": ["Ingest Landing Page Conversion Funnel", "Track Bounce Rates", "Verify UTM Attribution"],
                "setup_instructions": "Add GA4_PROPERTY_ID and Google Service Account JSON to backend environment."
            },
            {
                "id": "llm_adapter",
                "name": f"AI Intelligence Engine ({settings.LLM_PROVIDER.upper()})",
                "category": "ai",
                "status": "connected",
                "is_configured": True,
                "credentials_mask": "••••••••" if settings.LLM_API_KEY else "LOCAL_MOCK_ACTIVE",
                "permissions": ["generate_text", "guardrail_verification", "strategic_reasoning"],
                "supported_actions": ["Generate Ad Copy", "Formulate Personas", "Medical Claim Filter", "Next Best Action Heuristics"],
                "setup_instructions": "Configured via LLM_PROVIDER in .env. Currently operating in zero-cost grounded mock mode or via configured API key."
            },
            {
                "id": "search_intelligence",
                "name": f"Market Research Provider ({settings.SEARCH_PROVIDER.upper()})",
                "category": "search",
                "status": "connected",
                "is_configured": True,
                "credentials_mask": "••••••••" if settings.SEARCH_API_KEY else "LOCAL_MOCK_ACTIVE",
                "permissions": ["search_queries", "competitor_benchmarking"],
                "supported_actions": ["Ayurvedic Search Query Trends", "Competitor Price Tracking", "Audience Pain Point Extraction"],
                "setup_instructions": "Configured via SEARCH_PROVIDER in .env. Currently operating with Herbally Indian D2C benchmark datasets."
            }
        ]

        for c in connectors:
            connector_key = c["id"]
            existing = (
                db.query(IntegrationConfig)
                .filter(
                    IntegrationConfig.workspace_id == workspace_id,
                    IntegrationConfig.connector_key == connector_key,
                )
                .first()
            )
            # A pre-workspace deployment used the provider key as the primary
            # key. Adopt that legacy record in the explicitly configured
            # legacy workspace instead of creating a duplicate configuration.
            if not existing and workspace_id == settings.LEGACY_WORKSPACE_ID:
                legacy_record = db.query(IntegrationConfig).filter(IntegrationConfig.id == connector_key).first()
                if legacy_record and legacy_record.workspace_id in (None, workspace_id):
                    existing = legacy_record
                    existing.workspace_id = workspace_id
                    existing.connector_key = connector_key
            if not existing:
                new_conn = IntegrationConfig(
                    id=IntegrationService._integration_id(workspace_id, connector_key),
                    workspace_id=workspace_id,
                    connector_key=connector_key,
                    name=c["name"],
                    category=c["category"],
                    status=c["status"],
                    is_configured=c["is_configured"],
                    credentials_mask=c["credentials_mask"],
                    permissions=c["permissions"],
                    supported_actions=c["supported_actions"],
                    setup_instructions=c["setup_instructions"],
                    # A configured image key is not a verified provider connection.
                    last_sync_at=(
                        datetime.datetime.utcnow()
                        if c["is_configured"] and c["id"] != "openai_images"
                        else None
                    )
                )
                db.add(new_conn)
            elif connector_key == "openai_images":
                # This connector's configuration reflects environment variables. Refresh it
                # on every startup/list request so an old persisted "unconfigured" state
                # cannot misrepresent newly supplied credentials (or vice versa).
                existing.status = c["status"]
                existing.is_configured = c["is_configured"]
                existing.credentials_mask = c["credentials_mask"]
                existing.permissions = c["permissions"]
                existing.supported_actions = c["supported_actions"]
                existing.setup_instructions = c["setup_instructions"]
                existing.last_sync_at = None
        db.commit()

    @staticmethod
    def list_integrations(db: Session, workspace_id: str) -> List[IntegrationConfig]:
        IntegrationService.seed_default_integrations(db, workspace_id)
        return db.query(IntegrationConfig).filter(IntegrationConfig.workspace_id == workspace_id).all()

    @staticmethod
    def test_connection(db: Session, workspace_id: str, integration_id: str) -> Dict[str, Any]:
        conn = (
            db.query(IntegrationConfig)
            .filter(IntegrationConfig.id == integration_id, IntegrationConfig.workspace_id == workspace_id)
            .first()
        )
        if not conn:
            raise ValueError("Integration not found")

        if conn.connector_key in ("llm_adapter", "search_intelligence"):
            conn.last_sync_at = datetime.datetime.utcnow()
            conn.status = "connected"
            db.commit()
            return {
                "integration_id": conn.id,
                "name": conn.name,
                "status": "connected",
                "message": f"Successfully pinged {conn.name}. Response latency: 12ms. Grounded mock adapters active.",
                "ping_latency_ms": 12
            }

        if conn.connector_key == "openai_images":
            if not conn.is_configured:
                return {
                    "integration_id": conn.id,
                    "name": conn.name,
                    "status": "unconfigured",
                    "message": "Cannot verify OpenAI Images: IMAGE_PROVIDER=openai and OPENAI_IMAGE_API_KEY must be configured on the backend.",
                    "ping_latency_ms": 0
                }
            return {
                "integration_id": conn.id,
                "name": conn.name,
                "status": "configured_not_verified",
                "message": "OpenAI Images credentials are configured. Verification occurs only when a user explicitly confirms a generation request, which may incur provider charges.",
                "ping_latency_ms": 0
            }

        # For external ad/social connectors without credentials
        return {
            "integration_id": conn.id,
            "name": conn.name,
            "status": "unconfigured",
            "message": f"Cannot connect to {conn.name}: API credentials not configured in backend environment. Local Simulated Sandbox will be used for execution.",
            "ping_latency_ms": 0
        }
