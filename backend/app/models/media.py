import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.database import Base


class MediaAsset(Base):
    """Durable record for a provider-generated media file stored by this application."""

    __tablename__ = "media_assets"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True, index=True)
    brand_id = Column(String, ForeignKey("brand_profiles.id"), nullable=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=True, index=True)
    source_asset_id = Column(String, ForeignKey("media_assets.id"), nullable=True, index=True)
    content_asset_id = Column(String, ForeignKey("content_assets.id"), nullable=True, index=True)
    # Workflow campaign plans are currently persisted in WorkflowRun.state_snapshot,
    # so this remains a string instead of a foreign key to the legacy Campaign table.
    campaign_id = Column(String, nullable=True, index=True)

    asset_type = Column(String, nullable=True, default="image")
    style_preset = Column(String, nullable=True)
    aspect_ratio = Column(String, nullable=True, default="1:1")
    metadata_json = Column(Text, nullable=True)

    provider = Column(String, nullable=False)
    provider_model = Column(String, nullable=False)
    prompt = Column(Text, nullable=False)
    storage_key = Column(String, nullable=False, unique=True)
    media_url = Column(String, nullable=False, unique=True)
    mime_type = Column(String, nullable=False)
    byte_size = Column(Integer, nullable=False)
    checksum_sha256 = Column(String, nullable=False)
    status = Column(String, nullable=False, default="generated")

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
