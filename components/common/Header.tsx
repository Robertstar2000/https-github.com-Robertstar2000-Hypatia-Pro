
import React, { useState, useEffect } from 'react';
import { AppMenuModal } from './AppMenuModal';
import { LLMProviderModal } from './LLMProviderModal';
import { getKeyStatus } from '../../services';

export const Header = ({ setView, activeView, onToggleNotebook, onToggleCitations }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [showLLMModal, setShowLLMModal] = useState(false);
    const [keyStatus, setKeyStatus] = useState(getKeyStatus);

    useEffect(() => {
        const handleUpdate = () => {
            setKeyStatus(getKeyStatus());
        };
        window.addEventListener('hypatia-llm-config-updated', handleUpdate);
        return () => window.removeEventListener('hypatia-llm-config-updated', handleUpdate);
    }, []);

    return (
        <>
            <nav className="navbar navbar-expand-lg navbar-dark sticky-top px-3" style={{ zIndex: 1050 }}>
                <div className="container-fluid">
                    <a className="navbar-brand fw-bold d-flex align-items-center" href="#" onClick={(e) => { e.preventDefault(); setView('landing'); }} style={{ minHeight: '44px' }}>
                        <i className="bi bi-mortarboard-fill me-2 text-primary-glow fs-3"></i>
                        <span className="fw-bold font-mono text-white" style={{ letterSpacing: '0.04em' }}>
                            HYPATIA<span className="text-primary-glow">.PRO</span>
                        </span>
                    </a>
                    
                    <div className="ms-auto d-flex align-items-center gap-2">
                        {/* LLM Provider & Key trigger button */}
                        <button
                            type="button"
                            className="btn btn-outline-secondary d-flex align-items-center gap-1.5 px-2.5 py-1.5 border-opacity-25 hover-border-primary text-white rounded-pill"
                            onClick={() => setShowLLMModal(true)}
                            title="Configure LLM Provider, API Key, or OAuth Subscription"
                            style={{ fontSize: '0.8rem', background: 'rgba(15, 23, 42, 0.6)' }}
                        >
                            <i className="bi bi-key-fill text-primary-glow"></i>
                            <span className="d-none d-sm-inline font-mono">
                                {keyStatus.providerName || 'LLM'}: {keyStatus.model || 'Model'}
                            </span>
                            <span className="d-inline d-sm-none font-mono">
                                {keyStatus.providerName?.split(' ')[0] || 'LLM'}
                            </span>
                            <span className={`badge rounded-pill ${keyStatus.color || 'bg-success'} p-1`} style={{ width: '8px', height: '8px' }}></span>
                        </button>

                        {/* Sign In / Account Access Button */}
                        <button
                            type="button"
                            className="btn btn-outline-secondary d-flex align-items-center gap-1.5 px-2.5 py-1.5 border-opacity-25 hover-border-primary text-white rounded-pill"
                            onClick={() => setView('auth')}
                            title="Sign In, Demo Free, or Mifeco Business Stripe Authority"
                            style={{ fontSize: '0.8rem', background: 'rgba(15, 23, 42, 0.6)' }}
                        >
                            <i className="bi bi-person-circle text-primary-glow"></i>
                            <span className="d-none d-md-inline font-mono">Sign In</span>
                        </button>

                        <span className="badge rounded-pill bg-dark border border-secondary border-opacity-25 px-3 py-2 d-none d-lg-inline-block text-white-50">
                             <i className="bi bi-cpu-fill me-1 text-primary-glow"></i> SYSTEM READY
                        </span>
                        
                        <button 
                            type="button"
                            className="btn btn-link text-white p-2 ms-1 position-relative" 
                            onClick={() => setShowMenu(true)}
                            aria-label="Open System Menu"
                            data-tooltip="Opens system menu, platform navigation, settings, and workspace controls"
                            style={{ fontSize: '1.5rem', transition: 'transform 0.2s', zIndex: 1051, cursor: 'pointer' }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
                        >
                            <i className="bi bi-grid-3x3-gap-fill"></i>
                        </button>
                    </div>
                </div>
            </nav>

            {showMenu && (
                <AppMenuModal 
                    onClose={() => setShowMenu(false)} 
                    setView={setView} 
                    activeView={activeView} 
                    onToggleNotebook={onToggleNotebook}
                    onToggleCitations={onToggleCitations}
                    onOpenLLMModal={() => setShowLLMModal(true)}
                />
            )}

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
        </>
    );
};
