export type LLMProviderId = 'google' | 'openai' | 'anthropic' | 'grok' | 'deepseek' | 'ollama' | 'openrouter';

export type AuthMode = 'key' | 'oauth';

export const MODEL_CAPABILITY_NOTICE = "The chosen LLM model needs to have high-level reasoning, scientific and technical knowledge and be able to generate images, figures, tables and drawings.";

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
        company: 'Google DeepMind',
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
        defaultModel: 'gemini-2.5-pro',
        supportsCustomModel: true,
        models: [
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Google flagship reasoning model for deep analytical synthesis, complex STEM logic, and multimodal diagrams.', badge: 'Flagship Reasoning', contextWindow: '2M tokens' },
            { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', description: 'High-throughput frontier engine with low latency for fast hypothesis formulation and rapid extraction.', badge: 'Frontier Flash', contextWindow: '1M tokens' },
            { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Preview)', description: 'Google next-generation frontier reasoning model with advanced analytical synthesis and STEM problem solving.', badge: 'Frontier Reasoning', contextWindow: '2M tokens' },
            { id: 'gemini-4-argon', name: 'Gemini 4 Argon', description: 'Google DeepMind frontier flagship model for complex reasoning, autonomous engineering, and enterprise scientific research with 1M token output limit.', badge: 'Frontier Flagship', contextWindow: '2M tokens' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Google flagship reasoning model for deep analytical synthesis, complex STEM logic, and multimodal diagrams.', badge: 'Flagship Reasoning', contextWindow: '2M tokens' },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'High-speed multimodal reasoning engine with built-in thinking capabilities for rapid extraction.', badge: 'Fast & Multimodal', contextWindow: '1M tokens' },
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Ultra-low latency multimodal engine for real-time hypothesis checks and high-volume filtering.', badge: 'Low Latency', contextWindow: '1M tokens' },
            { id: 'gemini-2.0-flash-thinking-exp', name: 'Gemini 2.0 Flash Thinking', description: 'Specialized step-by-step chain-of-thought reasoning for mathematical verification and STEM proofs.', badge: 'STEM Thinking', contextWindow: '1M tokens' },
            { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', description: 'State-of-the-art multimodal generation for scientific figures, technical drawings, and plots.', badge: 'Figures & Images', contextWindow: '64k tokens' },
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
        defaultModel: 'gpt-6-astra',
        supportsCustomModel: true,
        models: [
            { id: 'gpt-6-astra', name: 'GPT-6 Astra', description: 'OpenAI most capable frontier model for demanding research, complex reasoning, autonomous agents, and multi-file code.', badge: 'GPT-6 Flagship', contextWindow: '256k tokens' },
            { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol', description: 'Frontier intelligence with near-Astra capabilities and high cost efficiency for complex synthesis and scientific workflows.', badge: 'Frontier Sol', contextWindow: '200k tokens' },
            { id: 'gpt-6-luna', name: 'GPT-6 Luna', description: 'Ultra-fast frontier model for high-volume automated pipeline tasks, extraction, and hypothesis verification.', badge: 'Frontier Luna', contextWindow: '128k tokens' },
            { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', description: 'Advanced frontier model specialized for technical knowledge work, data analysis, and rigorous verification.', badge: 'Frontier Terra', contextWindow: '200k tokens' },
            { id: 'o3', name: 'OpenAI o3', description: 'Frontier reasoning model excelling in coding, math, science, and visual perception with autonomous tool integration.', badge: 'Frontier STEM', contextWindow: '200k tokens' },
            { id: 'o3-mini', name: 'o3-mini', description: 'Latest reasoning model specializing in STEM synthesis, coding, and mathematical logic with adjustable effort.', badge: 'STEM Reasoning', contextWindow: '200k tokens' },
            { id: 'o1', name: 'o1 Reasoning', description: 'Deep deliberate reasoning for complex mathematical, biochemical, and STEM hypotheses.', badge: 'Deep Reasoning', contextWindow: '200k tokens' },
            { id: 'gpt-4.5-preview', name: 'GPT-4.5 Preview', description: 'Broad world knowledge and deep technical nuance for manuscript synthesis.', badge: 'Frontier Knowledge', contextWindow: '128k tokens' },
            { id: 'gpt-4o', name: 'GPT-4o (Omni)', description: 'Flagship multimodal model for high-speed scientific reasoning, figure analysis, and tables.', badge: 'Flagship Omni', contextWindow: '128k tokens' },
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
        defaultModel: 'claude-opus-5-5',
        supportsCustomModel: true,
        models: [
            { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', description: 'Anthropic flagship frontier model leading global benchmarks in coding, reasoning, and long-horizon research agents.', badge: 'Opus 5.5 Flagship', contextWindow: '200k tokens' },
            { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', description: 'Frontier intelligence and speed for automated scientific discovery workflows, document processing, and coding.', badge: 'Sonnet 5.5', contextWindow: '200k tokens' },
            { id: 'claude-fable-5-1', name: 'Claude Fable 5.1', description: 'Mythos-class frontier reasoning model designed for demanding scientific research and multi-step inquiry.', badge: 'Mythos Frontier', contextWindow: '200k tokens' },
            { id: 'claude-opus-4', name: 'Claude Opus 4', description: 'Frontier depth and rigorous academic analysis for advanced research hypotheses.', badge: 'Opus 4', contextWindow: '200k tokens' },
            { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Next-generation balanced reasoning, code generation, and technical diagram synthesis.', badge: 'Sonnet 4', contextWindow: '200k tokens' },
            { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', description: 'Hybrid reasoning and leading coding, scientific analysis, and technical visualization capabilities.', badge: 'Hybrid Reasoning', contextWindow: '200k tokens' },
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Exceptional academic writing, code simulation, and rigorous data analysis.', badge: 'Highly Rated', contextWindow: '200k tokens' },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Near instantaneous response time for quick iterations, tabular QA, and filtering.', badge: 'High Speed', contextWindow: '200k tokens' },
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
        defaultModel: 'grok-4-6',
        supportsCustomModel: true,
        models: [
            { id: 'grok-4-6', name: 'Grok 4.6', description: 'xAI latest flagship frontier model with native tool use, real-time search integration, and multi-step scientific problem solving.', badge: 'Grok 4.6 Flagship', contextWindow: '256k tokens' },
            { id: 'grok-4', name: 'Grok 4', description: 'Next-generation frontier reasoning and technical code execution with high context capacity.', badge: 'Grok 4 Frontier', contextWindow: '256k tokens' },
            { id: 'grok-3', name: 'Grok 3', description: 'Flagship reasoning model with frontier STEM logic, mathematical proofs, and scientific code synthesis.', badge: 'Flagship Reasoning', contextWindow: '131k tokens' },
            { id: 'grok-3-mini', name: 'Grok 3 Mini', description: 'High-speed reasoning model with deep mathematical and scientific thinking for rapid iterations.', badge: 'Fast STEM', contextWindow: '131k tokens' },
            { id: 'grok-2-1212', name: 'Grok 2 (1212)', description: 'Advanced frontier language model with strong technical comprehension and manuscript drafting.', badge: 'Comprehensive', contextWindow: '131k tokens' },
            { id: 'grok-2-vision-1212', name: 'Grok 2 Vision', description: 'Multimodal scientific reasoning supporting technical diagrams, figures, charts, and visual tables.', badge: 'Multimodal & Vision', contextWindow: '32k tokens' },
            { id: 'grok-beta', name: 'Grok Beta', description: 'Experimental reasoning model with extended context and autonomous tool support.', badge: 'Beta Frontier', contextWindow: '128k tokens' },
        ]
    },
    deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        company: 'DeepSeek AI',
        icon: 'bi-compass-fill',
        logoColor: '#2563EB',
        authDescription: 'Connect via DeepSeek Platform API key (https://platform.deepseek.com) with native high-speed OpenAI-compatible endpoints.',
        keyPlaceholder: 'sk-...',
        keyPrefixHelp: 'DeepSeek API keys start with sk-...',
        keyHelpUrl: 'https://platform.deepseek.com/api_keys',
        keyHelpLabel: 'Get API Key from DeepSeek Platform',
        oauthSupported: true,
        oauthProviderName: 'DeepSeek Platform Subscription',
        oauthScopeDesc: 'Authenticate using your DeepSeek account or enterprise quota.',
        defaultModel: 'deepseek-reasoner',
        supportsCustomModel: true,
        models: [
            { id: 'deepseek-reasoner', name: 'DeepSeek R1', description: 'Flagship 671B MoE reasoning model specializing in scientific math, algorithmic proofs, and deep STEM logic.', badge: 'R1 Reasoning', contextWindow: '64k tokens' },
            { id: 'deepseek-chat', name: 'DeepSeek V3', description: 'Enhanced general-purpose frontier model surpassing standard benchmarks in mathematics and coding at low cost.', badge: 'V3 Flagship', contextWindow: '64k tokens' },
            { id: 'deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', description: 'Asymmetric architecture offering fast inference, high throughput, and native visual understanding.', badge: 'V4.1 Flash', contextWindow: '128k tokens' },
            { id: 'deepseek-v4', name: 'DeepSeek V4', description: 'Multimodal frontier model capable of visual understanding, video, and comprehensive manuscript synthesis.', badge: 'V4 Multimodal', contextWindow: '128k tokens' },
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
            { id: 'deepseek-r1:latest', name: 'DeepSeek R1', description: '671B MoE open weights reasoning model for scientific math, algorithmic logic, and proofs.', badge: 'Open Reasoning', contextWindow: '64k tokens' },
            { id: 'deepseek-v4.1-flash:latest', name: 'DeepSeek V4.1 Flash', description: 'Fast inference open multimodal model with visual comprehension.', badge: 'Open Flash', contextWindow: '128k tokens' },
            { id: 'llama3.3:latest', name: 'Llama 3.3 (70B)', description: 'State-of-the-art open research model matching GPT-4 class capabilities for academic drafting.', badge: 'Open Flagship', contextWindow: '128k tokens' },
            { id: 'qwen2.5:72b', name: 'Qwen 2.5 (72B)', description: 'Exceptional multilingual, technical coding, and mathematical benchmark performance.', badge: 'Math & Code', contextWindow: '128k tokens' },
            { id: 'qwen2.5-coder:32b', name: 'Qwen 2.5 Coder (32B)', description: 'Leading open-weights code generation and computational simulation engine.', badge: 'Technical Code', contextWindow: '128k tokens' },
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
        defaultModel: 'openai/gpt-6-astra',
        supportsCustomModel: true,
        models: [
            { id: 'openai/gpt-6-astra', name: 'OpenAI: GPT-6 Astra', description: 'OpenAI flagship frontier model for demanding research, complex reasoning, and autonomous agents.', badge: 'GPT-6 Flagship', contextWindow: '256k tokens' },
            { id: 'anthropic/claude-opus-5.5', name: 'Anthropic: Claude Opus 5.5', description: 'Leading global frontier model for coding, reasoning, and long-horizon research agents.', badge: 'Opus 5.5', contextWindow: '200k tokens' },
            { id: 'anthropic/claude-sonnet-5.5', name: 'Anthropic: Claude Sonnet 5.5', description: 'Frontier intelligence and speed for automated scientific discovery workflows.', badge: 'Sonnet 5.5', contextWindow: '200k tokens' },
            { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', description: 'Leading hybrid reasoning and scientific analysis routed through OpenRouter.', badge: 'Top Recommended', contextWindow: '200k tokens' },
            { id: 'google/gemini-4-argon', name: 'Google: Gemini 4 Argon', description: 'Google DeepMind frontier model with 1M output tokens for software engineering and research.', badge: 'Gemini 4 Argon', contextWindow: '2M tokens' },
            { id: 'google/gemini-2.5-pro', name: 'Google: Gemini 2.5 Pro', description: 'Google latest flagship reasoning engine routed via OpenRouter.', badge: 'Gemini 2.5 Pro', contextWindow: '2M tokens' },
            { id: 'google/gemini-2.5-flash', name: 'Google: Gemini 2.5 Flash', description: 'Google latest high-speed multimodal reasoning model.', badge: 'Gemini 2.5 Flash', contextWindow: '1M tokens' },
            { id: 'x-ai/grok-4', name: 'xAI: Grok 4', description: 'xAI next-generation frontier reasoning model routed via OpenRouter.', badge: 'Grok 4', contextWindow: '256k tokens' },
            { id: 'x-ai/grok-3', name: 'xAI: Grok 3', description: 'xAI flagship reasoning model with frontier STEM logic routed via OpenRouter.', badge: 'Grok 3 Reasoning', contextWindow: '131k tokens' },
            { id: 'deepseek/deepseek-v4.1-flash', name: 'DeepSeek: V4.1 Flash', description: 'DeepSeek latest asymmetric architecture for fast multimodal reasoning.', badge: 'DeepSeek V4.1', contextWindow: '128k tokens' },
            { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', description: 'Leading open-weights reasoning model for complex STEM calculations and proofs.', badge: 'STEM Reasoning', contextWindow: '64k tokens' },
            { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', description: 'Extremely cost-effective frontier model with high intelligence and broad knowledge.', badge: 'Ultra Value', contextWindow: '64k tokens' },
            { id: 'openai/o3-mini', name: 'OpenAI: o3-mini', description: 'Frontier STEM reasoning with low latency routed via OpenRouter.', badge: 'STEM Reasoning', contextWindow: '200k tokens' },
            { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o', description: 'Direct access to GPT-4o multimodal model for figures, tables, and drafting.', badge: 'Omni', contextWindow: '128k tokens' },
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
        model: 'gemini-2.5-pro',
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
