# AI DisasterTwin Rescue 🛰️
### Multi-Agent Disaster Response Coordinator — Smart India Hackathon 2026

> ⚠️ **DEMO MODE** — All data is synthetic and labeled. This is a decision-support prototype, not an emergency authority. No real dispatching or broadcasting occurs.

---

## Quick Start (Windows PowerShell)

### Step 1 — Clone / Navigate to project
```powershell
cd C:\Users\Harshada\.gemini\antigravity\scratch\ai-disastertwin
```

### Step 2 — Backend Setup
```powershell
cd backend

# Create virtual environment
python -m venv venv

# Activate it
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Copy environment file
Copy-Item .env.example .env

# (Optional) Add OpenAI key in .env — app works fully without it
# OPENAI_API_KEY=sk-...

# Seed the database with demo data
python seed.py

# Start the backend server
uvicorn app.main:app --reload --port 8000
```

Backend runs at: **http://localhost:8000**
API docs at: **http://localhost:8000/docs**

---

### Step 3 — Frontend Setup (new PowerShell tab)
```powershell
cd C:\Users\Harshada\.gemini\antigravity\scratch\ai-disastertwin\frontend

# Install dependencies (already done if you ran setup)
npm install

# Start the dev server
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

### Step 4 — Open in browser
Visit **http://localhost:5173**

---

## Optional API Configuration

Edit `backend/.env`:

```env
# OpenAI (optional — app uses deterministic rules without it)
# NOTE: OpenAI API billing is separate from ChatGPT subscriptions
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# NASA FIRMS fire hotspots (optional)
NASA_FIRMS_MAP_KEY=...
```

Restart the backend after editing `.env`.

---

## Running Tests
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m pytest tests/ -v
```
**Actual test results: 93 passed, 0 failed**

---

## Application Pages

| Page | URL | Description |
|------|-----|-------------|
| Overview | `/` | Dashboard with stats, charts, weather |
| Live Map | `/map` | Interactive Leaflet incident + resource map |
| Incidents | `/incidents` | Create, triage, manage incidents |
| Rescue Response | `/rescue` | Rescue teams, response plans, checklists, assignments, multilingual comms |
| AI Agents | `/agents` | View agent logic, scoring formula, activity |
| Simulator | `/simulator` | Run synthetic disaster scenarios |
| Resources | `/resources` | Manage responders, shelters, equipment |
| Alerts | `/alerts` | Multilingual alert drafts (EN/HI/MR) |
| Audit Log | `/audit` | Complete action history |
| Settings | `/settings` | Integration status panel |

---

## Rescue Team Response & Action Management System

- **Rescue Response Generator:** Deterministic response plans for flood, heatwave, fire, medical, missing person, and earthquake emergencies with required skills, equipment, safety rules, and escalation conditions.
- **Rescue Team Workflows:** 8-stage operational lifecycle: `Available` → `Recommended` → `Awaiting Approval` → `Assigned` → `Responding` → `On Scene` → `Assisting` → `Completed`.
- **Interactive Action Checklist:** Progressive step-by-step responder action items with operator verification and completion tracking.
- **Multilingual Comms Panel:** Draft and approve briefings, situation updates, resource requests, and completion reports in English, Hindi, and Marathi.
- **Human-in-the-Loop Safeguards:** Strict validation preventing unapproved responder deployment. All simulated data clearly badged.

---

## Four AI Agents

| Agent | Role | LLM Required? |
|-------|------|--------------|
| **A — Alert Monitoring** | Validates, deduplicates, summarizes reports | No (LLM enhances summaries) |
| **B — Triage & Risk** | Deterministic priority scoring 0–100 | **Never** (always deterministic) |
| **C — Dispatch & Resource** | Ranks resources by suitability+distance | No |
| **D — Communication** | Drafts EN/HI/MR public alert messages | No (LLM enhances quality) |

---

## Disaster Scenarios (Simulator)

- 🌊 **Urban Flooding** — Mumbai region
- 🌧️ **Heavy Rainfall** — Bangalore region  
- 🌡️ **Heatwave Emergency** — Delhi region
- 🔥 **Wildfire / Thermal** — Ahmedabad region

---

## Tech Stack

**Backend:** Python 3.11+, FastAPI, SQLAlchemy, SQLite, OpenAI SDK, httpx  
**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Leaflet, Recharts, Axios  
**Maps:** OpenStreetMap (free, no key required)  
**Weather:** Open-Meteo (free, no key required)

---

## Safety Constraints

- No automatic dispatch of real responders
- No automatic emergency broadcasting
- All AI recommendations require human operator approval
- All alert drafts stay in DRAFT until explicitly approved
- All simulated data is labeled SYNTHETIC/DEMO
- API keys stored server-side only, never in frontend

---

## Project Structure

```
ai-disastertwin/
├── backend/
│   ├── app/
│   │   ├── agents/          # Agent A, B, C, D
│   │   ├── api/endpoints/   # All REST endpoints
│   │   ├── core/            # Config, database
│   │   ├── models/          # SQLAlchemy models
│   │   ├── services/        # Weather, OpenAI, Audit
│   │   └── simulations/     # Scenario engine
│   ├── tests/               # 58 passing tests
│   ├── seed.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/           # 9 pages
│       ├── components/      # Reusable UI
│       ├── services/        # API client
│       └── hooks/           # useApi, usePolling
├── .env.example
├── .gitignore
└── README.md
```
