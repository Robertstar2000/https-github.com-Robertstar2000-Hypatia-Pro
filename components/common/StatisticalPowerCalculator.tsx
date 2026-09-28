import React, { useState, useMemo } from 'react';
import { calculateTwoSampleTPower, calculateAnovaPower, calculateCorrelationPower } from '../../utils/powerAnalysis';

export const StatisticalPowerCalculator: React.FC = () => {
    const [testType, setTestType] = useState<'t-test' | 'anova' | 'correlation'>('t-test');
    const [effectSize, setEffectSize] = useState<number>(0.5);
    const [sampleSize, setSampleSize] = useState<number>(30);
    const [groups, setGroups] = useState<number>(3);
    const [alpha, setAlpha] = useState<number>(0.05);

    const result = useMemo(() => {
        if (testType === 't-test') {
            return calculateTwoSampleTPower(effectSize, sampleSize, alpha);
        } else if (testType === 'anova') {
            return calculateAnovaPower(effectSize, groups, sampleSize * groups, alpha);
        } else {
            return calculateCorrelationPower(effectSize, sampleSize, alpha);
        }
    }, [testType, effectSize, sampleSize, groups, alpha]);

    const powerPercentage = Math.round(result.power * 100);

    return (
        <div className="card bg-black border-secondary border-opacity-25 shadow-sm p-3 my-3">
            <div className="d-flex align-items-center justify-content-between border-bottom border-secondary border-opacity-10 pb-2 mb-3">
                <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-bar-chart-steps text-primary-glow h5 mb-0"></i>
                    <h6 className="fw-bold mb-0 text-white">Automated Statistical Power Calculator</h6>
                </div>
                <span className={`badge ${result.isAdequatelyPowered ? 'bg-success bg-opacity-20 text-success border border-success' : 'bg-warning bg-opacity-20 text-warning border border-warning'}`}>
                    {result.isAdequatelyPowered ? 'Adequately Powered (≥80%)' : 'Underpowered (<80%)'}
                </span>
            </div>

            <div className="row g-3 mb-3">
                <div className="col-md-3">
                    <label className="form-label small text-white-50 fw-bold">Statistical Test</label>
                    <select 
                        className="form-select form-select-sm bg-dark text-white border-secondary"
                        value={testType}
                        onChange={(e) => {
                            const newType = e.target.value as any;
                            setTestType(newType);
                            if (newType === 'correlation' && effectSize > 0.9) setEffectSize(0.3);
                        }}
                    >
                        <option value="t-test">Two-Sample T-Test</option>
                        <option value="anova">One-Way ANOVA</option>
                        <option value="correlation">Pearson Correlation</option>
                    </select>
                </div>

                <div className="col-md-3">
                    <label className="form-label small text-white-50 fw-bold">
                        Effect Size {testType === 't-test' ? "(Cohen's d)" : testType === 'anova' ? "(Cohen's f)" : "(Pearson r)"}: <span className="text-primary-glow">{effectSize}</span>
                    </label>
                    <input 
                        type="range" 
                        className="form-range" 
                        min={testType === 'correlation' ? 0.05 : 0.1} 
                        max={testType === 'correlation' ? 0.95 : 1.5} 
                        step={0.05}
                        value={effectSize}
                        onChange={(e) => setEffectSize(parseFloat(e.target.value))}
                    />
                    <div className="d-flex justify-content-between text-white-50" style={{ fontSize: '0.7rem' }}>
                        <span>Small (0.2)</span>
                        <span>Med (0.5)</span>
                        <span>Large (0.8)</span>
                    </div>
                </div>

                <div className="col-md-3">
                    <label className="form-label small text-white-50 fw-bold">
                        {testType === 'anova' ? 'Sample N per Group' : 'Sample Size N'}: <span className="text-primary-glow">{sampleSize}</span>
                    </label>
                    <input 
                        type="range" 
                        className="form-range" 
                        min={5} 
                        max={200} 
                        step={5}
                        value={sampleSize}
                        onChange={(e) => setSampleSize(parseInt(e.target.value, 10))}
                    />
                    <div className="text-white-50 text-end" style={{ fontSize: '0.7rem' }}>
                        Total N = {testType === 'anova' ? sampleSize * groups : testType === 't-test' ? sampleSize * 2 : sampleSize}
                    </div>
                </div>

                <div className="col-md-3">
                    <label className="form-label small text-white-50 fw-bold">Alpha (α Significance)</label>
                    <select 
                        className="form-select form-select-sm bg-dark text-white border-secondary"
                        value={alpha}
                        onChange={(e) => setAlpha(parseFloat(e.target.value))}
                    >
                        <option value={0.01}>α = 0.01 (1%)</option>
                        <option value={0.05}>α = 0.05 (5% standard)</option>
                        <option value={0.10}>α = 0.10 (10%)</option>
                    </select>
                </div>
            </div>

            {/* Gauge Progress Bar */}
            <div className="p-3 bg-dark bg-opacity-40 rounded border border-secondary border-opacity-10 mb-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="small text-uppercase fw-bold text-white-50 font-monospace">Estimated Statistical Power (1 - β)</span>
                    <span className={`fw-bold h5 mb-0 font-monospace ${powerPercentage >= 80 ? 'text-success' : 'text-warning'}`}>
                        {powerPercentage}%
                    </span>
                </div>
                <div className="progress bg-black" style={{ height: '10px' }}>
                    <div 
                        className={`progress-bar progress-bar-striped ${powerPercentage >= 80 ? 'bg-success' : 'bg-warning'}`}
                        role="progressbar" 
                        style={{ width: `${powerPercentage}%` }} 
                        aria-valuenow={powerPercentage} 
                        aria-valuemin={0} 
                        aria-valuemax={100}
                    ></div>
                </div>
                <p className="small text-white-50 mb-0 mt-2 font-monospace" style={{ fontSize: '0.78rem' }}>
                    <i className="bi bi-info-circle me-1 text-primary-glow"></i> {result.interpretation}
                </p>
            </div>
        </div>
    );
};
