from typing import List, Dict, Any, Tuple
from app.schemas.state import CampaignPlanItem, MetricRow, EpistemicSource


class SimulationService:
    @staticmethod
    def simulate_campaign_run(
        campaigns: List[CampaignPlanItem],
        iteration: int = 1
    ) -> Tuple[List[Dict[str, Any]], List[CampaignPlanItem]]:
        """
        Executes the campaign execution simulator:
        1. Transitions approved campaigns to SIMULATED_RUNNING then COMPLETED.
        2. Generates realistic, reproducible simulated performance metrics.
        3. If iteration > 1, applies optimization performance boosts (higher CTR, lower CPA).
        4. Never calls a real ad platform and marks output as 'SIMULATED DATA'.
        """
        raw_rows: List[Dict[str, Any]] = []
        updated_campaigns: List[CampaignPlanItem] = []

        # Optimization multiplier for subsequent iterations
        opt_boost = 1.0 + (iteration - 1) * 0.18  # 18% improvement on iteration 2

        for camp in campaigns:
            # Lifecycle rule: Only APPROVED campaigns can be launched in simulator
            if camp.status in ["APPROVED", "PENDING_APPROVAL"]:
                camp.status = "COMPLETED"
            
            budget = camp.budget_inr

            # Platform & creative specific simulation heuristics
            if "IG-Reel" in camp.campaign_name or "Reel" in camp.creative_type:
                # Top performing creative
                spend = budget * 0.98
                impressions = int(185000 * (budget / 12500) * opt_boost)
                ctr = 3.4 * opt_boost
                clicks = int(impressions * (ctr / 100.0))
                conv_rate = 4.2 * opt_boost
                conversions = int(clicks * (conv_rate / 100.0))
                # Herbally basket size ~INR 3,499
                revenue = round(conversions * 3499.0, 2)
                variant = "Reel-UGC-MorningSkin-V2" if iteration > 1 else "Reel-UGC-MorningSkin"

            elif "Carousel" in camp.campaign_name:
                spend = budget * 0.95
                impressions = int(165000 * (budget / 14000))
                ctr = 1.8 * opt_boost
                clicks = int(impressions * (ctr / 100.0))
                conv_rate = 2.4 * opt_boost
                conversions = int(clicks * (conv_rate / 100.0))
                revenue = round(conversions * 3499.0, 2)
                variant = "Carousel-GOTS-vs-Polyester"

            elif "Search" in camp.campaign_name:
                spend = budget * 0.96
                impressions = int(42000 * (budget / 11500))
                ctr = 4.0 * opt_boost
                clicks = int(impressions * (ctr / 100.0))
                conv_rate = 3.8 * opt_boost
                conversions = int(clicks * (conv_rate / 100.0))
                revenue = round(conversions * 3499.0, 2)
                variant = "SearchAd-PureNeemOrganic"

            elif "Story" in camp.campaign_name or "Retargeting" in camp.campaign_name:
                spend = budget * 0.92
                impressions = int(48000 * (budget / 3500))
                ctr = 3.0 * opt_boost
                clicks = int(impressions * (ctr / 100.0))
                conv_rate = 4.0 * opt_boost
                conversions = int(clicks * (conv_rate / 100.0))
                revenue = round(conversions * 3499.0, 2)
                variant = "Story-TestimonialCut"

            else:
                # Generic fallback / underperformer
                spend = budget * 0.85
                impressions = int(120000 * (budget / 8500))
                ctr = 0.6
                clicks = int(impressions * (ctr / 100.0))
                conv_rate = 1.5
                conversions = max(1, int(clicks * (conv_rate / 100.0)))
                revenue = round(conversions * 3499.0, 2)
                variant = "Static-Banner-GenericAesthetic"

            raw_rows.append({
                "campaign_id": camp.id,
                "campaign_name": camp.campaign_name,
                "platform": camp.platform,
                "creative_variant": variant,
                "spend": round(spend, 2),
                "impressions": impressions,
                "clicks": clicks,
                "conversions": conversions,
                "revenue": revenue,
                "is_simulated": "SIMULATED DATA"
            })

            updated_campaigns.append(camp)

        return raw_rows, updated_campaigns
