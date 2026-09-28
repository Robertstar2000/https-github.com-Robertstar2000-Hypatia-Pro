
import type { Dispatch, SetStateAction } from 'react';
import { Type } from "@google/genai";

// --- TYPE DEFINITIONS ---
export type StudyType = 'observational' | 'simulation' | 'benchmarking' | 'controlled_experiment' | 'qualitative';

export interface Blocker {
    id: string;
    severity: 'critical' | 'warning';
    msg: string;
    resolved: boolean;
}

export interface AgentLogEntry {
    agent: string;
    message: string;
    timestamp: string;
}

export interface GeneratedImage {
    id: string;
    prompt: string;
    base64Data: string;
    timestamp: string;
}

export interface VisualArtifact {
    id: string;
    title: string;
    type: 'chart' | 'diagram' | 'tree' | 'network' | 'flowchart' | 'infographic' | 'matrix';
    svgContent?: string;
    svgDataUrl?: string;
    description: string;
    stepId: number;
    timestamp?: string;
}

export interface StepData {
    input?: string;
    suggestedInput?: string;
    output?: string;
    summary?: string;
    history?: { timestamp: string; input: string; output: string }[];
    provenance?: { timestamp: string; prompt: string; config: object, output?: string }[];
    uniquenessScore?: number;
    uniquenessJustification?: string;
    studyType?: StudyType;
    groundingMetadata?: any;
    blockers?: Blocker[];
    agentLogs?: AgentLogEntry[];
    images?: GeneratedImage[];
    artifacts?: VisualArtifact[];
    simulationCode?: string;
    reviewedByAgent?: boolean;
    reviewedAt?: string;
}

export interface FineTuneSettings {
    [key: string]: any;
}

export interface Citation {
    id: string;
    title: string;
    authors?: string;
    year?: string;
    url?: string;
    notes?: string;
    tags?: string[];
    createdAt: string;
}

export interface Experiment {
    id: string;
    title: string;
    description: string;
    field: string;
    currentStep: number;
    stepData: { [key: number]: StepData };
    fineTuneSettings: { [key: number]: FineTuneSettings };
    createdAt: string;
    updatedAt?: string;
    labNotebook?: string;
    citations?: Citation[];
    automationMode: 'manual' | 'automated' | null;
    experimentMode: 'simulation' | 'physical' | null;
    status?: 'active' | 'archived';
    studyType?: StudyType;
    executiveSummary?: string;
}

export interface ExperimentContextType {
    experiments: Experiment[];
    activeExperiment: Experiment | null;
    isAuthenticated: boolean;
    createNewExperiment: (title: string, description: string, field: string, experimentMode: 'simulation' | 'physical') => Promise<void>;
    updateExperiment: (updatedExperiment: Experiment) => Promise<Experiment>;
    deleteExperiment: (id: string) => Promise<void>;
    selectExperiment: (id: string) => void;
    setActiveExperiment: Dispatch<SetStateAction<Experiment | null>>;
    importExperiment: (experimentData: Experiment) => Promise<void>;
    handleAuthentication: (type: 'promo' | 'key' | 'demo', value: string) => Promise<void>;
    darkMode: boolean;
    setDarkMode: (value: boolean) => void;
    streamingEnabled: boolean;
    setStreamingEnabled: (value: boolean) => void;
}

export interface ToastContextType {
    addToast: (message: string, type?: 'success' | 'danger' | 'warning' | 'info') => void;
}

export const SCIENTIFIC_FIELDS = [
    "Anthropology", "Archaeology", "Astronomy", "Biochemistry", "Biology", "Chemistry",
    "Cognitive Science", "Computer Science", "Data Science", "Earth Science", "Economics",
    "Education", "Engineering", "Environmental Science", "Genetics", "Humanities",
    "Linguistics", "Materials Science", "Mathematics", "Medicine", "Neuroscience",
    "Philosophy", "Physics", "Political Science", "Psychology", "Robotics", "Social Sciences", "Sociology"
] as const;

