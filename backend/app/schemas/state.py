from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class EpistemicSource(BaseModel):
    category: str = Field(description="VERIFIED_FACT | RESEARCH_FINDING | AI_INFERENCE | MARKETING_SUGGESTION | ASSUMPTION | SIMULATED_DATA")
    description: str
    source_reference: Optional[str] = None
    confidence_level: Optional[str] = "HIGH"  # HIGH | MEDIUM | LOW


class AssumptionItem(BaseModel):
    category: str
    statement: str
    impact: str


class ErrorItem(BaseModel):
    agent_name: str
    error_message: str
    fallback_applied: str


class AgentRunTrace(BaseModel):
    step_name: str
    agent: str
    status: str = "completed"  # pending | running | completed | failed
    duration_ms: int = 0
    timestamp: str = ""


class ProductUnderstanding(BaseModel):
    product_name: str
    brand: str = "Herbally"
    category: str
    verified_features: List[str] = Field(default_factory=list)
    explicitly_supported_benefits: List[str] = Field(default_factory=list)
    prohibited_claims: List[str] = Field(default_factory=list)
    differentiators: List[str] = Field(default_factory=list)
    target_use_cases: List[str] = Field(default_factory=list)
    pricing_inr: Optional[float] = None
    sources: List[str] = Field(default_factory=list)


class MarketResearchItem(BaseModel):
    trend_title: str
    summary: str
    evidence_or_source: str
    opportunity_for_brand: str


class MarketResearchOutput(BaseModel):
    market_overview: str
    consumer_trends: List[MarketResearchItem] = Field(default_factory=list)
    pain_points: List[str] = Field(default_factory=list)
    is_sample_data: bool = True
    provider_source: str = "MockResearchProvider (Herbally Indian D2C Wellness Dataset)"


class CompetitorProfile(BaseModel):
    name: str
    positioning: str
    target_audience: str
    price_range: str
    channels: List[str] = Field(default_factory=list)
    content_style: str
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    opportunity_for_brand: str
    sources_and_assumptions: str


class TargetPersona(BaseModel):
    persona_name: str
    is_primary: bool = True
    demographics: str
    psychographics_and_lifestyle: str
    key_pain_points: List[str]
    buying_motivations: List[str]
    potential_objections: List[str]
    hook_messaging: str


class ChannelRecommendation(BaseModel):
    channel: str
    funnel_stage: str  # TOFU (Awareness) | MOFU (Consideration) | BOFU (Conversion)
    budget_share_pct: float
    budget_allocated_inr: float
    rationale_why: str


class StrategyOutput(BaseModel):
    positioning_statement: str
    core_value_proposition: str
    marketing_objectives: List[str]
    content_pillars: List[str]
    channels: List[ChannelRecommendation]
    kpi_framework: List[str]


class SeoKeywordItem(BaseModel):
    keyword: str
    category: str  # High Intent | Informational | Niche Ayurvedic
    search_intent: str
    content_recommendation: str
    volume_label: str = "Estimated Niche Volume (Sample Data)"


class SeoStrategyOutput(BaseModel):
    target_keywords: List[SeoKeywordItem]
    on_page_recommendations: List[str]
    blog_content_topics: List[str]
    product_page_seo_tips: List[str]


class AdCopyVariant(BaseModel):
    platform: str
    format: str  # Reel | Carousel | Search Text | Static Banner
    headline: str
    body_copy: str
    call_to_action: str
    target_angle: str


class MarketingAssetBundle(BaseModel):
    """Specific campaign-ready marketing assets (Section 5.2)."""
    instagram_post: Dict[str, Any] = Field(default_factory=dict)
    instagram_reel_script: Dict[str, Any] = Field(default_factory=dict)
    meta_ad_copy: Dict[str, Any] = Field(default_factory=dict)
    google_search_ad: Dict[str, Any] = Field(default_factory=dict)
    email_marketing: Dict[str, Any] = Field(default_factory=dict)
    blog_seo_content: Dict[str, Any] = Field(default_factory=dict)
    cta_variants: List[str] = Field(default_factory=list)
    headline_variants: List[str] = Field(default_factory=list)


