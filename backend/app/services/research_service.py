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
        Conducts research on the target market.
        Uses grounded domain knowledge labelled clearly as sample/benchmark research.
        """
        is_herbally = any(k in product_name.lower() for k in ("neem", "bedsheet", "herbally"))
        if is_herbally:
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

        trends = [
            MarketResearchItem(
                trend_title=f"Rapid Adoption of Premium {product_name} Solutions in {market}",
                summary=f"Discerning consumers in {market} increasingly favor specialized, transparent offerings with verified performance over generic legacy options.",
                evidence_or_source=f"{market} Consumer Market Insights Report (Sample Benchmark)",
                opportunity_for_brand=f"Differentiate {product_name} through transparent value propositions, rapid onboarding, and verified quality guarantees."
            ),
            MarketResearchItem(
                trend_title="Digital-First Discovery and Social Proof Dominance",
                summary="Over 62% of potential buyers research customer testimonials, verified case studies, and creator demonstrations prior to purchase.",
                evidence_or_source="Global Digital Commerce Trends (Sample Industry Dataset)",
                opportunity_for_brand=f"Establish an omnichannel content footprint showcasing real-world performance of {product_name}."
            ),
            MarketResearchItem(
                trend_title="High Demand for Responsive Customer Experience and Rapid Support",
                summary="Buyers reward brands that offer personalized onboarding, clear return/trial options, and proactive customer engagement.",
                evidence_or_source="Customer Experience and Brand Loyalty Benchmark",
                opportunity_for_brand="Combine streamlined purchase flows with interactive customer support and clear product education."
            )
        ]

        pain_points = [
            f"Buyers find existing {product_name} offerings fragmented, with unclear specifications.",
            "High customer acquisition friction due to insufficient proof or unverified marketing claims.",
            "Lack of responsive post-purchase support and product guidance.",
            "Price-to-value transparency is frequently lacking among legacy competitors."
        ]

        return MarketResearchOutput(
            market_overview=f"The market for {product_name} in {market} is experiencing strong momentum as consumers shift toward dedicated quality and modern digital discovery.",
            consumer_trends=trends,
            pain_points=pain_points,
            is_sample_data=True,
            provider_source=f"UniversalBenchmarkProvider ({market} Multi-Category Model)"
        )

    def analyze_competitors(self, product_name: str) -> List[CompetitorProfile]:
        """
        Provides competitive landscape benchmarking.
        """
        is_herbally = any(k in product_name.lower() for k in ("neem", "bedsheet", "herbally"))
        if is_herbally:
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

        return [
            CompetitorProfile(
                name="Market Leader Alpha",
                positioning=f"High-volume, mainstream incumbent in the {product_name} category.",
                target_audience="Broad mass-market consumer base looking for standard convenience.",
                price_range="Category Average (+/- 15%)",
                channels=["Meta Ads", "Google Ads", "Affiliate Networks"],
                content_style="High-velocity promo-driven marketing, discount overlays, template ads.",
                strengths=[
                    "High initial search visibility and brand awareness",
                    "Extensive catalog distribution"
                ],
                weaknesses=[
                    "Impersonal, automated customer service experience",
                    "Limited specialized innovation or customization"
                ],
                opportunity_for_brand=f"Outperform on bespoke customer experience, specialized quality, and authentic storytelling for {product_name}.",
                sources_and_assumptions="Public industry analysis and benchmarking (Sample dataset)"
            ),
            CompetitorProfile(
                name="Boutique Challenger Beta",
                positioning=f"Niche design-forward direct-to-consumer challenger for {product_name}.",
                target_audience="Discerning early adopters seeking modern design and lifestyle alignment.",
                price_range="Premium tier (25-35% above average)",
                channels=["Instagram", "TikTok / Reels", "Creator Partnerships"],
                content_style="Polished UGC, aesthetic product unboxings, aspirational lifestyle imagery.",
                strengths=[
                    "High social engagement and loyal community following",
                    "Strong visual aesthetic"
                ],
                weaknesses=[
                    "Narrow inventory and longer delivery lead times",
                    "Higher barrier to entry for pragmatic buyers"
                ],
                opportunity_for_brand=f"Offer superior value, faster fulfillment, and verified satisfaction guarantees.",
                sources_and_assumptions="Social commerce monitoring and community analysis (Sample dataset)"
            )
        ]