// --- WORKFLOW CONFIGURATION ---
export const WORKFLOW_STEPS = [
    { id: 1, title: 'Research Question & Scope', icon: 'bi-question-circle', description: 'Define the research objective, target population, and object type.' },
    { id: 2, title: 'Evidence Discovery', icon: 'bi-journal-text', description: 'Grounded search of literature, prior art, and candidate mechanisms.' },
    { id: 3, title: 'Hypothesis Set', icon: 'bi-lightbulb', description: 'Convert evidence into falsifiable primary and secondary hypotheses.' },
    { id: 4, title: 'Study Design & Protocol', icon: 'bi-diagram-3', description: 'Specify the design class and replicable experimental procedures.' },
    { id: 5, title: 'Analysis Plan (SAP)', icon: 'bi-calendar-event', description: 'Lock down endpoints, preprocessing rules, and statistical tests.' },
    { id: 6, title: 'Data Acquisition', icon: 'bi-play-btn', description: 'Execute collection via upload, manual entry, or agentic simulation.' },
    { id: 7, title: 'Analysis & Visualization', icon: 'bi-graph-up', description: 'Execute the SAP and generate contract-driven visualizations.' },
    { id: 8, title: 'Interpretation & Robustness', icon: 'bi-award', description: 'Assess claims, external validity, and sensitivity to noise.' },
    { id: 9, title: 'Peer Review Simulation', icon: 'bi-people', description: 'Multi-persona adversarial audit to identify logical blockers.' },
    { id: 10, title: 'Publication Bundle', icon: 'bi-file-earmark-medical', description: 'Synthesize the reproducible manuscript and data package.' }
];

// --- AI CONFIGURATION & SCHEMAS ---

