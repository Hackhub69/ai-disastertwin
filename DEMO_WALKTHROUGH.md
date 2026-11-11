# AI DisasterTwin Rescue — Live Demo Walkthrough Guide

Use this step-by-step presentation script to demonstrate the multi-agent disaster coordinator platform to judges, evaluators, or stakeholders.

---

## 🚀 Quick Launch (One-Click)

Double-click [`start_demo.bat`](file:///C:/Users/Harshada/.gemini/antigravity/scratch/ai-disastertwin/start_demo.bat) or run from PowerShell:
```powershell
cd C:\Users\Harshada\.gemini\antigravity\scratch\ai-disastertwin
.\start_demo.ps1
```
This automatically seeds the database, launches both the backend and frontend servers, and opens the Command Center in your browser at **http://localhost:5173**.

---

## 🎬 5-Minute Presentation Walkthrough Script

### **Act 1: Tactical Command Center Overview**
* **Navigate to**: `Overview` (`/`)
* **What to highlight**:
  1. **Top Command Bar**: Live UTC military clock, backend connectivity beacon, and operator identity (`Commander Officer`).
  2. **DEFCON Warning Ticker**: Shows active regional alerts.
  3. **Live Meteorological Stations**: Pulling real-time weather telemetry from Open-Meteo across 5 Indian metropolitan cities (Mumbai, New Delhi, Bengaluru, Chennai, Ahmedabad).
  4. **Active Queue**: Click on **Severe Flash Flooding — Andheri West** to open the slide-out **Incident Detail Drawer**. Show the transparent Agent B triage score formula breakdown (Base 50 × Sev 1.0 + PopBonus 20 × Conf 0.9 = 62.3 HIGH).

---

### **Act 2: Tactical Live Incident Map**
* **Navigate to**: `Live Incident Map` (`/map`)
* **What to highlight**:
  1. **Dark Command Cartography**: Integrated with CartoDB Dark Matter tiles.
  2. **Pulsing Radar Beacons**: Critical and high incidents have animated glowing radar rings.
  3. **Floating Controls**: Filter by disaster type (`Flood`, `Fire`, `Heatwave`), search by landmark (`Andheri`), toggle Logistics Resources (`Ambulances`, `NDRF boats`).
  4. **Click an Incident Marker**: The spotlight card appears on the bottom right. Click **Inspect Details** or **Launch Response Plan**.

---

### **Act 3: Rescue Team Response & Action Management**
* **Navigate to**: `Rescue Response` (`/rescue`)
* **What to highlight**:
  1. **6 High-Density Metrics**: Active Plans, Available Units, Deployed Teams, Pending Approvals, Active Assignments, Draft Messages.
  2. **Response Plans Tab**:
     - Expand the **Severe Flash Flooding — Andheri West** plan.
     - Show **Known Operational Hazards** (submerged debris, open manholes).
     - Show **Required Skills** (`water_rescue`, `boat_operation`) and **Recommended Equipment** (`inflatable rescue boats`, `PFDs`).
  3. **Field Deployments Tab**:
     - Click **Rescue Team Alpha (RTA-01)**.
     - **8-Stage Pipeline**: Point out status tracker (`Available` → `Recommended` → `Assigned` → `Responding` → `On Scene` → `Completed`).
     - **Interactive Checklist**: Click on step 5 or 6 to toggle completion. Watch the **progress bar and percentage update smoothly**!
     - **Multilingual Comms Studio**: Switch between **English**, **हिंदी (Hindi)**, and **मराठी (Marathi)** briefings. Show that communications are synthesized deterministically with zero risk of hallucinations.
     - Click **Copy Transmission** to demonstrate field radio dispatch readiness.

---

### **Act 4: AI Agents & Triage Sandbox**
* **Navigate to**: `AI Agents` (`/agents`)
* **What to highlight**:
  1. **4 Decoupled Agents**:
     - **Agent A**: Ingestion & Spatio-temporal Deduplication (≤1km, ≤30min).
     - **Agent B**: Deterministic Risk & Triage Scoring (0–100).
     - **Agent C**: Dispatch & Resource Matching (Suitability 40% + Distance 40% + Capacity 20%).
     - **Agent D**: Multilingual Crisis Communications.
  2. **Live Triage Sandbox**:
     - Adjust the **Severity slider** (1 to 5) or **Population slider** (0 to 5,000).
     - Watch the **calculated priority score and tier badge recalculate in real time** right before the judges' eyes!
  3. **Human-in-the-Loop Sovereign Boundary**: Emphasize that autonomous physical dispatch is blocked—human authorization is strictly enforced.

---

### **Act 5: Digital Disaster Twin Simulator**
* **Navigate to**: `Disaster Twin Simulator` (`/simulator`)
* **What to highlight**:
  1. **Select an Archetype**: E.g., `Urban Flooding` (Mumbai) or `Heatwave Emergency` (Delhi).
  2. **Adjust Intensity & Locations**: Set intensity to 75% and 6 nodes.
  3. **Click "Initialize Simulation Twin"**:
     - Watch the loading telemetry bar.
     - Instant generation of synthetic cluster incidents, labeled with **SYNTHETIC** provenance markers.
     - Displays Recharts **Severity Distribution** bar chart.

---

### **Act 6: Security & Cryptographic Audit Ledger**
* **Navigate to**: `Audit Log` (`/audit`)
* **What to highlight**:
  1. **Full Traceability**: Every incident created, triage score calculated, plan approved, and checklist step checked is immutably recorded.
  2. **Expand Any Row**: Shows the exact timestamp, actor ID, and full JSON event payload diff.
