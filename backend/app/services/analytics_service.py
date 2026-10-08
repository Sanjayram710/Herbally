import io
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd
from app.schemas.state import MetricRow, AnalyticsOutput


def safe_divide(numerator: float, denominator: float, multiplier: float = 1.0) -> float:
    """Safely calculates ratios protecting against division by zero."""
    if denominator is None or denominator == 0 or pd.isna(denominator):
        return 0.0
    if numerator is None or pd.isna(numerator):
        return 0.0
    return round((float(numerator) / float(denominator)) * multiplier, 2)


class AnalyticsService:
    @staticmethod
    def parse_csv(csv_content: bytes) -> Tuple[List[Dict[str, Any]], str]:
        """
        Safely parses uploaded CSV bytes using pandas.
        Validates required columns and numeric types.
        """
        try:
            df = pd.read_csv(io.BytesIO(csv_content))
        except Exception as e:
            raise ValueError(f"Could not parse CSV file: {str(e)}")

        required_cols = {"campaign_name", "platform", "spend", "impressions", "clicks", "conversions"}
        actual_cols = set(df.columns.str.strip().str.lower())
        
        # Normalize column names to lowercase
        df.columns = df.columns.str.strip().str.lower()
        
        # Check required columns
        missing = required_cols - actual_cols
        if missing:
            raise ValueError(f"CSV is missing required columns: {', '.join(missing)}")

        if "campaign_id" not in df.columns:
            df["campaign_id"] = [f"CAMP-{i+1:03d}" for i in range(len(df))]
        if "creative_variant" not in df.columns:
            df["creative_variant"] = "Standard Variant"
        if "revenue" not in df.columns:
            df["revenue"] = 0.0

        # Fill NaNs and ensure numeric
        numeric_cols = ["spend", "impressions", "clicks", "conversions", "revenue"]
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

        rows = df.to_dict(orient="records")
        return rows, f"Successfully parsed {len(rows)} campaign rows."

    @staticmethod
    def process_campaign_metrics(raw_rows: List[Dict[str, Any]]) -> AnalyticsOutput:
        """
        Computes deterministic marketing metrics for each campaign row
        and aggregates totals with safe division guards.
        """
        if not raw_rows:
            return AnalyticsOutput(interpretation="No campaign data provided.")

        metric_rows: List[MetricRow] = []
        total_spend = 0.0
        total_impressions = 0
        total_clicks = 0
        total_conversions = 0
        total_revenue = 0.0

        for r in raw_rows:
            spend = float(r.get("spend", 0.0))
            impressions = int(r.get("impressions", 0))
            clicks = int(r.get("clicks", 0))
            conversions = int(r.get("conversions", 0))
            revenue = float(r.get("revenue", 0.0))

            ctr = safe_divide(clicks, impressions, multiplier=100.0)
            cpc = safe_divide(spend, clicks, multiplier=1.0)
            conv_rate = safe_divide(conversions, clicks, multiplier=100.0)
            cpa = safe_divide(spend, conversions, multiplier=1.0)
            roas = safe_divide(revenue, spend, multiplier=1.0)

            total_spend += spend
            total_impressions += impressions
            total_clicks += clicks
            total_conversions += conversions
            total_revenue += revenue

            metric_rows.append(
                MetricRow(
                    campaign_id=str(r.get("campaign_id", "")),
                    campaign_name=str(r.get("campaign_name", "Unnamed Campaign")),
                    platform=str(r.get("platform", "Unknown")),
                    creative_variant=str(r.get("creative_variant", "Default")),
                    spend=round(spend, 2),
                    impressions=impressions,
                    clicks=clicks,
                    conversions=conversions,
                    revenue=round(revenue, 2),
                    ctr=ctr,
                    cpc=cpc,
                    conv_rate=conv_rate,
                    cpa=cpa,
                    roas=roas
                )
            )

        overall_ctr = safe_divide(total_clicks, total_impressions, multiplier=100.0)
        overall_cpc = safe_divide(total_spend, total_clicks, multiplier=1.0)
        overall_conv_rate = safe_divide(total_conversions, total_clicks, multiplier=100.0)
        overall_cpa = safe_divide(total_spend, total_conversions, multiplier=1.0)
        overall_roas = safe_divide(total_revenue, total_spend, multiplier=1.0)

        # Identify top and underperforming campaigns based on CPA and ROAS
        valid_converting = [m for m in metric_rows if m.conversions > 0]
        if valid_converting:
            # Lowest CPA and highest ROAS
            top_camp = min(valid_converting, key=lambda x: x.cpa if x.cpa > 0 else float("inf"))
            top_performing_name = f"{top_camp.campaign_name} (Lowest CPA: INR {top_camp.cpa:,.2f}, ROAS: {top_camp.roas}x)"
        else:
            top_performing_name = metric_rows[0].campaign_name if metric_rows else None

        # Underperforming: highest CPA or lowest ROAS
        if metric_rows:
            worst_camp = max(metric_rows, key=lambda x: (x.cpa if x.conversions > 0 else 999999))
            underperforming_name = f"{worst_camp.campaign_name} (High CPA: INR {worst_camp.cpa:,.2f}, Low ROAS: {worst_camp.roas}x)"
        else:
            underperforming_name = None

        interpretation = (
            f"Analyzed {len(metric_rows)} campaigns with total spend of INR {total_spend:,.2f} generating "
            f"{total_conversions:,} conversions and INR {total_revenue:,.2f} revenue (Blended ROAS: {overall_roas}x). "
            f"Average CPA across all channels is INR {overall_cpa:,.2f} with an overall conversion rate of {overall_conv_rate}%. "
            f"The strongest channel efficiency was observed in '{top_performing_name}', whereas "
            f"'{underperforming_name}' exhibits budget drag and requires immediate creative testing or reallocation."
        )

        return AnalyticsOutput(
            total_spend=round(total_spend, 2),
            total_impressions=total_impressions,
            total_clicks=total_clicks,
            total_conversions=total_conversions,
            total_revenue=round(total_revenue, 2),
            overall_ctr=overall_ctr,
            overall_cpc=overall_cpc,
            overall_conv_rate=overall_conv_rate,
            overall_cpa=overall_cpa,
            overall_roas=overall_roas,
            top_performing_campaign=top_performing_name,
            underperforming_campaign=underperforming_name,
            campaign_rows=metric_rows,
            interpretation=interpretation
        )
