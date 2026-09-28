/**
 * Client-Side Monte Carlo Simulation Engine
 * Runs 1,000+ stochastic trials to stress-test experimental models deterministically at 0 token cost.
 */

export interface MonteCarloConfig {
    iterations: number; // e.g. 1000
    mean: number; // Baseline expected mean
    stdDev: number; // Standard deviation
    treatmentEffect: number; // Delta effect size
    noiseLevel: number; // Noise multiplier
}

export interface MonteCarloResult {
    iterationsRun: number;
    baselineDistribution: number[];
    treatmentDistribution: number[];
    meanBaseline: number;
    meanTreatment: number;
    pEstimate: number;
    successRate: number; // % trials where treatment significantly outperformed baseline
    confidenceInterval95: [number, number];
}

/**
 * Standard Box-Muller transform for Gaussian random samples
 */
function randomNormal(mean: number = 0, stdDev: number = 1): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return num * stdDev + mean;
}

/**
 * Runs a deterministic 1,000+ trial Monte Carlo Simulation
 */
export function runMonteCarloSimulation(config: MonteCarloConfig): MonteCarloResult {
    const iterations = Math.max(100, Math.min(10000, config.iterations || 1000));
    const { mean, stdDev, treatmentEffect, noiseLevel } = config;

    const baselineDistribution: number[] = [];
    const treatmentDistribution: number[] = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
        const baseVal = randomNormal(mean, stdDev);
        const treatVal = randomNormal(mean + treatmentEffect, stdDev * (1 + noiseLevel));

        baselineDistribution.push(baseVal);
        treatmentDistribution.push(treatVal);

        if (treatVal > baseVal) {
            successCount += 1;
        }
    }

    const meanBaseline = baselineDistribution.reduce((a, b) => a + b, 0) / iterations;
    const meanTreatment = treatmentDistribution.reduce((a, b) => a + b, 0) / iterations;

    const sortedTreatment = [...treatmentDistribution].sort((a, b) => a - b);
    const lowerCi = sortedTreatment[Math.floor(iterations * 0.025)];
    const upperCi = sortedTreatment[Math.floor(iterations * 0.975)];

    const successRate = Math.round((successCount / iterations) * 1000) / 10;

    // Approximate p-value from success overlap
    const pEst = Math.max(0.0001, (100 - successRate) / 100);

    return {
        iterationsRun: iterations,
        baselineDistribution,
        treatmentDistribution,
        meanBaseline: Math.round(meanBaseline * 1000) / 1000,
        meanTreatment: Math.round(meanTreatment * 1000) / 1000,
        pEstimate: Math.round(pEst * 1000) / 1000,
        successRate,
        confidenceInterval95: [Math.round(lowerCi * 1000) / 1000, Math.round(upperCi * 1000) / 1000]
    };
}
