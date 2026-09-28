import React, { useState } from 'react';
import { callGeminiWithRetry, safeGetText } from '../../services/api';

interface PersonaCard {
    id: string;
    name: string;
    role: string;
    icon: string;
    color: string;
    perspective: string;
}

interface MultiAgentAdvisoryCouncilProps {
    stepId: number;
    stepTitle: string;
    stepContent: string;
}

export const MultiAgentAdvisoryCouncil: React.FC<MultiAgentAdvisoryCouncilProps> = ({
    stepId,
    stepTitle,
    stepContent
}) => {
    const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
    const [advice, setAdvice] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const personas: PersonaCard[] = [
        {
            id: 'skeptic',
            name: 'Dr. Evelyn Vance',
            role: 'Skeptical Peer Reviewer',
            icon: 'bi-search-heart-fill',
            color: '#FFB300',
            perspective: 'Identifies methodology gaps, unmeasured variables, and unsubstantiated claims.'
        },
        {
            id: 'biostatistician',
            name: 'Prof. Marcus Chen',
            role: 'Senior Biostatistician',
            icon: 'bi-calculator-fill',
            color: '#00F2FE',
            perspective: 'Evaluates sample size sufficiency, p-value distributions, and effect size validity.'
        },
        {
            id: 'editor',
            name: 'Dr. Sarah Al-Mansoor',
            role: 'Journal Managing Editor',
            icon: 'bi-journal-check',
            color: '#E040FB',
            perspective: 'Assesses scientific impact, narrative clarity, and publication readiness.'
        }
    ];

    const handleConsultPersona = async (persona: PersonaCard) => {
        setSelectedPersona(persona.id);
        setIsLoading(true);
        setAdvice(null);

        const prompt = `You are ${persona.name}, a top-tier ${persona.role}.
Perspective Focus: ${persona.perspective}

Review the following output for Step ${stepId} (${stepTitle}):
"""
${stepContent.slice(0, 1500)}
"""

Task: Provide concise, highly actionable critique (3 bullet points max) from your professional viewpoint to improve rigor before journal submission.`;

        try {
            const response = await callGeminiWithRetry('gemini-3.5-flash', { contents: prompt });
            const text = safeGetText(response);
            if (text) {
                setAdvice(text.trim());
            }
        } catch (err) {
            console.error('Advisory critique error:', err);
            setAdvice('Unable to generate advisory critique. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card bg-black border-secondary border-opacity-25 shadow-sm p-3 my-3">
            <div className="d-flex align-items-center justify-content-between border-bottom border-secondary border-opacity-10 pb-2 mb-3">
                <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-people-fill text-primary-glow h5 mb-0"></i>
                    <div>
                        <h6 className="fw-bold mb-0 text-white">Multi-Agent Advisory Council</h6>
                        <small className="text-white-50" style={{ fontSize: '0.75rem' }}>
                            Instant expert critiques without triggering full step re-generations
                        </small>
                    </div>
                </div>
            </div>

            <div className="row g-2 mb-3">
                {personas.map(p => (
                    <div key={p.id} className="col-md-4">
                        <div 
                            className={`p-2 rounded border cursor-pointer transition-all h-100 ${
                                selectedPersona === p.id 
                                    ? 'bg-dark border-primary shadow-sm' 
                                    : 'bg-dark bg-opacity-30 border-secondary border-opacity-20 hover-bg-dark'
                            }`}
                            onClick={() => handleConsultPersona(p)}
                        >
                            <div className="d-flex align-items-center gap-2 mb-1">
                                <i className={`bi ${p.icon}`} style={{ color: p.color, fontSize: '1.1rem' }}></i>
                                <div>
                                    <div className="fw-bold small text-white">{p.name}</div>
                                    <div className="text-white-50" style={{ fontSize: '0.68rem' }}>{p.role}</div>
                                </div>
                            </div>
                            <p className="text-white-50 mb-0" style={{ fontSize: '0.72rem' }}>
                                {p.perspective}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Critique Feedback Container */}
            {isLoading && (
                <div className="p-3 bg-dark rounded text-center text-white-50">
                    <span className="spinner-border spinner-border-sm me-2 text-primary"></span>
                    Consulting Advisory Agent...
                </div>
            )}

            {advice && !isLoading && (
                <div className="p-3 bg-dark border border-secondary border-opacity-25 rounded fade-in">
                    <div className="d-flex align-items-center justify-content-between mb-2 border-bottom border-secondary border-opacity-10 pb-1">
                        <strong className="small text-primary-glow">
                            <i className="bi bi-chat-quote-fill me-1"></i> Advisory Recommendations:
                        </strong>
                        <button className="btn btn-sm btn-close btn-close-white" onClick={() => setAdvice(null)}></button>
                    </div>
                    <div className="small text-white-50 font-monospace whitespace-pre-wrap" style={{ fontSize: '0.82rem' }}>
                        {advice}
                    </div>
                </div>
            )}
        </div>
    );
};
