from typing import List, Tuple
from app.schemas.state import (
    AnalyticsOutput,
    OptimizationRecommendation,
    NextBestAction,
    MetricRow
)


class OptimizationService:
    @staticmethod
    def generate_optimizations(analytics: AnalyticsOutput) -> Tuple[List[OptimizationRecommendation], NextBestAction]:
        """
        Applies deterministic heuristics and evidence-based logic to campaign metrics
        to produce structured recommendations and a prioritized Next Best Action.
        """
        recommendations: List[OptimizationRecommendation] = []
        rows = analytics.campaign_rows

        if not rows:
            default_action = NextBestAction(
                priority="HIGH",
                finding="No campaign metrics uploaded yet.",
                action="Upload the sample campaign CSV (data/sample_campaign.csv) to analyze performance.",
                reason="Campaign metrics are required to trigger performance heuristics.",
                expected_impact="Enable data-driven channel optimization and CPA reduction."
            )
            return [], default_action

        # Heuristic 1: Identify best performer by ROAS & CPA
        converting_rows = [r for r in rows if r.conversions > 0]
        if converting_rows:
            top_row = min(converting_rows, key=lambda x: x.cpa if x.cpa > 0 else float("inf"))
            rec_1 = OptimizationRecommendation(
                finding=f"Campaign '{top_row.campaign_name}' ({top_row.platform}) has superior conversion efficiency.",
                evidence=f"Achieved lowest CPA of INR {top_row.cpa:,.2f} with {top_row.conversions} conversions and strong ROAS of {top_row.roas}x.",
                recommendation=f"Scale budget allocation for '{top_row.campaign_name}' by +25% and produce creative variations testing alternative hooks.",
                expected_impact="Potentially scale net sales volume by 20-30% while maintaining CPA below target threshold.",
                priority="HIGH",
                concrete_action=f"Generate 3 new video hook variations based on the '{top_row.creative_variant}' angle (e.g. skin routine, bedroom unboxing).",
                is_next_best_action=True
            )
            recommendations.append(rec_1)

        # Heuristic 2: Identify budget drain / low ROAS
        worst_row = max(rows, key=lambda x: (x.cpa if x.conversions > 0 else 999999))
        if worst_row and (worst_row.roas < 1.5 or worst_row.ctr < 1.0 or worst_row.cpa > analytics.overall_cpa * 1.5):
            rec_2 = OptimizationRecommendation(
                finding=f"Campaign '{worst_row.campaign_name}' ({worst_row.platform}) causes budget drag.",
                evidence=f"Low CTR ({worst_row.ctr}%), elevated CPA of INR {worst_row.cpa:,.2f}, and substandard ROAS of {worst_row.roas}x.",
                recommendation=f"Pause the underperforming creative '{worst_row.creative_variant}' and reallocate remaining INR {worst_row.spend:,.0f} spend to top-performing channels.",
                expected_impact="Immediately cuts wasted ad spend and improves blended campaign ROAS by ~0.4x.",
                priority="HIGH",
                concrete_action=f"Pause ad set '{worst_row.campaign_name}' in the ad manager and reallocate budget to the highest ROAS campaign.",
                is_next_best_action=False
            )
            recommendations.append(rec_2)

        # Heuristic 3: High-intent Search Channel
        search_rows = [r for r in rows if "search" in r.platform.lower() or "google" in r.platform.lower()]
        for sr in search_rows:
            if sr.conv_rate >= 2.5:
                rec_3 = OptimizationRecommendation(
                    finding=f"Search channel '{sr.campaign_name}' shows healthy conversion intent ({sr.conv_rate}%).",
                    evidence=f"Generated {sr.conversions} direct orders at CPC of INR {sr.cpc:,.2f} with strong commercial query intent.",
                    recommendation="Add negative keyword list to eliminate non-commercial queries and add GOTS organic certification sitelink extension.",
                    expected_impact="Reduces irrelevant click leakage by ~15% and increases qualified landing page traffic.",
                    priority="MEDIUM",
                    concrete_action="Upload 25 negative keywords (e.g. 'cheap bedsheet', 'polyester bedsheet') and add 'Free Shipping India' sitelink.",
                    is_next_best_action=False
                )
                recommendations.append(rec_3)

        # Heuristic 4: Frequency & Retargeting
        retargeting_rows = [r for r in rows if "story" in r.campaign_name.lower() or "retargeting" in r.campaign_name.lower()]
        for rr in retargeting_rows:
            if rr.roas >= 3.0:
                rec_4 = OptimizationRecommendation(
                    finding=f"Warm audience remarketing ('{rr.campaign_name}') delivers high return ({rr.roas}x ROAS).",
                    evidence=f"High conversion rate ({rr.conv_rate}%) indicates high buyer readiness among visitors exposed to testimonials.",
                    recommendation="Expand retargeting window to 45 days and implement automated email abandonment sequence.",
                    expected_impact="Recovers an estimated 10-15% of warm drop-offs with zero extra paid media spend.",
                    priority="MEDIUM",
                    concrete_action="Configure 3-stage email automation: Day 1 Neem benefits, Day 2 Care guide, Day 3 Limited-time welcome offer.",
                    is_next_best_action=False
                )
                recommendations.append(rec_4)

        # Designate the Next Best Action
        hero_rec = next((r for r in recommendations if r.is_next_best_action), recommendations[0] if recommendations else None)
        if hero_rec:
            next_action = NextBestAction(
                priority=hero_rec.priority,
                finding=hero_rec.finding,
                action=hero_rec.concrete_action,
                reason=hero_rec.recommendation,
                expected_impact=hero_rec.expected_impact
            )
        else:
            next_action = NextBestAction(
                priority="MEDIUM",
                finding="Baseline campaign metrics established.",
                action="Review campaign allocation against target 30-day budget.",
                reason="Maintain pacing across top-funnel and retargeting channels.",
                expected_impact="Maintain stable blended ROAS."
            )

        return recommendations, next_action
