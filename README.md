<p align="center">
  <img src="https://img.shields.io/badge/Project-NIRIKSHA.ai-blueviolet?style=for-the-badge&logo=shield" alt="NIRIKSHA.ai"/>
  <img src="https://img.shields.io/badge/India%20AI%20Impact-Buildathon%202026-orange?style=for-the-badge" alt="Buildathon 2026"/>
</p>

<h1 align="center">🛡️ NIRIKSHA.ai</h1>
<h3 align="center">Agentic Honeypot for Scam Detection, Engagement, and Intelligence Extraction</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white"/>
  <img src="https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white"/>
  <img src="https://img.shields.io/badge/Groq-Llama%203.3%2070B-FF6F00?style=flat-square&logo=meta&logoColor=white"/>
  <img src="https://img.shields.io/badge/Status-Feature%20Complete-success?style=flat-square"/>
</p>

---

## 📌 Overview

**NIRIKSHA.ai** is a Network Security mini-project focused on **Active Defense** and **Threat Intelligence Extraction**. 

Traditional anti-scam tools operate reactively: they block fraudsters at the perimeter but gather no proactive intelligence. When an adversary is blocked, their infrastructure remains hidden. NIRIKSHA.ai takes the opposite approach. It is an **Application-Layer AI Honeypot**. 

When a scammer initiates contact, the system deploys a generative AI agent that mimics a confused but cooperative human. It deliberately stalls the attacker (a technique known as **Tarpitting**) while silently extracting *Indicators of Compromise (IOCs)*—such as phishing URLs, UPI IDs, bank accounts, and phone numbers. Once the engagement ends, it automatically generates a Threat Intelligence export for security analysts.

---

## 🚀 Key Implemented Features

- **Automated Deception:** LLM-driven persona mimics vulnerable humans to tarpit scammers.
- **Real-Time Intelligence Extraction:** Parses 9 distinct entity types (e.g., UPI IDs, Bank Accounts, Emails) from raw attacker chat.
- **SQLite Persistence:** All sessions, chat transcripts, and extracted threat indicators are automatically saved to a local `.db` file using SQLModel.
- **Built-in Operations Dashboard:** A fully native, vanilla JS frontend served securely from the same origin to eliminate CORS complexity.
- **Cross-Session Threat Correlation:** Automatically tracks when an attacker reuses the same underlying infrastructure (e.g., the same Crypto Wallet) across multiple different attacks.
- **Security Analyst Exports:** Generates rapid JSON, CSV, and Blocklist TXT files for firewall/DNS-filter triage.

---

## 🖥️ The Deception Operations Dashboard

The project includes an integrated front-end dashboard designed for Security Analysts and live presentations. It fundamentally maps to four core Network Security workflows:

1. **[ LIVE ] Deception Console:** The hero experience. Allows a presenter to manually act as the "scammer" and watch the AI defend, engage, and extract intelligence in real time. Sessions are hard-capped at 10 conversational turns (with a warning at turn 7) to preserve token-conscious operations.
2. **[ SESS ] Captured Sessions:** The historical evidence locker. Displays all previously recorded engagements, their severity scores, and fully generated transcript reports.
3. **[ IOC ] IOC Registry:** The Threat Intelligence ledger. A unified view of all unique extracted entities (links, banks, etc.) harvested by the honeypot over time.
4. **[ CORR ] Correlated Infrastructure:** Tracks "Repeated Threats". If the system detects the same indicator across multiple sessions, it flags it here, suggesting a coordinated scatter-spray campaign rather than an isolated incident.

---

## ⚙️ Architecture Summary

NIRIKSHA.ai completely isolates its backend logic from the frontend UI.
- **Backend Protocol:** Asynchronous FastAPI REST pipeline executing heuristic scoring arrays and LLM routing.
- **LLM Pipeline:** Utilizes Groq (Llama-3.3-70B) constrained by strict anti-repetition guardrails and 200-character truncation limits to maintain human illusion.
- **Database Layer:** SQLite powered by SQLAlchemy/SQLModel. Creates tables dynamically on startup to `data/agentic_ai_honeypot.db`.
- **Frontend Layer:** `index.html` and `app.js` rendered synchronously via a Jinja/StaticFiles wrapper directly over the FastAPI port.

