import React from 'react';

interface StopProcessModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    currentStep?: number;
    stepTitle?: string;
    isGenerating?: boolean;
}

export const StopProcessModal: React.FC<StopProcessModalProps> = ({
    isOpen,
    onConfirm,
    onCancel,
    currentStep,
    stepTitle,
    isGenerating = true
}) => {
    if (!isOpen) return null;

    return (
        <div 
            className="modal fade show d-block" 
            tabIndex={-1} 
            role="dialog"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.78)', zIndex: 1060 }}
        >
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '480px' }}>
                <div className="modal-content bg-dark text-white border border-danger border-opacity-40 shadow-lg rounded-3 overflow-hidden">
                    {/* Header */}
                    <div className="modal-header border-bottom border-secondary border-opacity-20 bg-danger bg-opacity-10 py-3 px-4">
                        <div className="d-flex align-items-center gap-2.5">
                            <div className="p-2 rounded-circle bg-danger bg-opacity-20 text-danger border border-danger border-opacity-30 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                                <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                            </div>
                            <div>
                                <h5 className="modal-title fw-bold text-white mb-0" style={{ fontSize: '1.1rem' }}>
                                    Stop Scientific Process?
                                </h5>
                                <span className="text-white-50 small font-mono" style={{ fontSize: '0.75rem' }}>
                                    Confirm Halt Execution
                                </span>
                            </div>
                        </div>
                        <button 
                            type="button" 
                            className="btn-close btn-close-white opacity-75" 
                            onClick={onCancel}
                            aria-label="Close"
                        />
                    </div>

                    {/* Body */}
                    <div className="modal-body p-4">
                        <div className="mb-3">
                            <p className="text-light mb-2 fw-medium">
                                Are you sure you want to stop the active research process?
                            </p>
                            <p className="text-white-50 small mb-0" style={{ lineHeight: '1.5' }}>
                                Halting now will immediately terminate any active AI synthesis, simulation runners, or automated advancement.
                            </p>
                        </div>

                        {currentStep && (
                            <div className="p-3 rounded-2 bg-black bg-opacity-40 border border-secondary border-opacity-25 mb-3 font-mono">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="text-white-50 small">CURRENT STAGE:</span>
                                    <span className="badge bg-primary bg-opacity-20 text-primary-glow border border-primary border-opacity-30">
                                        Step {currentStep}
                                    </span>
                                </div>
                                <div className="text-white fw-bold small text-truncate">
                                    {stepTitle || `Node ${currentStep}`}
                                </div>
                                <div className="text-warning small mt-2 d-flex align-items-center gap-1.5" style={{ fontSize: '0.75rem' }}>
                                    <i className="bi bi-info-circle-fill"></i>
                                    <span>All generated content and manual edits are preserved locally.</span>
                                </div>
                            </div>
                        )}

                        <div className="alert alert-dark border border-secondary border-opacity-20 p-2.5 rounded text-white-50 small mb-0" style={{ fontSize: '0.78rem' }}>
                            <strong className="text-white d-block mb-1">What happens next:</strong>
                            <ul className="mb-0 ps-3">
                                <li>Autonomous loops will pause and switch to manual control.</li>
                                <li>You can review, edit, or regenerate this step at any time.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer border-top border-secondary border-opacity-20 p-3 bg-black bg-opacity-30 d-flex justify-content-between">
                        <button 
                            type="button" 
                            className="btn btn-outline-secondary px-3 py-2 text-white-50 hover-text-white"
                            onClick={onCancel}
                        >
                            <i className="bi bi-arrow-left me-1.5"></i> Keep Running
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-danger fw-bold px-3.5 py-2 shadow-sm d-flex align-items-center gap-1.5"
                            onClick={onConfirm}
                        >
                            <i className="bi bi-stop-circle-fill"></i>
                            <span>Yes, Stop Process</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
