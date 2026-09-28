import React from 'react';
import { useExperiment } from '../../services';
import { WORKFLOW_STEPS } from '../../config';

interface ResearchSummaryProps {
    setView?: (view: string) => void;
}

export const ResearchSummary: React.FC<ResearchSummaryProps> = ({ setView }) => {
    const { experiments, selectExperiment } = useExperiment();
    const latestExperiment = experiments && experiments.length > 0 ? experiments[0] : null;

    if (!latestExperiment) return null;

    const handleContinueResearch = () => {
        if (latestExperiment) {
            selectExperiment(latestExperiment.id);
        }
    };

    // Defensively find the last step with any output by inspecting actual keys
    const lastStepWithOutput = latestExperiment.stepData
        ? Object.keys(latestExperiment.stepData)
            .map(Number)
            .filter(k => !isNaN(k) && k > 0)
            .sort((a, b) => b - a)
            .find(stepId => latestExperiment.stepData[stepId]?.summary || latestExperiment.stepData[stepId]?.output)
        : null;

    let summaryText = 'Active investigation in progress.';
    if (lastStepWithOutput && latestExperiment.stepData && latestExperiment.stepData[lastStepWithOutput]) {
        summaryText = latestExperiment.stepData[lastStepWithOutput].summary || latestExperiment.stepData[lastStepWithOutput].output || summaryText;
    }
    
    const currentStepNum = Math.min(Math.max(latestExperiment.currentStep || 1, 1), 10);
    const currentStepInfo = currentStepNum <= WORKFLOW_STEPS.length 
        ? WORKFLOW_STEPS[currentStepNum - 1].title 
        : "Finalized Draft";

    const progressPercent = Math.min(Math.round((currentStepNum / 10) * 100), 100);

    return (
        <div className="card shadow-lg border-secondary border-opacity-25 mb-4 mb-md-5 overflow-hidden">
            <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                    <div className="flex-grow-1 min-w-0 w-100">
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                            <span className="badge bg-primary-glow text-dark fw-bold font-mono px-2 py-1" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                                <i className="bi bi-broadcast me-1"></i> ACTIVE INVESTIGATION
                            </span>
                            <span className="text-white-50 small font-mono">
                                {latestExperiment.field || 'Interdisciplinary'}
                            </span>
                            <span className="text-white-50 small font-mono d-none d-sm-inline">
                                · Modified {new Date(latestExperiment.updatedAt || latestExperiment.createdAt).toLocaleDateString()}
                            </span>
                        </div>

                        <h4 className="card-title text-white fw-bold mb-2 text-truncate" title={latestExperiment.title}>
                            {latestExperiment.title}
                        </h4>

                        <p className="card-text text-white-50 small mb-3 fst-italic" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                        }}>
                            "{summaryText}"
                        </p>

                        <div className="d-flex align-items-center gap-3 w-100" style={{ maxWidth: '420px' }}>
                            <div className="flex-grow-1">
                                <div className="d-flex justify-content-between small text-white-50 font-mono mb-1" style={{ fontSize: '0.75rem' }}>
                                    <span>Phase {currentStepNum}/10: {currentStepInfo}</span>
                                    <span>{progressPercent}%</span>
                                </div>
                                <div className="progress bg-dark" style={{ height: '6px' }}>
                                    <div 
                                        className="progress-bar bg-primary-glow" 
                                        role="progressbar" 
                                        style={{ width: `${progressPercent}%` }}
                                        aria-valuenow={progressPercent} 
                                        aria-valuemin={0} 
                                        aria-valuemax={100}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex flex-row flex-md-column gap-2 w-100 w-md-auto shrink-0 mt-2 mt-md-0">
                        <button
                            onClick={handleContinueResearch}
                            className="btn btn-primary d-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-md-grow-0 py-2 px-3"
                            style={{ minHeight: '44px' }}
                        >
                            <i className="bi bi-play-circle-fill"></i>
                            <span>Resume Project</span>
                        </button>

                        {setView && (
                            <button
                                onClick={() => setView('dashboard')}
                                className="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-md-grow-0 py-2 px-3 text-white-50"
                                style={{ minHeight: '40px' }}
                            >
                                <i className="bi bi-columns-gap"></i>
                                <span>All Archives ({experiments.length})</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
