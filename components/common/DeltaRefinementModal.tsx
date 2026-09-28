import React, { useState } from 'react';
import { callGeminiWithRetry, safeGetText } from '../../services/api';

interface DeltaRefinementModalProps {
    isOpen: boolean;
    onClose: () => void;
    originalText: string;
    onApplyDelta: (newText: string) => void;
    stepTitle?: string;
}

export const DeltaRefinementModal: React.FC<DeltaRefinementModalProps> = ({
    isOpen,
    onClose,
    originalText,
    onApplyDelta,
    stepTitle = "Step Output"
}) => {
    const [targetSection, setTargetSection] = useState('');
    const [deltaInstructions, setDeltaInstructions] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewText, setPreviewText] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleGenerateDelta = async () => {
        if (!deltaInstructions.trim()) return;
        setIsProcessing(true);

        const prompt = `You are a precision scientific editor.
We have an existing text document for "${stepTitle}".
Original Text:
"""
${originalText}
"""

${targetSection ? `Target Section/Paragraph to Modify:
"""
${targetSection}
"""` : 'Modify the relevant section based on the user request.'}

User Delta Instructions:
"${deltaInstructions}"

TASK: Return the FULL UPDATED text document with ONLY the requested section updated.
Maintain the exact formatting, structure, and Markdown style. Do NOT add extra conversational commentary.`;

        try {
            const response = await callGeminiWithRetry('gemini-3.5-flash', { contents: prompt });
            const text = safeGetText(response);
            if (text) {
                setPreviewText(text.trim());
            }
        } catch (err) {
            console.error("Delta refinement error:", err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = () => {
        if (previewText) {
            onApplyDelta(previewText);
            setPreviewText(null);
            onClose();
        }
    };

    return (
        <div className="modal show d-block bg-black bg-opacity-75" tabIndex={-1}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content bg-dark text-white border-secondary">
                    <div className="modal-header border-secondary border-opacity-25 py-2">
                        <h6 className="modal-title fw-bold text-primary-glow d-flex align-items-center gap-2">
                            <i className="bi bi-sliders2"></i> Targeted Delta Refinement ({stepTitle})
                        </h6>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>

                    <div className="modal-body p-3">
                        <div className="alert alert-dark border border-secondary border-opacity-25 small mb-3">
                            <i className="bi bi-lightning-charge-fill me-1 text-warning"></i>
                            <strong>Token-Saving Targeted Edit:</strong> Refines only specific paragraphs or data points without re-generating the whole document.
                        </div>

                        {!previewText ? (
                            <>
                                <div className="mb-3">
                                    <label className="form-label small text-white-50 fw-bold">1. Target Paragraph / Text Chunk (Optional)</label>
                                    <textarea 
                                        className="form-control form-control-sm bg-black text-white border-secondary font-monospace"
                                        rows={3}
                                        placeholder="Paste or type the exact section you want to modify..."
                                        value={targetSection}
                                        onChange={e => setTargetSection(e.target.value)}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small text-white-50 fw-bold">2. Specific Refinement Instructions</label>
                                    <textarea 
                                        className="form-control form-control-sm bg-black text-white border-secondary"
                                        rows={3}
                                        placeholder="e.g., Update sample size to N=120 and add a 95% confidence interval of [4.2, 8.7]..."
                                        value={deltaInstructions}
                                        onChange={e => setDeltaInstructions(e.target.value)}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="mb-3">
                                <label className="form-label small text-success fw-bold">Refined Output Preview</label>
                                <textarea 
                                    className="form-control form-control-sm bg-black text-white border-secondary font-monospace"
                                    rows={10}
                                    value={previewText}
                                    onChange={e => setPreviewText(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    <div className="modal-footer border-secondary border-opacity-25 py-2">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cancel</button>
                        {!previewText ? (
                            <button 
                                type="button" 
                                className="btn btn-sm btn-primary px-3" 
                                onClick={handleGenerateDelta}
                                disabled={isProcessing || !deltaInstructions.trim()}
                            >
                                {isProcessing ? (
                                    <><span className="spinner-border spinner-border-sm me-1"></span> Processing Delta...</>
                                ) : (
                                    <><i className="bi bi-stars me-1"></i> Apply Delta Refinement</>
                                )}
                            </button>
                        ) : (
                            <button type="button" className="btn btn-sm btn-success px-3" onClick={handleSave}>
                                <i className="bi bi-check-lg me-1"></i> Save Updated Section
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
