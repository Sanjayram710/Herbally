from app.services.analytics_service import AnalyticsService
from app.services.optimization_service import OptimizationService


def test_optimization_identifies_top_and_worst_performers():
    """Verify heuristics identify the highest converting campaign and budget leak."""
    raw_rows = [
        {
            "campaign_id": "C-HIGH",
            "campaign_name": "High Performer",
            "platform": "Instagram",
            "creative_variant": "Reel Hero",
            "spend": 5000.0,
            "impressions": 80000,
            "clicks": 3000,
            "conversions": 150,  # CPA = 33.33, ROAS = 5.0
            "revenue": 25000.0
        },
        {
            "campaign_id": "C-LOW",
            "campaign_name": "Low Performer",
            "platform": "Meta Ads",
            "creative_variant": "Static Banner",
            "spend": 8000.0,
            "impressions": 60000,
            "clicks": 400,
            "conversions": 4,  # CPA = 2000.0, ROAS = 0.8
            "revenue": 6400.0
        }
    ]
    analytics = AnalyticsService.process_campaign_metrics(raw_rows)
    recommendations, next_best_action = OptimizationService.generate_optimizations(analytics)

    assert len(recommendations) >= 2
    # NBA should be derived from the high performer
    assert next_best_action is not None
    assert next_best_action.priority == "HIGH"
    assert "High Performer" in next_best_action.finding or "High Performer" in next_best_action.reason
    assert "Reel Hero" in next_best_action.action or "3 new video hook variations" in next_best_action.action

    # Low performer recommendation should urge pausing or reallocating
    low_rec = next((r for r in recommendations if "Low Performer" in r.finding), None)
    assert low_rec is not None
    assert "budget drag" in low_rec.finding.lower()
    assert low_rec.priority == "HIGH"


def test_optimization_empty_data():
    """Verify graceful handling when no metrics exist."""
    analytics = AnalyticsService.process_campaign_metrics([])
    recommendations, next_best_action = OptimizationService.generate_optimizations(analytics)
    assert len(recommendations) == 0
    assert next_best_action is not None
    assert "Upload" in next_best_action.action
