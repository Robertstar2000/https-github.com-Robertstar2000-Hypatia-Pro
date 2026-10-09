/**
 * Scientific Discovery Harnesses, Paired Deliverables, and Epistemic Specialists
 * Centered purely on Scientific Ideation, Hypothesis Exploration,
 * Protocol Methodology, In-Silico Simulations, and Evidence Synthesis.
 */

export type HarnessType = 
  | 'hypothesis_causal_inference'
  | 'experimental_protocol_design'
  | 'insilico_simulation_modeling'
  | 'statistical_evidence_synthesis'
  | 'manuscript_dossier_authoring';

export interface ScientificHandoffPackage {
  id: string;
  sourceHarness: HarnessType;
  targetHarness: HarnessType;
  title: string;
  approvedScientificDeliverables: string[];
  assumptions: string[];
  confoundingVariables: string[];
  groundTruthGatePassed: boolean;
  humanSignoff: {
    signedBy: string;
    signedAt: string;
    role: string;
  };
  feedbackLoopActive: boolean;
  feedbackNotes?: string;
}

export interface ExperimentalCohortSpec {
  cohortId: string;
  name: string;
  sampleSize: number;
  treatmentDose: string;
  controlType: 'negative_vehicle' | 'positive_reference' | 'active_treatment' | 'sham_control';
  blindingStrategy: 'double_blind' | 'single_blind_analyst' | 'open_label';
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  biologicalReplicates: number;
  technicalReplicates: number;
}

export interface InSilicoSimulationModel {
  modelId: string;
  name: string;
  mathematicalFramework: 'stochastic_monte_carlo' | 'ode_kinetic_system' | 'agent_based_spatial' | 'bayesian_hierarchical';
  parameters: {
    name: string;
    nominal: number;
    distribution: 'gaussian' | 'uniform' | 'log_normal';
    unit: string;
    range: [number, number];
  }[];
  iterationTrials: number;
  convergencePValue: number;
  confidenceIntervalPct: number;
  outputMetrics: { name: string; value: number; unit: string; stdDev: number }[];
}

export interface ScientificWorkPackage {
  id: string;
  phaseCode: string;
  title: string;
  scientificDeliverable: string;
  leadSpecialist: string;
  estimatedEffortDays: number;
  dependencies: string[];
  epistemicMilestone: boolean;
  status: 'planned' | 'in_progress' | 'peer_verified' | 'refining';
}

export interface DocumentSectionOutline {
  sectionNumber: string;
  title: string;
  targetWordCount: number;
  purpose: string;
  retrievedMemoryIds: string[];
  status: 'approved_outline' | 'drafted' | 'reconciled' | 'peer_reviewed';
  contentSnippet: string;
}

export interface SpecializedAgentRole {
  roleId: string;
  name: string;
  category: 'ideation' | 'methodology' | 'modeling' | 'analysis' | 'epistemic_control';
  purpose: string;
  permittedTools: string[];
  budgetLimits: {
    maxTokens: number;
    maxIterations: number;
    runtimeTimeoutSec: number;
  };
  deliverablesRequired: string[];
  stoppingConditions: string[];
}

