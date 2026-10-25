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
        current_iteration: int = 1,
        selected_campaign_id: Optional[str] = None
    ) -> Tuple[List[OptimizationRecommendation], NextBestAction]:
        """
        Applies deterministic heuristics and evidence-based logic to campaign metrics
        to produce structured recommendations, prioritized Next Best Action, and the next-campaign iteration.
        Binds to selected_campaign_id if provided.
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

        # Determine target row to optimize: selected_campaign_id if specified, else best performer
        target_row = None
        if selected_campaign_id:
            target_row = next((r for r in rows if r.campaign_id == selected_campaign_id), None)

        converting_rows = [r for r in rows if r.conversions > 0]
        top_row = min(converting_rows, key=lambda x: x.cpa if x.cpa > 0 else float("inf")) if converting_rows else rows[0]
        worst_row = max(rows, key=lambda x: (x.cpa if x.conversions > 0 else 999999))

        active_row = target_row if target_row is not None else top_row

        # Best / Worst Channel assignments for Analytics
        analytics.best_campaign = top_row.campaign_name
        analytics.best_creative = top_row.creative_variant
        analytics.best_channel = top_row.platform
        analytics.best_audience = "Conscious Skincare & Wellness Seekers"
        analytics.underperforming_campaign = worst_row.campaign_name

        # 1. Primary Recommendation citing active campaign's EXACT metrics
        if active_row.roas >= 2.5:
            rec_1 = OptimizationRecommendation(
                id=f"REC-{active_row.campaign_id}-01",
                campaign_id=active_row.campaign_id,
                finding=f"Campaign '{active_row.campaign_name}' ({active_row.platform}) demonstrates strong return efficiency.",
                evidence=f"Achieved ROAS of {active_row.roas}x with CPA of INR {active_row.cpa:,.2f}, {active_row.conversions} conversions, and spend of INR {active_row.spend:,.2f}.",
                recommendation=f"Scale budget allocation for '{active_row.campaign_name}' by +30% and introduce 3 new hook angles.",
                expected_impact=f"Estimated +25-35% incremental conversions while maintaining CPA near INR {active_row.cpa:,.2f}.",
                priority="HIGH",
                concrete_action=f"Create a revised campaign '{active_row.campaign_name}-V{current_iteration+1}' scaling budget to INR {round(active_row.spend * 1.3, 2):,.2f}.",
                is_next_best_action=True
            )
        else:
            rec_1 = OptimizationRecommendation(
                id=f"REC-{active_row.campaign_id}-01",
                campaign_id=active_row.campaign_id,
                finding=f"Campaign '{active_row.campaign_name}' ({active_row.platform}) has low ROAS ({active_row.roas}x) and high CPA (INR {active_row.cpa:,.2f}).",
                evidence=f"Spend: INR {active_row.spend:,.2f}, CTR: {active_row.ctr}%, Conversions: {active_row.conversions}, ROAS: {active_row.roas}x.",
                recommendation=f"Restructure creative messaging and refine audience targeting to curb click leakage.",
                expected_impact="Cut inefficient spend by 40% and improve conversion rate above 2.0%.",
                priority="HIGH",
                concrete_action=f"Replace ad copy with high-intent botanical verification messaging and adjust targeting.",
                is_next_best_action=True
            )
        recommendations.append(rec_1)

        # 2. Creative Hook & CTR Recommendation citing exact CTR
        if active_row.ctr < 2.0:
            rec_2 = OptimizationRecommendation(
                id=f"REC-{active_row.campaign_id}-02",
                campaign_id=active_row.campaign_id,
                finding=f"CTR for '{active_row.campaign_name}' is {active_row.ctr}%, indicating creative ad fatigue or low hook engagement.",
                evidence=f"Generated {active_row.clicks:,} clicks from {active_row.impressions:,} impressions (CTR {active_row.ctr}% vs benchmark > 2.0%).",
                recommendation="Deploy high-contrast 3-second hook video variations focusing on morning skin sensitivity.",
                expected_impact="Expected CTR increase from {active_row.ctr}% to > 2.2%, lowering CPC from INR {active_row.cpc:,.2f}.",
                priority="HIGH" if active_row.ctr < 1.0 else "MEDIUM",
                concrete_action="Swap video hook thumbnail and opening 3 seconds with authentic UGC unboxing.",
                is_next_best_action=False
            )
            recommendations.append(rec_2)
        else:
            rec_2 = OptimizationRecommendation(
                id=f"REC-{active_row.campaign_id}-02",
                campaign_id=active_row.campaign_id,
                finding=f"High CTR ({active_row.ctr}%) confirms strong visual resonance on {active_row.platform}.",
                evidence=f"Generated {active_row.clicks:,} clicks at CPC of INR {active_row.cpc:,.2f} with {active_row.impressions:,} impressions.",
                recommendation="Expand creative variants with UGC lifestyle customer reviews and certification trust badges.",
                expected_impact="Extends ad fatigue lifespan by 3-4 weeks across Tier 1 metro audiences.",
                priority="MEDIUM",
                concrete_action="Deploy 2 new variations utilizing existing high-performing visual format.",
                is_next_best_action=False
            )
            recommendations.append(rec_2)

        # 3. Channel Specific Operational Recommendation
        if "search" in active_row.platform.lower() or "google" in active_row.platform.lower():
            rec_3 = OptimizationRecommendation(
                id=f"REC-{active_row.campaign_id}-03",
                campaign_id=active_row.campaign_id,
                finding=f"Search queries converted at {active_row.conv_rate}% with CPC of INR {active_row.cpc:,.2f}.",
                evidence=f"Delivered {active_row.conversions} orders at CPA INR {active_row.cpa:,.2f}.",
                recommendation="Add negative keyword list to eliminate non-commercial traffic and add GOTS organic sitelinks.",
                expected_impact="Reduces irrelevant spend leakage by ~15% and increases qualified lead traffic.",
                priority="MEDIUM",
                concrete_action="Add negative keywords ('cheap bedsheets', 'polyester') and activate Free Shipping extension.",
                is_next_best_action=False
            )
            recommendations.append(rec_3)
        else:
            rec_3 = OptimizationRecommendation(
                id=f"REC-{active_row.campaign_id}-03",
                campaign_id=active_row.campaign_id,
                finding=f"Conversion rate is {active_row.conv_rate}% on {active_row.platform}.",
                evidence=f"{active_row.conversions} conversions from {active_row.clicks:,} clicks with total revenue INR {active_row.revenue:,.2f}.",
                recommendation="Deploy automated email abandonment sequence and warm audience retargeting.",
                expected_impact="Recovers an estimated 10-15% of warm drop-offs at zero extra paid media spend.",
                priority="MEDIUM",
                concrete_action="Activate 3-stage email drip and retargeting pixel for 30-day website visitors.",
                is_next_best_action=False
            )
            recommendations.append(rec_3)

        # 4. Budget Drag / Underperformer recommendation (if applicable)
        if worst_row and (worst_row.campaign_id != active_row.campaign_id or selected_campaign_id is None):
            if worst_row.roas < 2.0 or worst_row.ctr < 1.0 or worst_row.cpa > 1000.0:
                rec_drag = OptimizationRecommendation(
                    id=f"REC-{worst_row.campaign_id}-DRAG",
                    campaign_id=worst_row.campaign_id,
                    finding=f"Campaign '{worst_row.campaign_name}' ({worst_row.platform}) causes budget drag.",
                    evidence=f"Low CTR ({worst_row.ctr}%), elevated CPA of INR {worst_row.cpa:,.2f}, and substandard ROAS of {worst_row.roas}x.",
                    recommendation=f"Pause the underperforming creative '{worst_row.creative_variant}' and reallocate remaining INR {worst_row.spend:,.0f} spend to top-performing channels.",
                    expected_impact="Immediately cuts wasted ad spend and improves blended campaign ROAS by ~0.4x.",
                    priority="HIGH",
                    concrete_action=f"Pause ad set '{worst_row.campaign_name}' in ad manager and reallocate budget to highest ROAS campaign.",
                    is_next_best_action=False
                )
                recommendations.append(rec_drag)

        # Build Concrete Revised Campaign Configuration linked to active_row
        next_iteration_num = current_iteration + 1
        scaled_budget = round(active_row.spend * 1.30 if active_row.roas >= 2.0 else active_row.spend * 0.85, 2)
        revised_campaign_id = f"{active_row.campaign_id}-REV-{next_iteration_num:02d}"

        next_campaign_spec = {
            "id": revised_campaign_id,
            "campaign_name": f"{active_row.campaign_name} (Revised V{next_iteration_num})",
            "platform": active_row.platform,
            "objective": "Conversions (Sales)",
            "target_audience": "Conscious Skincare & Wellness Seekers (Tier 1 Metros)",
            "creative_type": f"Iterated {active_row.creative_variant} with 3 New Hooks",
            "messaging": "Stop spending on night creams if your sheets trap bacteria. Experience 100% GOTS organic Neem sleep.",
            "call_to_action": "Shop Pure Neem Bedsheets — Free Shipping",
            "budget_inr": scaled_budget,
            "duration_days": 30,
            "status": "DRAFT",
            "iteration_number": next_iteration_num,
            "source_campaign_id": active_row.campaign_id,
            "revised_from_id": active_row.campaign_id,
            "applied_recommendation_ids": [r.id for r in recommendations if r.id],
            "linked_assets": {
                "base_creative": active_row.creative_variant,
                "source_cpa": active_row.cpa,
                "source_roas": active_row.roas,
                "scaling_factor": 1.30 if active_row.roas >= 2.0 else 0.85,
                "tested_hooks": [
                    "Your night cream deserves better bedding.",
                    "3 bedding mistakes causing morning redness in Indian weather.",
                    "Why dermatologists recommend pure Neem organic cotton."
                ]
            },
            "kpi_targets": {
                "target_roas": round(max(active_row.roas * 1.1, 2.5), 2),
                "target_cpa": round(active_row.cpa * 0.9 if active_row.cpa > 0 else 900.0, 2)
            }
        }

        next_action = NextBestAction(
            priority="HIGH",
            finding=f"Campaign '{active_row.campaign_name}' recorded {active_row.roas}x ROAS with CPA INR {active_row.cpa:,.2f} and CTR {active_row.ctr}%.",
            action=f"Create Revised Campaign {revised_campaign_id}: Scale budget to INR {scaled_budget:,.2f} on {active_row.creative_variant} and deploy 3 new video hook variations.",
            reason=f"The creative '{active_row.creative_variant}' on {active_row.campaign_name} outperforms with superior conversion efficiency.",
            expected_impact="Targeting +20-30% efficiency improvement and lower blended CPA.",
            next_campaign_iteration=next_campaign_spec
        )

        return recommendations, next_action
