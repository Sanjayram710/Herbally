from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class DashboardSummary(BaseModel):
    brand_id: str
    brand_name: str
    brand_industry: str
    active_campaigns_count: int = 0
    total_campaigns_count: int = 0
    content_counts: Dict[str, int] = Field(default_factory=lambda: {
        "draft": 0,
        "pending_approval": 0,
        "approved": 0,
        "scheduled": 0,
        "published_demo": 0,
        "failed": 0
    })
    pending_approvals: List[Dict[str, Any]] = Field(default_factory=list)
    recent_automations: List[Dict[str, Any]] = Field(default_factory=list)
    integration_health: Dict[str, Any] = Field(default_factory=dict)
    latest_kpi_summary: Optional[Dict[str, Any]] = None
    metric_provenance: str = "SIMULATED SANDBOX DATA (Pre-Launch Demo Mode)"
    next_best_action: Optional[Dict[str, Any]] = None
