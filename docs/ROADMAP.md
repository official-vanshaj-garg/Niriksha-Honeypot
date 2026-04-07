# ROADMAP

This document outlines the phased development plan for NIRIKSHA.ai. Items are categorized by completion status and future objectives.

---

## ✅ Phase 1: Core Intelligence Pipeline (COMPLETED)

*   [x] Generative LLM Persona configuration (Llama 3.3 70B via Groq)
*   [x] Regex-based scoring heuristics for 9 different threat vectors
*   [x] Turn-based limits and guardrail enforcement (max 10 turns, single-question constraints)
*   [x] Automated JSON-format end-of-session intelligence report

## ✅ Phase 2: Observability & Persistence (COMPLETED)

*   [x] Fully functional SQLite local database via SQLModel/SQLAlchemy
*   [x] Multi-session state persistence surviving instance restarts
*   [x] Authenticated GET endpoints for reporting/fetching past interactions
*   [x] Automated mapping of UUIDs to Threat Indicators (IOC logic)
*   [x] Basic `/health` endpoint for uptime monitoring

## ✅ Phase 3: Analyst Deception Dashboard (COMPLETED)

*   [x] Vanilla HTML5/JS/CSS frontend served seamlessly from FastAPI without CORS friction
*   [x] **Live Deception Console**: Interface to natively act as scammer in real-time
*   [x] **IOC Registry**: Aggregation of all indicators extracted across history
*   [x] **Correlated Infrastructure Tracking**: Automatically flagging repeated campaigns
*   [x] 1-Click JSON/CSV/TXT threat data triage exports

---

## 🚀 Phase 4: Security Hardening (V2 TARGET)

*   **Session TTLs**: In-memory dicts still hold redundant tracking data until server restart. Need background CRON sweeps aligned with DB offloading.
*   **Rate Limiting Middleware**: Currently vulnerable to volumetric API hitting. Will integrate `slowapi` or sliding-window Redis limitations.
*   **Multi-tenant Auth**: Expand single shared `API_SECRET_KEY` into proper JWT-based endpoint segregation for enterprise SOC teams.
*   **Adaptive Scam Scoring**: Evolve from `scamDetected = true` defaults to dynamic LLM + heuristic severity matrices natively.

## 🚀 Phase 5: Enterprise Deployment Operations (V2 TARGET)

*   **Dockerization & Orchestration**: Containerizing via `Dockerfile` and `docker-compose.yaml` for isolated runtime dependencies.
*   **Alembic Migrations**: Currently, SQLite schema alterations require complete wipe of `.db` file.
*   **PostgreSQL Migration**: Move off SQLite to robust relational pooling for high-availability nodes.
*   **Structured Logging**: Replace native STDOUT `print()` lines with mature fluent/JSON-formatted remote logging telemetry.

## 🚀 Phase 6: Evolved ML & Scale (V3 TARGET)

*   **Native ML Entity Extraction**: Deprecate regex scraping in favor of localized spaCy NER models for higher accuracy against obfuscated inputs.
*   **Multi-Channel Integrations**: Beyond API texting, ingest directly from WhatsApp Business APIs or inbound SMTP servers via webhooks.
*   **STIX/TAXII Integration**: Provide automated export endpoints for ingesting extracted IOCs directly into Splunk/QRadar perimeters.
