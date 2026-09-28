import { Experiment, Citation } from '../config';
import { extractJson } from './api';

/**
 * Extracts references from experiment step data (especially Step 2 Literature Review)
 * and merges them into the experiment's citations array without duplicates.
 */
export const syncCitationsFromExperiment = (experiment: Experiment): Citation[] => {
    if (!experiment) return [];
    
    const existingCitations: Citation[] = [...(experiment.citations || [])];
    const existingTitles = new Set(
        existingCitations.map(c => (c.title || '').trim().toLowerCase()).filter(Boolean)
    );

    const updatedCitations = [...existingCitations];
    const litOutput = experiment.stepData?.[2]?.output;

    if (litOutput) {
        try {
            const rawStr = typeof litOutput === 'string' ? litOutput : JSON.stringify(litOutput);
            const cleanJsonText = extractJson(rawStr);
            const parsed = JSON.parse(cleanJsonText);

            if (Array.isArray(parsed.references)) {
                parsed.references.forEach((ref: any, idx: number) => {
                    const normTitle = (ref.title || '').trim().toLowerCase();
                    if (normTitle && !existingTitles.has(normTitle)) {
                        existingTitles.add(normTitle);

                        const authorsStr = Array.isArray(ref.authors) 
                            ? ref.authors.join(', ') 
                            : (ref.authors || 'Unknown Authors');
                        
                        const journalStr = ref.journal ? `Journal: ${ref.journal}` : '';
                        const findingsStr = ref.key_findings ? `Key Findings: ${ref.key_findings}` : '';
                        const notesCombined = [journalStr, findingsStr].filter(Boolean).join(' | ');

                        const tags: string[] = ['Literature Review'];
                        if (ref.rating) tags.push(ref.rating);
                        if (ref.relevance_score !== undefined) {
                            tags.push(`Relevance: ${Math.round((ref.relevance_score || 0.8) * 100)}%`);
                        }

                        updatedCitations.push({
                            id: `cit_lit_${Date.now()}_${idx}`,
                            title: ref.title,
                            authors: authorsStr,
                            year: String(ref.year || new Date().getFullYear()),
                            url: ref.url || '',
                            notes: notesCombined,
                            tags,
                            createdAt: new Date().toISOString()
                        });
                    }
                });
            }
        } catch (e) {
            console.warn("Could not auto-extract citations from literature review output:", e);
        }
    }

    return updatedCitations;
};
