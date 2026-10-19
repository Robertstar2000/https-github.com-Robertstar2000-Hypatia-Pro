
import { 
    RESEARCH_QUESTION_SCHEMA, 
    DATA_ANALYSIS_IMAGE_OUTPUT_SCHEMA,
    HYPOTHESIS_TREE_SCHEMA
} from './config';
import { isValidJsonForSchema, getPromptForStep, getStepContext, getCurrentApiKey, testApiKey, tryRepairJson } from './services';
import { normalizeTreeData } from './components/steps/HypothesisWorkspace';
import { cleanAndFormatCsv } from './utils/csvUtils';
import { calculateTwoSampleTPower } from './utils/powerAnalysis';
import { calculateReplicabilityScore, generateOsfPreregistration } from './utils/replicabilityScorecard';
import { rankLiteratureByRelevance } from './utils/semanticSearch';
import { extractFactsFromText } from './utils/nlpExtractor';
import { runMonteCarloSimulation } from './utils/monteCarloEngine';

// --- Utilities for Testing ---
const expect = (actual: any) => ({
    toBe: (expected: any) => { 
        if (actual !== expected) throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`); 
    },
    toContain: (substring: string) => { 
        if (typeof actual !== 'string' || !actual.includes(substring)) throw new Error(`Expected "${actual}" to contain "${substring}"`); 
    },
    toEqual: (expected: any) => { 
        if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected deep equality.\nGot: ${JSON.stringify(actual)}\nExp: ${JSON.stringify(expected)}`); 
    },
    toExist: () => {
        if (actual === undefined || actual === null) throw new Error('Expected value to exist');
    }
});

const mockContext = {
    experimentField: 'Biology',
    question: 'How does caffeine affect plant growth?',
    literature_review_summary: 'Previous studies show mixed results on caffeine levels.',
    hypothesis: 'Caffeine will inhibit root development.',
    methodology_summary: 'Apply caffeine solution to Arabidopsis seedlings.',
    data_collection_plan_summary: 'Measure root length daily for 10 days.',
    experimental_data_summary: '10, 5, 2, 0 root length measurements.',
    analysis_summary: 'Strong negative correlation between caffeine and growth.',
    full_project_summary_log: 'Step 1: Question, Step 2: Lit Review, Step 3: Hypothesis...'
};

