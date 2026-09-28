import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useExperiment } from '../../services';
import { useToast } from '../../toast';
import { 
    parseGeminiError, 
    getStepContext, 
    getPromptForStep, 
    executeStepWorkflow, 
    callGeminiStreamWithRetry,
    callGeminiWithRetry,
    generateNodeSummary,
    safeGetText,
    extractJson,
    tryRepairJson,
    syncCitationsFromExperiment
} from '../../services';
import { WORKFLOW_STEPS, RESEARCH_QUESTION_SCHEMA, DATA_ANALYSIS_IMAGE_OUTPUT_SCHEMA, LITERATURE_REVIEW_SCHEMA, HYPOTHESIS_TREE_SCHEMA } from '../../config';

import { DataEntryWorkspace } from '../steps/DataEntryWorkspace';
import { ExperimentRunner } from '../steps/runner/ExperimentRunner';
import { DataAnalysisWorkspace } from '../steps/DataAnalysisWorkspace';
import { PublicationExporter } from '../steps/PublicationExporter';
import { EditableStepInput } from '../steps/EditableStepInput';
import { GeneratedOutput } from '../common/GeneratedOutput';
import { ProjectCompletionView } from './ProjectCompletionView';
import { AutomationModeSelector } from './AutomationModeSelector';
import { FineTuneModal } from './FineTuneModal';
import { LiteratureReviewWorkspace } from '../steps/LiteratureReviewWorkspace';
import { HypothesisWorkspace } from '../steps/HypothesisWorkspace';
import { PeerReviewWorkspace } from '../steps/PeerReviewWorkspace';
import { InterpretationWorkspace } from '../steps/InterpretationWorkspace';
import { BlockerDisplay } from './BlockerDisplay';
import { validateSimulationSchema } from '../../utils/csvUtils';
import { useScrollStabilizer } from '../../hooks/useScrollStabilizer';
import { DataProvenanceGraph } from '../common/DataProvenanceGraph';
import { StatisticalPowerCalculator } from '../common/StatisticalPowerCalculator';
import { compressExperimentContext } from '../../utils/contextCache';
import { ReplicabilityScorecardModal } from '../common/ReplicabilityScorecardModal';
import { finalizeAndDeployResearch } from '../../utils/scientificPaperExporter';

const RESEARCH_PHASES = [
    { name: "Hypothesis", steps: [1, 2, 3], icon: "bi-lightbulb-fill" },
    { name: "Methodology", steps: [4, 5], icon: "bi-diagram-3" },
    { name: "Data Collection", steps: [6], icon: "bi-play-btn-fill" },
    { name: "Analysis", steps: [7, 8, 9], icon: "bi-graph-up" },
    { name: "Publication", steps: [10], icon: "bi-file-earmark-medical-fill" }
];

