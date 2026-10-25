export interface EpistemicSource {
  category: "VERIFIED_FACT" | "RESEARCH_FINDING" | "AI_INFERENCE" | "MARKETING_SUGGESTION" | "ASSUMPTION" | "SIMULATED_DATA" | string;
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

export interface MarketingAssetBundle {
  instagram_post: { caption?: string; hashtags?: string[]; image_concept?: string };
  instagram_reel_script: {
    hook?: string;
    scenes?: { second: string; visual: string; text_overlay: string }[];
    voiceover?: string;
    audio_vibe?: string;
  };
  meta_ad_copy: { headline?: string; primary_text?: string; call_to_action?: string };
  google_search_ad: {
    headlines?: string[];
    descriptions?: string[];
    sitelinks?: { title: string; desc: string }[];
  };
  email_marketing: {
    subject_line?: string;
    preview_text?: string;
    body_markdown?: string;
    cta_text?: string;
  };
  blog_seo_content: {
    title?: string;
    target_keyword?: string;
    outline_sections?: string[];
  };
  cta_variants: string[];
  headline_variants: string[];
}

export interface ContentStrategyOutput {
  instagram_ideas: string[];
  reels_concepts: string[];
  youtube_video_ideas: string[];
  ad_copy_variations: AdCopyVariant[];
  weekly_content_calendar: { Day: string; Focus: string; Format: string; Concept: string }[];
  email_flow_concepts: string[];
  asset_bundle?: MarketingAssetBundle;
}

export interface CampaignPlanItem {
  id: string;
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
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "SIMULATED_RUNNING" | "PAUSED" | "COMPLETED" | "OPTIMIZED" | string;
  iteration_number?: number;
  source_campaign_id?: string;
  revised_from_id?: string;
  applied_recommendation_ids?: string[];
  linked_assets?: Record<string, any>;
  kpi_targets?: Record<string, any>;
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
  is_simulated?: string;
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
  best_campaign?: string;
  best_creative?: string;
  best_audience?: string;
  best_channel?: string;
  underperforming_campaign?: string;
  campaign_rows: MetricRow[];
  interpretation: string;
}

export interface OptimizationRecommendation {
  id?: string;
  campaign_id?: string;
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
  next_campaign_iteration?: Record<string, any>;
}

export interface MarketingState {
  product_name: string;
  brand: string;
  product_url?: string;
  market: string;
  target_audience_input?: string;
  marketing_goal: string;
  budget: number;
  duration_days: number;
  current_iteration: number;
  selected_campaign_id?: string;
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

export interface BrandProfile {
  id: string;
  name: string;
  industry: string;
  description: string;
  website_url?: string;
  target_audience: string;
  marketing_objectives: string[];
  preferred_channels: string[];
  brand_voice: string;
  brand_colors: Record<string, string>;
  logo_url?: string;
  brand_guidelines?: string;
  factual_claims: string[];
  prohibited_claims: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ContentAssetItem {
  id: string;
  brand_id: string;
  product_id?: string;
  campaign_id?: string;
  channel: string;
  asset_type: "social_post" | "ad_copy" | "reel_script" | "headline" | "product_desc" | "creative_brief" | string;
  title: string;
  content: string;
  headline?: string;
  body_copy?: string;
  call_to_action?: string;
  hashtags: string[];
  image_prompt?: string;
  generated_media_url?: string;
  status: "draft" | "pending_approval" | "approved" | "scheduled" | "published_demo" | "failed" | "cancelled" | string;
  provider_source: string;
  version: number;
  created_at?: string;
  updated_at?: string;
}

export interface ContentScheduleItem {
  id: string;
  asset_id: string;
  channel: string;
  scheduled_time: string;
  status: "scheduled" | "published_demo" | "failed" | "cancelled" | string;
  attempts_count: number;
  last_attempt_at?: string;
  error_message?: string;
  is_simulated: string;
  created_at?: string;
}

export interface AutomationRuleItem {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  action_type: string;
  frequency: string;
  is_enabled: boolean;
  config?: Record<string, any>;
  last_run_at?: string;
  created_at?: string;
}

export interface AutomationExecutionItem {
  id: string;
  rule_id: string;
  rule_name: string;
  status: "success" | "failed" | "skipped" | string;
  details: string;
  error_message?: string;
  executed_at?: string;
}

export interface IntegrationItem {
  id: string;
  name: string;
  category: "advertising" | "social" | "analytics" | "ai" | "search" | string;
  status: "connected" | "unconfigured" | "disconnected" | "simulated_sandbox" | string;
  is_configured: boolean;
  credentials_mask: string;
  permissions: string[];
  supported_actions: string[];
  last_sync_at?: string;
  error_message?: string;
  setup_instructions?: string;
}

export interface AssistantMessageItem {
  id: string;
  brand_id: string;
  role: "user" | "assistant" | "system" | "tool" | string;
  content: string;
  tool_called?: string;
  tool_result?: Record<string, any>;
  created_at?: string;
}

export interface DashboardSummaryData {
  brand_id: string;
  brand_name: string;
  brand_industry: string;
  active_campaigns_count: number;
  total_campaigns_count: number;
  content_counts: Record<string, number>;
  pending_approvals: Array<{
    id: string;
    type: string;
    title: string;
    channel?: string;
    budget_inr?: number;
    created_at?: string;
  }>;
  recent_automations: Array<{
    id: string;
    rule_name: string;
    status: string;
    details: string;
    executed_at?: string;
  }>;
  integration_health: {
    total: number;
    connected: number;
    unconfigured: number;
    mode: string;
  };
  latest_kpi_summary?: {
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_conversions: number;
    total_revenue: number;
    overall_ctr: number;
    overall_cpc: number;
    overall_cpa: number;
    overall_roas: number;
    best_campaign?: string;
  };
  metric_provenance: string;
  next_best_action?: NextBestAction;
}

export interface CustomerMessageItem {
  id: string;
  brand_id: string;
  channel: string;
  customer_name: string;
  message_text: string;
  draft_reply?: string;
  status: "draft_reply" | "approved_to_send" | "sent_demo" | "failed" | string;
  is_simulated: boolean;
  created_at?: string;
}

export interface LandingPageDraftData {
  id: string;
  brand_id: string;
  title: string;
  hero_headline: string;
  hero_subheadline: string;
  value_props: Array<{ title: string; description: string }>;
  call_to_action: string;
  seo_title: string;
  seo_description: string;
  status: string;
}

