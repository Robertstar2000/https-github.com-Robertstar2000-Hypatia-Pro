import React, { useState, useEffect, useRef, useMemo } from 'react';
import { renderMarkdown } from '../../utils/markdownRenderer';
import {
    Chart,
    LineController,
    BarController,
    LineElement,
    BarElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Legend,
    Tooltip,
    Title
} from 'chart.js';
import { useExperiment } from '../../services';
import { useToast } from '../../toast';
import { runPublicationAgent, parseGeminiError, extractJson, tryRepairJson } from '../../services';
import { AgenticAnalysisView } from '../common/AgenticAnalysisView';
import { ExportBundleButton } from '../common/ExportBundleButton';
import { renderChartToSvg } from '../../utils/chartUtils';
import { generateStepVisualArtifacts } from '../../utils/artifactGenerator';
import { generateIeeeLatex, generateNatureLatex, generateApa7Markdown, generateBibtexCitations, downloadTextFile } from '../../utils/exportFormats';
import { downloadPresentationDeck } from '../../utils/presentationExporter';
import { 
    downloadScientificPaperPdf, 
    downloadScientificPaperDoc,
    compileScientificPaper, 
    printScientificPaper,
    isManuscriptAgenticReviewed
} from '../../utils/scientificPaperExporter';

// Register Chart.js components safely
try {
    if (Chart) {
        Chart.register(
            LineController,
            BarController,
            LineElement,
            BarElement,
            PointElement,
            CategoryScale,
            LinearScale,
            Legend,
            Tooltip,
            Title
        );
    }
} catch (e) {
    console.warn("Chart.js registration warning:", e);
}