export const STEP_SPECIFIC_TUNING_PARAMETERS: { [key: number]: any[] } = {
    1: [
        { name: 'uniquenessStrictness', label: 'Uniqueness Threshold', type: 'range', min: 0, max: 1, step: 0.1, default: 0.5, description: 'How strictly the AI should evaluate and enforce novelty against current scientific literature.' },
        { name: 'scopeFocus', label: 'Scope Focus', type: 'select', options: ['Broad Exploration', 'Niche Specialty', 'Balanced Inquiry'], default: 'Balanced Inquiry', description: 'Sets the focus breadth of the generated scientific question.' },
        { name: 'complexityLevel', label: 'Complexity Level', type: 'select', options: ['Undergraduate', 'Postdoctoral', 'Interdisciplinary Blue-Sky'], default: 'Postdoctoral', description: 'The academic rigor and depth expected of the question.' },
        { name: 'methodologicalBias', label: 'Methodological Bias', type: 'select', options: ['Empirical-Heavy', 'Theoretical-Heavy', 'Computational-heavy', 'Balanced'], default: 'Balanced', description: 'Prefers certain scientific research directions.' }
    ],
    2: [
        { name: 'citationDepth', label: 'Citation Depth', type: 'select', options: ['Classic Seminal Works Only', 'Recent & Modern (Last 5 Years)', 'Comprehensive Historical-to-Modern'], default: 'Comprehensive Historical-to-Modern', description: 'Time range focus of discoverable citations.' },
        { name: 'interdisciplinaryAperture', label: 'Interdisciplinary Aperture', type: 'range', min: 0, max: 1, step: 0.1, default: 0.5, description: 'Tolerance for importing mechanisms from unrelated fields.' },
        { name: 'disputeTolerance', label: 'Dispute Tolerance', type: 'range', min: 0, max: 1, step: 0.1, default: 0.5, description: 'Weight given to academic debates and conflicting studies.' },
        { name: 'sourceDiversity', label: 'Source Diversity', type: 'range', min: 0, max: 1, step: 0.1, default: 0.6, description: 'Rigor across preprints, peer-reviewed journals, and patent databases.' }
    ],
    3: [
        { name: 'creativity', label: 'Creativity (Temperature)', type: 'range', min: 0, max: 1, step: 0.1, default: 0.7, description: 'Controls the novelty and divergence of hypotheses.' },
        { name: 'falsifiabilityBar', label: 'Falsifiability Bar', type: 'select', options: ['Pragmatic & Directly Testable', 'High-Risk High-Reward', 'Extremely Conservative'], default: 'Pragmatic & Directly Testable', description: 'The degree of ease and strictness in experimental falsification.' },
        { name: 'mechanismGranularity', label: 'Mechanism Granularity', type: 'select', options: ['Phenomenological (What)', 'Mechanistic (How)', 'Atomic/Constituent (Why)'], default: 'Mechanistic (How)', description: 'Detail level of physical/logical causal relations.' },
        { name: 'uniquenessTarget', label: 'Uniqueness Target', type: 'range', min: 0, max: 1, step: 0.1, default: 0.8, description: 'Target novelty score against known literature.' }
    ],
    4: [
        { name: 'designClass', label: 'Study Design Class', type: 'select', options: ['Randomized Controlled Trial', 'Double-Blind Parallel Group', 'Cross-Over Design', 'Observational Cohort Study'], default: 'Randomized Controlled Trial', description: 'Primary study design archetype.' },
        { name: 'confoundingControl', label: 'Confounding Control', type: 'select', options: ['Standard Matching', 'Adversarial Propensity Score', 'Maximum Covariate Balancing'], default: 'Standard Matching', description: 'The rigor applied to matching and isolating variables.' },
        { name: 'sampleScaleGuideline', label: 'Sample Sizing Guideline', type: 'select', options: ['Pilot Study (N < 30)', 'Standard Clinical/Lab (N = 100-500)', 'Mega-Cohort (N > 5000)'], default: 'Standard Clinical/Lab (N = 100-500)', description: 'Recommended study scale instructions.' },
        { name: 'treatmentSparsity', label: 'Protocol Sparsity', type: 'range', min: 0, max: 1, step: 0.1, default: 0.7, description: 'Controls minute-by-minute procedure detail level.' }
    ],
    5: [
        { name: 'significanceThreshold', label: 'Significance Criterion', type: 'select', options: ['Alpha = 0.05 (Standard)', 'Alpha = 0.01 (Rigorous)', 'Alpha = 0.001 (Conservative)', 'Bayesian Credible Intervals'], default: 'Alpha = 0.05 (Standard)', description: 'Significance criterion (alpha level) or Bayesian approach.' },
        { name: 'multipleTestingCorrection', label: 'Multiple Testing Correction', type: 'select', options: ['None', 'Bonferroni', 'Benjamini-Hochberg FDR', 'Permutation-based'], default: 'None', description: 'Correction class for multiple comparisons.' },
        { name: 'missingDataStrategy', label: 'Missing Data Strategy', type: 'select', options: ['Listwise Deletion', 'Multiple Imputation (MICE)', 'Last Observation Carried Forward'], default: 'Listwise Deletion', description: 'Handling instructions for null/corrupt entries.' },
        { name: 'outlierThreshold', label: 'Outlier Isolation Threshold', type: 'range', min: 1.5, max: 4.0, step: 0.1, default: 2.5, description: 'Strictness (in IQR) for statistical outlier flagging.' }
    ],
    6: [
        { name: 'noiseLevel', label: 'Synthetic Noise', type: 'range', min: 0, max: 1, step: 0.05, default: 0.15, description: 'Standard deviation of Gaussian noise added to simulated outputs.' },
        { name: 'missingnessProbability', label: 'Missingness Probability', type: 'range', min: 0, max: 0.5, step: 0.05, default: 0.05, description: 'Probability of entries simulating as corrupt or null.' },
        { name: 'effectSizeMultiplier', label: 'Effect Size Multiplier', type: 'range', min: 0.5, max: 2.5, step: 0.1, default: 1.2, description: 'Amplifies or attenuates the hidden experimental signal.' },
        { name: 'anomalyRate', label: 'Anomaly Rate', type: 'range', min: 0, max: 0.2, step: 0.01, default: 0.02, description: 'Rate of extreme sensor error values added to the dataset.' }
    ],
    7: [
        { name: 'chartAesthetic', label: 'Chart Aesthetic', type: 'select', options: ['Minimalist Academic (IEEE)', 'High-Contrast Technical', 'Executive Dashboard', 'Scientific Journal (Nature)'], default: 'Scientific Journal (Nature)', description: 'Plot layouts, styles, and color palette archetype.' },
        { name: 'regressionComplexity', label: 'Regression Complexity', type: 'select', options: ['Linear & Logistic', 'Non-linear & Polynomial', 'Generalized Additive Models (GAMs)', 'Robust Non-Parametric'], default: 'Linear & Logistic', description: 'Mathematical complexity of the fitted model lines.' },
        { name: 'confidenceIntervals', label: 'Confidence Intervals', type: 'select', options: ['Standard 95%', 'Rigorous 99%', 'Robust Bootstrapped'], default: 'Standard 95%', description: 'Width and method of error margin computations.' },
        { name: 'interactionTerms', label: 'Interaction Terms', type: 'select', options: ['No interaction effects', 'Two-way interactions', 'Full interaction hierarchy'], default: 'No interaction effects', description: 'Rigor of modeling interaction terms between variables.' }
    ],
    8: [
        { name: 'skepticismIndex', label: 'Skepticism Index', type: 'range', min: 0, max: 1, step: 0.1, default: 0.5, description: 'Controls how aggressively the AI challenges its own findings.' },
        { name: 'generalizabilityBound', label: 'Generalizability Bound', type: 'select', options: ['Strict Cohort Limitations', 'Moderate Geographic/Domain Generalizability', 'Broad Theoretical Applicability'], default: 'Moderate Geographic/Domain Generalizability', description: 'Strictness in scope limits when extending findings.' },
        { name: 'publicationBiasCorrection', label: 'Publication Bias Correction', type: 'select', options: ['Uncorrected', 'Fail-Safe N Analysis', 'Funnel Plot Trim-and-Fill Simulation'], default: 'Uncorrected', description: 'Funnels bias metrics evaluation methods.' },
        { name: 'causalConfidence', label: 'Causal Confidence', type: 'select', options: ['Strictly Associational', 'Tentative Causal (Directed Graphs)', 'Grounded Counterfactual Inference'], default: 'Strictly Associational', description: 'Confidence stance of correlation vs causation claims.' }
    ],
    9: [
        { name: 'reviewerPersona', label: 'Reviewer Persona', type: 'select', options: ['Methodological Purist', 'Statistical Skeptic', 'Interdisciplinary Generalist', 'Hostile Competitor'], default: 'Methodological Purist', description: 'The philosophical focus lens of the critique.' },
        { name: 'auditRigor', label: 'Audit Rigor', type: 'select', options: ['Standard Editorial Review', 'Sub-disciplinary Deep-Dive', 'Extremely Hostile Pre-Print Audit'], default: 'Standard Editorial Review', description: 'Plausible hostility and critical depth of reviews.' },
        { name: 'focusArea', label: 'Focus Area', type: 'select', options: ['Statistical Appropriateness', 'Novelty & Scope', 'Replicability & Ethics', 'Comprehensive Audit'], default: 'Comprehensive Audit', description: 'Concentrated area of peer review audit.' },
        { name: 'compromiseLevel', label: 'Compromise Level', type: 'range', min: 0, max: 1, step: 0.1, default: 0.5, description: 'Willingness to approve subject to revision.' }
    ],
    10: [
        { name: 'journalStyle', label: 'Journal Style', type: 'select', options: ['Nature/Science (High Impact)', 'IEEE/ACM Transactions', 'PLOS ONE (Comprehensive Open-Access)', 'New England Journal of Medicine'], default: 'Nature/Science (High Impact)', description: 'The formatting target layout style.' },
        { name: 'verbosityLevel', label: 'Verbosity Level', type: 'select', options: ['Concise Letter (Short communication)', 'Standard Article (8-12 pages equivalent)', 'Monograph (Highly exhaustive dissertation)'], default: 'Standard Article (8-12 pages equivalent)', description: 'Drives the physical length and structural detail of the paper.' },
        { name: 'groundingRigor', label: 'Grounding Rigor', type: 'select', options: ['Strict Empirical (Rely purely on current trial data)', 'Synthesized (Highly integrated with literature reviews)'], default: 'Synthesized (Highly integrated with literature reviews)', description: 'Reference/citation grounding rules.' },
        { name: 'citationFormat', label: 'Citation Format', type: 'select', options: ['APA 7th Edition', 'Harvard', 'IEEE Numerical', 'BibTeX/LaTeX style'], default: 'APA 7th Edition', description: 'Style standard for bibliographies.' }
    ]
};