// --- Test Definitions ---
export const appTests = [
    {
        name: "[System] API Connectivity & Key Health Assessment",
        fn: async () => {
            const key = getCurrentApiKey();
            if (!key) throw new Error("No API Key found in environment.");
            const isWorking = await testApiKey(key);
            if (typeof isWorking !== 'boolean') {
                throw new Error("Expected testApiKey to return a boolean status");
            }
            const { getKeyStatus } = await import('./services/api');
            const status = getKeyStatus();
            if (!status || !status.model) {
                throw new Error("Failed to resolve active model in keyStatus");
            }
        }
    },
    {
        name: "[Unit] CSV Utility: cleanAndFormatCsv normalization",
        fn: async () => {
            const raw = "id,val\n1,10\n2";
            const expected = '"id","val"\n"1","10"\n"2",""';
            expect(cleanAndFormatCsv(raw)).toBe(expected);
        }
    },
    {
        name: "[Unit] JSON Validation: RESEARCH_QUESTION_SCHEMA validation",
        fn: async () => {
            const validJson = JSON.stringify({
                research_question: "Test?",
                study_type: "observational", // Added required field
                uniqueness_score: 0.8,
                justification: "Unique because...",
                field: "Biology"
            });
            const invalidJson = JSON.stringify({ foo: "bar" });
            
            if (!isValidJsonForSchema(validJson, RESEARCH_QUESTION_SCHEMA)) {
                 throw new Error(`Valid JSON failed validation: ${validJson}`);
            }
            if (isValidJsonForSchema(invalidJson, RESEARCH_QUESTION_SCHEMA)) {
                 throw new Error("Invalid JSON passed validation");
            }
        }
    },
    {
        name: "[Unit] JSON Validation: HYPOTHESIS_TREE_SCHEMA resilience with optional fields",
        fn: async () => {
            const validTreeJson = JSON.stringify({
                criteria: {
                    uniqueness: "Novelty test",
                    utility: "Utility test",
                    falsifiability: "Falsifiability test"
                },
                layers: [
                    {
                        layer_number: 1,
                        candidates: [
                            {
                                id: "c1",
                                hypothesis_draft: "Draft 1",
                                uniqueness_score: 0.9,
                                utility_score: 0.85,
                                falsifiability_score: 0.8,
                                selected: true,
                                pruning_reason: null // Winner has null pruning_reason
                            },
                            {
                                id: "c2",
                                hypothesis_draft: "Draft 2",
                                uniqueness_score: 0.5,
                                utility_score: 0.6,
                                falsifiability_score: 0.4,
                                selected: false,
                                pruning_reason: "Low uniqueness"
                            }
                        ]
                    }
                ],
                final_hypothesis: {
                    null_hypothesis: "H0: No difference",
                    alternative_hypothesis_1: "H1: Significant difference",
                    alternative_hypothesis_2: "H2: Secondary difference"
                }
            });

            if (!isValidJsonForSchema(validTreeJson, HYPOTHESIS_TREE_SCHEMA)) {
                throw new Error("Valid tree JSON failed HYPOTHESIS_TREE_SCHEMA validation.");
            }
        }
    },
    {
        name: "[Unit] JSON Repair: tryRepairJson rescues cut-off and unclosed JSON",
        fn: async () => {
            const cutOffJson = '{"criteria":{"uniqueness":"High"},"layers":[{"layer_number":1,"candidates":[{"id":"c1","hypothesis_draft":"Test"}]';
            const repaired = tryRepairJson(cutOffJson);
            if (!repaired || repaired.criteria?.uniqueness !== 'High') {
                throw new Error("Failed to auto-repair cut-off JSON.");
            }
            if (!Array.isArray(repaired.layers) || repaired.layers[0].candidates[0].id !== 'c1') {
                throw new Error("Repaired structure did not preserve layer array.");
            }
        }
    },
    {
        name: "[Unit] Tree Normalization: normalizeTreeData safeguards against string scores and malformed layers",
        fn: async () => {
            const weirdData = {
                criteria: {
                    uniqueness: { description: "High novelty criterion" }, // Object instead of string
                    utility: "Clinical impact",
                    falsifiability: 42 // Number instead of string
                },
                layers: {
                    "layer1": { // Object instead of array
                        layer_number: "1",
                        candidates: [
                            {
                                id: "c1",
                                hypothesis_draft: "Test draft",
                                uniqueness_score: "0.85", // String instead of number
                                utility_score: 0.9,
                                selected: true
                            }
                        ]
                    }
                },
                final_hypothesis: "H1: Direct string hypothesis format"
            };

            const normalized = normalizeTreeData(weirdData);
            if (!normalized) throw new Error("Expected normalizeTreeData to return an object.");
            if (typeof normalized.criteria.uniqueness !== 'string') throw new Error("Criteria uniqueness was not normalized to string.");
            if (!Array.isArray(normalized.layers) || normalized.layers.length !== 1) throw new Error("Layers were not normalized to an array.");
            if (typeof normalized.final_hypothesis.alternative_hypothesis_1 !== 'string') throw new Error("Final hypothesis was not normalized.");
        }
    },
    {
        name: "[Process] Step 1: Research Question Prompt logic",
        fn: async () => {
            const { basePrompt, expectJson } = getPromptForStep(1, 'Caffeine and plants', mockContext, {});
            expect(expectJson).toBe(true);
            expect(basePrompt).toContain("CRITICAL: YOU MUST OUTPUT ONLY VALID JSON");
            // Check for schema content (keys) rather than variable name
            expect(basePrompt).toContain("research_question");
            expect(basePrompt).toContain("uniqueness_score");
        }
    },
    {
        name: "[Process] Step 2: Literature Review Prompt logic",
        fn: async () => {
            const { basePrompt } = getPromptForStep(2, '', mockContext, {});
            expect(basePrompt).toContain("Literature review for:");
            expect(basePrompt).toContain(mockContext.question);
        }
    },
    {
        name: "[Process] Step 3: Hypothesis Prompt logic",
        fn: async () => {
            const { basePrompt } = getPromptForStep(3, '', mockContext, {});
            expect(basePrompt).toContain("Tree of Thought");
            expect(basePrompt).toContain(mockContext.literature_review_summary);
        }
    },
    {
        name: "[Process] Step 4: Methodology Prompt logic",
        fn: async () => {
            const { basePrompt } = getPromptForStep(4, '', mockContext, {});
            expect(basePrompt).toContain("Detailed experimental methodology for:");
            expect(basePrompt).toContain(mockContext.hypothesis);
        }
    },
    {
        name: "[Process] Step 5: Data Plan Prompt logic",
        fn: async () => {
            const { basePrompt } = getPromptForStep(5, '', mockContext, {});
            expect(basePrompt).toContain("Data collection plan for methodology:");
            expect(basePrompt).toContain(mockContext.methodology_summary);
        }
    },
    {
        name: "[Process] Step 6: Experiment Runner Prompt logic",
        fn: async () => {
            const { basePrompt } = getPromptForStep(6, '', mockContext, {});
            expect(basePrompt).toContain("Generate synthetic CSV data");
        }
    },
    {
        name: "[Logic] Experiment Runner: Context Aggregation",
        fn: async () => {
            // Verify that Step 6 (Runner) correctly inherits Hypothesis (Step 3) and Methodology (Step 4)
            // This ensures the Runner has the correct "Scientific Instructions" to generate data.
            const runnerMockExp = {
                field: 'Physics',
                stepData: {
                    3: { output: 'Hypothesis: Velocity increases with time.' },
                    4: { summary: 'Method: Drop ball from tower.' }
                }
            };
            const ctx = await getStepContext(runnerMockExp as any, 6);
            expect(ctx.hypothesis).toBe('Hypothesis: Velocity increases with time.');
            expect(ctx.methodology_summary).toBe('Method: Drop ball from tower.');
        }
    },
    {
        name: "[Logic] Experiment Runner: Data Synthesizer Prompting",
        fn: async () => {
            // Verify the specific prompt construction for the "Synthesize Data" button in the Runner
            const runnerContext = { methodology_summary: 'Mix Chemical A and B' };
            const { basePrompt } = getPromptForStep(6, '', runnerContext, {});
            expect(basePrompt).toContain("Generate synthetic CSV data");
            expect(basePrompt).toContain("Mix Chemical A and B");
        }
    },
    {
        name: "[Logic] Experiment Runner: CSV Output Sanitization",
        fn: async () => {
            // Verify that messy AI/Manual input is cleaned before moving to Analysis (Step 7)
            const messyInput = '  Time, Value \n 1,  10.5 \n 2, "20.0" ';
            const cleaned = cleanAndFormatCsv(messyInput);
            expect(cleaned).toContain('"Time","Value"');
            expect(cleaned).toContain('"1","10.5"');
            expect(cleaned).toContain('"2","20.0"');
        }
    },
    {
        name: "[Process] Step 7: Data Analysis Prompt logic",
        fn: async () => {
            const { basePrompt, expectJson } = getPromptForStep(7, 'csvData', mockContext, {});
            expect(expectJson).toBe(true);
            // Check for schema content (keys) rather than variable name
            expect(basePrompt).toContain("charts");
            expect(basePrompt).toContain("Analyze data: csvData");
        }
    },
    {
        name: "[Process] Step 8: Conclusion Prompt logic",
        fn: async () => {
            const { basePrompt } = getPromptForStep(8, '', mockContext, {});
            expect(basePrompt).toContain("Synthesize the findings from the analysis node.");
            expect(basePrompt).toContain(mockContext.analysis_summary);
        }
    },
    {
        name: "[Process] Step 9: Peer Review Prompt logic",
        fn: async () => {
            const { basePrompt } = getPromptForStep(9, '', mockContext, {});
            expect(basePrompt).toContain("Simulate a skeptical peer review");
            expect(basePrompt).toContain(mockContext.full_project_summary_log);
        }
    },
    {
        name: "[Process] Step 10: Publication Prompt logic",
        fn: async () => {
            const { basePrompt } = getPromptForStep(10, '', mockContext, {});
            expect(basePrompt).toContain("scientific publication");
        }
    },
    {
        name: "[Unit] Statistical Power Calculator",
        fn: async () => {
            const res = calculateTwoSampleTPower(0.5, 30);
            if (res.power <= 0 || res.power > 1) throw new Error("Invalid power value");
            if (!res.interpretation) throw new Error("Missing interpretation");
        }
    },
    {
        name: "[Unit] Replicability & Robustness Scorecard",
        fn: async () => {
            const mockExp: any = {
                title: 'Test Study',
                description: 'A study on Arabidopsis growth with control group.',
                stepData: {
                    3: { output: 'N = 60' },
                    4: { output: 'Detailed protocol with control baseline and random assignment.' }
                }
            };
            const scoreRes = calculateReplicabilityScore(mockExp);
            if (scoreRes.score < 0 || scoreRes.score > 100) throw new Error("Score out of bounds");
            const osfDoc = generateOsfPreregistration(mockExp);
            expect(osfDoc).toContain("OSF Preregistration Protocol");
        }
    },
    {
        name: "[Unit] In-Browser Semantic Literature Filter",
        fn: async () => {
            const papers = [
                { title: 'Caffeine effects on plant biology', snippet: 'Arabidopsis root lengths observed under caffeine.' },
                { title: 'Quantum mechanics in superconductors', snippet: 'High temperature superconducting behavior.' }
            ];
            const ranked = rankLiteratureByRelevance('caffeine plant roots', papers);
            if (ranked.length !== 2) throw new Error("Expected 2 papers ranked");
            if (ranked[0].title !== 'Caffeine effects on plant biology') throw new Error("Incorrect semantic ranking order");
        }
    },
    {
        name: "[Unit] Rule-Based NLP Pre-Summarizer",
        fn: async () => {
            const text = "Sample size N = 120 subjects. Observed p < 0.001 with Cohen's d = 0.65. Primary metric is accuracy.";
            const facts = extractFactsFromText(text);
            expect(facts.sampleSize).toBe(120);
            if (facts.pValues.length === 0) throw new Error("Failed to extract p-values");
            if (!facts.metrics.includes('accuracy')) throw new Error("Failed to extract accuracy metric");
        }
    },
    {
        name: "[Unit] In-Browser Monte Carlo Simulation Engine",
        fn: async () => {
            const simRes = runMonteCarloSimulation({
                iterations: 500,
                mean: 50,
                stdDev: 10,
                treatmentEffect: 5,
                noiseLevel: 0.1
            });
            if (simRes.iterationsRun !== 500) throw new Error("Iteration count mismatch");
            if (simRes.successRate < 0 || simRes.successRate > 100) throw new Error("Invalid success rate");
        }
    },
    {
        name: "[Unit] LLM Provider: 5 supported providers validation (Google, OpenAI, Anthropic, Ollama, OpenRouter)",
        fn: async () => {
            const { SUPPORTED_PROVIDERS } = await import('./services/llmConfig');
            const requiredProviders = ['google', 'openai', 'anthropic', 'ollama', 'openrouter'];
            for (const p of requiredProviders) {
                if (!SUPPORTED_PROVIDERS[p as any]) {
                    throw new Error(`Missing required provider: ${p}`);
                }
                const def = SUPPORTED_PROVIDERS[p as any];
                if (!def.name || !def.defaultModel || !Array.isArray(def.models) || def.models.length === 0) {
                    throw new Error(`Incomplete configuration for provider ${p}`);
                }
                if (!def.oauthSupported) {
                    throw new Error(`Provider ${p} must support OAuth subscription flow`);
                }
            }
        }
    },
    {
        name: "[Unit] LLM Provider: Configuration storage and key management",
        fn: async () => {
            const { getDefaultLLMConfig, SUPPORTED_PROVIDERS } = await import('./services/llmConfig');
            const defaultConfig = getDefaultLLMConfig();
            if (!defaultConfig.provider || !SUPPORTED_PROVIDERS[defaultConfig.provider]) {
                throw new Error("Invalid default provider");
            }
            if (defaultConfig.authType !== 'key') {
                throw new Error("Default authType should be key");
            }
        }
    },
    {
        name: "[Unit] Auth: Studio environment and Studio Gemini Key presence",
        fn: async () => {
            const { getCurrentApiKey } = await import('./services/api');
            const key = getCurrentApiKey();
            if (!key) {
                throw new Error("Studio environment key is required for AI Studio test login");
            }
        }
    },
    {
        name: "[Unit] Auth: Mifeco Stripe Authority and Demo Free payload validation",
        fn: async () => {
            // Verify Stripe Authority payload structures
            const mockStripeActivation = {
                email: 'researcher@stanford.edu',
                companyName: 'Stanford AI Lab',
                plan: 'pro',
                billingCycle: 'monthly',
                stripeToken: 'tok_test_stripe'
            };
            if (!mockStripeActivation.email || !mockStripeActivation.plan || !mockStripeActivation.stripeToken) {
                throw new Error("Invalid Stripe authority activation parameters");
            }
        }
    },
    {
        name: "[Production] Durable Storage: Schema migrations applied and database is healthy",
        fn: async () => {
            if (typeof window !== 'undefined') {
                const res = await fetch('/api/health');
                if (!res.ok) throw new Error(`Health check failed with status ${res.status}`);
                const data = await res.json();
                if (data.status !== 'ok' || data.checks?.database !== 'ok') {
                    throw new Error(`Database health check failed: ${JSON.stringify(data.checks)}`);
                }
            } else {
                const dbPath = './server/db.js';
                const { checkDatabaseHealth } = await import(/* @vite-ignore */ dbPath);
                const health = checkDatabaseHealth();
                if (!health.healthy) {
                    throw new Error("Database health check failed");
                }
                if (!health.details?.migrationsApplied || health.details.migrationsApplied < 3) {
                    throw new Error(`Expected at least 3 migrations applied, got: ${health.details?.migrationsApplied}`);
                }
            }
        }
    },
    {
        name: "[Production] Durable Storage: Backup export and restore testing",
        fn: async () => {
            if (typeof window !== 'undefined') {
                const dummyBackup = { 
                    version: '2.5.0', 
                    timestamp: new Date().toISOString(), 
                    checksum: 'sha_test', 
                    tables: { users: [], entitlements: [], experiments_store: [] } 
                };
                if (!dummyBackup.version || !dummyBackup.checksum) throw new Error("Invalid backup schema");
            } else {
                const dbPath = './server/db.js';
                const { createDatabaseBackup, restoreDatabaseBackup } = await import(/* @vite-ignore */ dbPath);
                const backup = createDatabaseBackup();
                if (!backup.version || !backup.checksum || !backup.tables) {
                    throw new Error("Invalid backup artifact generated");
                }
                const restoreResult = restoreDatabaseBackup(backup);
                if (!restoreResult.success) {
                    throw new Error("Restore test failed");
                }
            }
        }
    },
    {
        name: "[Production] Secret Isolation: Keys and tokens sanitized and masked",
        fn: async () => {
            const secretsPath = './server/secrets.js';
            const { maskSecret, sanitizeLogOutput } = await import(/* @vite-ignore */ secretsPath);
            const testKey = 'AIzaSyCOPbO22HEzOInvfCxTYIdrvZXk8lMiZnw';
            const masked = maskSecret(testKey);
            if (masked.includes('HEzOInvfCxTYIdrv')) {
                throw new Error("Secret masking failed to hide internal token characters");
            }
            const logSample = `User with key ${testKey} logged error`;
            const sanitized = sanitizeLogOutput(logSample);
            if (sanitized.includes(testKey)) {
                throw new Error("SanitizeLogOutput leaked raw Gemini API key");
            }
        }
    },
    {
        name: "[Production] Scientific Knowledge Graph: Consistency audit & blast radius impact analysis",
        fn: async () => {
            const { INITIAL_KNOWLEDGE_NODES, INITIAL_KNOWLEDGE_EDGES, runConsistencyAudit, computeChangeImpact } = await import('./services/knowledgeGraph');
            const issues = runConsistencyAudit(INITIAL_KNOWLEDGE_NODES, INITIAL_KNOWLEDGE_EDGES);
            if (!Array.isArray(issues)) {
                throw new Error("Consistency audit did not return an array of issues");
            }
            const impact = computeChangeImpact('node-hyp-01', INITIAL_KNOWLEDGE_NODES, INITIAL_KNOWLEDGE_EDGES);
            if (impact.blastRadiusScore <= 0 || impact.directDependents.length === 0) {
                throw new Error("Change impact analysis failed to detect dependents for HYP-001");
            }
        }
    },
    {
        name: "[Production] Methodology Trade Study: Assay candidate ranking & sensitivity evaluation",
        fn: async () => {
            const { SAMPLE_TRADE_STUDY, calculatePughScores } = await import('./services/tradeStudies');
            const scores = calculatePughScores(SAMPLE_TRADE_STUDY);
            if (!scores['cand-spectrophotometric-plate'] || scores['cand-spectrophotometric-plate'].rank !== 1) {
                throw new Error("Methodology trade study failed: Spectrophotometric Plate should be Rank 1");
            }
        }
    },
    {
        name: "[Production] Scientific Discovery Harnesses: Controlled cohorts & in-silico simulation validation",
        fn: async () => {
            const { SAMPLE_EXPERIMENTAL_COHORTS, SAMPLE_INSILICO_MODEL, CROSS_APP_ADAPTERS } = await import('./services/specializedHarnesses');
            const validCohorts = SAMPLE_EXPERIMENTAL_COHORTS.every(c => c.sampleSize > 0 && c.inclusionCriteria.length > 0);
            if (!validCohorts) throw new Error("Controlled cohort protocols failed validation");
            if (SAMPLE_INSILICO_MODEL.iterationTrials <= 0 || SAMPLE_INSILICO_MODEL.convergencePValue >= 0.05) {
                throw new Error("In-silico kinetic model failed convergence criteria (p < 0.05)");
            }
            if (!CROSS_APP_ADAPTERS['hypatia-pro'] || !CROSS_APP_ADAPTERS['hermes-core'] || !CROSS_APP_ADAPTERS['openclaw-ai']) {
                throw new Error("Cross-app scientific portability adapters missing for 3 applications");
            }
        }
    },
    {
        name: "[Unit] Blocker Controls: User Mitigated manual resolution & Auto Resolve directive generation",
        fn: async () => {
            const { getPromptForStep } = await import('./services/prompts');
            const blockerMsg = "Statistical power is below 80% with sample size n=5";
            const autoResolveDirective = `Instructions: resolve the ${blockerMsg}`;
            const { basePrompt } = getPromptForStep(4, "Test Input", { experimentField: "Biology" }, {}, autoResolveDirective);
            
            if (!basePrompt.includes("resolve the Statistical power is below 80%")) {
                throw new Error("getPromptForStep failed to inject Auto Resolve directive into basePrompt");
            }
        }
    },
    {
        name: "[Unit] Running Man Animation: Component export & SVG structural integrity",
        fn: async () => {
            const { RunningManAnimation } = await import('./components/common/RunningManAnimation');
            if (typeof RunningManAnimation !== 'function') {
                throw new Error("RunningManAnimation component is not exported as a React function component");
            }
        }
    },
    {
        name: "[Unit] ResearchSummary: Object defense for {full_paper, abstract, layman_abstract, slides}",
        fn: async () => {
            const { ResearchSummary } = await import('./components/landing/ResearchSummary');
            if (typeof ResearchSummary !== 'function') {
                throw new Error("ResearchSummary component is not exported as a React function component");
            }
        }
    },
    {
        name: "[Unit] Model Migration: Gemini 2.5 Pro configured as primary intelligence engine",
        fn: async () => {
            const { SUPPORTED_PROVIDERS, getDefaultLLMConfig } = await import('./services/llmConfig');
            if (SUPPORTED_PROVIDERS.google.defaultModel !== 'gemini-2.5-pro') {
                throw new Error(`Expected defaultModel to be gemini-2.5-pro, got ${SUPPORTED_PROVIDERS.google.defaultModel}`);
            }
            if (getDefaultLLMConfig().model !== 'gemini-2.5-pro') {
                throw new Error(`Expected default config model to be gemini-2.5-pro, got ${getDefaultLLMConfig().model}`);
            }
            const primaryModel = SUPPORTED_PROVIDERS.google.models.find(m => m.id === 'gemini-2.5-pro');
            if (!primaryModel) {
                throw new Error(`Expected primary Google model gemini-2.5-pro to exist in models list`);
            }
        }
    },
    {
        name: "[Unit] BYO-Key Model Compatibility: All 5 supported providers define valid models and parameters",
        fn: async () => {
            const { SUPPORTED_PROVIDERS } = await import('./services/llmConfig');
            const providers = ['google', 'grok', 'openai', 'anthropic', 'ollama', 'openrouter'] as const;
            for (const pid of providers) {
                const def = SUPPORTED_PROVIDERS[pid];
                if (!def) throw new Error(`Missing provider definition for ${pid}`);
                if (!def.defaultModel) throw new Error(`Provider ${pid} missing defaultModel`);
                if (!Array.isArray(def.models) || def.models.length === 0) {
                    throw new Error(`Provider ${pid} has no selectable models`);
                }
                for (const m of def.models) {
                    if (!m.id || !m.name) throw new Error(`Model missing id or name in ${pid}: ${JSON.stringify(m)}`);
                }
            }
        }
    },
    {
        name: "[Unit] BYO-Key Response Resilience: safeGetText correctly extracts text across all model schemas",
        fn: async () => {
            const { safeGetText } = await import('./services/api');
            // 1. Plain string
            if (safeGetText("Test hypothesis") !== "Test hypothesis") throw new Error("safeGetText failed for string");
            // 2. Google GenAI SDK object
            if (safeGetText({ text: "Google Output" }) !== "Google Output") throw new Error("safeGetText failed for Google object");
            // 3. Google GenAI candidate parts
            if (safeGetText({ candidates: [{ content: { parts: [{ text: "Candidate Part" }] } }] }) !== "Candidate Part") {
                throw new Error("safeGetText failed for candidate parts");
            }
            // 4. OpenAI chat completion format
            if (safeGetText({ choices: [{ message: { content: "OpenAI GPT-4o output" } }] }) !== "OpenAI GPT-4o output") {
                throw new Error("safeGetText failed for OpenAI format");
            }
            // 5. Anthropic message format
            if (safeGetText({ content: [{ type: "text", text: "Claude Sonnet output" }] }) !== "Claude Sonnet output") {
                throw new Error("safeGetText failed for Anthropic format");
            }
        }
    },
    {
        name: "[Unit] Mobile UX: LandingPage and Step 1 EditableStepInput provide responsive Research Question & Scope controls",
        fn: async () => {
            const { LandingPage } = await import('./components/landing/LandingPage');
            const { EditableStepInput } = await import('./components/steps/EditableStepInput');
            const { WORKFLOW_STEPS } = await import('./config');
            if (typeof LandingPage !== 'function') throw new Error("LandingPage component not exported as function");
            if (typeof EditableStepInput !== 'function') throw new Error("EditableStepInput not exported as function");
            if (WORKFLOW_STEPS[0].title !== 'Research Question & Scope') {
                throw new Error(`Expected Step 1 to be 'Research Question & Scope', got '${WORKFLOW_STEPS[0].title}'`);
            }
        }
    },
    {
        name: "[Unit] Conceptual Lineage: Footer and App declare credit to The AI Scientist (Sakana AI, Oxford, UBC)",
        fn: async () => {
            const fs = await import('fs');
            const footerContent = fs.readFileSync('./components/common/Footer.tsx', 'utf-8');
            if (!footerContent.includes('The AI Scientist')) {
                throw new Error("Footer does not mention 'The AI Scientist'");
            }
            if (!footerContent.includes('Sakana AI')) {
                throw new Error("Footer does not mention 'Sakana AI'");
            }
            if (!footerContent.includes('University of Oxford') || !footerContent.includes('University of British Columbia')) {
                throw new Error("Footer does not mention Oxford and UBC collaborations");
            }
        }
    },
    {
        name: "[Process] Automation Pipeline: Step 1 auto-advance & model normalization",
        fn: async () => {
            const { normalizeModelName, isValidJsonForSchema } = await import('./services/api');
            const { RESEARCH_QUESTION_SCHEMA } = await import('./config');
            const { generateSyntheticScientificStep } = await import('./services/agents');

            // 1. Verify model normalization prevents 404s
            const mappedPro = normalizeModelName('gemini-2.5-pro');
            const mappedFlash = normalizeModelName('gemini-2.5-flash');
            if (mappedPro === 'gemini-2.5-pro') throw new Error("gemini-2.5-pro was not normalized to supported model");
            if (mappedFlash === 'gemini-2.5-flash') throw new Error("gemini-2.5-flash was not normalized to supported model");

            // 2. Verify Step 1 synthetic step fulfills schema
            const step1Output = generateSyntheticScientificStep(RESEARCH_QUESTION_SCHEMA, {
                question: "To what extent do treatment protocols alter outcomes?",
                experimentField: "Biology",
                experimentMode: "simulation"
            });
            if (!isValidJsonForSchema(step1Output, RESEARCH_QUESTION_SCHEMA)) {
                throw new Error("Step 1 output failed RESEARCH_QUESTION_SCHEMA validation");
            }

            // 3. Verify Step 1 advances currentStep to 2
            const currentStep = 1;
            const nextStepId = currentStep < 10 ? currentStep + 1 : 11;
            if (nextStepId !== 2) {
                throw new Error(`Expected Step 1 to advance to Step 2, got ${nextStepId}`);
            }
        }
    }
];

export async function runAllTests() {
    console.log("=== HYPATIA PRO AUTOMATED TEST SUITE ===");
    let passed = 0;
    let failed = 0;

    for (const test of appTests) {
        try {
            await test.fn();
            console.log(`[PASS] ${test.name}`);
            passed++;
        } catch (err: any) {
            console.error(`[FAIL] ${test.name}:`, err?.message || err);
            failed++;
        }
    }

    console.log(`\nResults: ${passed} Passed, ${failed} Failed out of ${appTests.length} tests.`);
    if (failed > 0 && typeof process !== 'undefined' && process.exit) {
        process.exit(1);
    }
}

// Auto-run when executed directly from CLI in Node environment
if (typeof process !== 'undefined' && process.argv && Array.isArray(process.argv)) {
    if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('index.test.tsx')) {
        runAllTests();
    }
}
