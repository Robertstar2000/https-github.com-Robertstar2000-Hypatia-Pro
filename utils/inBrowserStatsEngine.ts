/**
 * In-Browser Statistical & Mathematical Engine
 * Provides deterministic client-side statistical analytics (Regressions, ANOVA, t-tests, correlations)
 * without incurring server or LLM token overhead.
 */

export interface SummaryStats {
    count: number;
    mean: number;
    median: number;
    stdDev: number;
    variance: number;
    stdError: number;
    min: number;
    max: number;
    range: number;
}

export interface LinearRegressionResult {
    slope: number;
    intercept: number;
    rSquared: number;
    r: number;
    equation: string;
    predictions: number[];
}

export interface TTestResult {
    tStatistic: number;
    degreesOfFreedom: number;
    meanDifference: number;
    stdErrorDifference: number;
    pEstimate: number;
    isSignificant: boolean;
}

export interface AnovaResult {
    fStatistic: number;
    dfBetween: number;
    dfWithin: number;
    ssBetween: number;
    ssWithin: number;
    msBetween: number;
    msWithin: number;
}

/**
 * Calculates complete summary statistics for an array of numbers
 */
export function calculateSummaryStats(data: number[]): SummaryStats {
    const cleanData = data.filter(n => typeof n === 'number' && !isNaN(n)).sort((a, b) => a - b);
    const count = cleanData.length;

    if (count === 0) {
        return { count: 0, mean: 0, median: 0, stdDev: 0, variance: 0, stdError: 0, min: 0, max: 0, range: 0 };
    }

    const sum = cleanData.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;

    const median = count % 2 === 0 
        ? (cleanData[count / 2 - 1] + cleanData[count / 2]) / 2 
        : cleanData[Math.floor(count / 2)];

    const varianceSum = cleanData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    const variance = count > 1 ? varianceSum / (count - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const stdError = count > 0 ? stdDev / Math.sqrt(count) : 0;

    const min = cleanData[0];
    const max = cleanData[count - 1];

    return {
        count,
        mean: Math.round(mean * 10000) / 10000,
        median: Math.round(median * 10000) / 10000,
        stdDev: Math.round(stdDev * 10000) / 10000,
        variance: Math.round(variance * 10000) / 10000,
        stdError: Math.round(stdError * 10000) / 10000,
        min,
        max,
        range: max - min
    };
}

/**
 * Computes Ordinary Least Squares (OLS) Linear Regression for x and y series
 */
export function calculateLinearRegression(x: number[], y: number[]): LinearRegressionResult {
    const validPairs: [number, number][] = [];
    const minLen = Math.min(x.length, y.length);
    for (let i = 0; i < minLen; i++) {
        const xi = Number(x[i]);
        const yi = Number(y[i]);
        if (!isNaN(xi) && !isNaN(yi) && isFinite(xi) && isFinite(yi)) {
            validPairs.push([xi, yi]);
        }
    }

    const n = validPairs.length;
    if (n < 2) {
        return { slope: 0, intercept: 0, rSquared: 0, r: 0, equation: "y = 0", predictions: [] };
    }

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
        const [xi, yi] = validPairs[i];
        sumX += xi;
        sumY += yi;
        sumXY += xi * yi;
        sumX2 += xi * xi;
        sumY2 += yi * yi;
    }

    const denomX = n * sumX2 - sumX * sumX;
    const slope = denomX !== 0 ? (n * sumXY - sumX * sumY) / denomX : 0;
    const intercept = (sumY - slope * sumX) / n;

    const num = n * sumXY - sumX * sumY;
    const xVar = Math.max(0, n * sumX2 - sumX * sumX);
    const yVar = Math.max(0, n * sumY2 - sumY * sumY);
    const den = Math.sqrt(xVar * yVar);
    const r = den > 0 ? num / den : 0;
    const rSquared = Math.min(1, Math.max(0, Math.pow(r, 2)));

    const predictions = x.map(val => {
        const numVal = Number(val);
        return isNaN(numVal) ? 0 : slope * numVal + intercept;
    });
    const sign = intercept >= 0 ? '+' : '-';
    const equation = `y = ${slope.toFixed(4)}x ${sign} ${Math.abs(intercept).toFixed(4)}`;

    return {
        slope: Math.round(slope * 10000) / 10000,
        intercept: Math.round(intercept * 10000) / 10000,
        rSquared: Math.round(rSquared * 10000) / 10000,
        r: Math.round(r * 10000) / 10000,
        equation,
        predictions
    };
}

