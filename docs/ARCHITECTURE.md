# ARCHITECTURE

This document describes how the system works, how the code is organised, and how data flows through a single request.

---

## System Flow (Single Request)

```
Client sends POST /api/detect
  │
  ├─ 1. API key check (x-api-key header vs API_SECRET_KEY)
  │       → 403 if mismatch
  │
  ├─ 2. Parse request (Pydantic)
  │       sessionId, message.text, conversationHistory
  │
  ├─ 3. Session init or resume
  │       In-memory dicts keyed by sessionId
  │       Initialised on first turn; incremented on each subsequent turn
  │
  ├─ 4. Scam signal scoring
  │       Regex-based, cumulative across session
  │       Scores OTP requests, payment pressure, urgency words, links, phones, UPIs
  │
  ├─ 5. Intelligence extraction
  │       Runs on full conversation text (history + current message)
  │       Extracts: phones, bank accounts, UPI IDs, phishing links,
  │                 emails, case IDs, policy numbers, order numbers, reference IDs
  │       Deduplicates using sets; filters phone/UPI/email overlaps
  │
  ├─ 6. Next-hint selection
  │       Determines which intel category is still missing
  │       Adapts order based on message context (KYC → link; payment → UPI)
  │
  ├─ 7. LLM reply generation (Groq / Llama 3.3 70B)
  │       System prompt: persona as confused, cooperative person
  │       Guided by hint topic and current rubric feature counts
  │       Last 8 conversation turns passed as context
  │
  ├─ 8. Reply sanitisation
  │       Remove banned words: honeypot, bot, ai, fraud, scam
  │       Limit to one question mark
  │       Cap at 200 characters
  │
  ├─ 9. Rubric guardrail enforcement
  │       On designated turns (1, 2, 3, 5, 7): force a question if below target
  │       Force investigative wording if below target
  │
  ├─ 10. Finalization check
  │        Trigger if: turn ≥ 10, OR (turn ≥ 8 AND ≥2 high-value fields AND ≥1 reference ID)
  │        If triggered:
  │          → LLM call to classify scam type + confidence
  │          → Build full intelligence report
  │          → Add to response as finalCallback + finalOutput
  │
  └─ 11. Return AgentResponse
           { status, reply, finalCallback, finalOutput }
```

---

## Module Breakdown

After refactoring from a single 626-line file, the codebase is split into:

```
src/
├── main.py               Entry point. Creates FastAPI app, mounts router, runs uvicorn.
├── config.py             Loads .env. Initialises Groq client, API key header, delay
│                         constants, PORT, log_chat().
├── schemas.py            Pydantic models:
│                           MessageItem — one message in a conversation
│                           IncomingRequest — full request payload (with field aliases)
│                           AgentResponse — response schema
├── session_state.py      Six module-level dicts/sets that hold all in-memory state.
│                         These are Python module singletons — all importers share
│                         the same objects. Never reassigned; only mutated.
├── models.py             SQLModel table definitions (5 tables):
│                           SessionRecord, Message, Indicator,
│                           SessionIndicator, Report
│                           All created automatically on startup.
├── db.py                 Database engine (SQLite), create_db(), and all
│                         DB helper functions:
│                           db_create_session(), db_save_message(),
│                           db_update_session(), db_upsert_indicators(),
│                           db_save_report()
│                         Contains the cross-session IOC correlation logic.
│
├── utils/
│   └── text.py           12 compiled regex patterns (URL, email, phone, UPI, OTP,
│                         PIN, reference IDs, etc.), word lists (BANNED_WORDS,
│                         RED_FLAG_WORDS, etc.), QUESTION_TURNS constant,
│                         norm(), _clean_url(), _normalize_phone(), _has_digit()
│
├── services/
│   ├── scoring.py        looks_like_payment_targeted(), calculate_scam_score()
│   │                     Uses patterns from utils/text.py. No external calls.
│   │
│   ├── extraction.py     _extract_reference_ids(), _split_ids(),
│   │                     extract_intelligence(), high_value_count()
│   │                     Pure regex over concatenated conversation text.
│   │
│   ├── reply_generation.py
│   │                     _count_features() — counts rubric features in a reply
│   │                     _sanitize_reply() — removes banned words, limits questions
│   │                     _next_hint() — picks next intel topic; mutates SESSION_ASKED
│   │                     _llm_generate_reply() — Groq API call with system prompt
│   │                     _enforce_minimums() — guardrail for designated turns
│   │
│   └── reporting.py      infer_scam_type() — second Groq call, JSON output, fallback
│                         build_final_output() — assembles the full report dict
│                         Reads SESSION_START_TIMES for duration calculation.
│
└── routes/
    ├── detect.py         detect_scam() — POST /api/detect handler.
    │                     Orchestrates the full pipeline. Reads/writes all 6 state dicts.
    │                     Calls all DB persistence functions per turn.
    │
    └── retrieval.py      4 authenticated GET endpoints (read-only):
                            list_sessions()     — GET /api/sessions
                            get_session()       — GET /api/sessions/{session_id}
                            get_report()        — GET /api/reports/{session_id}
                            list_indicators()   — GET /api/indicators
```

