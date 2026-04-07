# NIRIKSHA.ai Dashboard Walkthrough

The built-in Deception Operations Console provides a secure, read-only interface to manually simulate honeypot engagements, visualise past sessions, and extract threat intelligence in real time.

It is served dynamically off the same FastAPI instance at `GET /dashboard`, sidestepping CORS issues while remaining natively protected by the global `API_SECRET_KEY`.

## Views Overview

### 1. [ LIVE ] Deception Console
The interactive hero experience designed for manual presentation. This view allows a user to act as the scammer and send prompts into the honeypot in real-time. 
*   Features a 10-turn cap with automated warnings.
*   Randomized "Example Generators" (Bank KYC, Phishing Link) to jumpstart demos.
*   Once turn 10 is reached (or the session forcibly finalizes earlier), a **Final Report** is generated dynamically with immediate 1-click JSON, CSV, and TXT blocklist downloads right below the chat window.

### 2. [ SESS ] Captured Sessions
The main historical evidence library. Shows the `sessionId`, completion status (Active vs Completed), interaction turns, and the aggregate scam severity score. Includes tabs to filter out only Active or only Completed operations.

![Sessions List](assets/dashboard/sessions_list.png)

### 3. Session Detail (Triage View)
Deep dive into a specific historical interaction. Displays live metadata alongside the full conversational replay, differentiating between the Honeypot's responses and the Scammer's prompts. Directly surfaces individual Indicators of Compromise (IOCs) harvested from the raw text. Contains the packaged incident report outlining the classified `scam_type` and confidence percentages.

![Report View](assets/dashboard/report_view.png)

### 4. [ IOC ] IOC Registry
The Threat Intelligence ledger. An aggregated view compiling all extracted indicators (phone numbers, UPI IDs, emails, phishing domains). Highly valuable for SOC analysts to copy-paste unique artifacts into SIEM platforms or DNS blackholes.

### 5. [ CORR ] Correlated Infrastructure
A specialized intelligence view tracking the frequency of extracted indicators. This view actively flags **Repeated Threats**. If an attacker reuses the same underlying payload (for example, the exact same Bitcoin wallet address) across completely different victim sessions, this view escalates the entity with a `hitCount > 1`, exposing coordinated campaign infrastructure.

![Indicators View](assets/dashboard/indicators_view.png)
