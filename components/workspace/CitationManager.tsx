import React, { useState, useEffect } from 'react';
import { useExperiment, syncCitationsFromExperiment } from '../../services';
import { useToast } from '../../toast';
import { Citation } from '../../config';

export const CitationManager = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const { activeExperiment, updateExperiment } = useExperiment();
    const { addToast } = useToast();
    const [citations, setCitations] = useState<Citation[]>(activeExperiment?.citations || []);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isAdding, setIsAdding] = useState(false);
    const [form, setForm] = useState<Partial<Citation>>({ tags: [] });

    // Auto sync citations whenever activeExperiment or drawer opens
    useEffect(() => {
        if (activeExperiment) {
            const synced = syncCitationsFromExperiment(activeExperiment);
            setCitations(synced);
            // If new citations were found from step data, save them to experiment state
            if (synced.length > (activeExperiment.citations?.length || 0)) {
                updateExperiment({ ...activeExperiment, citations: synced });
            }
        }
    }, [activeExperiment?.stepData?.[2]?.output, isOpen]);

    const handleSyncNow = async () => {
        if (!activeExperiment) return;
        const synced = syncCitationsFromExperiment(activeExperiment);
        setCitations(synced);
        await updateExperiment({ ...activeExperiment, citations: synced });
        const countAdded = synced.length - (activeExperiment.citations?.length || 0);
        if (countAdded > 0) {
            addToast(`Synced ${countAdded} new references into Citation Artifact.`, "success");
        } else {
            addToast(`Citation Manager is up-to-date (${synced.length} references).`, "info");
        }
    };

    const handleSaveList = async (updatedList: Citation[]) => {
        if (activeExperiment) {
            await updateExperiment({ ...activeExperiment, citations: updatedList });
        }
    };

    const handleAdd = () => {
        if (!form.title) {
            addToast("Title is required for citation.", "warning");
            return;
        }
        const newCitation: Citation = {
            id: `cit_${Date.now()}`,
            title: form.title,
            authors: form.authors || '',
            year: form.year || '',
            url: form.url || '',
            notes: form.notes || '',
            tags: form.tags || [],
            createdAt: new Date().toISOString()
        };
        const updatedList = [...citations, newCitation];
        setCitations(updatedList);
        handleSaveList(updatedList);
        setIsAdding(false);
        setForm({ tags: [] });
        addToast("Citation added.", "success");
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Delete this citation?")) {
            const updatedList = citations.filter(c => c.id !== id);
            setCitations(updatedList);
            handleSaveList(updatedList);
            addToast("Citation removed.", "success");
        }
    };

    const handleCopyBibtex = (cit: Citation) => {
        const key = (cit.authors?.split(' ')[0] || 'ref') + (cit.year || '2026');
        const bib = `@article{${key.toLowerCase().replace(/[^a-z0-9]/g, '')},\n  title={${cit.title}},\n  author={${cit.authors || 'Unknown'}},\n  year={${cit.year || '2026'}},\n  url={${cit.url || ''}}\n}`;
        navigator.clipboard.writeText(bib);
        addToast("BibTeX copied to clipboard.", "info");
    };

    const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && e.currentTarget.value) {
            e.preventDefault();
            const newTag = e.currentTarget.value.trim();
            if (newTag && !form.tags?.includes(newTag)) {
                setForm({ ...form, tags: [...(form.tags || []), newTag] });
            }
            e.currentTarget.value = '';
        }
    };

    const removeFormTag = (tagToRemove: string) => {
        setForm({ ...form, tags: form.tags?.filter(t => t !== tagToRemove) });
    };

    const filteredCitations = citations.filter(c => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            c.title.toLowerCase().includes(term) ||
            (c.authors && c.authors.toLowerCase().includes(term)) ||
            (c.notes && c.notes.toLowerCase().includes(term)) ||
            (c.tags && c.tags.some(t => t.toLowerCase().includes(term)))
        );
    });

    return (
        <div className={`lab-notebook-drawer ${isOpen ? 'open' : ''}`} style={{ zIndex: 1100 }}>
            <div className="lab-notebook-header d-flex justify-content-between align-items-center p-3 border-bottom border-secondary">
                <div className="d-flex align-items-center gap-2">
                    <h5 className="mb-0 fw-bold"><i className="bi bi-journal-medical me-2 text-primary-glow"></i>Citation Manager</h5>
                    <span className="badge bg-primary bg-opacity-20 text-primary-glow font-monospace">{citations.length} References</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <button 
                        className="btn btn-outline-info btn-sm" 
                        onClick={handleSyncNow} 
                        data-tooltip="Extracts grounded literature references directly from experiment step data"
                    >
                        <i className="bi bi-arrow-repeat me-1"></i> Sync Node Data
                    </button>
                    {!isAdding && (
                        <button 
                            className="btn btn-outline-primary btn-sm" 
                            onClick={() => setIsAdding(true)}
                            data-tooltip="Opens form to manually add a new paper or citation"
                        >
                            <i className="bi bi-plus-lg me-1"></i> Add
                        </button>
                    )}
                    <button 
                        className="btn btn-outline-secondary btn-sm" 
                        onClick={onClose}
                        data-tooltip="Closes citation manager drawer"
                    >
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>
            <div className="lab-notebook-body p-3 overflow-auto" style={{ height: 'calc(100vh - 60px)', background: 'var(--glass-bg)' }}>
                
                {/* Search Bar */}
                <div className="mb-3">
                    <div className="input-group input-group-sm">
                        <span className="input-group-text bg-dark border-secondary text-white-50"><i className="bi bi-search"></i></span>
                        <input 
                            type="text" 
                            className="form-control form-control-sm bg-dark border-secondary text-white" 
                            placeholder="Filter by title, author, journal, or tag..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button className="btn btn-outline-secondary" onClick={() => setSearchTerm('')}>Clear</button>
                        )}
                    </div>
                </div>

                {isAdding && (
                    <div className="card bg-black border-secondary mb-4 p-3 shadow-sm">
                        <h6 className="text-primary-glow mb-3">New Citation Entry</h6>
                        <div className="mb-2">
                            <label className="small text-white-50">Title / Source Name *</label>
                            <input type="text" className="form-control form-control-sm" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g., Nature Vol 564" />
                        </div>
                        <div className="row mb-2">
                            <div className="col-8">
                                <label className="small text-white-50">Authors</label>
                                <input type="text" className="form-control form-control-sm" value={form.authors || ''} onChange={e => setForm({...form, authors: e.target.value})} placeholder="Doe, J. et al." />
                            </div>
                            <div className="col-4">
                                <label className="small text-white-50">Year</label>
                                <input type="text" className="form-control form-control-sm" value={form.year || ''} onChange={e => setForm({...form, year: e.target.value})} placeholder="2024" />
                            </div>
                        </div>
                        <div className="mb-2">
                            <label className="small text-white-50">URL / DOI</label>
                            <input type="text" className="form-control form-control-sm" value={form.url || ''} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://doi.org/..." />
                        </div>
                        <div className="mb-2">
                            <label className="small text-white-50">Tags (Press Enter)</label>
                            <input type="text" className="form-control form-control-sm" placeholder="Add tag..." onKeyDown={handleTagInput} />
                            {form.tags && form.tags.length > 0 && (
                                <div className="d-flex flex-wrap gap-1 mt-2">
                                    {form.tags.map(tag => (
                                        <span key={tag} className="badge bg-secondary opacity-75 d-flex align-items-center">
                                            {tag} <i className="bi bi-x ms-1" style={{cursor: 'pointer'}} onClick={() => removeFormTag(tag)}></i>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="mb-3">
                            <label className="small text-white-50">Notes / Relevance</label>
                            <textarea className="form-control form-control-sm" rows={2} value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} placeholder="How this relates to the hypothesis..." />
                        </div>
                        <div className="d-flex gap-2">
                            <button className="btn btn-primary btn-sm flex-grow-1" onClick={handleAdd}>Save Citation</button>
                            <button className="btn btn-outline-secondary btn-sm" onClick={() => setIsAdding(false)}>Cancel</button>
                        </div>
                    </div>
                )}

                {filteredCitations.length === 0 && !isAdding ? (
                    <div className="text-center p-5 text-white-50">
                        <i className="bi bi-journal-x fs-1 mb-3 d-block"></i>
                        <p>{searchTerm ? 'No matching citations found.' : 'No citations in artifact. Run Literature Review or click "Sync Node Data".'}</p>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-3">
                        {filteredCitations.map(cit => (
                            <div key={cit.id} className="card bg-dark border-secondary p-3 shadow-sm position-relative">
                                <div className="d-flex justify-content-between align-items-start mb-1 pe-4">
                                    <h6 className="mb-0 text-white fw-semibold">{cit.title}</h6>
                                </div>
                                <div className="position-absolute top-0 end-0 p-2 d-flex gap-1">
                                    <button className="btn btn-link text-white-50 p-1" title="Copy BibTeX" onClick={() => handleCopyBibtex(cit)}>
                                        <i className="bi bi-clipboard"></i>
                                    </button>
                                    <button className="btn btn-link text-danger p-1" title="Delete Citation" onClick={() => handleDelete(cit.id)}>
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </div>
                                {(cit.authors || cit.year) && (
                                    <div className="small text-info text-opacity-75 mb-2 font-monospace" style={{ fontSize: '0.8rem' }}>
                                        {cit.authors} {cit.year && `(${cit.year})`}
                                    </div>
                                )}
                                {cit.url && (
                                    <a href={cit.url} target="_blank" rel="noopener noreferrer" className="small d-block mb-2 text-primary-glow text-truncate" style={{ fontSize: '0.8rem' }}>
                                        <i className="bi bi-box-arrow-up-right me-1"></i>{cit.url}
                                    </a>
                                )}
                                {cit.notes && (
                                    <div className="small bg-black bg-opacity-50 p-2 rounded mb-2 border border-secondary border-opacity-25 text-white-50" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                                        {cit.notes}
                                    </div>
                                )}
                                {cit.tags && cit.tags.length > 0 && (
                                    <div className="d-flex flex-wrap gap-1 mt-auto">
                                        {cit.tags.map(tag => (
                                            <span key={tag} className="badge bg-secondary border border-secondary border-opacity-50 bg-opacity-25 text-white-50" style={{ fontSize: '0.7rem' }}>
                                                <i className="bi bi-tag-fill me-1 text-primary-glow"></i>{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

