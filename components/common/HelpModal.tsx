import React, { useState } from 'react';
import { renderMarkdown } from '../../utils/markdownRenderer';
import { PortalModal } from './PortalModal';

// @ts-ignore
import docsUserGuide from '../../docs_user_guide.md?raw';
// @ts-ignore
import docsResearchGuide from '../../docs_research_guide.md?raw';
// @ts-ignore
import docsScientificMethod from '../../docs_scientific_method.md?raw';
// @ts-ignore
import docsProductSpec from '../../docs_product_spec.md?raw';
// @ts-ignore
import docsHmap from '../../docs_hmap.md?raw';
// @ts-ignore
import docsAppendix from '../../docs_appendix.md?raw';

interface DocSection {
    id: string;
    title: string;
    icon: string;
    content: string;
}

const SECTIONS: DocSection[] = [
    { id: 'guide', title: 'User Manual', icon: 'bi-book', content: docsUserGuide },
    { id: 'research', title: 'Research Guide', icon: 'bi-lightbulb', content: docsResearchGuide },
    { id: 'method', title: 'Scientific Method', icon: 'bi-microscope', content: docsScientificMethod },
    { id: 'spec', title: 'Product Specification', icon: 'bi-file-earmark-code', content: docsProductSpec },
    { id: 'hmap', title: 'HMAP Framework', icon: 'bi-people', content: docsHmap },
    { id: 'appendix', title: 'Technical Appendix', icon: 'bi-info-circle', content: docsAppendix }
];