// Pure Scientific Specialists Roster
export const SPECIALIZED_AGENT_ROSTER: SpecializedAgentRole[] = [
  // Ideation Specialists
  {
    roleId: 'sci-lit-researcher',
    name: 'Literature Researcher & Grounding Specialist',
    category: 'ideation',
    purpose: 'Systematically searches peer-reviewed corpora, extracts prior empirical baselines, and pinpoints theoretical research gaps.',
    permittedTools: ['googleSearch', 'doiResolver', 'semanticCitationValidator'],
    budgetLimits: { maxTokens: 4096, maxIterations: 5, runtimeTimeoutSec: 60 },
    deliverablesRequired: ['Structured Literature Matrix', 'Contradictory Findings Audit', 'DOI Bibliography'],
    stoppingConditions: ['Literature saturation reached (3 consecutive queries return no novel citations)']
  },
  {
    roleId: 'sci-hyp-causal',
    name: 'Hypothesis & Causal Inference Specialist',
    category: 'ideation',
    purpose: 'Formulates alternative (H1) and null (H0) causal mechanisms, constructs 5-layer Tree-of-Thought branches, and defines formal falsification boundaries.',
    permittedTools: ['falsifiabilityChecker', 'causalDAGBuilder', 'treeOfThoughtSolver'],
    budgetLimits: { maxTokens: 8192, maxIterations: 8, runtimeTimeoutSec: 120 },
    deliverablesRequired: ['Alternative Hypothesis H1', 'Null Hypothesis H0', 'Formal Falsification Thresholds'],
    stoppingConditions: ['All candidate branches evaluated with unambiguous falsification threshold']
  },
  {
    roleId: 'sci-domain-theorist',
    name: 'Theoretical Domain Modelist',
    category: 'ideation',
    purpose: 'Grounds proposed hypotheses in first-principles biological, physical, or chemical mechanisms, identifying underlying biochemical pathways.',
    permittedTools: ['pathwayVisualizer', 'stoichiometryEngine', 'firstPrinciplesChecker'],
    budgetLimits: { maxTokens: 6144, maxIterations: 6, runtimeTimeoutSec: 90 },
    deliverablesRequired: ['Biochemical Pathway Schema', 'Mechanism of Action Narrative'],
    stoppingConditions: ['Pathway consistency verified against established thermodynamic and biological constraints']
  },

  // Methodology Specialists
  {
    roleId: 'sci-protocol-designer',
    name: 'Experimental Protocol Designer',
    category: 'methodology',
    purpose: 'Architects rigorous, replicable study protocols adhering to STROBE and CONSORT guidelines with randomized cohorts, sham controls, and blinded treatments.',
    permittedTools: ['strobeChecklist', 'powerCalculator', 'controlGroupValidator'],
    budgetLimits: { maxTokens: 6144, maxIterations: 6, runtimeTimeoutSec: 90 },
    deliverablesRequired: ['Study Design Protocol Bundle', 'Variable Operationalization Table', 'Blinding Protocol'],
    stoppingConditions: ['Protocol approved by ethics and methodology gates']
  },
  {
    roleId: 'sci-sampling-strategist',
    name: 'Sampling & Cohort Strategist',
    category: 'methodology',
    purpose: 'Computes statistical power, minimum detectable effect sizes (MDES), and stratifies cohorts to eliminate confounding demographic or environmental variance.',
    permittedTools: ['powerCalculator', 'cohensDEstimator', 'stratifiedSampler'],
    budgetLimits: { maxTokens: 4096, maxIterations: 4, runtimeTimeoutSec: 60 },
    deliverablesRequired: ['Sample Size Justification', 'Stratification Balance Table'],
    stoppingConditions: ['Statistical power >= 80% achieved at alpha = 0.05']
  },

  // Modeling & In-Silico Simulation Specialists
  {
    roleId: 'sci-sim-coder',
    name: 'In-Silico Simulation & Web Worker Modeler',
    category: 'modeling',
    purpose: 'Builds and executes sandboxed Web Worker Monte Carlo simulations and ODE kinetic systems to explore parameter sensitivity before physical or empirical trials.',
    permittedTools: ['webWorkerSandbox', 'monteCarloEngine', 'astParser'],
    budgetLimits: { maxTokens: 6144, maxIterations: 20, runtimeTimeoutSec: 180 },
    deliverablesRequired: ['Executable Simulation Worker Code', 'Synthetic Simulation CSV Dataset'],
    stoppingConditions: ['Valid dataset generated with zero NaN values and statistical convergence achieved']
  },
  {
    roleId: 'sci-sensitivity-analyst',
    name: 'Sensitivity & Perturbation Analyst',
    category: 'modeling',
    purpose: 'Systematically perturbs model parameters to generate tornado sensitivity curves and identify critical tipping points or instability domains.',
    permittedTools: ['parameterPerturber', 'tornadoPlotGenerator', 'sobolIndicesCalculator'],
    budgetLimits: { maxTokens: 4096, maxIterations: 5, runtimeTimeoutSec: 60 },
    deliverablesRequired: ['Parameter Sensitivity Ranking', 'Tipping Point Analysis'],
    stoppingConditions: ['Full parameter space explored within +/- 30% range of nominal']
  },

  // Analysis Specialists
  {
    roleId: 'sci-statistician',
    name: 'Principal Biostatistician',
    category: 'analysis',
    purpose: 'Executes the pre-registered Statistical Analysis Plan (SAP): evaluates normality, performs ANOVA / regression, computes effect sizes, and validates p-values.',
    permittedTools: ['statsEngine', 'normalityTester', 'chartJsConfigValidator'],
    budgetLimits: { maxTokens: 6144, maxIterations: 6, runtimeTimeoutSec: 90 },
    deliverablesRequired: ['Inferential Stats Summary', 'Assumption Diagnostics Report', 'Interactive Data Visualizations'],
    stoppingConditions: ['All pre-registered SAP tests evaluated with p-values and confidence intervals']
  },
  {
    roleId: 'sci-manuscript-author',
    name: 'Scientific Manuscript Author',
    category: 'analysis',
    purpose: 'Drafts academic publication sections, synthesizes tabular findings into standard academic prose, and compiles publication-ready LaTeX / PDF packages.',
    permittedTools: ['latexCompiler', 'apaFormatter', 'citationReconciler'],
    budgetLimits: { maxTokens: 8192, maxIterations: 8, runtimeTimeoutSec: 120 },
    deliverablesRequired: ['Peer-Reviewed Style Manuscript', 'Figure Captions', 'Replication Data Descriptor'],
    stoppingConditions: ['Complete manuscript drafted with 100% citation and memory cross-references verified']
  },

  // Epistemic Control Roles
  {
    roleId: 'ctrl-ground-truth',
    name: 'Ground Truth Gatekeeper',
    category: 'epistemic_control',
    purpose: 'Independent gatekeeper preventing advancement across research phases unless all pre-registered verification criteria and empirical thresholds pass.',
    permittedTools: ['acceptanceCriteriaAuditor', 'artifactIntegrityVerifier', 'evidenceClassAuditor'],
    budgetLimits: { maxTokens: 4096, maxIterations: 3, runtimeTimeoutSec: 60 },
    deliverablesRequired: ['Phase Gate Audit Certification', 'Gate Blocker Notice (if rejected)'],
    stoppingConditions: ['Phase transition verified or honest blocked state formally triggered']
  },
  {
    roleId: 'ctrl-ethics-human',
    name: 'Bioethics & Human Authority Reviewer',
    category: 'epistemic_control',
    purpose: 'Enforces human PI oversight on study boundaries, safety considerations, and consequential research decisions.',
    permittedTools: ['regulatoryComplianceChecker', 'humanApprovalPromptGate', 'ethicsGuardrailEnforcer'],
    budgetLimits: { maxTokens: 4096, maxIterations: 3, runtimeTimeoutSec: 60 },
    deliverablesRequired: ['Ethics Review Summary', 'Human PI Signature Package'],
    stoppingConditions: ['Explicit human confirmation token registered in durable audit log']
  },
  {
    roleId: 'ctrl-reproducibility',
    name: 'Open Science & Reproducibility Steward',
    category: 'epistemic_control',
    purpose: 'Generates OSF pre-registration bundles, computes Replicability Scorecards, and verifies FAIR data principles.',
    permittedTools: ['osfBundlePacker', 'fairChecklistEvaluator', 'provenanceHashGenerator'],
    budgetLimits: { maxTokens: 4096, maxIterations: 4, runtimeTimeoutSec: 60 },
    deliverablesRequired: ['OSF Pre-registration Snapshot', 'FAIR Data Assessment', 'Integrity Checksums'],
    stoppingConditions: ['All research artifacts cryptographically sealed with verifiable seeds and timestamps']
  }
];

