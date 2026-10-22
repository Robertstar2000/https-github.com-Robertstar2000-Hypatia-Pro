import React, { useState, useEffect, useMemo } from 'react';
import { renderMarkdown } from '../../utils/markdownRenderer';
import { extractJson } from '../../services/api';

interface StepResultEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    stepId: number;
    stepTitle: string;
    currentOutput: string;
    originalOutput?: string;
    onSave: (editedContent: string) => void;
    onSaveAndVerify?: (editedContent: string) => void;
}

export const StepResultEditorModal: React.FC<StepResultEditorModalProps> = ({
    isOpen,
    onClose,
    stepId,
    stepTitle,
    currentOutput,
    originalOutput,
    onSave,
    onSaveAndVerify
}) => {
    const [content, setContent] = useState('');
    const [viewTab, setViewTab] = useState<'edit' | 'preview'>('edit');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    useEffect(() => {
        setContent(currentOutput || '');
        setHasUnsavedChanges(false);
        setViewTab('edit');
    }, [currentOutput, isOpen]);

    const [showRevertConfirm, setShowRevertConfirm] = useState(false);

    if (!isOpen) return null;

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        setHasUnsavedChanges(true);
    };

    const handleConfirmRevert = () => {
        const revertTarget = originalOutput || currentOutput;
        setContent(revertTarget);
        setHasUnsavedChanges(revertTarget !== currentOutput);
        setShowRevertConfirm(false);
    };

    const handleSaveOnly = () => {
        onSave(content);
        setHasUnsavedChanges(false);
        onClose();
    };

    const handleSaveAndVerify = () => {
        if (onSaveAndVerify) {
            onSaveAndVerify(content);
        } else {
            onSave(content);
        }
        setHasUnsavedChanges(false);
        onClose();
    };

    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const charCount = content.length;

    return (
        <div 
            className="modal fade show d-block" 
            tabIndex={-1} 
            role="dialog"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1060 }}
        >
            <div className="modal-dialog modal-dialog-centered modal-xl" style={{ maxWidth: '960px' }}>
                <div className="modal-content bg-dark text-white border border-primary border-opacity-30 shadow-2xl rounded-3 overflow-hidden">
                    {/* Header */}
                    <div className="modal-header border-bottom border-secondary border-opacity-20 bg-black bg-opacity-40 py-3 px-4">
                        <div className="d-flex align-items-center gap-2.5">
                            <div className="p-2 rounded-circle bg-primary bg-opacity-20 text-primary-glow border border-primary border-opacity-30 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                                <i className="bi bi-pencil-square fs-5"></i>
                            </div>
                            <div>
                                <div className="d-flex align-items-center gap-2">
                                    <h5 className="modal-title fw-bold text-white mb-0" style={{ fontSize: '1.15rem' }}>
                                        Edit Step {stepId} Result
                                    </h5>
                                    <span className="badge bg-primary bg-opacity-20 text-primary-glow border border-primary border-opacity-30 font-mono text-uppercase" style={{ fontSize: '0.68rem' }}>
                                        Manual Review
                                    </span>
                                </div>
                                <span className="text-white-50 small font-mono" style={{ fontSize: '0.78rem' }}>
                                    {stepTitle} • Modifications will guide subsequent research generation
                                </span>
                            </div>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            {/* Edit vs Preview Toggle */}
                            <div className="btn-group btn-group-sm bg-dark p-0.5 rounded border border-secondary border-opacity-25">
                                <button 
                                    className={`btn btn-sm ${viewTab === 'edit' ? 'btn-primary text-dark fw-bold' : 'btn-dark text-white-50'}`}
                                    onClick={() => setViewTab('edit')}
                                >
                                    <i className="bi bi-code-square me-1"></i> Editor
                                </button>
                                <button 
                                    className={`btn btn-sm ${viewTab === 'preview' ? 'btn-primary text-dark fw-bold' : 'btn-dark text-white-50'}`}
                                    onClick={() => setViewTab('preview')}
                                >
                                    <i className="bi bi-eye me-1"></i> Preview
                                </button>
                            </div>
                            <button 
                                type="button" 
                                className="btn-close btn-close-white opacity-75 ms-2" 
                                onClick={onClose}
                                aria-label="Close"
                            />
                        </div>
                    </div>

                    {/* Notice bar */}
                    <div className="px-4 py-2 bg-primary bg-opacity-5 border-bottom border-secondary border-opacity-10 d-flex flex-wrap justify-content-between align-items-center gap-2 text-white-50 small" style={{ fontSize: '0.75rem' }}>
                        <div className="d-flex align-items-center gap-1.5 text-primary-glow">
                            <i className="bi bi-info-circle-fill"></i>
                            <span>You can refine hypotheses, narrative wording, methodology specifics, or findings directly.</span>
                        </div>
                        <div className="d-flex align-items-center gap-3 font-mono">
                            <span>Words: <strong className="text-white">{wordCount}</strong></span>
                            <span>Chars: <strong className="text-white">{charCount}</strong></span>
                            {hasUnsavedChanges && (
                                <span className="badge bg-warning text-dark fw-bold">Unsaved Edits</span>
                            )}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="modal-body p-4" style={{ minHeight: '440px', maxHeight: '68vh', overflowY: 'auto' }}>
                        {viewTab === 'edit' ? (
                            <div className="d-flex flex-column h-100">
                                <textarea
                                    className="form-control bg-black text-white font-mono p-3 border border-secondary border-opacity-25 rounded-2 shadow-inner"
                                    rows={18}
                                    style={{ 
                                        resize: 'vertical', 
                                        lineHeight: '1.6', 
                                        fontSize: '0.88rem',
                                        minHeight: '380px' 
                                    }}
                                    value={content}
                                    onChange={handleTextChange}
                                    placeholder="Enter or refine the output for this step..."
                                />
                            </div>
                        ) : (
                            <div className="p-4 bg-black bg-opacity-50 rounded-2 border border-secondary border-opacity-20 text-white" style={{ minHeight: '380px' }}>
                                <div 
                                    className="generated-markdown-preview"
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content || '*No content entered.*', true) }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="modal-footer border-top border-secondary border-opacity-20 p-3 bg-black bg-opacity-30 d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <div className="d-flex align-items-center gap-2">
                            {originalOutput && originalOutput !== content && (
                                showRevertConfirm ? (
                                    <div className="d-flex align-items-center gap-1.5 p-1 rounded bg-danger bg-opacity-20 border border-danger border-opacity-30">
                                        <span className="small text-danger font-mono" style={{ fontSize: '0.75rem' }}>Revert all edits?</span>
                                        <button 
                                            type="button" 
                                            className="btn btn-xs btn-danger fw-bold py-0.5 px-2"
                                            onClick={handleConfirmRevert}
                                        >
                                            Yes, Revert
                                        </button>
                                        <button 
                                            type="button" 
                                            className="btn btn-xs btn-outline-secondary py-0.5 px-1.5 text-white-50"
                                            onClick={() => setShowRevertConfirm(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        type="button" 
                                        className="btn btn-xs btn-outline-secondary text-white-50 hover-text-white d-flex align-items-center gap-1"
                                        onClick={() => setShowRevertConfirm(true)}
                                        title="Restore initial AI generated output"
                                    >
                                        <i className="bi bi-arrow-counterclockwise"></i> Revert to Original
                                    </button>
                                )
                            )}
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <button 
                                type="button" 
                                className="btn btn-outline-secondary px-3 py-2 text-white-50 hover-text-white"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-outline-primary px-3 py-2 fw-bold d-flex align-items-center gap-1.5"
                                onClick={handleSaveOnly}
                            >
                                <i className="bi bi-check-lg"></i>
                                <span>Save Edits</span>
                            </button>
                            {onSaveAndVerify && (
                                <button 
                                    type="button" 
                                    className="btn btn-success px-3.5 py-2 fw-bold shadow-sm d-flex align-items-center gap-1.5"
                                    onClick={handleSaveAndVerify}
                                >
                                    <i className="bi bi-check-circle-fill"></i>
                                    <span>Verify &amp; Generate Next Step &raquo;</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
