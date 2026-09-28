
import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../toast';
import { LLMProviderModal } from '../common/LLMProviderModal';

export const ApiKeySection = ({ onAuthenticate }) => {
    const [apiKey, setApiKey] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [showLLMModal, setShowLLMModal] = useState(false);
    const { addToast } = useToast();
    
    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!apiKey && !promoCode) {
            addToast('Please enter an API key or a promo code.', 'warning');
            return;
        }
        setIsAuthenticating(true);
        try {
            if (promoCode) {
                await onAuthenticate('promo', promoCode);
            } else {
                await onAuthenticate('key', apiKey);
            }
        } finally {
            if (isMounted.current) {
                setIsAuthenticating(false);
            }
        }
    };

    return (
        <div className="getting-started-fields mx-auto api-key-section">
            <form onSubmit={handleSubmit}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <p className="fw-bold text-light mb-0">AI Engine Credentials</p>
                    <button
                        type="button"
                        className="btn btn-link text-primary-glow p-0 text-decoration-none small"
                        onClick={() => setShowLLMModal(true)}
                    >
                        <i className="bi bi-gear-fill me-1"></i>All Providers &raquo;
                    </button>
                </div>
                <div className="alert alert-info small">
                    <i className="bi bi-info-circle-fill me-2"></i>
                    To use Project Hypatia, connect via Google Gemini, OpenAI, Anthropic, Ollama, or OpenRouter. Your key or OAuth subscription is stored locally.
                </div>
                <div className="mb-3">
                    <label htmlFor="apiKeyInput" className="form-label visually-hidden">Gemini API Key</label>
                    <input
                        id="apiKeyInput"
                        type="password"
                        className="form-control"
                        placeholder="Enter your Gemini API Key"
                        value={apiKey}
                        onChange={(e) => { setApiKey(e.target.value); setPromoCode(''); }}
                        disabled={isAuthenticating || !!promoCode}
                        aria-label="Gemini API Key"
                    />
                     <div className="form-text">
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary-glow">Get your free Gemini API key from Google AI Studio &raquo;</a>
                    </div>
                </div>

                <div className="mb-3 text-center">
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm w-100 py-1.5"
                        onClick={() => setShowLLMModal(true)}
                    >
                        <i className="bi bi-cpu-fill me-1.5 text-primary-glow"></i>
                        Use OpenAI, Anthropic, Ollama, or OpenRouter &raquo;
                    </button>
                </div>

                <div className="text-center text-white-50 my-2 small">--- or ---</div>

                <div className="mb-3">
                     <label htmlFor="promoCodeInput" className="form-label visually-hidden">Promo Code</label>
                    <input
                        id="promoCodeInput"
                        type="text"
                        className="form-control"
                        placeholder="Enter a Promo Code (if available)"
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value); setApiKey(''); }}
                        disabled={isAuthenticating || !!apiKey}
                        aria-label="Promo Code"
                    />
                    <div className="form-text text-warning">
                        Note: Promo code access may be limited or expired. Using your own API key is recommended.
                    </div>
                </div>
                <button type="submit" className="btn btn-primary btn-lg w-100 mt-2" disabled={isAuthenticating}>
                    {isAuthenticating ? 'Validating...' : 'Unlock Hypatia'}
                </button>
                
                <div className="text-center mt-3 pt-3 border-top border-secondary border-opacity-25">
                    <button type="button" className="btn btn-outline-light btn-sm" onClick={() => onAuthenticate('demo', 'demo')}>
                        <i className="bi bi-play-circle-fill me-1"></i> Activate Demo Mode (No Key)
                    </button>
                </div>
            </form>

            {showLLMModal && (
                <LLMProviderModal
                    isOpen={showLLMModal}
                    onClose={() => setShowLLMModal(false)}
                    onSaved={() => onAuthenticate('key', 'configured')}
                />
            )}
        </div>
    );
};