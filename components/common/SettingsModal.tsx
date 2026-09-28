
import React, { useState, useEffect } from 'react';
import { getKeyStatus } from '../../services';
import { useExperiment } from '../../context/ExperimentContext';
import { PortalModal } from './PortalModal';
import { LLMProviderModal } from './LLMProviderModal';

interface SettingsModalProps {
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    const [keyStatus, setKeyStatus] = useState(getKeyStatus);
    const [showLLMModal, setShowLLMModal] = useState(false);
    const { darkMode, setDarkMode, streamingEnabled, setStreamingEnabled } = useExperiment();

    useEffect(() => {
        const handleUpdate = () => setKeyStatus(getKeyStatus());
        window.addEventListener('hypatia-llm-config-updated', handleUpdate);
        return () => window.removeEventListener('hypatia-llm-config-updated', handleUpdate);
    }, []);

    return (
        <>
            <PortalModal isOpen={true} onClose={onClose} modalId="settings-modal">
                <div className="modal-dialog modal-dialog-centered my-0" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                    <div className="modal-content bg-dark border-secondary shadow-2xl rounded-3">
                        <div className="modal-header border-secondary">
                            <h5 className="modal-title text-primary-glow"><i className="bi bi-gear-fill me-2"></i>Application Settings</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                        </div>
                        <div className="modal-body p-4">
                            <div className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <label className="form-label text-white-50 small text-uppercase fw-bold mb-0">LLM Provider & Key</label>
                                    <button 
                                        type="button" 
                                        className="btn btn-link text-primary-glow p-0 text-decoration-none small"
                                        onClick={() => setShowLLMModal(true)}
                                    >
                                        Configure &raquo;
                                    </button>
                                </div>
                                <div className="p-3 rounded bg-black border border-secondary border-opacity-25 d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center">
                                        <div className={`status-dot me-3 ${keyStatus.color}`}></div>
                                        <div>
                                            <div className="fw-bold">{keyStatus.label}</div>
                                            <div className="small text-white-50">
                                                {keyStatus.isOAuth ? 'Linked via OAuth Subscription' : (keyStatus.type === 'manual' ? 'Custom API key active' : 'System key active')}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() => setShowLLMModal(true)}
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="form-label text-white-50 small text-uppercase fw-bold">Interface Preferences</label>
                                <div className="form-check form-switch mb-2">
                                    <input 
                                        className="form-check-input" 
                                        type="checkbox" 
                                        id="darkModeSwitch" 
                                        checked={darkMode} 
                                        onChange={(e) => setDarkMode(e.target.checked)} 
                                    />
                                    <label className="form-check-label" htmlFor="darkModeSwitch">Dark Mode (Forced)</label>
                                </div>
                                <div className="form-check form-switch">
                                    <input 
                                        className="form-check-input" 
                                        type="checkbox" 
                                        id="streamingSwitch" 
                                        checked={streamingEnabled} 
                                        onChange={(e) => setStreamingEnabled(e.target.checked)} 
                                    />
                                    <label className="form-check-label" htmlFor="streamingSwitch">Real-time Data Streaming</label>
                                </div>
                            </div>
                            <div className="alert alert-info border-info border-opacity-25 bg-info bg-opacity-10 text-info small">
                                <i className="bi bi-info-circle-fill me-2"></i>
                                Settings and provider keys are stored locally in your browser's persistent state.
                            </div>
                        </div>
                        <div className="modal-footer border-secondary">
                            <button className="btn btn-primary w-100" onClick={onClose}>CLOSE SETTINGS</button>
                        </div>
                    </div>
                </div>
                <style>{`
                    .status-dot {
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                    }
                `}</style>
            </PortalModal>

            {showLLMModal && (
                <LLMProviderModal
                    isOpen={showLLMModal}
                    onClose={() => {
                        setShowLLMModal(false);
                        setKeyStatus(getKeyStatus());
                    }}
                    onSaved={() => {
                        setKeyStatus(getKeyStatus());
                    }}
                />
            )}
        </>
    );
};

