import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from app.database import Base


class VideoJob(Base):
    """Durable record for an asynchronous AI video generation job."""

    __tablename__ = "video_jobs"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    brand_id = Column(String, ForeignKey("brand_profiles.id"), nullable=False, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=True, index=True)
    source_asset_id = Column(String, ForeignKey("media_assets.id"), nullable=True, index=True)
    output_media_id = Column(String, ForeignKey("media_assets.id"), nullable=True, index=True)

    provider = Column(String, nullable=False, default="demo_mode")
    provider_model = Column(String, nullable=False, default="demo-video-v1")
    provider_job_id = Column(String, nullable=True, index=True)

    # Lifecycle: queued -> processing -> completed | failed | cancelled
    status = Column(String, nullable=False, default="queued", index=True)
    progress_percent = Column(Integer, nullable=True)

    prompt = Column(Text, nullable=False)
    script = Column(Text, nullable=True)
    template_id = Column(String, nullable=False, default="product_hero")
    language = Column(String, nullable=False, default="English")
    aspect_ratio = Column(String, nullable=False, default="9:16")
    duration_seconds = Column(Integer, nullable=False, default=8)

    settings_json = Column(Text, nullable=True)
    error_details = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    @property
    def output_media_url(self) -> str | None:
        if self.output_media_id:
            return f"/api/media/{self.output_media_id}"
        return None

    @property
    def is_demo(self) -> bool:
        return self.provider == "demo_mode"
