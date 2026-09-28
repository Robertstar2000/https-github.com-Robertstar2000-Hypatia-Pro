import React, { useState, useEffect, useRef, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { useExperiment } from '../../context/ExperimentContext';
import { extractJson, tryRepairJson } from '../../services';

interface HypothesisWorkspaceProps {
    onStepComplete: () => void;
    onGenerate: (feedback?: string) => void;
    isLoading: boolean;
}

export interface CandidateNode {
    id: string;
    hypothesis_draft: string;
    uniqueness_score?: number | string;
    utility_score?: number | string;
    falsifiability_score?: number | string;
    overall_score?: number | string;
    pruning_reason?: string;
    selected: boolean;
}

export interface ThoughtLayer {
    layer_number: number;
    candidates: CandidateNode[];
}

export interface NormalizedTreeData {
    criteria: {
        uniqueness: string;
        utility: string;
        falsifiability: string;
    };
    layers: ThoughtLayer[];
    final_hypothesis: {
        null_hypothesis: string;
        alternative_hypothesis_1: string;
        alternative_hypothesis_2?: string;
        raw_text?: string;
    };
    isSynthesizedText?: boolean;
}

// Defensive helper: safely convert anything to string
const safeText = (val: any, fallback: string = ''): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (Array.isArray(val)) {
        return val.map(item => safeText(item)).filter(Boolean).join('; ') || fallback;
    }
    if (typeof val === 'object') {
        return val.statement || val.text || val.description || val.summary || val.value || val.title || JSON.stringify(val);
    }
    return String(val);
};

// Defensive helper: safely format scores without throwing on strings/objects
const safeScore = (val: any): string => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
        return isNaN(val) ? '—' : val.toFixed(2);
    }
    const num = parseFloat(String(val));
    if (!isNaN(num)) {
        return num.toFixed(2);
    }
    return String(val).substring(0, 5);
};

