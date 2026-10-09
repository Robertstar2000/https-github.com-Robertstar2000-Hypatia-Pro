/**
 * Persistent Scientific Knowledge Graph, Living Memory, and Epistemic Consistency Engine
 * Connects Hypotheses, Empirical Evidence, Theoretical Claims, Experimental Protocols,
 * Statistical Tests, Grounding Citations, and Confounding Variables.
 */

export type EvidenceClass = 'observed' | 'calculated_modeled' | 'assumption' | 'unknown';

export type NodeType = 
  | 'hypothesis'
  | 'evidence'
  | 'claim'
  | 'methodology'
  | 'statistical_test'
  | 'citation'
  | 'confounder';

export type RelationshipType = 
  | 'supports'
  | 'falsifies'
  | 'verifies'
  | 'derives_from'
  | 'confounds'
  | 'cites'
  | 'operationalizes';

export interface KnowledgeNode {
  id: string;
  stableId: string; // e.g. HYP-001, EVD-001, CLM-101, MET-201, TST-301, CIT-401, RSK-501
  label: string;
  type: NodeType;
  evidenceClass: EvidenceClass;
  version: number;
  status: 'active' | 'superseded' | 'disputed' | 'verified';
  description: string;
  metadata: {
    author?: string;
    doiUri?: string;
    numericValues?: Record<string, number>;
    units?: Record<string, string>;
    confidence?: number;
    reviewedAt?: string;
    reviewedBy?: string;
    tags?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationship: RelationshipType;
  details?: string;
  weight?: number;
  confidence?: number;
  createdAt: string;
}

export interface ConsistencyIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'conflicting_numbers' | 'stale_assumption' | 'broken_reference' | 'missing_evidence' | 'inconsistent_terminology';
  title: string;
  description: string;
  affectedNodeIds: string[];
  suggestedAction: string;
  resolved: boolean;
}

export interface ChangeImpactAnalysis {
  changedNodeId: string;
  directDependents: KnowledgeNode[];
  indirectDependents: KnowledgeNode[];
  affectedClaims: KnowledgeNode[];
  affectedTests: KnowledgeNode[];
  affectedConfounders: KnowledgeNode[];
  blastRadiusScore: number;
  recommendations: string[];
}

