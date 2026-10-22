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
import { WORKFLOW_STEPS, RESEARCH_QUESTION_SCHEMA, DATA_ANALYSIS_IMAGE_OUTPUT_SCHEMA, LITERATURE_REVIEW_SCHEMA, HYPOTHESIS_TREE_SCHEMA, Blocker } from '../../config';

import { DataEntryWorkspace } from '../steps/DataEntryWorkspace';
import { ExperimentRunner } from '../steps/runner/ExperimentRunner';
import { DataAnalysisWorkspace } from '../steps/DataAnalysisWorkspace';
import { PublicationExporter } from '../steps/PublicationExporter';
import { EditableStepInput } from '../steps/EditableStepInput';
import { GeneratedOutput } from '../common/GeneratedOutput';
import { RunningManAnimation } from '../common/RunningManAnimation';
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
import { StopProcessModal } from './StopProcessModal';
import { StepResultEditorModal } from './StepResultEditorModal';

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

    // Manual control and editing state
    const [showStopConfirmModal, setShowStopConfirmModal] = useState(false);
    const [showResultEditor, setShowResultEditor] = useState(false);
    const [autoGenerateStepInManual, setAutoGenerateStepInManual] = useState<number | null>(null);

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
        if (mode !== 'automated' || activeStep !== activeExperiment.currentStep) return;

        const stepData = (activeExperiment.stepData && activeExperiment.stepData[activeStep]) || {};
        const isAgenticStep = [2, 6, 7, 8, 9, 10].includes(activeStep);
        
        const hasCriticalBlockers = stepData?.blockers?.some(b => b.severity === 'critical' && !b.resolved);
        if (hasCriticalBlockers) {
            setAutomationPaused(true);
            addToast("Automation paused: Critical blockers detected.", "warning");
            return;
        }

        // Case 1: Non-agentic step needs generation (e.g. Step 1, 3, 4, 5)
        if (!stepData?.output && !isAgenticStep) {
            const now = Date.now();
            const timeSinceLast = now - lastAutomationTick.current;
            if (timeSinceLast < 2000) {
                const timerId = setTimeout(() => {
                    if (isMounted.current && !isLoading && !isVerifying) {
                        lastAutomationTick.current = Date.now();
                        handleGenerate();
                    }
                }, 2000 - timeSinceLast);
                return () => clearTimeout(timerId);
            }
            lastAutomationTick.current = now;
            handleGenerate();
            return;
        }

        // Case 2: Output exists for non-agentic step -> advance or countdown
        if (stepData?.output && !isAgenticStep) {
            if (stepData?.summary) {
                // Already summarized and verified -> advance immediately
                handleCompleteStep();
                return;
            }
            // Start visual countdown for user visibility and ability to skip
            const timerId = setTimeout(() => {
                if (isMounted.current && !automationPaused && reviewCountdown === null) {
                    setReviewCountdown(5);
                }
            }, 500);
            return () => clearTimeout(timerId);
        }
    }, [activeExperiment, activeStep, isAuthenticated, isLoading, isVerifying, automationPaused, reviewCountdown, addToast]);

    // Manual Pipeline Progression Engine: Trigger next step generation after user verified previous step
    useEffect(() => {
        if (!activeExperiment || !isAuthenticated || isLoading || isVerifying) return;
        if (activeExperiment.automationMode !== 'manual') return;
        if (autoGenerateStepInManual === null) return;
        
        if (autoGenerateStepInManual === activeStep) {
            const targetStep = autoGenerateStepInManual;
            setAutoGenerateStepInManual(null);
            
            const stepData = activeExperiment.stepData?.[targetStep];
            const isAgenticStep = [2, 6, 7, 8, 9, 10].includes(targetStep);
            
            // Only auto-generate if the step doesn't already have output
            if (!stepData?.output) {
                if (!isAgenticStep || targetStep === 3) {
                    const timerId = setTimeout(() => {
                        if (isMounted.current && !isLoading && !isVerifying) {
                            addToast(`Manual pipeline: Synthesizing Step ${targetStep} based on previous verified content...`, 'info');
                            handleGenerate();
                        }
                    }, 350);
                    return () => clearTimeout(timerId);
                } else {
                    addToast(`Manual pipeline: Step ${targetStep} initialized with verified context.`, 'info');
                }
            }
        }
    }, [autoGenerateStepInManual, activeStep, activeExperiment, isAuthenticated, isLoading, isVerifying, addToast]);

    // Manual Halt / Stop Handler
    const handleConfirmStop = () => {
        if (streamInterval.current) {
            clearInterval(streamInterval.current);
            streamInterval.current = null;
        }
        if (countdownInterval.current) {
            clearInterval(countdownInterval.current);
            countdownInterval.current = null;
        }
        setReviewCountdown(null);
        setIsLoading(false);
        setIsVerifying(false);
        setStreamingText(null);
        setStatusMessage("");
        setAutomationPaused(true);
        setAutoGenerateStepInManual(null);

        if (activeExperiment) {
            updateExperiment({
                ...activeExperiment,
                automationMode: 'manual'
            });
        }

        setShowStopConfirmModal(false);
        addToast("Process stopped by user. Research session is now in manual control mode.", "info");
    };

    // User Save Edits Handler
    const handleSaveStepEdits = async (editedOutput: string) => {
        if (!activeExperiment) return;
        const currentData = activeExperiment.stepData?.[activeStep] || {};
        
        let freshSummary = "";
        try {
            freshSummary = await generateNodeSummary(editedOutput, activeExperiment.field);
        } catch {
            freshSummary = editedOutput.slice(0, 200);
        }

        const updatedStepData = {
            ...currentData,
            output: editedOutput,
            summary: freshSummary,
            isUserEdited: true,
            editedAt: new Date().toISOString(),
            originalOutput: currentData.originalOutput || currentData.output
        };

        const updatedExperiment = {
            ...activeExperiment,
            stepData: {
                ...activeExperiment.stepData,
                [activeStep]: updatedStepData
            }
        };

        await updateExperiment(updatedExperiment);
        setShowResultEditor(false);
        addToast(`Step ${activeStep} result updated with your edits.`, "success");
    };

    // User Save & Verify Step Handler
    const handleSaveAndVerifyStep = async (editedOutput: string) => {
        if (!activeExperiment) return;
        await handleSaveStepEdits(editedOutput);
        await handleCompleteStep({ output: editedOutput, isUserEdited: true });
    };

    const handleStepChange = useCallback((stepId: number) => {
        if (isLoading || isVerifying) return;
        setStreamingText(null);
        setActiveStep(stepId);
        setAutomationPaused(false);
        setReviewCountdown(null);
        if (isMobile) setIsSidebarExpanded(false);
        autoRetryAttempts.current[stepId] = 0;
    }, [isLoading, isVerifying, isMobile]);

    const [isAutoResolving, setIsAutoResolving] = useState(false);

    const handleResolveBlocker = async (blockerId: string) => {
        if (!activeExperiment) return;
        const stepData = { ...(activeExperiment.stepData || {}) };
        const currentStepData = { ...(stepData[activeStep] || {}) };
        const blockers = (currentStepData.blockers || []).map(b => 
            b.id === blockerId ? { ...b, resolved: true } : b
        );
        stepData[activeStep] = { ...currentStepData, blockers };
        await updateExperiment({ ...activeExperiment, stepData });
        addToast("Blocker mitigation logged by user.", "success");
    };

    const handleAutoResolveBlocker = async (blocker: Blocker) => {
        if (!activeExperiment || isLoading || isVerifying || isAutoResolving) return;

        setIsAutoResolving(true);
        setAutomationPaused(false);
        const sourceStep = activeStep;
        const blockerMsg = blocker.msg;
        const blockerDirective = `resolve the blocker issue: ${blockerMsg}`;

        addToast(`Auto-resolving blocker at root source: rewinding to Step 6 (Data Acquisition & Simulation)...`, "info");

        try {
            // 1. Mark blocker as resolved on originating step
            const stepData = { ...(activeExperiment.stepData || {}) };
            const currentStepData = { ...(stepData[sourceStep] || {}) };
            const blockers = (currentStepData.blockers || []).map(b => 
                b.id === blocker.id ? { ...b, resolved: true } : b
            );
            stepData[sourceStep] = { ...currentStepData, blockers };

            // 2. Prepare Step 6 for re-run: clear old data/code and insert the blocker issue into prompts
            const prevStep6 = stepData[6] || {};
            stepData[6] = {
                ...prevStep6,
                input: undefined,
                output: undefined,
                summary: undefined,
                simulationCode: undefined, // Clear old code so fresh code is generated addressing the blocker
                blockerDirective: blockerDirective,
                isUserEdited: false
            };

            // 3. Invalidate downstream steps (7 through sourceStep) that relied on the blocked data
            for (let s = 7; s <= Math.max(sourceStep, 7); s++) {
                if (stepData[s]) {
                    stepData[s] = {
                        ...stepData[s],
                        output: undefined,
                        summary: undefined,
                        isUserEdited: false
                    };
                }
            }

            const activeBlockerResolution = {
                blockerId: blocker.id,
                msg: blockerMsg,
                sourceStep: sourceStep,
                timestamp: new Date().toISOString()
            };

            const updatedExperiment = {
                ...activeExperiment,
                currentStep: 6,
                stepData,
                activeBlockerResolution
            };

            await updateExperiment(updatedExperiment);
            setActiveStep(6);

            // In manual mode, indicate Step 6 should auto-generate so the simulation / data collection runs immediately,
            // then stops upon completion to allow user review/edit per manual mode requirements.
            setAutoGenerateStepInManual(6);

            addToast(`Rewound to Step 6: Data collection & simulation will rerun with blocker directive: "${blockerMsg}".`, "success");
        } catch (err: any) {
            console.error("Auto resolve error:", err);
            addToast("Failed to auto-resolve blocker.", "danger");
        } finally {
            setIsAutoResolving(false);
        }
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

                const model = 'gemini-3.8-flash';
                
                const output = await executeStepWorkflow(model, { contents: basePrompt, config }, context, true, schema);
                
                if (isMounted.current) {
                    await updateExperiment({ 
                        ...activeExperiment, 
                        stepData: { ...activeExperiment.stepData, [activeStep]: { ...(activeExperiment.stepData?.[activeStep] || {}), output } } 
                    });
                }
            } else if (streamingEnabled) {
                const stream = await callGeminiStreamWithRetry(
                    'gemini-3.8-flash', 
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
                    'gemini-3.8-flash', 
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
            // Recalculate summary from edited content if user edited or override output provided
            let summary = (currentStepData.isUserEdited || stepDataOverride?.output) ? undefined : currentStepData.summary;
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

            const updatedExp = { 
                ...activeExperiment, 
                stepData: updatedStepDataMap, 
                currentStep: nextStepId,
                activeBlockerResolution: activeStep === 6 ? null : activeExperiment.activeBlockerResolution 
            };
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
                addToast(`Step ${activeStep} verified.`, "success");
                setActiveStep(nextStepId);
                
                // Force automation to resume immediately if applicable
                if (activeExperiment.automationMode === 'automated') {
                    setAutomationPaused(false);
                    lastAutomationTick.current = 0; // Reset tick to trigger immediate effect
                } else if (activeExperiment.automationMode === 'manual' && nextStepId <= WORKFLOW_STEPS.length) {
                    // In manual mode, automatically proceed to generate next step based on previous edited content!
                    setAutoGenerateStepInManual(nextStepId);
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
            setReviewCountdown(5);
        }
    };

    const renderStepContent = () => {
        if (!activeExperiment) return null;
        if (activeStep > WORKFLOW_STEPS.length) return <ProjectCompletionView />;
        if (activeExperiment.currentStep === 2 && activeExperiment.automationMode === null) {
            return <AutomationModeSelector onSelect={(mode) => updateExperiment({...activeExperiment, automationMode: mode})} />;
        }
        
        if (activeStep === 2) return (
            <LiteratureReviewWorkspace 
                onStepComplete={() => handleAutoAdvance(2)} 
                autoStart={autoGenerateStepInManual === 2 || activeExperiment.automationMode === 'automated'}
                onOpenEditor={() => setShowResultEditor(true)}
            />
        );
        if (activeStep === 3) return (
            <HypothesisWorkspace 
                onStepComplete={() => handleCompleteStep()} 
                onGenerate={(feedback) => handleGenerate(feedback)} 
                isLoading={isLoading} 
            />
        );
        if (activeStep === 6) {
             const step6Blocker = activeExperiment.stepData[6]?.blockerDirective || activeExperiment.activeBlockerResolution?.msg;
             if (activeExperiment.experimentMode === 'physical') {
                 return (
                     <DataEntryWorkspace 
                         experiment={activeExperiment} 
                         blockerDirective={step6Blocker}
                         onComplete={(data) => handleCompleteStep({ output: JSON.stringify(data), input: JSON.stringify(data) })} 
                     />
                 );
             } else {
                 return (
                     <ExperimentRunner 
                         onStepComplete={(data: any) => { handleCompleteStep(data); }} 
                         autoStart={autoGenerateStepInManual === 6 || activeExperiment.automationMode === 'automated'}
                         onOpenEditor={() => setShowResultEditor(true)}
                     />
                 );
             }
        }
        if (activeStep === 7) return (
            <DataAnalysisWorkspace 
                onStepComplete={() => handleAutoAdvance(7)} 
                onAnalysisFailure={handleAnalysisFailure} 
                autoStart={autoGenerateStepInManual === 7 || activeExperiment.automationMode === 'automated'}
                onOpenEditor={() => setShowResultEditor(true)}
            />
        );
        if (activeStep === 8) return (
            <InterpretationWorkspace 
                onStepComplete={() => handleAutoAdvance(8)} 
                autoStart={autoGenerateStepInManual === 8 || activeExperiment.automationMode === 'automated'}
                onOpenEditor={() => setShowResultEditor(true)}
            />
        );
        if (activeStep === 9) return (
            <PeerReviewWorkspace 
                onStepComplete={() => handleAutoAdvance(9)} 
                autoStart={autoGenerateStepInManual === 9 || activeExperiment.automationMode === 'automated'}
                onOpenEditor={() => setShowResultEditor(true)}
            />
        );
        if (activeStep === 10) return <PublicationExporter />;

        return (
            <div className="discovery-view">
                {activeStep === 1 && activeExperiment.automationMode === null && (
                    <div className="alert border-primary border-opacity-25 bg-dark bg-opacity-40 p-3 rounded-3 mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
                        <div className="d-flex align-items-center gap-2.5">
                            <div className="p-2 rounded-circle bg-primary bg-opacity-10 text-primary-glow border border-primary border-opacity-20 shrink-0">
                                <i className="bi bi-cpu-fill fs-5"></i>
                            </div>
                            <div>
                                <strong className="text-white d-block small font-mono">AUTONOMOUS RESEARCH PROTOCOL AVAILABLE</strong>
                                <span className="text-white-50" style={{ fontSize: '0.8rem' }}>
                                    Engage the AI Principal Investigator to execute the entire research arc autonomously, or continue with manual oversight.
                                </span>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2 w-100 w-sm-auto justify-content-end shrink-0">
                            <button 
                                className="btn btn-sm btn-primary fw-bold text-dark d-flex align-items-center gap-1.5 px-3"
                                onClick={() => {
                                    updateExperiment({ ...activeExperiment, automationMode: 'automated' });
                                    setAutomationPaused(false);
                                    lastAutomationTick.current = 0;
                                    addToast("Autonomous protocol engaged: Auto-advancing pipeline from Step 1 to Publication.", "success");
                                }}
                            >
                                <i className="bi bi-lightning-charge-fill"></i>
                                <span>Start Auto-Sequence</span>
                            </button>
                            <button 
                                className="btn btn-sm btn-outline-secondary text-white-50 px-2.5"
                                onClick={() => {
                                    updateExperiment({ ...activeExperiment, automationMode: 'manual' });
                                    addToast("Manual forensic oversight active.", "info");
                                }}
                            >
                                Manual
                            </button>
                        </div>
                    </div>
                )}
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

    const handleDownloadProject = () => {
        if (!activeExperiment) return;
        try {
            const projectExport = {
                version: '2.5.0',
                exportedAt: new Date().toISOString(),
                experiment: activeExperiment
            };
            const jsonString = JSON.stringify(projectExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const safeTitle = (activeExperiment.title || 'untitled_project')
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '_')
                .replace(/_+/g, '_')
                .slice(0, 40);
            const fileName = `hypatia_project_${safeTitle}_${activeExperiment.id?.slice(-6) || Date.now()}.json`;

            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            addToast(`Project "${activeExperiment.title || 'Untitled'}" downloaded successfully as JSON.`, 'success');
        } catch (error: any) {
            console.error('Download project failed:', error);
            addToast('Failed to download project JSON file.', 'danger');
        }
    };

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
                        <button 
                            className="btn btn-xs rounded-pill btn-outline-info text-white d-flex align-items-center gap-1"
                            onClick={handleDownloadProject}
                            title="Download complete experiment data as JSON file for offline backup and local saving"
                            data-tooltip="Downloads current experiment data and all step outputs as a JSON file"
                        >
                            <i className="bi bi-download text-info"></i>
                            <span>Download Project</span>
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
                                    <div className="rounded-circle d-flex align-items-center justify-content-center text-center font-mono overflow-hidden"
                                         style={{ 
                                             width: '24px', 
                                             height: '24px', 
                                             fontSize: '0.75rem',
                                             backgroundColor: isActive ? 'var(--primary-glow)' : (isCompleted ? '#198754' : 'rgba(255, 255, 255, 0.05)'),
                                             color: isActive ? '#000' : '#fff',
                                             border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)'
                                         }}
                                    >
                                        {isActive && (isLoading || isVerifying) ? (
                                            <RunningManAnimation size="xs" color="#000" showTrack={false} />
                                        ) : isCompleted ? (
                                            <i className="bi bi-check" style={{ fontSize: '1rem', strokeWidth: '3' }}></i>
                                        ) : (
                                            step.id
                                        )}
                                    </div>
                                    <span className={`small text-nowrap d-none d-md-inline ${isActive ? 'text-primary-glow fw-bold' : 'text-white-50'}`} style={{ fontSize: '0.8rem' }}>
                                        {step.title}
                                    </span>
                                    {isActive && (isLoading || isVerifying) && (
                                        <div className="d-inline-flex align-items-center gap-1 ms-1">
                                            <RunningManAnimation size="xs" color="var(--primary-glow)" inline showTrack={false} />
                                            <span className="spinner-border spinner-border-sm text-primary-glow" style={{ width: '8px', height: '8px' }} role="status"></span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Dedicated Mobile Step Header Banner */}
            <div className="d-block d-md-none p-2.5 bg-dark bg-opacity-40 border border-secondary border-opacity-25 rounded-3 mb-1">
                <div className="d-flex align-items-center justify-content-between gap-2">
                    <div className="d-flex align-items-center gap-2 text-truncate">
                        <span className="badge bg-primary-glow text-dark font-mono shrink-0">
                            Step {activeStep}/10
                        </span>
                        <span className="fw-bold text-white small font-mono text-truncate">
                            {WORKFLOW_STEPS[activeStep - 1]?.title || 'Research Stage'}
                        </span>
                    </div>
                    <div className="d-flex align-items-center gap-1 shrink-0">
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-xs py-1 px-2 text-white"
                            disabled={activeStep <= 1 || isLoading || isVerifying}
                            onClick={() => handleStepChange(activeStep - 1)}
                            aria-label="Previous Step"
                            title="Previous Step"
                        >
                            <i className="bi bi-chevron-left"></i>
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-xs py-1 px-2 text-white"
                            disabled={activeStep >= (activeExperiment?.currentStep || 1) || isLoading || isVerifying}
                            onClick={() => handleStepChange(activeStep + 1)}
                            aria-label="Next Step"
                            title="Next Step"
                        >
                            <i className="bi bi-chevron-right"></i>
                        </button>
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
                    <div className="card-body p-3 p-md-4" style={{ minHeight: '60vh' }}>
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div>
                                <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                                    <div className="badge bg-primary bg-opacity-10 text-primary-glow font-mono mb-0">
                                        {activeStep <= WORKFLOW_STEPS.length ? `STEP ${activeStep < 10 ? `0${activeStep}` : activeStep}` : 'SYNTHESIS DOSSIER'}
                                    </div>
                                    {(isLoading || isVerifying) && (
                                        <span className="badge bg-info bg-opacity-15 text-info border border-info border-opacity-30 d-inline-flex align-items-center gap-1.5 px-2.5 py-1 font-mono">
                                            <RunningManAnimation size="xs" color="#38bdf8" showTrack={false} />
                                            <span>Phase Running</span>
                                        </span>
                                    )}
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
                                {activeExperiment.automationMode === 'automated' ? (
                                    <div className="d-flex flex-column align-items-end gap-1.5">
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={`badge ${automationPaused ? 'bg-warning text-dark' : 'bg-primary'} px-3 py-2 rounded-pill shadow-sm d-flex align-items-center gap-1.5`}>
                                                <i className={`bi ${automationPaused ? 'bi-pause-circle-fill' : 'bi-cpu-fill'} me-1`}></i> 
                                                <span>{automationPaused ? 'AUTO PAUSED' : 'AUTO ARC ACTIVE'}</span>
                                            </span>
                                            {automationPaused ? (
                                                <button className="btn btn-xs btn-outline-warning fw-bold" onClick={() => setAutomationPaused(false)}>
                                                    <i className="bi bi-play-fill me-1"></i>RESUME
                                                </button>
                                            ) : (
                                                <button className="btn btn-xs btn-outline-secondary text-white-50" onClick={() => setAutomationPaused(true)} title="Pause autonomous advancement">
                                                    <i className="bi bi-pause-fill me-1"></i>PAUSE
                                                </button>
                                            )}
                                            <button 
                                                className="btn btn-xs btn-danger fw-bold d-flex align-items-center gap-1 shadow-sm"
                                                onClick={() => setShowStopConfirmModal(true)}
                                                title="Stop the ongoing process"
                                            >
                                                <i className="bi bi-stop-circle-fill"></i> STOP
                                            </button>
                                            <button 
                                                className="btn btn-xs btn-outline-secondary text-white-50"
                                                onClick={() => {
                                                    updateExperiment({ ...activeExperiment, automationMode: 'manual' });
                                                    setReviewCountdown(null);
                                                    addToast("Switched to manual control.", "info");
                                                }}
                                                title="Switch to manual step-by-step control"
                                            >
                                                Manual
                                            </button>
                                        </div>
                                        {reviewCountdown !== null && (
                                            <div className="text-info small fw-bold font-mono d-flex align-items-center gap-1.5 bg-dark bg-opacity-75 px-2.5 py-1 rounded border border-info border-opacity-30">
                                                <span className="spinner-grow spinner-grow-sm text-info me-1" style={{ width: '8px', height: '8px' }}></span>
                                                <span>AUTO ADVANCE IN {reviewCountdown}s</span>
                                                <button className="btn btn-link btn-xs text-info p-0 ms-2 text-decoration-none fw-bold" onClick={() => handleCompleteStep()}>
                                                    SKIP <i className="bi bi-chevron-double-right"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="d-flex align-items-center gap-2">
                                        {(isLoading || isVerifying || isAutoResolving) && (
                                            <button 
                                                className="btn btn-sm btn-danger fw-bold d-flex align-items-center gap-1.5 shadow-sm px-2.5 py-1.5"
                                                onClick={() => setShowStopConfirmModal(true)}
                                                title="Stop the current running process"
                                            >
                                                <i className="bi bi-stop-circle-fill"></i>
                                                <span className="small font-mono">STOP PROCESS</span>
                                            </button>
                                        )}
                                        <button 
                                            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1.5 shadow-sm"
                                            onClick={() => {
                                                updateExperiment({ ...activeExperiment, automationMode: 'automated' });
                                                setAutomationPaused(false);
                                                lastAutomationTick.current = 0;
                                                addToast("Engaged Autonomous Pipeline.", "success");
                                            }}
                                            title="Enable autonomous discovery pipeline"
                                        >
                                            <i className="bi bi-cpu-fill text-primary-glow"></i>
                                            <span className="small font-mono fw-bold">ENGAGE AUTO ARC</span>
                                        </button>
                                    </div>
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
                                                    className={`rounded-circle border d-flex align-items-center justify-content-center overflow-hidden ${circleClass}`}
                                                    style={circleStyle}
                                                    onClick={() => {
                                                        if (!isPhaseLocked && !isLoading && !isVerifying) {
                                                             handleStepChange(phase.steps[0]);
                                                        }
                                                    }}
                                                    title={`Go to ${phase.name}`}
                                                >
                                                    {isPhaseActive && (isLoading || isVerifying) ? (
                                                        <RunningManAnimation size="xs" color="#000" showTrack={false} />
                                                    ) : isPhaseCompleted ? (
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
                        
                        {activeExperiment?.activeBlockerResolution && activeStep === 6 && (
                            <div className="alert alert-info border border-info d-flex align-items-center justify-content-between p-3 mb-4 shadow-sm animate-in">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="p-2 rounded bg-info bg-opacity-20 text-info">
                                        <i className="bi bi-arrow-repeat spin fs-4"></i>
                                    </div>
                                    <div>
                                        <div className="fw-bold text-uppercase small ls-1 text-info">
                                            Root-Cause Blocker Resolution Active (Step 6)
                                        </div>
                                        <div className="small text-white-50">
                                            Rerunning Data Collection &amp; Simulation to unblock issue from Step {activeExperiment.activeBlockerResolution.sourceStep}: 
                                            <span className="text-white fw-bold ms-1">"{activeExperiment.activeBlockerResolution.msg}"</span>.
                                            Directives inserted into simulation and collection prompts.
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    className="btn btn-xs btn-outline-light text-nowrap"
                                    onClick={async () => {
                                        await updateExperiment({ ...activeExperiment, activeBlockerResolution: null });
                                    }}
                                    title="Dismiss root-cause resolution banner"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}

                        {currentStepData?.blockers && (
                            <BlockerDisplay 
                                blockers={currentStepData.blockers} 
                                onResolve={handleResolveBlocker} 
                                onAutoResolve={handleAutoResolveBlocker}
                                isAutoResolving={isAutoResolving}
                            />
                        )}

                        {/* Running Man Animation starting when step/phase starts and ending when artifact(s) is rendered */}
                        {(isLoading || isVerifying) && (
                            <div className="card border-primary border-opacity-30 bg-black bg-opacity-40 p-3 mb-4 shadow-sm animate-pulse">
                                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                                    <div className="d-flex align-items-center gap-3">
                                        <RunningManAnimation 
                                            size="md" 
                                            color="var(--primary-glow)"
                                            label={`Phase/Step ${activeStep}: ${WORKFLOW_STEPS[activeStep - 1]?.title || 'Research Stage'} In Progress`}
                                            sublabel={statusMessage || "AI Agents executing scientific synthesis & empirical verification..."}
                                        />
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="badge bg-primary bg-opacity-20 text-primary-glow font-mono small border border-primary border-opacity-25 px-2.5 py-1">
                                            <i className="bi bi-cpu me-1"></i> Running Pipeline
                                        </span>
                                        <button 
                                            className="btn btn-danger btn-xs fw-bold d-flex align-items-center gap-1 px-2.5 py-1 shadow-sm"
                                            onClick={() => setShowStopConfirmModal(true)}
                                            title="Stop the current running process"
                                        >
                                            <i className="bi bi-stop-circle-fill"></i> STOP
                                        </button>
                                    </div>
                                </div>
                                <div className="progress mt-2.5 bg-dark" style={{ height: '3px' }}>
                                    <div className="progress-bar progress-bar-striped progress-bar-animated bg-primary-glow w-100"></div>
                                </div>
                            </div>
                        )}

                        {/* Manual Mode Review & Edit Notice: shown whenever step has output and mode is manual */}
                        {activeExperiment.automationMode === 'manual' && currentStepData?.output && !isLoading && !isVerifying && (
                            <div className="alert border-info border-opacity-30 bg-black bg-opacity-40 p-3 rounded-3 mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 shadow-sm animate-in">
                                <div className="d-flex align-items-center gap-2.5">
                                    <div className="p-2 rounded-circle bg-info bg-opacity-15 text-info border border-info border-opacity-30 d-flex align-items-center justify-content-center shrink-0">
                                        <i className="bi bi-pencil-square fs-5"></i>
                                    </div>
                                    <div>
                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                            <strong className="text-white small font-mono">
                                                STEP {activeStep} COMPLETE &bull; MANUAL REVIEW
                                            </strong>
                                            {currentStepData.isUserEdited && (
                                                <span className="badge bg-warning bg-opacity-20 text-warning border border-warning border-opacity-30 font-mono" style={{ fontSize: '0.68rem' }}>
                                                    <i className="bi bi-check2 me-1"></i> EDITED
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-white-50" style={{ fontSize: '0.78rem' }}>
                                            Review or edit this step's output below. When you click Verify, Step {activeStep < WORKFLOW_STEPS.length ? activeStep + 1 : '10'} will generate based on your edited content.
                                        </span>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-2 w-100 w-sm-auto justify-content-end shrink-0">
                                    <button 
                                        className="btn btn-sm btn-outline-info fw-bold d-flex align-items-center gap-1.5 px-3 py-1.5"
                                        onClick={() => setShowResultEditor(true)}
                                        title="Edit the result of this step"
                                    >
                                        <i className="bi bi-pencil-fill"></i>
                                        <span>Edit Step {activeStep} Result</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {renderStepContent()}
                    </div>
                    
                    {activeStep <= WORKFLOW_STEPS.length && (
                        <div className="card-footer d-flex flex-column flex-md-row justify-content-between align-items-center p-3 bg-dark bg-opacity-25 border-top border-secondary border-opacity-10 gap-3">
                            <div className="d-flex align-items-center gap-2 w-100 w-md-auto flex-wrap">
                                <button 
                                    className="btn btn-sm btn-outline-secondary" 
                                    onClick={() => setFineTuneModalOpen(true)}
                                    data-tooltip="Configure custom tuning parameters and prompt generation controls for this step"
                                >
                                    <i className="bi bi-sliders me-1"></i> Tuning
                                </button>
                                <button 
                                    className="btn btn-sm btn-outline-info text-white d-flex align-items-center gap-1.5" 
                                    onClick={handleDownloadProject}
                                    data-tooltip="Exports current experiment data as a JSON file, allowing users to save their work locally"
                                    title="Download Project JSON"
                                >
                                    <i className="bi bi-download text-info"></i>
                                    <span>Download Project</span>
                                </button>
                                {hasOutput && (
                                    <button 
                                        className="btn btn-sm btn-outline-info text-white d-flex align-items-center gap-1.5" 
                                        onClick={() => setShowResultEditor(true)}
                                        data-tooltip="Edit the generated output for this step"
                                        title="Edit Step Result"
                                    >
                                        <i className="bi bi-pencil-square text-info"></i>
                                        <span>Edit Result</span>
                                    </button>
                                )}
                            </div>
                            <button 
                                className={`btn btn-${hasCriticalBlocker ? 'outline-danger' : 'success'} px-4 shadow-sm w-100 w-md-auto fw-bold`} 
                                onClick={() => handleCompleteStep()} 
                                disabled={isVerifying || !hasOutput || hasCriticalBlocker}
                                data-tooltip={hasCriticalBlocker ? "Execution blocked until critical issues are resolved" : (activeStep === 10 ? "Finalizes scientific manuscript and launches export bundle options" : "Validates current node outputs and advances to the next step")}
                            >
                                {isVerifying ? (
                                    <span><span className="spinner-border spinner-border-sm me-2"></span>{statusMessage || "VERIFYING..."}</span>
                                ) : (
                                    <span className="d-flex align-items-center">
                                        <i className={`bi ${hasCriticalBlocker ? 'bi-lock-fill' : (hasOutput ? 'bi-check-circle-fill' : 'bi-lock-fill')} me-2`}></i> 
                                        {hasCriticalBlocker 
                                            ? 'BLOCKED' 
                                            : (activeStep === 10 
                                                ? "FINALIZE AND DEPLOY" 
                                                : (activeExperiment.automationMode === 'manual' 
                                                    ? `VERIFY & GENERATE STEP ${activeStep + 1} »` 
                                                    : "VERIFY & CONTINUE"))}
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

            <StopProcessModal 
                isOpen={showStopConfirmModal}
                onConfirm={handleConfirmStop}
                onCancel={() => setShowStopConfirmModal(false)}
                currentStep={activeStep}
                stepTitle={WORKFLOW_STEPS[activeStep - 1]?.title}
                isGenerating={isLoading || isVerifying}
            />

            <StepResultEditorModal 
                isOpen={showResultEditor}
                onClose={() => setShowResultEditor(false)}
                stepId={activeStep}
                stepTitle={WORKFLOW_STEPS[activeStep - 1]?.title || `Step ${activeStep}`}
                currentOutput={currentStepData?.output || ''}
                originalOutput={currentStepData?.originalOutput}
                onSave={handleSaveStepEdits}
                onSaveAndVerify={handleSaveAndVerifyStep}
            />
        </div>
    );
};