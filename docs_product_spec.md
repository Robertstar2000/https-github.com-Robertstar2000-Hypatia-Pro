# Engineering Specification (v3.0)

Project Hypatia Pro is a high-performance, full-stack scientific orchestration platform.

## 1. Core Technology Stack
- **Engine**: React 19 (Strict Mode enabled).
- **Styling**: Bootstrap 5.3 + Custom CSS3 Design System.
- **AI Integration**: `@google/genai` (SDK for Gemini 2.5).
- **Persistence**: Firebase Firestore (NoSQL) + Better-SQLite3 (local cache).
- **Visualization**: Chart.js 4.x + Raw Base64 Image Injection.
- **Formatting**: Marked.js + KaTeX (Formula support).
- **Backend**: Express 5.x.

## 2. Agentic Architecture (HMAP)
Hypatia utilizes a **Directed Acyclic Graph (DAG)** of agent interactions orchestrated through a robust agentic harness:

### 2.1 The Agentic Harness
The platform employs specialized harnesses to govern different types of tasks:
- **Tree of Thought (ToT) Harness (Step 3)**: Orchestrates a multi-layered evaluation framework where hypotheses are progressively pruned based on Uniqueness, Utility, and Falsifiability scores. This harness manages state across 5 deep layers.
- **Coder-Debugger Loop (Step 6)**: A specialized iterative harness that executes generated JavaScript in a secure sandbox, captures execution logs/errors, and feeds them back to a debugger agent for self-healing up to a maximum number of retries.
- **Multi-Agent Swarm (Step 7 & 10)**: Triggers concurrent tasks (like profiling, statistical testing, and visualization configuration) and aggregates the outputs. The visualization harness specifically sanitizes raw JSON configurations against markdown wrappers to ensure Chart.js stability.
- **Adversarial Debate Harness (Step 9)**: Orchestrates a 3-turn sequential critique where a Methodology Reviewer and a Statistical Reviewer provide independent critiques, which are then synthesized by an Editor-in-Chief into a structured journal-style peer review.

### 2.2 Agent Tiers
- **Logic Tier (Pro)**: `gemini-2.5-pro` - Used for Step 1 (Reasoning), Step 9 (Adversarial Logic, 3-turn rigorous process), and Step 10 (Technical Writing).
- **Synthesis Tier (Flash)**: `gemini-2.5-flash` - Used for high-volume summarization and data simulation.

## 3. Security & Code Sandboxing
### Step 6 Code Execution
AI-generated JavaScript is executed in a secure, sandboxed environment.

## 4. Performance & Token Economy
- **Archival Summarization**: Upon node verification, a secondary AI call generates a concise summary (Token Compression). This summary is used for context in future steps, preventing "Context Window Bloat."
- **Throttled Streaming**: Text updates are throttled to 1500ms intervals to prevent browser rendering bottlenecks during high-token-rate streams.

## 5. Persistence Schema
```typescript
interface Experiment {
  id: string; // GUID
  title: string;
  field: string;
  currentStep: number;
  stepData: Record<number, StepData>; // Persistent Archival Nodes
  labNotebook: string;
  automationMode: 'manual' | 'automated' | null;
  createdAt: string; // ISO 8601
}
```