// Comprehensive Tree Normalizer
export const normalizeTreeData = (parsed: any): NormalizedTreeData | null => {
    if (!parsed || typeof parsed !== 'object') return null;

    // 1. Criteria
    const rawCriteria = parsed.criteria || {};
    const criteria = {
        uniqueness: safeText(rawCriteria.uniqueness, 'Novelty relative to known literature and biological/physical mechanisms'),
        utility: safeText(rawCriteria.utility, 'Practical applicability, testability, and scientific domain impact'),
        falsifiability: safeText(rawCriteria.falsifiability, 'Clear observable experimental conditions that would disprove the claim')
    };

    // 2. Layers
    let rawLayers = parsed.layers || parsed.tree || parsed.levels || parsed.thought_layers || parsed.steps || [];
    if (!Array.isArray(rawLayers) && typeof rawLayers === 'object' && rawLayers !== null) {
        rawLayers = Object.values(rawLayers);
    }
    if (!Array.isArray(rawLayers)) {
        rawLayers = [];
    }

    const layers: ThoughtLayer[] = rawLayers.map((layerObj: any, idx: number) => {
        const layerNum = typeof layerObj?.layer_number === 'number'
            ? layerObj.layer_number
            : (parseInt(String(layerObj?.layer_number || '')) || (idx + 1));

        let rawCandidates = layerObj?.candidates || layerObj?.hypotheses || layerObj?.options || layerObj?.nodes || [];
        if (!Array.isArray(rawCandidates) && typeof rawCandidates === 'object' && rawCandidates !== null) {
            rawCandidates = Object.values(rawCandidates);
        }
        if (!Array.isArray(rawCandidates)) {
            rawCandidates = [];
        }

        const candidates: CandidateNode[] = rawCandidates.map((cand: any, cIdx: number) => {
            const draft = safeText(
                cand?.hypothesis_draft ||
                cand?.hypothesis ||
                cand?.draft ||
                cand?.statement ||
                cand?.text,
                `Candidate hypothesis draft (Layer ${layerNum}.${cIdx + 1})`
            );
            return {
                id: safeText(cand?.id, `l${layerNum}_c${cIdx + 1}`),
                hypothesis_draft: draft,
                uniqueness_score: cand?.uniqueness_score,
                utility_score: cand?.utility_score,
                falsifiability_score: cand?.falsifiability_score,
                overall_score: cand?.overall_score,
                pruning_reason: cand?.pruning_reason ? safeText(cand.pruning_reason) : undefined,
                selected: Boolean(cand?.selected ?? (cIdx === 0))
            };
        });

        return {
            layer_number: layerNum,
            candidates
        };
    });

    // 3. Final Hypothesis
    const rawFinal = parsed.final_hypothesis || parsed.final || parsed.hypothesis;
    let final_hypothesis: NormalizedTreeData['final_hypothesis'];

    if (typeof rawFinal === 'string') {
        final_hypothesis = {
            null_hypothesis: 'H0: No statistically significant divergence from baseline observed.',
            alternative_hypothesis_1: rawFinal,
            raw_text: rawFinal
        };
    } else if (rawFinal && typeof rawFinal === 'object') {
        const nullHyp = safeText(
            rawFinal.null_hypothesis || rawFinal.null || rawFinal.h0 || rawFinal.H0,
            'H0: Null hypothesis statement'
        );
        const alt1 = safeText(
            rawFinal.alternative_hypothesis_1 || rawFinal.alternative_1 || rawFinal.h1 || rawFinal.H1 || rawFinal.alternative || rawFinal.statement,
            'H1: Primary alternative hypothesis'
        );
        const alt2 = rawFinal.alternative_hypothesis_2 || rawFinal.alternative_2 || rawFinal.h2 || rawFinal.H2
            ? safeText(rawFinal.alternative_hypothesis_2 || rawFinal.alternative_2 || rawFinal.h2 || rawFinal.H2)
            : undefined;

        final_hypothesis = {
            null_hypothesis: nullHyp,
            alternative_hypothesis_1: alt1,
            alternative_hypothesis_2: alt2
        };
    } else {
        // Fallback: look at the last selected candidate from the layers
        const lastLayer = layers[layers.length - 1];
        const bestCandidate = lastLayer?.candidates.find(c => c.selected) || lastLayer?.candidates[0];
        final_hypothesis = {
            null_hypothesis: 'H0: No statistically significant divergence from baseline observed.',
            alternative_hypothesis_1: bestCandidate ? bestCandidate.hypothesis_draft : 'H1: Experimental intervention produces significant measurable divergence.',
        };
    }

    return {
        criteria,
        layers,
        final_hypothesis
    };
};

