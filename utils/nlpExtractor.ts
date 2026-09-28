/**
 * Rule-Based Client-Side NLP Pre-Summarizer
 * Extracts key variables, p-values, sample sizes, and metrics without LLM calls
 */

export interface ExtractedNlpFacts {
    sampleSize?: number;
    pValues: string[];
    effectSizes: string[];
    extractedVariables: string[];
    metrics: string[];
}

export function extractFactsFromText(text: string): ExtractedNlpFacts {
    if (!text) {
        return { pValues: [], effectSizes: [], extractedVariables: [], metrics: [] };
    }

    // Sample size regex (e.g. N = 120, n=45)
    const nMatch = text.match(/\b[Nn]\s*=\s*(\d+)\b/);
    const sampleSize = nMatch ? parseInt(nMatch[1], 10) : undefined;

    // p-values regex (e.g. p < 0.001, p = 0.04)
    const pMatches = text.match(/\b[pP]\s*[<>=]\s*0?\.\d+\b/g) || [];

    // Effect size regex (e.g. d = 0.65, r = 0.42, f = 0.25)
    const effectMatches = text.match(/\b[drf]\s*=\s*0?\.\d+\b/gi) || [];

    // Variable indicator extraction
    const varLines = text.split('\n').filter(line => 
        line.toLowerCase().includes('independent variable') || 
        line.toLowerCase().includes('dependent variable') ||
        line.toLowerCase().includes('covariate')
    );

    // Metrics extraction (e.g., accuracy, MSE, p-value, mean, std)
    const metricMatches = text.match(/\b(accuracy|precision|recall|f1-score|mse|rmse|mean|variance|std dev|correlation)\b/gi) || [];

    return {
        sampleSize,
        pValues: Array.from(new Set(pMatches)),
        effectSizes: Array.from(new Set(effectMatches)),
        extractedVariables: varLines.map(l => l.trim().replace(/^[*#-]\s*/, '')),
        metrics: Array.from(new Set(metricMatches.map(m => m.toLowerCase())))
    };
}
