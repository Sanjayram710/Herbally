import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class AutomationRuleRead(BaseModel):
    id: str
    workspace_id: Optional[str] = None
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


class AutomationRuleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=1000)
    trigger_type: str = Field(min_length=1, max_length=100)
    action_type: str = Field(min_length=1, max_length=100)
    frequency: str = Field(default="Manual", max_length=100)
    is_enabled: bool = True
    config: Dict[str, Any] = Field(default_factory=dict)


class AutomationRuleUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, min_length=1, max_length=1000)
    trigger_type: Optional[str] = Field(default=None, min_length=1, max_length=100)
    action_type: Optional[str] = Field(default=None, min_length=1, max_length=100)
    frequency: Optional[str] = Field(default=None, max_length=100)
    is_enabled: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None


class AutomationExecutionRead(BaseModel):
    id: str
    workspace_id: Optional[str] = None
    rule_id: str
    rule_name: str
    status: str
    details: str
    error_message: Optional[str] = None
    executed_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True
