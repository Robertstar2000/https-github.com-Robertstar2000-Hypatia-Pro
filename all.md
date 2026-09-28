# 📚 Project Hypatia Pro: Complete System Architecture & Reference Manual

Welcome to the centralized reference manual for **Project Hypatia Pro**. This document compiles the complete system specifications, database schemas, frontier AI orchestration tiering, workflow rules, and user guides into a single comprehensive guide.

---

## 💻 1. Technical Stack & System Architecture

Project Hypatia Pro is structured as a robust, secure, full-stack application that respects data privacy and minimizes UI latency:

```
+--------------------------------------------------------------------------+
|                                FRONTEND                                  |
|  - React 19 (SPA) with TypeScript                                        |
|  - UI: Bootstrap 5 + Tailwind Utility Styling (Sci-Fi Dark Theme)        |
|  - Local DB: Dexie.js (IndexedDB) for client-side privacy                |
+------------------------------------+-------------------------------------+
                                     |
                                     | Secured JSON Web Tokens (JWT)
                                     v
+--------------------------------------------------------------------------+
|                             BACKEND SERVICE                              |
|  - Runtime: Node.js with Express.js                                      |
|  - Server Database: SQLite (better-sqlite3)                              |
|  - Handlers: Session Waitlists, Signup/Logins, API Health Checking       |
+------------------------------------+-------------------------------------+
                                     |
                                     | Secured API Proxies & Grounding
                                     v
+--------------------------------------------------------------------------+
|                              AI ORCHESTRATION                            |
|  - Google GenAI SDK (@google/genai)                                      |
|  - Logical Tier: gemini-3.5-flash (deep reasoning, strict schemas)        |
|  - Synthesis Tier: gemini-3.1-flash-lite (high-speed streaming)          |
+--------------------------------------------------------------------------+
```

---

## 🗄️ 2. Database Schemas

### 2.1 Backend SQLite Database (`mifeco.db`)
Stores system users and access request waitlists securely on the server side:
- **`users`**: `id` (INTEGER PRIMARY KEY), `username` (TEXT UNIQUE), `email` (TEXT UNIQUE), `password` (TEXT, bcrypt-hashed), `geminiKey` (TEXT), `createdAt` (DATETIME).
- **`waitlist`**: `id` (INTEGER PRIMARY KEY), `email` (TEXT UNIQUE), `platform` (TEXT), `createdAt` (DATETIME).

### 2.2 Client-Side IndexedDB Database (Dexie.js)
Stores local, zero-latency research project documents to preserve user privacy and sovereignty:
- **`experiments`**:
  ```typescript
  interface Experiment {
    id: string;                     // Unique GUID
    title: string;                  // Project Title
    description: string;            // Brief abstract / description
    field: string;                  // Scientific Field (e.g. Biology, Physics)
    currentStep: number;            // Pointer to furthest unlocked step (1-10)
    stepData: {                     // Map containing inputs & outputs for each step
      [key: number]: {
        input?: string;             // User or system provided prompt parameters
        output?: string;            // Primary generated content
        summary?: string;           // Compressed summary used for downstream context
        blockers?: Blocker[];       // Flagged research blockers
      }
    };
    fineTuneSettings: {             // Custom prompt configuration overrides
      [key: number]: Record<string, any>;
    };
    labNotebook: string;            // Free-form personal workspace notes
    automationMode: 'manual' | 'automated' | null;
    experimentMode: 'simulation' | 'physical' | null;
    status: 'active' | 'archived';
  }
  ```

---

## 🤖 3. Frontier AI Orchestration Tiering

The orchestration model dynamically tiers AI execution between two model families to balance execution speed with deep structured reasoning:

| Model | Architecture Tier | Primary Use Cases |
| :--- | :--- | :--- |
| **`gemini-3.5-flash`** | **Logical Tier** | Formulating testable questions, constructing 5-layer Tree of Thought hypothesis trees, executing structured JSON parsing, generating statistical analysis, and compiling the publication-ready manuscript. |
| **`gemini-3.1-flash-lite`** | **Synthesis Tier** | High-speed text streaming, literature discovery (with search grounding), compiling data tables, simulated code execution, and acting as adversarial reviewer personas. |

---

## 🗺️ 4. The 10-Step Scientific Workflow & Visual Phase Tracker

The application renders a premium, interactive **Research Phase Step-Tracker** at the top of the main workspace. This stepper maps the 10 workflow steps to 5 major scientific phases:

### 4.1 Phase 1: Hypothesis (Steps 1 - 3)
* **Step 1: Research Question**: Formulates a clear, measurable, and falsifiable scientific query. Checks novelty using a Google search-backed uniqueness score.
* **Step 2: Evidence Discovery**: Runs automated web search grounding to gather relevant literature references, cataloging existing knowledge and highlighting archive gaps.
* **Step 3: Hypothesis Tree**: Invokes a deep, 5-layer Tree of Thought (ToT) reasoning loop. Generates candidate hypotheses at each level, evaluates them, prunes lower-performing branches, and selects the strongest to compile formal alternative and null hypotheses.

### 4.2 Phase 2: Methodology (Steps 4 - 5)
* **Step 4: Study Design**: Crafts a step-by-step, replicable experimental protocol tailored to the chosen study type (observational, simulated, or benchmarking).
* **Step 5: Analysis Plan**: locks down a strict Statistical Analysis Plan (SAP) to define primary variables, signifiers, preprocessing rules, and significance metrics.

### 4.3 Phase 3: Data Collection (Step 6)
* **Step 6: Data Acquisition**:
  - *Physical mode*: Provides interfaces for manual spreadsheet entry or uploading a raw CSV file.
  - *Simulation mode*: Spawns an agentic Javascript coder. It drafts custom simulation logic based on Step 4's protocols, runs it in a sandboxed Web Worker, and operates an automatic self-healing debugger loop (up to 25 attempts) to fix any compile or runtime bugs until a valid CSV is generated.

### 4.4 Phase 4: Analysis (Steps 7 - 9)
* **Step 7: Analysis & Visuals**: Ingests Step 6's dataset and executes the SAP rules. Performs statistical tests (e.g. correlation, t-tests, ANOVA) and generates beautiful, robust, interactive Chart.js visualizations dynamically.
* **Step 8: Interpretation**: Evaluates the results, determines if they reject or fail to reject the null hypothesis, and identifies limiting variables or potential outliers.
* **Step 9: Peer Review**: Simulates a rigorous, multi-persona adversarial audit (Methodological Purist, Statistical Skeptic, and Editor-in-Chief consensus) to expose theoretical weaknesses.

### 4.5 Phase 5: Publication (Step 10)
* **Step 10: Publication Bundle**: Consolidates the validated outputs of all previous steps to draft a formal academic manuscript. Supports exporting to Markdown (.md), Plain Text (.txt), Microsoft Word (.doc), or PDF printing.

---

## 🛡️ 5. Global "Blocker" Protocols

The AI "Principal Investigator" acts as a strict verification guard, halting automation or manual progression if critical validation checks fail:

1. **Hallucination Check**: Step 2 literature reviews undergo real-time search verification. If reference details cannot be validated, a warning is raised.
2. **Safety Guard**: Protocol design scans for restricted bio-chemical, radiological, or cybernetic procedures, triggering a block if detected.
3. **Outlier/Quality Threshold**: In Step 7, if outlier density exceeds 20% or if more than 30% of critical data is missing, the system pauses automation and prompts user mitigation.
