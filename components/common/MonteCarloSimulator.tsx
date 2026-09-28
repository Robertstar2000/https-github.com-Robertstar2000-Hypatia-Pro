import React, { useState, useMemo } from 'react';
import { runMonteCarloSimulation, MonteCarloResult } from '../../utils/monteCarloEngine';

export const MonteCarloSimulator: React.FC = () => {
    const [iterations, setIterations] = useState<number>(1000);
    const [baselineMean, setBaselineMean] = useState<number>(50);
    const [stdDev, setStdDev] = useState<number>(10);
    const [treatmentEffect, setTreatmentEffect] = useState<number>(5);
    const [noiseLevel, setNoiseLevel] = useState<number>(0.2);

    const simulation: MonteCarloResult = useMemo(() => {
        return runMonteCarloSimulation({
            iterations,
            mean: baselineMean,
            stdDev,
            treatmentEffect,
            noiseLevel
        });
    }, [iterations, baselineMean, stdDev, treatmentEffect, noiseLevel]);

    return (
        <div className="card bg-black border-secondary border-opacity-25 shadow-sm p-3 my-3">
            <div className="d-flex align-items-center justify-content-between border-bottom border-secondary border-opacity-10 pb-2 mb-3">
                <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-cpu text-primary-glow h5 mb-0"></i>
                    <div>
                        <h6 className="fw-bold mb-0 text-white">In-Browser Monte Carlo Simulation Engine</h6>
                        <small className="text-white-50" style={{ fontSize: '0.75rem' }}>
                            1,000+ trial stochastic sensitivity testing at 0 token cost
                        </small>
                    </div>
                </div>
                <span className="badge bg-success bg-opacity-20 text-success border border-success font-monospace">
                    {simulation.iterationsRun} Trials Computed
                </span>
            </div>

            <div className="row g-3 mb-3">
                <div className="col-md-3">
                    <label className="form-label small text-white-50 fw-bold">Iterations: <span className="text-primary-glow">{iterations}</span></label>
                    <select 
                        className="form-select form-select-sm bg-dark text-white border-secondary"
                        value={iterations}
                        onChange={(e) => setIterations(parseInt(e.target.value, 10))}
                    >
                        <option value={500}>500 Trials</option>
                        <option value={1000}>1,000 Trials (Standard)</option>
                        <option value={2500}>2,500 Trials</option>
                        <option value={5000}>5,000 Trials (High Precision)</option>
                    </select>
                </div>

                <div className="col-md-3">
                    <label className="form-label small text-white-50 fw-bold">Treatment Delta (+ Effect): <span className="text-primary-glow">+{treatmentEffect}</span></label>
                    <input 
                        type="range" 
                        className="form-range" 
                        min={0} 
                        max={20} 
                        step={0.5}
                        value={treatmentEffect}
                        onChange={(e) => setTreatmentEffect(parseFloat(e.target.value))}
                    />
                </div>

                <div className="col-md-3">
                    <label className="form-label small text-white-50 fw-bold">Noise / Variance: <span className="text-primary-glow">{(noiseLevel * 100).toFixed(0)}%</span></label>
                    <input 
                        type="range" 
                        className="form-range" 
                        min={0.05} 
                        max={0.8} 
                        step={0.05}
                        value={noiseLevel}
                        onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
                    />
                </div>

                <div className="col-md-3">
                    <label className="form-label small text-white-50 fw-bold">Baseline Mean: <span className="text-primary-glow">{baselineMean}</span></label>
                    <input 
                        type="number" 
                        className="form-control form-control-sm bg-dark text-white border-secondary font-monospace" 
                        value={baselineMean}
                        onChange={(e) => setBaselineMean(parseFloat(e.target.value) || 0)}
                    />
                </div>
            </div>

            {/* Trial Statistics Bar */}
            <div className="p-3 bg-dark bg-opacity-40 rounded border border-secondary border-opacity-10">
                <div className="row text-center g-2 font-monospace">
                    <div className="col-md-3">
                        <div className="small text-white-50">Superiority Rate</div>
                        <div className="h5 fw-bold text-success mb-0">{simulation.successRate}%</div>
                    </div>
                    <div className="col-md-3">
                        <div className="small text-white-50">Treat Mean</div>
                        <div className="h5 fw-bold text-primary-glow mb-0">{simulation.meanTreatment}</div>
                    </div>
                    <div className="col-md-3">
                        <div className="small text-white-50">95% CI Range</div>
                        <div className="h6 fw-bold text-warning mb-0">[{simulation.confidenceInterval95[0]}, {simulation.confidenceInterval95[1]}]</div>
                    </div>
                    <div className="col-md-3">
                        <div className="small text-white-50">Est. p-value</div>
                        <div className="h5 fw-bold text-info mb-0">p &lt; {simulation.pEstimate}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