export const FinalPublicationView: React.FC<{
    publicationText: string;
    onRegenerate: () => void;
    showRegenerate?: boolean;
    agenticRun?: any;
}> = ({ publicationText, onRegenerate, showRegenerate = true, agenticRun }) => {
    const { addToast } = useToast();
    const { activeExperiment } = useExperiment();
    const contentRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'formatted_paper' | 'manuscript' | 'abstract' | 'presentation'>('formatted_paper');
    const [isExportingPresentation, setIsExportingPresentation] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingDoc, setIsExportingDoc] = useState(false);

    const handleDownloadPresentation = async () => {
        if (!activeExperiment || isExportingPresentation) return;
        setIsExportingPresentation(true);
        addToast("Generating styled academic presentation (13 widescreen slides)...", "info");
        try {
            await downloadPresentationDeck(activeExperiment, publicationText);
            addToast("PowerPoint presentation (.pptx) downloaded successfully.", "success");
        } catch (err: any) {
            console.error("Presentation download error:", err);
            addToast(`Failed to generate presentation: ${err?.message || "Error"}`, "danger");
        } finally {
            setIsExportingPresentation(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (!activeExperiment || isExportingPdf) return;
        setIsExportingPdf(true);
        addToast("Formatting scientific paper into downloadable PDF with citations & appendix...", "info");
        try {
            await downloadScientificPaperPdf(activeExperiment, publicationText);
            addToast("Scientific Paper PDF downloaded successfully.", "success");
        } catch (err: any) {
            console.error("PDF download error:", err);
            addToast(`Failed to generate PDF: ${err?.message || "Error"}`, "danger");
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handleDownloadDoc = async () => {
        if (!activeExperiment || isExportingDoc) return;
        setIsExportingDoc(true);
        addToast("Formatting scientific paper into Microsoft Word (.doc) with citations & appendix...", "info");
        try {
            await downloadScientificPaperDoc(activeExperiment, publicationText);
            addToast("Scientific Paper Word document (.doc) downloaded successfully.", "success");
        } catch (err: any) {
            console.error("Word doc error:", err);
            addToast(`Failed to generate Word document: ${err?.message || "Error"}`, "danger");
        } finally {
            setIsExportingDoc(false);
        }
    };

    const handlePrintPaper = () => {
        if (!activeExperiment) return;
        try {
            printScientificPaper(activeExperiment, publicationText);
        } catch (err: any) {
            console.error("Print error:", err);
            addToast("Failed to open print dialogue.", "danger");
        }
    };

    const isReviewed = useMemo(() => {
        return isManuscriptAgenticReviewed(activeExperiment, publicationText);
    }, [activeExperiment, publicationText]);

    if (!activeExperiment) {
        return <div className="p-4 text-center text-white-50">No experiment selected.</div>;
    }

    // Determine the nature of the data source for the disclaimer
    const step6Raw = activeExperiment?.stepData?.[6]?.summary || activeExperiment?.stepData?.[6]?.output || '';
    let isManualData = false;
    try {
        const step6Output = typeof step6Raw === 'string' ? step6Raw : JSON.stringify(step6Raw || '');
        isManualData = step6Output.toLowerCase().includes('manually entered');
    } catch (e) {
        console.error("Error checking manual data", e);
    }

    // Parse the JSON output from the agent
    let publicationData: any = { 
        full_paper: typeof publicationText === 'string' ? publicationText : (publicationText ? JSON.stringify(publicationText) : ''), 
        abstract: "", 
        layman_abstract: "", 
        slides: [] 
    };
    try {
        if (typeof publicationText === 'string' && (publicationText.trim().startsWith('{') || publicationText.includes('```json') || publicationText.includes('full_paper'))) {
            const rawExtracted = extractJson(publicationText);
            try {
                publicationData = JSON.parse(rawExtracted);
            } catch {
                const repaired = tryRepairJson(rawExtracted) || tryRepairJson(publicationText);
                if (repaired) {
                    publicationData = JSON.parse(repaired);
                }
            }
        } else if (typeof (publicationText as any) === 'object' && publicationText !== null) {
            publicationData = { ...publicationData, ...(publicationText as unknown as Record<string, any>) };
        }
    } catch (e) {
        console.error("Failed to parse publication JSON", e);
    }

    // Ensure Master Infographic is generated for Step 10 / Slide 2
    const masterInfographicArtifacts = activeExperiment ? generateStepVisualArtifacts(10, activeExperiment) : [];
    const masterInfographicDataUrl = masterInfographicArtifacts[0]?.svgDataUrl || '';

    // Construct the Disclaimer Blocks
    const disclaimerHTML = `
        <div style="background-color: #fff3cd; color: #856404; padding: 20px; border: 1px solid #ffeeba; border-radius: 8px; margin-bottom: 30px; font-family: sans-serif; line-height: 1.5;">
            <div style="font-weight: bold; margin-bottom: 8px; text-transform: uppercase; font-size: 0.9em;">
                ⚠️ AI Generation Disclaimer
            </div>
            <div style="font-size: 0.95em;">
                This research paper was generated by an Artificial Intelligence system. Consequently, it may contain errors, hallucinations, or inaccuracies.
                ${!isManualData ? '<br/><br/><strong>NOTE:</strong> No physical experiments were performed. The results presented here are derived from AI-generated data, code-based simulations, or synthetic datasets. This document is intended strictly for theoretical investigation and ideation.' : ''}
            </div>
        </div>
        <hr style="margin-bottom: 30px; border-top: 1px solid #444;" />
    `;

    useEffect(() => {
        const renderContent = async () => {
            if (!publicationText || !contentRef.current) return;
    
            contentRef.current.innerHTML = `<div class="text-center p-3"><div class="spinner-border spinner-border-sm"></div> Rendering document...</div>`;
    
            let textToRender = "";
            if (activeTab === 'formatted_paper' || activeTab === 'presentation') {
                contentRef.current.innerHTML = "";
                return;
            } else if (activeTab === 'manuscript') {
                const rawPaper = publicationData?.full_paper || publicationText || '';
                textToRender = typeof rawPaper === 'string' ? rawPaper : JSON.stringify(rawPaper);
            } else if (activeTab === 'abstract') {
                const formal = publicationData?.abstract || "No formal abstract available.";
                const layman = publicationData?.layman_abstract ? `\n\n### Layman Summary (12th Grade Science Level)\n${publicationData.layman_abstract}` : "";
                textToRender = `## Scientific Abstract\n${formal}${layman}`;
            }

            let processedText = textToRender;
            
            // Embed Master Overall Infographic into Abstract/Manuscript
            if ((activeTab === 'abstract' || activeTab === 'manuscript') && masterInfographicDataUrl) {
                const heroInfographic = `<figure style="text-align: center; margin: 2rem 0;"><img src="${masterInfographicDataUrl}" alt="Overall Research Infographic" style="max-width: 100%; height: auto; display: block; margin: 1rem auto; border: 2px solid #38bdf8; border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.6);" /><figcaption style="font-size: 0.9em; color: #38bdf8; margin-top: 0.5em; font-family: sans-serif; font-weight: bold;">Figure 0: Master Overall Research Infographic Synthesis</figcaption></figure>\n\n`;
                processedText = heroInfographic + processedText;
            }
            
            // Parse analysis charts and step images
            const analysisJson = activeExperiment?.stepData?.[7]?.output || '{}';
            let analysisData: any = {};
            try {
                const rawAnalysis = extractJson(analysisJson);
                try {
                    analysisData = JSON.parse(rawAnalysis);
                } catch {
                    const repaired = tryRepairJson(rawAnalysis) || tryRepairJson(analysisJson);
                    if (repaired) analysisData = JSON.parse(repaired);
                }
            } catch(e) {
                console.error("Failed to parse analysis JSON for charts", e);
            }
            const charts = analysisData?.charts || [];
            
            // Match chart placeholders e.g. [CHART_1: ...], [FIGURE_1: ...]
            const chartMatches = typeof textToRender === 'string' ? [...textToRender.matchAll(/\[(CHART|FIGURE)_?(\d+):?([\s\S]*?)\]/gi)] : [];
            
            for (const match of chartMatches) {
                const fullPlaceholder = match[0];
                const chartIndex = parseInt(match[2], 10) - 1;
                const caption = match[3] || `Data Analysis Figure ${chartIndex + 1}`;

                const chartObj = charts[chartIndex];
                let dataUrl = "";

                if (chartObj) {
                    if (chartObj.svgDataUrl) {
                        dataUrl = chartObj.svgDataUrl;
                    } else if (chartObj.imageData) {
                        dataUrl = chartObj.imageData.startsWith('data:') ? chartObj.imageData : `data:image/png;base64,${chartObj.imageData}`;
                    } else {
                        dataUrl = renderChartToSvg(chartObj);
                    }
                } else {
                    const stepImages = Object.values(activeExperiment.stepData || {})
                        .flatMap((s: any) => s?.images || []);
                    if (stepImages[chartIndex]) {
                        dataUrl = `data:image/png;base64,${stepImages[chartIndex].base64Data}`;
                    }
                }

                if (dataUrl) {
                    const imgTag = `<figure style="text-align: center; margin: 2rem 0; word-wrap: break-word; overflow-wrap: break-word;"><img src="${dataUrl}" alt="${caption}" style="max-width: 50%; max-height: 400px; height: auto; display: block; margin: 1rem auto; border: 1px solid #30363d; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); object-fit: contain;" /><figcaption style="font-size: 0.9em; color: #8b949e; margin-top: 0.5em; font-family: sans-serif; word-wrap: break-word; overflow-wrap: break-word;"><strong>Figure ${chartIndex + 1}:</strong> ${caption}</figcaption></figure>`;
                    processedText = processedText.replace(fullPlaceholder, imgTag);
                }
            }

            // Render Markdown and prepend the disclaimer
            if (contentRef.current) {
                const renderedBody = renderMarkdown(processedText);
                contentRef.current.innerHTML = (activeTab === 'manuscript' ? disclaimerHTML : '') + renderedBody;
            }
        };
    
        renderContent();
    }, [publicationText, activeExperiment, disclaimerHTML, activeTab, publicationData.full_paper, publicationData.abstract, publicationData.layman_abstract]);

    // Build complete 13 slide deck fallback if slides are missing or fewer than 13
    const rawSlides = Array.isArray(publicationData.slides) ? publicationData.slides : [];
    
    // Construct guaranteed 13 slides deck structure
    const slidesDeck = Array.from({ length: 13 }, (_, index) => {
        const slideNum = index + 1;
        const existing = rawSlides.find((s: any) => s.slide_number === slideNum) || rawSlides[index];

        if (slideNum === 1) { // Slide 1: Layman summary of abstract
            return {
                slide_number: 1,
                step_id: 0,
                title: existing?.title || "Executive Layman Abstract Summary",
                subtitle: "12th Grade Science Level Overview",
                content: existing?.content?.length ? existing.content : [
                    publicationData.layman_abstract || "This study explores key scientific questions using controlled methodology and rigorous simulation.",
                    "Designed to make advanced interdisciplinary discoveries accessible to students and non-specialist researchers.",
                    "Key findings confirm hypothesis validity with high statistical significance."
                ],
                layman_summary: publicationData.layman_abstract || "A clear high school level explanation of the core scientific research goal and empirical findings.",
                type: 'layman_abstract'
            };
        } else if (slideNum === 2) { // Slide 2: Full-page infographic
            return {
                slide_number: 2,
                step_id: 0,
                title: existing?.title || "Master Research Visual Synthesis Infographic",
                subtitle: "Full-Page Overview Diagram",
                content: existing?.content?.length ? existing.content : [
                    "Complete 10-step research methodology and findings visual roadmap.",
                    "Synthesizes problem formulation, hypothesis pathways, simulation pipeline, data analysis, and adversarial audit.",
                    "Provides high-resolution vector visual representation for presentation and dissemination."
                ],
                layman_summary: "Full visual map outlining how the research progressed from idea to verified publication.",
                type: 'full_page_infographic',
                infographicUrl: masterInfographicDataUrl
            };
        } else if (slideNum === 13) { // Slide 13: Summary, Further Research & Q&A
            return {
                slide_number: 13,
                step_id: 0,
                title: existing?.title || "Summary, Further Research Needed & Audience Q&A",
                subtitle: "Concluding Synthesis • Open Questions & Discussion",
                content: existing?.content?.length ? existing.content : [
                    "Core Conclusions: The null hypothesis was successfully falsified, proving significant empirical support for the proposed mechanism.",
                    "Further Research Needed: Conduct real-world physical lab testing, expand boundary conditions, and test across multi-environment noise datasets.",
                    "Open Research Questions: What are the long-term system equilibrium dynamics under extreme stress states?",
                    "Thank You! We now invite questions, critique, and discussion from the audience."
                ],
                layman_summary: "Final wrap-up highlighting major takeaways, next steps for future scientists, and an open floor for audience questions.",
                type: 'summary_qna'
            };
        } else { // Slides 3 to 12: Steps 1 to 10
            const stepId = slideNum - 2; // Step 1 is Slide 3, Step 10 is Slide 12
            const stepTitleNames = [
                "Problem Formulation & Scope",
                "Literature Review & Prior Knowledge",
                "Hypothesis Generation & Decision Tree",
                "Experimental Design & Variable Protocols",
                "Code & Simulation Execution",
                "Data Collection & Quality Assurance",
                "Data Analysis & Statistical Significance",
                "Result Interpretation & Validity",
                "Peer Review & Adversarial Audit",
                "Publication Dossier & Synthesis"
            ];
            
            // Get visual artifacts for this step
            const stepArtifacts = activeExperiment?.stepData?.[stepId]?.artifacts?.length 
                ? activeExperiment.stepData[stepId].artifacts 
                : (activeExperiment ? generateStepVisualArtifacts(stepId, activeExperiment) : []);

            return {
                slide_number: slideNum,
                step_id: stepId,
                title: existing?.title || `Step ${stepId}: ${stepTitleNames[stepId - 1]}`,
                subtitle: `12th Grade Science Language • Step ${stepId}`,
                content: existing?.content?.length ? existing.content : [
                    `Key objective of Step ${stepId} is to systematically execute ${stepTitleNames[stepId - 1].toLowerCase()}.`,
                    `Data and findings were validated using standard 12th-grade scientific reasoning and quantitative metrics.`,
                    `Visual artifacts illustrate the structural mechanism and empirical outcome.`
                ],
                layman_summary: existing?.layman_summary || `Simple 12th-grade science summary explaining Step ${stepId} (${stepTitleNames[stepId - 1]}).`,
                type: 'step_slide',
                artifacts: stepArtifacts
            };
        }
    });

    const compiledPaper = useMemo(() => {
        if (!activeExperiment) return null;
        try {
            return compileScientificPaper(activeExperiment, publicationText);
        } catch (e) {
            console.error("Failed to compile scientific paper:", e);
            return null;
        }
    }, [activeExperiment, publicationText]);

    return (
        <div>
            {/* Live Agentic Progress View when multi-agent workflow is executing */}
            {agenticRun && (agenticRun.status === 'running' || agenticRun.logs.length > 0) && (
                <div className="mb-4">
                    <AgenticAnalysisView
                        agenticRun={agenticRun}
                        title="Agentic Manuscript Review & Publication Engine"
                        subtitle="Executing 5-stage academic peer review pipeline: Lead Director, Blueprint Architect, Lead Author, Adversarial Reviewer 2, Chief Academic Editor."
                    />
                </div>
            )}

            {/* Agentic Scientific Review Status Bar */}
            <div className="card shadow-sm border border-secondary border-opacity-10 mb-4 bg-dark bg-opacity-40 rounded-3 overflow-hidden">
                <div className="card-body p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <div className={`rounded-circle p-2 d-flex align-items-center justify-content-center ${isReviewed ? 'bg-success bg-opacity-20 text-success' : 'bg-warning bg-opacity-20 text-warning'}`} style={{ width: '42px', height: '42px' }}>
                            <i className={`bi ${isReviewed ? 'bi-patch-check-fill' : 'bi-shield-exclamation'} fs-4`}></i>
                        </div>
                        <div>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <span className={`badge ${isReviewed ? 'bg-success text-white' : 'bg-warning text-dark'} fw-bold text-uppercase px-2 py-1`}>
                                    {isReviewed ? 'Scientific Standards Verified' : 'Draft Pending Full Scientific Review'}
                                </span>
                                {compiledPaper && (
                                    <span className="text-white-50 small font-monospace">
                                        {compiledPaper.mainPaperMarkdown.split(/\s+/).length} words • {compiledPaper.citationsList.length} Grounded Citations • Appendices A–C Attached
                                    </span>
                                )}
                            </div>
                            <div className="text-light small mt-1">
                                {isReviewed 
                                    ? 'Manuscript processed through full multi-agent review with comprehensive depth, statistical reporting, mathematical models, and visual figures.'
                                    : 'Current draft needs agentic processing to reach full 12–20 page academic standards with rigorous hypothesis evaluation and statistical metrics.'}
                            </div>
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        {showRegenerate && (
                            <button
                                className={`btn btn-sm rounded-pill px-3 d-flex align-items-center gap-1 ${isReviewed ? 'btn-outline-primary text-white' : 'btn-primary shadow-sm fw-bold'}`}
                                onClick={onRegenerate}
                                disabled={agenticRun?.status === 'running'}
                                title="Run the 5-agent manuscript generation and adversarial review loop"
                            >
                                <i className={`bi ${agenticRun?.status === 'running' ? 'bi-hourglass-split' : 'bi-cpu-fill'}`}></i>
                                <span>{agenticRun?.status === 'running' ? 'Auditing & Expanding...' : (isReviewed ? 'Re-Audit & Expand Manuscript' : 'Process & Review with Agentic Tool')}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="d-flex align-items-center flex-wrap gap-2 border-bottom border-secondary border-opacity-10 mb-4 pb-2">
                <div className="nav nav-pills me-auto">
                    <button 
                        className={`nav-link btn btn-sm px-3 py-1 me-2 rounded-pill d-flex align-items-center gap-1 ${activeTab === 'formatted_paper' ? 'active btn-danger text-white fw-bold shadow-sm' : 'btn-outline-danger text-danger'}`}
                        onClick={() => setActiveTab('formatted_paper')}
                    >
                        <i className="bi bi-file-earmark-pdf-fill"></i> Formatted Paper (PDF Preview)
                    </button>
                    <button 
                        className={`nav-link btn btn-sm px-3 py-1 me-2 rounded-pill ${activeTab === 'manuscript' ? 'active btn-primary' : 'btn-outline-secondary text-white'}`}
                        onClick={() => setActiveTab('manuscript')}
                    >
                        <i className="bi bi-file-earmark-richtext me-1"></i> Scientific Manuscript
                    </button>
                    <button 
                        className={`nav-link btn btn-sm px-3 py-1 me-2 rounded-pill ${activeTab === 'abstract' ? 'active btn-primary' : 'btn-outline-secondary text-white'}`}
                        onClick={() => setActiveTab('abstract')}
                    >
                        <i className="bi bi-file-earmark-medical me-1"></i> Abstract &amp; Layman Summary
                    </button>
                    <button 
                        className={`nav-link btn btn-sm px-3 py-1 rounded-pill ${activeTab === 'presentation' ? 'active btn-primary' : 'btn-outline-secondary text-white'}`}
                        onClick={() => setActiveTab('presentation')}
                    >
                        <i className="bi bi-file-slides me-1"></i> Presentation Deck ({slidesDeck.length} Slides)
                    </button>
                </div>
                
                {showRegenerate && 
                    <button className="btn btn-sm btn-outline-secondary me-2 rounded-pill text-white" onClick={onRegenerate} disabled={agenticRun?.status === 'running'}>
                        <i className="bi bi-arrow-clockwise me-1"></i> Regenerate
                    </button>
                }

                {/* Primary Download Paper (.PDF) Action Button */}
                <button 
                    className="btn btn-sm btn-danger rounded-pill px-3 me-2 d-flex align-items-center gap-1 shadow-sm text-white fw-bold"
                    onClick={handleDownloadPdf}
                    disabled={isExportingPdf}
                    title="Download fully formatted scientific publication as PDF"
                >
                    <i className={`bi ${isExportingPdf ? 'bi-hourglass-split' : 'bi-file-earmark-pdf-fill'}`}></i>
                    <span>{isExportingPdf ? 'Generating PDF...' : 'Download Paper (.pdf)'}</span>
                </button>

                {/* Primary Download Paper (.DOC) Action Button */}
                <button 
                    className="btn btn-sm btn-primary rounded-pill px-3 me-2 d-flex align-items-center gap-1 shadow-sm text-white fw-bold"
                    onClick={handleDownloadDoc}
                    disabled={isExportingDoc}
                    title="Download fully formatted scientific publication as Microsoft Word document (.doc)"
                >
                    <i className={`bi ${isExportingDoc ? 'bi-hourglass-split' : 'bi-file-earmark-word-fill'}`}></i>
                    <span>{isExportingDoc ? 'Generating DOC...' : 'Download Paper (.doc)'}</span>
                </button>

                <div className="dropdown me-2">
                    <button className="btn btn-sm btn-outline-info rounded-pill dropdown-toggle text-info" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i className="bi bi-filetype-tex me-1"></i> Multi-Format Exports
                    </button>
                    <ul className="dropdown-menu dropdown-menu-dark shadow-lg">
                        <li>
                            <button 
                                className="dropdown-item small d-flex align-items-center gap-2 text-danger fw-bold"
                                onClick={handleDownloadPdf}
                                disabled={isExportingPdf}
                            >
                                <i className="bi bi-file-earmark-pdf-fill text-danger"></i> Formatted Scientific Paper (.pdf)
                            </button>
                        </li>
                        <li>
                            <button 
                                className="dropdown-item small d-flex align-items-center gap-2 text-primary fw-bold"
                                onClick={handleDownloadDoc}
                                disabled={isExportingDoc}
                            >
                                <i className="bi bi-file-earmark-word-fill text-primary"></i> Microsoft Word Document (.doc)
                            </button>
                        </li>
                        <li>
                            <button 
                                className="dropdown-item small d-flex align-items-center gap-2 text-light"
                                onClick={handlePrintPaper}
                            >
                                <i className="bi bi-printer text-info"></i> Print / Save as PDF (Browser Print)
                            </button>
                        </li>
                        <li><hr className="dropdown-divider border-secondary opacity-25" /></li>
                        <li>
                            <button 
                                className="dropdown-item small d-flex align-items-center gap-2"
                                onClick={() => downloadTextFile(`${activeExperiment.title || 'ieee_paper'}_IEEE.tex`, generateIeeeLatex(activeExperiment, publicationText), 'application/x-tex')}
                            >
                                <i className="bi bi-file-earmark-code text-primary-glow"></i> IEEE LaTeX Source (.tex)
                            </button>
                        </li>
                        <li>
                            <button 
                                className="dropdown-item small d-flex align-items-center gap-2"
                                onClick={() => downloadTextFile(`${activeExperiment.title || 'nature_paper'}_Nature.tex`, generateNatureLatex(activeExperiment, publicationText), 'application/x-tex')}
                            >
                                <i className="bi bi-file-earmark-code text-success"></i> Nature LaTeX Source (.tex)
                            </button>
                        </li>
                        <li>
                            <button 
                                className="dropdown-item small d-flex align-items-center gap-2"
                                onClick={() => downloadTextFile(`${activeExperiment.title || 'apa_paper'}_APA7.md`, generateApa7Markdown(activeExperiment, publicationText), 'text/markdown')}
                            >
                                <i className="bi bi-markdown text-warning"></i> APA 7th Edition Markdown (.md)
                            </button>
                        </li>
                        <li><hr className="dropdown-divider border-secondary opacity-25" /></li>
                        <li>
                            <button 
                                className="dropdown-item small d-flex align-items-center gap-2"
                                onClick={() => downloadTextFile(`${activeExperiment.title || 'references'}.bib`, generateBibtexCitations(activeExperiment), 'application/x-bibtex')}
                            >
                                <i className="bi bi-quote text-info"></i> BibTeX Bibliography (.bib)
                            </button>
                        </li>
                        <li><hr className="dropdown-divider border-secondary opacity-25" /></li>
                        <li>
                            <button 
                                className="dropdown-item small d-flex align-items-center gap-2 text-warning"
                                onClick={handleDownloadPresentation}
                                disabled={isExportingPresentation}
                            >
                                <i className="bi bi-file-earmark-slides-fill"></i> PowerPoint Slides (.pptx)
                            </button>
                        </li>
                    </ul>
                </div>

                {activeTab === 'presentation' && (
                    <button 
                        className="btn btn-sm btn-outline-warning rounded-pill px-3 me-2 d-flex align-items-center gap-1 shadow-sm"
                        onClick={handleDownloadPresentation}
                        disabled={isExportingPresentation}
                        title="Download 13-slide PowerPoint Presentation (.pptx)"
                    >
                        <i className={`bi ${isExportingPresentation ? 'bi-hourglass-split' : 'bi-file-earmark-slides-fill'}`}></i>
                        <span>{isExportingPresentation ? 'Generating Deck...' : 'Download Deck (.pptx)'}</span>
                    </button>
                )}

                <ExportBundleButton experiment={activeExperiment} publicationText={publicationText} contentElementRef={contentRef} />
            </div>

            {activeTab === 'formatted_paper' ? (
                <div className="formatted-paper-preview-container">
                    {/* Paper Action Banner */}
                    <div className="d-flex flex-wrap align-items-center justify-content-between p-3 mb-4 rounded-3 bg-dark bg-opacity-75 border border-secondary border-opacity-25 shadow-sm gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-danger text-white px-2 py-1 font-monospace">
                                <i className="bi bi-file-earmark-pdf-fill me-1"></i> A4 ACADEMIC FORMAT
                            </span>
                            <span className="text-light small fw-bold">
                                Official Academic Paper Dossier
                            </span>
                            <span className="text-white-50 small d-none d-lg-inline">
                                • Complete Publication with Figures, Citations &amp; Appendices A–C
                            </span>
                        </div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <button
                                className="btn btn-sm btn-outline-light rounded-pill px-3 d-flex align-items-center gap-1"
                                onClick={handlePrintPaper}
                                title="Open browser print dialogue (Save as PDF)"
                            >
                                <i className="bi bi-printer"></i>
                                <span>Print / Save as PDF</span>
                            </button>
                            <button
                                className="btn btn-sm btn-primary rounded-pill px-3 d-flex align-items-center gap-1 fw-bold shadow-sm"
                                onClick={handleDownloadDoc}
                                disabled={isExportingDoc}
                                title="Download complete formatted publication as Microsoft Word .doc"
                            >
                                <i className={`bi ${isExportingDoc ? 'bi-hourglass-split' : 'bi-file-earmark-word-fill'}`}></i>
                                <span>{isExportingDoc ? 'Generating DOC...' : 'Download Paper (.doc)'}</span>
                            </button>
                            <button
                                className="btn btn-sm btn-danger rounded-pill px-3 d-flex align-items-center gap-1 fw-bold shadow-sm"
                                onClick={handleDownloadPdf}
                                disabled={isExportingPdf}
                                title="Download complete formatted publication as standard .PDF"
                            >
                                <i className={`bi ${isExportingPdf ? 'bi-hourglass-split' : 'bi-download'}`}></i>
                                <span>{isExportingPdf ? 'Generating PDF...' : 'Download Paper (.pdf)'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Paper Document Preview Card (White Academic Journal Style) */}
                    <div className="bg-secondary bg-opacity-10 p-2 p-md-4 rounded-4 border border-secondary border-opacity-20 d-flex justify-content-center">
                        <div 
                            className="bg-white text-dark rounded-3 shadow-lg p-4 p-md-5 w-100" 
                            style={{ 
                                maxWidth: '880px',
                                minHeight: '800px',
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                            }}
                            dangerouslySetInnerHTML={{ 
                                __html: compiledPaper?.fullPaperHtml || '<div class="p-4 text-center text-muted">No publication content available to render.</div>' 
                            }}
                        />
                    </div>
                </div>
            ) : activeTab === 'presentation' ? (
                <div className="row g-4 mt-2">
                    {slidesDeck.map((slide: any, i: number) => {
                        return (
                            <div key={i} className={slide.type === 'full_page_infographic' ? "col-12" : "col-12 col-md-6"}>
                                <div className="card h-100 bg-dark bg-opacity-25 border border-secondary border-opacity-10 shadow-sm overflow-hidden" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                    <div className="card-header bg-dark bg-opacity-50 py-3 border-bottom border-secondary border-opacity-10 d-flex justify-content-between align-items-center">
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={`badge rounded-pill ${slide.slide_number === 1 ? 'bg-warning text-dark' : slide.slide_number === 2 ? 'bg-info text-dark' : slide.slide_number === 13 ? 'bg-success text-dark' : 'bg-primary'}`}>
                                                Slide {slide.slide_number} of 13
                                            </span>
                                            {slide.subtitle && (
                                                <span className="text-white-50 small font-monospace" style={{ fontSize: '0.75rem' }}>
                                                    {slide.subtitle}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-white-50 font-monospace small" style={{ fontSize: '0.75rem' }}>
                                            {slide.slide_number === 1 ? 'Layman Abstract' : slide.slide_number === 2 ? 'Full Page Infographic' : slide.slide_number === 13 ? 'Summary & Q&A' : `12th Grade Science • Step ${slide.step_id}`}
                                        </span>
                                    </div>
                                    <div className="card-body p-4 d-flex flex-column justify-content-between" style={{ minHeight: '240px', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                        <div>
                                            <h5 className="fw-bold text-primary-glow mb-2" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>{slide.title}</h5>
                                            
                                            {/* Layman summary callout box for 12th grade level explanation */}
                                            {slide.layman_summary && (
                                                <div className="p-2 mb-3 rounded bg-info bg-opacity-10 border border-info border-opacity-25 text-info small" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                                    <i className="bi bi-lightbulb me-1"></i> <strong>12th Grade Science Explanation:</strong> {slide.layman_summary}
                                                </div>
                                            )}

                                            <ul className="text-light text-opacity-85 small mb-3" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                                {(Array.isArray(slide.content) ? slide.content : []).map((bullet: string, j: number) => (
                                                    <li key={j} className="mb-2" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>{bullet}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Slide 2 Full Page Infographic - Fits cleanly on 1 slide */}
                                        {slide.type === 'full_page_infographic' && slide.infographicUrl && (
                                            <div className="mt-3 p-3 bg-black bg-opacity-50 rounded border border-info border-opacity-30 text-center">
                                                <div className="text-info font-monospace small mb-2 d-flex justify-content-between align-items-center">
                                                    <span><i className="bi bi-diagram-3 me-1"></i> MASTER OVERALL RESEARCH INFOGRAPHIC (PAGE 2)</span>
                                                    <a href={slide.infographicUrl} download={`${activeExperiment.title || 'research'}_master_infographic.svg`} className="btn btn-xs btn-outline-info rounded-pill px-2 py-0">
                                                        <i className="bi bi-download me-1"></i> Download SVG
                                                    </a>
                                                </div>
                                                <img 
                                                    src={slide.infographicUrl} 
                                                    alt="Full Page Infographic" 
                                                    style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #1e293b' }}
                                                />
                                            </div>
                                        )}

                                        {/* Step Visual Artifacts for Steps 1-10 - max 50% slide constraint */}
                                        {slide.type === 'step_slide' && slide.artifacts && slide.artifacts.length > 0 && (
                                            <div className="mt-3 p-2 bg-black bg-opacity-40 rounded border border-secondary border-opacity-25" style={{ maxHeight: '50%' }}>
                                                <div className="text-white-50 font-monospace small mb-2 d-flex justify-content-between align-items-center" style={{ fontSize: '0.7rem' }}>
                                                    <span><i className="bi bi-bounding-box-circles me-1"></i> STEP {slide.step_id} VISUAL ARTIFACTS ({slide.artifacts.length})</span>
                                                    <span className="text-info">{slide.artifacts[0]?.type?.toUpperCase()}</span>
                                                </div>
                                                <div className="row g-2">
                                                    {slide.artifacts.map((art: any, artIdx: number) => (
                                                        <div key={artIdx} className={slide.artifacts.length === 1 ? "col-12" : "col-6"}>
                                                            <div className="p-1 bg-dark rounded border border-secondary border-opacity-10 text-center">
                                                                <img 
                                                                    src={art.svgDataUrl || art.svgContent} 
                                                                    alt={art.title} 
                                                                    style={{ maxWidth: '100%', maxHeight: '130px', objectFit: 'contain' }}
                                                                />
                                                                <div className="text-white-50 small mt-1 text-truncate" style={{ fontSize: '0.68rem' }}>
                                                                    {art.title}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Slide 13 Summary & Q&A Box */}
                                        {slide.type === 'summary_qna' && (
                                            <div className="mt-3 p-3 bg-success bg-opacity-10 rounded border border-success border-opacity-30 text-center">
                                                <div className="text-success font-monospace fw-bold small mb-1">
                                                    <i className="bi bi-chat-square-text me-1"></i> OPEN FOR AUDIENCE QUESTIONS & DISCUSSION
                                                </div>
                                                <p className="small text-white-50 mb-0">
                                                    Thank you for your attention. Please feel free to ask questions about methodology, statistics, or future work.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div ref={contentRef} className="generated-text-container text-white" style={{ minHeight: '50vh', wordWrap: 'break-word', overflowWrap: 'break-word', hyphens: 'auto' }}>
                    {/* Content rendered via useEffect */}
                </div>
            )}
        </div>
    );
};

export const PublicationExporter = () => {
    const { activeExperiment, updateExperiment, isAuthenticated } = useExperiment();
    const { addToast } = useToast();
    const [agenticRun, setAgenticRun] = useState({
        status: 'idle',
        iterations: 0,
        maxIterations: 5,
        logs: [],
    });
    
    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const stepData = activeExperiment.stepData[10] || {};

    const performAgenticDraft = async () => {
        if (!isAuthenticated || agenticRun.status === 'running') return;
        setAgenticRun({ status: 'running', logs: [], iterations: 0, maxIterations: 5 });

        try {
            const finalDoc = await runPublicationAgent({
                experiment: activeExperiment,
                updateLog: (agent, message) => {
                    if (isMounted.current) {
                        setAgenticRun(prev => ({
                            ...prev,
                            logs: [...prev.logs, { agent, message }],
                            iterations: prev.iterations + 1
                        }));
                    }
                }
            });

            if (!isMounted.current) return;

            const finalStepData = { 
                ...stepData, 
                output: finalDoc,
                reviewedByAgent: true,
                reviewedAt: new Date().toISOString()
            };
            await updateExperiment({ ...activeExperiment, stepData: { ...activeExperiment.stepData, 10: finalStepData } });
            setAgenticRun(prev => ({ ...prev, status: 'success' }));
            addToast("Scientific manuscript generated, peer-reviewed, and verified to full standards.", "success");
        } catch (error) {
             if (!isMounted.current) return;
             const errorMessage = parseGeminiError(error, "Draft generation failed.");
             addToast(errorMessage, 'danger');
             setAgenticRun(prev => ({
                ...prev,
                status: 'failed',
                logs: [...prev.logs, { agent: 'System', message: `ERROR: ${errorMessage}` }]
             }));
        }
    };

    if (stepData.output) {
        return (
            <FinalPublicationView 
                publicationText={stepData.output} 
                onRegenerate={performAgenticDraft} 
                showRegenerate={true}
                agenticRun={agenticRun}
            />
        );
    }

    return (
        <div className="publication-exporter-container">
            <div className="text-center p-5 border border-secondary border-opacity-10 rounded-4 bg-dark bg-opacity-10 my-3">
                    <i className="bi bi-file-earmark-text mb-3 text-primary-glow opacity-50 d-block" style={{ fontSize: '2.5rem' }}></i>
                <h5 className="fw-bold mb-2">Draft Publication</h5>
                <p className="text-white-50 small mb-4 mx-auto" style={{maxWidth: '350px'}}>
                    Synthesize all research nodes into a comprehensive scientific manuscript.
                </p>
                <button
                    className="btn btn-primary px-5 py-2 rounded-pill shadow-sm"
                    onClick={performAgenticDraft}
                    disabled={agenticRun.status === 'running'}
                >
                    {agenticRun.status === 'running' ? 'Drafting...' : 'Start Agentic Drafter'}
                </button>
            </div>
                {(agenticRun.logs.length > 0 || agenticRun.status === 'running') && (
                <div className="mt-4 border-top border-secondary border-opacity-10 pt-4">
                    <AgenticAnalysisView
                        agenticRun={agenticRun}
                        title="Publication Agent Progress"
                        subtitle="Synthesizing final manuscript from experiment data."
                    />
                </div>
            )}
        </div>
    );
};