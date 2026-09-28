// LLM Provider Configuration & Management Service for Project Hypatia

export type LLMProviderId = 'google' | 'openai' | 'anthropic' | 'ollama' | 'openrouter';

export type AuthMode = 'key' | 'oauth';

export interface ProviderModelInfo {
    id: string;
    name: string;
    description: string;
    badge?: string;
    contextWindow?: string;
}

export interface ProviderDefinition {
    id: LLMProviderId;
    name: string;
    company: string;
    icon: string;
    logoColor: string;
    authDescription: string;
    keyPlaceholder: string;
    keyPrefixHelp?: string;
    keyHelpUrl: string;
    keyHelpLabel: string;
    oauthSupported: boolean;
    oauthProviderName: string;
    oauthScopeDesc: string;
    defaultModel: string;
    models: ProviderModelInfo[];
    supportsCustomModel: boolean;
    defaultEndpoint?: string;
}

export const SUPPORTED_PROVIDERS: Record<LLMProviderId, ProviderDefinition> = {
    google: {
        id: 'google',
        name: 'Google Gemini',
        company: 'Google',
        icon: 'bi-google',
        logoColor: '#4285F4',
        authDescription: 'Connect via Google AI Studio API key or your Google Cloud / Vertex AI subscription.',
        keyPlaceholder: 'AIzaSy...',
        keyPrefixHelp: 'Keys usually start with AIzaSy...',
        keyHelpUrl: 'https://aistudio.google.com/app/apikey',
        keyHelpLabel: 'Get free Gemini API Key from Google AI Studio',
        oauthSupported: true,
        oauthProviderName: 'Google Cloud / AI Studio Subscription',
        oauthScopeDesc: 'Authenticate using your Google account to access your subscribed Gemini quota.',
        defaultModel: 'gemini-3.8-flash',
        supportsCustomModel: true,
        models: [
            { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', description: 'Recommended: Latest generation high-speed multimodal reasoning engine.', badge: 'Latest & Recommended', contextWindow: '1M tokens' },
            { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'High-speed stable model for hypothesis generation and simulation.', badge: 'Fast & Stable', contextWindow: '1M tokens' },
            { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', description: 'Ultra-lightweight low-latency model for pre-summarization and quick filtering.', badge: 'Lightweight', contextWindow: '1M tokens' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Deep analytical reasoning for statistical rigor and mathematical synthesis.', badge: 'Complex Logic', contextWindow: '2M tokens' },
        ]
    },
    openai: {
        id: 'openai',
        name: 'OpenAI',
        company: 'OpenAI',
        icon: 'bi-cpu-fill',
        logoColor: '#10A37F',
        authDescription: 'Connect via OpenAI API key or sign in with your ChatGPT Plus / Team / Enterprise subscription.',
        keyPlaceholder: 'sk-proj-... or sk-...',
        keyPrefixHelp: 'Keys typically start with sk-... or sk-proj-...',
        keyHelpUrl: 'https://platform.openai.com/api-keys',
        keyHelpLabel: 'Get API Key from OpenAI Platform',
        oauthSupported: true,
        oauthProviderName: 'OpenAI / ChatGPT Subscription',
        oauthScopeDesc: 'Authenticate via OpenAI Single Sign-On (SSO) or OAuth subscription authorization.',
        defaultModel: 'gpt-4o',
        supportsCustomModel: true,
        models: [
            { id: 'gpt-4o', name: 'GPT-4o (Omni)', description: 'Flagship model for high-speed scientific reasoning and data parsing.', badge: 'Flagship', contextWindow: '128k tokens' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Affordable, fast intelligence for routine academic summaries.', badge: 'Fast', contextWindow: '128k tokens' },
            { id: 'o1', name: 'o1 Reasoning', description: 'Deep deliberate reasoning for complex mathematical and STEM hypotheses.', badge: 'Deep Reasoning', contextWindow: '200k tokens' },
            { id: 'o3-mini', name: 'o3-mini', description: 'Next-generation low-latency reasoning model for STEM synthesis.', badge: 'STEM Reasoning', contextWindow: '200k tokens' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High-reliability previous flagship with comprehensive knowledge cutoff.', badge: 'Stable', contextWindow: '128k tokens' },
        ]
    },
    anthropic: {
        id: 'anthropic',
        name: 'Anthropic Claude',
        company: 'Anthropic',
        icon: 'bi-asterisk',
        logoColor: '#D97706',
        authDescription: 'Connect via Anthropic Console API key or Claude Pro / Team subscription OAuth.',
        keyPlaceholder: 'sk-ant-api03-...',
        keyPrefixHelp: 'Keys typically start with sk-ant-...',
        keyHelpUrl: 'https://console.anthropic.com/settings/keys',
        keyHelpLabel: 'Get API Key from Anthropic Console',
        oauthSupported: true,
        oauthProviderName: 'Anthropic Claude Subscription',
        oauthScopeDesc: 'Authenticate via Anthropic OAuth authorization to link your Claude Pro / Team subscription.',
        defaultModel: 'claude-3-7-sonnet-20250219',
        supportsCustomModel: true,
        models: [
            { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', description: 'Hybrid reasoning and leading coding / scientific analysis capabilities.', badge: 'Latest', contextWindow: '200k tokens' },
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Exceptional academic writing, code simulation, and data analysis.', badge: 'Highly Rated', contextWindow: '200k tokens' },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Near instantaneous response time for quick iterations and filtering.', badge: 'High Speed', contextWindow: '200k tokens' },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Deep contextual understanding for exhaustive literature synthesis.', badge: 'Deep Context', contextWindow: '200k tokens' },
        ]
    },
    ollama: {
        id: 'ollama',
        name: 'Ollama (Local / Self-Hosted)',
        company: 'Ollama Community',
        icon: 'bi-hdd-network',
        logoColor: '#A855F7',
        authDescription: 'Run open-weight models locally on your hardware or connect to a private enterprise Ollama server.',
        keyPlaceholder: 'Bearer token or API password (optional)',
        keyPrefixHelp: 'Leave blank for standard local instances (http://localhost:11434)',
        keyHelpUrl: 'https://ollama.com/library',
        keyHelpLabel: 'Browse Ollama Model Library',
        oauthSupported: true,
        oauthProviderName: 'Enterprise SSO / Ollama Gateway',
        oauthScopeDesc: 'Authenticate against self-hosted OAuth gateways, reverse proxies, or cloud-hosted Ollama hubs.',
        defaultModel: 'llama3.3:latest',
        defaultEndpoint: 'http://localhost:11434',
        supportsCustomModel: true,
        models: [
            { id: 'llama3.3:latest', name: 'Llama 3.3 (70B)', description: 'State-of-the-art open research model matching GPT-4 class capabilities.', badge: 'Open Flagship', contextWindow: '128k tokens' },
            { id: 'llama3.1:8b', name: 'Llama 3.1 (8B)', description: 'Fast, lightweight local execution requiring minimal VRAM (8GB).', badge: 'Lightweight', contextWindow: '128k tokens' },
            { id: 'mistral:latest', name: 'Mistral (7B)', description: 'Efficient foundational model for quick summarization and data parsing.', badge: 'Efficient', contextWindow: '32k tokens' },
            { id: 'deepseek-r1:latest', name: 'DeepSeek R1', description: 'Open weights reasoning model specializing in scientific math and logic.', badge: 'Reasoning', contextWindow: '64k tokens' },
            { id: 'qwen2.5:72b', name: 'Qwen 2.5 (72B)', description: 'Strong multilingual and technical coding benchmarks.', badge: 'Math & Code', contextWindow: '128k tokens' },
        ]
    },
    openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        company: 'OpenRouter',
        icon: 'bi-diagram-3-fill',
        logoColor: '#EC4899',
        authDescription: 'Single gateway to route across 200+ models with one unified key or OpenRouter OAuth account.',
        keyPlaceholder: 'sk-or-v1-...',
        keyPrefixHelp: 'Keys start with sk-or-...',
        keyHelpUrl: 'https://openrouter.ai/keys',
        keyHelpLabel: 'Create Key at OpenRouter.ai',
        oauthSupported: true,
        oauthProviderName: 'OpenRouter Account OAuth (PKCE)',
        oauthScopeDesc: 'Authenticate with your OpenRouter balance and account subscription directly.',
        defaultModel: 'google/gemini-2.5-flash',
        supportsCustomModel: true,
        models: [
            { id: 'google/gemini-2.5-flash', name: 'Google: Gemini 2.5 Flash', description: 'High-throughput access to Gemini via OpenRouter credits.', badge: 'Popular', contextWindow: '1M tokens' },
            { id: 'anthropic/claude-3.5-sonnet', name: 'Anthropic: Claude 3.5 Sonnet', description: 'Top-tier code and scientific drafting routed through OpenRouter.', badge: 'Recommended', contextWindow: '200k tokens' },
            { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o', description: 'Direct access to GPT-4o multimodal model.', badge: 'Omni', contextWindow: '128k tokens' },
            { id: 'deepseek/deepseek-chat', name: 'DeepSeek: DeepSeek V3', description: 'Extremely cost-effective, high intelligence general model.', badge: 'Ultra Value', contextWindow: '64k tokens' },
            { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta: Llama 3.3 70B Instruct', description: 'Open-weights flagship hosted on high-speed inference clusters.', badge: 'Open Weights', contextWindow: '128k tokens' },
        ]
    }
};

export interface LLMConfig {
    provider: LLMProviderId;
    authType: AuthMode;
    apiKey: string;
    endpointUrl?: string; // For Ollama or custom proxies
    model: string;
    customModel?: string;
    oauthToken?: string;
    oauthAccount?: {
        name?: string;
        email?: string;
        tier?: string;
        connectedAt?: string;
    };
    lastTested?: string;
    isVerified?: boolean;
}

const STORAGE_KEY = 'hypatia-llm-config';
const LEGACY_GEMINI_KEY = 'hmap-gemini-api-key';

export const getDefaultLLMConfig = (): LLMConfig => {
    // Check if user previously saved a custom Gemini key in legacy storage
    const legacyKey = typeof window !== 'undefined' ? localStorage.getItem(LEGACY_GEMINI_KEY) : '';
    
    return {
        provider: 'google',
        authType: 'key',
        apiKey: legacyKey || '',
        model: 'gemini-3.8-flash',
        customModel: '',
        endpointUrl: '',
        isVerified: !!legacyKey,
    };
};

export const getStoredLLMConfig = (): LLMConfig => {
    if (typeof window === 'undefined') return getDefaultLLMConfig();
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            // Sanitize provider
            if (parsed.provider && SUPPORTED_PROVIDERS[parsed.provider as LLMProviderId]) {
                return {
                    ...getDefaultLLMConfig(),
                    ...parsed,
                };
            }
        }
    } catch (e) {
        console.warn('Failed to parse stored LLM config:', e);
    }
    return getDefaultLLMConfig();
};

export const saveLLMConfig = (config: LLMConfig): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        
        // Keep legacy key in sync if Google provider is active
        if (config.provider === 'google' && config.apiKey) {
            localStorage.setItem(LEGACY_GEMINI_KEY, config.apiKey.trim());
        } else if (config.provider !== 'google') {
            // Do not delete legacy key so user doesn't lose it if they switch back
        }
        
        // Dispatch storage event so all components react immediately
        window.dispatchEvent(new CustomEvent('hypatia-llm-config-updated', { detail: config }));
    } catch (e) {
        console.error('Failed to save LLM config:', e);
    }
};

export const clearCustomLLMConfig = (): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_GEMINI_KEY);
        window.dispatchEvent(new CustomEvent('hypatia-llm-config-updated', { detail: getDefaultLLMConfig() }));
    } catch (e) {
        console.error('Failed to clear LLM config:', e);
    }
};
