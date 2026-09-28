# ✨ Project Hypatia Pro: User Guide & System Protocols

Welcome to the **Project Hypatia Pro** User Manual. This document provides clear instructions and system descriptions designed to help you navigate and master our professional AI-Powered Scientific Discovery Platform.

---

## 🔐 1. Authentication & Session Security

Hypatia Pro implements a secure full-stack authentication mechanism combining server-side access control with local data sovereignty:

1. **User Accounts**: Sign up or log in using the portal. This communicates with our Express.js backend and registers credentials securely inside an encrypted SQLite database (`mifeco.db`).
2. **Access Tokens**: Sessions are governed by secure JSON Web Tokens (JWT) stored in your browser's local storage.
3. **API Integrity**: High-level AI actions require a Google Gemini API key. If pre-loaded in the server environment, access is automatically granted; otherwise, users can enter their custom key securely via the interface.

---

## 🗺️ 2. The Research Phase Step-Tracker

At the top of the workspace card, you will find our newly integrated **Research Phase Tracker**. This high-contrast visual component maps the 10 detailed workflow steps into 5 clean, logical scientific phases:

```
[ Hypothesis ] ---> [ Methodology ] ---> [ Data Collection ] ---> [ Analysis ] ---> [ Publication ]
```

* **Hypothesis**: Steps 1 - 3 (Question, Discovery, Hypotheses Tree)
* **Methodology**: Steps 4 - 5 (Protocol Study, Statistical Analysis Plan)
* **Data Collection**: Step 6 (Data Acquisition or Sandbox Simulation)
* **Analysis**: Steps 7 - 9 (Analysis & Visuals, Interpretation, Peer Review)
* **Publication**: Step 10 (Consolidated Manuscript Drafting)

### Interaction Rules:
- **Completed Phases**: Display a green checkmark indicating successful completion and ledger verification.
- **Active Phase**: Highlights with an elegant blue glow effect and a detailed label.
- **Dynamic Connection**: A continuous, responsive progress line visualizes overall project completion based on the furthest unlocked `currentStep`.
- **Fast Travel**: You can click on any unlocked or completed phase indicator to immediately jump to the corresponding workspace!

---

## ⚙️ 3. Workflow Control: Manual vs. Automated

Upon completing step 1, you can configure your automation preference:

- **Manual Forensic Control**: Step-by-step human mediation. You execute AI generations, review inputs, resolve any flagged blockers, and manually authorize step verification.
- **Agentic Reconstruction (Automated)**: The system enters an autonomous recursive loop. It auto-generates step contents, evaluates blockers, and schedules a countdown to automatically transition to the next step unless paused by the user.

---

## 🧪 4. Step-by-Step Walkthrough

### Phase A: Hypothesis Formulation
* **Step 1: Research Question**: Refine your title and abstract into a testable hypothesis. Employs `gemini-3.5-flash` to evaluate question uniqueness.
* **Step 2: Evidence Discovery**: Automatically triggers Google Search grounding to retrieve peer-reviewed literature and identify theoretical gaps.
* **Step 3: Hypothesis Tree**: Leverages a 5-layer Tree of Thought (ToT) model to draft, score, prune, and refine hypotheses into strict null and alternative forms.

### Phase B: Methodology
* **Step 4: Study Design**: Formulates a detailed, replicable experimental protocol (observational, simulated, or benchmarked).
* **Step 5: Analysis Plan**: Locks down your Statistical Analysis Plan (SAP) including primary endpoints, variable structures, and significance thresholds.

### Phase C: Data Collection
* **Step 6: Data Acquisition**: 
  - **Physical mode**: Manual CSV entry or direct dataset upload.
  - **Simulation mode**: Launches an agentic coder that writes sandboxed JavaScript simulation scripts, tests execution in a Web Worker, and heals any compile errors automatically (up to 25 attempts) to return a clean CSV.

### Phase D: Analysis & Critique
* **Step 7: Analysis & Visuals**: Analyzes the generated CSV data, running descriptive statistics and statistical hypothesis testing. Outputs interactive Chart.js visualizations dynamically.
* **Step 8: Interpretation**: Assesses claim robustness, checks outliers, and logs external validity limitations.
* **Step 9: Peer Review**: Simulates a 3-turn adversarial peer review loop (Methodology Critic, Statistical Skeptic, and Editor-in-Chief consensus).

### Phase E: Publication
* **Step 10: Publication Bundle**: Integrates all previous step ledger outputs to draft a high-quality, comprehensive scientific manuscript. Users can download files as **Markdown (.md)**, **Plain Text (.txt)**, **Word Document (.doc)**, or print/save as **PDF**.
