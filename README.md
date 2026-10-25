# Herbally AI Marketing Automation Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org)
[![Tests](https://img.shields.io/badge/Tests-23%20Passed-brightgreen.svg)](file:///backend/tests)

An end-to-end full-stack AI marketing automation workspace engineered for growing consumer brands, combining paid advertising optimization with omnichannel content creation, scheduling, brand intelligence, reputation assistance, and business presence.

Built directly for **Herbally** and its flagship **Pure Neem Infused Organic Bedsheet**, the platform replaces disconnected dashboards and ungrounded chat prompts with an integrated closed-loop operational workflow:

```text
Business / Brand Context
  → Strategy & Positioning
  → Content & Creative Assets
  → Campaign Planning & Budgeting
  → Review & Human Approval Gate
  → Simulated Sandbox or Authorized Execution
  → Deterministic Analytics
  → Metric-Driven Optimization
  → Linked Revised Campaigns
```

---

## 1. Key Platform Capabilities

### 🛡️ Truthful Capabilities & Safety Boundaries
* **Simulated Sandbox Execution:** Campaign launches and scheduled content publishing operate in safe demo sandboxes by default (`SIMULATED_RUNNING` and `PUBLISHED (Demo)`), preventing unauthorized ad spend or premature public postings.
* **Non-Negotiable Medical Claim Guardrails:** Programmatically detects and prevents illegal or misleading health claims (e.g., curing eczema or insomnia), enforcing AYUSH/FDA-compliant wellness statements.
* **Deterministic Metric Calculations:** CTR, CPC, CPA, ROAS, and conversion rates are computed in a dedicated Python calculation module with zero-division safety and pandas aggregation.
* **SSRF-Protected Website Ingestion:** Ingests public web context while resolving hostnames and strictly blocking loopback, private RFC1918 subnets, and cloud metadata services (`169.254.169.254`).
* **Server-Side Secret Isolation:** API keys, access tokens, and webhook credentials remain server-side and are never leaked to frontend browser bundles.
* **Honest Prompt Disclosures:** Creative briefs and image generation prompts are explicitly labeled as structured text prompts rather than rendered media files.

---

## 2. Workspace Navigation & Modules

The platform is organized via a persistent SaaS sidebar into three primary functional areas:

### Core Workspace
1. **Executive Dashboard:** Live metrics overview, interactive 8-stage Closed-Loop roadmap, content pipeline status, pending approval alerts, and recent automation activities.
2. **Brand Intelligence:** Canonical brand profile editor (voice tone, target markets, default budgets, claim rules) and SSRF-safe public website ingestion.
3. **AI Content Studio:** Generation of social posts, ad copy, reels scripts, and creative briefs. Includes modal editing, duplication, approval workflow, and calendar scheduling.
4. **Content Calendar:** Queue list and calendar grid views for scheduled social posts with demo sandbox publishing verification.
5. **AI Marketing Assistant:** Conversational assistant grounded in brand context with tool-calling capabilities (`explain_analytics`, `generate_content_draft`, `check_pending_approvals`, `draft_customer_reply`).
6. **Automation Center:** Rule management for automated reporting, pending approval alerts, and content drafts, complete with execution audit logs.
7. **Integrations:** Status tracking and ping verification for advertising, analytics, and social connectors with clear unconfigured/demo labeling.
8. **Settings & Diagnostics:** System health check, executive report export (Markdown & JSON state), and local cache management.

### Campaign Lifecycle (Closed Loop)
1. **Products & Services:** Product catalog with verified specifications, pricing, and medical claim constraints.
2. **Strategy & Positioning:** Market research, competitor benchmarks, SEO keyword clusters, and balanced channel allocations.
3. **Campaign Manager:** Campaign drafting, creative copy selection, audience definitions, and budget management.
4. **Approval & Execution:** Enforces human review and approval before transitioning campaigns into simulated sandbox runs.
5. **Deterministic Analytics:** Ingests raw performance data and computes accurate marketing KPIs.
6. **Optimization & Recommendations:** Evaluates underperforming assets and highlights Priority Next Best Actions.
7. **Revised Campaigns:** Generates new campaign iterations with explicit lineage back to parent runs.

### Omnichannel Tools
1. **Customer Messages:** Ingestion of customer inquiries and reviews, AI reply drafting against brand guidelines, and explicit human approval gates before simulated delivery.
2. **Business Presence:** Brand landing page builder with SEO metadata configuration, desktop/mobile responsive preview simulator, and HTML export.

---

## 3. Technology Stack

* **Backend:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0 ORM, SQLite3 (`marketing_v2.db`), Pandas, HTTPX, Pytest.
* **Frontend:** React 18, Vite 8, TypeScript 5.8, Lucide React, Custom Responsive Glassmorphism CSS Design System.
* **Data Storage:** SQLite database with relational foreign keys linking products, brands, content assets, schedules, campaigns, executions, automations, and landing pages.
* **Execution Environment:** 100% functional locally at zero cost; pre-calibrated domain fallback templates allow full offline operation without requiring paid API keys.

---

## 4. Quickstart & Installation

### Prerequisites
* Python 3.11+
* Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```
* Backend API: `http://127.0.0.1:8001`
* Interactive API Documentation (Swagger UI): `http://127.0.0.1:8001/docs`

### 2. Frontend Setup
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
* Workspace Application: `http://127.0.0.1:5173`

---

## 5. Automated Verification

Run the comprehensive test suite:
```bash
cd backend
pytest -v
```

**Verification Results: 23 passed**
* **Zero-division arithmetic & metrics:** CTR, CPC, CPA, ROAS calculation safety (`test_analytics.py`, `test_operations_workflow.py`).
* **Medical claim guardrails:** Prohibited claim detection and wellness filtering (`test_guardrails.py`).
* **Heuristic optimization & lineage:** Top/worst performer identification and revised campaign generation (`test_optimization.py`, `test_closed_loop.py`).
* **SSRF protection:** Rejection of loopback, private subnets, and cloud metadata IPs (`test_platform_modules.py`).
* **Brand intelligence & ingestion:** Brand profile persistence and website context extraction (`test_platform_modules.py`).
* **Content studio & calendar:** Multi-format generation, editing, and sandbox scheduling (`test_platform_modules.py`).
* **AI assistant tool calling:** Conversational grounding and tool execution records (`test_platform_modules.py`).
* **Automation rules & audit history:** Rule triggers and execution logging (`test_platform_modules.py`).
* **Integrations & dashboard:** Connector statuses and summary aggregation (`test_platform_modules.py`).

Frontend production build check:
```bash
cd frontend
npm run build
```
* Result: `tsc -b && vite build` completed cleanly with zero TypeScript errors.

---

## 6. License
MIT License. Created for the Herbally AI Marketing Strategist project.
