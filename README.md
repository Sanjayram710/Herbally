# AI-Powered Digital Marketing Strategist & Optimization Agent

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org)
[![Tests](https://img.shields.io/badge/Tests-13%20Passed-brightgreen.svg)](file:///backend/tests)

An end-to-end full-stack agentic system engineered for premium niche consumer brands. Rather than functioning as an ungrounded "ChatGPT for marketing" prompt wrapper, this system combines **typed state machines**, **deterministic arithmetic**, **epistemic provenance tracking**, **non-negotiable medical claim guardrails**, and **heuristic decision loops**.

Demonstrated on the real premium brand **Herbally** and its flagship **Pure Neem Infused Organic Bedsheet**.

---

## 1. Problem & Solution

### The Problem
* Generative LLMs generate hallucinated marketing claims, invent health benefits, create mathematically unbalanced budgets, and produce ungrounded ad copy.
* Traditional digital marketers struggle to synthesize campaign metrics into immediate, prioritized operational next steps.

### The Solution
* **Strict Grounding:** Distinguishes verified facts, market research, AI hypotheses, and assumptions.
* **Non-Negotiable Guardrails:** Programmatically detects and prevents illegal or misleading medical claims (e.g., curing eczema or insomnia).
* **Deterministic Calculations:** Computes CTR, CPC, CPA, ROAS, and conversion rates in pure Python with zero-division safety.
* **Priority Next Best Action:** Answers the single most critical marketing question: *"What should the marketer do next?"* with concrete evidence, strategic rationale, and expected impact.

---

## 2. Product Concept & Demo Scenario

* **Brand:** Herbally (Indian Herbal Textiles & Sleep Wellness)
* **Product:** Herbally Pure Neem Infused Organic Bedsheet (100% GOTS organic cotton, 300 Thread Count satin weave, natural Neem botanical extract wash, hypoallergenic).
* **Market:** India (Tier 1 Metros: Mumbai, Bengaluru, Delhi NCR, Pune, Hyderabad).
* **Marketing Goal:** Increase online D2C sales.
* **Monthly Budget:** INR 50,000 (30-day duration).

---

## 3. Technology Stack

* **Backend:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0 ORM, SQLite (local MVP, PostgreSQL compatible), Pandas.
* **Frontend:** React 18, TypeScript, Vite, Lucide Icons, Vanilla CSS with custom glassmorphism design system.
* **Testing:** Pytest (13 automated tests covering zero-division safety, CSV ingestion, heuristics, guardrails, and full E2E workflow).
* **Execution Mode:** 100% functional locally at zero cost using pre-calibrated domain mock providers; plug-and-play support for OpenAI/Gemini/Tavily via environment variables.

---

## 4. Repository Structure

```text
c:\DM\
├── .env.example
├── .gitignore
├── README.md
├── docker-compose.yml
├── data/
│   ├── sample_campaign.csv        # Realistic campaign performance dataset
│   └── sample_products.json       # Grounded Herbally product catalog seed
├── docs/
│   ├── architecture.md            # System architecture with Mermaid diagrams
│   ├── agent-workflow.md          # Step-by-step agent data flow and sequences
│   └── technical-decisions.md     # Technology choices & trade-off rationale
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                # FastAPI app with lifespan seeders & CORS
│   │   ├── config.py              # Pydantic Settings
│   │   ├── database.py            # SQLAlchemy engine & session maker
│   │   ├── models/                # Product, Campaign, WorkflowRun, Recommendation
│   │   ├── schemas/               # MarketingState & Pydantic domain models
│   │   ├── services/
│   │   │   ├── orchestrator.py    # Synchronous Marketing Orchestrator
│   │   │   ├── analytics_service.py # Deterministic metrics with zero-division safety
│   │   │   ├── optimization_service.py # Heuristic engine & Next Best Action
│   │   │   ├── research_service.py  # Mock/Live search & competitor intelligence
│   │   │   ├── llm_service.py     # Replaceable LLM adapter with deterministic fallback
│   │   │   ├── guardrails.py      # Health & medical claim compliance filters
│   │   │   └── report_service.py  # Markdown & JSON report generator
│   │   └── api/
│   │       └── routes.py          # REST endpoints
│   └── tests/
│       ├── test_analytics.py      # Zero-division math & CSV safety tests
│       ├── test_optimization.py   # Heuristic rules & Next Best Action tests
│       ├── test_guardrails.py     # Medical claim compliance tests
│       └── test_e2e_workflow.py   # Automated end-to-end pipeline test
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── App.tsx                # Guided wizard orchestrating the 5 stages
        ├── index.css              # Custom rich aesthetic design system
        ├── types/index.ts         # TypeScript data definitions
        ├── services/api.ts        # API client
        └── components/
            ├── Header.tsx
            ├── WorkflowStepper.tsx
            ├── NextBestActionCard.tsx # Hero priority recommendation card
            ├── ProductSetupSection.tsx
            ├── StrategySection.tsx
            ├── AnalyticsSection.tsx
            └── OptimizationSection.tsx
```

---

## 5. Quickstart & Installation

### Prerequisites
* Python 3.11+
* Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```
* Backend will be available at: `http://127.0.0.1:8001`
* Interactive API Documentation (Swagger UI): `http://127.0.0.1:8001/docs`

### 2. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
npx vite --port 5173 --host 127.0.0.1
```
* Dashboard will be live at: `http://127.0.0.1:5173`

---

## 6. Demo Walkthrough Guide

1. **Step 1: Product & Goal Setup**
   * Open `http://127.0.0.1:5173`.
   * The verified **Herbally Pure Neem Infused Organic Bedsheet** is automatically loaded with verified features and strict medical claim guardrails.
   * Verify budget is set to ₹50,000 for 30 days.
   * Click **"Generate End-to-End Marketing Strategy"**.
2. **Step 2 & 3: Review Strategy & Creatives**
   * Review Brand Positioning & mathematically balanced channel budget allocation.
   * View Target Audience Personas (Holistic Wellness Enthusiast & Urban Professional).
   * Review Competitor Benchmark (Sunday Bedding, Duroflex Natural, Organic Marketplaces).
   * Review SEO Keywords, 3 distinct Ad Copy variations, and 7-day content calendar.
3. **Step 4: Campaign Analytics & CSV Ingestion**
   * Navigate to Step 4 (*Analytics & CSV*).
   * Click **"Load Herbally Sample CSV (Demo)"** or upload `data/sample_campaign.csv`.
   * Review deterministic KPIs: Total Spend, Conversions, Blended ROAS, CPA, CTR, and the Campaign Breakdown table.
4. **Step 5: Priority Next Best Action & Report Export**
   * Review the prominent **Priority Next Best Action Hero Card** at the top.
   * Review the 4 evidence-backed optimization recommendations.
   * Inspect the Grounded Source Provenance and Audited Working Assumptions.
   * Click **"Export Markdown"** or **"Export JSON State"** in the top navigation to download the executive strategy report.

---

## 7. API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check endpoint |
| `GET` | `/api/products` | Retrieve registered verified products |
| `POST` | `/api/products` | Register a new product |
| `POST` | `/api/marketing/analyze` | Execute the full synchronous strategy workflow |
| `GET` | `/api/marketing/workflow/{id}` | Retrieve state snapshot for a workflow run |
| `POST` | `/api/analytics/upload` | Upload & parse campaign CSV, compute deterministic KPIs |
| `POST` | `/api/optimization/run` | Re-run optimization heuristics for a workflow run |
| `GET` | `/api/reports/{id}/markdown` | Download executive report in Markdown format |
| `GET` | `/api/reports/{id}/json` | Download complete workflow state in JSON format |

---

## 8. Automated Testing

Run the automated test suite:
```bash
cd backend
pytest -v
```

**Test Coverage Highlights:**
* Zero-division safety in formulas (`safe_divide` handles 0 clicks, 0 impressions, 0 spend, null values).
* CSV parser validation (detects missing required columns, limits file size to 5MB).
* Medical claim guardrails (blocks prohibited claims like "cures eczema" or "treats insomnia").
* Heuristic optimization engine (identifies top-performing creative and flags budget drag).
* End-to-end integration test (`Product Input → Research → Strategy → Content → Campaign → CSV Data → Analytics → Optimization → Next Best Action → Reports`).

---

## 9. Current Limitations & Future Integrations

### Safe Limitations in MVP
* **Execution is Simulated:** The MVP marks all campaigns as `SIMULATED_PENDING_APPROVAL`. It never commits live marketing budgets or modifies live ad accounts.
* **Mock Providers by Default:** Uses verified domain mock datasets so the platform operates offline at zero cost without requiring paid search or LLM API keys.

### Future Integrations Roadmap
* **Google Ads API & Meta Ads Graph API:** For one-click campaign draft creation upon explicit human approval.
* **Google Search Console & GA4:** Real-time retrieval of search impressions and landing page conversion funnels.
* **Live Web Research:** Plug-and-play adapter for SerpAPI / Tavily search engines.