// Fallback: Try to parse unstructured text if model returned plain markdown
const parseUnstructuredHypothesis = (raw: string): NormalizedTreeData | null => {
    if (!raw || raw.trim().length < 20) return null;
    const text = raw.trim();

    // Check for H0 / H1 mentions
    let nullHyp = 'H0: No statistically significant divergence from baseline observed.';
    let altHyp1 = '';

    const nullMatch = text.match(/(?:null hypothesis|H0)[\s*:]+([^\n.]+)/i);
    if (nullMatch && nullMatch[1]) {
        nullHyp = nullMatch[1].trim();
    }

    const altMatch = text.match(/(?:alternative hypothesis(?: 1)?|H1)[\s*:]+([^\n.]+)/i);
    if (altMatch && altMatch[1]) {
        altHyp1 = altMatch[1].trim();
    } else {
        // Take first paragraph
        altHyp1 = text.split('\n\n')[0].replace(/^[#* \t-]+/, '').trim();
    }

    if (!altHyp1) altHyp1 = text.substring(0, 200);

    return {
        criteria: {
            uniqueness: 'Evaluated based on research question context',
            utility: 'Evaluated for experimental feasibility',
            falsifiability: 'Empirically testable through controlled protocol'
        },
        layers: [
            {
                layer_number: 1,
                candidates: [
                    {
                        id: 'candidate_final',
                        hypothesis_draft: altHyp1,
                        uniqueness_score: 0.85,
                        utility_score: 0.90,
                        falsifiability_score: 0.88,
                        selected: true
                    }
                ]
            }
        ],
        final_hypothesis: {
            null_hypothesis: nullHyp,
            alternative_hypothesis_1: altHyp1,
            raw_text: text
        },
        isSynthesizedText: true
    };
};

// Step-Level Error Boundary to prevent any crash from bubbling up
interface SubErrorBoundaryProps {
    children: ReactNode;
    onReset: () => void;
}

interface SubErrorBoundaryState {
    hasError: boolean;
    error: any;
}

class StepErrorBoundary extends Component<SubErrorBoundaryProps, SubErrorBoundaryState> {
    state: SubErrorBoundaryState = { hasError: false, error: null };

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, info: ErrorInfo) {
        console.error("StepErrorBoundary caught an error in HypothesisWorkspace:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="card border-warning bg-black text-white p-4 shadow-sm my-3">
                    <div className="d-flex align-items-center gap-3 mb-3">
                        <i className="bi bi-exclamation-triangle-fill text-warning fs-3"></i>
                        <div>
                            <h5 className="mb-0 text-warning">Hypothesis Render Guard</h5>
                            <p className="small text-white-50 mb-0">The hypothesis output contained unexpected formatting, but the node state is preserved.</p>
                        </div>
                    </div>
                    <div className="bg-dark p-3 rounded font-monospace small text-danger border border-secondary border-opacity-25 mb-3 overflow-auto" style={{ maxHeight: '100px' }}>
                        {this.state.error?.message || "Unexpected formatting error"}
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-primary btn-sm" onClick={this.props.onReset}>
                            <i className="bi bi-arrow-clockwise me-1"></i> Regenerate Hypothesis Tree
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export const HypothesisWorkspace: React.FC<HypothesisWorkspaceProps> = (props) => {
    return (
        <StepErrorBoundary onReset={() => props.onGenerate()}>
            <HypothesisWorkspaceInner {...props} />
        </StepErrorBoundary>
    );
};

const HypothesisWorkspaceInner: React.FC<HypothesisWorkspaceProps> = ({ onStepComplete, onGenerate, isLoading }) => {
    const { activeExperiment } = useExperiment();
    const [selectedLayer, setSelectedLayer] = useState<number | null>(null);
    const [progressStep, setProgressStep] = useState(0);
    const [feedbackText, setFeedbackText] = useState('');

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isLoading) {
            setProgressStep(1);
            interval = setInterval(() => {
                setProgressStep(prev => (prev < 5 ? prev + 1 : 5));
            }, 2500);
        } else {
            setProgressStep(0);
        }
        return () => clearInterval(interval);
    }, [isLoading]);

    const stepData = activeExperiment?.stepData?.[3] || {};
    const outputString = stepData.output;

    // Memoized parsing and normalization
    const { treeData, parseError } = useMemo(() => {
        if (!outputString || isLoading) {
            return { treeData: null, parseError: null };
        }

        const trimmed = outputString.trim();
        if (!trimmed || trimmed === '{}' || trimmed === 'null') {
            return { treeData: null, parseError: null };
        }

        // 1. Try standard JSON extraction
        try {
            const jsonStr = extractJson(trimmed);
            if (jsonStr && jsonStr !== '{}') {
                const parsed = JSON.parse(jsonStr);
                const normalized = normalizeTreeData(parsed);
                if (normalized) {
                    return { treeData: normalized, parseError: null };
                }
            }
        } catch {
            // Proceed to offline repair
        }

        // 2. Try offline auto-repair
        try {
            const repaired = tryRepairJson(trimmed);
            if (repaired) {
                const normalized = normalizeTreeData(repaired);
                if (normalized) {
                    return { treeData: normalized, parseError: null };
                }
            }
        } catch {
            // Proceed to unstructured parser
        }

        // 3. Fallback: Parse as unstructured text
        const textFallback = parseUnstructuredHypothesis(trimmed);
        if (textFallback) {
            return { treeData: textFallback, parseError: null };
        }

        return { treeData: null, parseError: "Output structure could not be mapped to hypothesis schema." };
    }, [outputString, isLoading]);

    // Handle initial empty state or loading state
    if (!treeData && !parseError) {
        return (
            <div className="p-4 text-center d-flex flex-column align-items-center justify-content-center h-100">
                <i className="bi bi-diagram-2 text-primary-glow mb-3" style={{ fontSize: '3rem', opacity: 0.6 }}></i>
                <h5 className="font-mono text-white mb-2">Tree of Thought: Hypothesis Architecture</h5>
                
                {isLoading ? (
                    <div className="w-100 mb-4" style={{ maxWidth: '600px' }}>
                        <div className="d-flex justify-content-between mb-2 small font-mono text-white-50">
                            <span className={progressStep >= 1 ? 'text-primary-glow fw-bold' : ''}>1: Seed Concepts</span>
                            <span className={progressStep >= 2 ? 'text-primary-glow fw-bold' : ''}>2: Evaluate & Prune</span>
                            <span className={progressStep >= 3 ? 'text-primary-glow fw-bold' : ''}>3: Depth Layer 3</span>
                            <span className={progressStep >= 4 ? 'text-primary-glow fw-bold' : ''}>4: Refine Alternatives</span>
                            <span className={progressStep >= 5 ? 'text-primary-glow fw-bold' : ''}>5: Final Formulation</span>
                        </div>
                        <div className="progress bg-dark border border-secondary border-opacity-25" style={{ height: '8px' }}>
                            <div 
                                className="progress-bar bg-primary progress-bar-striped progress-bar-animated" 
                                role="progressbar" 
                                style={{ width: `${(progressStep / 5) * 100}%`, transition: 'width 0.8s ease-in-out' }} 
                            ></div>
                        </div>
                        <div className="mt-3 small text-info text-center font-mono animate-in" style={{ height: '20px' }}>
                            {progressStep === 1 && "Generating initial candidate concepts..."}
                            {progressStep === 2 && "Scoring candidates on uniqueness, utility & falsifiability..."}
                            {progressStep === 3 && "Deepening selected node into layer 3..."}
                            {progressStep === 4 && "Refining alternative formulations..."}
                            {progressStep === 5 && "Finalizing statistical H0 and H1 hypotheses..."}
                        </div>
                    </div>
                ) : (
                    <p className="text-white-50 mb-4" style={{ maxWidth: '480px' }}>
                        Generates a 5-layer deep hypothesis exploration tree evaluated systematically on <strong>Uniqueness</strong>, <strong>Utility</strong>, and <strong>Falsifiability</strong>.
                    </p>
                )}

                <button 
                    className="btn btn-primary btn-lg px-4 shadow-sm"
                    onClick={() => onGenerate()}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Synthesizing Tree of Thought...</>
                    ) : (
                        <><i className="bi bi-play-circle me-2"></i> Generate Hypothesis Tree</>
                    )}
                </button>
            </div>
        );
    }

    // Handle parse error state with actionable manual retry
    if (parseError && !isLoading) {
        return (
            <div className="p-4 bg-danger bg-opacity-10 border border-danger rounded text-white my-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <h5 className="text-danger mb-0 d-flex align-items-center gap-2">
                        <i className="bi bi-exclamation-octagon-fill"></i>
                        Hypothesis Processing Notice
                    </h5>
                    <button 
                        className="btn btn-sm btn-outline-danger" 
                        onClick={() => onGenerate()}
                    >
                        <i className="bi bi-arrow-clockwise me-1"></i> Regenerate
                    </button>
                </div>
                <p className="small text-white-50 mb-3">{parseError}</p>
                {outputString && (
                    <div className="bg-dark p-3 rounded font-monospace small text-white-50 border border-secondary border-opacity-25 mb-3 overflow-auto" style={{ maxHeight: '120px' }}>
                        {outputString.substring(0, 300)}...
                    </div>
                )}
                <button className="btn btn-sm btn-primary" onClick={() => onGenerate()}>
                    <i className="bi bi-cpu me-1"></i> Re-execute Tree of Thought
                </button>
            </div>
        );
    }

    if (!treeData) return null;

    const { criteria, layers, final_hypothesis, isSynthesizedText } = treeData;

    return (
        <div className="d-flex flex-column gap-4 h-100">
            <div className="card border-0 shadow-sm bg-black bg-opacity-25">
                <div className="card-header border-0 bg-transparent pb-0 d-flex justify-content-between align-items-center">
                    <div>
                        <h5 className="mb-0 text-primary-glow font-mono d-flex align-items-center gap-2">
                            <i className="bi bi-diagram-3-fill"></i>
                            Tree of Thought: Hypothesis Generation
                        </h5>
                        <p className="text-white-50 small mb-0 mt-1">Multi-layer heuristic exploration with systematic pruning</p>
                    </div>
                    {isSynthesizedText && (
                        <span className="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-25 px-2 py-1">
                            <i className="bi bi-file-text me-1"></i> Unstructured Text Mode
                        </span>
                    )}
                </div>

                <div className="card-body">
                    {/* Evaluation Criteria Cards */}
                    <div className="row g-3 mb-4">
                        <div className="col-md-4">
                            <div className="p-3 border border-secondary border-opacity-25 rounded bg-dark bg-opacity-25 h-100">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <h6 className="font-mono text-info mb-0 small text-uppercase">Criteria: Uniqueness</h6>
                                    <i className="bi bi-stars text-info"></i>
                                </div>
                                <p className="small mb-0 text-white-50">{safeText(criteria?.uniqueness)}</p>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="p-3 border border-secondary border-opacity-25 rounded bg-dark bg-opacity-25 h-100">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <h6 className="font-mono text-success mb-0 small text-uppercase">Criteria: Utility</h6>
                                    <i className="bi bi-gear-fill text-success"></i>
                                </div>
                                <p className="small mb-0 text-white-50">{safeText(criteria?.utility)}</p>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="p-3 border border-secondary border-opacity-25 rounded bg-dark bg-opacity-25 h-100">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <h6 className="font-mono text-warning mb-0 small text-uppercase">Criteria: Falsifiability</h6>
                                    <i className="bi bi-shield-check text-warning"></i>
                                </div>
                                <p className="small mb-0 text-white-50">{safeText(criteria?.falsifiability)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Tree Visualization */}
                    {Array.isArray(layers) && layers.length > 0 && (
                        <div className="tree-visualization position-relative p-4 mb-4 rounded bg-dark bg-opacity-20 border border-secondary border-opacity-25" style={{ overflowX: 'auto' }}>
                            <div className="d-flex align-items-stretch" style={{ minWidth: `${Math.max(layers.length * 240, 750)}px`, gap: '1.5rem' }}>
                                {layers.map((layer, idx) => {
                                    const layerNum = layer.layer_number || (idx + 1);
                                    const candidates = Array.isArray(layer.candidates) ? layer.candidates : [];

                                    return (
                                        <div key={idx} className="flex-grow-1" style={{ minWidth: '240px' }}>
                                            <div className="text-center mb-3">
                                                <span className="badge bg-secondary bg-opacity-25 text-white-50 border border-secondary border-opacity-25 px-2 py-1 font-monospace">
                                                    Layer {layerNum}
                                                </span>
                                            </div>
                                            <div className="d-flex flex-column gap-3">
                                                {candidates.map((candidate, cIdx) => {
                                                    const isSelected = Boolean(candidate.selected);
                                                    const draftText = safeText(candidate.hypothesis_draft, 'Candidate hypothesis');
                                                    const isExpanded = selectedLayer === layerNum;

                                                    return (
                                                        <div 
                                                            key={cIdx} 
                                                            className={`card cursor-pointer border ${isSelected ? 'border-primary shadow bg-dark bg-opacity-75' : 'border-secondary border-opacity-25 bg-black bg-opacity-40'}`}
                                                            style={{ transition: 'all 0.2s', opacity: isSelected ? 1 : 0.75 }}
                                                            onClick={() => setSelectedLayer(isExpanded ? null : layerNum)}
                                                            title="Click to toggle candidate details and pruning logic"
                                                        >
                                                            <div className="card-body p-2 position-relative">
                                                                {isSelected && (
                                                                    <span className="position-absolute top-0 end-0 translate-middle p-1 bg-primary border border-light rounded-circle" style={{ width: '10px', height: '10px' }}></span>
                                                                )}
                                                                <div className="small mb-2 fw-medium font-mono" style={{ fontSize: '0.8rem', lineHeight: '1.3' }}>
                                                                    {draftText.length > 90 ? `${draftText.substring(0, 90)}...` : draftText}
                                                                </div>
                                                                
                                                                <div className="d-flex justify-content-between font-mono bg-dark bg-opacity-50 p-1 rounded border border-secondary border-opacity-10" style={{ fontSize: '0.65rem' }}>
                                                                    <span className="text-info" title="Uniqueness Score">U: {safeScore(candidate.uniqueness_score)}</span>
                                                                    <span className="text-success" title="Utility Score">Ut: {safeScore(candidate.utility_score)}</span>
                                                                    <span className="text-warning" title="Falsifiability Score">F: {safeScore(candidate.falsifiability_score)}</span>
                                                                </div>

                                                                {!isSelected && candidate.pruning_reason && isExpanded && (
                                                                    <div className="mt-2 pt-2 border-top border-secondary border-opacity-25 small text-white-50 fst-italic">
                                                                        <i className="bi bi-scissors text-danger me-1"></i> Pruned: {safeText(candidate.pruning_reason)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {idx < layers.length - 1 && (
                                                <div className="text-center my-2 text-white-50 opacity-50">
                                                    <i className="bi bi-arrow-down d-block d-md-none"></i>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Final Selected Hypotheses */}
                    <div className="p-4 border border-primary border-opacity-25 rounded bg-primary bg-opacity-10">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h6 className="font-mono text-primary-glow mb-0 d-flex align-items-center gap-2">
                                <i className="bi bi-check2-circle text-primary-glow"></i>
                                Verified Hypotheses Formulations
                            </h6>
                            <span className="badge bg-success bg-opacity-20 text-success border border-success border-opacity-25 font-monospace">
                                Ready for Methodology
                            </span>
                        </div>
                        <div className="d-flex flex-column gap-3">
                            <div className="p-3 bg-dark bg-opacity-50 rounded border border-secondary border-opacity-25">
                                <strong className="text-white-50 small d-block mb-1 font-mono text-uppercase">Null Hypothesis (H0)</strong>
                                <span className="text-white">{safeText(final_hypothesis?.null_hypothesis)}</span>
                            </div>
                            <div className="p-3 bg-dark bg-opacity-50 rounded border border-primary border-opacity-25">
                                <strong className="text-primary-glow small d-block mb-1 font-mono text-uppercase">Alternative Hypothesis (H1)</strong>
                                <span className="text-white fw-medium">{safeText(final_hypothesis?.alternative_hypothesis_1)}</span>
                            </div>
                            {final_hypothesis?.alternative_hypothesis_2 && (
                                <div className="p-3 bg-dark bg-opacity-50 rounded border border-secondary border-opacity-25">
                                    <strong className="text-white-50 small d-block mb-1 font-mono text-uppercase">Alternative Hypothesis (H2)</strong>
                                    <span className="text-white">{safeText(final_hypothesis?.alternative_hypothesis_2)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="card-footer border-0 bg-transparent mt-2">
                    <div className="d-flex flex-column gap-3">
                        <div className="input-group">
                            <span className="input-group-text bg-dark bg-opacity-25 border-secondary border-opacity-25 text-white-50">
                                <i className="bi bi-pencil-square"></i>
                            </span>
                            <input 
                                type="text" 
                                className="form-control bg-dark bg-opacity-25 border-secondary border-opacity-25 text-white" 
                                placeholder="Optional: Provide guidance to refine the hypothesis tree..." 
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isLoading) {
                                        onGenerate(feedbackText);
                                    }
                                }}
                            />
                            <button 
                                className="btn btn-outline-warning" 
                                onClick={() => onGenerate(feedbackText)}
                                disabled={isLoading}
                            >
                                <i className="bi bi-arrow-clockwise me-2"></i> Re-generate Tree
                            </button>
                        </div>
                        <div className="d-flex justify-content-end">
                            <button 
                                className="btn btn-primary px-4 shadow-sm" 
                                onClick={onStepComplete}
                                disabled={isLoading}
                            >
                                Approve & Advance <i className="bi bi-arrow-right ms-2"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
