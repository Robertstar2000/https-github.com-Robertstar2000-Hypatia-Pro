/**
 * Structured Scientific Reasoning, Methodology Trade Studies & Virtual Challenges
 * Evaluates alternative scientific methodologies, competing causal hypotheses,
 * 5-layer Tree-of-Thoughts, and adversarial peer review challenge panels.
 */

export interface CompetingHypothesis {
  id: string;
  code: string; // H1, H2, H0
  claim: string;
  supportingEvidenceIds: string[];
  falsifyingEvidenceIds: string[];
  noveltyScore: number;
  falsifiabilityScore: number;
  epistemicConfidence: number;
  status: 'leading' | 'contender' | 'rejected' | 'baseline_null';
  falsificationCondition: string;
}

export interface MethodologyTradeCriterion {
  id: string;
  name: string;
  weight: number;
  description?: string;
  unit?: string;
  direction: 'higher_is_better' | 'lower_is_better';
}

export interface MethodologyCandidate {
  id: string;
  name: string;
  technique: string;
  isBaseline: boolean;
  scores: Record<string, number>;
  notes: string;
  signalToNoiseRatio: string;
  temporalResolution: string;
}

export interface MethodologyTradeStudy {
  id: string;
  title: string;
  problemStatement: string;
  criteria: MethodologyTradeCriterion[];
  candidates: MethodologyCandidate[];
  selectedCandidateId: string;
  dissentLog: {
    reviewerRole: string;
    objectedCandidateId: string;
    objectionReason: string;
    residualRiskAccepted: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface BoundaryFailureCase {
  id: string;
  parameterName: string;
  nominalValue: number;
  stressValue: number;
  unit: string;
  biologicalFailureMode: string;
  mitigationStrategy: string;
  testOutcome: 'passed_safe' | 'graceful_degradation' | 'catastrophic_blocked';
}

export interface ChallengePanelReviewer {
  id: string;
  personaName: string;
  archetype: 'methodological_purist' | 'statistical_skeptic' | 'domain_adversary' | 'bioethics_compliance_officer';
  critiqueText: string;
  rating: number;
  blockersRaised: {
    id: string;
    severity: 'critical' | 'warning';
    msg: string;
    resolved: boolean;
  }[];
}

// Competing Scientific Hypotheses
export const SAMPLE_COMPETING_HYPOTHESES: CompetingHypothesis[] = [
  {
    id: 'hyp-h1',
    code: 'H1',
    claim: 'Caffeine inhibits apical root meristem elongation through competitive inhibition of intracellular phosphodiesterase enzymes, elevating cellular cAMP levels.',
    supportingEvidenceIds: ['EVD-001', 'EVD-002'],
    falsifyingEvidenceIds: [],
    noveltyScore: 0.88,
    falsifiabilityScore: 0.94,
    epistemicConfidence: 0.90,
    status: 'leading',
    falsificationCondition: 'Root mitotic elongation remains unaffected at [Caffeine] > 2.5 mM despite verified phosphodiesterase blockade.'
  },
  {
    id: 'hyp-h2',
    code: 'H2',
    claim: 'Caffeine acts via direct physical destabilization of cortical microtubules, disrupting orientation of cellulose microfibril deposition.',
    supportingEvidenceIds: [],
    falsifyingEvidenceIds: ['EVD-001'],
    noveltyScore: 0.72,
    falsifiabilityScore: 0.86,
    epistemicConfidence: 0.38,
    status: 'contender',
    falsificationCondition: 'Confocal microscopy shows normal cortical microtubule alignment in mitotic-arrested cells.'
  },
  {
    id: 'hyp-h0',
    code: 'H0',
    claim: 'Exogenous caffeine concentration exerts no statistically distinguishable influence on root meristem mitotic elongation rates (Null Hypothesis).',
    supportingEvidenceIds: [],
    falsifyingEvidenceIds: ['EVD-001', 'EVD-002'],
    noveltyScore: 0.10,
    falsifiabilityScore: 0.99,
    epistemicConfidence: 0.04,
    status: 'rejected',
    falsificationCondition: 'P-value < 0.05 in two-sample t-test comparing treated vs untreated cohorts.'
  }
];

// Scientific Methodology & Assay Selection Trade Study
export const SAMPLE_TRADE_STUDY: MethodologyTradeStudy = {
  id: 'ts-sci-001',
  title: 'Assay Protocol & Mitotic Detection Methodology Trade Study',
  problemStatement: 'Evaluate alternative experimental detection techniques for quantifying plant meristematic cell division kinetics against sensitivity, temporal resolution, sample throughput, and live-cell viability.',
  criteria: [
    { id: 'crit-sens', name: 'Detection Sensitivity & Limit of Detection (LOD)', weight: 5, direction: 'higher_is_better' },
    { id: 'crit-temp-res', name: 'Temporal Kinetic Resolution (< 30 min intervals)', weight: 4, direction: 'higher_is_better' },
    { id: 'crit-viability', name: 'Preservation of Live-Cell Seedling Viability', weight: 5, direction: 'higher_is_better' },
    { id: 'crit-throughput', name: 'Sample Throughput (>= 48 replicates/run)', weight: 4, direction: 'higher_is_better' },
    { id: 'crit-perturbation', name: 'Minimal Photo-toxicity & Photobleaching', weight: 3, direction: 'higher_is_better' }
  ],
  candidates: [
    {
      id: 'cand-spectrophotometric-plate',
      name: 'Automated Micro-Plate Spectrophotometric Kinetic Assay (Proposed Baseline)',
      technique: 'Continuous Absorbance & Turbidimetric Optical Density',
      isBaseline: true,
      scores: {
        'crit-sens': 4,
        'crit-temp-res': 5,
        'crit-viability': 5,
        'crit-throughput': 5,
        'crit-perturbation': 5
      },
      notes: 'Exceptional 96-well throughput, zero photobleaching, continuous 72-hour kinetics without phototoxic disruption.',
      signalToNoiseRatio: '32 dB',
      temporalResolution: '15 min sampling'
    },
    {
      id: 'cand-confocal-timelapse',
      name: 'High-Resolution Confocal Laser Scanning Time-Lapse',
      technique: 'Fluorescent GFP-Tubulin Direct Visualization',
      isBaseline: false,
      scores: {
        'crit-sens': 5,
        'crit-temp-res': 4,
        'crit-viability': 3, // Risk of phototoxicity over long runs
        'crit-throughput': 2, // Low throughput (1-3 specimens at a time)
        'crit-perturbation': 2
      },
      notes: 'Unmatched subcellular resolution of microtubules, but severe sample throughput limitations and potential laser phototoxicity over 72 hours.',
      signalToNoiseRatio: '45 dB',
      temporalResolution: '2 min sampling'
    },
    {
      id: 'cand-flow-cytometry',
      name: 'Propidium Iodide Flow Cytometric Cell-Cycle Profiling',
      technique: 'Fluorescence-Activated Cell Sorting (FACS)',
      isBaseline: false,
      scores: {
        'crit-sens': 4,
        'crit-temp-res': 2, // Destructive endpoint sampling
        'crit-viability': 1, // Requires destructive protoplast isolation
        'crit-throughput': 4,
        'crit-perturbation': 4
      },
      notes: 'Accurate quantitative G1/S/G2-M phase fractions, but destructive endpoint requires sacrificing plants at each timepoint.',
      signalToNoiseRatio: '38 dB',
      temporalResolution: 'Endpoint only'
    }
  ],
  selectedCandidateId: 'cand-spectrophotometric-plate',
  dissentLog: [
    {
      reviewerRole: 'Cellular Microscopy Specialist',
      objectedCandidateId: 'cand-spectrophotometric-plate',
      objectionReason: 'Turbidimetric assays measure bulk root extension rather than direct counting of individual mitotic metaphase plates.',
      residualRiskAccepted: true
    }
  ],
  createdAt: '2026-09-29T10:00:00Z',
  updatedAt: '2026-09-29T14:00:00Z'
};

// Scientific Boundary & Stress Cases
export const SAMPLE_FAILURE_CASES: BoundaryFailureCase[] = [
  {
    id: 'sfc-01',
    parameterName: 'Ambient Incubator Temperature',
    nominalValue: 22.0,
    stressValue: 36.5,
    unit: 'deg C',
    biologicalFailureMode: 'Thermal shock activates heat shock protein (HSP90) transcription, conflating heat arrest with kinase inhibition.',
    mitigationStrategy: 'Incubator thermal alarm threshold set at +/- 0.5C with automated run abort if temperature breaches 24.5C.',
    testOutcome: 'passed_safe'
  },
  {
    id: 'sfc-02',
    parameterName: 'Growth Medium Osmolarity',
    nominalValue: 120.0,
    stressValue: 380.0,
    unit: 'mOsm/kg',
    biologicalFailureMode: 'Hyperosmotic shock induces root plasmolyzation, halting cellular turgor-driven elongation independent of chemical treatment.',
    mitigationStrategy: 'Sealed humidity chamber (90% RH) prevents micro-well evaporative water loss during 72-hour assay.',
    testOutcome: 'passed_safe'
  },
  {
    id: 'sfc-03',
    parameterName: 'Solvent Vehicle Concentration (DMSO)',
    nominalValue: 0.1,
    stressValue: 1.5,
    unit: '% v/v',
    biologicalFailureMode: 'High DMSO concentrations permeabilize plant plasma membranes, causing non-specific cytotoxicity.',
    mitigationStrategy: 'Hard ceiling clamp restricting vehicle concentration to strictly <= 0.1% across all dosing preparations.',
    testOutcome: 'passed_safe'
  }
];

// Diverse Virtual Challenge Panel
export const SAMPLE_CHALLENGE_PANEL: ChallengePanelReviewer[] = [
  {
    id: 'rev-01',
    personaName: 'Prof. Evelyn Cross (Methodological Purist)',
    archetype: 'methodological_purist',
    rating: 8.8,
    critiqueText: 'The pre-registered randomized block design and vehicle-controlled cohorts are exemplary. Ensure edge-well micro-plate positions are randomized to eliminate localized evaporative artifacts.',
    blockersRaised: [
      {
        id: 'blk-rev-01',
        severity: 'warning',
        msg: 'Micro-plate perimeter wells must be filled with sterile water to buffer humidity and prevent edge-effect bias.',
        resolved: true
      }
    ]
  },
  {
    id: 'rev-02',
    personaName: 'Dr. Marcus Vance (Statistical Skeptic)',
    archetype: 'statistical_skeptic',
    rating: 9.2,
    critiqueText: 'Two-way ANOVA results yield p=0.0024 with Tukey HSD post-hoc test confirming significance between 1.0 mM and 2.5 mM cohorts. Normality diagnostics (Shapiro-Wilk W=0.97, p=0.41) confirm Gaussian distribution.',
    blockersRaised: []
  },
  {
    id: 'rev-03',
    personaName: 'Dr. Sarah Lin (Bioethics & Open Science Steward)',
    archetype: 'bioethics_compliance_officer',
    rating: 9.6,
    critiqueText: 'Botanical research involving Arabidopsis thaliana requires no vertebrate animal committee approval. All empirical datasets conform to FAIR open science data standards.',
    blockersRaised: []
  }
];

/**
 * Calculates weighted scores for methodology trade study candidates
 */
export function calculatePughScores(tradeStudy: MethodologyTradeStudy): Record<string, { totalScore: number; rank: number }> {
  const results: Record<string, { totalScore: number; rank: number }> = {};

  tradeStudy.candidates.forEach(cand => {
    let scoreSum = 0;
    tradeStudy.criteria.forEach(crit => {
      const rawScore = cand.scores[crit.id] ?? 3;
      scoreSum += rawScore * crit.weight;
    });
    results[cand.id] = { totalScore: scoreSum, rank: 1 };
  });

  const sorted = Object.entries(results).sort((a, b) => b[1].totalScore - a[1].totalScore);
  sorted.forEach(([id], index) => {
    results[id].rank = index + 1;
  });

  return results;
}
