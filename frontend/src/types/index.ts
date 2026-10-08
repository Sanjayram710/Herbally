export interface EpistemicSource {
  category: "VERIFIED_FACT" | "EXTERNAL_RESEARCH" | "AI_RECOMMENDATION" | "ASSUMPTION_OR_ESTIMATE";
  description: string;
  source_reference?: string;
  confidence_level?: "HIGH" | "MEDIUM" | "LOW";
}

export interface AssumptionItem {
  category: string;
  statement: string;
  impact: string;
}

export interface AgentRunTrace {
  step_name: string;
  agent: string;
  status: "pending" | "running" | "completed" | "failed";
  duration_ms: number;
  timestamp: string;
}

export interface ProductUnderstanding {
  product_name: string;
  brand: string;
  category: string;
  verified_features: string[];
  explicitly_supported_benefits: string[];
  prohibited_claims: string[];
  differentiators: string[];
  target_use_cases: string[];
  pricing_inr?: number;
  sources: string[];
}

export interface MarketResearchItem {
  trend_title: string;
  summary: string;
  evidence_or_source: string;
  opportunity_for_brand: string;
}

export interface MarketResearchOutput {
  market_overview: string;
  consumer_trends: MarketResearchItem[];
  pain_points: string[];
  is_sample_data: boolean;
  provider_source: string;
}

export interface CompetitorProfile {
  name: string;
  positioning: string;
  target_audience: string;
  price_range: string;
  channels: string[];
  content_style: string;
  strengths: string[];
  weaknesses: string[];
  opportunity_for_brand: string;
  sources_and_assumptions: string;
}

export interface TargetPersona {
  persona_name: string;
  is_primary: boolean;
  demographics: string;
  psychographics_and_lifestyle: string;
  key_pain_points: string[];
  buying_motivations: string[];
  potential_objections: string[];
  hook_messaging: string;
}

export interface ChannelRecommendation {
  channel: string;
  funnel_stage: string;
  budget_share_pct: number;
  budget_allocated_inr: number;
  rationale_why: string;
}

export interface StrategyOutput {
  positioning_statement: string;
  core_value_proposition: string;
  marketing_objectives: string[];
  content_pillars: string[];
  channels: ChannelRecommendation[];
  kpi_framework: string[];
}

export interface SeoKeywordItem {
  keyword: string;
  category: string;
  search_intent: string;
  content_recommendation: string;
  volume_label: string;
}

export interface SeoStrategyOutput {
  target_keywords: SeoKeywordItem[];
  on_page_recommendations: string[];
  blog_content_topics: string[];
  product_page_seo_tips: string[];
}

export interface AdCopyVariant {
  platform: string;
  format: string;
  headline: string;
  body_copy: string;
  call_to_action: string;
  target_angle: string;
}

export interface ContentStrategyOutput {
  instagram_ideas: string[];
  reels_concepts: string[];
  youtube_video_ideas: string[];
  ad_copy_variations: AdCopyVariant[];
  weekly_content_calendar: { Day: string; Focus: string; Format: string; Concept: string }[];
  email_flow_concepts: string[];
}

export interface CampaignPlanItem {
  campaign_name: string;
  platform: string;
  objective: string;
  target_audience: string;
  creative_type: string;
  messaging: string;
  call_to_action: string;
  budget_inr: number;
  duration_days: number;
  primary_kpis: string[];
  execution_status: string;
}

export interface MetricRow {
  campaign_id: string;
  campaign_name: string;
  platform: string;
  creative_variant: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  conv_rate: number;
  cpa: number;
  roas: number;
}

export interface AnalyticsOutput {
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_revenue: number;
  overall_ctr: number;
  overall_cpc: number;
  overall_conv_rate: number;
  overall_cpa: number;
  overall_roas: number;
  top_performing_campaign?: string;
  underperforming_campaign?: string;
  campaign_rows: MetricRow[];
  interpretation: string;
}

export interface OptimizationRecommendation {
  finding: string;
  evidence: string;
  recommendation: string;
  expected_impact: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  concrete_action: string;
  is_next_best_action: boolean;
}

export interface NextBestAction {
  priority: string;
  finding: string;
  action: string;
  reason: string;
  expected_impact: string;
}

export interface MarketingState {
  product_name: string;
  brand: string;
  market: string;
  target_audience_input?: string;
  marketing_goal: string;
  budget: number;
  duration_days: number;
  product?: ProductUnderstanding;
  research?: MarketResearchOutput;
  competitors: CompetitorProfile[];
  audience_analysis: TargetPersona[];
  strategy?: StrategyOutput;
  seo_strategy?: SeoStrategyOutput;
  content_strategy?: ContentStrategyOutput;
  campaign_plan: CampaignPlanItem[];
  campaign_data_loaded: boolean;
  analytics?: AnalyticsOutput;
  recommendations: OptimizationRecommendation[];
  next_best_action?: NextBestAction;
  sources: EpistemicSource[];
  assumptions: AssumptionItem[];
  agent_runs: AgentRunTrace[];
}

export interface ProductItem {
  id: string;
  name: string;
  brand: string;
  category?: string;
  price_inr?: number;
  description: string;
  verified_features: string[];
  explicitly_supported_benefits: string[];
  prohibited_medical_claims: string[];
  official_url?: string;
}
