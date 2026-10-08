# Technical Decisions & Architecture Trade-offs

This document outlines key technical decisions made during the architecture and implementation of the AI-Powered Digital Marketing Strategist & Optimization Agent MVP.

---

## 1. Monolithic State Machine vs. Autonomous Multi-Agent Loops

* **Decision:** Implement a single synchronous `MarketingOrchestrator` coordinating structured services over a typed `MarketingState` model rather than dynamic autonomous agents or cyclic graph loops.
* **Reasoning:**
  * Marketing strategy creation is an inherently directed, sequential process: positioning cannot be generated before product understanding, and ad variations cannot precede strategic pillars.
  * Autonomous multi-agent loops (e.g. AutoGen / unconstrained ReAct loops) introduce latency, non-deterministic failures, redundant API costs, and hallucination loops.
  * A synchronous orchestrator with Pydantic validation guarantees predictable latency (< 3 seconds locally), strict contract adherence, and deterministic repeatability.

---

## 2. Deterministic Analytics Engine vs. LLM Arithmetic

* **Decision:** Compute all KPIs (CTR, CPC, CPA, ROAS, conversion rates) strictly in Python/Pandas with safe-division helper functions.
* **Reasoning:**
  * LLMs are notoriously error-prone when calculating ratios, percentages, and financial metrics.
  * Production marketing decision-making requires 100% mathematical precision.
  * The LLM is used solely to generate qualitative narratives and contextual interpretations, while numerical calculations remain 100% deterministic.

---

## 3. Epistemic Separation & Guardrails

* **Decision:** Require explicit classification of every output item into one of four categories (`VERIFIED_FACT`, `EXTERNAL_RESEARCH`, `AI_RECOMMENDATION`, `ASSUMPTION_OR_ESTIMATE`), paired with a regex-based medical claim validator.
* **Reasoning:**
  * In the herbal textile and wellness sector (e.g., Herbally Neem Bedsheets), brands face serious regulatory and consumer trust liabilities if they make unsubstantiated health or medical claims (e.g., curing eczema or insomnia).
  * Clear provenance ensures marketers know exactly what comes from official lab certifications vs. what is a working AI hypothesis.

---

## 4. Replaceable Provider Abstraction (Zero-Cost Local Dev)

* **Decision:** Decouple external LLM and Search APIs through provider interfaces with high-quality, pre-calibrated domain mock providers as default fallbacks.
* **Reasoning:**
  * Enables reviewers, developers, and automated CI test suites to run the full application and demo with zero API keys and zero cost.
  * Live external APIs (OpenAI, Gemini, Anthropic, Tavily) can be enabled seamlessly by setting `LLM_API_KEY` or `SEARCH_API_KEY` in `.env` without modifying application logic.

---

## 5. SQLite + SQLAlchemy 2.0 ORM

* **Decision:** Use SQLite for local development while structuring all models with SQLAlchemy 2.0 declarative syntax.
* **Reasoning:**
  * SQLite provides zero-configuration local persistence requiring no background database services (e.g., Dockerized PostgreSQL).
  * Standard SQLAlchemy ORM constructs (`Relationship`, `Column`, `DateTime`, `JSON`) ensure the database layer can point to PostgreSQL simply by changing `DATABASE_URL`.

---

## 6. Frontend: Single Guided Dashboard vs. 13 Fragmented Pages

* **Decision:** Build a single responsive wizard/dashboard with step progression and tabbed modules rather than 13 distinct multi-page routes.
* **Reasoning:**
  * Marketing planners need unified context: seeing how performance metrics directly inform the Next Best Action on a single screen creates a vastly superior user experience compared to clicking across disconnected pages.
  * Highlighting the **Next Best Action** card as the hero element ensures marketers instantly get their primary question answered: *"What should I do next?"*
