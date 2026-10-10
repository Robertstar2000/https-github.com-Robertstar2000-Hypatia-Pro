export type LLMProviderId = 'google' | 'openai' | 'anthropic' | 'grok' | 'ollama' | 'openrouter';

export type AuthMode = 'key' | 'oauth';

export const MODEL_CAPABILITY_NOTICE = "The chosen LLM model must possess high-level reasoning capabilities, deep scientific and technical domain knowledge, and be able to generate images, figures, tabular datasets, and technical drawings for the 10-phase discovery protocol.";

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
            { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', description: 'Deep analytical reasoning for statistical rigor, mathematical synthesis, and technical diagrams.', badge: 'Complex STEM', contextWindow: '2M tokens' },
            { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', description: 'Ultra-lightweight low-latency model for pre-summarization, quick filtering, and tabular audits.', badge: 'Lightweight', contextWindow: '1M tokens' },
            { id: 'gemini-3-pro-image', name: 'Gemini 3 Pro Image', description: 'Multimodal generation for scientific figures, technical drawings, laboratory schematics, and plots.', badge: 'Figures & Images', contextWindow: '64k tokens' },
        ]
    },
    grok: {
        id: 'grok',
        name: 'xAI Grok',
        company: 'xAI',
        icon: 'bi-rocket-takeoff-fill',
        logoColor: '#F59E0B',
        authDescription: 'Connect via xAI API key or sign in with your X Premium / SuperGrok subscription.',
        keyPlaceholder: 'xai-...',
        keyPrefixHelp: 'Keys typically start with xai-...',
        keyHelpUrl: 'https://console.x.ai/',
        keyHelpLabel: 'Get API Key from xAI Console',
        oauthSupported: true,
        oauthProviderName: 'xAI / SuperGrok Subscription',
        oauthScopeDesc: 'Authenticate via xAI Single Sign-On (SSO) to connect your Grok plan.',
        defaultModel: 'grok-3',
        supportsCustomModel: true,
        models: [
            { id: 'grok-3', name: 'Grok 3', description: 'Flagship reasoning model with frontier STEM logic, mathematical proofs, and scientific code synthesis.', badge: 'Flagship Reasoning', contextWindow: '128k tokens' },
            { id: 'grok-3-mini', name: 'Grok 3 Mini', description: 'High-speed reasoning model with deep mathematical and scientific thinking for rapid iterations.', badge: 'Fast STEM', contextWindow: '128k tokens' },
            { id: 'grok-2-vision-1212', name: 'Grok 2 Vision', description: 'Multimodal scientific reasoning supporting technical diagrams, figures, charts, and visual tables.', badge: 'Multimodal & Vision', contextWindow: '32k tokens' },
            { id: 'grok-2-1212', name: 'Grok 2', description: 'Advanced language model with strong technical comprehension and manuscript drafting.', badge: 'Comprehensive', contextWindow: '128k tokens' },
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
            { id: 'gpt-4o', name: 'GPT-4o (Omni)', description: 'Flagship multimodal model for high-speed scientific reasoning, figure analysis, and tables.', badge: 'Flagship Omni', contextWindow: '128k tokens' },
            { id: 'o3-mini', name: 'o3-mini', description: 'Latest reasoning model specializing in STEM synthesis, coding, and mathematical logic.', badge: 'STEM Reasoning', contextWindow: '200k tokens' },
            { id: 'o1', name: 'o1 Reasoning', description: 'Deep deliberate reasoning for complex mathematical, biochemical, and STEM hypotheses.', badge: 'Deep Reasoning', contextWindow: '200k tokens' },
            { id: 'gpt-4.5-preview', name: 'GPT-4.5 Preview', description: 'Broad world knowledge and deep technical nuance for manuscript synthesis.', badge: 'Frontier Knowledge', contextWindow: '128k tokens' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Affordable, fast intelligence for routine academic summaries and tabular parsing.', badge: 'Fast', contextWindow: '128k tokens' },
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
            { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', description: 'Hybrid reasoning and leading coding, scientific analysis, and technical visualization capabilities.', badge: 'Latest Hybrid', contextWindow: '200k tokens' },
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Exceptional academic writing, code simulation, and rigorous data analysis.', badge: 'Highly Rated', contextWindow: '200k tokens' },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Near instantaneous response time for quick iterations, tabular QA, and filtering.', badge: 'High Speed', contextWindow: '200k tokens' },
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
        defaultModel: 'deepseek-r1:latest',
        defaultEndpoint: 'http://localhost:11434',
        supportsCustomModel: true,
        models: [
            { id: 'deepseek-r1:latest', name: 'DeepSeek R1', description: 'Open weights reasoning model specializing in scientific math, algorithmic logic, and proofs.', badge: 'Open Reasoning', contextWindow: '64k tokens' },
            { id: 'llama3.3:latest', name: 'Llama 3.3 (70B)', description: 'State-of-the-art open research model matching GPT-4 class capabilities for academic drafting.', badge: 'Open Flagship', contextWindow: '128k tokens' },
            { id: 'qwen2.5:72b', name: 'Qwen 2.5 (72B)', description: 'Exceptional multilingual, technical coding, and mathematical benchmark performance.', badge: 'Math & Code', contextWindow: '128k tokens' },
            { id: 'phi-4:latest', name: 'Phi-4 (14B)', description: 'Compact Microsoft model with synthetic-data trained reasoning for scientific logic.', badge: 'Compact STEM', contextWindow: '16k tokens' },
            { id: 'llama3.1:8b', name: 'Llama 3.1 (8B)', description: 'Fast, lightweight local execution requiring minimal VRAM (8GB).', badge: 'Lightweight', contextWindow: '128k tokens' },
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
        defaultModel: 'anthropic/claude-3.7-sonnet',
        supportsCustomModel: true,
        models: [
            { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', description: 'Leading hybrid reasoning and scientific analysis routed through OpenRouter.', badge: 'Top Recommended', contextWindow: '200k tokens' },
            { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', description: 'Leading open-weights reasoning model for complex STEM calculations and proofs.', badge: 'STEM Reasoning', contextWindow: '64k tokens' },
            { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o', description: 'Direct access to GPT-4o multimodal model for figures, tables, and drafting.', badge: 'Omni', contextWindow: '128k tokens' },
            { id: 'x-ai/grok-2-1212', name: 'xAI: Grok 2', description: 'xAI Grok routed with deep reasoning and technical problem solving.', badge: 'Grok Reasoning', contextWindow: '128k tokens' },
            { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', description: 'Extremely cost-effective frontier model with high intelligence and broad knowledge.', badge: 'Ultra Value', contextWindow: '64k tokens' },
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
        const legacyKey = localStorage.getItem(LEGACY_GEMINI_KEY);
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            // Sanitize provider
            if (parsed.provider && SUPPORTED_PROVIDERS[parsed.provider as LLMProviderId]) {
                const conf: LLMConfig = {
                    ...getDefaultLLMConfig(),
                    ...parsed,
                };
                if (conf.provider === 'google' && !conf.apiKey && legacyKey) {
                    conf.apiKey = legacyKey;
                    conf.isVerified = true;
                }
                return conf;
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
