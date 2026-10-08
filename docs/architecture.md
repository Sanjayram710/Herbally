# System Architecture & Technical Design

## 1. Overview

The **AI-Powered Digital Marketing Strategist & Optimization Agent** is an end-to-end full-stack agentic system engineered for high-end niche consumer brands (demonstrated with **Herbally Neem Infused Bedding**). 

The platform departs fundamentally from naive prompt-in/text-out LLM wrappers by coupling **typed state machines**, **deterministic arithmetic**, **epistemic grounding**, and **actionable heuristic decision loops**.

---

## 2. Mermaid System Architecture Diagram

```mermaid
graph TD
    subgraph Client ["Frontend Presentation Layer (React + TS + Vite)"]
        UI_Dash["Dashboard & Stepper Wizard"]
        UI_NBA["Priority Next Best Action Hero Card"]
        UI_Strat["Strategy, Personas & Creative Hub"]
        UI_CSV["CSV Dropzone & Sample Seeder"]
        UI_Analytics["Deterministic KPI Analytics Table"]
    end

    subgraph API ["Backend Gateway Layer (FastAPI REST)"]
        Router_Products["/api/products"]
        Router_Marketing["/api/marketing/analyze"]
        Router_Analytics["/api/analytics/upload"]
        Router_Opt["/api/optimization/run"]
        Router_Reports["/api/reports/{id}/*"]
    end

    subgraph Orchestrator ["Orchestration & State Management"]
        M_Orch["MarketingOrchestrator"]
        State["Shared MarketingState (Pydantic v2)"]
    end

    subgraph Logical_Agents ["Domain Agents & Services"]
        A_Prod["Product Understanding (Guardrail Filter)"]
        A_Research["Market Research (Mock/Live Search)"]
        A_Comp["Competitor Benchmark Engine"]
        A_Audience["Audience Persona Generator"]
        A_Strategy["Strategy & Balanced Budget Engine"]
        A_SEO["SEO Keyword & Architecture Engine"]
        A_Content["Creative Ad Copy & Calendar Engine"]
        A_Campaign["Simulated Campaign Plan Generator"]
        A_Analytics["Deterministic Analytics Engine (Pandas)"]
        A_Opt["Optimization & Next Best Action Heuristics"]
    end

    subgraph Data_Storage ["Persistence & Provenance"]
        DB[(SQLite / PostgreSQL SQLAlchemy ORM)]
        Epistemic["Epistemic Provenance (Facts vs AI vs Assumptions)"]
        Files["data/sample_campaign.csv & data/sample_products.json"]
    end

    UI_Dash --> Router_Marketing
    UI_CSV --> Router_Analytics
    Router_Marketing --> M_Orch
    Router_Analytics --> A_Analytics

    M_Orch --> State
    State <--> A_Prod
    State <--> A_Research
    State <--> A_Comp
    State <--> A_Audience
    State <--> A_Strategy
    State <--> A_SEO
    State <--> A_Content
    State <--> A_Campaign
    State <--> A_Analytics
    State <--> A_Opt

    M_Orch --> DB
    M_Orch --> Epistemic
    A_Analytics --> Epistemic
```

---

## 3. Core Architectural Subsystems

### 3.1 Synchronous Monolith vs. Autonomous Loops
To prevent unbounded recursion, state corruption, or nondeterministic failure mid-workflow, the system uses a single synchronous `MarketingOrchestrator` coordinating typed functional services. Each step takes and updates an immutable snapshot of `MarketingState`.

### 3.2 Epistemic Classification Engine
Every insight or recommendation rendered to the end-user is tagged with an epistemic category:
1. `VERIFIED_FACT`: Grounded in confirmed brand product specifications (GOTS certifications, verified botanical wash properties).
2. `EXTERNAL_RESEARCH`: Empirical market data and benchmark studies.
3. `AI_RECOMMENDATION`: Model-synthesized strategies, channel allocations, and ad copy variants.
4. `ASSUMPTION_OR_ESTIMATE`: Working hypotheses (target personas, estimated search volume, cost estimates).

### 3.3 Zero-Division Deterministic Math
All metric computations ($CTR = \frac{Clicks}{Impressions} \times 100$, $CPC = \frac{Spend}{Clicks}$, $CPA = \frac{Spend}{Conversions}$, $ROAS = \frac{Revenue}{Spend}$) are strictly calculated in Python using protected floating-point arithmetic with safe division guards. The LLM is never invoked for arithmetic calculations.

### 3.4 Non-Negotiable Medical Claim Guardrails
The system implements regex-based guardrail filtering checking for prohibited medical assertions (e.g., curing eczema, treating insomnia, medical therapies) before outputting ad copy or product benefit summaries.
