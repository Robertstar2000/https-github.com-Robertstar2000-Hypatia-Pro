/**
 * In-Browser Semantic & Term-Frequency Literature Filter
 * Ranks reference abstracts against research query to prune prompt payloads
 */

export interface LiteratureExcerpt {
    id: string;
    title: string;
    abstract: string;
    similarityScore: number;
}

/**
 * Calculates term-frequency similarity between query and target document
 */
export function rankLiteratureByRelevance(query: string, papers: Array<{ title: string; snippet?: string; url?: string }>): LiteratureExcerpt[] {
    if (!query || !papers || papers.length === 0) return [];

    const queryTerms = query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);

    return papers.map((paper, index) => {
        const docText = `${paper.title} ${paper.snippet || ''}`.toLowerCase();
        let matchCount = 0;

        queryTerms.forEach(term => {
            if (docText.includes(term)) {
                matchCount += 1;
            }
        });

        const score = queryTerms.length > 0 ? matchCount / queryTerms.length : 0;

        return {
            id: `paper_${index}`,
            title: paper.title,
            abstract: paper.snippet || 'No abstract excerpt available.',
            similarityScore: Math.round(score * 100)
        };
    }).sort((a, b) => b.similarityScore - a.similarityScore);
}