// Sample Scientific Cohort Protocol Matrix
export const SAMPLE_EXPERIMENTAL_COHORTS: ExperimentalCohortSpec[] = [
  {
    cohortId: 'COH-CTRL-01',
    name: 'Vehicle Control Cohort (0.0 mM Caffeine)',
    sampleSize: 12,
    treatmentDose: '0.0 mM (Distilled H2O + 0.1% DMSO vehicle)',
    controlType: 'negative_vehicle',
    blindingStrategy: 'double_blind',
    inclusionCriteria: ['Uniform germination at 22C', 'Root radicle emergence >= 2.0 mm', 'Col-0 wild type Arabidopsis'],
    exclusionCriteria: ['Abnormal seedling morphology', 'Microbial contamination'],
    biologicalReplicates: 3,
    technicalReplicates: 4
  },
  {
    cohortId: 'COH-DOSE-01',
    name: 'Low-Dose Exploration Cohort (1.0 mM Caffeine)',
    sampleSize: 12,
    treatmentDose: '1.0 mM Exogenous Caffeine in MS Growth Medium',
    controlType: 'active_treatment',
    blindingStrategy: 'double_blind',
    inclusionCriteria: ['Uniform germination at 22C', 'Root radicle emergence >= 2.0 mm', 'Col-0 wild type Arabidopsis'],
    exclusionCriteria: ['Abnormal seedling morphology', 'Microbial contamination'],
    biologicalReplicates: 3,
    technicalReplicates: 4
  },
  {
    cohortId: 'COH-DOSE-02',
    name: 'Hypothesized Threshold Cohort (2.5 mM Caffeine)',
    sampleSize: 12,
    treatmentDose: '2.5 mM Exogenous Caffeine in MS Growth Medium',
    controlType: 'active_treatment',
    blindingStrategy: 'double_blind',
    inclusionCriteria: ['Uniform germination at 22C', 'Root radicle emergence >= 2.0 mm', 'Col-0 wild type Arabidopsis'],
    exclusionCriteria: ['Abnormal seedling morphology', 'Microbial contamination'],
    biologicalReplicates: 3,
    technicalReplicates: 4
  },
  {
    cohortId: 'COH-DOSE-03',
    name: 'High-Dose Saturation Cohort (5.0 mM Caffeine)',
    sampleSize: 12,
    treatmentDose: '5.0 mM Exogenous Caffeine in MS Growth Medium',
    controlType: 'active_treatment',
    blindingStrategy: 'double_blind',
    inclusionCriteria: ['Uniform germination at 22C', 'Root radicle emergence >= 2.0 mm', 'Col-0 wild type Arabidopsis'],
    exclusionCriteria: ['Abnormal seedling morphology', 'Microbial contamination'],
    biologicalReplicates: 3,
    technicalReplicates: 4
  }
];

