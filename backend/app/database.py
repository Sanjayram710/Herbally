from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# In SQLite, enable connect_args for multithreading
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    # The project predates a migration framework. Keep upgrades additive and
    # idempotent so existing SQLite data is never dropped or reset.
    existing_columns = {
        ("brand_profiles", "workspace_id"): "VARCHAR",
        ("brand_profiles", "geographic_market"): "VARCHAR",
        ("brand_profiles", "preferred_language"): "VARCHAR",
        ("brand_profiles", "budget_range"): "VARCHAR",
        ("products", "workspace_id"): "VARCHAR",
        ("products", "brand_id"): "VARCHAR",
        ("products", "image_url"): "VARCHAR",
        ("media_assets", "workspace_id"): "VARCHAR",
        ("media_assets", "brand_id"): "VARCHAR",
        ("media_assets", "product_id"): "VARCHAR",
        ("media_assets", "source_asset_id"): "VARCHAR",
        ("media_assets", "asset_type"): "VARCHAR",
        ("media_assets", "style_preset"): "VARCHAR",
        ("media_assets", "aspect_ratio"): "VARCHAR",
        ("media_assets", "metadata_json"): "TEXT",
        ("workflow_runs", "workspace_id"): "VARCHAR",
        ("automation_rules", "workspace_id"): "VARCHAR",
        ("automation_executions", "workspace_id"): "VARCHAR",
        ("integration_configs", "workspace_id"): "VARCHAR",
        ("integration_configs", "connector_key"): "VARCHAR",
        ("video_jobs", "workspace_id"): "VARCHAR",
        ("video_jobs", "brand_id"): "VARCHAR",
        ("video_jobs", "product_id"): "VARCHAR",
        ("video_jobs", "source_asset_id"): "VARCHAR",
        ("video_jobs", "output_media_id"): "VARCHAR",
        ("campaigns", "workspace_id"): "VARCHAR",
        ("campaigns", "brand_id"): "VARCHAR",
        ("campaigns", "description"): "TEXT",
        ("campaigns", "customer_segment"): "VARCHAR",
        ("campaigns", "geographic_target"): "VARCHAR",
        ("campaigns", "channels"): "JSON",
        ("campaigns", "start_date"): "DATETIME",
        ("campaigns", "end_date"): "DATETIME",
        ("campaigns", "currency"): "VARCHAR",
        ("campaigns", "content_frequency"): "VARCHAR",
        ("campaigns", "preferred_publishing_windows"): "JSON",
        ("campaigns", "primary_kpi"): "VARCHAR",
        ("campaigns", "secondary_kpis"): "JSON",
        ("campaigns", "brief"): "TEXT",
        ("campaigns", "key_messages"): "JSON",
        ("campaigns", "offer"): "VARCHAR",
        ("campaigns", "cta"): "VARCHAR",
        ("campaigns", "brand_constraints"): "TEXT",
        ("campaigns", "strategy_recommendation"): "JSON",
        ("campaigns", "rejection_reason"): "TEXT",
        ("content_assets", "workspace_id"): "VARCHAR",
    }
    inspector = inspect(engine)
    with engine.begin() as connection:
        for (table_name, column_name), column_type in existing_columns.items():
            if table_name in inspector.get_table_names():
                names = {column["name"] for column in inspector.get_columns(table_name)}
                if column_name not in names:
                    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))
        # A non-destructive index permits one configuration for each connector
        # in each workspace. Existing rows are backfilled during startup.
        if "integration_configs" in inspector.get_table_names():
            connection.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_workspace_connector "
                    "ON integration_configs (workspace_id, connector_key)"
                )
            )
