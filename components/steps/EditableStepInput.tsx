import React, { useState, useEffect } from 'react';
import { useExperiment } from '../../services';
import { useToast } from '../../toast';
import { ScientificFieldSelector } from '../common/ScientificFieldSelector';
import { getFieldProfile } from '../../services/scientificFields';

interface EditableStepInputProps {
    stepId: number;
}

export const EditableStepInput: React.FC<EditableStepInputProps> = ({ stepId }) => {
    const { activeExperiment, updateExperiment } = useExperiment();
    const { addToast } = useToast();
    const stepData = activeExperiment?.stepData?.[stepId] || {};
    
    // Fallback to activeExperiment.description if stepData.input is empty on Step 1
    const defaultInitialValue = stepId === 1 
        ? (stepData.input || (activeExperiment?.description ? `Research Question: ${activeExperiment.description}` : ''))
        : (stepData.input || '');
        
    const [inputValue, setInputValue] = useState(defaultInitialValue);
    const [isSaving, setIsSaving] = useState(false);
    const [showFieldEditor, setShowFieldEditor] = useState(false);

    useEffect(() => {
        if (stepData.input) {
            setInputValue(stepData.input);
        } else if (stepId === 1 && activeExperiment?.description && !inputValue) {
            setInputValue(`Research Question: ${activeExperiment.description}`);
        }
    }, [stepData.input, stepId, activeExperiment?.description]);

    const handleSaveInput = () => {
        if (!activeExperiment) return;
        setIsSaving(true);
        const updatedStepData = { 
            ...activeExperiment.stepData,
            [stepId]: { ...(activeExperiment.stepData?.[stepId] || {}), input: inputValue }
        };
        updateExperiment({ ...activeExperiment, stepData: updatedStepData });
        addToast(stepId === 1 ? "Research Question & Scope updated." : "Step input saved.", "success");
        setTimeout(() => setIsSaving(false), 500);
    };

    const handleFieldChange = async (newField: string) => {
        if (!activeExperiment) return;
        try {
            await updateExperiment({ ...activeExperiment, field: newField });
            addToast(`Scientific field set to "${newField}". Terminology and literature search adapted.`, "success");
        } catch (e) {
            addToast("Error updating scientific field.", "danger");
        }
    };

    const handleInsertScopeSnippet = (snippet: string) => {
        setInputValue(prev => {
            const separator = prev.trim() ? '\n\n' : '';
            return `${prev}${separator}${snippet}`;
        });
        addToast("Added scope parameter snippet.", "info");
    };

    const handleResetFromExperiment = () => {
        if (activeExperiment?.description) {
            const resetVal = `Title: ${activeExperiment.title || ''}\nField: ${activeExperiment.field || ''}\n\nResearch Question & Scope:\n${activeExperiment.description}`;
            setInputValue(resetVal);
            addToast("Restored initial project research question.", "info");
        }
    };

    const isStep1 = stepId === 1;
    const currentField = activeExperiment?.field || 'Biology (General)';
    const fieldProfile = getFieldProfile(currentField);

    return (
        <div className="card border-secondary border-opacity-25 bg-dark bg-opacity-30 rounded-3 mb-4 overflow-hidden shadow-sm">
            {/* Header with mobile-friendly badges and clean titles */}
            <div className="card-header bg-transparent border-bottom border-secondary border-opacity-20 py-2.5 px-3 px-md-4">
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
                    <div className="d-flex align-items-center gap-2">
                        <div className="p-1.5 rounded-2 bg-primary-glow bg-opacity-10 text-primary-glow border border-primary-glow border-opacity-25 shrink-0">
                            <i className={`bi ${isStep1 ? 'bi-question-circle-fill' : 'bi-pencil-square'} fs-6`}></i>
                        </div>
                        <div>
                            <span className="fw-bold text-white small font-mono d-block">
                                {isStep1 ? '01. RESEARCH QUESTION & METHODOLOGICAL SCOPE' : `STEP 0${stepId} INPUT PARAMETERS`}
                            </span>
                            <span className="text-white-50" style={{ fontSize: '0.75rem' }}>
                                {isStep1 
                                    ? 'Primary testable objective, variables, target organism/system, and boundaries' 
                                    : 'Configured parameters used by AI agents to synthesize step outputs'}
                            </span>
                        </div>
                    </div>

                    {isStep1 && activeExperiment && (
                        <div className="d-flex align-items-center gap-1.5 flex-wrap">
                            <button
                                type="button"
                                onClick={() => setShowFieldEditor(prev => !prev)}
                                className="btn btn-outline-secondary btn-xs py-1 px-2.5 rounded-pill font-mono d-inline-flex align-items-center gap-1.5 border-opacity-50 text-white"
                                title="Click to change discipline or browse 80+ scientific fields"
                                style={{ fontSize: '0.72rem' }}
                            >
                                <i className="bi bi-mortarboard-fill text-primary-glow"></i>
                                <span>{currentField}</span>
                                <i className={`bi ${showFieldEditor ? 'bi-chevron-up' : 'bi-pencil-fill'} ms-0.5 text-white-50`} style={{ fontSize: '0.65rem' }}></i>
                            </button>
                            <span className="badge bg-info bg-opacity-15 text-info border border-info border-opacity-25 font-mono" style={{ fontSize: '0.7rem' }}>
                                {activeExperiment.experimentMode === 'physical' ? 'Empirical Lab' : 'Simulation'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Inline Field Changer & Terminology Adaptation Drawer for Step 1 */}
                {isStep1 && showFieldEditor && (
                    <div className="mt-3 p-3 rounded-3 bg-black bg-opacity-60 border border-primary border-opacity-25 animate-in">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-primary-glow font-mono fw-bold small text-uppercase d-flex align-items-center gap-1.5">
                                <i className="bi bi-sliders"></i>
                                Adapt Discipline, Terminology &amp; Literature Indices
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowFieldEditor(false)}
                                className="btn btn-link btn-xs text-white-50 p-0 text-decoration-none"
                            >
                                Done
                            </button>
                        </div>
                        <ScientificFieldSelector
                            value={currentField}
                            onChange={handleFieldChange}
                            compact={false}
                            showProfileCard={true}
                            idPrefix="step1-field-editor"
                            label=""
                        />
                    </div>
                )}
            </div>

            <div className="card-body p-3 p-md-4">
                {/* Prominent Scientific Field & Terminology Focus at start of session */}
                {isStep1 && (
                    <div className="mb-4 p-3 rounded-3 bg-black bg-opacity-40 border border-primary border-opacity-30 shadow-sm">
                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-2.5">
                            <div>
                                <span className="text-primary-glow font-mono fw-bold small text-uppercase d-flex align-items-center gap-1.5">
                                    <i className="bi bi-mortarboard-fill"></i>
                                    Scientific Discipline &amp; Literature Corpus Selection
                                </span>
                                <span className="text-white-50" style={{ fontSize: '0.75rem' }}>
                                    Select your field to adapt theoretical terminology, ontologies, and targeted databases (e.g. PubMed, bioRxiv, arXiv).
                                </span>
                            </div>
                            <span className="badge bg-primary bg-opacity-15 text-primary-glow border border-primary border-opacity-25 font-mono shrink-0" style={{ fontSize: '0.7rem' }}>
                                <i className="bi bi-sliders me-1"></i> Terminology Active
                            </span>
                        </div>
                        <ScientificFieldSelector
                            value={currentField}
                            onChange={handleFieldChange}
                            compact={false}
                            showProfileCard={true}
                            idPrefix="step1-prominent-field"
                            label="Current Scientific Discipline (80+ Available)"
                        />
                    </div>
                )}

                {/* Mobile Quick-Insert Scope Helpers for Step 1 */}
                {isStep1 && (
                    <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1.5">
                            <span className="text-white-50 font-mono" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                                <i className="bi bi-magic text-primary-glow me-1"></i>
                                QUICK SCOPE BUILDERS:
                            </span>
                            {activeExperiment?.description && (
                                <button
                                    type="button"
                                    onClick={handleResetFromExperiment}
                                    className="btn btn-link btn-xs text-info p-0 font-mono text-decoration-none"
                                    style={{ fontSize: '0.72rem' }}
                                    title="Reload original question from landing page"
                                >
                                    <i className="bi bi-arrow-counterclockwise me-1"></i>
                                    Reload Project Question
                                </button>
                            )}
                        </div>
                        <div className="d-flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleInsertScopeSnippet("Independent Variable (IV): \nDependent Variable (DV): ")}
                                className="btn btn-outline-secondary btn-xs py-1 px-2 text-white-50 border-opacity-25 hover-border-primary rounded-2 font-mono"
                                style={{ fontSize: '0.72rem', minHeight: '32px' }}
                            >
                                + Variables (IV / DV)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsertScopeSnippet("Hypothesized Causal Mechanism: ")}
                                className="btn btn-outline-secondary btn-xs py-1 px-2 text-white-50 border-opacity-25 hover-border-primary rounded-2 font-mono"
                                style={{ fontSize: '0.72rem', minHeight: '32px' }}
                            >
                                + Causal Mechanism
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsertScopeSnippet("Target Population & Sample Boundaries: \nSample Size (N) ≥ ")}
                                className="btn btn-outline-secondary btn-xs py-1 px-2 text-white-50 border-opacity-25 hover-border-primary rounded-2 font-mono"
                                style={{ fontSize: '0.72rem', minHeight: '32px' }}
                            >
                                + Sample &amp; Population
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInsertScopeSnippet("Control Conditions & Baseline: ")}
                                className="btn btn-outline-secondary btn-xs py-1 px-2 text-white-50 border-opacity-25 hover-border-primary rounded-2 font-mono"
                                style={{ fontSize: '0.72rem', minHeight: '32px' }}
                            >
                                + Control Group
                            </button>
                        </div>
                    </div>
                )}

                {/* Textarea: Touch-friendly with 16px font-size on mobile to avoid iOS viewport zooming */}
                <div className="mb-3">
                    <textarea
                        id={`step-input-${stepId}`}
                        rows={isStep1 ? 6 : 4}
                        className="form-control font-mono text-white bg-black bg-opacity-40 border-secondary border-opacity-25"
                        style={{ fontSize: '0.95rem', lineHeight: '1.55', minHeight: isStep1 ? '140px' : '90px' }}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onBlur={handleSaveInput}
                        placeholder={isStep1 
                            ? "Formulate your specific research question and define scope boundary conditions (e.g. 'What is the concentration-dependent effect of compound X on rate Y under controlled conditions?')..." 
                            : "Enter step parameters or guidance..."}
                    />
                </div>

                {/* Bottom Action Bar: Explicit touch-friendly button for mobile with character counter */}
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 pt-1 border-top border-secondary border-opacity-10">
                    <div className="d-flex align-items-center gap-2 text-white-50 font-mono" style={{ fontSize: '0.75rem' }}>
                        <span>{inputValue.length} characters</span>
                        <span>·</span>
                        <span>Auto-saves on blur</span>
                    </div>

                    <button
                        type="button"
                        onClick={handleSaveInput}
                        disabled={isSaving}
                        className="btn btn-primary btn-sm px-3 py-2 d-flex align-items-center justify-content-center gap-1.5 fw-bold shadow-sm w-100 w-sm-auto"
                        style={{ minHeight: '44px', fontSize: '0.82rem' }}
                    >
                        <i className={`bi ${isSaving ? 'bi-hourglass-split' : 'bi-check2-circle'} text-dark`}></i>
                        <span className="text-dark">
                            {isStep1 ? 'Apply Research Question & Scope' : 'Save Input'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};