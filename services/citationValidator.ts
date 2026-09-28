import { Citation } from '../config';

export interface VerifiedCitationResult extends Citation {
    verificationStatus: 'verified' | 'indexed' | 'unverified';
    verifiedDoi?: string;
    verifiedPublisher?: string;
    confidenceScore?: number;
}

/**
 * Validates paper references against CrossRef API
 */
export async function validateCitationWithCrossRef(citation: Citation): Promise<VerifiedCitationResult> {
    const title = citation.title?.trim();
    if (!title) {
        return { ...citation, verificationStatus: 'unverified' };
    }

    try {
        const queryUrl = `https://api.crossref.org/works?query.title=${encodeURIComponent(title)}&rows=1`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout for speed

        const response = await fetch(queryUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            const topItem = data?.message?.items?.[0];

            if (topItem && topItem.title && topItem.title.length > 0) {
                const foundTitle = topItem.title[0].toLowerCase();
                const cleanInputTitle = title.toLowerCase();

                // Compute simple word overlap confidence
                const inputWords = cleanInputTitle.split(/\s+/).filter(w => w.length > 3);
                const matchCount = inputWords.filter(w => foundTitle.includes(w)).length;
                const confidence = inputWords.length > 0 ? matchCount / inputWords.length : 0;

                if (confidence >= 0.6) {
                    const doi = topItem.DOI ? `https://doi.org/${topItem.DOI}` : citation.url;
                    return {
                        ...citation,
                        verificationStatus: topItem.DOI ? 'verified' : 'indexed',
                        verifiedDoi: topItem.DOI,
                        verifiedPublisher: topItem.publisher || topItem['container-title']?.[0],
                        url: doi || citation.url,
                        confidenceScore: Math.round(confidence * 100)
                    };
                }
            }
        }
    } catch (e) {
        // Fallback gracefully on fetch or network error
    }

    return {
        ...citation,
        verificationStatus: 'unverified'
    };
}

/**
 * Batch validates citations concurrently
 */
export async function validateCitationsBatch(citations: Citation[]): Promise<VerifiedCitationResult[]> {
    if (!citations || citations.length === 0) return [];
    return Promise.all(citations.map(c => validateCitationWithCrossRef(c)));
}
