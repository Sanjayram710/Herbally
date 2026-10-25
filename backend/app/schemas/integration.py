import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class IntegrationRead(BaseModel):
    id: str
    name: str
    category: str
    status: str
    is_configured: bool
    credentials_mask: str
    permissions: List[str] = Field(default_factory=list)
    supported_actions: List[str] = Field(default_factory=list)
    last_sync_at: Optional[datetime.datetime] = None
    error_message: Optional[str] = None
    setup_instructions: Optional[str] = None

    class Config:
        from_attributes = True


class IntegrationTestRequest(BaseModel):
    integration_id: str


class IntegrationTestResponse(BaseModel):
    integration_id: str
    name: str
    status: str
    message: str
    ping_latency_ms: int = 15
