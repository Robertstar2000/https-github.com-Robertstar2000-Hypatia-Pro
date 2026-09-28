import React, { useState } from 'react';
import { Experiment } from '../../config';

interface DataProvenanceGraphProps {
    experiment: Experiment;
    onSelectStep?: (stepId: number) => void;
}

export const DataProvenanceGraph: React.FC<DataProvenanceGraphProps> = ({
    experiment,
    onSelectStep
}) => {
    const [selectedNode, setSelectedNode] = useState<any | null>(null);

    const stepsInfo = [
        { id: 1, title: 'Literature Review', category: 'Foundation', icon: 'bi-journal-text', color: '#00F2FE' },
        { id: 2, title: 'Hypothesis', category: 'Foundation', icon: 'bi-lightbulb-fill', color: '#00F2FE' },
        { id: 3, title: 'Variables', category: 'Design', icon: 'bi-sliders', color: '#4FACFE' },
        { id: 4, title: 'Methodology', category: 'Design', icon: 'bi-gear-wide-connected', color: '#4FACFE' },
        { id: 5, title: 'Data Synthesis', category: 'Execution', icon: 'bi-table', color: '#00E676' },
        { id: 6, title: 'Code Simulation', category: 'Execution', icon: 'bi-play-circle-fill', color: '#00E676' },
        { id: 7, title: 'Data Analysis', category: 'Validation', icon: 'bi-graph-up-arrow', color: '#FFB300' },
        { id: 8, title: 'Interpretation', category: 'Validation', icon: 'bi-body-text', color: '#FFB300' },
        { id: 9, title: 'Peer Review', category: 'Publishing', icon: 'bi-shield-check', color: '#E040FB' },
        { id: 10, title: 'Publication', category: 'Publishing', icon: 'bi-file-earmark-pdf-fill', color: '#E040FB' }
    ];

    const nodes = stepsInfo.map(step => {
        const stepData = experiment?.stepData?.[step.id];
        const hasData = Boolean(stepData?.output || stepData?.summary);
        const outputLength = typeof stepData?.output === 'string' ? stepData.output.length : 0;

        return {
            ...step,
            status: hasData ? 'completed' : 'uninitialized',
            dataSnippet: stepData?.summary || (outputLength > 0 ? `${outputLength} chars produced` : 'No node state recorded'),
            fullOutput: stepData?.output
        };
    });

    return (
        <div className="card bg-black border-secondary border-opacity-25 shadow-sm p-3 my-3">
            <div className="d-flex align-items-center justify-content-between border-bottom border-secondary border-opacity-10 pb-2 mb-3">
                <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-diagram-3-fill text-primary-glow h5 mb-0"></i>
                    <div>
                        <h6 className="fw-bold mb-0 text-white">Interactive Data Provenance Graph</h6>
                        <small className="text-white-50" style={{ fontSize: '0.75rem' }}>
                            Visual lineage map linking literature, hypotheses, datasets, and conclusions
                        </small>
                    </div>
                </div>
                <span className="badge bg-dark border border-secondary text-primary-glow font-monospace">
                    {nodes.filter(n => n.status === 'completed').length} / 10 Nodes Linked
                </span>
            </div>

            {/* Interactive Flow Visualizer */}
            <div className="position-relative py-3 px-2 overflow-x-auto bg-dark bg-opacity-30 rounded border border-secondary border-opacity-10">
                <div className="d-flex align-items-center justify-content-between flex-nowrap min-w-100 gap-3" style={{ minWidth: '900px' }}>
                    {nodes.map((node, index) => (
                        <React.Fragment key={node.id}>
                            <div 
                                className={`provenance-node p-2 rounded text-center cursor-pointer transition-all ${
                                    node.status === 'completed' 
                                        ? 'bg-dark border border-primary border-opacity-50 text-white shadow-sm' 
                                        : 'bg-black border border-secondary border-opacity-20 text-white-50 opacity-60'
                                }`}
                                style={{ width: '130px', flexShrink: 0 }}
                                onClick={() => {
                                    setSelectedNode(node);
                                    if (onSelectStep) onSelectStep(node.id);
                                }}
                            >
                                <div className="d-flex align-items-center justify-content-center mb-1">
                                    <i className={`bi ${node.icon} me-1`} style={{ color: node.color, fontSize: '1.1rem' }}></i>
                                    <span className="badge bg-black text-white-50 font-monospace" style={{ fontSize: '0.65rem' }}>#{node.id}</span>
                                </div>
                                <div className="fw-bold small text-truncate" title={node.title}>{node.title}</div>
                                <div className="mt-1">
                                    {node.status === 'completed' ? (
                                        <span className="badge bg-success bg-opacity-20 text-success border border-success border-opacity-25" style={{ fontSize: '0.62rem' }}>
                                            <i className="bi bi-check-circle-fill me-1"></i>Linked
                                        </span>
                                    ) : (
                                        <span className="badge bg-secondary bg-opacity-20 text-white-50" style={{ fontSize: '0.62rem' }}>
                                            Pending
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Node Connection Arrow */}
                            {index < nodes.length - 1 && (
                                <div className="d-flex align-items-center text-white-50 opacity-50" style={{ flexShrink: 0 }}>
                                    <i className="bi bi-arrow-right h5 mb-0 text-primary-glow"></i>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Selected Node Details Drawer */}
            {selectedNode && (
                <div className="mt-3 p-3 bg-dark border border-secondary border-opacity-25 rounded fade-in">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-2">
                            <i className={`bi ${selectedNode.icon}`} style={{ color: selectedNode.color, fontSize: '1.2rem' }}></i>
                            <h6 className="fw-bold mb-0 text-white">Lineage Node {selectedNode.id}: {selectedNode.title}</h6>
                        </div>
                        <button className="btn btn-sm btn-close btn-close-white" onClick={() => setSelectedNode(null)}></button>
                    </div>
                    <p className="small text-white-50 font-monospace mb-0" style={{ fontSize: '0.8rem' }}>
                        {selectedNode.dataSnippet}
                    </p>
                </div>
            )}
        </div>
    );
};
