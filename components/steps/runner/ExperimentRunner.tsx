
import React, { useState, useMemo, useEffect } from 'react';
import { useExperiment } from '../../../services';
import { useToast } from '../../../toast';
import { ModeSelection } from './ModeSelection';
import { CodeSimulator } from './CodeSimulator';
import { ManualDataEntry } from './ManualDataEntry';
import { DataSynthesizer } from './DataSynthesizer';
import { DataUploader } from '../../landing/DataUploader';
import { cleanAndFormatCsv } from '../../../utils/csvUtils';
import { DatasetViewer } from './DatasetViewer';

type ExperimentMode = 'simulate' | 'manual' | 'synthesize' | 'upload';

export const ExperimentRunner = ({ onStepComplete }) => {
    const [mode, setMode] = useState<ExperimentMode | null>(null);
    const { addToast } = useToast();
    const { activeExperiment } = useExperiment();
    const [forceShowSelector, setForceShowSelector] = useState(false);

    const existingCsv = activeExperiment.stepData[6]?.input;
    const existingSummary = activeExperiment.stepData[6]?.summary || activeExperiment.stepData[6]?.output || "";
    const existingCode = activeExperiment.stepData[6]?.simulationCode;

    // Reset forceShowSelector when experiment shifts or step is cleared
    useEffect(() => {
        setForceShowSelector(false);
    }, [activeExperiment?.id]);

    // Auto-select mode for automated workflows
    useEffect(() => {
        if (activeExperiment?.automationMode === 'automated' && !mode) {
            // Default to 'simulate' as it provides more rigorous results than 'synthesize' 
            // but is still fully automated.
            setMode('simulate');
            addToast("Agentic Override: Initializing Code Simulation...", "info");
        }
    }, [activeExperiment?.automationMode, mode, addToast]);

    const handleDataSubmission = async (data: string, summary: string, simulationCode?: string) => {
        const cleanedData = cleanAndFormatCsv(data);
        
        // Pass data to parent to handle state transition
        onStepComplete({
            output: summary,
            summary: summary,
            input: cleanedData,
            simulationCode: simulationCode
        });
        
        setForceShowSelector(false);
        addToast("Experimental dataset generated and verified.", "success");
    };

    const context = useMemo(() => ({
        question: activeExperiment.stepData[1]?.output || activeExperiment.stepData[1]?.input || "N/A",
        hypothesis: activeExperiment.stepData[3]?.output || "N/A",
        methodology_summary: activeExperiment.stepData[4]?.summary || activeExperiment.stepData[4]?.output || "N/A",
        data_collection_plan_summary: activeExperiment.stepData[5]?.summary || activeExperiment.stepData[5]?.output || "N/A"
    }), [activeExperiment]);

    // Show beautiful DatasetViewer if CSV data has already been acquired and we are not forcing the mode selection/editor view
    if (existingCsv && !forceShowSelector) {
        return (
            <DatasetViewer 
                csvData={existingCsv}
                summary={existingSummary}
                simulationCode={existingCode}
                onReset={() => setForceShowSelector(true)}
                experiment={activeExperiment}
            />
        );
    }

    if (!mode) {
        return <ModeSelection onSelect={setMode} />;
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <button 
                    className="btn btn-sm btn-outline-secondary" 
                    onClick={() => {
                        if (existingCsv) {
                            setForceShowSelector(false);
                        } else {
                            setMode(null);
                        }
                    }}
                    disabled={activeExperiment?.automationMode === 'automated'}
                >
                    <i className="bi bi-arrow-left me-1"></i> {existingCsv ? "Back to Verified Dataset" : "Change Method"}
                </button>
                <span className="badge bg-primary text-uppercase">{mode} Mode</span>
            </div>

            <div className="experiment-mode-container card p-4">
                {mode === 'upload' && <DataUploader onComplete={handleDataSubmission} />}
                {mode === 'simulate' && <CodeSimulator onComplete={handleDataSubmission} context={context} />}
                {mode === 'manual' && <ManualDataEntry onComplete={handleDataSubmission} context={context} />}
                {mode === 'synthesize' && <DataSynthesizer onComplete={handleDataSubmission} context={context} />}
            </div>
        </div>
    );
};