// Initial Pure Scientific Seed Knowledge Graph
export const INITIAL_KNOWLEDGE_NODES: KnowledgeNode[] = [
  {
    id: 'node-hyp-01',
    stableId: 'HYP-001',
    label: 'Phosphodiesterase Inhibition of Apical Root Meristem Mitosis',
    type: 'hypothesis',
    evidenceClass: 'assumption',
    version: 1,
    status: 'verified',
    description: 'Exogenous caffeine concentration (> 2.5 mM) competitively inhibits phosphodiesterase enzymes, elevating intracellular cAMP and reducing mitotic elongation by >= 35% in Arabidopsis thaliana.',
    metadata: {
      author: 'Dr. Hypatia & Scientific Ideation Team',
      confidence: 0.90,
      numericValues: { threshold_concentration_mM: 2.5, min_inhibition_pct: 35.0 },
      units: { threshold_concentration_mM: 'mM', min_inhibition_pct: '%' },
      reviewedAt: '2026-09-28',
      reviewedBy: 'Independent Methodologist Agent',
      tags: ['CELL-BIOLOGY', 'SIGNAL-TRANSDUCTION']
    },
    createdAt: '2026-09-28T10:00:00Z',
    updatedAt: '2026-09-28T10:00:00Z'
  },
  {
    id: 'node-evd-01',
    stableId: 'EVD-001',
    label: 'Spectrophotometric Root Elongation Assay Data (N=48)',
    type: 'evidence',
    evidenceClass: 'observed',
    version: 1,
    status: 'verified',
    description: 'Empirical measurement of 48 Arabidopsis root cultures across 5 caffeine concentration gradients (0.0 mM to 5.0 mM) showing a 38.2% reduction in elongation.',
    metadata: {
      author: 'Step 6 Data Acquisition Runner',
      confidence: 0.96,
      numericValues: { sample_size: 48, p_value: 0.0024, observed_inhibition_pct: 38.2 },
      units: { sample_size: 'samples', observed_inhibition_pct: '%' },
      doiUri: 'experiments/exp_arabidopsis_spectrophotometry.csv',
      reviewedAt: '2026-09-28',
      reviewedBy: 'Principal Biostatistician',
      tags: ['EMPIRICAL-ASSAY', 'SPECTROPHOTOMETRY']
    },
    createdAt: '2026-09-28T11:30:00Z',
    updatedAt: '2026-09-28T11:30:00Z'
  },
  {
    id: 'node-evd-02',
    stableId: 'EVD-002',
    label: 'In-Silico Monte Carlo Stochastic Simulation (10,000 Trials)',
    type: 'evidence',
    evidenceClass: 'calculated_modeled',
    version: 1,
    status: 'verified',
    description: 'Stochastic kinetic model predicting cell elongation reduction of 37.4% (+/- 3.1%) at 2.5 mM dosing threshold across 10,000 parameter iterations.',
    metadata: {
      author: 'In-Silico Simulation Modeler',
      confidence: 0.94,
      numericValues: { trials: 10000, model_r2: 0.962, predicted_reduction_pct: 37.4 },
      units: { trials: 'runs', model_r2: 'r2', predicted_reduction_pct: '%' },
      reviewedAt: '2026-09-28',
      reviewedBy: 'Domain Theorist Agent'
    },
    createdAt: '2026-09-28T13:00:00Z',
    updatedAt: '2026-09-28T13:00:00Z'
  },
  {
    id: 'node-clm-01',
    stableId: 'CLM-101',
    label: 'Critical Dose-Response Threshold Claim at 2.5 mM',
    type: 'claim',
    evidenceClass: 'calculated_modeled',
    version: 1,
    status: 'active',
    description: 'A non-linear step-function response manifests specifically between 2.0 mM and 2.5 mM exogenous dosing.',
    metadata: {
      author: 'Scientific Synthesis Specialist',
      confidence: 0.92,
      numericValues: { critical_dose_mM: 2.5 },
      units: { critical_dose_mM: 'mM' }
    },
    createdAt: '2026-09-28T15:00:00Z',
    updatedAt: '2026-09-28T15:00:00Z'
  },
  {
    id: 'node-met-01',
    stableId: 'MET-201',
    label: 'Double-Blind Randomized Block Study Protocol',
    type: 'methodology',
    evidenceClass: 'calculated_modeled',
    version: 2,
    status: 'verified',
    description: 'Randomized 4-cohort design with vehicle controls (0.1% DMSO), analyst blinding, and environmental incubator stabilization at 22C +/- 0.5C.',
    metadata: {
      author: 'Experimental Protocol Designer',
      confidence: 0.95,
      numericValues: { cohort_count: 4, incubator_temp_c: 22.0, temp_tolerance_c: 0.5 },
      units: { cohort_count: 'cohorts', incubator_temp_c: 'C', temp_tolerance_c: 'C' },
      reviewedBy: 'Bioethics & Methodology Council'
    },
    createdAt: '2026-09-29T08:00:00Z',
    updatedAt: '2026-09-29T08:00:00Z'
  },
  {
    id: 'node-tst-01',
    stableId: 'TST-301',
    label: 'Two-Way ANOVA & Post-Hoc Tukey HSD Test',
    type: 'statistical_test',
    evidenceClass: 'calculated_modeled',
    version: 1,
    status: 'active',
    description: 'Pre-registered inferential test assessing dose-treatment factor (F(3, 44)=8.94, p=0.0024) with Bonferroni alpha correction.',
    metadata: {
      author: 'Principal Biostatistician',
      numericValues: { f_statistic: 8.94, p_value: 0.0024, statistical_power: 0.91 },
      units: { f_statistic: 'F', p_value: 'p', statistical_power: '1-beta' }
    },
    createdAt: '2026-09-29T10:30:00Z',
    updatedAt: '2026-09-29T10:30:00Z'
  },
  {
    id: 'node-cit-01',
    stableId: 'CIT-401',
    label: 'Smith et al. (2024) - Meristematic Mitotic Kinetics',
    type: 'citation',
    evidenceClass: 'observed',
    version: 1,
    status: 'verified',
    description: 'Foundational study establishing basal elongation rates in wild-type Arabidopsis Col-0 cultivars under controlled photoperiods.',
    metadata: {
      author: 'Journal of Experimental Botany',
      doiUri: 'https://doi.org/10.1093/jxb/erae142',
      tags: ['PEER-REVIEWED', 'BASELINE-LITERATURE']
    },
    createdAt: '2026-09-29T11:00:00Z',
    updatedAt: '2026-09-29T11:00:00Z'
  },
  {
    id: 'node-rsk-01',
    stableId: 'RSK-501',
    label: 'Confounding Risk: Micro-well Evaporative Osmolarity Drift',
    type: 'confounder',
    evidenceClass: 'unknown',
    version: 1,
    status: 'active',
    description: 'Sustained 72-hour incubation may induce edge-well evaporation, elevating effective reagent osmolarity and mimicking mitotic arrest.',
    metadata: {
      author: 'Methodological Skeptic Agent',
      confidence: 0.72,
      numericValues: { risk_severity: 4, risk_probability: 2 },
      tags: ['EXPERIMENTAL-ARTIFACT', 'BIAS-CONTROL']
    },
    createdAt: '2026-09-29T14:00:00Z',
    updatedAt: '2026-09-29T14:00:00Z'
  }
];

