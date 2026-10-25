import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class AssistantMessageCreate(BaseModel):
    brand_id: str = "herbally-brand"
    content: str


class AssistantMessageRead(BaseModel):
    id: str
    brand_id: str
    role: str
    content: str
    tool_called: Optional[str] = None
    tool_result: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class AssistantResponse(BaseModel):
    user_message: AssistantMessageRead
    assistant_message: AssistantMessageRead
    action_performed: Optional[str] = None
    result_data: Optional[Dict[str, Any]] = None