// Sample In-Silico Kinetic Simulation Model
export const SAMPLE_INSILICO_MODEL: InSilicoSimulationModel = {
  modelId: 'SIM-KIN-001',
  name: 'Meristematic Mitotic Spindle Elongation Stochastic Model',
  mathematicalFramework: 'stochastic_monte_carlo',
  parameters: [
    { name: 'Basal Elongation Velocity (v0)', nominal: 18.5, distribution: 'gaussian', unit: 'um/hr', range: [14.0, 22.0] },
    { name: 'Inhibition Constant (Ki)', nominal: 2.35, distribution: 'log_normal', unit: 'mM', range: [1.8, 3.2] },
    { name: 'Hill Cooperativity Coefficient (n)', nominal: 1.85, distribution: 'gaussian', unit: 'dimensionless', range: [1.4, 2.2] },
    { name: 'Intracellular Clearance Half-life (t1/2)', nominal: 6.2, distribution: 'uniform', unit: 'hours', range: [4.0, 8.5] }
  ],
  iterationTrials: 10000,
  convergencePValue: 0.0018,
  confidenceIntervalPct: 95.0,
  outputMetrics: [
    { name: 'Simulated Elongation Reduction at 2.5mM', value: 37.4, unit: '%', stdDev: 3.1 },
    { name: 'Simulated Threshold Onset Concentration', value: 2.42, unit: 'mM', stdDev: 0.18 },
    { name: 'Model R-Squared vs Empirical Assay', value: 0.962, unit: 'r2', stdDev: 0.015 }
  ]
};