---

## Session State

Six module-level objects in `src/session_state.py`:

| Object | Type | Purpose |
|---|---|---|
| `SESSION_START_TIMES` | `Dict[str, float]` | Unix timestamp of session start |
| `SESSION_TURN_COUNT` | `Dict[str, int]` | Number of scammer turns received |
| `SESSION_SCAM_SCORE` | `Dict[str, int]` | Cumulative regex scam score |
| `SESSION_COUNTS` | `Dict[str, Dict[str, int]]` | Rubric feature counts per session (q, inv, rf, eli) |
| `SESSION_ASKED` | `Dict[str, Set[str]]` | Which hint topics have been prompted already |
| `FINAL_REPORTED` | `Set[str]` | Sessions that have already generated a final report |

All transient generative metric states are held in-memory during a chat session to avoid constant I/O bottlenecks. However, upon message persistence and session culmination (report output), all finalized structured objects are atomically written to SQLite (`data/agentic_ai_honeypot.db`), ensuring historical session retrieval scales properly post-restart.

---

## API Schema

### Request

```json
{
  "sessionId": "string",
  "message": {
    "sender": "scammer",
    "text": "string",
    "timestamp": "ISO string or unix ms"
  },
  "conversationHistory": [
    { "sender": "string", "text": "string", "timestamp": "..." }
  ],
  "metadata": {}
}
```

Field aliases accepted:
- `sessionId` → also `sessionld` or `session_id`
- `conversationHistory` → also `conversation_history`
- `metadata` is optional

Flat `sender` and `text` at root level are also accepted as fallback.

### Normal Response

```json
{
  "status": "success",
  "reply": "string",
  "finalCallback": null,
  "finalOutput": null
}
```

### Finalization Response

```json
{
  "status": "success",
  "reply": "string",
  "finalCallback": {
    "sessionId": "string",
    "status": "completed",
    "scamDetected": true,
    "totalMessagesExchanged": 18,
    "engagementDurationSeconds": 240,
    "scamType": "bank_fraud | upi_fraud | phishing | job_scam | investment_scam | lottery_scam | kyc_scam | utility_scam | unknown",
    "confidenceLevel": 0.92,
    "extractedIntelligence": {
      "phoneNumbers": [],
      "bankAccounts": [],
      "upiIds": [],
      "phishingLinks": [],
      "emailAddresses": [],
      "caseIds": [],
      "policyNumbers": [],
      "orderNumbers": [],
      "referenceIds": []
    },
    "engagementMetrics": {
      "totalMessagesExchanged": 18,
      "engagementDurationSeconds": 240
    },
    "agentNotes": "Session completed. scamType=bank_fraud."
  },
  "finalOutput": { "...same object..." }
}
```

`finalCallback` and `finalOutput` carry the same data. `finalOutput` exists for backward compatibility.

### Error Responses

