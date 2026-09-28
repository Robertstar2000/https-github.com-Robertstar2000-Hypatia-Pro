import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useToast } from '../../toast';
import { useExperiment, getKeyStatus, callGeminiWithRetry, safeGetText } from '../../services';
import { ResearchSummary } from './ResearchSummary';
import { SCIENTIFIC_FIELDS } from '../../config';
import { LLMProviderModal } from '../common/LLMProviderModal';

interface LandingPageProps {
    setView: (view: string) => void;
    user?: any;
    onLogout?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setView, user, onLogout }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [field, setField] = useState<string>('');
    const [experimentMode, setExperimentMode] = useState<'simulation' | 'physical'>('simulation');
    const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
    const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
    const [showLLMModal, setShowLLMModal] = useState(false);
    const [keyStatus, setKeyStatus] = useState(getKeyStatus);
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        const handleUpdate = () => setKeyStatus(getKeyStatus());
        window.addEventListener('hypatia-llm-config-updated', handleUpdate);
        return () => window.removeEventListener('hypatia-llm-config-updated', handleUpdate);
    }, []);

    const { createNewExperiment, experiments, selectExperiment, deleteExperiment } = useExperiment();

    const savedProjects = useMemo(() => {
        return Array.isArray(experiments) ? experiments.slice(0, 4) : [];
    }, [experiments]);

    const sampleTopics = [
        {
            title: "Caffeine & Arabidopsis Thaliana Growth",
            field: "Biology",
            mode: "simulation" as const,
            desc: "Investigate the concentration-dependent inhibitory effects of exogenous caffeine on root elongation and hypocotyl growth in Arabidopsis thaliana."
        },
        {
            title: "Quantum Hall Conductance in Graphene",
            field: "Physics",
            mode: "simulation" as const,
            desc: "Simulate topological edge states and Shubnikov-de Haas oscillations in monolayer graphene under high magnetic field regimes."
        },
        {
            title: "Circadian Rhythm on Working Memory",
            field: "Neuroscience",
            mode: "physical" as const,
            desc: "Measure n-back cognitive accuracy across morning (08:00) vs. late night (23:00) cohorts controlling for sleep hygiene and caffeine intake."
        },
        {
            title: "Microalgal Carbon Fixation Rates",
            field: "Climate Science",
            mode: "simulation" as const,
            desc: "Evaluate RuBisCO kinetic efficiency and photosynthetic biomass yields under elevated dissolved inorganic carbon and thermal stress conditions."
        }
    ];

    const handleSelectSample = (sample: typeof sampleTopics[0]) => {
        setTitle(sample.title);
        setField(sample.field);
        setExperimentMode(sample.mode);
        setDescription(sample.desc);
        addToast(`Loaded preset protocol: "${sample.title}"`, 'info');
    };

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!title.trim()) {
            addToast("Please enter a research project title.", "warning");
            return;
        }
        if (!description.trim()) {
            addToast("Please describe your research question or idea.", "warning");
            return;
        }
        if (!field) {
            addToast("Please select a primary scientific field.", "warning");
            return;
        }
        if (!experimentMode) {
            addToast("Please choose an experimental execution mode.", "warning");
            return;
        }
        
        try {
            await createNewExperiment(title.trim(), description.trim(), field, experimentMode);
            setView('experiment');
        } catch (err) {
            console.error("Failed to initialize project:", err);
            addToast("Error creating project. Please check local database storage.", "danger");
        }
    };

    const handleAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!title.trim()) {
            addToast("Please specify a Project Title first so context can be extracted.", "warning");
            e.target.value = '';
            return;
        }

        setIsAnalyzingFile(true);
        setAttachedFileName(file.name);
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const textContent = event.target?.result as string;
                if (!textContent || textContent.trim().length === 0) {
                    throw new Error("Uploaded file appears to be empty.");
                }

                addToast(`Analyzing ${file.name} context with Gemini...`, "info");

                const prompt = `
                    ACT AS: Senior Scientific Research Analyst.
                    TASK: Analyze the provided text file and extract essential background facts, methodological parameters, baseline figures, and literature references relevant to the research topic: "${title}".
                    
                    DOCUMENT CONTENT:
                    ${textContent.substring(0, 30000)}

                    OUTPUT REQUIREMENT:
                    Provide a concise, bulleted factual synthesis to append to the project brief. Do NOT output markdown code blocks or greeting text.
                `;

                const response = await callGeminiWithRetry('gemini-2.5-flash', { contents: prompt });
                const extractedText = safeGetText(response);
                
                setDescription(prev => {
                    const separator = prev.trim() 
                        ? `\n\n--- INGESTED DOCUMENT CONTEXT (${file.name}) ---\n` 
                        : `--- INGESTED DOCUMENT CONTEXT (${file.name}) ---\n`;
                    return prev + separator + extractedText;
                });

                addToast(`Successfully extracted context from ${file.name}.`, "success");

            } catch (error: any) {
                console.error("Attachment analysis failed:", error);
                addToast(error?.message || "Failed to analyze document. Ensure it contains plain readable text.", "danger");
                setAttachedFileName(null);
            } finally {
                setIsAnalyzingFile(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.onerror = () => {
            addToast("Error reading file from disk.", "danger");
            setIsAnalyzingFile(false);
            setAttachedFileName(null);
        };

        reader.readAsText(file);
    };

    const handleRemoveAttachment = () => {
        setAttachedFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        addToast("Attached file reference removed.", "info");
    };

    return (
        <div className="container py-2 py-md-4" style={{ maxWidth: '1080px' }}>
            
            {/* Hero Header Section */}
            <section className="text-center py-4 py-md-5 mb-2">
                <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-dark border border-secondary border-opacity-25 text-white-50 small font-mono mb-3 shadow-sm">
                    <i className="bi bi-cpu-fill text-primary-glow"></i>
                    <span>MIFECO SCIENTIFIC RESEARCH ARCHITECTURE</span>
                </div>

                <h1 className="display-5 fw-bold text-white mb-3" style={{ letterSpacing: '-0.02em' }}>
                    Autonomous Scientific <span className="text-primary-glow">Discovery Platform</span>
                </h1>

                <p className="lead text-white-50 mx-auto mb-4" style={{ maxWidth: '760px', fontSize: '1.05rem', lineHeight: '1.6' }}>
                    Formulate falsifiable hypotheses, synthesize peer-reviewed literature, execute Monte Carlo or bench protocols, and author camera-ready scientific manuscripts with multi-agent verification.
                </p>

                {/* Capability Badges */}
                <div className="d-flex flex-wrap justify-content-center gap-2 gap-md-3 font-mono small">
                    <span className="badge rounded-pill bg-dark border border-secondary border-opacity-25 px-3 py-2 text-white-50 d-inline-flex align-items-center">
                        <i className="bi bi-diagram-3-fill text-primary-glow me-2"></i> 10 Research Phases
                    </span>
                    <span className="badge rounded-pill bg-dark border border-secondary border-opacity-25 px-3 py-2 text-white-50 d-inline-flex align-items-center">
                        <i className="bi bi-activity text-info me-2"></i> Monte Carlo Simulations
                    </span>
                    <span className="badge rounded-pill bg-dark border border-secondary border-opacity-25 px-3 py-2 text-white-50 d-inline-flex align-items-center">
                        <i className="bi bi-shield-check text-success me-2"></i> Adversarial Peer Audit
                    </span>
                    <span className="badge rounded-pill bg-dark border border-secondary border-opacity-25 px-3 py-2 text-white-50 d-inline-flex align-items-center">
                        <i className="bi bi-database-check text-primary-glow me-2"></i> Offline IndexedDB
                    </span>
                </div>
            </section>

            {/* Active Investigation Resume Banner */}
            <ResearchSummary setView={setView} />

            {/* Protocol Designer Card */}
            <div className="card shadow-lg border-secondary border-opacity-25 mb-5 overflow-hidden">
                
                {/* Card Header Bar */}
                <div className="card-header bg-transparent border-bottom border-secondary border-opacity-25 py-3 px-3 px-md-4">
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                        <div>
                            <span className="text-primary-glow small font-mono fw-bold text-uppercase d-block" style={{ letterSpacing: '0.05em' }}>
                                Step-by-Step Protocol Designer
                            </span>
                            <h2 className="h4 fw-bold text-white mb-0 mt-1">
                                Design New Investigation
                            </h2>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setView('auth')}
                                className="btn btn-outline-secondary btn-sm px-2.5 py-1 text-white border-opacity-25 hover-border-primary d-flex align-items-center gap-1.5 font-mono"
                                style={{ fontSize: '0.78rem' }}
                                title="Sign in, Demo Free, or Mifeco Business Stripe Authority"
                            >
                                <i className="bi bi-person-badge text-primary-glow"></i>
                                <span>Sign In / Authority</span>
                            </button>
                            <span className="badge bg-dark border border-secondary border-opacity-25 text-white-50 font-mono px-2 py-1">
                                Phase 01 of 10
                            </span>
                        </div>
                    </div>
                </div>

                <div className="card-body p-3 p-md-4">
                    
                    {/* Interactive LLM Provider & Key Configuration Banner */}
                    <div className="p-3 mb-4 rounded-3 border border-secondary border-opacity-25 bg-black bg-opacity-30 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                        <div className="d-flex align-items-center gap-3">
                            <div className="rounded-2 p-2 bg-sky-500 bg-opacity-10 text-primary-glow border border-sky-500 border-opacity-25 shrink-0">
                                <i className="bi bi-cpu-fill fs-5"></i>
                            </div>
                            <div>
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                    <span className="fw-bold text-white small font-mono">
                                        AI ENGINE: {keyStatus.providerName || 'Google Gemini'}
                                    </span>
                                    <span className="badge bg-dark border border-secondary border-opacity-25 text-white-50 font-mono small">
                                        {keyStatus.model || 'gemini-2.5-flash'}
                                    </span>
                                    {keyStatus.isOAuth ? (
                                        <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 small">
                                            <i className="bi bi-shield-check me-1"></i>OAuth Linked
                                        </span>
                                    ) : keyStatus.type === 'manual' ? (
                                        <span className="badge bg-info bg-opacity-25 text-info border border-info border-opacity-25 small">
                                            <i className="bi bi-key-fill me-1"></i>Custom Key Active
                                        </span>
                                    ) : keyStatus.type === 'env' ? (
                                        <span className="badge bg-primary bg-opacity-25 text-primary-glow border border-primary border-opacity-25 small">
                                            <i className="bi bi-check-circle-fill me-1"></i>System Key
                                        </span>
                                    ) : (
                                        <span className="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-25 small">
                                            <i className="bi bi-exclamation-triangle-fill me-1"></i>Needs Key
                                        </span>
                                    )}
                                </div>
                                <div className="text-white-50 small mt-0.5" style={{ fontSize: '0.78rem' }}>
                                    Google Gemini, OpenAI, Anthropic, Ollama, and OpenRouter supported with custom keys or OAuth subscriptions.
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 d-flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setShowLLMModal(true)}
                                className="btn btn-outline-primary btn-sm px-3 py-1.5 d-flex align-items-center gap-1.5 w-100 w-md-auto justify-content-center"
                                style={{ minHeight: '36px' }}
                            >
                                <i className="bi bi-key-fill text-primary-glow"></i>
                                <span>Enter Your Own Key / LLM Provider</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('auth')}
                                className="btn btn-outline-secondary btn-sm px-2.5 py-1.5 d-flex align-items-center gap-1.5 text-white-50 border-opacity-25 hover-border-primary"
                                style={{ minHeight: '36px', fontSize: '0.78rem' }}
                                title="Mifeco Business Stripe Authority Access"
                            >
                                <i className="bi bi-stripe text-indigo-400"></i>
                                <span>Stripe Authority</span>
                            </button>
                        </div>
                    </div>

                    {/* Quick Presets / Starter Topics */}
                    <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-white-50 small font-mono text-uppercase fw-semibold d-flex align-items-center gap-1">
                                <i className="bi bi-lightning-charge-fill text-primary-glow"></i>
                                Quick Presets / Starters:
                            </span>
                            <span className="text-white-50 small d-none d-sm-inline" style={{ fontSize: '0.8rem' }}>
                                Click to populate protocol parameters
                            </span>
                        </div>

                        <div className="row g-2">
                            {sampleTopics.map((sample, idx) => (
                                <div key={idx} className="col-12 col-sm-6 col-lg-3">
                                    <button
                                        type="button"
                                        onClick={() => handleSelectSample(sample)}
                                        className="btn btn-outline-secondary text-start w-100 p-2 p-md-3 h-100 d-flex flex-column justify-content-between border-opacity-25 hover-border-primary"
                                        style={{ 
                                            background: 'rgba(0, 0, 0, 0.25)', 
                                            borderRadius: '10px',
                                            minHeight: '74px',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div className="d-flex justify-content-between align-items-center w-100 font-mono mb-1" style={{ fontSize: '0.72rem' }}>
                                            <span className="text-primary-glow fw-bold">{sample.field}</span>
                                            <span className="text-white-50 text-capitalize">{sample.mode}</span>
                                        </div>
                                        <div className="text-white small fw-semibold text-truncate w-100" title={sample.title}>
                                            {sample.title}
                                        </div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Form */}
                    <form onSubmit={handleStart} className="d-flex flex-column gap-4">
                        
                        {/* 01. Experimental Execution Mode */}
                        <div>
                            <label className="form-label text-white-50 small font-mono fw-bold text-uppercase mb-2">
                                01. Experimental Execution Mode
                            </label>
                            
                            <div className="row g-3">
                                <div className="col-12 col-md-6">
                                    <div
                                        onClick={() => setExperimentMode('simulation')}
                                        className={`p-3 rounded-3 border cursor-pointer h-100 transition-all ${
                                            experimentMode === 'simulation'
                                                ? 'border-primary-glow bg-dark bg-opacity-75 shadow-sm'
                                                : 'border-secondary border-opacity-25 bg-dark bg-opacity-25 text-white-50'
                                        }`}
                                        style={{ 
                                            cursor: 'pointer',
                                            borderColor: experimentMode === 'simulation' ? 'var(--primary-glow)' : undefined,
                                            boxShadow: experimentMode === 'simulation' ? '0 0 15px rgba(0, 242, 254, 0.12)' : 'none'
                                        }}
                                    >
                                        <div className="d-flex align-items-start gap-3">
                                            <div className={`p-2 rounded-2 ${experimentMode === 'simulation' ? 'bg-primary-glow text-dark' : 'bg-secondary bg-opacity-25 text-white-50'}`}>
                                                <i className="bi bi-cpu fs-4"></i>
                                            </div>
                                            <div className="flex-grow-1">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className={`fw-bold ${experimentMode === 'simulation' ? 'text-white' : 'text-white-50'}`}>
                                                        Autonomous Simulation
                                                    </span>
                                                    {experimentMode === 'simulation' && (
                                                        <span className="badge bg-primary-glow text-dark font-mono px-2 py-1" style={{ fontSize: '0.65rem' }}>
                                                            SELECTED
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="small text-white-50 mb-0 mt-1" style={{ lineHeight: '1.4' }}>
                                                    In-browser Monte Carlo models, synthetic datasets, and Web Worker code execution.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12 col-md-6">
                                    <div
                                        onClick={() => setExperimentMode('physical')}
                                        className={`p-3 rounded-3 border cursor-pointer h-100 transition-all ${
                                            experimentMode === 'physical'
                                                ? 'border-primary-glow bg-dark bg-opacity-75 shadow-sm'
                                                : 'border-secondary border-opacity-25 bg-dark bg-opacity-25 text-white-50'
                                        }`}
                                        style={{ 
                                            cursor: 'pointer',
                                            borderColor: experimentMode === 'physical' ? 'var(--primary-glow)' : undefined,
                                            boxShadow: experimentMode === 'physical' ? '0 0 15px rgba(0, 242, 254, 0.12)' : 'none'
                                        }}
                                    >
                                        <div className="d-flex align-items-start gap-3">
                                            <div className={`p-2 rounded-2 ${experimentMode === 'physical' ? 'bg-primary-glow text-dark' : 'bg-secondary bg-opacity-25 text-white-50'}`}>
                                                <i className="bi bi-flask fs-4"></i>
                                            </div>
                                            <div className="flex-grow-1">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className={`fw-bold ${experimentMode === 'physical' ? 'text-white' : 'text-white-50'}`}>
                                                        Empirical Lab Protocol
                                                    </span>
                                                    {experimentMode === 'physical' && (
                                                        <span className="badge bg-primary-glow text-dark font-mono px-2 py-1" style={{ fontSize: '0.65rem' }}>
                                                            SELECTED
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="small text-white-50 mb-0 mt-1" style={{ lineHeight: '1.4' }}>
                                                    Bench protocols, real-world wet/dry lab workflows, manual measurements, and CSV ingest.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 02. Title and Field in a responsive row */}
                        <div className="row g-3">
                            <div className="col-12 col-md-8">
                                <label className="form-label text-white-50 small font-mono fw-bold text-uppercase mb-1">
                                    02. Project Title
                                </label>
                                <input 
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. Concentration-Dependent Effects of Caffeine on Arabidopsis Root Elongation"
                                    required
                                    className="form-control form-control-lg text-white"
                                    style={{ fontSize: '1rem', minHeight: '48px' }}
                                />
                            </div>

                            <div className="col-12 col-md-4">
                                <label className="form-label text-white-50 small font-mono fw-bold text-uppercase mb-1">
                                    03. Scientific Field
                                </label>
                                <select
                                    value={field}
                                    onChange={e => setField(e.target.value)}
                                    required
                                    className="form-select form-select-lg text-white"
                                    style={{ fontSize: '1rem', minHeight: '48px' }}
                                >
                                    <option value="" disabled>Select Discipline</option>
                                    {SCIENTIFIC_FIELDS.map(f => (
                                        <option key={f} value={f} className="bg-dark text-white">{f}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* 03. Context Ingestion (Optional) */}
                        <div>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <label className="form-label text-white-50 small font-mono fw-bold text-uppercase mb-0">
                                    04. Ingest Existing Papers / Notes / Data (Optional)
                                </label>
                                {attachedFileName && (
                                    <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 font-mono d-inline-flex align-items-center gap-1">
                                        <i className="bi bi-check-circle-fill"></i>
                                        <span>{attachedFileName}</span>
                                        <button 
                                            type="button" 
                                            onClick={handleRemoveAttachment}
                                            className="btn btn-link btn-sm text-success p-0 ms-1"
                                            title="Remove attachment"
                                        >
                                            <i className="bi bi-x"></i>
                                        </button>
                                    </span>
                                )}
                            </div>

                            <div className="p-3 rounded-3 border border-secondary border-opacity-25 bg-dark bg-opacity-25 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="p-2 rounded-2 bg-dark border border-secondary border-opacity-25 text-primary-glow shrink-0">
                                        <i className="bi bi-cloud-arrow-up fs-4"></i>
                                    </div>
                                    <div>
                                        <div className="text-white small fw-semibold">
                                            {isAnalyzingFile ? 'Extracting structural variables with Gemini...' : 'Attach background literature, lab notebook notes, or raw datasets'}
                                        </div>
                                        <div className="text-white-50" style={{ fontSize: '0.78rem' }}>
                                            Plain text, .md, .csv, .json, .py files (max 30,000 characters)
                                        </div>
                                    </div>
                                </div>

                                <div className="shrink-0">
                                    <input 
                                        type="file" 
                                        accept=".txt,.md,.csv,.json,.js,.py"
                                        onChange={handleAttachment}
                                        disabled={isAnalyzingFile}
                                        ref={fileInputRef}
                                        className="d-none"
                                        id="protocol-file-input"
                                    />
                                    <label 
                                        htmlFor="protocol-file-input"
                                        className={`btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center gap-2 px-3 py-2 ${
                                            isAnalyzingFile ? 'disabled' : ''
                                        }`}
                                        style={{ cursor: isAnalyzingFile ? 'not-allowed' : 'pointer', minHeight: '44px' }}
                                    >
                                        {isAnalyzingFile ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm text-primary-glow" role="status" aria-hidden="true"></span>
                                                <span>Analyzing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-file-earmark-text text-primary-glow"></i>
                                                <span>Browse Document</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* 04. Detailed Research Brief */}
                        <div>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <label className="form-label text-white-50 small font-mono fw-bold text-uppercase mb-0">
                                    05. Research Hypothesis &amp; Methodology Scope
                                </label>
                                <span className="text-white-50 font-mono" style={{ fontSize: '0.75rem' }}>
                                    {description.length} chars
                                </span>
                            </div>

                            <textarea 
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Detail your specific research question, independent and dependent variables, hypothesized physiological or mathematical mechanisms, control conditions, and sample requirements..."
                                required
                                rows={5}
                                className="form-control font-mono text-white"
                                style={{ fontSize: '0.9rem', lineHeight: '1.6' }}
                            />
                        </div>

                        {/* Preregistration & Rigor Banner */}
                        <div className="p-3 rounded-3 bg-dark bg-opacity-50 border border-secondary border-opacity-25 small text-white-50">
                            <div className="d-flex align-items-start gap-3">
                                <i className="bi bi-shield-check fs-4 text-primary-glow shrink-0"></i>
                                <div>
                                    <span className="text-white fw-semibold">Reproducibility &amp; Scientific Integrity Standards:</span>
                                    <p className="mb-0 mt-1" style={{ lineHeight: '1.4' }}>
                                        Hypatia automatically computes required statistical sample size (power &ge; 0.80, &alpha; = 0.05), validates against hallucinated citations with CrossRef / DOI checks, and logs cryptographic provenance hashes for every step.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Submit Action Button */}
                        <div>
                            <button
                                type="submit"
                                disabled={isAnalyzingFile}
                                className="btn btn-primary btn-lg w-100 py-3 shadow d-flex align-items-center justify-content-center gap-2 fw-bold"
                                style={{ letterSpacing: '0.05em', minHeight: '52px' }}
                            >
                                <span>INITIALIZE DISCOVERY PROTOCOL</span>
                                <i className="bi bi-arrow-right-circle-fill fs-5"></i>
                            </button>
                        </div>

                    </form>
                </div>
            </div>

            {/* Stored Laboratory Investigations (if any exist) */}
            {savedProjects.length > 0 && (
                <section className="mb-5">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-folder2-open text-primary-glow fs-5"></i>
                            <h3 className="h6 fw-bold text-white mb-0 text-uppercase font-mono" style={{ letterSpacing: '0.05em' }}>
                                Stored Research Investigations
                            </h3>
                        </div>
                        <button 
                            onClick={() => setView('dashboard')}
                            className="btn btn-link btn-sm text-primary-glow text-decoration-none p-0 d-flex align-items-center gap-1"
                        >
                            <span>View All Archives ({experiments.length})</span>
                            <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>

                    <div className="row g-3">
                        {savedProjects.map(project => (
                            <div key={project.id} className="col-12 col-md-6">
                                <div className="card h-100 shadow-sm border-secondary border-opacity-25 d-flex flex-column justify-content-between p-3">
                                    <div>
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="badge bg-dark border border-secondary border-opacity-25 text-white-50 font-mono">
                                                {project.field || 'Interdisciplinary'}
                                            </span>
                                            <span className="text-primary-glow small font-mono">
                                                Step {project.currentStep || 1} of 10
                                            </span>
                                        </div>
                                        <h4 className="card-title text-white fw-bold mb-2 text-truncate" style={{ fontSize: '1rem' }} title={project.title}>
                                            {project.title}
                                        </h4>
                                        <p className="card-text text-white-50 small mb-3" style={{
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}>
                                            {project.description}
                                        </p>
                                    </div>

                                    <div className="pt-2 border-top border-secondary border-opacity-25 d-flex justify-content-between align-items-center">
                                        <span className="text-white-50 small font-mono" style={{ fontSize: '0.75rem' }}>
                                            {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}
                                        </span>
                                        
                                        <div className="d-flex align-items-center gap-2">
                                            <button 
                                                onClick={() => deleteExperiment(project.id)}
                                                className="btn btn-outline-danger btn-sm p-1 px-2"
                                                title="Delete Project"
                                                style={{ minHeight: '36px', minWidth: '36px' }}
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                            <button 
                                                onClick={() => selectExperiment(project.id)}
                                                className="btn btn-outline-primary btn-sm px-3 py-1 text-primary-glow border-opacity-50"
                                                style={{ minHeight: '36px' }}
                                            >
                                                Open Workspace
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* 10-Phase Scientific Lifecycle Overview */}
            <section className="text-center py-4 mb-3">
                <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-dark border border-secondary border-opacity-25 text-white-50 small font-mono mb-2">
                    <i className="bi bi-diagram-3 text-primary-glow"></i>
                    <span>STANDARDIZED METHODOLOGY</span>
                </div>

                <h2 className="h4 fw-bold text-white mb-2">
                    The 10-Phase Scientific Lifecycle
                </h2>
                <p className="text-white-50 small mx-auto mb-4" style={{ maxWidth: '620px', lineHeight: '1.6' }}>
                    Deterministic, verifiable transitions ensuring complete reproducibility from first principles to publication.
                </p>

                <div className="row g-3 text-start">
                    <div className="col-12 col-md-4">
                        <div className="card h-100 shadow-sm border-secondary border-opacity-25 p-3 p-md-4">
                            <div className="d-inline-flex align-items-center justify-content-center bg-primary-dim text-primary-glow rounded-3 font-mono fw-bold px-2 py-1 mb-3" style={{ width: 'fit-content', fontSize: '0.8rem' }}>
                                PHASES 01–04
                            </div>
                            <h4 className="h6 fw-bold text-white mb-2">
                                Ideation &amp; Literature Review
                            </h4>
                            <p className="small text-white-50 mb-0" style={{ lineHeight: '1.5' }}>
                                Formulate falsifiable hypotheses, construct decision trees, query peer-reviewed literature, and define variable controls.
                            </p>
                        </div>
                    </div>

                    <div className="col-12 col-md-4">
                        <div className="card h-100 shadow-sm border-secondary border-opacity-25 p-3 p-md-4">
                            <div className="d-inline-flex align-items-center justify-content-center bg-primary-dim text-primary-glow rounded-3 font-mono fw-bold px-2 py-1 mb-3" style={{ width: 'fit-content', fontSize: '0.8rem' }}>
                                PHASES 05–07
                            </div>
                            <h4 className="h6 fw-bold text-white mb-2">
                                Simulation &amp; Data Analysis
                            </h4>
                            <p className="small text-white-50 mb-0" style={{ lineHeight: '1.5' }}>
                                Execute isolated Web Worker Monte Carlo runs, calculate effect sizes (Cohen's d, &eta;&sup2;), ANOVA, and generate publication charts.
                            </p>
                        </div>
                    </div>

                    <div className="col-12 col-md-4">
                        <div className="card h-100 shadow-sm border-secondary border-opacity-25 p-3 p-md-4">
                            <div className="d-inline-flex align-items-center justify-content-center bg-primary-dim text-primary-glow rounded-3 font-mono fw-bold px-2 py-1 mb-3" style={{ width: 'fit-content', fontSize: '0.8rem' }}>
                                PHASES 08–10
                            </div>
                            <h4 className="h6 fw-bold text-white mb-2">
                                Peer Audit &amp; Publication
                            </h4>
                            <p className="small text-white-50 mb-0" style={{ lineHeight: '1.5' }}>
                                Multi-agent adversarial reviews by statistician and domain auditor bots, followed by camera-ready LaTeX, PDF, and PPTX export.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {showLLMModal && (
                <LLMProviderModal
                    isOpen={showLLMModal}
                    onClose={() => {
                        setShowLLMModal(false);
                        setKeyStatus(getKeyStatus());
                    }}
                    onSaved={() => {
                        setKeyStatus(getKeyStatus());
                    }}
                />
            )}

        </div>
    );
};
