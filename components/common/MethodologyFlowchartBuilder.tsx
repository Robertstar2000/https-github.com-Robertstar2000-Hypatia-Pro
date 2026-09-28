import React, { useState } from 'react';

export interface FlowchartNode {
    id: string;
    stage: string;
    description: string;
    type: 'input' | 'process' | 'decision' | 'output';
}

interface MethodologyFlowchartBuilderProps {
    initialNodes?: FlowchartNode[];
    onSaveFlowchart?: (nodes: FlowchartNode[]) => void;
}

export const MethodologyFlowchartBuilder: React.FC<MethodologyFlowchartBuilderProps> = ({
    initialNodes = [
        { id: '1', stage: 'Participant / Sample Intake', description: 'Screen candidates against inclusion/exclusion criteria.', type: 'input' },
        { id: '2', stage: 'Stratified Randomization', description: 'Assign subjects 1:1 to Treatment and Control groups.', type: 'decision' },
        { id: '3', stage: 'Intervention / Protocol', description: 'Administer treatment condition for 14 days.', type: 'process' },
        { id: '4', stage: 'Data Collection & Assay', description: 'Record primary dependent metrics and log to database.', type: 'output' }
    ],
    onSaveFlowchart
}) => {
    const [nodes, setNodes] = useState<FlowchartNode[]>(initialNodes);
    const [newStage, setNewStage] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newType, setNewType] = useState<'input' | 'process' | 'decision' | 'output'>('process');

    const handleAddNode = () => {
        if (!newStage.trim()) return;
        const newNode: FlowchartNode = {
            id: Date.now().toString(),
            stage: newStage.trim(),
            description: newDesc.trim() || 'No details specified.',
            type: newType
        };
        const updated = [...nodes, newNode];
        setNodes(updated);
        setNewStage('');
        setNewDesc('');
        if (onSaveFlowchart) onSaveFlowchart(updated);
    };

    const handleRemoveNode = (id: string) => {
        const updated = nodes.filter(n => n.id !== id);
        setNodes(updated);
        if (onSaveFlowchart) onSaveFlowchart(updated);
    };

    const getNodeBadge = (type: FlowchartNode['type']) => {
        switch (type) {
            case 'input': return <span className="badge bg-info text-dark">Input</span>;
            case 'decision': return <span className="badge bg-warning text-dark">Decision / Branch</span>;
            case 'output': return <span className="badge bg-success text-white">Output / Metric</span>;
            default: return <span className="badge bg-primary text-white">Process</span>;
        }
    };

    return (
        <div className="card bg-black border-secondary border-opacity-25 shadow-sm p-3 my-3">
            <div className="d-flex align-items-center justify-content-between border-bottom border-secondary border-opacity-10 pb-2 mb-3">
                <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-diagram-2-fill text-primary-glow h5 mb-0"></i>
                    <div>
                        <h6 className="fw-bold mb-0 text-white">Interactive Methodology Flowchart Designer</h6>
                        <small className="text-white-50" style={{ fontSize: '0.75rem' }}>
                            Design visual step-by-step experimental protocols
                        </small>
                    </div>
                </div>
                <span className="badge bg-dark border border-secondary text-primary-glow font-monospace">
                    {nodes.length} Protocol Steps
                </span>
            </div>

            {/* Flowchart Nodes Display */}
            <div className="d-flex align-items-center gap-2 overflow-x-auto py-2 mb-3">
                {nodes.map((node, index) => (
                    <React.Fragment key={node.id}>
                        <div className="p-3 bg-dark border border-secondary border-opacity-25 rounded position-relative" style={{ minWidth: '180px', maxWidth: '220px' }}>
                            <div className="d-flex align-items-center justify-content-between mb-1">
                                <span className="font-monospace small text-white-50">#{index + 1}</span>
                                {getNodeBadge(node.type)}
                            </div>
                            <div className="fw-bold text-white small mb-1">{node.stage}</div>
                            <p className="small text-white-50 mb-2" style={{ fontSize: '0.75rem' }}>{node.description}</p>
                            <button 
                                className="btn btn-xs btn-outline-danger position-absolute top-0 end-0 m-1 opacity-50 hover-opacity-100"
                                onClick={() => handleRemoveNode(node.id)}
                                title="Remove Step"
                            >
                                &times;
                            </button>
                        </div>

                        {index < nodes.length - 1 && (
                            <i className="bi bi-arrow-right text-primary-glow h5 mb-0" style={{ flexShrink: 0 }}></i>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Add Step Form */}
            <div className="row g-2 align-items-center bg-dark bg-opacity-30 p-2 rounded border border-secondary border-opacity-10">
                <div className="col-md-3">
                    <input 
                        type="text" 
                        className="form-control form-control-sm bg-dark text-white border-secondary"
                        placeholder="Step Name (e.g., Assay Prep)"
                        value={newStage}
                        onChange={e => setNewStage(e.target.value)}
                    />
                </div>
                <div className="col-md-4">
                    <input 
                        type="text" 
                        className="form-control form-control-sm bg-dark text-white border-secondary"
                        placeholder="Description / Protocol Notes..."
                        value={newDesc}
                        onChange={e => setNewDesc(e.target.value)}
                    />
                </div>
                <div className="col-md-3">
                    <select 
                        className="form-select form-select-sm bg-dark text-white border-secondary"
                        value={newType}
                        onChange={e => setNewType(e.target.value as any)}
                    >
                        <option value="process">Process Step</option>
                        <option value="input">Input / Intake</option>
                        <option value="decision">Decision / Branch</option>
                        <option value="output">Output / Measurement</option>
                    </select>
                </div>
                <div className="col-md-2">
                    <button className="btn btn-sm btn-primary w-100" onClick={handleAddNode} disabled={!newStage.trim()}>
                        <i className="bi bi-plus-lg me-1"></i> Add Step
                    </button>
                </div>
            </div>
        </div>
    );
};