export const INITIAL_KNOWLEDGE_EDGES: KnowledgeEdge[] = [
  {
    id: 'edge-01',
    sourceId: 'node-evd-01',
    targetId: 'node-hyp-01',
    relationship: 'supports',
    details: 'Empirical 38.2% inhibition confirms hypothesized >=35% reduction threshold (p=0.0024).',
    weight: 0.95,
    confidence: 0.96,
    createdAt: '2026-09-28T12:00:00Z'
  },
  {
    id: 'edge-02',
    sourceId: 'node-evd-02',
    targetId: 'node-hyp-01',
    relationship: 'supports',
    details: '10,000-trial in-silico Monte Carlo simulation replicates observed 37.4% kinetic arrest.',
    weight: 0.90,
    confidence: 0.94,
    createdAt: '2026-09-28T13:30:00Z'
  },
  {
    id: 'edge-03',
    sourceId: 'node-clm-01',
    targetId: 'node-hyp-01',
    relationship: 'derives_from',
    details: 'Dose threshold claim formalizes the non-linear inflection predicted in H1.',
    weight: 0.85,
    confidence: 0.92,
    createdAt: '2026-09-28T15:15:00Z'
  },
  {
    id: 'edge-04',
    sourceId: 'node-met-01',
    targetId: 'node-hyp-01',
    relationship: 'operationalizes',
    details: 'Protocol translates abstract cellular inhibition hypothesis into measurable micro-well culture trials.',
    weight: 0.95,
    confidence: 0.95,
    createdAt: '2026-09-29T08:30:00Z'
  },
  {
    id: 'edge-05',
    sourceId: 'node-tst-01',
    targetId: 'node-clm-01',
    relationship: 'verifies',
    details: 'Two-way ANOVA confirms statistical significance of the 2.5 mM dosing difference.',
    weight: 0.95,
    confidence: 0.95,
    createdAt: '2026-09-29T10:45:00Z'
  },
  {
    id: 'edge-06',
    sourceId: 'node-cit-01',
    targetId: 'node-hyp-01',
    relationship: 'cites',
    details: 'Grounds baseline mitotic velocity parameters in published literature.',
    weight: 0.90,
    confidence: 0.98,
    createdAt: '2026-09-29T11:15:00Z'
  },
  {
    id: 'edge-07',
    sourceId: 'node-rsk-01',
    targetId: 'node-met-01',
    relationship: 'confounds',
    details: 'Evaporative osmolarity drift represents a potential confounding bias in the micro-well assay.',
    weight: 0.75,
    confidence: 0.85,
    createdAt: '2026-09-29T14:15:00Z'
  }
];

