import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class AutomationRuleRead(BaseModel):
    id: str
    name: str
    description: str
    trigger_type: str
    action_type: str
    frequency: str
    is_enabled: bool
    config: Dict[str, Any] = Field(default_factory=dict)
    last_run_at: Optional[datetime.datetime] = None
    created_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class AutomationRuleToggle(BaseModel):
    is_enabled: bool


class AutomationExecutionRead(BaseModel):
    id: str
    rule_id: str
    rule_name: str
    status: str
    details: str
    error_message: Optional[str] = None
    executed_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True
