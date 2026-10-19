
import React, { useState, useMemo, useCallback } from 'react';
import { useExperiment } from '../../services';
import { Experiment } from '../../config';
import { ExperimentCard } from '../steps/ExperimentCard';
import { DeployModal } from './DeployModal';
import { useToast } from '../../toast';
import { db } from '../../be_db';

export const Dashboard = ({ setView }) => {
    const { experiments, selectExperiment, deleteExperiment, updateExperiment, importExperiment, isAuthenticated } = useExperiment();
    const { addToast } = useToast();
    const [showDeployModal, setShowDeployModal] = useState(false);
    const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);

    const uniqueExperiments = useMemo(() => {
        if (!Array.isArray(experiments)) return [];
        const seen = new Set<string>();
        return experiments.filter(e => {
            if (!e) return false;
            const k = String(e.id || '');
            if (!k || seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    }, [experiments]);

    const activeExperiments = useMemo(() => uniqueExperiments.filter(e => !e.status || e.status === 'active'), [uniqueExperiments]);
    const archivedExperiments = useMemo(() => uniqueExperiments.filter(e => e.status === 'archived'), [uniqueExperiments]);

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result;
                if (typeof result !== 'string') throw new Error("File read failed");
                
                const imported = JSON.parse(result);
                // Basic validation
                if (!imported.id || !imported.title) throw new Error("Missing required experiment fields");
                
                importExperiment(imported);
            } catch (err) {
                console.error(err);
                addToast("Failed to parse experiment file. Ensure it is a valid JSON export.", 'danger');
            }
        };
        reader.onerror = () => addToast("Error reading file.", 'danger');
        reader.readAsText(file);
        
        // Reset input
        event.target.value = '';
    };
    
    const handleExport = useCallback(async (experiment: Experiment) => {
        try {
            // Fetch the full experiment data from the database to ensure we aren't exporting a lightened version
            const fullExperiment = await db.experiments.get(experiment.id);
            if (!fullExperiment) throw new Error("Could not find full experiment data.");

            const dataStr = JSON.stringify(fullExperiment, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `hypatia_export_${fullExperiment.title.replace(/\s+/g, '_')}_${fullExperiment.id.slice(-4)}.json`;
            link.click();
            URL.revokeObjectURL(url);
            addToast("Export started.", 'success');
        } catch (e) {
            console.error("Export failed:", e);
            addToast("Export failed.", 'danger');
        }
    }, [addToast]);

    const handleDeployClick = useCallback((experiment: Experiment) => {
        setSelectedExperiment(experiment);
        setShowDeployModal(true);
    }, []);
    
    const handleArchive = useCallback(async (exp: Experiment) => {
        if (window.confirm("Move this project to saved storage? It will be accessible from the 'Saved Projects' section.")) {
            await updateExperiment({ ...exp, status: 'archived' });
            addToast("Project archived.", 'success');
        }
    }, [updateExperiment, addToast]);

    const handleUnarchive = useCallback(async (exp: Experiment) => {
        await updateExperiment({ ...exp, status: 'active' });
        addToast("Project restored to active dashboard.", 'success');
    }, [updateExperiment, addToast]);
    
    const handleStartNewProject = () => {
        setView('landing');
        setTimeout(() => {
            const el = document.getElementById('mobile-research-scope-card') || document.getElementById('research-question-scope-entry');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                const ta = el.querySelector('textarea');
                if (ta) ta.focus();
            }
        }, 150);
    };

    return (
        <div className="container py-4">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4 mb-md-5">
                <div>
                    <h2 className="section-title mb-0 fw-bold">Research Dashboard</h2>
                    <p className="text-white-50 mb-0">Monitor and manage your active discovery nodes.</p>
                </div>
                <div className="d-flex gap-2 w-100 w-sm-auto justify-content-end flex-wrap">
                     <label className="btn btn-outline-secondary btn-sm d-flex align-items-center" style={{cursor: 'pointer'}}>
                        <i className="bi bi-upload me-2"></i> Import JSON
                        <input type="file" accept=".json" onChange={handleFileImport} style={{display: 'none'}} />
                    </label>
                    <button className="btn btn-primary shadow d-flex align-items-center gap-1.5" onClick={handleStartNewProject}>
                        <i className="bi bi-plus-lg"></i>
                        <span>Start New Study</span>
                    </button>
                </div>
            </div>

            {activeExperiments.length === 0 && archivedExperiments.length === 0 && (
                 <div className="text-center p-4 p-md-5 dashboard-empty-state card border-dashed bg-transparent">
                    <i className="bi bi-journal-plus text-primary-glow" style={{fontSize: '3rem'}}></i>
                    <h4 className="mt-3 fw-bold">Initialize Your First Study</h4>
                    <p className="text-white-50 mx-auto" style={{maxWidth: '420px'}}>No research projects detected in local archival storage. Formulate your research question and define your inquiry boundaries to begin.</p>
                    <button className="btn btn-primary mt-3 px-4 py-2.5 d-inline-flex align-items-center gap-2 fw-bold" onClick={handleStartNewProject}>
                        <i className="bi bi-question-circle-fill fs-5"></i>
                        <span>Get Started: Research Question &amp; Scope</span>
                    </button>
                </div>
            )}
            
            {activeExperiments.length > 0 ? (
                <div className="row g-4 mb-5">
                    {activeExperiments.map((exp, idx) => (
                        <ExperimentCard 
                            key={`${exp.id || 'act-exp'}-${idx}`} 
                            exp={exp} 
                            onArchive={handleArchive} 
                            onUnarchive={handleUnarchive} 
                            deleteExperiment={deleteExperiment} 
                            selectExperiment={selectExperiment} 
                            handleDeployClick={handleDeployClick} 
                            handleExport={handleExport} 
                        />
                    ))}
                </div>
            ) : uniqueExperiments.length > 0 && (
                <div className="alert alert-dark border-secondary border-opacity-25 bg-black bg-opacity-20 text-center mb-5 p-4">
                    <i className="bi bi-info-circle me-2"></i> All projects are currently archived.
                </div>
            )}
            
            {archivedExperiments.length > 0 && (
                <div className="mt-5 pt-5 border-top border-secondary border-opacity-10">
                    <div className="d-flex align-items-center mb-4">
                        <i className="bi bi-archive-fill text-muted me-3 fs-4"></i>
                        <h3 className="section-title mb-0 text-white-50">Saved Projects</h3>
                    </div>
                    <div className="row g-4">
                        {archivedExperiments.map((exp, idx) => (
                            <ExperimentCard 
                                key={`${exp.id || 'arch-exp'}-${idx}`} 
                                exp={exp} 
                                isArchived={true} 
                                onArchive={handleArchive} 
                                onUnarchive={handleUnarchive} 
                                deleteExperiment={deleteExperiment} 
                                selectExperiment={selectExperiment} 
                                handleDeployClick={handleDeployClick} 
                                handleExport={handleExport} 
                            />
                        ))}
                    </div>
                </div>
            )}

            {showDeployModal && selectedExperiment && (
                <DeployModal
                    experiment={selectedExperiment}
                    onClose={() => setShowDeployModal(false)}
                    onUpdateExperiment={updateExperiment}
                    onExportExperiment={handleExport}
                    isAuthenticated={isAuthenticated}
                />
            )}
        </div>
    );
};