/**
 * Computes Independent Two-Sample T-Test
 */
export function calculateTwoSampleTTest(group1: number[], group2: number[]): TTestResult {
    const stats1 = calculateSummaryStats(group1);
    const stats2 = calculateSummaryStats(group2);

    if (stats1.count < 2 || stats2.count < 2) {
        return { tStatistic: 0, degreesOfFreedom: 0, meanDifference: 0, stdErrorDifference: 0, pEstimate: 1, isSignificant: false };
    }

    const meanDiff = stats1.mean - stats2.mean;
    const seDiff = Math.sqrt((stats1.variance / stats1.count) + (stats2.variance / stats2.count));
    const tStat = seDiff > 0 ? meanDiff / seDiff : 0;
    const df = stats1.count + stats2.count - 2;

    // Approximate p-value from t-stat and df
    const absT = Math.abs(tStat);
    const pEst = Math.max(0.0001, Math.exp(-0.717 * absT - 0.416 * absT * absT));

    return {
        tStatistic: Math.round(tStat * 10000) / 10000,
        degreesOfFreedom: df,
        meanDifference: Math.round(meanDiff * 10000) / 10000,
        stdErrorDifference: Math.round(seDiff * 10000) / 10000,
        pEstimate: Math.round(pEst * 10000) / 10000,
        isSignificant: pEst < 0.05
    };
}

/**
 * Computes One-Way ANOVA for multiple groups
 */
export function calculateOneWayAnova(groups: number[][]): AnovaResult {
    const cleanGroups = (groups || []).map(g => 
        (g || []).map(Number).filter(n => typeof n === 'number' && !isNaN(n) && isFinite(n))
    ).filter(g => g.length > 0);

    const k = cleanGroups.length;
    let totalN = 0;
    let grandSum = 0;

    const groupMeans: number[] = [];
    const groupSizes: number[] = [];

    cleanGroups.forEach(g => {
        const stats = calculateSummaryStats(g);
        groupSizes.push(stats.count);
        groupMeans.push(stats.mean);
        totalN += stats.count;
        grandSum += stats.mean * stats.count;
    });

    if (k < 2 || totalN < 2) {
        return {
            fStatistic: 0,
            dfBetween: 0,
            dfWithin: 0,
            ssBetween: 0,
            ssWithin: 0,
            msBetween: 0,
            msWithin: 0
        };
    }

    const grandMean = totalN > 0 ? grandSum / totalN : 0;

    let ssBetween = 0;
    let ssWithin = 0;

    cleanGroups.forEach((g, idx) => {
        const n_i = groupSizes[idx];
        const mean_i = groupMeans[idx];
        ssBetween += n_i * Math.pow(mean_i - grandMean, 2);

        g.forEach(val => {
            ssWithin += Math.pow(val - mean_i, 2);
        });
    });

    const dfBetween = Math.max(1, k - 1);
    const dfWithin = Math.max(1, totalN - k);

    const msBetween = ssBetween / dfBetween;
    const msWithin = ssWithin / dfWithin;

    const fStat = msWithin > 0 ? msBetween / msWithin : 0;

    return {
        fStatistic: Math.round(fStat * 10000) / 10000,
        dfBetween,
        dfWithin,
        ssBetween: Math.round(ssBetween * 10000) / 10000,
        ssWithin: Math.round(ssWithin * 10000) / 10000,
        msBetween: Math.round(msBetween * 10000) / 10000,
        msWithin: Math.round(msWithin * 10000) / 10000
    };
}
