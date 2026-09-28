import React, { useState } from 'react';
import { useToast } from '../../../toast';

interface DatasetViewerProps {
    csvData: string;
    summary: string;
    simulationCode?: string;
    onReset: () => void;
    experiment: any;
}

export const DatasetViewer: React.FC<DatasetViewerProps> = ({
    csvData,
    summary,
    simulationCode,
    onReset,
    experiment
}) => {
    const { addToast } = useToast();
    const [showCode, setShowCode] = useState(false);

    // CSV parser for preview table
    const parseCSVLine = (text: string) => {
        const result = [];
        let cur = '';
        let insideQuote = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
                insideQuote = !insideQuote;
            } else if (char === ',' && !insideQuote) {
                result.push(cur.trim());
                cur = '';
            } else {
                cur += char;
            }
        }
        result.push(cur.trim());
        return result;
    };

    const getTablePreviewData = () => {
        if (!csvData) return { headers: [], rows: [] };
        const lines = csvData.trim().split('\n').filter(line => line.trim().length > 0);
        if (lines.length === 0) return { headers: [], rows: [] };
        
        const headers = parseCSVLine(lines[0]);
        const rows = lines.slice(1).map(line => parseCSVLine(line));
        return { headers, rows };
    };

    const { headers, rows } = getTablePreviewData();

    // Export with all metadata commented at top
    const handleExport = () => {
        try {
            let csv = '';
            csv += `# =========================================================\n`;
            csv += `# MIFECO SYSTEM COMPATIBLE RESEARCH DATA PACKAGE\n`;
            csv += `# Generated: ${new Date().toISOString()}\n`;
            csv += `# Project ID: ${experiment.id}\n`;
            csv += `# =========================================================\n`;
            csv += `# Project Title: ${experiment.title}\n`;
            csv += `# Field: ${experiment.field}\n`;
            csv += `# Description: ${experiment.description || 'N/A'}\n`;
            csv += `# Hypothesis: ${experiment.stepData[3]?.output?.replace(/\n/g, ' ') || 'N/A'}\n`;
            csv += `# Methodology Summary: ${experiment.stepData[4]?.summary?.replace(/\n/g, ' ') || experiment.stepData[4]?.output?.substring(0, 200).replace(/\n/g, ' ') || 'N/A'}\n`;
            csv += `# Data Plan: ${experiment.stepData[5]?.summary?.replace(/\n/g, ' ') || experiment.stepData[5]?.output?.substring(0, 200).replace(/\n/g, ' ') || 'N/A'}\n`;
            csv += `# \n`;
            
            if (simulationCode) {
                csv += `# =========================================================\n`;
                csv += `# SIMULATION SOURCE SCRIPT CODE\n`;
                csv += `# =========================================================\n`;
                const codeLines = simulationCode.split('\n');
                codeLines.forEach(line => {
                    csv += `# ${line}\n`;
                });
                csv += `# \n`;
            }
            
            csv += `# =========================================================\n`;
            csv += `# RAW SIMULATION OUTPUT DATA (RFC 4180 COMPLIANT)\n`;
            csv += `# =========================================================\n`;
            csv += csvData;

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            const filename = `${experiment.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_data_package.csv`;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addToast("CSV Data Package exported successfully!", "success");
        } catch (error) {
            console.error(error);
            addToast("Failed to generate CSV export.", "danger");
        }
    };

    return (
        <div className="dataset-viewer-container animate-in">
            {/* Header Toolbar */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h5 className="fw-bold mb-1 text-success-glow">
                        <i className="bi bi-file-earmark-spreadsheet me-2"></i> Acquired Dataset Verified
                    </h5>
                    <p className="text-white-50 small mb-0">High-fidelity dataset synchronized with persistent local database.</p>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-warning" onClick={onReset}>
                        <i className="bi bi-arrow-clockwise me-1"></i> Re-acquire Dataset
                    </button>
                    <button className="btn btn-sm btn-success shadow-glow-sm" onClick={handleExport} id="export-csv-btn">
                        <i className="bi bi-download me-1"></i> Export CSV Package
                    </button>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="row g-4">
                {/* Dataset Summary */}
                <div className="col-12">
                    <div className="card bg-black bg-opacity-20 border-secondary border-opacity-25 p-3 rounded-3">
                        <h6 className="fw-bold text-info small text-uppercase ls-1 mb-2">Dataset Summary</h6>
                        <p className="text-white small mb-0 font-monospace" style={{ whiteSpace: 'pre-line' }}>{summary}</p>
                    </div>
                </div>

                {/* Grid of Preview Table & Code Source */}
                <div className="col-lg-8">
                    <div className="card bg-black bg-opacity-10 border-secondary border-opacity-10 rounded-3 overflow-hidden">
                        <div className="card-header bg-dark bg-opacity-50 py-3 border-bottom border-secondary border-opacity-10 d-flex justify-content-between align-items-center">
                            <span className="fw-bold small text-white-50 text-uppercase ls-1">Tabular Data Preview ({rows.length} rows)</span>
                            <span className="badge bg-secondary font-mono text-xs">CSV Preview</span>
                        </div>
                        <div className="table-responsive" style={{ maxHeight: '400px' }}>
                            <table className="table table-dark table-striped table-hover mb-0 align-middle" style={{ fontSize: '0.85rem' }}>
                                <thead className="table-dark text-uppercase font-monospace" style={{ position: 'sticky', top: 0, zIndex: 1, borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                                    <tr>
                                        {headers.map((h, i) => (
                                            <th key={i} className="text-primary-glow" style={{ padding: '12px 16px' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="font-monospace">
                                    {rows.slice(0, 15).map((row, rIdx) => (
                                        <tr key={rIdx}>
                                            {row.map((cell, cIdx) => (
                                                <td key={cIdx} style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.85)' }}>{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {rows.length > 15 && (
                                        <tr>
                                            <td colSpan={headers.length} className="text-center text-white-50 p-3 bg-black bg-opacity-20">
                                                Showing top 15 of {rows.length} rows. Export full CSV to view all.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Details / Code Viewer */}
                <div className="col-lg-4">
                    <div className="card bg-black bg-opacity-15 border-secondary border-opacity-15 p-3 rounded-3 h-100 d-flex flex-column">
                        <h6 className="fw-bold text-white-50 small text-uppercase ls-1 mb-3">Experimental Metadata</h6>
                        <ul className="list-unstyled mb-4 flex-grow-1" style={{ fontSize: '0.8rem' }}>
                            <li className="mb-2 d-flex justify-content-between border-bottom border-secondary border-opacity-10 pb-2">
                                <span className="text-white-50">Scientific Field:</span>
                                <span className="fw-bold text-white">{experiment.field}</span>
                            </li>
                            <li className="mb-2 d-flex justify-content-between border-bottom border-secondary border-opacity-10 pb-2">
                                <span className="text-white-50">Experiment Mode:</span>
                                <span className="fw-bold text-success">{experiment.experimentMode || 'Simulation'}</span>
                            </li>
                            <li className="mb-2 d-flex justify-content-between border-bottom border-secondary border-opacity-10 pb-2">
                                <span className="text-white-50">Sample Size:</span>
                                <span className="fw-bold text-info">{rows.length} samples</span>
                            </li>
                            <li className="mb-2 d-flex justify-content-between border-bottom border-secondary border-opacity-10 pb-2">
                                <span className="text-white-50">Columns:</span>
                                <span className="fw-bold text-warning">{headers.join(', ')}</span>
                            </li>
                        </ul>

                        {simulationCode && (
                            <div className="mt-auto">
                                <button 
                                    className="btn btn-xs btn-outline-info w-100 py-2" 
                                    onClick={() => setShowCode(!showCode)}
                                >
                                    <i className={`bi ${showCode ? 'bi-eye-slash' : 'bi-eye'} me-1`}></i>
                                    {showCode ? 'Hide' : 'View'} Simulation Code
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* simulation code dropdown section */}
                {showCode && simulationCode && (
                    <div className="col-12 mt-3">
                        <div className="card bg-black border border-secondary border-opacity-20 rounded-3">
                            <div className="card-header bg-dark bg-opacity-30 border-bottom border-secondary border-opacity-15 py-3 d-flex justify-content-between align-items-center">
                                <span className="font-monospace small text-info">Simulation Script Engine Code</span>
                                <span className="badge bg-dark border border-secondary border-opacity-30 text-white-50">JavaScript</span>
                            </div>
                            <div className="card-body p-0">
                                <pre className="p-3 mb-0 text-primary-glow font-monospace small bg-black" style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '0.8rem' }}>
                                    <code>{simulationCode}</code>
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