*(Read the complete internal architecture in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md))*

---

## 🛠️ Local Setup & Quick Start

Running the project is designed to be extremely beginner-friendly.

### 1. Prerequisites
- **Python 3.10+** installed.
- A free **Groq API Key** from [console.groq.com/keys](https://console.groq.com/keys).

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/ABHI99RAJPUT/NIRIKSHA.ai.git
cd NIRIKSHA.ai

# Create and activate a Python virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration
Create a file named `.env` in the root folder (or rename `.env.example`).
Include these two variables:
```env
GROQ_API_KEY=your_actual_groq_api_key_here
API_SECRET_KEY=my-super-secret-password
```
> *Note:* `API_SECRET_KEY` acts as your personal master key for the dashboard. Choose any password string you want.

### 4. Run the Server
```bash
python -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8010
```

### 5. Access the Platform
- **Health Check:** Open `http://127.0.0.1:8010/health` to confirm the backend is alive.
- **Operations Dashboard:** Open `http://127.0.0.1:8010/dashboard`
- **Authentication:** Enter the `API_SECRET_KEY` you defined in your `.env` file to unlock the UI.

### Generating Demo Data
If you want to pre-populate the database with historical sessions without typing them out manually:
```bash
# Ensure the server is running on port 8010, then in a new terminal:
python src/tests/test_chat.py
```

---

## 🔌 Major API Endpoints

The system relies strictly on authenticated endpoints using the `x-api-key` header.

| Route | Method | Purpose |
|---|---|---|
| `/api/detect` | `POST` | Core engagement route. Parses message, routes to LLM, saves state. |
| `/api/sessions` | `GET` | Retrieves all historical telemetry sessions. |
| `/api/sessions/{id}`| `GET` | Retrieves deep transcript & report metrics for a specific session. |
| `/api/indicators` | `GET` | Retrieves all unique extracted Threat Intelligence elements. |
| `/health` | `GET` | Unauthenticated ping to check uptime logic. |
| `/dashboard` | `GET` | Server-rendered HTML payload for the frontend operations console. |

---

## 🔒 Current Limitations & Future Scope

While feature-complete for local evaluation and academic presentation, this is a **Research Prototype**. We are transparent about the following system boundaries:

### Implemented / Working
✅ LLM interactive response generation & intelligent tarpitting  
✅ Real-time intelligence extraction (Regex heuristics over 9 entities)  
✅ Same-Origin Web Dashboard & Operations UI  
✅ SQLite persistence across application restarts  
✅ Authenticated Retrieval APIs & Local CSV/JSON Exporting  

### Partial / Limitations
⚠️ **Regex Extraction:** Entity recognition relies on structural regex. Native Semantic/NLP extraction pipelines are not yet fully implemented.  
⚠️ **Hardcoded Identifiers:** The `scamDetected` flag defaults to `True` for simulation purposes on final callback.  

### Honest Future Scope
⏳ **Enterprise CI/CD & Deployment:** Dockerization, Alembic schema migrations, and a transition to PostgreSQL for high-availability.  
⏳ **Security Enhancements:** Native FastAPI Rate-Limiting architectures, Multi-Tenant User Authentication (currently single shared API secret).  
⏳ **Advanced Triage:** SIEM integrations (Splunk / ELK) exporting natively through STIX/TAXII protocols.

---

## 📚 Documentation Index

| Document | Purpose |
|---|---|
| [README.md](README.md) | Primary project overview and setup. |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical teardown of the data flow, models, and LLM processing loop. |
| [docs/OVERVIEW.md](docs/OVERVIEW.md) | Business logic and academic use cases defending Active Deception models. |
| [docs/FEATURE_MATRIX.md](docs/FEATURE_MATRIX.md) | At-a-glance breakdown of exactly which features map to which internal files. |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Honest depiction of V1 capabilities versus targeted V2 Enterprise features. |

---
