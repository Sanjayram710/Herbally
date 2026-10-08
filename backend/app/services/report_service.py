import json
from typing import Dict, Any
from app.schemas.state import MarketingState


class ReportService:
    @staticmethod
    def generate_markdown_report(state: MarketingState) -> str:
        """Compiles the complete consolidated marketing report into clean Markdown format."""
        prod = state.product
        strat = state.strategy
        analytics = state.analytics
        nba = state.next_best_action

        md = []
        md.append(f"# Digital Marketing Strategy & Optimization Report: {state.brand} — {state.product_name}\n")
        md.append(f"**Generated:** Synchronous Marketing Orchestrator  ")
        md.append(f"**Target Market:** {state.market} | **Marketing Goal:** {state.marketing_goal}  ")
        md.append(f"**Budget Allocation:** INR {state.budget:,.2f} ({state.duration_days} Days)\n")
        md.append("---\n")

        # Next Best Action Hero Callout
        if nba:
            md.append("## 🎯 PRIORITY NEXT BEST ACTION")
            md.append(f"> **Priority:** `{nba.priority}`  ")
            md.append(f"> **Finding:** {nba.finding}  ")
            md.append(f"> **Recommended Action:** {nba.action}  ")
            md.append(f"> **Strategic Reason:** {nba.reason}  ")
            md.append(f"> **Expected Impact:** {nba.expected_impact}\n")
            md.append("---\n")

        # 1. Executive Summary
        md.append("## 1. Executive Summary")
        if strat:
            md.append(f"{strat.positioning_statement}\n")
            md.append(f"**Core Value Proposition:** {strat.core_value_proposition}\n")
        
        # 2. Product Understanding & Guardrails
        if prod:
            md.append("## 2. Product Understanding & Verified Guardrails")
            md.append(f"- **Product Category:** {prod.category}")
            md.append(f"- **Verified Pricing:** INR {prod.pricing_inr:,.2f}" if prod.pricing_inr else "")
            md.append("\n### Verified Features (Ground Truth):")
            for f in prod.verified_features:
                md.append(f"- ✅ {f}")
            md.append("\n### Explicitly Supported Benefits:")
            for b in prod.explicitly_supported_benefits:
                md.append(f"- 🌿 {b}")
            md.append("\n### Strict Guardrails (Prohibited Claims):")
            for p in prod.prohibited_claims:
                md.append(f"- ⚠️ {p}")
            md.append("")

        # 3. Market Research & Trends
        if state.research:
            md.append("## 3. Market Research & Industry Trends")
            md.append(f"{state.research.market_overview}\n")
            for t in state.research.consumer_trends:
                md.append(f"### {t.trend_title}")
                md.append(f"- **Summary:** {t.summary}")
                md.append(f"- **Evidence/Source:** `{t.evidence_or_source}`")
                md.append(f"- **Brand Opportunity:** {t.opportunity_for_brand}\n")

        # 4. Competitor Analysis
        if state.competitors:
            md.append("## 4. Competitor Analysis")
            md.append("| Competitor | Positioning | Price Range | Channels | Opportunity for Herbally |")
            md.append("| :--- | :--- | :--- | :--- | :--- |")
            for c in state.competitors:
                chans = ", ".join(c.channels[:2])
                md.append(f"| **{c.name}** | {c.positioning[:50]}... | {c.price_range} | {chans} | {c.opportunity_for_brand[:60]}... |")
            md.append("")

        # 5. Target Audience Personas
        if state.audience_analysis:
            md.append("## 5. Target Audience Personas (Hypotheses)")
            for a in state.audience_analysis:
                role = "Primary Persona" if a.is_primary else "Secondary Persona"
                md.append(f"### {a.persona_name} ({role})")
                md.append(f"- **Demographics:** {a.demographics}")
                md.append(f"- **Psychographics:** {a.psychographics_and_lifestyle}")
                md.append(f"- **Hook Message:** *\"{a.hook_messaging}\"*")
                md.append("")

        # 6. Strategy & Channel Budgeting
        if strat:
            md.append("## 6. Marketing Strategy & Channel Allocation")
            md.append("| Channel | Funnel Stage | Budget Share | Allocated INR | Strategic Rationale |")
            md.append("| :--- | :--- | :--- | :--- | :--- |")
            for ch in strat.channels:
                md.append(f"| **{ch.channel}** | {ch.funnel_stage} | {ch.budget_share_pct}% | INR {ch.budget_allocated_inr:,.0f} | {ch.rationale_why[:60]}... |")
            md.append("")

        # 7. SEO Strategy
        if state.seo_strategy:
            md.append("## 7. SEO Keywords & Content Architecture")
            md.append("| Keyword | Category | Search Intent | Content Recommendation |")
            md.append("| :--- | :--- | :--- | :--- |")
            for k in state.seo_strategy.target_keywords:
                md.append(f"| `{k.keyword}` | {k.category} | {k.search_intent} | {k.content_recommendation} |")
            md.append("")

        # 8. Content & Ad Variations
        if state.content_strategy:
            md.append("## 8. Creative & Ad Copy Variations")
            for ad in state.content_strategy.ad_copy_variations:
                md.append(f"### Format: {ad.format} ({ad.platform})")
                md.append(f"- **Angle:** `{ad.target_angle}`")
                md.append(f"- **Headline:** **{ad.headline}**")
                md.append(f"- **Copy:** {ad.body_copy}")
                md.append(f"- **Call to Action:** `{ad.call_to_action}`\n")

        # 9. Campaign Analytics (if loaded)
        if analytics and analytics.campaign_rows:
            md.append("## 9. Campaign Performance Analytics")
            md.append(f"{analytics.interpretation}\n")
            md.append("| Campaign | Platform | Spend | Clicks | Conv | CTR | CPC | CPA | ROAS |")
            md.append("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |")
            for r in analytics.campaign_rows:
                md.append(f"| `{r.campaign_name}` | {r.platform} | INR {r.spend:,.0f} | {r.clicks} | {r.conversions} | {r.ctr}% | INR {r.cpc:.1f} | INR {r.cpa:,.1f} | {r.roas}x |")
            md.append("")

        # 10. Optimization Recommendations
        if state.recommendations:
            md.append("## 10. Optimization Recommendations")
            for i, r in enumerate(state.recommendations, 1):
                md.append(f"### {i}. [{r.priority}] {r.finding}")
                md.append(f"- **Evidence:** {r.evidence}")
                md.append(f"- **Recommendation:** {r.recommendation}")
                md.append(f"- **Concrete Action:** `{r.concrete_action}`")
                md.append(f"- **Expected Impact:** {r.expected_impact}\n")

        # 11. Epistemic Audit (Sources & Assumptions)
        md.append("## 11. Epistemic Provenance & Source Audit")
        md.append("| Category | Reference | Description | Confidence |")
        md.append("| :--- | :--- | :--- | :--- |")
        for s in state.sources:
            md.append(f"| `{s.category}` | {s.source_reference or 'N/A'} | {s.description} | {s.confidence_level} |")
        md.append("")

        return "\n".join(md)

    @staticmethod
    def generate_json_report(state: MarketingState) -> Dict[str, Any]:
        """Returns the serialized JSON report dictionary."""
        return state.model_dump()