export const RESEARCH_QUESTION_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        research_question: { type: Type.STRING },
        study_type: { type: Type.STRING, enum: ['observational', 'simulation', 'benchmarking', 'controlled_experiment', 'qualitative'] },
        uniqueness_score: { type: Type.NUMBER },
        justification: { type: Type.STRING },
        measurable_outcomes: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["research_question", "study_type", "uniqueness_score", "justification"]
};

export const HYPOTHESIS_TREE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        criteria: {
            type: Type.OBJECT,
            properties: {
                uniqueness: { type: Type.STRING, description: "Criteria for evaluating uniqueness" },
                utility: { type: Type.STRING, description: "Criteria for evaluating utility" },
                falsifiability: { type: Type.STRING, description: "Criteria for evaluating falsifiability" }
            }
        },
        layers: {
            type: Type.ARRAY,
            description: "Exactly 5 layers representing the depth of thought",
            items: {
                type: Type.OBJECT,
                properties: {
                    layer_number: { type: Type.INTEGER },
                    candidates: {
                        type: Type.ARRAY,
                        description: "2 candidates at this layer. 1 selected to continue, 1 pruned.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                hypothesis_draft: { type: Type.STRING },
                                uniqueness_score: { type: Type.NUMBER },
                                utility_score: { type: Type.NUMBER },
                                falsifiability_score: { type: Type.NUMBER },
                                overall_score: { type: Type.NUMBER },
                                pruning_reason: { type: Type.STRING },
                                selected: { type: Type.BOOLEAN }
                            }
                        }
                    }
                }
            }
        },
        final_hypothesis: {
            type: Type.OBJECT,
            properties: {
                null_hypothesis: { type: Type.STRING },
                alternative_hypothesis_1: { type: Type.STRING },
                alternative_hypothesis_2: { type: Type.STRING }
            }
        }
    },
    required: ["criteria", "layers", "final_hypothesis"]
};

