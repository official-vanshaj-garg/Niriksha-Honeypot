# OVERVIEW

**Project:** NIRIKSHA.ai — Agentic Honeypot for Scam Detection, Engagement, and Intelligence Extraction
**Built for:** India AI Impact Buildathon 2026 (HCL GUVI)
**Classification:** Advanced Research Prototype & Security Defense Demo

---

## What the Project Does

NIRIKSHA.ai is an integrated Network Security backend and Operations Dashboard that acts as an AI-powered active-defense honeypot. When a scammer sends a message, instead of blocking or ignoring them, the system:

1. Replies as a confused but cooperative person using an Agentic LLM (Llama 3.3 70B via Groq)
2. Keeps the conversation going across multiple turns (Tarpitting)
3. Silently extracts identifying information the scammer reveals (phone number, UPI ID, bank account, phishing link, email, reference IDs)
4. Produces a structured intelligence report and tracks cross-session reused infrastructure.

The system never reveals that it is an AI. The scammer believes they are talking to a potential victim.

---

## The Problem It Solves

Most anti-scam tools block or filter suspicious messages immediately. This stops one scam attempt but gives investigators nothing useful — no identity, no infrastructure, no patterns. The scammer simply moves on.

NIRIKSHA.ai trades one interaction for many. By keeping the scammer engaged, it collects the kind of information that is normally only gathered after a scam has already succeeded and been reported.

---

## Who This Is For

| Audience | Use |
|---|---|
| Researchers | Studying LLM-based social engineering defence, conversational AI for security, or scam intelligence gathering |
| Academics / students | Demonstrable working prototype for a network security mini-project submission |
| Hackathon evaluators | API and Operations Dashboard that can be hit directly to demonstrate the full pipeline |
| Operations Analysts | Security teams looking to export rapid high-fidelity IOCs into enterprise firewalls. |

---

## What Makes It Novel (Research Angle)

The combination of three things is what makes this interesting as an active-defense system:

1. **Agentic persona maintenance** — The LLM holds a consistent character across multiple turns without breaking.
2. **Silent intelligence elicitation** — The agent strategically steers conversation to extract specific missing data types without the scammer realising they are being profiled.
3. **Automated SOC Triage** — The session ends with a machine-readable report, classifying threat severity, correlating reused indicators, and instantly generating artifact blocklists.

---

## Current Scope

The project is fully integrated for end-to-end demonstration. It features:
- Core REST API (`POST /api/detect`) acting as the intelligent pipeline.
- SQLite Database automatically preserving sessions, reports, and indicators natively.
- Seamless Operations Dashboard (`/dashboard`) circumventing CORS for immediate graphical presentation.
- Live Deception Console for manual presentations.

It is highly functional within a local/academic context but requires enterprise hardening (PostgreSQL, Rate Limiting, Multi-tenant JWT Auth) before a public un-sandboxed deployment.

---

## Positioning

| Track | Assessment |
|---|---|
| Hackathon submission | Complete and working. Scored highly on built-in evaluation harness and features a polished, presentation-ready dashboard. |
| College mini-project | Excellent. The pipeline is complete, the Network Security alignment is evident, and the code is highly modularized. |
| Research paper | The core idea is novel and publishable. Next steps: large-scale conversation dataset, baseline comparison, IRB ethics review. |
| Enterprise System | V2 Target. Requires transitioning SQLite to PostgreSQL, adding Docker containers, and STIX/TAXII export feeds. |