export const HelpModal = ({ onClose }) => {
    const [activeSection, setActiveSection] = useState(SECTIONS[0]);

    return (
        <PortalModal isOpen={true} onClose={onClose} modalId="help-modal">
            <div className="help-modal-container" onClick={e => e.stopPropagation()}>
                <div className="help-sidebar">
                    <div className="help-sidebar-header">
                        <i className="bi bi-mortarboard-fill text-primary-glow fs-4"></i>
                        <div className="ms-2">
                            <div className="fw-bold leading-none" style={{fontSize: '0.9rem'}}>HYPATIA PRO</div>
                            <div className="text-white-50" style={{fontSize: '0.65rem'}}>CORE DOCUMENTATION</div>
                        </div>
                    </div>
                    <div className="help-sidebar-nav">
                        {SECTIONS.map(s => (
                            <button 
                                key={s.id}
                                className={`help-nav-item ${activeSection.id === s.id ? 'active' : ''}`}
                                onClick={() => setActiveSection(s)}
                            >
                                <i className={`bi ${s.icon} me-2`}></i>
                                <span>{s.title}</span>
                            </button>
                        ))}
                    </div>
                    <div className="px-3 mt-auto help-close-wrapper">
                        <button className="help-close-btn w-100" onClick={onClose}>
                            <i className="bi bi-x-lg me-2"></i> CLOSE
                        </button>
                    </div>
                </div>
                
                <div className="help-main">
                    <div className="help-main-header">
                        <div>
                            <h4 className="mb-0 fw-bold">{activeSection.title}</h4>
                            <div className="text-white-50 small">Protocol: {activeSection.id.toUpperCase()}</div>
                        </div>
                        <div className="badge bg-primary bg-opacity-10 text-primary-glow border border-primary border-opacity-25 px-3 py-2 d-none d-md-block">
                            <i className="bi bi-shield-check me-2"></i> VERIFIED ASSET
                        </div>
                        <button className="btn btn-sm btn-outline-danger d-md-none ms-2" onClick={onClose}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                    <div className="help-content-scroll">
                        <div className="help-markdown-body p-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(activeSection.content) }} />
                    </div>
                </div>
            </div>

            <style>{`
                .help-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.9);
                    backdrop-filter: blur(12px);
                    z-index: 3000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                }
                .help-modal-container {
                    width: 100%;
                    max-width: 1200px;
                    height: 90vh;
                    background: #0f1115;
                    border: 1px solid #2e343f;
                    border-radius: 20px;
                    display: flex;
                    overflow: hidden;
                    box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.8);
                }
                .help-sidebar {
                    width: 280px;
                    background: #16191e;
                    border-right: 1px solid #2e343f;
                    display: flex;
                    flex-direction: column;
                    padding: 1.5rem 0;
                }
                .help-sidebar-header {
                    padding: 0 1.5rem 1.5rem 1.5rem;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                }
                .help-sidebar-nav {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    padding: 0 1rem;
                }
                .help-nav-item {
                    background: transparent;
                    border: 1px solid transparent;
                    color: #94a3b8;
                    text-align: left;
                    padding: 0.85rem 1.25rem;
                    border-radius: 12px;
                    font-weight: 500;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                }
                .help-nav-item:hover {
                    background: rgba(255, 255, 255, 0.03);
                    color: white;
                }
                .help-nav-item.active {
                    background: rgba(0, 242, 254, 0.08);
                    color: #00f2fe;
                    border-color: rgba(0, 242, 254, 0.15);
                }
                .help-close-btn {
                    padding: 0.85rem;
                    background: transparent;
                    border: 1px solid #2e343f;
                    color: #ef4444;
                    border-radius: 12px;
                    font-weight: bold;
                    transition: all 0.2s;
                }
                .help-close-btn:hover {
                    background: rgba(239, 68, 68, 0.1);
                    border-color: #ef4444;
                }
                .help-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    background: #0f1115;
                }
                .help-main-header {
                    padding: 2rem 3rem;
                    border-bottom: 1px solid #2e343f;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: linear-gradient(to right, rgba(0,0,0,0.2), transparent);
                }
                .help-content-scroll {
                    flex: 1;
                    overflow-y: auto;
                    padding: 3rem;
                    scrollbar-width: thin;
                    scrollbar-color: #2e343f transparent;
                }
                .help-markdown-body {
                    color: #e2e8f0;
                    line-height: 1.8;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .help-markdown-body h1 { color: #00f2fe; font-size: 2.5rem; font-weight: 800; margin-bottom: 2rem; border-bottom: 1px solid #2e343f; padding-bottom: 1rem; }
                .help-markdown-body h2 { color: #00f2fe; font-size: 1.75rem; font-weight: 700; margin-top: 3rem; margin-bottom: 1.25rem; }
                .help-markdown-body h3 { color: #a64aff; font-size: 1.25rem; font-weight: 600; margin-top: 2rem; }
                .help-markdown-body p { margin-bottom: 1.5rem; font-size: 1.05rem; }
                .help-markdown-body ul, .help-markdown-body ol { margin-bottom: 2rem; padding-left: 1.5rem; }
                .help-markdown-body li { margin-bottom: 0.75rem; }
                .help-markdown-body blockquote { border-left: 4px solid #00f2fe; background: rgba(0, 242, 254, 0.05); padding: 1.5rem; border-radius: 0 12px 12px 0; font-style: italic; color: #cbd5e1; }
                .help-markdown-body pre { background: #050505; padding: 1.5rem; border-radius: 12px; border: 1px solid #2e343f; overflow-x: auto; margin: 2rem 0; }
                .help-markdown-body code { background: rgba(0, 242, 254, 0.1); color: #00f2fe; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.9em; }
                .help-markdown-body table { width: 100%; border-collapse: collapse; margin: 2rem 0; background: #16191e; border-radius: 12px; overflow: hidden; }
                .help-markdown-body th { background: #1e293b; color: #00f2fe; text-align: left; padding: 1rem; border: 1px solid #2e343f; }
                .help-markdown-body td { padding: 1rem; border: 1px solid #2e343f; }
                @media (max-width: 992px) {
                    .help-modal-overlay { padding: 0; }
                    .help-modal-container { height: 100vh; max-width: 100%; border-radius: 0; flex-direction: column-reverse; }
                    .help-sidebar { width: 100%; height: auto; flex-direction: row; overflow-x: auto; padding: 0.5rem; border-right: none; border-top: 1px solid #2e343f; background: #0f1115; }
                    .help-sidebar-header, .help-close-wrapper { display: none; }
                    .help-sidebar-nav { flex-direction: row; padding: 0; gap: 0.5rem; flex-grow: 1; }
                    .help-nav-item { padding: 0.75rem 1rem; white-space: nowrap; justify-content: center; }
                    .help-nav-item span { display: block; }
                    .help-main-header { padding: 1rem; }
                    .help-content-scroll { padding: 1rem; }
                }
            `}</style>
        </PortalModal>
    );
};