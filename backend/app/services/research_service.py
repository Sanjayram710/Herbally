from typing import List, Dict, Any
from app.schemas.state import (
    MarketResearchOutput,
    MarketResearchItem,
    CompetitorProfile,
    EpistemicSource,
    AssumptionItem
)


class ResearchService:
    def __init__(self, provider_type: str = "mock", api_key: str = ""):
        self.provider_type = provider_type
        self.api_key = api_key

    def conduct_market_research(self, product_name: str, market: str) -> MarketResearchOutput:
        """
        Conducts research on the Indian premium wellness & herbal textiles market.
        Uses grounded domain knowledge labelled clearly as sample/mock research.
        """
        trends = [
            MarketResearchItem(
                trend_title="Surge in Sleep Hygiene & Conscious Bedding in Metro India",
                summary="Over 68% of urban consumers in Mumbai, Bengaluru, and Delhi NCR prioritize natural bedding over synthetic blends due to tropical humidity and sensitive skin concerns.",
                evidence_or_source="India Sleep Wellness Consumer Survey & FICCI Sustainable Textile Report (Sample Market Dataset)",
                opportunity_for_brand="Position Herbally Neem Bedsheets around breathable sleep hygiene and botanical skin freshness rather than generic home decor."
            ),
            MarketResearchItem(
                trend_title="Growing Trust in Ayurvedic & Botanical Infused Living",
                summary="Consumers actively seek modern adaptations of traditional Ayurvedic botanicals (Neem, Tulsi, Vetiver) when backed by certifications like GOTS organic.",
                evidence_or_source="Ayur-Commerce D2C Market Benchmark (Sample Industry Dataset)",
                opportunity_for_brand="Leverage authentic Neem herbal infusion wash with GOTS organic cotton verification to establish premium scientific-traditional credibility."
            ),
            MarketResearchItem(
                trend_title="Preference for Transparency & Chemical-Free Living",
                summary="Educated young parents and wellness professionals actively avoid formaldehyde, toxic azo dyes, and synthetic antimicrobials.",
                evidence_or_source="Clean Textile Association Consumer Study 2024 (Sample Research Reference)",
                opportunity_for_brand="Highlight zero toxic chemicals and gentle, non-irritating botanical protection for acne-prone skin."
            )
        ]

        pain_points = [
            "Synthetic or treated polyester bedsheets cause heat trapping and night sweating in Indian weather.",
            "Bedding often harbors odor-causing bacteria and dust mites, aggravating morning acne and skin flare-ups.",
            "Consumers are skeptical of greenwashing and demand verifiable certifications (GOTS, natural plant extracts).",
            "Frequent washing deteriorates low-quality printed sheets quickly."
        ]

        return MarketResearchOutput(
            market_overview="The Indian premium wellness home textile sector is expanding at 14.5% CAGR, fueled by urban D2C consumers seeking organic, skin-friendly, and climate-responsive sleep solutions.",
            consumer_trends=trends,
            pain_points=pain_points,
            is_sample_data=True,
            provider_source="MockResearchProvider (Herbally Indian D2C Wellness Benchmark)"
        )

    def analyze_competitors(self, product_name: str) -> List[CompetitorProfile]:
        """
        Provides competitive landscape benchmarking for Indian wellness bedding.
        """
        return [
            CompetitorProfile(
                name="Sunday Bedding",
                positioning="Minimalist, European-engineered sleep comfort and organic cotton sheets.",
                target_audience="Urban professionals (28-45) valuing Scandinavian minimalism.",
                price_range="INR 3,200 - 4,800",
                channels=["Meta Ads", "Google Search", "Architectural Digest Sponsorships"],
                content_style="Clean, high-key studio aesthetic, white backgrounds, luxury minimalist tone.",
                strengths=[
                    "Strong D2C brand equity in Tier 1 cities",
                    "100-night trial sleep warranty model",
                    "High customer review volume on mattresses"
                ],
                weaknesses=[
                    "No botanical or Ayurvedic herbal infusion differentiators",
                    "Positioned purely on aesthetic comfort, not skin wellness or antimicrobial hygiene"
                ],
                opportunity_for_brand="Herbally can differentiate by owning the 'herbal skin-wellness' sleep niche, highlighting natural Neem protection that Sunday lacks.",
                sources_and_assumptions="Public D2C website catalog & social ad library observation (Mock sample data)"
            ),
            CompetitorProfile(
                name="Duroflex Natural Living",
                positioning="Mainstream legacy mattress giant's eco-friendly natural coir and cotton sub-brand.",
                target_audience="Broad family demographic seeking trusted legacy mattress reliability.",
                price_range="INR 2,800 - 4,200 for organic sheet sets",
                channels=["TV Commercials", "Multi-brand Retail Outlets", "Google Display"],
                content_style="Celebrity-endorsed, mass-market family emotional storytelling.",
                strengths=[
                    "Massive national offline distribution across 50+ cities",
                    "Celebrity endorsement and high household brand recall"
                ],
                weaknesses=[
                    "Perceived as traditional and corporate rather than specialized boutique wellness",
                    "Generic organic messaging without focused herbal infusion benefits"
                ],
                opportunity_for_brand="Herbally wins on niche authenticity, handcrafted botanical wash credibility, and direct D2C relationship with modern wellness consumers.",
                sources_and_assumptions="Public retail pricing & brand marketing analysis (Mock sample data)"
            ),
            CompetitorProfile(
                name="Amala Earth / Conscious Marketplaces",
                positioning="Aggregator platform for curated organic home linen and eco-friendly handicrafts.",
                target_audience="Conscious consumers looking for sustainable artisan home decor.",
                price_range="INR 2,500 - 5,500 across various artisan brands",
                channels=["Instagram Influencers", "Email Newsletters", "Organic SEO"],
                content_style="Earthy, artisanal, handloom-focused rustic photography.",
                strengths=[
                    "High organic trust among eco-conscious community",
                    "Broad marketplace catalog variety"
                ],
                weaknesses=[
                    "Inconsistent product standards across multiple third-party sellers",
                    "No dedicated brand story or proprietary laboratory-verified herbal wash"
                ],
                opportunity_for_brand="Herbally provides a single, certified, consistent brand standard with verifiable Neem antimicrobial wash testing.",
                sources_and_assumptions="Marketplace catalog analysis & community reviews (Mock sample data)"
            )
        ]