| Code | Cause |
|---|---|
| 403 | Missing or wrong `x-api-key` header |
| 422 | Malformed request body (Pydantic validation failure) |

---

## Dependency Graph (Import Order)

```
config.py        ← no internal deps (leaf)
schemas.py       ← no internal deps (leaf)
session_state.py ← no internal deps (leaf)
utils/text.py    ← no internal deps (leaf)

models.py                ← no internal deps (leaf; pure SQLModel table definitions)
db.py                    ← models

services/scoring.py      ← utils/text
services/extraction.py   ← utils/text, schemas
services/reply_generation.py ← config, schemas, session_state, utils/text, services/scoring
services/reporting.py    ← config, schemas, session_state, services/extraction

routes/detect.py  ← config, schemas, session_state, services/scoring,
                     services/extraction, services/reply_generation,
                     services/reporting, db

routes/retrieval.py ← config, db, models

main.py           ← config, db, routes/detect, routes/retrieval
```

The graph is strictly acyclic. Leaf modules have no internal imports.

---

## Database Schema

SQLite via SQLModel (SQLAlchemy wrapper). File: `data/agentic_ai_honeypot.db`. Auto-created on first startup by `create_db()` in `src/db.py`.

### 5 Tables

| Table | Primary Key | Purpose |
|---|---|---|
| `session` | `id` (UUID string) | One row per engagement. Stores turn count, scam score, rubric counts, asked hints, status (active/completed), timestamps. |
| `message` | `id` (auto-int) | Every individual message (both scammer and honeypot). Foreign key to `session.id`. |
| `indicator` | `id` (auto-int) | **Global** unique IOC registry across all sessions. Has `indicator_type`, `value`, `hit_count`, `first_seen_at`, `last_seen_at`. Unique constraint on `(indicator_type, value)`. |
| `session_indicator` | `id` (auto-int) | Many-to-many join table linking indicators to sessions. Unique constraint on `(session_id, indicator_id)`. |
| `report` | `id` (auto-int) | One final report per completed session. Stores scam type, confidence, metrics, and the full report as a JSON string. Unique constraint on `session_id`. |

### Cross-Session IOC Correlation (hit_count Logic)

The `db_upsert_indicators()` function in `src/db.py` implements the correlation mechanism:

1. For each extracted IOC value, check if this `(indicator_type, value)` pair already exists in the global `indicator` table.
2. **If new globally:** Create the indicator with `hit_count = 1`. Create a `session_indicator` link.
3. **If exists but not linked to this session:** Increment `hit_count += 1`, update `last_seen_at`, create the link.
4. **If already linked to this session:** Do nothing (prevents double-counting within the same session).

This means `hit_count` counts **distinct sessions**, not raw occurrences. An indicator with `hit_count = 3` appeared in 3 separate attack sessions, strongly suggesting reused campaign infrastructure.

---

## Dashboard / Frontend

The dashboard is a vanilla HTML5/JS/CSS application in `static/`. No frameworks, no build step.

- `src/main.py` serves `static/index.html` via `FileResponse` at `GET /dashboard`.
- `src/main.py` mounts the `static/` directory via `StaticFiles` for JS/CSS assets.
- Because the dashboard is served from the **same origin** as the API, no CORS middleware is needed.
- The dashboard authenticates by sending the `x-api-key` header with every fetch request to the retrieval endpoints.
- Four views: **Live Console**, **Captured Sessions**, **IOC Registry**, **Correlated Infrastructure**.
- Export functionality (JSON, CSV, Blocklist TXT) is generated client-side in `app.js`.

---

## Known Architectural Risks

1. **Session memory growth** — No TTL bounds. `SESSION_*` dicts grow while the server process runs, although SQLite persists them safely.
2. **Hardcoded `scamDetected: true`** — The final report always flags a scam initially.
3. **Engagement duration inflation** — Artificially padded when massive API bulk-tests send immediate chained iterations.
4. **Single Groq key** — Any Groq API failure falls back to a static reply.
5. **No input sanitisation** — Raw user text goes directly to regex and the LLM prompt.
