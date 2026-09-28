
<div align="center">
  <h1 align="center">✨ Project Hypatia Pro</h1>
  <p align="center">
    The Professional AI-Powered Scientific Discovery Platform.
    <br />
    <a href="#about-the-project"><strong>Explore the features »</strong></a>
    <br />
    <br />
  </p>
    <p align="center">
    <img src="https://img.shields.io/badge/React-19-blue?logo=react&logoColor=white" alt="React">
    <img src="https://img.shields.io/badge/Express-5-black?logo=express&logoColor=white" alt="Express">
    <img src="https://img.shields.io/badge/Gemini_API-2.5-4285F4?logo=google&logoColor=white" alt="Gemini API">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
  </p>
</div>

---

### **Note: This is a sophisticated full-stack application powered by Express and Firebase.**

---

## Table of Contents

- [About The Project](#about-the-project)
- [Key Features](#key-features)
- [The HMAP Philosophy](#the-hmap-philosophy-human-mediated-agentic-process)
- [The Scientific Method & Hypatia](#the-scientific-method--hypatia)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
  - [1. Choosing Your Workflow: Manual vs. Automated](#1-choosing-your-workflow-manual-vs-automated)
  - [2. The 10-Step Workflow](#2-the-10-step-workflow)
  - [3. Fine-Tuning the AI](#3-fine-tuning-the-ai)
  - [4. The Experiment Runner (Step 6)](#4-the-experiment-runner-step-6)
- [Contributing](#contributing)
- [License](#license)

---

## About The Project

Project Hypatia Pro is your digital lab partner, an AI-powered platform designed to assist researchers, students, and citizen scientists throughout the entire scientific discovery process. It provides a structured, 10-step workflow, leveraging the Google Gemini API to streamline every stage of research, from question formulation to a publication-ready draft.

---

## Key Features

- **Progressive Research Phase Step-Tracker**: Visually track the state of your research through five high-contrast visual phases (Hypothesis, Methodology, Data Collection, Analysis, Publication) mapped dynamically to the 10-step workflow.
- **Progressive Tree of Thought (ToT)**: Visually track the 5-layer hypothesis generation process with rigorous layer-by-layer evaluation.
- **Robust Data Visualization**: Fault-tolerant AI-generated Chart.js rendering, capable of handling complex raw JSON configurations safely.
- **Rigorous Adversarial Peer Review**: A highly structured, 3-turn peer review agentic loop (Methodology Reviewer, Statistical Reviewer, Editor-in-Chief).
- **HMAP Workflow**: Human-Mediated Agentic Process allows the principal investigator to guide AI execution efficiently.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Bootstrap 5 & Tailwind utility styling.
- **Local Persistence**: Dexie.js (IndexedDB wrapper) for zero-latency, private, client-side research storage.
- **Backend Service**: Express.js server running in Node.js, SQLite with `better-sqlite3` for secure user signup, session tokens (JWT), and waitlists.
- **Frontier AI Models**:
  - **`gemini-3.5-flash`** (Logical Tier): Powers structured JSON schema generation, hypothesis tree reasoning, data analysis, and manuscript draft compilation.
  - **`gemini-3.1-flash-lite`** (Synthesis Tier): Powers real-time interactive stream generation, literature discover grounding, and reviewer personas critiques.

---

## Getting Started

1.  **Clone the repository**.
2.  **Install dependencies**: `npm install`
3.  **Set up environment variables**: Configure your `.env` file with required API keys (Gemini API, JWT secrets).
4.  **Start the development server**: `npm run dev`
