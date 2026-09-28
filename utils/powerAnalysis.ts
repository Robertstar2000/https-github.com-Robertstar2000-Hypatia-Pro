/**
 * Statistical Power Analysis Calculator
 * Provides client-side power calculations for t-tests, ANOVA, and correlations
 */

export interface PowerAnalysisResult {
    power: number; // Statistical power (1 - beta), e.g. 0.824
    requiredSampleSize: number; // Recommended total N for target power (default 0.80)
    effectSize: number; // Cohen's d, f, or Pearson's r
    alpha: number; // Significance level (default 0.05)
    testType: 't-test' | 'anova' | 'correlation';
    interpretation: string;
    isAdequatelyPowered: boolean; // True if power >= 0.80
}

/**
 * Standard Normal CDF approximation
 */
function normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989422804014327 * Math.exp(-x * x / 2);
    const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return x >= 0 ? 1 - p : p;
}

/**
 * Inverse Normal CDF (quantile function - Acklam's algorithm)
 */
function normalQuantile(p: number): number {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;

    // Coefficients in rational approximations
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];

    const q = p - 0.5;
    if (Math.abs(q) <= 0.42) {
        const r = q * q;
        return q * (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) /
               (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1.0);
    } else {
        const r = p < 0.5 ? p : 1.0 - p;
        const s = Math.sqrt(-Math.log(r));
        let val: number;
        if (s <= 5.0) {
            const x = s - 1.6;
            val = (((((c[0] * x + c[1]) * x + c[2]) * x + c[3]) * x + c[4]) * x + c[5]) /
                  ((((d[0] * x + d[1]) * x + d[2]) * x + d[3]) * x + 1.0);
        } else {
            const x = s - 5.0;
            val = (((((c[0] * x + c[1]) * x + c[2]) * x + c[3]) * x + c[4]) * x + c[5]) /
                  ((((d[0] * x + d[1]) * x + d[2]) * x + d[3]) * x + 1.0);
        }
        return p < 0.5 ? -val : val;
    }
}

/**
 * Two-Sample Independent T-Test Power Calculation
 */
export function calculateTwoSampleTPower(cohensD: number, nPerGroup: number, alpha: number = 0.05): PowerAnalysisResult {
    const d = Math.abs(cohensD) || 0.5;
    const n = Math.max(2, nPerGroup);
    
    const delta = d * Math.sqrt(n / 2);
    const zAlpha = normalQuantile(1 - alpha / 2);
    
    const powerRaw = normalCDF(delta - zAlpha) + normalCDF(-delta - zAlpha);
    const power = Math.min(0.999, Math.max(0.05, Math.round(powerRaw * 1000) / 1000));
    
    const targetPower = 0.80;
    const zBeta = normalQuantile(targetPower);
    const reqNPerGroup = Math.ceil(2 * Math.pow((zAlpha + zBeta) / d, 2));
    const totalReqN = reqNPerGroup * 2;
    
    let interpretation = `With n=${n} per group (Total N=${n * 2}) and Cohen's d=${d.toFixed(2)}, statistical power is ${(power * 100).toFixed(1)}%.`;
    if (power >= 0.80) {
        interpretation += ` Study is adequately powered (≥80%).`;
    } else {
        interpretation += ` Warning: Underpowered (<80%). Recommended total N is ${totalReqN} (${reqNPerGroup}/group).`;
    }

    return {
        power,
        requiredSampleSize: totalReqN,
        effectSize: d,
        alpha,
        testType: 't-test',
        interpretation,
        isAdequatelyPowered: power >= 0.80
    };
}

/**
 * One-Way ANOVA Power Calculation
 */
export function calculateAnovaPower(cohensF: number, groups: number = 3, totalN: number = 60, alpha: number = 0.05): PowerAnalysisResult {
    const f = Math.abs(cohensF) || 0.25;
    const k = Math.max(2, groups);
    const N = Math.max(k * 2, totalN);
    
    const delta = f * Math.sqrt(N);
    const zAlpha = normalQuantile(1 - alpha / k);
    const powerRaw = normalCDF(delta - zAlpha);
    const power = Math.min(0.999, Math.max(0.05, Math.round(powerRaw * 1000) / 1000));
    
    const zBeta = normalQuantile(0.80);
    const reqTotalN = Math.ceil(Math.pow((zAlpha + zBeta) / f, 2));
    
    return {
        power,
        requiredSampleSize: Math.max(k * 3, reqTotalN),
        effectSize: f,
        alpha,
        testType: 'anova',
        interpretation: `ANOVA with ${k} groups, Total N=${N}, f=${f.toFixed(2)} yields ${(power * 100).toFixed(1)}% power.`,
        isAdequatelyPowered: power >= 0.80
    };
}

/**
 * Pearson Correlation Power Calculation
 */
export function calculateCorrelationPower(r: number, sampleSize: number, alpha: number = 0.05): PowerAnalysisResult {
    const absR = Math.min(0.99, Math.abs(r) || 0.3);
    const N = Math.max(4, sampleSize);
    
    const zR = 0.5 * Math.log((1 + absR) / (1 - absR));
    const se = 1 / Math.sqrt(N - 3);
    const zAlpha = normalQuantile(1 - alpha / 2);
    
    const powerRaw = normalCDF((zR / se) - zAlpha);
    const power = Math.min(0.999, Math.max(0.05, Math.round(powerRaw * 1000) / 1000));
    
    const zBeta = normalQuantile(0.80);
    const reqN = Math.ceil(Math.pow((zAlpha + zBeta) / zR, 2) + 3);
    
    return {
        power,
        requiredSampleSize: reqN,
        effectSize: absR,
        alpha,
        testType: 'correlation',
        interpretation: `Correlation r=${absR.toFixed(2)} with N=${N} achieves ${(power * 100).toFixed(1)}% statistical power.`,
        isAdequatelyPowered: power >= 0.80
    };
}
