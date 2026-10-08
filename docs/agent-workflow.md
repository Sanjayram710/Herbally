# Agent Workflow & Data Flow Specification

## 1. End-to-End Operational Lifecycle

The system operates across two interlocked loops:
1. **The Strategic Planning Loop:** `Research → Analyze → Plan → Generate`
2. **The Operational Feedback Loop:** `Observe → Analyze → Decide → Act → Measure → Optimize`

```mermaid
sequenceDiagram
    autonumber
    actor Marketer as Marketing Strategist
    participant UI as React Dashboard
    participant API as FastAPI Gateway
    participant Orch as Marketing Orchestrator
    participant Guard as Guardrails Service
    participant Providers as Search & LLM Providers
    participant Analytics as Deterministic Analytics
    participant Opt as Optimization Engine
    participant DB as SQLite / Storage

    Marketer->>UI: Input Product (Herbally Neem Bedsheet), Goal & Budget (₹50,000)
    UI->>API: POST /api/marketing/analyze
    API->>Orch: run_strategy_workflow(req)

    rect rgb(20, 27, 44)
        Note over Orch,Guard: Discovery & Epistemic Grounding
        Orch->>Guard: Validate Features & Filter Medical Claims
        Orch->>Providers: Fetch Market Trends & Competitor Data (Mock/Search)
        Orch->>Providers: Generate Audience Personas (Hypotheses)
    end

    rect rgb(24, 32, 50)
        Note over Orch,Providers: Strategic Planning & Creative Generation
        Orch->>Providers: Generate Positioning & Mathematically Balanced Budget
        Orch->>Providers: Generate SEO Keyword Architecture
        Orch->>Providers: Generate 3 Ad Copy Variations & Editorial Calendar
        Orch->>Providers: Generate Simulated Campaign Execution Plan
    end

    Orch->>DB: Save WorkflowRun & State Snapshot
    Orch-->>API: Return Completed MarketingState
    API-->>UI: Render Strategy, Personas & Creatives

    Marketer->>UI: Upload Campaign Performance CSV
    UI->>API: POST /api/analytics/upload (file, workflow_id)
    API->>Analytics: Parse CSV & Compute CTR, CPC, CPA, ROAS (Safe Division)
    API->>Opt: Evaluate Deterministic Heuristics on Metric Rows
    Opt-->>API: Return Recommendations + Priority Next Best Action
    API->>DB: Persist Metrics, Updated State & Next Best Action
    API-->>UI: Render Hero Next Best Action Card & Analytics Tables

    Marketer->>UI: Click "Export Markdown / JSON Report"
    UI->>API: GET /api/reports/{workflow_id}/markdown
    API-->>Marketer: Download Complete Consolidated Report
```

---

## 2. Step-by-Step Data Flow & Node Responsibilities

### Step 1: Product Understanding
- **Inputs:** `product_name`, `brand`, `description`, `price_inr`, `verified_features`.
- **Validation:** `guardrails.py` eliminates ungrounded medical claims (e.g. "cures eczema" or "treats insomnia").
- **State Written:** `state.product`, `state.sources` (`VERIFIED_FACT`).

### Step 2: Market Research & Competitor Benchmarking
- **Inputs:** Product profile, target market (`India Tier-1 Metros`).
- **Processing:** Analyzes sustainable bedding trends, customer pain points, and benchmark profiles for Sunday Bedding, Duroflex Natural, and Organic Marketplaces.
- **State Written:** `state.research`, `state.competitors`, `state.sources` (`EXTERNAL_RESEARCH`).

### Step 3: Target Audience Hypotheses
- **Inputs:** Product features, pain points, market trends.
- **Processing:** Formulates two targeted consumer personas (Primary: Holistic Wellness Enthusiast; Secondary: High-Performance Urban Professional) with buying motivations and hook messages.
- **State Written:** `state.audience_analysis`, `state.sources` (`ASSUMPTION_OR_ESTIMATE`).

### Step 4: Marketing Strategy & Budget Allocation
- **Inputs:** Product understanding, budget (INR 50,000), duration (30 days), goal.
- **Processing:** Generates positioning statement, value proposition, and mathematically balanced channel budget allocation:
  - Instagram & Meta Ads: 50% (₹25,000)
  - Google Search Ads: 25% (₹12,500)
  - Influencer Gifting & UGC: 15% (₹7,500)
  - Content SEO & Lifecycle: 10% (₹5,000)
- **State Written:** `state.strategy`.

### Step 5: SEO & Keyword Architecture
- **Inputs:** Product terminology, Ayurvedic wellness search behavior.
- **Processing:** Categorizes high-intent search queries, informational blog topics, and on-page metadata recommendations.
- **State Written:** `state.seo_strategy`.

### Step 6: Creative Generation & Ad Copy
- **Inputs:** Strategic pillars, persona hooks.
- **Processing:** Generates 3 distinct ad copy variations (Hook, Body, CTA) tailored for Video Reels, Carousel Comparisons, and Search Text Ads, along with a 7-day editorial calendar.
- **State Written:** `state.content_strategy`.

### Step 7: Campaign Planning (Simulated Sandbox)
- **Inputs:** Strategic objectives, channels, creatives.
- **Processing:** Generates campaign specifications with target audiences, creative types, and explicit `SIMULATED_PENDING_APPROVAL` status.
- **State Written:** `state.campaign_plan`.

### Step 8: Campaign Analytics Ingestion
- **Inputs:** Uploaded CSV bytes (`campaign_name`, `platform`, `spend`, `impressions`, `clicks`, `conversions`, `revenue`).
- **Processing:** Computes deterministic metrics with IEEE 754 zero-division guards.
- **State Written:** `state.analytics`.

### Step 9: Optimization & Priority Next Best Action
- **Inputs:** `state.analytics.campaign_rows`.
- **Heuristics:**
  1. *Creative Winner Scaling:* If ROAS > 3.0x and CPA is low, scale spend by +25% and generate new hook variants.
  2. *Budget Drag Cut:* If campaign CPA is elevated with ROAS < 1.5x, pause creative and reallocate spend.
  3. *Search Query Cleanup:* Add negative keywords for low-intent leakage.
  4. *Lifecycle Retargeting:* Deploy automated email sequences for cart drop-offs.
- **Output:** Designated **Hero Next Best Action** card answering: *"WHAT SHOULD THE MARKETER DO NEXT?"*
