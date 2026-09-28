
import React, { useState } from 'react';
import { useExperiment, getKeyStatus } from '../../services';
import { useToast } from '../../toast';
import { HelpModal } from './HelpModal';
import { SettingsModal } from './SettingsModal';
import { PortalModal } from './PortalModal';
import { Z_INDEX_LAYERS } from '../../context/ModalContext';

interface AppMenuModalProps {
    onClose: () => void;
    setView: (view: string) => void;
    activeView: string;
    onToggleNotebook: () => void;
    onToggleCitations: () => void;
    onOpenLLMModal?: () => void;
}

export const AppMenuModal: React.FC<AppMenuModalProps> = ({ onClose, setView, activeView, onToggleNotebook, onToggleCitations, onOpenLLMModal }) => {
    const { activeExperiment, updateExperiment, isAuthenticated } = useExperiment();
    const { addToast } = useToast();
    const [showHelp, setShowHelp] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const handleNavigate = (view: string) => {
        setView(view);
        onClose();
    };

    const handleSaveProject = async () => {
        if (!activeExperiment) return;
        try {
            await updateExperiment({ ...activeExperiment, status: 'archived' });
            addToast(`Project "${activeExperiment.title}" saved to archive.`, 'success');
            handleNavigate('dashboard');
        } catch (error) {
            addToast('Failed to archive project.', 'danger');
        }
    };

    const handleExportCurrentProject = () => {
        if (!activeExperiment) return;
        try {
            const dataStr = JSON.stringify(activeExperiment, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `hypatia_export_${activeExperiment.title.replace(/\s+/g, '_')}_${activeExperiment.id.slice(-4)}.json`;
            link.click();
            URL.revokeObjectURL(url);
            addToast("Project exported successfully.", 'success');
        } catch (error) {
            addToast("Failed to export project.", 'danger');
            console.error("Export failed:", error);
        }
    };

    const menuItems = [
        { 
            id: 'landing', 
            label: 'New Investigation', 
            icon: 'bi-plus-circle', 
            description: 'Design and launch a new study',
            action: () => handleNavigate('landing'),
            visible: activeView !== 'landing'
        },
        { 
            id: 'dashboard', 
            label: 'Dashboard', 
            icon: 'bi-columns-gap', 
            description: 'Manage your research projects',
            action: () => handleNavigate('dashboard'),
            visible: true
        },
        {
            id: 'documentation',
            label: 'Artifacts & Docs',
            icon: 'bi-folder2-open',
            description: 'View generated assets and images',
            action: () => handleNavigate('documentation'),
            visible: true
        },
        { 
            id: 'notebook', 
            label: 'Lab Notebook', 
            icon: 'bi-journal-text', 
            description: 'Record observations and thoughts',
            action: () => { onToggleNotebook(); onClose(); },
            visible: activeView === 'experiment' && !!activeExperiment
        },
        { 
            id: 'citations', 
            label: 'Citation Manager', 
            icon: 'bi-journal-medical', 
            description: 'Manage tags and references',
            action: () => { onToggleCitations(); onClose(); },
            visible: activeView === 'experiment' && !!activeExperiment
        },
        { 
            id: 'tests', 
            label: 'System Audit', 
            icon: 'bi-shield-check', 
            description: 'Run health and logic tests',
            action: () => handleNavigate('testing'),
            visible: true
        },
        {
            id: 'auth',
            label: 'Account & Authority',
            icon: 'bi-person-badge',
            description: 'Demo Free, Stripe Business, or Studio Login',
            action: () => handleNavigate('auth'),
            visible: true
        },
        { 
            id: 'settings', 
            label: 'Settings', 
            icon: 'bi-gear-fill', 
            description: 'App configuration and interface preferences',
            action: () => setShowSettings(true),
            visible: true
        },
        { 
            id: 'llm-credentials', 
            label: 'LLM & API Credentials', 
            icon: 'bi-key-fill', 
            description: 'Configure Google, OpenAI, Anthropic, Ollama, OpenRouter',
            action: () => {
                if (onOpenLLMModal) {
                    onOpenLLMModal();
                    onClose();
                } else {
                    setShowSettings(true);
                }
            },
            visible: true
        },
        { 
            id: 'help', 
            label: 'Documentation', 
            icon: 'bi-question-square', 
            description: 'User manual and research guide',
            action: () => setShowHelp(true),
            visible: true
        }
    ];

    // Get auth status for display
    const keyStatus = getKeyStatus();

    return (
        <>
            <PortalModal isOpen={true} onClose={onClose} modalId="app-menu-modal" baseLayer={Z_INDEX_LAYERS.DRAWER}>
                <div className="app-menu-modal p-0" onClick={e => e.stopPropagation()}>
                    <div className="app-menu-header">
                        <h5 className="mb-0 fw-bold">
                            <i className="bi bi-grid-3x3-gap-fill me-2 text-primary-glow"></i>
                            SYSTEM MENU
                        </h5>
                        <button className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    
                    <div className="app-menu-body p-4">
                        {activeExperiment && activeView === 'experiment' && (
                            <div className="active-project-section mb-4 p-3 rounded-3 bg-primary bg-opacity-10 border border-primary border-opacity-25">
                                <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                        <small className="text-primary-glow text-uppercase fw-bold ls-1 d-block mb-1">Active Research</small>
                                        <h6 className="mb-0 text-white fw-bold">{activeExperiment.title}</h6>
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-sm btn-outline-light" onClick={handleExportCurrentProject} title="Export project to JSON">
                                            <i className="bi bi-download me-1"></i> EXPORT JSON
                                        </button>
                                        <button className="btn btn-sm btn-primary" onClick={handleSaveProject} title="Save to archive">
                                            <i className="bi bi-archive-fill me-1"></i> SAVE TO ARCHIVE
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="menu-grid">
                            {menuItems.filter(item => item.visible).map(item => (
                                <button 
                                    key={item.id} 
                                    className="menu-item-btn"
                                    onClick={item.action}
                                >
                                    <div className="menu-item-icon">
                                        <i className={`bi ${item.icon}`}></i>
                                    </div>
                                    <div className="menu-item-text">
                                        <div className="menu-item-label">{item.label}</div>
                                        <div className="menu-item-description">{item.description}</div>
                                    </div>
                                    <i className="bi bi-chevron-right ms-auto opacity-25"></i>
                                </button>
                            ))}
                        </div>

                        {!isAuthenticated && (
                            <div className="alert alert-warning mt-4 small border-warning border-opacity-25 bg-warning bg-opacity-10 text-warning">
                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                Archival link is currently disconnected. Features may be limited.
                            </div>
                        )}
                    </div>

                    <div className="app-menu-footer p-3 text-center border-top border-secondary border-opacity-25 mt-auto">
                        <p className="text-white-50 small mb-0">Project Hypatia v2.5-Pro • Build 092025</p>
                    </div>
                </div>
                
                <style>{`
                    .app-menu-modal {
                        position: fixed;
                        top: 0;
                        right: 0;
                        width: 400px;
                        max-width: 100%;
                        height: 100vh;
                        background: var(--bg-dark);
                        border-left: 1px solid var(--border-color);
                        display: flex;
                        flex-direction: column;
                        animation: slideInRight 0.3s ease-out;
                        box-shadow: -10px 0 30px rgba(0,0,0,0.5);
                    }
                    @media (max-width: 576px) {
                        .app-menu-modal {
                            width: 100%;
                            border-left: none;
                        }
                    }
                    @keyframes slideInRight {
                        from { transform: translateX(100%); }
                        to { transform: translateX(0); }
                    }
                    .app-menu-header {
                        padding: 1.5rem;
                        border-bottom: 1px solid var(--border-color);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .menu-grid {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    }
                    .menu-item-btn {
                        background: transparent;
                        border: 1px solid transparent;
                        color: white;
                        display: flex;
                        align-items: center;
                        padding: 1rem;
                        border-radius: 0.75rem;
                        text-align: left;
                        transition: all 0.2s;
                    }
                    .menu-item-btn:hover {
                        background: rgba(255, 255, 255, 0.05);
                        border-color: var(--border-color);
                        transform: translateX(5px);
                    }
                    .menu-item-icon {
                        width: 40px;
                        height: 40px;
                        background: rgba(0, 242, 254, 0.1);
                        color: var(--primary-glow);
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.25rem;
                        margin-right: 1rem;
                    }
                    .menu-item-label {
                        font-weight: 600;
                        font-size: 1rem;
                    }
                    .menu-item-description {
                        font-size: 0.8rem;
                        color: var(--text-muted);
                    }
                    .status-dot {
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                    }
                    .ls-1 { letter-spacing: 0.05rem; }
                `}</style>
            </PortalModal>

            {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </>
    );
};