// Sample Scientific Investigation Work Packages
export const SAMPLE_SCIENTIFIC_WORK_PACKAGES: ScientificWorkPackage[] = [
  {
    id: 'sci-pkg-1',
    phaseCode: 'Phase 1-3',
    title: 'Theoretical Framework & Hypothesis Pre-Registration',
    scientificDeliverable: 'Falsifiable Hypothesis H1, Causal DAG, and OSF Pre-registration Protocol',
    leadSpecialist: 'Principal Investigator & Hypothesis Specialist',
    estimatedEffortDays: 4,
    dependencies: [],
    epistemicMilestone: true,
    status: 'peer_verified'
  },
  {
    id: 'sci-pkg-2',
    phaseCode: 'Phase 4-5',
    title: 'Controlled Cohort Protocol & Power Sizing',
    scientificDeliverable: 'Double-Blind Randomization Matrix & Statistical Power Analysis (N=48, Power=0.91)',
    leadSpecialist: 'Experimental Protocol Designer & Sampling Strategist',
    estimatedEffortDays: 5,
    dependencies: ['sci-pkg-1'],
    epistemicMilestone: true,
    status: 'peer_verified'
  },
  {
    id: 'sci-pkg-3',
    phaseCode: 'Phase 6',
    title: 'In-Silico Monte Carlo Simulation & Assay Data Collection',
    scientificDeliverable: '10,000 Trial Kinetic Simulation Dataset & 48-Culture Spectrophotometric Assay Readings',
    leadSpecialist: 'In-Silico Simulation Modeler & Experiment Runner',
    estimatedEffortDays: 6,
    dependencies: ['sci-pkg-2'],
    epistemicMilestone: false,
    status: 'in_progress'
  },
  {
    id: 'sci-pkg-4',
    phaseCode: 'Phase 7-8',
    title: 'Inferential Biostatistics & Hypothesis Testing',
    scientificDeliverable: 'Two-Way ANOVA, Tukey HSD Post-Hoc Tests, Effect Sizes, and Distribution Visualizations',
    leadSpecialist: 'Principal Biostatistician',
    estimatedEffortDays: 4,
    dependencies: ['sci-pkg-3'],
    epistemicMilestone: true,
    status: 'planned'
  },
  {
    id: 'sci-pkg-5',
    phaseCode: 'Phase 9-10',
    title: 'Virtual Peer Review & Academic Manuscript Publication',
    scientificDeliverable: 'Adversarial Critique Audit, LaTeX Manuscript, FAIR Data Archive & OSF Publication',
    leadSpecialist: 'Scientific Manuscript Author & Open Science Steward',
    estimatedEffortDays: 4,
    dependencies: ['sci-pkg-4'],
    epistemicMilestone: true,
    status: 'planned'
  }
];

