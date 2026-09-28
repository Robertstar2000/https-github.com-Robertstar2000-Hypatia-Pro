# 💻 Project Hypatia Pro: Replication & Emulation Blueprint (Specification for AI Systems)

This blueprint contains the complete system specification, logical pipelines, data structures, and instructions required for any advanced AI agent (such as Hermes, OpenClaw, Claude, or Codex) to fully recreate, emulate, and build the **Project Hypatia Pro** application from scratch.

---

## 📋 1. Project Overview & Core Concept
**Project Hypatia Pro** is a full-stack, AI-mediated scientific research workflow platform utilizing the **Human-Mediated Agentic Process (HMAP)**. It organizes the rigorous execution of the Scientific Method into 10 sequential, interconnected steps mapped to 5 visual research phases. 

The system operates in two core workflow styles:
1. **Manual Forensic Control**: The user triggers, inspects, and manually modifies inputs/outputs step-by-step.
2. **Agentic Reconstruction (Automated)**: The AI executes steps sequentially in an autonomous background loop, checking for critical research "blockers" and automatically proceeding upon successful validation checks.

---

## 🛠️ 2. System Architecture & Tech Stack

### 2.1 Backend Service (Node.js + Express.js)
- **Role**: Handles session credentials, waitlist registries, and secure proxying of sensitive requests.
- **Port Constraints**: Configured to bind on host `0.0.0.0` and port `3000`.
- **Server DB**: SQLite (using `better-sqlite3` driver) with schema files configured for:
  - `users`: ID (integer, primary key), username (text, unique), email (text, unique), password (text, bcrypt-hashed), geminiKey (text), createdAt (datetime).
  - `waitlist`: ID (integer, primary key), email (text, unique), platform (text), createdAt (datetime).
- **Session Control**: JSON Web Token (JWT) based verification on custom API endpoints:
  - `/api/auth/register`, `/api/auth/login`, `/api/auth/verify`
  - `/api/waitlist`

### 2.2 Frontend Client (React 19 + TypeScript + Vite)
- **Role**: Fully client-side reactive interface with zero-latency visual status tracking.
- **Local DB**: Dexie.js (IndexDB wrapper) ensuring total local data sovereignty for user research projects.
- **CSS Framework**: Tailwind CSS utility classes paired with Bootstrap 5 components for rapid scaffolding.
- **Animation Engine**: `motion` (imported from `motion/react`) for layout transition animations.
- **Icons Library**: `lucide-react` / Bootstrap Icons (`bi-*`).

---

## 🧬 3. Frontier AI Orchestration Tiering

To replicate the AI performance, emulate the following model tiering using the modern `@google/genai` TypeScript SDK:

| Model Identity | Operational Role | Use Cases |
| :--- | :--- | :--- |
| **`gemini-3.5-flash`** | **Logical Tier** | Step 1 Question uniqueness evaluation, Step 3 deep 5-layer Tree-of-Thought (ToT) generation, Step 7 descriptive and test-statistics generation, and Step 10 full-manuscript compilation. |
| **`gemini-3.1-flash-lite`** | **Synthesis Tier** | Step 2 Literature Search Grounding (with Google Search tool enabled), Step 6 sandboxed data simulation coding, Step 8 claim evaluation, Step 9 Peer-reviewer critiques, and real-time interface streams. |

---

## 🔄 4. The 10-Step Scientific Workflow Pipeline

Any emulating agent must implement the following 10 steps, ensuring context flows sequentially:

```
[Step 1] Question -> [Step 2] Literature -> [Step 3] Hypothesis -> [Step 4] Methodology -> [Step 5] SAP 
                                                                                               |
[Step 10] Paper <-- [Step 9] Peer Review <-- [Step 8] Claims <-- [Step 7] Analysis <-- [Step 6] Data Plan
```

### Step-by-Step Prompting & Logic:

1. **Step 1: Research Question**
   - **Input**: User's initial title and description.
   - **AI Action**: Evaluates novelty and outputs a formal research question, a novelty/uniqueness score (0.0 to 1.0), and academic justification matching `RESEARCH_QUESTION_SCHEMA`.
2. **Step 2: Literature Review**
   - **Input**: Research question from Step 1.
   - **AI Action**: Activates Google Search Grounding to find peer-reviewed citations. Returns a structured JSON summarizing existing knowledge and identified literature gaps.
3. **Step 3: Hypothesis Tree**
   - **Input**: Literature gaps and research question.
   - **AI Action**: Implements a 5-layer Tree of Thought (ToT) loop. Generates 2 hypotheses per layer, scores them, prunes the lower scorer, and refines the survivor into the next layer. Outputs final Alternative ($H_1$) and Null ($H_0$) Hypotheses.
