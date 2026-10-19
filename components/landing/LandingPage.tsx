import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useToast } from '../../toast';
import { useExperiment, getKeyStatus, callGeminiWithRetry, safeGetText } from '../../services';
import { MODEL_CAPABILITY_NOTICE } from '../../services/llmConfig';
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
    const [automationProtocol, setAutomationProtocol] = useState<'automated' | 'manual'>('automated');
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
        if (!Array.isArray(experiments)) return [];
        const seen = new Set<string>();
        const unique = experiments.filter(e => {
            if (!e) return false;
            const key = String(e.id || '');
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        return unique.slice(0, 4);
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

    const handleQuickStart = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        if (!description.trim()) {
            addToast("Please enter a research question or inquiry scope to get started.", "warning");
            const ta = (document.getElementById('mobile-research-question-textarea') || document.getElementById('research-question-textarea')) as HTMLTextAreaElement;
            if (ta) ta.focus();
            return;
        }

        const effectiveField = field || 'Biology';
        const effectiveMode = experimentMode || 'simulation';
        const cleanFirstLine = description.trim().split('\n')[0].replace(/^#+\s*/, '').replace(/^[0-9.]+\s*/, '').trim();
        const effectiveTitle = title.trim() || (cleanFirstLine.length > 5 ? cleanFirstLine.slice(0, 75) : `Investigation: ${effectiveField} Protocol`);

        try {
            await createNewExperiment(effectiveTitle, description.trim(), effectiveField, effectiveMode, automationProtocol);
            addToast("Research question & scope initialized. Launching Phase 01...", "success");
            setView('experiment');
        } catch (err) {
            console.error("Failed to initialize project from quick start:", err);
            addToast("Error initializing project. Please check local database storage.", "danger");
        }
    };

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!description.trim()) {
            addToast("Please describe your research question or idea to get started.", "warning");
            const el = document.getElementById('research-question-scope-entry');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        
        const effectiveField = field || 'Biology';
        const effectiveMode = experimentMode || 'simulation';
        const cleanFirstLine = description.trim().split('\n')[0].replace(/^#+\s*/, '').replace(/^[0-9.]+\s*/, '').trim();
        const effectiveTitle = title.trim() || (cleanFirstLine.length > 5 ? cleanFirstLine.slice(0, 75) : `Investigation: ${effectiveField} Protocol`);
        
        try {
            await createNewExperiment(effectiveTitle, description.trim(), effectiveField, effectiveMode, automationProtocol);
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

                addToast(`Analyzing ${file.name} context with AI...`, "info");

                const prompt = `
                    ACT AS: Senior Scientific Research Analyst.
                    TASK: Analyze the provided text file and extract essential background facts, methodological parameters, baseline figures, and literature references relevant to the research topic: "${title}".
                    
                    DOCUMENT CONTENT:
                    ${textContent.substring(0, 30000)}

                    OUTPUT REQUIREMENT:
                    Provide a concise, bulleted factual synthesis to append to the project brief. Do NOT output markdown code blocks or greeting text.
                `;

                const response = await callGeminiWithRetry('', { contents: prompt });
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
        <div className="container py-2 py-md-4 pb-5 pb-md-4" style={{ maxWidth: '1080px' }}>
            
            {/* Hero Header Section */}
            <section className="text-center py-3 py-md-5 mb-2">
                <div className="d-flex flex-wrap align-items-center justify-content-center gap-2 mb-3">
                    <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-dark border border-secondary border-opacity-25 text-white-50 small font-mono shadow-sm">
                        <i className="bi bi-cpu-fill text-primary-glow"></i>
                        <span>MIFECO SCIENTIFIC RESEARCH ARCHITECTURE</span>
                    </div>
                    <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-dark border border-secondary border-opacity-25 text-white-50 small font-mono shadow-sm">
                        <i className="bi bi-mortarboard-fill text-primary-glow"></i>
                        <span>Idea Credited to <strong>"The AI Scientist"</strong> (Sakana AI &middot; Oxford &middot; UBC)</span>
                    </div>
                </div>

                <h1 className="display-5 fw-bold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
                    Autonomous Scientific <span className="text-primary-glow">Discovery Platform</span>
                </h1>

                <p className="lead text-white-50 mx-auto mb-4" style={{ maxWidth: '760px', fontSize: '1rem', lineHeight: '1.5' }}>
                    Formulate falsifiable hypotheses, synthesize peer-reviewed literature, execute Monte Carlo or bench protocols, and author camera-ready scientific manuscripts with multi-agent verification.
                </p>

                {/* Instant Mobile & Desktop Quick-Start: Research Question & Scope Card */}
                <div id="mobile-research-scope-card" className="card border-primary-glow border-opacity-40 bg-dark bg-opacity-75 shadow-lg mb-4 text-start rounded-3 overflow-hidden mx-auto" style={{ maxWidth: '780px' }}>
                    <div className="card-header bg-black bg-opacity-40 border-bottom border-secondary border-opacity-25 py-2.5 px-3 px-md-4">
                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                            <div className="d-flex align-items-center gap-2">
                                <span className="badge bg-primary-glow text-dark font-mono px-2 py-0.5 fw-bold" style={{ fontSize: '0.72rem' }}>
                                    STEP 01
                                </span>
                                <span className="fw-bold text-white small font-mono text-uppercase">
                                    Research Question &amp; Methodological Scope
                                </span>
                            </div>
                            <span className="badge bg-success bg-opacity-20 text-success border border-success border-opacity-25 font-mono" style={{ fontSize: '0.68rem' }}>
                                <i className="bi bi-phone me-1"></i> Mobile Ready
                            </span>
                        </div>
                    </div>

                    <div className="card-body p-3 p-md-4">
                        <p className="text-white-50 small mb-2" style={{ fontSize: '0.84rem', lineHeight: '1.45' }}>
                            Formulate your core scientific question, dependent/independent variables, or testable hypothesis to immediately launch your investigation:
                        </p>

                        {/* Mobile Quick-Insert Parameter Snippets */}
                        <div className="mb-2">
                            <div className="d-flex align-items-center justify-content-between mb-1.5 flex-wrap gap-1">
                                <span className="text-white-50 font-mono" style={{ fontSize: '0.72rem' }}>
                                    <i className="bi bi-magic text-primary-glow me-1"></i> Quick Scope Builders:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleSelectSample(sampleTopics[0])}
                                    className="btn btn-link btn-xs text-info p-0 font-mono text-decoration-none"
                                    style={{ fontSize: '0.72rem' }}
                                >
                                    <i className="bi bi-lightning-charge me-1"></i> Load Sample Question
                                </button>
                            </div>
                            <div className="d-flex flex-wrap gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setDescription(prev => prev + (prev.trim() ? '\n\n' : '') + "Independent Variable: \nDependent Variable: ")}
                                    className="btn btn-outline-secondary btn-xs py-1 px-2 text-white-50 border-opacity-25 hover-border-primary font-mono rounded-2"
                                    style={{ fontSize: '0.72rem', minHeight: '32px' }}
                                >
                                    + Variables (IV/DV)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDescription(prev => prev + (prev.trim() ? '\n\n' : '') + "Hypothesized Mechanism: ")}
                                    className="btn btn-outline-secondary btn-xs py-1 px-2 text-white-50 border-opacity-25 hover-border-primary font-mono rounded-2"
                                    style={{ fontSize: '0.72rem', minHeight: '32px' }}
                                >
                                    + Mechanism
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDescription(prev => prev + (prev.trim() ? '\n\n' : '') + "Control Group & Baseline Conditions: ")}
                                    className="btn btn-outline-secondary btn-xs py-1 px-2 text-white-50 border-opacity-25 hover-border-primary font-mono rounded-2"
                                    style={{ fontSize: '0.72rem', minHeight: '32px' }}
                                >
                                    + Control Conditions
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDescription(prev => prev + (prev.trim() ? '\n\n' : '') + "Target Sample Size (N) & Demographics: ")}
                                    className="btn btn-outline-secondary btn-xs py-1 px-2 text-white-50 border-opacity-25 hover-border-primary font-mono rounded-2"
                                    style={{ fontSize: '0.72rem', minHeight: '32px' }}
                                >
                                    + Sample Size (N)
                                </button>
                            </div>
                        </div>

                        {/* Textarea */}
                        <div className="mb-3">
                            <textarea
                                id="mobile-research-question-textarea"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Detail your scientific research question, hypothesized mechanisms, variables, and empirical boundaries..."
                                rows={4}
                                className="form-control font-mono text-white bg-black bg-opacity-40 border-secondary border-opacity-25"
                                style={{ fontSize: '1rem', lineHeight: '1.5', minHeight: '110px' }}
                            />
                        </div>

                        {/* Quick Configuration Grid: Field + Mode + Protocol */}
                        <div className="row g-2 mb-3">
                            <div className="col-12 col-md-4">
                                <label className="form-label text-white-50 small font-mono mb-1" style={{ fontSize: '0.75rem' }}>
                                    Discipline / Field:
                                </label>
                                <select
                                    value={field}
                                    onChange={e => setField(e.target.value)}
                                    className="form-select form-select-sm text-white bg-dark border-secondary border-opacity-25"
                                    style={{ fontSize: '0.85rem', minHeight: '40px' }}
                                >
                                    <option value="">Select Field (Defaults to Biology)</option>
                                    {SCIENTIFIC_FIELDS.map(f => (
                                        <option key={f} value={f} className="bg-dark text-white">{f}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-6 col-md-4">
                                <label className="form-label text-white-50 small font-mono mb-1" style={{ fontSize: '0.75rem' }}>
                                    Execution Mode:
                                </label>
                                <div className="btn-group w-100" role="group">
                                    <button
                                        type="button"
                                        onClick={() => setExperimentMode('simulation')}
                                        className={`btn btn-sm ${experimentMode === 'simulation' ? 'btn-primary text-dark fw-bold' : 'btn-outline-secondary text-white-50'} py-2`}
                                        style={{ fontSize: '0.8rem', minHeight: '40px' }}
                                    >
                                        <i className="bi bi-cpu me-1"></i> Simulation
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setExperimentMode('physical')}
                                        className={`btn btn-sm ${experimentMode === 'physical' ? 'btn-primary text-dark fw-bold' : 'btn-outline-secondary text-white-50'} py-2`}
                                        style={{ fontSize: '0.8rem', minHeight: '40px' }}
                                    >
                                        <i className="bi bi-flask me-1"></i> Lab
                                    </button>
                                </div>
                            </div>
                            <div className="col-6 col-md-4">
                                <label className="form-label text-white-50 small font-mono mb-1" style={{ fontSize: '0.75rem' }}>
                                    Pipeline Protocol:
                                </label>
                                <div className="btn-group w-100" role="group">
                                    <button
                                        type="button"
                                        onClick={() => setAutomationProtocol('automated')}
                                        className={`btn btn-sm ${automationProtocol === 'automated' ? 'btn-primary text-dark fw-bold' : 'btn-outline-secondary text-white-50'} py-2`}
                                        style={{ fontSize: '0.8rem', minHeight: '40px' }}
                                        title="AI Principal Investigator autonomously advances through all phases"
                                    >
                                        <i className="bi bi-lightning-charge-fill me-1"></i> Auto Arc
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAutomationProtocol('manual')}
                                        className={`btn btn-sm ${automationProtocol === 'manual' ? 'btn-primary text-dark fw-bold' : 'btn-outline-secondary text-white-50'} py-2`}
                                        style={{ fontSize: '0.8rem', minHeight: '40px' }}
                                        title="Step-by-step human forensic oversight"
                                    >
                                        <i className="bi bi-person-workspace me-1"></i> Manual
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Launch Action Button */}
                        <button
                            type="button"
                            onClick={handleQuickStart}
                            className="btn btn-primary btn-lg w-100 py-2.5 shadow-lg d-flex align-items-center justify-content-center gap-2 fw-bold"
                            style={{ minHeight: '50px', letterSpacing: '0.02em', fontSize: '0.98rem' }}
                        >
                            <i className="bi bi-lightning-charge-fill text-dark fs-5"></i>
                            <span className="text-dark">START RESEARCH WITH THIS QUESTION &amp; SCOPE</span>
                            <i className="bi bi-arrow-right-circle-fill text-dark fs-5"></i>
                        </button>
                    </div>
                </div>

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

                {/* Specialized Studios Quick Access Ribbon */}
                <div className="row g-2 justify-content-center mt-3 pt-2 max-w-4xl mx-auto font-mono text-xs">
                    <div className="col-6 col-md-auto">
                        <button
                            type="button"
                            onClick={() => setView('harness')}
                            className="btn btn-outline-info btn-sm w-100 py-1.5 px-3 d-flex align-items-center justify-content-center gap-1.5 border-opacity-25 hover-border-info text-white rounded-3 bg-dark bg-opacity-50"
                        >
                            <i className="bi bi-flask-fill text-info"></i>
                            <span>Discovery Harnesses</span>
                        </button>
                    </div>
                    <div className="col-6 col-md-auto">
                        <button
                            type="button"
                            onClick={() => setView('reasoning')}
                            className="btn btn-outline-primary btn-sm w-100 py-1.5 px-3 d-flex align-items-center justify-content-center gap-1.5 border-opacity-25 hover-border-primary text-white rounded-3 bg-dark bg-opacity-50"
                        >
                            <i className="bi bi-lightbulb-fill text-primary-glow"></i>
                            <span>Hypothesis Studio</span>
                        </button>
                    </div>
                    <div className="col-6 col-md-auto">
                        <button
                            type="button"
                            onClick={() => setView('graph')}
                            className="btn btn-outline-success btn-sm w-100 py-1.5 px-3 d-flex align-items-center justify-content-center gap-1.5 border-opacity-25 hover-border-success text-white rounded-3 bg-dark bg-opacity-50"
                        >
                            <i className="bi bi-share-fill text-success"></i>
                            <span>Scientific Graph</span>
                        </button>
                    </div>
                    <div className="col-6 col-md-auto">
                        <button
                            type="button"
                            onClick={() => setView('governance')}
                            className="btn btn-outline-warning btn-sm w-100 py-1.5 px-3 d-flex align-items-center justify-content-center gap-1.5 border-opacity-25 hover-border-warning text-white rounded-3 bg-dark bg-opacity-50"
                        >
                            <i className="bi bi-people-fill text-warning"></i>
                            <span>Scientific Specialists</span>
                        </button>
                    </div>
                    <div className="col-12 col-md-auto">
                        <button
                            type="button"
                            onClick={() => setView('entitlements-audit')}
                            className="btn btn-outline-danger btn-sm w-100 py-1.5 px-3 d-flex align-items-center justify-content-center gap-1.5 border-opacity-25 hover-border-danger text-white rounded-3 bg-dark bg-opacity-50"
                        >
                            <i className="bi bi-shield-lock-fill text-danger"></i>
                            <span>System Audit</span>
                        </button>
                    </div>
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
                                        RESEARCH INTELLIGENCE ENGINE
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
                                    Multi-model autonomous reasoning with custom keys or OAuth subscriptions.
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

                    {/* Model Capability Requirement Notice */}
                    <div className="p-3 mb-4 rounded-3 border border-info border-opacity-25 bg-sky-950 bg-opacity-30 d-flex align-items-start gap-2.5">
                        <i className="bi bi-info-circle-fill text-primary-glow fs-5 shrink-0 mt-0.5"></i>
                        <div>
                            <span className="fw-bold text-white small font-mono text-uppercase d-block mb-0.5">
                                Model Capability Requirement:
                            </span>
                            <span className="text-white-50 small" style={{ fontSize: '0.82rem', lineHeight: '1.4' }}>
                                {MODEL_CAPABILITY_NOTICE}
                            </span>
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
                                            {isAnalyzingFile ? 'Extracting structural variables with AI...' : 'Attach background literature, lab notebook notes, or raw datasets'}
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

                        {/* 04. Research Question & Scope Definition */}
                        <div id="research-question-scope-entry" className="p-3 p-md-4 rounded-3 bg-dark bg-opacity-40 border border-primary-glow border-opacity-30 shadow-sm" style={{ scrollMarginTop: '90px' }}>
                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-1 mb-2">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="badge bg-primary-glow text-dark font-mono px-2 py-0.5" style={{ fontSize: '0.7rem' }}>
                                        STEP 01
                                    </span>
                                    <label htmlFor="research-question-textarea" className="form-label text-white small font-mono fw-bold text-uppercase mb-0">
                                        Research Question &amp; Methodological Scope
                                    </label>
                                </div>
                                <span className="text-white-50 font-mono" style={{ fontSize: '0.75rem' }}>
                                    {description.length} chars (Required)
                                </span>
                            </div>

                            <p className="text-white-50 small mb-2" style={{ fontSize: '0.82rem', lineHeight: '1.4' }}>
                                Formulate your primary scientific inquiry, hypothesized causal mechanisms, independent/dependent variables, and empirical boundaries.
                            </p>

                            {/* Mobile Quick-Insert Parameter Snippets */}
                            <div className="mb-2">
                                <div className="d-flex align-items-center justify-content-between mb-1">
                                    <span className="text-white-50 font-mono" style={{ fontSize: '0.7rem' }}>
                                        <i className="bi bi-magic text-primary-glow me-1"></i> Quick Scope Builders:
                                    </span>
                                </div>
                                <div className="d-flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setDescription(prev => prev + (prev.trim() ? '\n\n' : '') + "Independent Variable: \nDependent Variable: ")}
                                        className="btn btn-outline-secondary btn-xs py-1 px-2 text-white-50 border-opacity-25 hover-border-primary font-mono rounded-2"
                                        style={{ fontSize: '0.72rem', minHeight: '32px' }}
                                    >
                                        + Variables (IV/DV)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDescription(prev => prev + (prev.trim() ? '\n\n' : '') + "Hypothesized Mechanism: ")}
                                        className="btn btn-outline-secondary btn-xs py-1 px-2 text-white-50 border-opacity-25 hover-border-primary font-mono rounded-2"
                                        style={{ fontSize: '0.72rem', minHeight: '32px' }}
                                    >
                                        + Mechanism
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDescription(prev => prev + (prev.trim() ? '\n\n' : '') + "Control Group & Baseline Conditions: ")}
                                        className="btn btn-outline-secondary btn-xs py-1 px-2 text-white-50 border-opacity-25 hover-border-primary font-mono rounded-2"
                                        style={{ fontSize: '0.72rem', minHeight: '32px' }}
                                    >
                                        + Control Conditions
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDescription(prev => prev + (prev.trim() ? '\n\n' : '') + "Target Sample Size (N) & Demographics: ")}
                                        className="btn btn-outline-secondary btn-xs py-1 px-2 text-white-50 border-opacity-25 hover-border-primary font-mono rounded-2"
                                        style={{ fontSize: '0.72rem', minHeight: '32px' }}
                                    >
                                        + Sample Size (N)
                                    </button>
                                </div>
                            </div>

                            <textarea 
                                id="research-question-textarea"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Detail your specific research question, independent and dependent variables, hypothesized physiological or mathematical mechanisms, control conditions, and sample requirements..."
                                required
                                rows={5}
                                className="form-control font-mono text-white bg-black bg-opacity-40 border-secondary border-opacity-25"
                                style={{ fontSize: '1rem', lineHeight: '1.6', minHeight: '140px' }}
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
                        {savedProjects.map((project, pIdx) => (
                            <div key={`${project.id || 'proj'}-${pIdx}`} className="col-12 col-md-6">
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

            {/* Scientific Lineage & Academic Attribution Card */}
            <section className="mb-5">
                <div className="card border-secondary border-opacity-25 bg-dark bg-opacity-40 rounded-3 p-3 p-md-4 shadow-sm">
                    <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                        <div className="d-flex align-items-start gap-3">
                            <div className="p-2.5 rounded-2 bg-primary-glow bg-opacity-10 text-primary-glow border border-primary-glow border-opacity-25 shrink-0">
                                <i className="bi bi-mortarboard-fill fs-4"></i>
                            </div>
                            <div>
                                <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                                    <span className="badge bg-primary bg-opacity-20 text-primary-glow border border-primary border-opacity-25 font-mono text-uppercase" style={{ fontSize: '0.72rem' }}>
                                        Conceptual Attribution
                                    </span>
                                    <span className="text-white small fw-bold font-mono">
                                        The AI Scientist
                                    </span>
                                </div>
                                <p className="text-white-50 small mb-0" style={{ fontSize: '0.85rem', lineHeight: '1.55' }}>
                                    The idea behind this app is credited to <strong className="text-white">"The AI Scientist,"</strong> developed by Tokyo-based startup <strong className="text-primary-glow">Sakana AI</strong>. Created in collaboration with researchers from the <strong className="text-white">University of Oxford</strong> and the <strong className="text-white">University of British Columbia</strong>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Mobile Persistent Sticky Bottom Action Bar */}
            <div className="d-block d-md-none position-fixed bottom-0 start-0 end-0 p-2 bg-dark bg-opacity-95 border-top border-secondary border-opacity-30 shadow-lg" style={{ zIndex: 1040, backdropFilter: 'blur(10px)' }}>
                <div className="d-flex align-items-center justify-content-between gap-2 px-1">
                    <button
                        type="button"
                        onClick={() => {
                            const el = document.getElementById('mobile-research-scope-card') || document.getElementById('research-question-scope-entry');
                            if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                const ta = el.querySelector('textarea');
                                if (ta) ta.focus();
                            }
                        }}
                        className="btn btn-outline-secondary btn-sm flex-grow-1 text-white d-flex align-items-center justify-content-center gap-1.5 py-2 font-mono"
                        style={{ minHeight: '44px', fontSize: '0.78rem' }}
                    >
                        <i className="bi bi-pencil-square text-primary-glow"></i>
                        <span>Question &amp; Scope</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleQuickStart}
                        className="btn btn-primary btn-sm flex-grow-1 text-dark fw-bold d-flex align-items-center justify-content-center gap-1.5 py-2 shadow-sm"
                        style={{ minHeight: '44px', fontSize: '0.82rem' }}
                    >
                        <i className="bi bi-lightning-charge-fill text-dark"></i>
                        <span>Start Phase 01</span>
                    </button>
                </div>
            </div>

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
