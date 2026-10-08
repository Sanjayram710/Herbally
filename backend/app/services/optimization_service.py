from typing import List, Tuple, Dict, Any, Optional
from app.schemas.state import (
    AnalyticsOutput,
    OptimizationRecommendation,
    NextBestAction,
    MetricRow
)


class OptimizationService:
    @staticmethod
    def generate_optimizations(
        analytics: AnalyticsOutput,
        current_iteration: int = 1
    ) -> Tuple[List[OptimizationRecommendation], NextBestAction]:
        """
        Applies deterministic heuristics and evidence-based logic to campaign metrics
        to produce structured recommendations, prioritized Next Best Action, and the next-campaign iteration.
        """
        recommendations: List[OptimizationRecommendation] = []
        rows = analytics.campaign_rows

        if not rows:
            default_action = NextBestAction(
                priority="HIGH",
                finding="No campaign metrics uploaded or simulated yet.",
                action="Launch the approved campaign in the Simulated Sandbox or upload a performance CSV.",
                reason="Campaign metrics are required to trigger performance heuristics.",
                expected_impact="Enable data-driven channel optimization and CPA reduction."
            )
            return [], default_action

        # Identify Best Performer & Channel
        converting_rows = [r for r in rows if r.conversions > 0]
        top_row = min(converting_rows, key=lambda x: x.cpa if x.cpa > 0 else float("inf")) if converting_rows else rows[0]
        worst_row = max(rows, key=lambda x: (x.cpa if x.conversions > 0 else 999999))

        # Best / Worst Channel assignments for Analytics
        analytics.best_campaign = top_row.campaign_name
        analytics.best_creative = top_row.creative_variant
        analytics.best_channel = top_row.platform
        analytics.best_audience = "Conscious Skincare & Wellness Seekers"
        analytics.underperforming_campaign = worst_row.campaign_name

        # Heuristic 1: Scale Top Performer
        rec_1 = OptimizationRecommendation(
            finding=f"Campaign '{top_row.campaign_name}' ({top_row.platform}) has superior conversion efficiency.",
            evidence=f"Achieved lowest CPA of INR {top_row.cpa:,.2f} with {top_row.conversions} conversions and strong ROAS of {top_row.roas}x.",
            recommendation=f"Scale budget allocation for '{top_row.campaign_name}' by +25% and deploy newly generated hook variations.",
            expected_impact="Potentially scale net sales volume by 20-30% while maintaining CPA below target threshold.",
            priority="HIGH",
            concrete_action=f"Generate 3 new video hook variations based on the '{top_row.creative_variant}' angle (e.g. skin routine, bedroom unboxing).",
            is_next_best_action=True
        )
        recommendations.append(rec_1)

        # Heuristic 2: Identify budget drain / low ROAS
        if worst_row and (worst_row.roas < 2.0 or worst_row.ctr < 1.0 or worst_row.cpa > analytics.overall_cpa * 1.3):
            rec_2 = OptimizationRecommendation(
                finding=f"Campaign '{worst_row.campaign_name}' ({worst_row.platform}) causes budget drag.",
                evidence=f"Low CTR ({worst_row.ctr}%), elevated CPA of INR {worst_row.cpa:,.2f}, and substandard ROAS of {worst_row.roas}x.",
                recommendation=f"Pause the underperforming creative '{worst_row.creative_variant}' and reallocate remaining INR {worst_row.spend:,.0f} spend to top-performing channels.",
                expected_impact="Immediately cuts wasted ad spend and improves blended campaign ROAS by ~0.4x.",
                priority="HIGH",
                concrete_action=f"Pause ad set '{worst_row.campaign_name}' in ad manager and reallocate budget to highest ROAS campaign.",
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

        # Heuristic 4: Warm Audience Retargeting
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

        # Closed-Loop: Concrete Next Campaign Iteration Specification
        next_iteration_num = current_iteration + 1
        scaled_budget = round(top_row.spend * 1.30, 2)
        next_campaign_spec = {
            "id": f"CAMP-{next_iteration_num:03d}-SCALE",
            "campaign_name": f"CAMP-{next_iteration_num:03d}: Scaled-{top_row.campaign_name}-V{next_iteration_num}",
            "platform": top_row.platform,
            "objective": "Conversions (Sales)",
            "target_audience": "Conscious Skincare & Wellness Seekers (Tier 1 Metros)",
            "creative_type": f"Iterated {top_row.creative_variant} with 3 New Hooks",
            "messaging": "Stop spending on night creams if your sheets trap bacteria. Experience 100% GOTS organic Neem sleep.",
            "call_to_action": "Shop Pure Neem Bedsheets — Free Shipping",
            "budget_inr": scaled_budget,
            "duration_days": 30,
            "status": "PENDING_APPROVAL",
            "iteration_number": next_iteration_num,
            "linked_assets": {
                "base_creative": top_row.creative_variant,
                "scaling_factor": 1.30,
                "tested_hooks": [
                    "Your night cream deserves better bedding.",
                    "3 bedding mistakes causing morning redness in Indian weather.",
                    "Why dermatologists recommend pure Neem organic cotton."
                ]
            },
            "kpi_targets": {
                "target_roas": round(top_row.roas * 1.1, 2),
                "target_cpa": round(top_row.cpa * 0.9, 2)
            }
        }

        next_action = NextBestAction(
            priority="HIGH",
            finding=f"Campaign '{top_row.campaign_name}' ({top_row.platform}) generated top efficiency ({top_row.roas}x ROAS, CPA INR {top_row.cpa:,.2f}).",
            action=f"Launch Iteration {next_iteration_num}: Scale budget to INR {scaled_budget:,.0f} and test 3 new video hook variations while pausing underperformers.",
            reason="The UGC morning routine video creative significantly outperforms static banners and generic aesthetic messaging.",
            expected_impact="Scale revenue by +25-35% and reduce blended CPA by an estimated 15% across campaigns.",
            next_campaign_iteration=next_campaign_spec
        )

        return recommendations, next_action