// Document Construction Outline
export const SAMPLE_DOCUMENT_OUTLINE: DocumentSectionOutline[] = [
  {
    sectionNumber: '1.0',
    title: 'Introduction & Theoretical Framework',
    targetWordCount: 850,
    purpose: 'Exposes foundational plant physiology, phosphodiesterase biochemical pathways, and establishes the research inquiry.',
    retrievedMemoryIds: ['HYP-001', 'CIT-401'],
    status: 'reconciled',
    contentSnippet: 'Exogenous chemical perturbations within plant meristems offer an empirical window into mitotic cell division dynamics and cellular signaling cascades...'
  },
  {
    sectionNumber: '2.0',
    title: 'Materials, Methods & Pre-registered Cohort Design',
    targetWordCount: 1100,
    purpose: 'Details randomized block design, double-blind vehicle control groups, and spectrophotometric micro-plate measurement protocols.',
    retrievedMemoryIds: ['MET-201', 'CLM-101'],
    status: 'drafted',
    contentSnippet: 'Arabidopsis thaliana (Col-0) seedlings were cultivated in stratified micro-well culture plates across five pre-registered concentration cohorts...'
  },
  {
    sectionNumber: '3.0',
    title: 'In-Silico Simulation & Empirical Results',
    targetWordCount: 1200,
    purpose: 'Reports 10,000-trial Monte Carlo kinetic curves alongside 48 observed biological culture measurements.',
    retrievedMemoryIds: ['EVD-001', 'EVD-002', 'TST-301'],
    status: 'drafted',
    contentSnippet: 'Analysis of 48 cultures across five concentration gradients revealed a statistically significant reduction in root apical elongation rate (p=0.0024)...'
  },
  {
    sectionNumber: '4.0',
    title: 'Virtual Peer Review, Epistemic Skepticism & Discussion',
    targetWordCount: 750,
    purpose: 'Addresses adversarial critique from methodologists, analyzes osmolarity confounding variables, and outlines reproducibility guarantees.',
    retrievedMemoryIds: ['RSK-501'],
    status: 'approved_outline',
    contentSnippet: 'Adversarial reviewers highlighted the necessity of isolating thermal and osmotic variables from biochemical kinase inhibition...'
  }
];

// Cross-App Portability Adapters for Research Platforms
export interface CrossAppAdapter {
  appId: 'hypatia-pro' | 'hermes-core' | 'openclaw-ai';
  appName: string;
  protocolVersion: string;
  entitlementProductId: string;
  supportedHarnesses: HarnessType[];
  validatePayload: (payload: any) => { valid: boolean; errors: string[] };
  transformForTarget: (payload: any, targetAppId: string) => any;
}

export const CROSS_APP_ADAPTERS: Record<string, CrossAppAdapter> = {
  'hypatia-pro': {
    appId: 'hypatia-pro',
    appName: 'Project Hypatia Pro (Scientific Workbench)',
    protocolVersion: '2.5.0-SCI',
    entitlementProductId: 'hypatia-pro',
    supportedHarnesses: [
      'hypothesis_causal_inference',
      'experimental_protocol_design',
      'insilico_simulation_modeling',
      'statistical_evidence_synthesis',
      'manuscript_dossier_authoring'
    ],
    validatePayload: (p: any) => ({
      valid: Boolean(p && (p.title || p.nodes || p.cohorts || p.hypothesis)),
      errors: p ? [] : ['Scientific payload cannot be empty']
    }),
    transformForTarget: (p: any, target: string) => ({
      origin: 'hypatia-pro',
      target,
      exportedAt: new Date().toISOString(),
      scientificContent: p
    })
  },
  'hermes-core': {
    appId: 'hermes-core',
    appName: 'Hermes Research Agent Runtime',
    protocolVersion: '2.1.0-HERMES',
    entitlementProductId: 'hermes-core',
    supportedHarnesses: [
      'hypothesis_causal_inference',
      'experimental_protocol_design',
      'statistical_evidence_synthesis'
    ],
    validatePayload: (p: any) => ({
      valid: Boolean(p && p.scientificContent),
      errors: p ? [] : ['Missing Hermes scientific task specification']
    }),
    transformForTarget: (p: any, target: string) => ({
      origin: 'hermes-core',
      target,
      hermesTaskId: `sci_task_${Date.now()}`,
      scientificContent: p
    })
  },
  'openclaw-ai': {
    appId: 'openclaw-ai',
    appName: 'OpenClaw Multi-Agent Science Engine',
    protocolVersion: '3.0.0-OC',
    entitlementProductId: 'openclaw-ai',
    supportedHarnesses: [
      'insilico_simulation_modeling',
      'statistical_evidence_synthesis',
      'manuscript_dossier_authoring'
    ],
    validatePayload: (p: any) => ({
      valid: Boolean(p),
      errors: []
    }),
    transformForTarget: (p: any, target: string) => ({
      origin: 'openclaw-ai',
      target,
      clawAgentEnvelope: true,
      scientificContent: p
    })
  }
};