/**
 * Runs automated consistency checks across scientific nodes and graph relationships.
 */
export function runConsistencyAudit(nodes: KnowledgeNode[], edges: KnowledgeEdge[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Check 1: Broken References
  edges.forEach((edge, idx) => {
    if (!nodeMap.has(edge.sourceId)) {
      issues.push({
        id: `iss-broken-src-${idx}`,
        severity: 'critical',
        type: 'broken_reference',
        title: `Broken Edge Source: Missing Node ${edge.sourceId}`,
        description: `Edge (${edge.relationship}) points from non-existent node ID "${edge.sourceId}".`,
        affectedNodeIds: [edge.targetId],
        suggestedAction: 'Delete invalid edge or re-link to an active scientific artifact.',
        resolved: false
      });
    }
    if (!nodeMap.has(edge.targetId)) {
      issues.push({
        id: `iss-broken-tgt-${idx}`,
        severity: 'critical',
        type: 'broken_reference',
        title: `Broken Edge Target: Missing Node ${edge.targetId}`,
        description: `Edge (${edge.relationship}) points to non-existent node ID "${edge.targetId}".`,
        affectedNodeIds: [edge.sourceId],
        suggestedAction: 'Re-target edge to an active hypothesis or protocol in the knowledge store.',
        resolved: false
      });
    }
  });

  // Check 2: Unverified Hypotheses without Evidence
  nodes.filter(n => n.type === 'hypothesis').forEach(hypNode => {
    const supportingEdges = edges.filter(e => e.targetId === hypNode.id && (e.relationship === 'supports' || e.relationship === 'falsifies'));
    if (supportingEdges.length === 0) {
      issues.push({
        id: `iss-no-evd-${hypNode.id}`,
        severity: 'warning',
        type: 'missing_evidence',
        title: `Unanchored Hypothesis: ${hypNode.stableId}`,
        description: `Hypothesis "${hypNode.label}" has no empirical or in-silico evidence attached.`,
        affectedNodeIds: [hypNode.id],
        suggestedAction: 'Attach Step 6 Dataset or Step 7 Inferential Results via a "supports" / "falsifies" relationship.',
        resolved: false
      });
    }
  });

  // Check 3: Claims without Statistical Validation
  nodes.filter(n => n.type === 'claim').forEach(claimNode => {
    const verifyingTests = edges.filter(e => e.targetId === claimNode.id && e.relationship === 'verifies');
    if (verifyingTests.length === 0) {
      issues.push({
        id: `iss-unverified-claim-${claimNode.id}`,
        severity: 'warning',
        type: 'missing_evidence',
        title: `Unverified Claim: ${claimNode.stableId}`,
        description: `Theoretical claim "${claimNode.label}" has no linked pre-registered statistical test.`,
        affectedNodeIds: [claimNode.id],
        suggestedAction: 'Link an inferential hypothesis test (ANOVA, t-test, or regression) to confirm significance.',
        resolved: false
      });
    }
  });

  // Check 4: Stale Assumptions with Low Epistemic Confidence
  nodes.filter(n => n.evidenceClass === 'assumption').forEach(assumpNode => {
    if (assumpNode.status === 'superseded' || (assumpNode.metadata.confidence !== undefined && assumpNode.metadata.confidence < 0.65)) {
      issues.push({
        id: `iss-stale-assump-${assumpNode.id}`,
        severity: 'warning',
        type: 'stale_assumption',
        title: `Low-Confidence Scientific Assumption: ${assumpNode.stableId}`,
        description: `Assumption "${assumpNode.label}" has low confidence (${assumpNode.metadata.confidence || 0}).`,
        affectedNodeIds: [assumpNode.id],
        suggestedAction: 'Conduct exploratory pilot or retrieve peer-reviewed DOI grounding.',
        resolved: false
      });
    }
  });

  // Check 5: Numerical Tolerance Alignment
  const hyp01 = nodes.find(n => n.stableId === 'HYP-001');
  const evd01 = nodes.find(n => n.stableId === 'EVD-001');
  if (hyp01 && evd01) {
    const hypThreshold = hyp01.metadata.numericValues?.min_inhibition_pct;
    const evdObserved = evd01.metadata.numericValues?.observed_inhibition_pct;
    if (hypThreshold && evdObserved && evdObserved < hypThreshold) {
      issues.push({
        id: 'iss-falsification-alert',
        severity: 'critical',
        type: 'conflicting_numbers',
        title: 'Observed Effect Falls Below Hypothesized Threshold',
        description: `Empirical observation (${evdObserved}%) is less than hypothesized minimum effect (${hypThreshold}%).`,
        affectedNodeIds: [hyp01.id, evd01.id],
        suggestedAction: 'Trigger formal falsification review or reconsider mechanism in Step 8 (Interpretation).',
        resolved: false
      });
    }
  }

  return issues;
}

/**
 * Dependency-aware change propagation engine for scientific investigations.
 */
export function computeChangeImpact(nodeId: string, nodes: KnowledgeNode[], edges: KnowledgeEdge[]): ChangeImpactAnalysis {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const directDependents: KnowledgeNode[] = [];
  const indirectDependents: KnowledgeNode[] = [];
  const visited = new Set<string>([nodeId]);

  edges.forEach(e => {
    if (e.targetId === nodeId && (e.relationship === 'derives_from' || e.relationship === 'verifies' || e.relationship === 'confounds' || e.relationship === 'operationalizes')) {
      const dep = nodeMap.get(e.sourceId);
      if (dep && !visited.has(dep.id)) {
        directDependents.push(dep);
        visited.add(dep.id);
      }
    }
  });

  const queue = [...directDependents.map(d => d.id)];
  while (queue.length > 0) {
    const currId = queue.shift()!;
    edges.forEach(e => {
      if (e.targetId === currId && !visited.has(e.sourceId)) {
        const dep = nodeMap.get(e.sourceId);
        if (dep) {
          indirectDependents.push(dep);
          visited.add(dep.id);
          queue.push(dep.id);
        }
      }
    });
  }

  const allAffected = [...directDependents, ...indirectDependents];
  const affectedClaims = allAffected.filter(n => n.type === 'claim');
  const affectedTests = allAffected.filter(n => n.type === 'statistical_test');
  const affectedConfounders = allAffected.filter(n => n.type === 'confounder');

  const baseWeight = directDependents.length * 15 + indirectDependents.length * 8;
  const criticalMultiplier = (affectedClaims.length * 12) + (affectedTests.length * 10) + (affectedConfounders.length * 14);
  const blastRadiusScore = Math.min(100, Math.round(baseWeight + criticalMultiplier));

  const recommendations: string[] = [];
  if (affectedClaims.length > 0) {
    recommendations.push(`Re-audit ${affectedClaims.length} dependent claim(s): ${affectedClaims.map(c => c.stableId).join(', ')}.`);
  }
  if (affectedTests.length > 0) {
    recommendations.push(`Re-run or re-stratify ${affectedTests.length} pre-registered statistical test(s).`);
  }
  if (affectedConfounders.length > 0) {
    recommendations.push(`Review control measures for confounding variable(s): ${affectedConfounders.map(k => k.stableId).join(', ')}.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('Isolated modification: minimal downstream theoretical ripple detected.');
  }

  return {
    changedNodeId: nodeId,
    directDependents,
    indirectDependents,
    affectedClaims,
    affectedTests,
    affectedConfounders,
    blastRadiusScore,
    recommendations
  };
}
