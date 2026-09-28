
import React from 'react';
import { Blocker } from '../../config';

interface BlockerDisplayProps {
    blockers: Blocker[];
    onResolve: (id: string) => void;
}

export const BlockerDisplay: React.FC<BlockerDisplayProps> = ({ blockers, onResolve }) => {
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
                            <li key={blocker.id} className={`list-group-item bg-transparent border-secondary border-opacity-10 d-flex align-items-start p-3 ${blocker.resolved ? 'opacity-50' : ''}`}>
                                <div className={`me-3 text-${blocker.severity === 'critical' ? 'danger' : 'warning'}`}>
                                    <i className={`bi ${blocker.resolved ? 'bi-check-circle' : 'bi-dot'} fs-4`}></i>
                                </div>
                                <div className="flex-grow-1">
                                    <div className={`fw-bold small mb-1 ${blocker.resolved ? 'text-decoration-line-through text-white-50' : 'text-white'}`}>
                                        {blocker.msg}
                                    </div>
                                    <div className="text-white-50" style={{ fontSize: '0.7rem' }}>
                                        STATUS: {blocker.resolved ? 'MITIGATED' : 'BLOCKING ARCHIVAL SYNC'}
                                    </div>
                                </div>
                                {!blocker.resolved && (
                                    <button 
                                        className="btn btn-xs btn-outline-light ms-2"
                                        onClick={() => onResolve(blocker.id)}
                                    >
                                        RESOLVE
                                    </button>
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
                            Protocol Blocker Controls & Interaction Guide
                        </div>
                        <div className="small" style={{ fontSize: '0.78rem' }}>
                            <div className="mb-2">
                                <strong>• RESOLVE Button:</strong> Manually overrides and marks an individual blocker as <em>Mitigated</em> without re-executing agents. Use this when you acknowledge a warning or manually fix issues outside the system.
                            </div>
                            <div className="mb-2">
                                <strong>• RE-INITIATE / RE-RUN Buttons:</strong> Re-executes the AI agent or code simulator for this node. If you modified simulator parameters or simulation code to fix a data/logic blocker, re-initiating execution generates fresh datasets and automatically clears associated blockers at the source.
                            </div>
                            <div className="mb-2">
                                <strong>• VERIFY &amp; CONTINUE Button:</strong> Performs a comprehensive node integrity audit across all step outputs and blockers. It remains locked while any <em>Critical</em> blocker is active. Once all blockers are resolved or cleared via simulator re-runs, clicking this button validates the step data and advances the experiment.
                            </div>
                            <div className="p-2 rounded bg-black bg-opacity-10 border border-dark border-opacity-10 mt-2" style={{ fontSize: '0.73rem' }}>
                                <strong>Interaction Summary:</strong> 
                                Adjusting simulation code/parameters and re-initiating addresses the root cause of blockers. Alternatively, clicking <strong>RESOLVE</strong> skips/overrides the blocker manually. Either method resolves active critical blockers, unlocking <strong>Verify &amp; Continue</strong> to proceed.
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
            `}</style>
        </div>
    );
};
