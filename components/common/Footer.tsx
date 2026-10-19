
import React from 'react';

export const Footer = () => (
    <footer className="mifeco-footer text-center p-4 mt-5 border-top border-secondary border-opacity-10">
        <div className="container">
            <div className="mb-3 p-3 rounded-3 bg-dark bg-opacity-40 border border-secondary border-opacity-25 mx-auto" style={{ maxWidth: '820px' }}>
                <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
                    <i className="bi bi-mortarboard-fill text-primary-glow"></i>
                    <span className="text-white small fw-bold font-mono text-uppercase" style={{ letterSpacing: '0.04em' }}>
                        Academic Attribution &amp; Conceptual Lineage
                    </span>
                </div>
                <p className="mb-0 text-white-50 small" style={{ fontSize: '0.82rem', lineHeight: '1.5' }}>
                    The idea behind this app is credited to <strong className="text-white">"The AI Scientist,"</strong> developed by Tokyo-based startup <strong className="text-primary-glow">Sakana AI</strong>. Created in collaboration with researchers from the <strong className="text-white">University of Oxford</strong> and the <strong className="text-white">University of British Columbia</strong>.
                </p>
            </div>
            <p className="mb-2 text-white-50 small" style={{ maxWidth: '700px', margin: '0 auto' }}>
                Project Hypatia Pro: An autonomous scientific discovery platform featuring frontier AI models, 
                rigorous step-by-step verification, and advanced experimental simulation logic for professional-grade research.
            </p>
            <p className="mb-0 mt-2 opacity-50 small font-mono" style={{ fontSize: '0.75rem' }}>
                Powered by Frontier Reasoning Models &middot; Developed with Mifeco
            </p>
        </div>
    </footer>
);
