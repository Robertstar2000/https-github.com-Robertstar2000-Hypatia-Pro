import React from 'react';
import { Experiment } from '../../config';
import { calculateReplicabilityScore, generateOsfPreregistration } from '../../utils/replicabilityScorecard';
import { downloadTextFile } from '../../utils/exportFormats';

interface ReplicabilityScorecardModalProps {
    isOpen: boolean;
    onClose: () => void;
    experiment: Experiment;
}

export const ReplicabilityScorecardModal: React.FC<ReplicabilityScorecardModalProps> = ({
    isOpen,
    onClose,
    experiment
}) => {
    if (!isOpen) return null;

    const result = calculateReplicabilityScore(experiment);

    const handleDownloadOsf = () => {
        const osfMarkdown = generateOsfPreregistration(experiment);
        downloadTextFile(`${experiment?.title || 'study'}_OSF_Preregistration.md`, osfMarkdown, 'text/markdown');
    };

    return (
        <div className="modal show d-block bg-black bg-opacity-75" tabIndex={-1}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content bg-dark text-white border-secondary">
                    <div className="modal-header border-secondary border-opacity-25 py-2">
                        <h6 className="modal-title fw-bold text-primary-glow d-flex align-items-center gap-2">
                            <i className="bi bi-shield-check h5 mb-0 text-success"></i> Replicability & Robustness Scorecard
                        </h6>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>

                    <div className="modal-body p-3">
                        {/* Overview Score Banner */}
                        <div className="row g-3 mb-3">
                            <div className="col-md-4">
                                <div className="p-3 bg-black rounded border border-secondary border-opacity-25 text-center h-100 d-flex flex-column justify-content-center">
                                    <span className="small text-white-50 font-monospace text-uppercase">Replicability Index</span>
                                    <div className="display-5 fw-bold font-monospace text-primary-glow my-1">
                                        {result.score}%
                                    </div>
                                    <span className={`badge mx-auto ${result.score >= 75 ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
                                        {result.rating} Robustness
                                    </span>
                                </div>
                            </div>

                            <div className="col-md-8">
                                <div className="p-3 bg-black rounded border border-secondary border-opacity-25 h-100">
                                    <h6 className="small fw-bold text-white-50 font-monospace uppercase mb-2">Methodological Breakdown</h6>
                                    
                                    <div className="mb-2">
                                        <div className="d-flex justify-content-between small text-white-50">
                                            <span>Statistical Power Target (1 - β)</span>
                                            <span className="fw-bold text-white font-monospace">{result.powerScore}%</span>
                                        </div>
                                        <div className="progress bg-dark" style={{ height: '6px' }}>
                                            <div className="progress-bar bg-info" style={{ width: `${result.powerScore}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="mb-2">
                                        <div className="d-flex justify-content-between small text-white-50">
                                            <span>Methodology & Protocol Completeness</span>
                                            <span className="fw-bold text-white font-monospace">{result.methodologyCompletenessScore}%</span>
                                        </div>
                                        <div className="progress bg-dark" style={{ height: '6px' }}>
                                            <div className="progress-bar bg-success" style={{ width: `${result.methodologyCompletenessScore}%` }}></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="d-flex justify-content-between small text-white-50">
                                            <span>Bias Minimization & Control Integrity</span>
                                            <span className="fw-bold text-white font-monospace">{result.biasScore}%</span>
                                        </div>
                                        <div className="progress bg-dark" style={{ height: '6px' }}>
                                            <div className="progress-bar bg-warning" style={{ width: `${result.biasScore}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bias & Confounding Alerts */}
                        {result.alerts.length > 0 && (
                            <div className="mb-3">
                                <h6 className="small fw-bold text-warning font-monospace text-uppercase mb-2">
                                    <i className="bi bi-exclamation-triangle-fill me-1"></i> Detected Validity Threats & Confounding Alerts
                                </h6>
                                <div className="d-flex flex-column gap-2">
                                    {result.alerts.map((alert, idx) => (
                                        <div key={idx} className="p-2 bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <strong className="small text-warning">{alert.title}</strong>
                                                <span className="badge bg-warning text-dark font-monospace" style={{ fontSize: '0.65rem' }}>{alert.severity.toUpperCase()} SEVERITY</span>
                                            </div>
                                            <p className="small text-white-50 mb-1 mt-1">{alert.description}</p>
                                            <small className="text-white font-monospace" style={{ fontSize: '0.75rem' }}>
                                                💡 <strong>Fix:</strong> {alert.recommendation}
                                            </small>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Open Science Protocol Checklist */}
                        <div>
                            <h6 className="small fw-bold text-white-50 font-monospace text-uppercase mb-2">Open Science Audit Checklist</h6>
                            <div className="row g-2">
                                {result.checklist.map((item, idx) => (
                                    <div key={idx} className="col-md-6">
                                        <div className="p-2 bg-black rounded border border-secondary border-opacity-10 d-flex align-items-center justify-content-between">
                                            <span className="small text-white" style={{ fontSize: '0.8rem' }}>{item.item}</span>
                                            {item.status === 'pass' && <i className="bi bi-check-circle-fill text-success h6 mb-0"></i>}
                                            {item.status === 'warning' && <i className="bi bi-exclamation-circle-fill text-warning h6 mb-0"></i>}
                                            {item.status === 'fail' && <i className="bi bi-x-circle-fill text-danger h6 mb-0"></i>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer border-secondary border-opacity-25 py-2 justify-content-between">
                        <button type="button" className="btn btn-sm btn-outline-success" onClick={handleDownloadOsf}>
                            <i className="bi bi-file-earmark-arrow-down me-1"></i> Export OSF Preregistration (.md)
                        </button>
                        <button type="button" className="btn btn-sm btn-secondary px-3" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