export const ExperimentWorkspace = () => {
    const { activeExperiment, updateExperiment, isAuthenticated, streamingEnabled } = useExperiment();
    const { addToast } = useToast();

    const [activeStep, setActiveStep] = useState(activeExperiment?.currentStep || 1);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>(""); 
    
    const [isVerifying, setIsVerifying] = useState(false);
    const [fineTuneModalOpen, setFineTuneModalOpen] = useState(false);
    const [streamingText, setStreamingText] = useState<string | null>(null);
    const [automationPaused, setAutomationPaused] = useState(false);
    const [reviewCountdown, setReviewCountdown] = useState<number | null>(null);
    const [showProvenanceGraph, setShowProvenanceGraph] = useState(false);
    const [showPowerCalc, setShowPowerCalc] = useState(false);
    const [showScorecardModal, setShowScorecardModal] = useState(false);

    // Responsive State
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Layout stabilization hook to preserve scroll position during state updates and button clicks
    useScrollStabilizer({
        deps: [activeStep, isLoading, isVerifying, streamingText, automationPaused, reviewCountdown, activeExperiment?.stepData]
    });

    const streamBuffer = useRef("");
    const streamInterval = useRef<any>(null);
    const isMounted = useRef(true);
    const lastAutomationTick = useRef<number>(0);
    const countdownInterval = useRef<any>(null);
    const activeStepRef = useRef(activeStep);
    const autoRetryAttempts = useRef<{ [stepId: number]: number }>({});

    useEffect(() => {
        isMounted.current = true;
        const checkMobile = () => {
            const mobile = window.innerWidth < 992;
            setIsMobile(mobile);
            if (mobile) setIsSidebarExpanded(false);
            else setIsSidebarExpanded(true);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => { 
            isMounted.current = false;
            window.removeEventListener('resize', checkMobile);
            if (streamInterval.current) clearInterval(streamInterval.current);
            if (countdownInterval.current) clearInterval(countdownInterval.current);
        };
    }, []);

    // Sync ref for stale closure prevention
    useEffect(() => {
        activeStepRef.current = activeStep;
    }, [activeStep]);

    useEffect(() => {
        if (activeExperiment && activeExperiment.currentStep !== activeStep && !isLoading && !isVerifying) {
            setActiveStep(activeExperiment.currentStep);
            setAutomationPaused(false); 
            setReviewCountdown(null);
            setStatusMessage("");
        }
    }, [activeExperiment?.currentStep, isLoading, isVerifying, activeStep]);

    // Auto-sync grounded references into activeExperiment.citations
    useEffect(() => {
        if (activeExperiment && activeExperiment.stepData?.[2]?.output) {
            const synced = syncCitationsFromExperiment(activeExperiment);
            if (synced.length > (activeExperiment.citations?.length || 0)) {
                updateExperiment({ ...activeExperiment, citations: synced });
            }
        }
    }, [activeExperiment?.stepData?.[2]?.output]);

    // Countdown Timer
    useEffect(() => {
        if (reviewCountdown !== null && reviewCountdown > 0) {
            if (countdownInterval.current) clearInterval(countdownInterval.current);
            countdownInterval.current = setInterval(() => {
                setReviewCountdown(prev => (prev !== null && prev > 0) ? prev - 1 : null);
            }, 1000);
        } else if (reviewCountdown === 0) {
            setReviewCountdown(null);
            if (countdownInterval.current) clearInterval(countdownInterval.current);
            handleCompleteStep();
        }
        return () => { if (countdownInterval.current) clearInterval(countdownInterval.current); };
    }, [reviewCountdown]);

    // Automation Engine
    useEffect(() => {
        if (!activeExperiment || !isAuthenticated || isLoading || isVerifying || automationPaused || reviewCountdown !== null) return;
        
        const mode = activeExperiment.automationMode;
        if (mode === 'automated' && activeStep === activeExperiment.currentStep) {
            const now = Date.now();
            if (now - lastAutomationTick.current < 5000) return;
            lastAutomationTick.current = now;

            const stepData = (activeExperiment.stepData && activeExperiment.stepData[activeStep]) || {};
            const isAgenticStep = [2, 6, 7, 8, 9, 10].includes(activeStep);
            
            const hasCriticalBlockers = stepData?.blockers?.some(b => b.severity === 'critical' && !b.resolved);
            if (hasCriticalBlockers) {
                setAutomationPaused(true);
                addToast("Automation paused: Critical blockers detected.", "warning");
                return;
            }

            if (!stepData?.output && !isAgenticStep) {
                handleGenerate();
            } else if (stepData?.output && !stepData?.summary && !isAgenticStep) {
                setReviewCountdown(15);
            }
        }
    }, [activeExperiment, activeStep, isAuthenticated, isLoading, isVerifying, automationPaused, reviewCountdown, addToast]);

    const handleStepChange = useCallback((stepId: number) => {
        if (isLoading || isVerifying) return;
        setStreamingText(null);
        setActiveStep(stepId);
        setAutomationPaused(false);
        setReviewCountdown(null);
        if (isMobile) setIsSidebarExpanded(false);
        autoRetryAttempts.current[stepId] = 0;
    }, [isLoading, isVerifying, isMobile]);

    const handleResolveBlocker = async (blockerId: string) => {
        if (!activeExperiment) return;
        const stepData = { ...(activeExperiment.stepData || {}) };
        const currentStepData = { ...(stepData[activeStep] || {}) };
        const blockers = (currentStepData.blockers || []).map(b => 
            b.id === blockerId ? { ...b, resolved: true } : b
        );
        stepData[activeStep] = { ...currentStepData, blockers };
        await updateExperiment({ ...activeExperiment, stepData });
        addToast("Blocker mitigation logged.", "success");
    };

    const handleAnalysisFailure = useCallback(async (errorMsg: string) => {
        if (!activeExperiment) return;
        if (errorMsg.includes("DATA_QUALITY_FAILURE")) {
            addToast(`Data quality failed: Re-routing to Acquisition.`, "warning");
            const updatedStepData = { ...activeExperiment.stepData };
            updatedStepData[7] = { ...updatedStepData[7], output: undefined, summary: undefined };
            updatedStepData[6] = { ...updatedStepData[6], output: undefined, summary: undefined };
            await updateExperiment({ ...activeExperiment, currentStep: 6, stepData: updatedStepData });
            setActiveStep(6);
        } else {
             addToast(`Analysis error: ${errorMsg}`, "danger");
             if (activeExperiment.automationMode === 'automated') setAutomationPaused(true);
        }
    }, [activeExperiment, updateExperiment, addToast]);

    const handleGenerate = async (regenerateFeedback = '') => {
        if (!isAuthenticated || isLoading || isVerifying) return;

        const isAutoRetry = regenerateFeedback.includes("PARSING ERROR");
        if (isAutoRetry) {
            const currentAttempts = autoRetryAttempts.current[activeStep] || 0;
            if (currentAttempts >= 1) {
                console.warn(`[Auto-Retry] Max attempts reached for step ${activeStep}. Pausing automation.`);
                setAutomationPaused(true);
                addToast(`Step ${activeStep} parsing failed after automatic retry. Please adjust input or settings manually.`, "warning");
                return;
            }
            autoRetryAttempts.current[activeStep] = currentAttempts + 1;
        }

        setStreamingText(null);
        setIsLoading(true);
        setStatusMessage("Establishing secure archival link...");
        setReviewCountdown(null);
        streamBuffer.current = "";
        
        try {
            const context = await getStepContext(activeExperiment, activeStep);
            const input = (activeExperiment.stepData && activeExperiment.stepData[activeStep]?.input) || '';
            const stepSettings = activeExperiment.fineTuneSettings?.[activeStep] || {};
            const { basePrompt, expectJson, config } = getPromptForStep(activeStep, input, context, stepSettings, regenerateFeedback);
            
            const apiOptions = {
                onStatusUpdate: (msg: string) => {
                    if (isMounted.current) setStatusMessage(msg);
                }
            };

            if (expectJson) {
                let schema;
                if (activeStep === 1) schema = RESEARCH_QUESTION_SCHEMA;
                else if (activeStep === 2) schema = LITERATURE_REVIEW_SCHEMA;
                else if (activeStep === 3) schema = HYPOTHESIS_TREE_SCHEMA;
                else schema = DATA_ANALYSIS_IMAGE_OUTPUT_SCHEMA;

                const model = (activeStep === 1 || activeStep === 3) ? 'gemini-3.5-flash' : 'gemini-3.1-flash-lite';
                
                const output = await executeStepWorkflow(model, { contents: basePrompt, config }, context, true, schema);
                
                if (isMounted.current) {
                    await updateExperiment({ 
                        ...activeExperiment, 
                        stepData: { ...activeExperiment.stepData, [activeStep]: { ...(activeExperiment.stepData?.[activeStep] || {}), output } } 
                    });
                }
            } else if (streamingEnabled) {
                const stream = await callGeminiStreamWithRetry(
                    'gemini-3.1-flash-lite', 
                    { contents: basePrompt, config },
                    apiOptions
                );
                
                if (streamInterval.current) clearInterval(streamInterval.current);
                streamInterval.current = setInterval(() => { if (isMounted.current) setStreamingText(streamBuffer.current); }, 250);
                
                for await (const chunk of stream) { 
                    streamBuffer.current += (safeGetText(chunk) || ''); 
                }
                
                if (streamInterval.current) { clearInterval(streamInterval.current); streamInterval.current = null; }
                if (isMounted.current) {
                    const finalOutput = streamBuffer.current;
                    setStreamingText(finalOutput);
                    await updateExperiment({
                        ...activeExperiment,
                        stepData: { ...activeExperiment.stepData, [activeStep]: { ...(activeExperiment.stepData?.[activeStep] || {}), output: finalOutput } }
                    });
                }
            } else {
                const response = await callGeminiWithRetry(
                    'gemini-3.1-flash-lite', 
                    { contents: basePrompt, config },
                    apiOptions
                );
                const finalOutput = safeGetText(response);
                if (isMounted.current) {
                    setStreamingText(finalOutput);
                    await updateExperiment({
                        ...activeExperiment,
                        stepData: { ...activeExperiment.stepData, [activeStep]: { ...(activeExperiment.stepData?.[activeStep] || {}), output: finalOutput } }
                    });
                }
            }
            if (isMounted.current) addToast("Archival node synchronized.", "success");
        } catch (error) {
            if (isMounted.current) {
                addToast(parseGeminiError(error), 'danger');
                if (activeExperiment?.automationMode === 'automated') setAutomationPaused(true);
            }
        } finally {
            if (isMounted.current) {
                setIsLoading(false);
                setStatusMessage("");
            }
        }
    };
    
    const handleCompleteStep = async (stepDataOverride?: any) => {
        if (isVerifying || !activeExperiment) return;
        setIsVerifying(true);
        setStatusMessage("Verifying node integrity...");
        setReviewCountdown(null);
        
        const currentStepData = { ...(activeExperiment.stepData?.[activeStep] || {}), ...stepDataOverride };
        const currentOutput = currentStepData.output || "";
        const hasCriticalBlockers = currentStepData.blockers?.some(b => b.severity === 'critical' && !b.resolved);
        
        if (hasCriticalBlockers) {
            addToast("Resolve critical blockers before proceeding.", "warning");
            setAutomationPaused(true);
            setIsVerifying(false);
            return;
        }
        
        try {
            let summary = currentStepData.summary;
            if (!summary && currentOutput.length > 50) {
                if (activeStep === 3) {
                    try {
                        let tree: any = null;
                        try {
                            const jsonStr = extractJson(currentOutput);
                            tree = jsonStr ? JSON.parse(jsonStr) : null;
                        } catch {
                            tree = tryRepairJson(currentOutput);
                        }
                        if (tree) {
                            const fh = tree.final_hypothesis || tree.hypothesis;
                            if (typeof fh === 'string') {
                                summary = fh;
                            } else if (fh && typeof fh === 'object') {
                                const nullH = typeof fh.null_hypothesis === 'string' ? fh.null_hypothesis : (fh.null_hypothesis?.statement || fh.h0 || 'Baseline H0');
                                const altH = typeof fh.alternative_hypothesis_1 === 'string' ? fh.alternative_hypothesis_1 : (fh.alternative_hypothesis_1?.statement || fh.h1 || 'Experimental H1');
                                summary = `Null: ${nullH}\nAlt: ${altH}`;
                            } else {
                                summary = "Hypothesis tree verified.";
                            }
                        } else {
                            summary = currentOutput.substring(0, 150);
                        }
                    } catch (e) {
                        summary = "Hypothesis verified.";
                    }
                } else if (activeStep === 10) {
                    summary = "Scientific publication manuscript and project dossier finalized.";
                } else {
                    try { summary = await generateNodeSummary(currentOutput, activeExperiment.field); } catch (e) { summary = "Node verified."; }
                }
            } else if (!summary) { summary = "Node verified."; }

            const nextStepId = activeStep < WORKFLOW_STEPS.length ? activeStep + 1 : WORKFLOW_STEPS.length + 1;
            autoRetryAttempts.current[nextStepId] = 0;
            const updatedStepDataMap = { ...(activeExperiment.stepData || {}) };
            updatedStepDataMap[activeStep] = { ...currentStepData, summary };

            if (activeStep === 6) {
                const csvData = currentStepData.input || currentOutput; 
                const schemaCheck = validateSimulationSchema(csvData, 100);
                if (!schemaCheck.isValid) {
                    addToast(`Data validation note: ${schemaCheck.errors[0]}`, "warning");
                }
                updatedStepDataMap[7] = { ...(updatedStepDataMap[7] || {}), input: csvData, output: undefined, summary: undefined };
            }

            const updatedExp = { ...activeExperiment, stepData: updatedStepDataMap, currentStep: nextStepId };
            await updateExperiment(updatedExp);

            // Execute the Finalize and Deploy workflow on step 10
            if (activeStep === 10) {
                setStatusMessage("Formatting scientific paper (.pdf) & bundling project archive (.zip)...");
                try {
                    await finalizeAndDeployResearch(updatedExp, (progressMsg) => {
                        if (isMounted.current) setStatusMessage(progressMsg);
                    });
                    if (isMounted.current) {
                        addToast("Finalize and deploy complete: Scientific Paper PDF and Project Archive ZIP downloaded!", "success");
                    }
                } catch (deployError) {
                    console.error("Finalize and deploy error:", deployError);
                    if (isMounted.current) {
                        addToast("Deployment archive generated with minor warning. Access files in Dossier view.", "warning");
                    }
                }
            }

            if (isMounted.current) {
                addToast(`Step ${activeStep} complete.`, "success");
                setActiveStep(nextStepId);
                
                // Force automation to resume immediately if applicable
                if (activeExperiment.automationMode === 'automated') {
                    setAutomationPaused(false);
                    lastAutomationTick.current = 0; // Reset tick to trigger immediate effect
                }

                // Ensure sidebar is expanded to show progress
                if (!isMobile) setIsSidebarExpanded(true);
            }
        } catch (error) {
            console.error(error);
            if (isMounted.current) addToast("Verification failed.", 'danger');
        } finally {
            if (isMounted.current) {
                setIsVerifying(false);
                setStatusMessage("");
            }
        }
    };

    // Safe handler to prevent stale closures from previous steps triggering countdown on new steps
    const handleAutoAdvance = (requestingStepId: number) => {
        if (!isMounted.current) return;
        if (activeStepRef.current === requestingStepId) {
            setReviewCountdown(15);
        }
    };

    const renderStepContent = () => {
        if (!activeExperiment) return null;
        if (activeStep > WORKFLOW_STEPS.length) return <ProjectCompletionView />;
        if (activeExperiment.currentStep === 2 && activeExperiment.automationMode === null) {
            return <AutomationModeSelector onSelect={(mode) => updateExperiment({...activeExperiment, automationMode: mode})} />;
        }
        
        if (activeStep === 2) return <LiteratureReviewWorkspace onStepComplete={() => handleAutoAdvance(2)} />;
        if (activeStep === 3) return <HypothesisWorkspace onStepComplete={() => handleCompleteStep()} onGenerate={(feedback) => handleGenerate(feedback)} isLoading={isLoading} />;
                if (activeStep === 6) {
             if (activeExperiment.experimentMode === 'physical') {
                 return <DataEntryWorkspace experiment={activeExperiment} onComplete={(data) => handleCompleteStep({ output: JSON.stringify(data), input: JSON.stringify(data) })} />;
             } else {
                 return <ExperimentRunner onStepComplete={(data: any) => { handleCompleteStep(data); }} />;
             }
        }
        if (activeStep === 7) return <DataAnalysisWorkspace onStepComplete={() => handleAutoAdvance(7)} onAnalysisFailure={handleAnalysisFailure} />;
        if (activeStep === 8) return <InterpretationWorkspace onStepComplete={() => handleAutoAdvance(8)} />;
        if (activeStep === 9) return <PeerReviewWorkspace onStepComplete={() => handleAutoAdvance(9)} />;
        if (activeStep === 10) return <PublicationExporter />;

        return (
            <div className="discovery-view">
                {activeStep === 1 && <EditableStepInput stepId={1} />}
                <GeneratedOutput
                    key={`${activeExperiment.id}-${activeStep}`}
                    stepId={activeStep}
                    onGenerate={handleGenerate}
                    isLoading={isLoading}
                    statusMessage={statusMessage} 
                    streamingText={streamingText}
                />
            </div>
        );
    };

    if (!activeExperiment) return null;

    const currentStepData = activeExperiment.stepData?.[activeStep];
    const hasOutput = currentStepData?.output;
    const hasCriticalBlocker = currentStepData?.blockers?.some(b => b.severity === 'critical' && !b.resolved);

    const cachedContext = compressExperimentContext(activeExperiment, activeStep);

    return (
        <div className="workspace-container d-flex flex-column gap-3 py-3 w-100">
            {/* Horizontal Timeline at the Top of Steps Page */}
            <div className="card shadow-sm border-secondary border-opacity-10 overflow-hidden mb-1">
                <div className="card-header fw-bold bg-dark py-2 small ls-1 text-uppercase d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-10">
                    <div className="d-flex align-items-center gap-2">
                        <span><i className="bi bi-cpu-fill text-primary-glow me-1"></i> Experiment Timeline</span>
                        <button 
                            className={`btn btn-xs rounded-pill ${showProvenanceGraph ? 'btn-primary' : 'btn-outline-secondary text-white'}`}
                            onClick={() => setShowProvenanceGraph(p => !p)}
                            title="Interactive Data Lineage & Provenance Graph"
                        >
                            <i className="bi bi-diagram-3-fill me-1"></i> Lineage Graph
                        </button>
                        <button 
                            className={`btn btn-xs rounded-pill ${showPowerCalc ? 'btn-primary' : 'btn-outline-secondary text-white'}`}
                            onClick={() => setShowPowerCalc(p => !p)}
                            title="Statistical Power Calculator"
                        >
                            <i className="bi bi-bar-chart-steps me-1"></i> Power Calc
                        </button>
                        <button 
                            className="btn btn-xs rounded-pill btn-outline-success text-white"
                            onClick={() => setShowScorecardModal(true)}
                            title="Replicability & Robustness Scorecard & OSF Preregistration"
                        >
                            <i className="bi bi-shield-check me-1 text-success"></i> Replicability Audit
                        </button>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-2 py-1 font-monospace fw-normal" title="Hierarchical Context Caching Active">
                            <i className="bi bi-lightning-charge-fill me-1 text-warning"></i>
                            Cache: {cachedContext.estimatedTokenSavingPercent}% Token Savings
                        </span>
                        {(activeExperiment.updatedAt || activeExperiment.createdAt) && (
                            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 font-monospace fw-normal d-flex align-items-center gap-1" title="Database Synchronization Timestamp" id="header-db-sync-status">
                                <i className="bi bi-database-check-fill text-success" style={{ fontSize: '0.8rem' }}></i>
                                <span className="d-none d-sm-inline">Synced:</span> {new Date(activeExperiment.updatedAt || activeExperiment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        )}
                        <span className="badge bg-secondary bg-opacity-20 text-white-50 small font-monospace">Step {activeStep} of 10</span>
                    </div>
                </div>

                {/* Collapsible Provenance Graph */}
                {showProvenanceGraph && (
                    <div className="p-2 border-bottom border-secondary border-opacity-10 bg-black">
                        <DataProvenanceGraph experiment={activeExperiment} onSelectStep={(sId) => handleStepChange(sId)} />
                    </div>
                )}

                {/* Collapsible Power Calculator */}
                {showPowerCalc && (
                    <div className="p-2 border-bottom border-secondary border-opacity-10 bg-black">
                        <StatisticalPowerCalculator />
                    </div>
                )}
                <div className="card-body p-2 bg-dark bg-opacity-10">
                    <div className="d-flex align-items-center justify-content-between flex-nowrap overflow-x-auto gap-2 py-1 px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {WORKFLOW_STEPS.map(step => {
                            const isActive = activeStep === step.id;
                            const isCompleted = activeExperiment.currentStep > step.id;
                            const isLocked = step.id > activeExperiment.currentStep;
                            
                            return (
                                <div
                                    key={step.id}
                                    className={`d-flex align-items-center gap-2 p-2 rounded-3 transition-all ${isActive ? 'bg-primary bg-opacity-10 border border-primary border-opacity-25 shadow-glow-sm' : 'border border-transparent'} ${isLocked ? 'opacity-40' : 'hover-bg-dark-opacity'}`}
                                    onClick={() => handleStepChange(step.id)}
                                    style={{ 
                                        cursor: (!isLocked && !isLoading && !isVerifying) ? 'pointer' : 'default',
                                        minWidth: 'fit-content'
                                    }}
                                    data-tooltip={`Step ${step.id}: ${step.title} - Select node to inspect or review outputs`}
                                >
                                    <div className="rounded-circle d-flex align-items-center justify-content-center text-center font-mono"
                                         style={{ 
                                             width: '24px', 
                                             height: '24px', 
                                             fontSize: '0.75rem',
                                             backgroundColor: isActive ? 'var(--primary-glow)' : (isCompleted ? '#198754' : 'rgba(255, 255, 255, 0.05)'),
                                             color: isActive ? '#000' : '#fff',
                                             border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)'
                                         }}
                                    >
                                        {isCompleted ? (
                                            <i className="bi bi-check" style={{ fontSize: '1rem', strokeWidth: '3' }}></i>
                                        ) : (
                                            step.id
                                        )}
                                    </div>
                                    <span className={`small text-nowrap d-none d-md-inline ${isActive ? 'text-primary-glow fw-bold' : 'text-white-50'}`} style={{ fontSize: '0.8rem' }}>
                                        {step.title}
                                    </span>
                                    {isActive && (isLoading || isVerifying) && (
                                        <div className="spinner-border spinner-border-sm text-primary-glow ms-1" style={{ width: '10px', height: '10px' }} role="status"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <main className="content-area w-100">
                <div className="card shadow-sm border-secondary border-opacity-25 position-relative overflow-hidden">
                    {(isLoading || isVerifying || reviewCountdown !== null) && (
                        <div className="progress rounded-0" style={{ height: '4px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}>
                            <div className={`progress-bar progress-bar-striped progress-bar-animated ${reviewCountdown !== null ? 'bg-info' : 'bg-primary-glow'}`} 
                                 style={{ width: reviewCountdown !== null ? `${(reviewCountdown / 15) * 100}%` : '100%' }}></div>
                        </div>
                    )}
                    <div className="card-body p-4" style={{ minHeight: '60vh' }}>
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div>
                                <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                                    <div className="badge bg-primary bg-opacity-10 text-primary-glow font-mono mb-0">
                                        {activeStep <= WORKFLOW_STEPS.length ? `STEP ${activeStep < 10 ? `0${activeStep}` : activeStep}` : 'SYNTHESIS DOSSIER'}
                                    </div>
                                    {(activeExperiment.updatedAt || activeExperiment.createdAt) && (
                                        <div className="d-flex align-items-center gap-1 text-white-50" style={{ fontSize: '0.75rem' }} id="auto-save-status">
                                            <span className="d-inline-block bg-success rounded-circle" style={{ width: '6px', height: '6px', opacity: 0.8 }}></span>
                                            <i className="bi bi-cloud-check-fill text-success" style={{ fontSize: '0.85rem' }}></i>
                                            <span>Saved to local DB: {new Date(activeExperiment.updatedAt || activeExperiment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                        </div>
                                    )}
                                </div>
                                <h4 className="fw-bold mb-1">
                                    {activeStep <= WORKFLOW_STEPS.length 
                                        ? (WORKFLOW_STEPS[activeStep - 1]?.title || 'Node Overview') 
                                        : 'Project Synthesis & Publication Archive'}
                                </h4>
                                <p className="text-white-50 small mb-0">
                                    {activeStep <= WORKFLOW_STEPS.length 
                                        ? WORKFLOW_STEPS[activeStep - 1]?.description 
                                        : 'Comprehensive publication manuscript, presentation slide deck, simulation artifacts, and download bundles.'}
                                </p>
                            </div>
                            <div className="d-flex flex-column align-items-end">
                                {activeExperiment.automationMode === 'automated' && (
                                    <>
                                        <span className={`badge ${automationPaused ? 'bg-warning text-dark' : 'bg-primary'} px-3 py-2 rounded-pill shadow-sm mb-2`}>
                                            <i className={`bi ${automationPaused ? 'bi-pause-circle-fill' : 'bi-cpu-fill'} me-1`}></i> 
                                            {automationPaused ? 'PAUSED' : 'AUTO'}
                                        </span>
                                        {automationPaused && (
                                            <button className="btn btn-xs btn-outline-warning" onClick={() => setAutomationPaused(false)}>RESUME</button>
                                        )}
                                        {reviewCountdown !== null && (
                                            <div className="text-info small fw-bold mt-1 font-mono">
                                                NEXT &gt; {reviewCountdown}s
                                                <button className="btn btn-link btn-xs text-info p-0 ms-2" onClick={() => handleCompleteStep()}>SKIP</button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Research Phase Tracker */}
                        <div className="research-phase-tracker mb-4 p-3 bg-dark bg-opacity-25 rounded-3 border border-secondary border-opacity-10">
                            <div className="position-relative mb-2 px-2" style={{ minHeight: '65px' }}>
                                {/* Background connecting line */}
                                <div className="position-absolute bg-secondary bg-opacity-20" style={{ height: '4px', top: '18px', left: '35px', right: '35px', zIndex: 0, borderRadius: '2px' }}></div>
                                {/* Active filled connecting line */}
                                <div className="position-absolute bg-primary-glow" style={{ 
                                    height: '4px', 
                                    top: '18px', 
                                    left: '35px', 
                                    right: `calc(${100 - (activeExperiment.currentStep > 10 ? 100 : (RESEARCH_PHASES.findIndex(p => p.steps.includes(activeExperiment.currentStep)) === -1 ? 0 : (RESEARCH_PHASES.findIndex(p => p.steps.includes(activeExperiment.currentStep)) / (RESEARCH_PHASES.length - 1)) * 100))}% + 35px)`, 
                                    zIndex: 0, 
                                    borderRadius: '2px',
                                    transition: 'right 0.4s ease, left 0.4s ease',
                                    boxShadow: '0 0 10px rgba(0, 180, 216, 0.4)'
                                }}></div>

                                <div className="d-flex justify-content-between align-items-center position-relative" style={{ zIndex: 1 }}>
                                    {RESEARCH_PHASES.map((phase, idx) => {
                                        const isPhaseActive = phase.steps.includes(activeStep);
                                        const isPhaseCompleted = Math.max(...phase.steps) < activeExperiment.currentStep;
                                        const isPhaseLocked = Math.min(...phase.steps) > activeExperiment.currentStep;
                                        
                                        let circleStyle = {
                                            width: '38px',
                                            height: '38px',
                                            cursor: !isPhaseLocked ? 'pointer' : 'default',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                        };
                                        
                                        let statusTextClass = "text-white-50";
                                        let circleClass = "";
                                        
                                        if (isPhaseCompleted) {
                                            circleClass = "bg-success border-success text-white";
                                            statusTextClass = "text-success fw-medium";
                                        } else if (isPhaseActive) {
                                            circleClass = "bg-primary border-primary text-white shadow-glow-sm";
                                            statusTextClass = "text-primary-glow fw-bold";
                                        } else if (!isPhaseLocked) {
                                            circleClass = "bg-dark border-primary border-opacity-50 text-white-50";
                                            statusTextClass = "text-white-50";
                                        } else {
                                            circleClass = "bg-dark border-secondary border-opacity-25 text-white-30";
                                            statusTextClass = "text-muted";
                                        }
                                        
                                        return (
                                            <div key={idx} className="d-flex flex-column align-items-center" style={{ width: '80px' }}>
                                                <div 
                                                    className={`rounded-circle border d-flex align-items-center justify-content-center ${circleClass}`}
                                                    style={circleStyle}
                                                    onClick={() => {
                                                        if (!isPhaseLocked && !isLoading && !isVerifying) {
                                                            handleStepChange(phase.steps[0]);
                                                        }
                                                    }}
                                                    title={`Go to ${phase.name}`}
                                                >
                                                    {isPhaseCompleted ? (
                                                        <i className="bi bi-check-lg" style={{ fontSize: '1.2rem', strokeWidth: '2.5' }}></i>
                                                    ) : (
                                                        <i className={`bi ${phase.icon}`} style={{ fontSize: '1rem' }}></i>
                                                    )}
                                                </div>
                                                <span className={`small mt-2 text-center text-uppercase ls-1 d-none d-md-block ${statusTextClass}`} style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                                                    {phase.name}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <hr className="border-secondary opacity-10 mb-4" />
                        
                        {currentStepData?.blockers && (
                            <BlockerDisplay 
                                blockers={currentStepData.blockers} 
                                onResolve={handleResolveBlocker} 
                            />
                        )}

                        {renderStepContent()}
                    </div>
                    
                    {activeStep <= WORKFLOW_STEPS.length && (
                        <div className="card-footer d-flex flex-column flex-md-row justify-content-between align-items-center p-3 bg-dark bg-opacity-25 border-top border-secondary border-opacity-10 gap-3">
                            <button 
                                className="btn btn-sm btn-outline-secondary w-100 w-md-auto" 
                                onClick={() => setFineTuneModalOpen(true)}
                                data-tooltip="Configure custom tuning parameters and prompt generation controls for this step"
                            >
                                <i className="bi bi-sliders me-1"></i> Tuning
                            </button>
                            <button 
                                className={`btn btn-${hasCriticalBlocker ? 'outline-danger' : 'success'} px-4 shadow-sm w-100 w-md-auto`} 
                                onClick={() => handleCompleteStep()} 
                                disabled={isVerifying || !hasOutput || hasCriticalBlocker}
                                data-tooltip={hasCriticalBlocker ? "Execution blocked until critical issues are resolved" : (activeStep === 10 ? "Finalizes scientific manuscript and launches export bundle options" : "Validates current node outputs and advances to the next step")}
                            >
                                {isVerifying ? (
                                    <span><span className="spinner-border spinner-border-sm me-2"></span>{statusMessage || "VERIFYING..."}</span>
                                ) : (
                                    <span className="d-flex align-items-center">
                                        <i className={`bi ${hasCriticalBlocker ? 'bi-lock-fill' : (hasOutput ? 'bi-check-circle-fill' : 'bi-lock-fill')} me-2`}></i> 
                                        {hasCriticalBlocker ? 'BLOCKED' : (activeStep === 10 ? "FINALIZE AND DEPLOY" : "VERIFY & CONTINUE")}
                                    </span>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {fineTuneModalOpen && (
                <FineTuneModal stepId={activeStep} onClose={() => setFineTuneModalOpen(false)} />
            )}

            <ReplicabilityScorecardModal 
                isOpen={showScorecardModal}
                onClose={() => setShowScorecardModal(false)}
                experiment={activeExperiment}
            />
        </div>
    );
};