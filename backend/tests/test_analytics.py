import pytest
from app.services.analytics_service import AnalyticsService, safe_divide


def test_safe_divide_zero_cases():
    """Verify safe_divide protects against zero-division without throwing exceptions."""
    assert safe_divide(100, 0) == 0.0
    assert safe_divide(0, 0) == 0.0
    assert safe_divide(100, None) == 0.0
    assert safe_divide(None, 100) == 0.0


def test_safe_divide_normal_cases():
    """Verify normal calculations with multipliers."""
    # CTR: clicks / impressions * 100
    assert safe_divide(50, 1000, multiplier=100.0) == 5.0
    # CPC: spend / clicks
    assert safe_divide(500, 25, multiplier=1.0) == 20.0
    # CPA: spend / conversions
    assert safe_divide(1000, 4, multiplier=1.0) == 250.0
    # ROAS: revenue / spend
    assert safe_divide(3500, 1000, multiplier=1.0) == 3.5


def test_analytics_service_zero_metric_rows():
    """Verify processing when rows contain zeroes."""
    raw_rows = [
        {
            "campaign_id": "TEST-01",
            "campaign_name": "Zero Clicks Campaign",
            "platform": "Meta Ads",
            "creative_variant": "Banner",
            "spend": 1000.0,
            "impressions": 5000,
            "clicks": 0,
            "conversions": 0,
            "revenue": 0.0
        }
    ]
    output = AnalyticsService.process_campaign_metrics(raw_rows)
    row = output.campaign_rows[0]
    assert row.ctr == 0.0
    assert row.cpc == 0.0
    assert row.conv_rate == 0.0
    assert row.cpa == 0.0
    assert row.roas == 0.0
    assert output.total_spend == 1000.0


def test_analytics_service_normal_dataset():
    """Verify multi-row analytics calculations and aggregates."""
    raw_rows = [
        {
            "campaign_id": "CAMP-01",
            "campaign_name": "IG Reel",
            "platform": "Instagram",
            "creative_variant": "Reel 1",
            "spend": 10000.0,
            "impressions": 100000,
            "clicks": 2500,
            "conversions": 100,
            "revenue": 35000.0
        },
        {
            "campaign_id": "CAMP-02",
            "campaign_name": "Search Ad",
            "platform": "Google Search",
            "creative_variant": "Text Ad",
            "spend": 5000.0,
            "impressions": 20000,
            "clicks": 1000,
            "conversions": 40,
            "revenue": 14000.0
        }
    ]
    output = AnalyticsService.process_campaign_metrics(raw_rows)
    assert output.total_spend == 15000.0
    assert output.total_conversions == 140
    assert output.total_revenue == 49000.0
    # Blended ROAS = 49000 / 15000 = 3.27
    assert output.overall_roas == 3.27
    assert output.overall_cpa == round(15000 / 140, 2)


def test_csv_parser_valid():
    """Verify parsing valid CSV string."""
    csv_bytes = (
        b"campaign_id,campaign_name,platform,spend,impressions,clicks,conversions,revenue\n"
        b"C1,Test Camp,Instagram,500,10000,200,10,2500\n"
    )
    rows, msg = AnalyticsService.parse_csv(csv_bytes)
    assert len(rows) == 1
    assert rows[0]["campaign_name"] == "Test Camp"
    assert rows[0]["spend"] == 500.0


def test_csv_parser_missing_required_column():
    """Verify error raised on invalid/missing columns."""
    csv_bytes = b"campaign_name,platform,spend\nTest,Meta,100\n"
    with pytest.raises(ValueError) as exc:
        AnalyticsService.parse_csv(csv_bytes)
    assert "missing required columns" in str(exc.value)
