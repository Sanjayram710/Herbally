import time
import datetime
from typing import Optional, List, Dict, Any
from app.schemas.state import (
    MarketingState,
    ProductUnderstanding,
    EpistemicSource,
    AssumptionItem,
    ErrorItem,
    AgentRunTrace
)
from app.schemas.product import WorkflowTriggerRequest
from app.services.guardrails import filter_safe_benefits
from app.services.research_service import ResearchService
from app.services.llm_service import LLMService
from app.services.analytics_service import AnalyticsService
from app.services.optimization_service import OptimizationService


class MarketingOrchestrator:
    def __init__(self):
        self.research_service = ResearchService()
        self.llm_service = LLMService()
        self.analytics_service = AnalyticsService()
        self.optimization_service = OptimizationService()

    def run_strategy_workflow(self, req: WorkflowTriggerRequest) -> MarketingState:
        """
        Executes the synchronous end-to-end marketing strategy workflow
        across logical domain steps, maintaining shared typed state and provenance.
        """
        traces: List[AgentRunTrace] = []
        sources: List[EpistemicSource] = []
        assumptions: List[AssumptionItem] = []
        errors: List[ErrorItem] = []

        start_time = time.time()

        # Step 1: Product Understanding
        t0 = time.time()
        verified_features = [
            "100% GOTS-certified organic long-staple cotton (300 TC satin weave)",
            "Treated with natural Azadirachta indica (Neem) leaf extract herbal infusion",
            "Zero toxic synthetic chemical dyes, formaldehyde-free",
            "Naturally hypoallergenic and antibacterial fabric surface",
            "Retains botanical properties for up to 30 gentle washes"
        ]
        supported_benefits = filter_safe_benefits([
            "Gentle and soothing on sensitive or easily irritated skin",
            "Inhibits odor buildup and nighttime humidity trapping",
            "Promotes fresh, breathable sleep comfort without synthetic finishes"
        ])
        prohibited_claims = [
            "Cannot claim it cures eczema or psoriasis",
            "Cannot claim it treats insomnia or medical sleep disorders",
            "Cannot claim it replaces clinical dermatological treatments"
        ]

        product_understanding = ProductUnderstanding(
            product_name=req.product_name,
            brand=req.brand,
            category="Herbal Textiles & Wellness Bedding",
            verified_features=verified_features,
            explicitly_supported_benefits=supported_benefits,
            prohibited_claims=prohibited_claims,
            differentiators=[
                "Proprietary Ayurvedic herbal infusion wash",
                "Authentic GOTS organic certification standard",
                "Non-toxic botanical hygiene instead of chemical antimicrobials"
            ],
            target_use_cases=[
                "Daily clean sleep for sensitive and acne-prone skin",
                "Mindful non-toxic bedroom furnishing for young families and wellness seekers"
            ],
            pricing_inr=3499.0,
            sources=["Brand Product Catalog", "GOTS Certification #CU814892", "ISO 20743 Antibacterial Lab Test"]
        )

        sources.append(
            EpistemicSource(
                category="VERIFIED_FACT",
                description="Product composition, thread count, and GOTS organic certification.",
                source_reference="Herbally Brand Lab Verification & Product Spec Sheet",
                confidence_level="HIGH"
            )
        )
        traces.append(
            AgentRunTrace(
                step_name="Product Understanding",
                agent="ProductUnderstandingAgent",
                status="completed",
                duration_ms=int((time.time() - t0) * 1000),
                timestamp=datetime.datetime.utcnow().isoformat()
            )
        )

        # Step 2: Market Research & Competitor Analysis
        t0 = time.time()
        market_research = self.research_service.conduct_market_research(req.product_name, req.market)
        competitors = self.research_service.analyze_competitors(req.product_name)

        sources.append(
            EpistemicSource(
                category="EXTERNAL_RESEARCH",
                description="Indian sustainable textile and sleep hygiene trends across metro consumers.",
                source_reference="MockResearchProvider (Herbally Indian D2C Market Benchmark)",
                confidence_level="MEDIUM"
            )
        )
        assumptions.append(
            AssumptionItem(
                category="Market Scope",
                statement="Assumed target geographic focus is Indian Tier 1 metros (Mumbai, Bengaluru, Delhi NCR, Pune, Hyderabad).",
                impact="Media spend and CPMs reflect urban English/Hindi speaking audiences."
            )
        )
        traces.append(
            AgentRunTrace(
                step_name="Market Research & Competitors",
                agent="MarketResearchAgent",
                status="completed",
                duration_ms=int((time.time() - t0) * 1000),
                timestamp=datetime.datetime.utcnow().isoformat()
            )
        )

        # Step 3: Audience Personas
        t0 = time.time()
        audience_personas = self.llm_service.generate_audience_personas(product_understanding, req.market)
        sources.append(
            EpistemicSource(
                category="ASSUMPTION_OR_ESTIMATE",
                description="Psychographic profiles for wellness enthusiast and urban professional personas.",
                source_reference="AI-Generated Audience Hypotheses (Grounding Filtered)",
                confidence_level="MEDIUM"
            )
        )
        traces.append(
            AgentRunTrace(
                step_name="Target Audience Personas",
                agent="AudienceAgent",
                status="completed",
                duration_ms=int((time.time() - t0) * 1000),
                timestamp=datetime.datetime.utcnow().isoformat()
            )
        )

        # Step 4: Marketing Strategy
        t0 = time.time()
        strategy = self.llm_service.generate_strategy(
            product=product_understanding,
            budget=req.budget,
            duration_days=req.duration_days,
            marketing_goal=req.marketing_goal
        )
        sources.append(
            EpistemicSource(
                category="AI_RECOMMENDATION",
                description="Channel allocation and budget split across Meta, Google Search, and Influencer Gifting.",
                source_reference="Deterministic Strategic Allocation Logic",
                confidence_level="HIGH"
            )
        )
        traces.append(
            AgentRunTrace(
                step_name="Marketing Strategy & Budgeting",
                agent="StrategyAgent",
                status="completed",
                duration_ms=int((time.time() - t0) * 1000),
                timestamp=datetime.datetime.utcnow().isoformat()
            )
        )

        # Step 5: SEO Strategy
        t0 = time.time()
        seo_strategy = self.llm_service.generate_seo_strategy(req.product_name)
        traces.append(
            AgentRunTrace(
                step_name="SEO Keyword Strategy",
                agent="SeoAgent",
                status="completed",
                duration_ms=int((time.time() - t0) * 1000),
                timestamp=datetime.datetime.utcnow().isoformat()
            )
        )

        # Step 6: Content & Ad Variations
        t0 = time.time()
        content_strategy = self.llm_service.generate_content_and_ads(product_understanding)
        traces.append(
            AgentRunTrace(
                step_name="Content & Ad Copy Generation",
                agent="ContentAgent",
                status="completed",
                duration_ms=int((time.time() - t0) * 1000),
                timestamp=datetime.datetime.utcnow().isoformat()
            )
        )

        # Step 7: Campaign Planning
        t0 = time.time()
        campaign_plan = self.llm_service.generate_campaign_plan(
            product=product_understanding,
            budget=req.budget,
            duration_days=req.duration_days
        )
        traces.append(
            AgentRunTrace(
                step_name="Campaign Plan Specification",
                agent="CampaignAgent",
                status="completed",
                duration_ms=int((time.time() - t0) * 1000),
                timestamp=datetime.datetime.utcnow().isoformat()
            )
        )

        # Construct initial state
        state = MarketingState(
            product_name=req.product_name,
            brand=req.brand,
            market=req.market,
            target_audience_input=req.target_audience_hint or "Conscious wellness seekers",
            marketing_goal=req.marketing_goal,
            budget=req.budget,
            duration_days=req.duration_days,
            product=product_understanding,
            research=market_research,
            competitors=competitors,
            audience_analysis=audience_personas,
            strategy=strategy,
            seo_strategy=seo_strategy,
            content_strategy=content_strategy,
            campaign_plan=campaign_plan,
            campaign_data_loaded=False,
            sources=sources,
            assumptions=assumptions,
            errors=errors,
            agent_runs=traces
        )

        return state

    def attach_campaign_metrics_and_optimize(
        self,
        state: MarketingState,
        raw_rows: List[Dict[str, Any]]
    ) -> MarketingState:
        """
        Ingests campaign metrics, executes deterministic analytics,
        applies optimization heuristics, and updates state with the Next Best Action.
        """
        t0 = time.time()
        analytics_output = self.analytics_service.process_campaign_metrics(raw_rows)
        recommendations, next_best_action = self.optimization_service.generate_optimizations(analytics_output)

        state.campaign_data_loaded = True
        state.analytics = analytics_output
        state.recommendations = recommendations
        state.next_best_action = next_best_action

        state.sources.append(
            EpistemicSource(
                category="EXTERNAL_RESEARCH",
                description=f"Ingested {len(raw_rows)} campaign metric data points for deterministic performance analysis.",
                source_reference="Uploaded Campaign Performance CSV",
                confidence_level="HIGH"
            )
        )
        state.agent_runs.append(
            AgentRunTrace(
                step_name="Campaign Analytics & KPI Computation",
                agent="AnalyticsAgent",
                status="completed",
                duration_ms=int((time.time() - t0) * 1000),
                timestamp=datetime.datetime.utcnow().isoformat()
            )
        )
        state.agent_runs.append(
            AgentRunTrace(
                step_name="Optimization & Next Best Action",
                agent="OptimizationAgent",
                status="completed",
                duration_ms=int((time.time() - t0) * 1000),
                timestamp=datetime.datetime.utcnow().isoformat()
            )
        )

        return state
