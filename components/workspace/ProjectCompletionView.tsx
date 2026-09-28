
import React, { useState, useEffect, useRef } from 'react';
import { useExperiment } from '../../context/ExperimentContext';
import { WORKFLOW_STEPS } from '../../config';
import { renderMarkdown } from '../../utils/markdownRenderer';
import { FinalPublicationView } from '../steps/PublicationExporter';
import { useToast } from '../../toast';
import { getStepContext, getPromptForStep, callGeminiWithRetry, parseGeminiError, safeGetText, extractJson, tryRepairJson } from '../../services';
import { DataAnalysisView } from '../common/DataAnalysisView';
import { ExportBundleButton } from '../common/ExportBundleButton';
import { downloadScientificPaperPdf, downloadScientificPaperDoc, downloadCompleteProjectZip } from '../../utils/scientificPaperExporter';

export const ProjectCompletionView = () => {
    const { activeExperiment, updateExperiment, isAuthenticated } = useExperiment();
    const { addToast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<'pub' | 'explain' | 'viz'>('pub');
    
    // Mount safety
    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);
    
    if (!activeExperiment) {
        return (
            <div className="p-5 text-center text-white-50">
                <div className="spinner-border spinner-border-sm me-2"></div>
                Loading research dossier...
            </div>
        );
    }
    
    const experimentTitle = activeExperiment.title || 'Untitled Research';
    const stepData = activeExperiment.stepData || {};
    const publicationText = stepData[10]?.output;
    const experimentalData = stepData[7]?.input;
    const analysisJson = stepData[7]?.output;
    const explanationText = stepData[13]?.output;
    
    let analysisData: any = null;
    try {
        if (analysisJson) {
            const rawAnalysis = extractJson(analysisJson);
            try {
                analysisData = JSON.parse(rawAnalysis);
            } catch {
                const repaired = tryRepairJson(rawAnalysis) || tryRepairJson(analysisJson);
                if (repaired) analysisData = JSON.parse(repaired);
            }
        }
    } catch (e) {
        console.error("Failed to parse completion analysis JSON", e);
        analysisData = null;
    }
    const charts = analysisData?.charts || [];

    const handleGenerateExplanation = async () => {
        if (!isAuthenticated || !publicationText || isGenerating) return;
        
        setIsGenerating(true);
        try {
            const context = await getStepContext(activeExperiment, 13);
            const { basePrompt, config } = getPromptForStep(13, '', context, {});
            const response = await callGeminiWithRetry('gemini-3.5-flash', { 
                contents: basePrompt, 
                config 
            });
            const newContent = safeGetText(response);

            if (isMounted.current) {
                const updatedStepData = {
                    ...(activeExperiment.stepData || {}),
                    13: { ...(activeExperiment.stepData?.[13] || {}), output: newContent }
                };
                await updateExperiment({ ...activeExperiment, stepData: updatedStepData });
                addToast("Explanation generated and saved.", "success");
            }
        } catch (error) {
            if (isMounted.current) {
                addToast(parseGeminiError(error, "Failed to generate explanation."), 'danger');
            }
        } finally {
            if (isMounted.current) {
                setIsGenerating(false);
            }
        }
    };

    const handleDownloadPaper = async (format: 'md' | 'txt' | 'doc' | 'pdf') => {
        if (!publicationText) {
            addToast("No publication text to download.", "warning");
            return;
        }

        if (format === 'pdf') {
            addToast("Formatting scientific paper into downloadable PDF with citations & appendix...", "info");
            try {
                await downloadScientificPaperPdf(activeExperiment, publicationText);
                addToast("Scientific Paper PDF downloaded successfully.", "success");
            } catch (err) {
                console.error("PDF download error:", err);
                addToast("Failed to generate PDF.", "danger");
            }
            return;
        }

        if (format === 'doc') {
            addToast("Formatting scientific paper into Microsoft Word (.doc) with citations & appendix...", "info");
            try {
                await downloadScientificPaperDoc(activeExperiment, publicationText);
                addToast("Scientific Paper Word document (.doc) downloaded successfully.", "success");
            } catch (err) {
                console.error("Word doc download error:", err);
                addToast("Failed to generate Word document.", "danger");
            }
            return;
        }

        const tempContainer = document.createElement('div');
        tempContainer.style.visibility = 'hidden';
        tempContainer.style.position = 'absolute';
        document.body.appendChild(tempContainer);

        const htmlContent = renderMarkdown(typeof publicationText === 'string' ? publicationText : JSON.stringify(publicationText));
        tempContainer.innerHTML = htmlContent;

        const content = format === 'md' ? (typeof publicationText === 'string' ? publicationText : JSON.stringify(publicationText)) : tempContainer.innerText;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const filename = `${experimentTitle.replace(/ /g, '_')}_publication.${format}`;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(tempContainer);
        addToast(`Paper downloaded as .${format}`, 'success');
    };
    
    const handleDownloadAll = async () => {
        addToast("Archiving complete project (all stages output, paper, datasets & code) into .zip...", 'info');
        try {
            await downloadCompleteProjectZip(activeExperiment);
            addToast('Complete project archive (.zip) downloaded successfully!', 'success');
        } catch (error) {
            console.error("Zip generation error:", error);
            addToast(`Zip failed: ${error instanceof Error ? error.message : "Unknown error"}`, 'danger');
        }
    };

    return (
        <div className="p-3 completion-view-wrapper">
            <div className="text-center mb-4">
                <i className="bi bi-award-fill" style={{fontSize: '3rem', color: 'var(--primary-glow)'}}></i>
                <h3 className="mt-3 fw-bold text-white">Research Finalized &amp; Deployed</h3>
                <p className="text-white-50">Scientific paper formatted with citations &amp; appendix. Project archived from all 10 stages.</p>
            </div>
            
            <div className="card mb-4 bg-dark bg-opacity-25 border-secondary border-opacity-25 shadow-sm">
                <div className="card-body p-4 text-center">
                    <div className="d-flex justify-content-center align-items-center gap-3 flex-wrap">
                        <button 
                            className="btn btn-primary px-4 py-2 rounded-pill shadow-sm d-flex align-items-center gap-2" 
                            onClick={() => handleDownloadPaper('pdf')}
                        >
                            <i className="bi bi-file-earmark-pdf-fill fs-5"></i>
                            <div className="text-start">
                                <div className="fw-bold leading-tight">Download Scientific Paper (.PDF)</div>
                                <div className="text-white-50" style={{ fontSize: '0.72rem' }}>With Citations &amp; Appendix (Infographic, Hypothesis, Methods)</div>
                            </div>
                        </button>

                        <button 
                            className="btn btn-outline-info px-4 py-2 rounded-pill shadow-sm d-flex align-items-center gap-2" 
                            onClick={handleDownloadAll}
                        >
                            <i className="bi bi-file-zip-fill fs-5"></i>
                            <div className="text-start">
                                <div className="fw-bold leading-tight">Download Project Archive (.ZIP)</div>
                                <div className="text-white-50" style={{ fontSize: '0.72rem' }}>All 10 Stages, Datasets, Simulation Code &amp; Visuals</div>
                            </div>
                        </button>

                        {publicationText && (
                            <ExportBundleButton experiment={activeExperiment} publicationText={publicationText} />
                        )}
                    </div>
                </div>
            </div>

            <div className="text-center mb-4 opacity-75">
                <div className="alert alert-dark border-white border-opacity-10 py-2">
                    <p className="mb-0 small text-white-50">
                        <strong>Synthesis Notice:</strong> This dossier was compiled by Project Hypatia Pro. 
                        Multi-agent verification, literature citations, and simulation artifacts are bundled.
                    </p>
                </div>
            </div>

            <ul className="nav nav-pills justify-content-center gap-2 mb-4" id="completionTabs">
                <li className="nav-item">
                    <button 
                        className={`nav-link btn btn-sm rounded-pill px-4 ${activeTab === 'pub' ? 'active btn-primary' : 'btn-outline-secondary text-white'}`}
                        onClick={() => setActiveTab('pub')}
                    >
                        <i className="bi bi-journal-richtext me-2"></i>Publication &amp; Slides
                    </button>
                </li>
                <li className="nav-item">
                    <button 
                        className={`nav-link btn btn-sm rounded-pill px-4 ${activeTab === 'explain' ? 'active btn-primary' : 'btn-outline-secondary text-white'}`}
                        onClick={() => setActiveTab('explain')}
                    >
                        <i className="bi bi-chat-left-dots me-2"></i>Explain Paper
                    </button>
                </li>
                <li className="nav-item">
                    <button 
                        className={`nav-link btn btn-sm rounded-pill px-4 ${activeTab === 'viz' ? 'active btn-primary' : 'btn-outline-secondary text-white'}`}
                        onClick={() => setActiveTab('viz')}
                    >
                        <i className="bi bi-graph-up me-2"></i>Visualizations
                    </button>
                </li>
            </ul>
            
            <div className="tab-content card border-secondary border-opacity-25 bg-dark bg-opacity-10" id="completionTabsContent">
                {activeTab === 'pub' && (
                    <div className="p-3">
                        {publicationText ? (
                            <FinalPublicationView 
                                publicationText={publicationText} 
                                showRegenerate={false} 
                                onRegenerate={() => {}} 
                            />
                        ) : (
                            <div className="alert alert-warning m-3">Publication text has not been generated yet.</div>
                        )}
                    </div>
                )}
                {activeTab === 'explain' && (
                    <div className="p-4">
                        {isGenerating ? (
                            <div className="text-center p-5">
                                <div className="spinner-border text-primary"></div>
                                <div className="text-white-50 small mt-2">Generating plain-language explanation...</div>
                            </div>
                        ) : explanationText ? (
                            <div className="generated-text-container" dangerouslySetInnerHTML={{ __html: renderMarkdown(explanationText) }}></div>
                        ) : (
                            <div className="text-center p-5">
                                <h5 className="fw-bold text-white mb-2">Plain Language Explanation</h5>
                                <p className="text-white-50 small mb-3">Generate a synthesized explanation broken down for general academic understanding.</p>
                                <button className="btn btn-primary rounded-pill px-4" onClick={handleGenerateExplanation} disabled={!publicationText}>
                                    <i className="bi bi-magic me-2"></i>Generate Explanation
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'viz' && (
                    <div className="p-3">
                        {charts.length > 0 ? (
                            <DataAnalysisView analysisData={{ charts, summary: " " }} />
                        ) : (
                            <div className="alert alert-info m-3">No simulation visualizations recorded for Step 7.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