class ContentStrategyOutput(BaseModel):
    instagram_ideas: List[str] = Field(default_factory=list)
    reels_concepts: List[str] = Field(default_factory=list)
    youtube_video_ideas: List[str] = Field(default_factory=list)
    ad_copy_variations: List[AdCopyVariant] = Field(default_factory=list)
    weekly_content_calendar: List[Dict[str, str]] = Field(default_factory=list)
    email_flow_concepts: List[str] = Field(default_factory=list)
    asset_bundle: Optional[MarketingAssetBundle] = None


class CampaignPlanItem(BaseModel):
    id: str = "CAMP-001"
    campaign_name: str
    platform: str
    objective: str
    target_audience: str
    creative_type: str
    messaging: str
    call_to_action: str
    budget_inr: float
    duration_days: int = 30
    primary_kpis: List[str] = Field(default_factory=list)
    
    # Lifecycle: DRAFT | PENDING_APPROVAL | APPROVED | SIMULATED_RUNNING | PAUSED | COMPLETED | OPTIMIZED
    status: str = "PENDING_APPROVAL"
    iteration_number: int = 1
    source_campaign_id: Optional[str] = None
    revised_from_id: Optional[str] = None
    applied_recommendation_ids: List[str] = Field(default_factory=list)
    linked_assets: Dict[str, Any] = Field(default_factory=dict)
    kpi_targets: Dict[str, Any] = Field(default_factory=dict)


class MetricRow(BaseModel):
    campaign_id: str
    campaign_name: str
    platform: str
    creative_variant: str
    spend: float
    impressions: int
    clicks: int
    conversions: int
    revenue: float
    ctr: float
    cpc: float
    conv_rate: float
    cpa: float
    roas: float
    is_simulated: str = "SIMULATED DATA"


class AnalyticsOutput(BaseModel):
    total_spend: float = 0.0
    total_impressions: int = 0
    total_clicks: int = 0
    total_conversions: int = 0
    total_revenue: float = 0.0
    overall_ctr: float = 0.0
    overall_cpc: float = 0.0
    overall_conv_rate: float = 0.0
    overall_cpa: float = 0.0
    overall_roas: float = 0.0
    best_campaign: Optional[str] = None
    best_creative: Optional[str] = None
    best_audience: Optional[str] = None
    best_channel: Optional[str] = None
    underperforming_campaign: Optional[str] = None
    campaign_rows: List[MetricRow] = Field(default_factory=list)
    interpretation: str = ""


class OptimizationRecommendation(BaseModel):
    id: Optional[str] = None
    campaign_id: Optional[str] = None
    finding: str
    evidence: str
    recommendation: str
    expected_impact: str
    priority: str  # HIGH | MEDIUM | LOW
    concrete_action: str
    is_next_best_action: bool = False


class NextBestAction(BaseModel):
    priority: str = "HIGH"
    finding: str
    action: str
    reason: str
    expected_impact: str
    next_campaign_iteration: Optional[Dict[str, Any]] = None


class MarketingState(BaseModel):
    # Core User Inputs
    product_name: str
    brand: str = "Herbally"
    product_url: Optional[str] = None
    market: str = "India"
    target_audience_input: Optional[str] = "Premium wellness and conscious lifestyle consumers"
    marketing_goal: str = "Increase online sales"
    budget: float = 50000.0
    duration_days: int = 30
    current_iteration: int = 1
    selected_campaign_id: Optional[str] = None
    
    # Discovery & Understanding
    product: Optional[ProductUnderstanding] = None
    research: Optional[MarketResearchOutput] = None
    competitors: List[CompetitorProfile] = Field(default_factory=list)
    audience_analysis: List[TargetPersona] = Field(default_factory=list)
    
    # Strategic Planning & Assets
    strategy: Optional[StrategyOutput] = None
    seo_strategy: Optional[SeoStrategyOutput] = None
    content_strategy: Optional[ContentStrategyOutput] = None
    campaign_plan: List[CampaignPlanItem] = Field(default_factory=list)
    
    # Execution & Simulation
    campaign_data_loaded: bool = False
    analytics: Optional[AnalyticsOutput] = None
    
    # Decision Engine & Optimizations
    recommendations: List[OptimizationRecommendation] = Field(default_factory=list)
    next_best_action: Optional[NextBestAction] = None
    
    # Guardrails, Auditing & Provenance
    sources: List[EpistemicSource] = Field(default_factory=list)
    assumptions: List[AssumptionItem] = Field(default_factory=list)
    errors: List[ErrorItem] = Field(default_factory=list)
    agent_runs: List[AgentRunTrace] = Field(default_factory=list)
