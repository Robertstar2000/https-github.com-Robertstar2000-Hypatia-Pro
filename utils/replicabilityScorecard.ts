import { Experiment } from '../config';
import { calculateTwoSampleTPower } from './powerAnalysis';

export interface BiasAlert {
    type: 'selection_bias' | 'survivor_bias' | 'confounding_variable' | 'sample_size' | 'harking_risk';
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
}

export interface ReplicabilityScorecardResult {
    score: number; // 0 to 100
    rating: 'Poor' | 'Moderate' | 'High' | 'Exemplary';
    powerScore: number;
    methodologyCompletenessScore: number;
    biasScore: number;
    transparencyScore: number;
    alerts: BiasAlert[];
    checklist: { item: string; status: 'pass' | 'fail' | 'warning' }[];
}

/**
 * Computes a comprehensive 0–100% Replicability & Robustness Score
 */
export function calculateReplicabilityScore(experiment: Experiment): ReplicabilityScorecardResult {
    let powerScore = 70;
    let methodologyCompletenessScore = 60;
    let biasScore = 80;
    let transparencyScore = 75;
    const alerts: BiasAlert[] = [];
    const checklist: { item: string; status: 'pass' | 'fail' | 'warning' }[] = [];

    if (!experiment) {
        return {
            score: 50,
            rating: 'Moderate',
            powerScore: 50,
            methodologyCompletenessScore: 50,
            biasScore: 50,
            transparencyScore: 50,
            alerts: [],
            checklist: []
        };
    }

    // 1. Evaluate Statistical Power & Sample Size
    const step3Text = typeof experiment.stepData?.[3]?.output === 'string' ? experiment.stepData[3].output : '';
    const step5Text = typeof experiment.stepData?.[5]?.output === 'string' ? experiment.stepData[5].output : '';
    const sampleSizeMatch = (step3Text + ' ' + step5Text).match(/N\s*=\s*(\d+)|sample size of (\d+)/i);
    const estimatedN = sampleSizeMatch ? parseInt(sampleSizeMatch[1] || sampleSizeMatch[2], 10) : 30;

    const powerRes = calculateTwoSampleTPower(0.5, estimatedN / 2);
    powerScore = Math.min(100, Math.round(powerRes.power * 100));

    if (powerRes.power >= 0.80) {
        checklist.push({ item: 'Adequate Statistical Power (≥ 80%)', status: 'pass' });
    } else {
        checklist.push({ item: 'Adequate Statistical Power (≥ 80%)', status: 'warning' });
        alerts.push({
            type: 'sample_size',
            title: 'Underpowered Sample Size Risk',
            severity: 'medium',
            description: `Estimated sample size (N=${estimatedN}) yields ${(powerRes.power * 100).toFixed(0)}% power.`,
            recommendation: `Increase sample size to at least N=${powerRes.requiredSampleSize} for robust effect detection.`
        });
    }

    // 2. Methodology & Protocol Completeness
    const step4Output = typeof experiment.stepData?.[4]?.output === 'string' ? experiment.stepData[4].output : '';
    if (step4Output.length > 500) {
        methodologyCompletenessScore = 90;
        checklist.push({ item: 'Explicit Experimental Protocol Defined', status: 'pass' });
    } else if (step4Output.length > 100) {
        methodologyCompletenessScore = 70;
        checklist.push({ item: 'Explicit Experimental Protocol Defined', status: 'warning' });
    } else {
        methodologyCompletenessScore = 40;
        checklist.push({ item: 'Explicit Experimental Protocol Defined', status: 'fail' });
    }

    // 3. Confounding Variable & Bias Scanning
    const combinedText = (experiment.description + ' ' + step3Text + ' ' + step4Output).toLowerCase();

    if (!combinedText.includes('control') && !combinedText.includes('baseline')) {
        biasScore -= 20;
        alerts.push({
            type: 'confounding_variable',
            title: 'Missing Baseline Control Group',
            severity: 'high',
            description: 'No explicit control group or baseline condition was detected in the variables or protocol.',
            recommendation: 'Specify a placebo or negative control group in Step 3/4 to isolate effect size.'
        });
        checklist.push({ item: 'Control / Baseline Condition Specified', status: 'fail' });
    } else {
        checklist.push({ item: 'Control / Baseline Condition Specified', status: 'pass' });
    }

    if (combinedText.includes('convenience sample') || combinedText.includes('self-selected')) {
        biasScore -= 15;
        alerts.push({
            type: 'selection_bias',
            title: 'Potential Selection Bias',
            severity: 'medium',
            description: 'Non-random or convenience sampling detected.',
            recommendation: 'Use stratified or simple random sampling to ensure external validity.'
        });
        checklist.push({ item: 'Randomized Sampling Protocol', status: 'warning' });
    } else {
        checklist.push({ item: 'Randomized Sampling Protocol', status: 'pass' });
    }

    // 4. Open Science & Citation Transparency
    const citations = experiment.citations || [];
    if (citations.length >= 3) {
        transparencyScore = 95;
        checklist.push({ item: 'Literature Grounding (≥ 3 References)', status: 'pass' });
    } else {
        transparencyScore = 60;
        checklist.push({ item: 'Literature Grounding (≥ 3 References)', status: 'warning' });
    }

    // Final Aggregate Score Calculation
    const overallScore = Math.round((powerScore * 0.3) + (methodologyCompletenessScore * 0.3) + (biasScore * 0.25) + (transparencyScore * 0.15));

    let rating: 'Poor' | 'Moderate' | 'High' | 'Exemplary' = 'Moderate';
    if (overallScore >= 85) rating = 'Exemplary';
    else if (overallScore >= 70) rating = 'High';
    else if (overallScore >= 50) rating = 'Moderate';
    else rating = 'Poor';

    return {
        score: overallScore,
        rating,
        powerScore,
        methodologyCompletenessScore,
        biasScore: Math.max(0, biasScore),
        transparencyScore,
        alerts,
        checklist
    };
}

/**
 * Generates an OSF (Open Science Framework) Standard Preregistration Document
 */
export function generateOsfPreregistration(experiment: Experiment): string {
    const title = experiment?.title || "Untitled Study";
    const hyp = typeof experiment?.stepData?.[2]?.output === 'string' ? experiment.stepData[2].output : "Hypothesis pending formulation.";
    const vars = typeof experiment?.stepData?.[3]?.output === 'string' ? experiment.stepData[3].output : "Variables pending definition.";
    const design = typeof experiment?.stepData?.[4]?.output === 'string' ? experiment.stepData[4].output : "Methodology pending specification.";

    return `# OSF Preregistration Protocol
**Title:** ${title}
**Date Registered:** ${new Date().toISOString().split('T')[0]}
**Principal Investigator:** Project Hypatia Research Lab
**Registration Standard:** OSF Preregistration Template (v1.0)

---

### 1. Study Information
* **Title:** ${title}
* **Research Field:** ${experiment?.field || 'Computational Science'}
* **Study Description:** ${experiment?.description || 'N/A'}

### 2. Hypotheses & Primary Research Questions
${hyp}

### 3. Design Plan & Variables
* **Independent & Dependent Variables:**
${vars}

### 4. Sampling & Data Collection Procedure
* **Experimental Protocol:**
${design}

### 5. Analysis Plan & Stopping Rules
* **Confirmatory Statistical Tests:** Planned t-tests, ANOVA, or linear regression with α = 0.05.
* **Stopping Rule:** Sample collection stops upon reaching pre-calculated statistical power target (N ≥ 60).

---
*Preregistered prior to data synthesis to enforce scientific rigor and prevent post-hoc hypothesis alteration.*
`;
}