export const LITERATURE_REVIEW_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        synthesis_narrative: { type: Type.STRING },
        evidence_gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
        candidate_mechanisms: { type: Type.ARRAY, items: { type: Type.STRING } },
        references: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    authors: { type: Type.ARRAY, items: { type: Type.STRING } },
                    year: { type: Type.STRING },
                    journal: { type: Type.STRING },
                    key_findings: { type: Type.STRING },
                    url: { type: Type.STRING },
                    relevance_score: { type: Type.NUMBER, description: "Score from 0 to 1 indicating relevance to the research question." },
                    rating: { type: Type.STRING, enum: ['Seminal', 'Supporting', 'Contradictory', 'Methodological'], description: "The role of this paper in the review." }
                },
                required: ["title", "authors", "key_findings", "relevance_score"]
            }
        }
    },
    required: ["synthesis_narrative", "evidence_gaps", "references"]
};

// Simplified schema for charts to be robust for LLM generation
export const DATA_ANALYSIS_IMAGE_OUTPUT_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING },
        statistical_outputs: { type: Type.STRING },
        tables: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                    rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
                },
                required: ["title", "headers", "rows"]
            }
        },
        charts: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['bar', 'line', 'scatter', 'pie'] },
                    xAxisKey: { type: Type.STRING, description: "Key in the data object to use for X axis. e.g. 'name'" },
                    yAxisKey: { type: Type.STRING, description: "Key in the data object to use for Y axis. e.g. 'value'" },
                    data: { type: Type.STRING, description: "Stringified JSON array of data objects, e.g. '[{\"name\":\"A\", \"value\": 10}]'" },
                    chartConfig: { type: Type.STRING, description: "Legacy fallback" }
                },
                required: ["title", "type", "data"]
            }
        }
    },
    required: ["summary", "charts"]
};

export const DATA_QA_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        is_valid: { type: Type.BOOLEAN },
        quality_score: { type: Type.NUMBER },
        issues: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendation: { type: Type.STRING }
    },
    required: ["is_valid", "quality_score", "issues"]
};

export const DYNAMIC_TABLE_SCHEMA = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            columnName: { type: Type.STRING },
            dataType: { type: Type.STRING, enum: ['string', 'number', 'boolean', 'date'] },
            description: { type: Type.STRING }
        },
        required: ["columnName", "dataType"]
    }
};