4. **Step 4: Study Design / Methodology**
   - **Input**: Final chosen hypothesis.
   - **AI Action**: Generates a detailed, replicable study design (experimental, simulated, or observational).
5. **Step 5: Statistical Analysis Plan (SAP)**
   - **Input**: Methodology.
   - **AI Action**: Defines statistical endpoints, required variables, analysis models, significance thresholds ($\alpha = 0.05$), and outlier rules.
6. **Step 6: Data Acquisition & Sandboxed Simulation**
   - **Input**: Methodology & SAP.
   - **Logic**:
     - *Simulation Mode*: AI writes raw JavaScript code to synthesize standard CSV format data.
     - *Self-Healing Engine*: Code is executed inside an isolated Web Worker. If a syntax or execution error occurs, the compiler logs are piped back to the AI with a repair request. Re-runs automatically up to **25 attempts** until a valid CSV matching the expected columns is retrieved.
     - *Physical Mode*: Accepts direct file upload or manual spreadsheet inputs. Sanitizes all inputs into standardized RFC 4180 CSVs.
7. **Step 7: Data Analysis & Interactive Visuals**
   - **Input**: Cleaned CSV.
   - **AI Action**: Parses CSV, calculates statistical tests (T-tests, ANOVA, Pearson's R), and synthesizes a structured JSON array for charting. Render interactive Chart.js graphs dynamically.
8. **Step 8: Scientific Interpretation**
   - **Input**: Statistical results and charts.
   - **AI Action**: Formulates claims, determines if $H_0$ is successfully rejected, and analyzes internal/external limits.
9. **Step 9: Adversarial Peer Review**
   - **Input**: Combined summaries of Steps 1-8.
   - **AI Action (3-Turn Loop)**:
     - *Turn 1*: Personifies a harsh Methodological Critic. Critique study design.
     - *Turn 2*: Personifies a strict Statistical Skeptic.  Critique analysis.
     - *Turn 3*: Personifies an Editor-in-Chief. Synthesizes critiques into "Major Revisions", "Minor Revisions", or "Fatal Flaws".
10. **Step 10: Manuscript Draft**
    - **Input**: Consolidated ledger and peer-review critiques.
    - **AI Action**: Synthesizes a publication-ready manuscript containing Title, Abstract, Introduction, Methods, Results, Discussion, and References. Exportable to Markdown, DOC, TXT, or PDF.

---

## 🛡️ 5. Global Research "Blockers" System

A critical emulation constraint is the **Blocker Engine**. A blocker is a system-generated alert that halts automated step-advancement until resolved by the human investigator:
- **Blocker Severity**: `critical` (blocks execution entirely) or `warning` (allows execution but logs caveats).
- **Trigger Scenarios**:
  - *Safety Block*: Scans protocols for hazardous biosecurity, toxic chemicals, or weaponizable elements.
  - *Quality Block*: Triggered if Step 6 CSV data contains >20% outliers, missing coordinates, or fails standard deviation checks.
  - *Novelty Block*: Triggered in Step 1 if the uniqueness score drops below 0.3.

---

## 📦 6. Dependency Manifest & Setup

To replicate this environment, initialize a Node project containing the following packages:

```json
{
  "name": "project-hypatia-pro",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@google/genai": "^0.1.1",
    "better-sqlite3": "^11.8.0",
    "bcrypt": "^5.1.1",
    "bootstrap": "^5.3.3",
    "bootstrap-icons": "^1.11.3",
    "chart.js": "^4.4.7",
    "cors": "^2.8.5",
    "dexie": "^4.0.10",
    "dexie-react-hooks": "^1.1.7",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2",
    "lucide-react": "^0.471.1",
    "motion": "^11.16.2",
    "react": "^19.0.0",
    "react-chartjs-2": "^5.3.0",
    "react-dom": "^19.0.0",
    "react-markdown": "^9.0.3"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/better-sqlite3": "^7.6.12",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/react": "^19.0.4",
    "@types/react-dom": "^19.0.2",
    "esbuild": "^0.24.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vite": "^6.0.7"
  }
}
```

---

## ⚙️ 7. Replication Execution Protocols (For AI Agents)

When an external agent is replicating or writing components for this system:

1. **Maintain Type Integrity**: Use standard `interface` models for Local DB items (see `all.md`).
2. **Handle IFrame Constraints**: Avoid triggering `window.open` or native blocking browser components (`window.alert`). Prefer modular react toasts or overlays.
3. **Lazy Initialization**: Initialize the `@google/genai` client dynamically inside helper functions to ensure the app server boots successfully even if the environment variables are not yet configured.
4. **Step-Tracker Synchronization**: Bind UI rendering to the current step property of the selected IndexDB active record. Allow navigation backwards for completed phases but prevent skipping locked stages.
