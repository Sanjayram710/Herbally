import os
import json
from typing import List, Dict, Any, Optional
from app.config import settings
from app.schemas.state import (
    TargetPersona,
    StrategyOutput,
    ChannelRecommendation,
    SeoStrategyOutput,
    SeoKeywordItem,
    ContentStrategyOutput,
    AdCopyVariant,
    CampaignPlanItem,
    ProductUnderstanding
)
from app.services.guardrails import filter_safe_benefits


class LLMService:
    def __init__(self, provider: str = settings.LLM_PROVIDER, api_key: str = settings.LLM_API_KEY):
        self.provider = provider or "mock"
        self.api_key = api_key or os.getenv("LLM_API_KEY", "")

    def generate_audience_personas(self, product: ProductUnderstanding, market: str) -> List[TargetPersona]:
        """Generates grounded audience hypotheses (clearly labelled as AI-generated personas)."""
        return [
            TargetPersona(
                persona_name="Ananya, The Holistic Wellness Enthusiast",
                is_primary=True,
                demographics="Female, 28-42 years old, Metro India (Bengaluru, Mumbai, Delhi NCR, Pune), Household income > INR 20 LPA",
                psychographics_and_lifestyle="Passionate about clean beauty, yoga, organic nutrition, and mindful living. Highly values natural sleep hygiene and non-toxic home environments.",
                key_pain_points=[
                    "Prone to morning facial redness and breakouts from pillowcases harboring humidity and bacteria",
                    "Dislikes harsh chemical scents and synthetic anti-wrinkle chemical sheet treatments",
                    "Overwhelmed by vague 'eco-friendly' greenwashing without certified credentials"
                ],
                buying_motivations=[
                    "Seeks pure organic GOTS cotton infused with traditional Neem for clean night-time skin contact",
                    "Desires breathable luxury that promotes calm, restorative rest in tropical climates",
                    "Willing to pay a premium for certified ethical and herbal craftsmanship"
                ],
                potential_objections=[
                    "Will the herbal neem scent be overwhelming or bitter smelling? (Requires clarification: natural, neutral wash)",
                    "Does the antibacterial property wash off quickly? (Requires clarification: durable for up to 30 gentle washes)"
                ],
                hook_messaging="Experience the night-time purity of organic cotton infused with pure Neem leaf extracts. Wake up with skin that feels fresh, clean, and naturally soothed."
            ),
            TargetPersona(
                persona_name="Rohit, The High-Performance Urban Professional",
                is_primary=False,
                demographics="Male/Female, 30-48 years old, Tech/Finance executive in Tier 1 Indian metros, Income > INR 25 LPA",
                psychographics_and_lifestyle="Works 12-hour high-stress days; prioritizes recovery sleep, wearable sleep scores (Oura/Apple Watch), and climate-regulating bedding.",
                key_pain_points=[
                    "Wakes up hot and restless due to poor breathability in conventional high-thread-count synthetic sheets",
                    "Sensitive skin reacting to detergents and chemical fabric softeners",
                    "Little time to research complex textile certifications"
                ],
                buying_motivations=[
                    "Temperature-regulating breathable long-staple cotton satin weave",
                    "Natural antimicrobial neem barrier that keeps sheets hygienic between busy wash cycles",
                    "Minimalist, elegant earthy aesthetic that elevates modern master bedroom decor"
                ],
                potential_objections=[
                    "Is maintenance difficult? Can it be machine washed regularly on gentle cycle?"
                ],
                hook_messaging="Deep recovery sleep powered by nature. Breathable, 300-thread-count organic cotton treated with pure Neem botanicals for uninterrupted, skin-friendly rest."
            )
        ]

    def generate_strategy(
        self,
        product: ProductUnderstanding,
        budget: float,
        duration_days: int,
        marketing_goal: str
    ) -> StrategyOutput:
        """
        Creates positioning, objectives, channel distribution, and KPI framework.
        Budget allocation is mathematically constrained to match total budget exactly.
        """
        # Constrained budget distribution:
        # Meta/Instagram Ads: 50%
        # Google Search (High intent): 25%
        # Influencer Gifting & Micro-Creator UGC: 15%
        # Content SEO & Lifecycle: 10%
        channels = [
            ChannelRecommendation(
                channel="Instagram & Meta Ads",
                funnel_stage="TOFU (Awareness) & MOFU (Consideration)",
                budget_share_pct=50.0,
                budget_allocated_inr=round(budget * 0.50, 2),
                rationale_why="Visual video storytelling (Reels, Carousels) excels at demonstrating fabric texture, herbal infusion craft, and morning skin freshness to affluent urban Indian demographics."
            ),
            ChannelRecommendation(
                channel="Google Search Ads",
                funnel_stage="BOFU (High-Intent Conversion)",
                budget_share_pct=25.0,
                budget_allocated_inr=round(budget * 0.25, 2),
                rationale_why="Captures active high-intent search queries from consumers searching for organic bedsheets, sensitive-skin bedding, and antibacterial Ayurvedic home textiles in India."
            ),
            ChannelRecommendation(
                channel="Influencer Gifting & UGC Collaborations",
                funnel_stage="MOFU (Social Proof & Trust)",
                budget_share_pct=15.0,
                budget_allocated_inr=round(budget * 0.15, 2),
                rationale_why="Micro-creators in mindful wellness, clean skincare, and holistic yoga communities provide authentic unboxing and morning routine testimonials."
            ),
            ChannelRecommendation(
                channel="Organic Content, SEO & Email Flow",
                funnel_stage="Retention & Organic Organic Discovery",
                budget_share_pct=10.0,
                budget_allocated_inr=round(budget * 0.10, 2),
                rationale_why="Builds long-term organic authority around sleep hygiene and botanical textiles while setting up automated post-purchase welcome and care sequences."
            )
        ]

        return StrategyOutput(
            positioning_statement="For health-conscious urban Indians seeking clean, restorative sleep, Herbally Neem Bedsheet is the premium certified organic bedding that infuses time-tested botanical Neem to provide breathable, skin-soothing nightly hygiene without toxic chemicals.",
            core_value_proposition="Pure botanical sleep hygiene: 100% GOTS organic cotton infused with natural Neem leaf wash for fresh, calm, skin-friendly sleep.",
            marketing_objectives=[
                f"Achieve sustainable profitable D2C customer acquisition aligned with '{marketing_goal}' within INR {budget:,.0f} 30-day budget.",
                "Establish Herbally as the benchmark in authentic herbal textiles in Tier-1 metros.",
                "Target an initial Customer Acquisition Cost (CPA) under INR 1,100 with a blended ROAS > 2.8x."
            ],
            content_pillars=[
                "Pillar 1: Skin Wellness & Sleep Hygiene (The science of nocturnal skin contact & microbial buildup)",
                "Pillar 2: The Neem & Botanical Heritage (Traditional Ayurvedic wisdom verified through GOTS organic certification)",
                "Pillar 3: Honest Textile Craftsmanship (Breathable 300-TC satin weave, zero toxic dyes, non-synthetic wash)",
                "Pillar 4: Bedtime Rituals & Calm Living (Mindful bedrooms, peaceful morning unboxing, and restorative rest)"
            ],
            channels=channels,
            kpi_framework=[
                "Top-of-Funnel: Click-Through Rate (Target CTR > 2.2%), Video Hook 3s Rate > 35%",
                "Middle-of-Funnel: Cost Per Click (Target CPC < INR 25), Landing Page Add-to-Cart Rate > 7%",
                "Bottom-of-Funnel: Cost Per Acquisition (Target CPA < INR 1,100), Blended ROAS > 3.0x"
            ]
        )

    def generate_seo_strategy(self, product_name: str) -> SeoStrategyOutput:
        """Generates SEO keywords, categories, and content recommendations."""
        keywords = [
            SeoKeywordItem(
                keyword="organic neem bedsheet india",
                category="High Intent / Product Search",
                search_intent="Commercial / Transactional",
                content_recommendation="Primary keyword for the Herbally product landing page H1 and meta title."
            ),
            SeoKeywordItem(
                keyword="antibacterial bedsheets for sensitive skin",
                category="Problem-Solving / High Intent",
                search_intent="Commercial Investigation",
                content_recommendation="Dedicated problem-solution landing page and blog guide on bedtime skin health."
            ),
            SeoKeywordItem(
                keyword="ayurvedic herbal bedding cotton",
                category="Niche Wellness / Ayurvedic",
                search_intent="Informational / Commercial",
                content_recommendation="Feature article exploring traditional herbal wash textiles and modern certification."
            ),
            SeoKeywordItem(
                keyword="best bed sheets for acne prone skin",
                category="Skin Health Problem",
                search_intent="Informational",
                content_recommendation="Educational guide comparing synthetic sheets vs GOTS organic neem cotton."
            ),
            SeoKeywordItem(
                keyword="chemical free organic cotton sheets 300 tc",
                category="Specification / Quality Intent",
                search_intent="Transactional",
                content_recommendation="Incorporate in product specification schema, FAQ section, and GOTS cert badge."
            )
        ]

        on_page = [
            "Title Tag: 'Pure Neem Infused Organic Bedsheets | Skin-Friendly Ayurvedic Bedding — Herbally'",
            "Meta Description: 'Rest in pure GOTS-certified organic cotton infused with natural Neem leaf extract wash. Hypoallergenic, breathable, and antibacterial bedding crafted in India.'",
            "Structured Schema: Product Schema with verified INR 3,499 price, review ratings, in-stock availability, and GOTS certification badges.",
            "Visual Proof: Macro photography of the 300-TC weave and laboratory test certification snippet (ISO 20743)."
        ]

        blog_topics = [
            "The Bedtime Microbiome: Why Your Sheets Matter More for Skin Clarity Than Your Night Cream",
            "Ancient Botanicals, Modern Sleep: The Science Behind Neem-Infused Textiles",
            "Cotton vs Synthetic: Why Breathable Natural Weaves Are Essential in Humid Climates",
            "How to Care for Herbal Infused Linens: Washing Guidelines for Lasting Freshness"
        ]

        return SeoStrategyOutput(
            target_keywords=keywords,
            on_page_recommendations=on_page,
            blog_content_topics=blog_topics,
            product_page_seo_tips=[
                "Include clear wash care guidelines (up to 30 gentle washes retains botanical wash).",
                "Display honest customer reviews with verified skin-feel feedback.",
                "Ensure page load speed under 1.8 seconds on 4G mobile devices."
            ]
        )

    def generate_content_and_ads(self, product: ProductUnderstanding) -> ContentStrategyOutput:
        """Generates social concepts, weekly calendar, and 3 distinct ad copy variations."""
        ad_variants = [
            AdCopyVariant(
                platform="Instagram & Meta Feed",
                format="Video Reel (UGC Morning Routine)",
                headline="Your Night Cream Deserves Better Bedding.",
                body_copy="Did you know you spend 8 hours every night in direct skin contact with your bedsheets? Most conventional sheets trap humidity and microbial buildup. The Herbally Neem Bedsheet is woven from 100% GOTS organic cotton and infused with pure botanical Neem extracts. Naturally hypoallergenic, breathable, and soothing for sensitive skin. Wake up truly refreshed.",
                call_to_action="Shop Organic Neem Bedding — Free Shipping in India",
                target_angle="Skin Hygiene & Clean Beauty Routine Angle"
            ),
            AdCopyVariant(
                platform="Meta Ads (Carousel Comparison)",
                format="Carousel (Side-by-side Education)",
                headline="Synthetic Treated Sheets vs. Real Botanical Weave.",
                body_copy="Slide 1: Chemical antimicrobials vs 100% plant-based Neem infusion wash.\nSlide 2: Heat-trapping polyester blends vs breathable 300 Thread Count long-staple organic cotton.\nSlide 3: Toxic chemical dye runoff vs GOTS certified zero-toxin comfort.\nInvest in the purest sleep of your life.",
                call_to_action="Explore The Herbally Difference",
                target_angle="Eco-Conscious Transparency & Quality Craftsmanship"
            ),
            AdCopyVariant(
                platform="Google Search Ads",
                format="Responsive Search Text Ad",
                headline="Pure Neem Infused Bedsheets | 100% Organic GOTS Cotton",
                body_copy="Antibacterial, hypoallergenic, and gentle on sensitive skin. Naturally breathable Ayurvedic bedding crafted for clean restorative rest. Order today.",
                call_to_action="Order Now with 100% Comfort Guarantee",
                target_angle="Direct Intent & Problem-Solver Conversion"
            )
        ]

        calendar = [
            {"Day": "Monday", "Focus": "Pillar 1: Skin Hygiene", "Format": "Carousel", "Concept": "3 Signs Your Bedding Is Causing Morning Skin Breakouts"},
            {"Day": "Tuesday", "Focus": "Pillar 2: Ayurvedic Heritage", "Format": "Reel", "Concept": "Behind the Scenes: How Pure Neem Leaves Are Infused into Organic Yarn"},
            {"Day": "Wednesday", "Focus": "Pillar 3: Honest Textile Craft", "Format": "Static Infographic", "Concept": "The Anatomy of 300 Thread Count Organic Satin Weave"},
            {"Day": "Thursday", "Focus": "Pillar 4: Bedtime Rituals", "Format": "Reel", "Concept": "My Non-Toxic Nighttime Sanctuary: Setting Up for Deep Rest"},
            {"Day": "Friday", "Focus": "Customer Social Proof", "Format": "Customer Review Card", "Concept": "Real review: 'My sensitive skin hasn't felt this calm in years'"},
            {"Day": "Saturday", "Focus": "Education & FAQ", "Format": "Stories & Q&A", "Concept": "Does the neem smell? How do you wash it? Answering top customer questions"},
            {"Day": "Sunday", "Focus": "Lifestyle & Gifting", "Format": "Reel", "Concept": "Sunday morning in pure botanical luxury: The ultimate slow living bedroom"}
        ]

        return ContentStrategyOutput(
            instagram_ideas=[
                "Macro photography of raw organic cotton vs neem infusion extraction wash.",
                "Customer testimonial spotlight: Urban mothers and yoga instructors sharing bedroom photos.",
                "Interactive Quiz on Stories: 'What is your bedroom sleep hygiene score?'"
            ],
            reels_concepts=[
                "Morning skincare contrast: Washing face with clean water vs resting on botanical organic sheets.",
                "Unboxing Herbally: Biodegradable plastic-free unboxing experience with aromatic herb sachet.",
                "3 Bedding mistakes making you wake up sweating in Indian summers."
            ],
            youtube_video_ideas=[
                "Deep Dive: What are Herbal Textiles and Can Bedding Help Sensitive Skin? (Doctor/Botanist Interview)",
                "Minimalist Master Bedroom Tour: Creating a 100% Natural Sleep Haven in Mumbai"
            ],
            ad_copy_variations=ad_variants,
            weekly_content_calendar=calendar,
            email_flow_concepts=[
                "Welcome Flow Email 1: Welcome to Herbal Sleep — The story behind our Neem harvest.",
                "Welcome Flow Email 2: The 30-Wash Care Guide for Botanical Linens.",
                "Abandon Cart Reminder: Complete your sleep sanctuary — 100% organic neem comfort awaits."
            ]
        )

    def generate_campaign_plan(
        self,
        product: ProductUnderstanding,
        budget: float,
        duration_days: int
    ) -> List[CampaignPlanItem]:
        """Creates the human-reviewable campaign execution plan."""
        return [
            CampaignPlanItem(
                campaign_name="CAMP-001: IG-Reel-AcneSafeSleep",
                platform="Instagram",
                objective="Conversions (Sales)",
                target_audience="Conscious Wellness Consumers & Clean Skincare Enthusiasts (Age 24-40, Top Metros)",
                creative_type="Reel UGC Video (Morning Skin & Sleep Routine)",
                messaging="Experience night-time skin calm with pure Neem-infused 100% organic cotton bedding.",
                call_to_action="Shop Pure Neem Bedsheets",
                budget_inr=round(budget * 0.35, 2),
                duration_days=duration_days,
                primary_kpis=["ROAS > 3.5x", "CPA < INR 900", "CTR > 2.5%"],
                execution_status="SIMULATED_PENDING_APPROVAL"
            ),
            CampaignPlanItem(
                campaign_name="CAMP-002: Meta-Carousel-FabricComparison",
                platform="Meta Ads",
                objective="Catalog Sales / Conversions",
                target_audience="Eco-Conscious Parents & Sustainable Lifestyle Shoppers",
                creative_type="Carousel (GOTS Organic vs Polyester / Harsh Dyes)",
                messaging="Zero toxic dyes. Natural Neem botanical wash. Why your bedroom needs organic comfort.",
                call_to_action="Explore The Collection",
                budget_inr=round(budget * 0.25, 2),
                duration_days=duration_days,
                primary_kpis=["CTR > 1.8%", "CPA < INR 1,200", "Add-to-Cart Rate > 6%"],
                execution_status="SIMULATED_PENDING_APPROVAL"
            ),
            CampaignPlanItem(
                campaign_name="CAMP-003: Google-Search-AyurvedicBedding",
                platform="Google Search",
                objective="Search Conversions",
                target_audience="High-Intent Searchers for 'organic neem bedsheet' and 'antibacterial bedding'",
                creative_type="Responsive Search Ads with Sitelinks & Trust Badges",
                messaging="100% GOTS Organic Cotton Infused with Neem. Hypoallergenic & Breathable.",
                call_to_action="Order Now with 100% Comfort Guarantee",
                budget_inr=round(budget * 0.25, 2),
                duration_days=duration_days,
                primary_kpis=["Conversion Rate > 3.5%", "CPC < INR 35", "ROAS > 3.0x"],
                execution_status="SIMULATED_PENDING_APPROVAL"
            ),
            CampaignPlanItem(
                campaign_name="CAMP-004: IG-Story-InfluencerRetargeting",
                platform="Instagram",
                objective="Retargeting / Conversions",
                target_audience="Website Visitors (Past 30 Days) & Instagram Engagers who did not purchase",
                creative_type="Story Testimonials & 100-Night Comfort Guarantee Cut",
                messaging="Still thinking about clean, skin-soothing sleep? Your organic bedsheet is waiting.",
                call_to_action="Claim Your Botanical Set",
                budget_inr=round(budget * 0.15, 2),
                duration_days=duration_days,
                primary_kpis=["ROAS > 4.0x", "Frequency < 3.5", "CPA < INR 800"],
                execution_status="SIMULATED_PENDING_APPROVAL"
            )
        ]
