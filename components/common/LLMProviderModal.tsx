import React, { useState, useEffect } from 'react';
import { PortalModal } from './PortalModal';
import { 
    LLMProviderId, 
    AuthMode, 
    SUPPORTED_PROVIDERS, 
    getStoredLLMConfig, 
    saveLLMConfig, 
    LLMConfig 
} from '../../services/llmConfig';
import { useToast } from '../../toast';
import { getSafeEnvApiKey } from '../../services/api';

interface LLMProviderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved?: (config: LLMConfig) => void;
}

export const LLMProviderModal: React.FC<LLMProviderModalProps> = ({ isOpen, onClose, onSaved }) => {
    const { addToast } = useToast();
    
    // Initial state loaded from stored configuration
    const [config, setConfig] = useState<LLMConfig>(getStoredLLMConfig);
    const [selectedProvider, setSelectedProvider] = useState<LLMProviderId>(config.provider);
    const [authMode, setAuthMode] = useState<AuthMode>(config.authType);
    const [apiKey, setApiKey] = useState(config.apiKey || '');
    const [endpointUrl, setEndpointUrl] = useState(config.endpointUrl || '');
    const [selectedModel, setSelectedModel] = useState(config.model);
    const [customModel, setCustomModel] = useState(config.customModel || '');
    const [isCustomModelActive, setIsCustomModelActive] = useState(Boolean(config.customModel));
    const [showKey, setShowKey] = useState(false);

    // OAuth state
    const [isOAuthConnecting, setIsOAuthConnecting] = useState(false);
    const [oauthAccount, setOauthAccount] = useState(config.oauthAccount);
    const [oauthToken, setOauthToken] = useState(config.oauthToken || '');

    // Testing state
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const providerDef = SUPPORTED_PROVIDERS[selectedProvider];
    const systemEnvKey = getSafeEnvApiKey();

    // When provider tab switches, sync model defaults and endpoint
    const handleSelectProvider = (provId: LLMProviderId) => {
        setSelectedProvider(provId);
        const def = SUPPORTED_PROVIDERS[provId];
        
        // If switching back to configured provider, restore saved values
        if (provId === config.provider) {
            setAuthMode(config.authType);
            setApiKey(config.apiKey || '');
            setEndpointUrl(config.endpointUrl || def.defaultEndpoint || '');
            setSelectedModel(config.model || def.defaultModel);
            setCustomModel(config.customModel || '');
            setIsCustomModelActive(Boolean(config.customModel));
            setOauthAccount(config.oauthAccount);
            setOauthToken(config.oauthToken || '');
        } else {
            // New provider default
            setSelectedModel(def.defaultModel);
            setCustomModel('');
            setIsCustomModelActive(false);
            setEndpointUrl(def.defaultEndpoint || '');
            setApiKey('');
            setOauthAccount(undefined);
            setOauthToken('');
        }
        setTestResult(null);
    };

    // Listen for OAuth postMessage popup response
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Verify origin matches preview or localhost
            const origin = event.origin;
            if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
                return;
            }

            if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
                setIsOAuthConnecting(false);
                const provider = event.data.provider || selectedProvider;
                const token = event.data.token || `oauth_${provider}_${Date.now()}`;
                const account = event.data.account || {
                    name: `${provider.toUpperCase()} Subscriber`,
                    tier: 'Pro Subscription Active',
                    connectedAt: new Date().toISOString()
                };

                setOauthToken(token);
                setOauthAccount(account);
                setTestResult({
                    success: true,
                    message: `Successfully authenticated subscription for ${SUPPORTED_PROVIDERS[selectedProvider]?.name || provider}!`
                });
                addToast(`Connected to ${SUPPORTED_PROVIDERS[selectedProvider]?.name} subscription.`, 'success');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [selectedProvider, addToast]);

    // Handle OAuth popup initiation
    const handleInitiateOAuth = async () => {
        setIsOAuthConnecting(true);
        setTestResult(null);
        try {
            const resp = await fetch(`/api/auth/oauth-url?provider=${selectedProvider}`);
            if (!resp.ok) {
                throw new Error('Failed to obtain OAuth authorization URL from server.');
            }
            const data = await resp.json();
            const authUrl = data.url;

            // Open OAuth Provider URL in popup as per AI Studio iframe rules
            const width = 600;
            const height = 720;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            const popup = window.open(
                authUrl,
                'oauth_popup',
                `width=${width},height=${height},left=${left},top=${top},status=yes,scrollbars=yes`
            );

            if (!popup || popup.closed || typeof popup.closed === 'undefined') {
                setIsOAuthConnecting(false);
                addToast('Popup was blocked by your browser. Please allow popups for this site.', 'warning');
            }
        } catch (err: any) {
            setIsOAuthConnecting(false);
            console.error('OAuth initiation error:', err);
            addToast(err.message || 'Failed to start OAuth authorization.', 'danger');
        }
    };

    // Disconnect OAuth subscription
    const handleDisconnectOAuth = () => {
        setOauthToken('');
        setOauthAccount(undefined);
        setTestResult(null);
        addToast(`Disconnected ${providerDef.name} OAuth subscription.`, 'info');
    };

    // Test connection with currently entered parameters
    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);

        const currentModelId = isCustomModelActive && customModel.trim() ? customModel.trim() : selectedModel;

        try {
            const resp = await fetch('/api/llm/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: selectedProvider,
                    authType: authMode,
                    apiKey: apiKey.trim(),
                    oauthToken: oauthToken.trim(),
                    endpointUrl: endpointUrl.trim(),
                    model: currentModelId
                })
            });

            const data = await resp.json();
            if (resp.ok && data.success) {
                setTestResult({
                    success: true,
                    message: data.message || `Connection to ${providerDef.name} verified successfully!`
                });
                addToast(`${providerDef.name} connection test passed!`, 'success');
            } else {
                setTestResult({
                    success: false,
                    message: data.message || `Verification failed (${resp.status}). Check credentials.`
                });
                addToast(`Verification failed: ${data.message || 'Unknown error'}`, 'warning');
            }
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.message || 'Network error while attempting connection test.'
            });
            addToast('Connection test request failed.', 'danger');
        } finally {
            setIsTesting(false);
        }
    };

    // Save configuration
    const handleSave = () => {
        const finalModel = isCustomModelActive && customModel.trim() ? customModel.trim() : selectedModel;
        
        // Basic validation
        if (authMode === 'key' && selectedProvider !== 'ollama' && selectedProvider !== 'google' && !apiKey.trim()) {
            addToast(`Please enter an API key for ${providerDef.name}.`, 'warning');
            return;
        }

        if (authMode === 'oauth' && !oauthToken.trim()) {
            addToast(`Please connect your ${providerDef.name} subscription via OAuth first, or switch to API Key mode.`, 'warning');
            return;
        }

        const newConfig: LLMConfig = {
            provider: selectedProvider,
            authType: authMode,
            apiKey: apiKey.trim(),
            endpointUrl: endpointUrl.trim(),
            model: finalModel,
            customModel: isCustomModelActive ? customModel.trim() : '',
            oauthToken: oauthToken.trim(),
            oauthAccount,
            isVerified: testResult?.success || false,
            lastTested: new Date().toISOString()
        };

        saveLLMConfig(newConfig);
        setConfig(newConfig);
        addToast(`LLM Provider set to ${providerDef.name} (${finalModel})`, 'success');
        
        if (onSaved) {
            onSaved(newConfig);
        }
        onClose();
    };

    // Revert to system environment key (for Google)
    const handleUseSystemDefault = () => {
        setApiKey('');
        setOauthToken('');
        setOauthAccount(undefined);
        setAuthMode('key');
        setSelectedModel(providerDef.defaultModel);
        setIsCustomModelActive(false);
        setCustomModel('');
        setTestResult({
            success: true,
            message: 'Active system environment API key will be utilized automatically.'
        });
        addToast('Restored system environment key.', 'info');
    };

    return (
        <PortalModal isOpen={isOpen} onClose={onClose} modalId="llm-provider-modal">
            <div className="modal-dialog modal-dialog-centered modal-lg my-0" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px' }}>
                <div className="modal-content bg-slate-900 border border-slate-700 shadow-2xl rounded-3 text-white">
                    
                    {/* Modal Header */}
                    <div className="modal-header border-bottom border-slate-800 px-4 py-3 bg-slate-950/60">
                        <div className="d-flex align-items-center gap-2.5">
                            <div className="d-flex align-items-center justify-content-center rounded-2 p-2 bg-sky-500/10 text-primary-glow border border-sky-500/20" style={{ width: '38px', height: '38px' }}>
                                <i className="bi bi-cpu-fill fs-5"></i>
                            </div>
                            <div>
                                <h5 className="modal-title fw-bold text-white mb-0" style={{ fontSize: '1.15rem' }}>
                                    LLM Provider & Credentials
                                </h5>
                                <p className="text-white-50 small mb-0" style={{ fontSize: '0.78rem' }}>
                                    Set your AI provider, API key, or link your provider subscription via OAuth
                                </p>
                            </div>
                        </div>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close"></button>
                    </div>

                    <div className="modal-body p-3 p-md-4" style={{ maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
                        
                        {/* 1. Provider Tabs */}
                        <div className="mb-4">
                            <label className="form-label text-white-50 small font-mono text-uppercase fw-bold mb-2 d-flex align-items-center justify-content-between">
                                <span>1. Select LLM Provider</span>
                                <span className="text-white-50 font-sans" style={{ fontSize: '0.75rem' }}>5 Providers Available</span>
                            </label>

                            <div className="row g-2">
                                {(Object.keys(SUPPORTED_PROVIDERS) as LLMProviderId[]).map((provId) => {
                                    const p = SUPPORTED_PROVIDERS[provId];
                                    const isSelected = selectedProvider === provId;
                                    const isCurrentConfigured = config.provider === provId;

                                    return (
                                        <div key={provId} className="col-6 col-sm-4 col-md">
                                            <button
                                                type="button"
                                                onClick={() => handleSelectProvider(provId)}
                                                className={`btn w-100 p-2 text-start d-flex flex-column justify-content-between rounded-3 border transition-all h-100 ${
                                                    isSelected 
                                                        ? 'bg-sky-500/15 border-sky-400 text-white shadow-sm' 
                                                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover-border-primary'
                                                }`}
                                                style={{ minHeight: '68px' }}
                                            >
                                                <div className="d-flex align-items-center justify-content-between w-100 mb-1">
                                                    <i className={`bi ${p.icon} fs-5`} style={{ color: isSelected ? p.logoColor : 'inherit' }}></i>
                                                    {isCurrentConfigured && (
                                                        <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25" style={{ fontSize: '0.65rem' }}>
                                                            ACTIVE
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="fw-semibold small text-truncate w-100">{p.name}</div>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Authentication Mode: Key vs OAuth */}
                        <div className="mb-4 p-3 rounded-3 bg-slate-950/80 border border-slate-800">
                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
                                <div>
                                    <span className="text-white-50 small font-mono text-uppercase fw-bold d-block">
                                        2. Connection Method ({providerDef.name})
                                    </span>
                                    <span className="text-slate-400 small" style={{ fontSize: '0.8rem' }}>
                                        {providerDef.authDescription}
                                    </span>
                                </div>

                                <div className="btn-group btn-group-sm shrink-0" role="group">
                                    <button
                                        type="button"
                                        onClick={() => { setAuthMode('key'); setTestResult(null); }}
                                        className={`btn ${authMode === 'key' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    >
                                        <i className="bi bi-key-fill me-1"></i> API Key
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setAuthMode('oauth'); setTestResult(null); }}
                                        className={`btn ${authMode === 'oauth' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    >
                                        <i className="bi bi-shield-lock-fill me-1"></i> OAuth Subscription
                                    </button>
                                </div>
                            </div>

                            {/* Option A: API Key Mode */}
                            {authMode === 'key' && (
                                <div>
                                    {selectedProvider === 'ollama' && (
                                        <div className="mb-3">
                                            <label className="form-label text-slate-300 small fw-semibold">
                                                Ollama Server Endpoint
                                            </label>
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text bg-slate-900 border-slate-700 text-slate-400 font-mono">
                                                    <i className="bi bi-hdd-network me-1"></i> URL
                                                </span>
                                                <input
                                                    type="text"
                                                    className="form-control bg-slate-900 border-slate-700 text-white font-mono"
                                                    placeholder="http://localhost:11434"
                                                    value={endpointUrl}
                                                    onChange={(e) => setEndpointUrl(e.target.value)}
                                                />
                                            </div>
                                            <div className="form-text text-slate-400 small">
                                                Default is <code>http://localhost:11434</code>. Run <code>ollama serve</code> on your machine or connect to a remote instance.
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-2">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <label className="form-label text-slate-300 small fw-semibold mb-0">
                                                {selectedProvider === 'ollama' ? 'Optional Bearer / Auth Token' : `${providerDef.name} API Key`}
                                            </label>
                                            {selectedProvider === 'google' && systemEnvKey && (
                                                <button
                                                    type="button"
                                                    onClick={handleUseSystemDefault}
                                                    className="btn btn-link text-primary-glow p-0 text-decoration-none small"
                                                    style={{ fontSize: '0.75rem' }}
                                                >
                                                    <i className="bi bi-arrow-counterclockwise me-1"></i> Use System Environment Key
                                                </button>
                                            )}
                                        </div>

                                        <div className="input-group">
                                            <input
                                                type={showKey ? 'text' : 'password'}
                                                className="form-control bg-slate-900 border-slate-700 text-white font-mono text-sm"
                                                placeholder={providerDef.keyPlaceholder}
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary border-slate-700 text-slate-300"
                                                onClick={() => setShowKey(!showKey)}
                                                title={showKey ? 'Hide key' : 'Show key'}
                                            >
                                                <i className={`bi ${showKey ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                                            </button>
                                        </div>

                                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-1 mt-1.5">
                                            <span className="text-white-50 small" style={{ fontSize: '0.75rem' }}>
                                                {providerDef.keyPrefixHelp}
                                            </span>
                                            <a
                                                href={providerDef.keyHelpUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary-glow small text-decoration-none d-inline-flex align-items-center"
                                                style={{ fontSize: '0.78rem' }}
                                            >
                                                <span>{providerDef.keyHelpLabel}</span>
                                                <i className="bi bi-box-arrow-up-right ms-1" style={{ fontSize: '0.7rem' }}></i>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Option B: OAuth Subscription Mode */}
                            {authMode === 'oauth' && (
                                <div className="p-3 rounded-2 bg-slate-900/90 border border-slate-800">
                                    <div className="d-flex items-start gap-3">
                                        <div className="rounded-circle p-2 bg-sky-500/10 text-primary-glow shrink-0">
                                            <i className="bi bi-patch-check-fill fs-4"></i>
                                        </div>
                                        <div className="flex-grow-1">
                                            <h6 className="fw-bold text-white mb-1">
                                                {providerDef.oauthProviderName}
                                            </h6>
                                            <p className="text-slate-400 small mb-3 leading-relaxed">
                                                {providerDef.oauthScopeDesc} Connect your existing plan without copying or exposing secret keys.
                                            </p>

                                            {oauthToken ? (
                                                <div className="p-2.5 rounded-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 small mb-3">
                                                    <div className="d-flex align-items-center justify-content-between">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <i className="bi bi-check-circle-fill text-emerald-400"></i>
                                                            <div>
                                                                <span className="fw-bold d-block text-white">Subscription Active & Verified</span>
                                                                <span className="text-emerald-400 font-mono text-xs">
                                                                    {oauthAccount?.name || 'Authorized Account'} ({oauthAccount?.tier || 'Pro Plan'})
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleDisconnectOAuth}
                                                            className="btn btn-sm btn-outline-danger py-0 px-2"
                                                            style={{ fontSize: '0.72rem' }}
                                                        >
                                                            Disconnect
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="d-flex flex-wrap align-items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleInitiateOAuth}
                                                        disabled={isOAuthConnecting}
                                                        className="btn btn-primary d-inline-flex align-items-center gap-2"
                                                    >
                                                        {isOAuthConnecting ? (
                                                            <>
                                                                <span className="spinner-border spinner-border-sm" role="status"></span>
                                                                <span>Authorizing via popup...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="bi bi-box-arrow-in-up-right"></i>
                                                                <span>Connect with {providerDef.name} Subscription</span>
                                                            </>
                                                        )}
                                                    </button>
                                                    <span className="text-white-50 small" style={{ fontSize: '0.75rem' }}>
                                                        Opens provider authorization popup window
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. Model Selection */}
                        <div className="mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <label className="form-label text-white-50 small font-mono text-uppercase fw-bold mb-0">
                                    3. Select LLM Model
                                </label>
                                <div className="form-check form-switch mb-0">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="customModelToggle"
                                        checked={isCustomModelActive}
                                        onChange={(e) => setIsCustomModelActive(e.target.checked)}
                                    />
                                    <label className="form-check-label text-white-50 small" htmlFor="customModelToggle">
                                        Custom Model ID
                                    </label>
                                </div>
                            </div>

                            {isCustomModelActive ? (
                                <div className="mb-2">
                                    <input
                                        type="text"
                                        className="form-control bg-slate-950 border-slate-700 text-white font-mono text-sm"
                                        placeholder={`Enter custom ${providerDef.name} model ID (e.g. ${providerDef.defaultModel})`}
                                        value={customModel}
                                        onChange={(e) => setCustomModel(e.target.value)}
                                    />
                                    <div className="form-text text-slate-400 small">
                                        Provide any custom or fine-tuned model identifier available under your account.
                                    </div>
                                </div>
                            ) : (
                                <div className="row g-2">
                                    {providerDef.models.map((m) => {
                                        const isModelSelected = selectedModel === m.id;
                                        return (
                                            <div key={m.id} className="col-12 col-md-6">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedModel(m.id)}
                                                    className={`btn w-100 p-2.5 text-start rounded-3 border transition-all h-100 d-flex flex-column justify-content-between ${
                                                        isModelSelected
                                                            ? 'bg-sky-500/15 border-sky-400 text-white shadow-sm'
                                                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover-border-primary'
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                                            <span className="fw-bold small text-white">{m.name}</span>
                                                            {m.badge && (
                                                                <span className="badge bg-secondary bg-opacity-25 text-white-50 border border-secondary border-opacity-25" style={{ fontSize: '0.65rem' }}>
                                                                    {m.badge}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-slate-400 small mb-2" style={{ fontSize: '0.78rem', lineHeight: '1.3' }}>
                                                            {m.description}
                                                        </p>
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-center w-100 font-mono text-white-50" style={{ fontSize: '0.7rem' }}>
                                                        <span><code>{m.id}</code></span>
                                                        {m.contextWindow && <span>{m.contextWindow}</span>}
                                                    </div>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Test Result Message Box */}
                        {testResult && (
                            <div className={`p-3 rounded-2 mb-3 border ${
                                testResult.success 
                                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                            }`}>
                                <div className="d-flex align-items-start gap-2">
                                    <i className={`bi ${testResult.success ? 'bi-check-circle-fill text-emerald-400' : 'bi-exclamation-triangle-fill text-rose-400'} fs-5 shrink-0`}></i>
                                    <div className="small">
                                        <div className="fw-bold">{testResult.success ? 'Connection Verified' : 'Connection Error'}</div>
                                        <div className="text-white-50">{testResult.message}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Modal Footer Actions */}
                    <div className="modal-footer border-top border-slate-800 px-4 py-3 bg-slate-950/80 d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            className="btn btn-outline-secondary text-light d-inline-flex align-items-center gap-2"
                        >
                            {isTesting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" role="status"></span>
                                    <span>Verifying API...</span>
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-patch-check"></i>
                                    <span>Test Connection</span>
                                </>
                            )}
                        </button>

                        <div className="d-flex align-items-center gap-2 ms-auto">
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary px-3 d-inline-flex align-items-center gap-1.5"
                                onClick={handleSave}
                            >
                                <i className="bi bi-check2-circle"></i>
                                <span>Save & Apply</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </PortalModal>
    );
};
