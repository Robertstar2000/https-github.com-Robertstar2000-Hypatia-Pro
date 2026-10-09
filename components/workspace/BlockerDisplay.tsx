import React from 'react';
import { Blocker } from '../../config';

interface BlockerDisplayProps {
    blockers: Blocker[];
    onResolve: (id: string) => void;
    onAutoResolve?: (blocker: Blocker) => void;
    isAutoResolving?: boolean;
}

export const BlockerDisplay: React.FC<BlockerDisplayProps> = ({ 
    blockers, 
    onResolve, 
    onAutoResolve,
    isAutoResolving = false 
}) => {
    if (!blockers || blockers.length === 0) return null;

    const criticalCount = blockers.filter(b => b.severity === 'critical' && !b.resolved).length;

    return (
        <div className="blocker-system-alert mb-4">
            <div className={`card border-${criticalCount > 0 ? 'danger' : 'warning'} bg-black bg-opacity-50 shadow-lg overflow-hidden`}>
                <div className={`card-header bg-${criticalCount > 0 ? 'danger' : 'warning'} text-black py-2 d-flex align-items-center justify-content-between`}>
                    <div className="fw-bold small ls-1">
                        <i className={`bi ${criticalCount > 0 ? 'bi-exclamation-octagon-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
                        {criticalCount > 0 ? 'CRITICAL PROTOCOL BLOCKER' : 'SYSTEM WARNING'}
                    </div>
                    <span className="badge bg-black bg-opacity-25 text-white">{blockers.length} ISSUE(S)</span>
                </div>
                <div className="card-body p-0">
                    <ul className="list-group list-group-flush">
                        {blockers.map((blocker) => (
                            <li key={blocker.id} className={`list-group-item bg-transparent border-secondary border-opacity-10 d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between p-3 gap-2 ${blocker.resolved ? 'opacity-50' : ''}`}>
                                <div className="d-flex align-items-start gap-2 flex-grow-1">
                                    <div className={`me-2 text-${blocker.severity === 'critical' ? 'danger' : 'warning'} mt-0.5`}>
                                        <i className={`bi ${blocker.resolved ? 'bi-check-circle-fill text-success' : 'bi-exclamation-circle-fill'} fs-5`}></i>
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className={`fw-bold small mb-1 ${blocker.resolved ? 'text-decoration-line-through text-white-50' : 'text-white'}`}>
                                            {blocker.msg}
                                        </div>
                                        <div className="text-white-50 font-mono" style={{ fontSize: '0.7rem' }}>
                                            STATUS: {blocker.resolved ? 'MITIGATED' : 'BLOCKING ARCHIVAL SYNC'}
                                        </div>
                                    </div>
                                </div>
                                {!blocker.resolved && (
                                    <div className="d-flex align-items-center gap-2 ms-sm-2 shrink-0 flex-wrap mt-2 mt-sm-0">
                                        <button 
                                            type="button"
                                            className="btn btn-xs btn-outline-light d-flex align-items-center gap-1 font-mono"
                                            onClick={() => onResolve(blocker.id)}
                                            title="User Mitigated: Manually acknowledge and override this blocker without re-running"
                                        >
                                            <i className="bi bi-shield-check text-success"></i>
                                            <span>User Mitigated</span>
                                        </button>
                                        {onAutoResolve && (
                                            <button 
                                                type="button"
                                                className="btn btn-xs btn-info text-dark fw-bold d-flex align-items-center gap-1 font-mono shadow-sm"
                                                onClick={() => onAutoResolve(blocker)}
                                                disabled={isAutoResolving}
                                                title={`Auto Resolve: Re-run the phase/step inserting instructions to resolve: "${blocker.msg}"`}
                                            >
                                                <i className={`bi ${isAutoResolving ? 'bi-arrow-repeat spin' : 'bi-magic'}`}></i>
                                                <span>Auto Resolve</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>

                    {/* Explanatory Note with Yellow Background and Black Text */}
                    <div 
                        className="p-3 m-3 rounded shadow-sm border border-warning" 
                        style={{ backgroundColor: '#fef08a', color: '#000000', lineHeight: '1.45' }}
                    >
                        <div className="fw-bold text-uppercase mb-2 d-flex align-items-center" style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                            <i className="bi bi-info-circle-fill me-2 fs-6"></i>
                            Protocol Blocker Controls &amp; Interaction Guide
                        </div>
                        <div className="small" style={{ fontSize: '0.78rem' }}>
                            <div className="mb-2">
                                <strong>• User Mitigated Button:</strong> Manually overrides and marks an individual blocker as <em>Mitigated</em> without re-executing agents. Use this when you acknowledge a warning or manually fix issues outside the system.
                            </div>
                            <div className="mb-2">
                                <strong>• Auto Resolve Button:</strong> Automatically re-runs the phase/step and inserts directives into the step/phase prompting instructing the AI agent to: <em>resolve the &lt;blocker description&gt;</em>.
                            </div>
                            <div className="mb-2">
                                <strong>• VERIFY &amp; CONTINUE Button:</strong> Performs a comprehensive node integrity audit across all step outputs and blockers. It remains locked while any <em>Critical</em> blocker is active. Once all blockers are resolved or cleared, clicking this button validates the step data and advances the experiment.
                            </div>
                            <div className="p-2 rounded bg-black bg-opacity-10 border border-dark border-opacity-10 mt-2" style={{ fontSize: '0.73rem' }}>
                                <strong>Interaction Summary:</strong> 
                                Clicking <strong>Auto Resolve</strong> automatically re-runs the step/phase with targeted corrective instructions. Alternatively, clicking <strong>User Mitigated</strong> marks the blocker resolved manually. Either method clears active critical blockers, unlocking <strong>Verify &amp; Continue</strong> to proceed.
                            </div>
                        </div>
                    </div>
                </div>
                {criticalCount > 0 && (
                    <div className="card-footer bg-danger bg-opacity-10 border-top border-danger border-opacity-20 p-2 text-center">
                        <small className="text-danger font-monospace" style={{ fontSize: '0.65rem' }}>
                            PI INTERVENTION REQUIRED TO ADVANCE ARCHIVE STATE
                        </small>
                    </div>
                )}
            </div>
            <style>{`
                .blocker-system-alert {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
                .spin {
                    animation: spin 1s infinite linear;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};
