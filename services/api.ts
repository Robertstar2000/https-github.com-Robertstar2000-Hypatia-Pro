
import { GoogleGenAI } from "@google/genai";
import { Blocker } from '../config';
import { getStoredLLMConfig, SUPPORTED_PROVIDERS } from './llmConfig';

// --- API KEY MANAGEMENT ---

export const getSafeEnvApiKey = () => {
    // 1. Check active LLM config
    const config = getStoredLLMConfig();
    if (config.provider === 'google' && config.apiKey) {
        return config.apiKey;
    }

    // 2. Check localStorage legacy key
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem('hmap-gemini-api-key') : null;
    if (storedKey) return storedKey;

    // 3. Check environment variable (System-provided key)
    // @ts-ignore - process is polyfilled in index.html
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
        if (process.env.API_KEY) return process.env.API_KEY;
    }
    return '';
};

export const getCurrentApiKey = () => getSafeEnvApiKey();

export const getKeyStatus = () => {
    const config = getStoredLLMConfig();
    const envKey = getSafeEnvApiKey();
    const providerDef = SUPPORTED_PROVIDERS[config.provider] || SUPPORTED_PROVIDERS.google;
    const activeModel = config.customModel || config.model || providerDef.defaultModel;

    if (config.provider !== 'google') {
        const hasAuth = config.authType === 'oauth' ? !!config.oauthToken : !!config.apiKey;
        if (hasAuth || config.provider === 'ollama') {
            return {
                type: config.authType === 'oauth' ? 'oauth' : 'manual',
                provider: config.provider,
                providerName: providerDef.name,
                model: activeModel,
                label: `${providerDef.name} (${activeModel})`,
                color: 'bg-info',
                isOAuth: config.authType === 'oauth',
                accountName: config.oauthAccount?.name || config.oauthAccount?.tier
            };
        }
    } else {
        const hasUserKey = !!config.apiKey;
        const hasOAuth = config.authType === 'oauth' && !!config.oauthToken;
        if (hasOAuth) {
            return {
                type: 'oauth',
                provider: 'google',
                providerName: 'Google Gemini Pro',
                model: activeModel,
                label: `Google OAuth (${activeModel})`,
                color: 'bg-success',
                isOAuth: true,
                accountName: config.oauthAccount?.name || config.oauthAccount?.tier
            };
        }
        if (hasUserKey) {
            return {
                type: 'manual',
                provider: 'google',
                providerName: 'Google Gemini',
                model: activeModel,
                label: `Custom Key (${activeModel})`,
                color: 'bg-success',
                isOAuth: false
            };
        }
        if (envKey) {
            return {
                type: 'env',
                provider: 'google',
                providerName: 'Google Gemini',
                model: activeModel,
                label: `System Key (${activeModel})`,
                color: 'bg-success',
                isOAuth: false
            };
        }
    }

    return {
        type: 'none',
        provider: config.provider,
        providerName: providerDef.name,
        model: activeModel,
        label: `${providerDef.name} (Disconnected)`,
        color: 'bg-danger',
        isOAuth: false
    };
};

export const testApiKey = async (key: string, provider: string = 'google'): Promise<boolean> => {
    try {
        const resp = await fetch('/api/llm/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider,
                authType: 'key',
                apiKey: key,
            })
        });
        const data = await resp.json();
        return !!data.success;
    } catch (e) {
        if (provider === 'google' && key) {
            try {
                const ai = new GoogleGenAI({ apiKey: key });
                await ai.models.generateContent({
                     model: 'gemini-3.8-flash',
                     contents: 'Ping.',
                });
                return true;
            } catch {
                try {
                    const ai = new GoogleGenAI({ apiKey: key });
                    await ai.models.generateContent({
                         model: 'gemini-3.5-flash',
                         contents: 'Ping.',
                    });
                    return true;
                } catch {
                    return false;
                }
            }
        }
        return false;
    }
};

// --- ERROR HANDLING & PARSING ---

export const parseGeminiError = (error: any, defaultMsg = "An error occurred with the AI service."): string => {
    console.error("Gemini Error:", error);
    const msg = error?.message || error?.toString() || "";
    
    if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        return "Quota Limit Reached. System is cooling down...";
    }
    if (msg.includes("401")) return "Authentication Failed. Please check API Key.";
    if (msg.includes("503") || msg.includes("overloaded") || msg.includes("500") || msg.includes("Rpc failed")) return "Service Temporarily Unavailable. Retrying...";
    if (msg.includes("SAFETY")) return "Safety Filter Triggered. Please refine input.";
    if (msg.includes("400") || msg.includes("Bad Request") || msg.includes("INVALID_ARGUMENT")) return `Invalid Request: ${msg}`;
    
    return defaultMsg;
};

// --- ROBUST EXECUTION ENGINE ---

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface RetryOptions {
    maxRetries?: number;
    onStatusUpdate?: (status: string) => void;
    allowFallback?: boolean;
    timeout?: number;
}

/**
 * Wraps a promise with a timeout.
 */
const callGeminiWithTimeout = async (geminiCall: Promise<any>, timeout: number = 900000) => {
    let timeoutId: any;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`API call timed out after ${timeout / 1000} seconds.`)), timeout);
    });

    try {
        const result = await Promise.race([geminiCall, timeoutPromise]);
        clearTimeout(timeoutId);
        return result;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
};

const FALLBACK_MODELS = [
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite'
];

/**
 * Executes a Gemini API call with sophisticated error recovery.
 * Handles 429 (Quota) and 503 (Load) with exponential backoff and jitter.
 * Provides real-time status updates to the UI.
 */
export const callGeminiWithRetry = async (
    modelName: string, 
    params: any, 
    optionsOrRetries: number | RetryOptions = 5
) => {
    // Normalize options
    const options: RetryOptions = typeof optionsOrRetries === 'number' 
        ? { maxRetries: optionsOrRetries } 
        : optionsOrRetries;
        
    const { maxRetries = 5, onStatusUpdate, allowFallback = true, timeout = 900000 } = options;

    // Check active LLM config
    const llmConfig = getStoredLLMConfig();
    const activeProvider = llmConfig.provider;

    // If non-Google provider or OAuth is selected, dispatch through the universal proxy
    if (activeProvider !== 'google' || llmConfig.authType === 'oauth') {
        const targetModel = llmConfig.customModel || llmConfig.model;
        let promptText = '';
        if (typeof params.contents === 'string') {
            promptText = params.contents;
        } else if (params.contents?.parts) {
            promptText = params.contents.parts.map((p: any) => p.text || '').join('\n');
        } else if (Array.isArray(params.contents)) {
            promptText = params.contents.map((c: any) => {
                if (typeof c === 'string') return c;
                if (c?.parts) return c.parts.map((p: any) => p.text || '').join('\n');
                return JSON.stringify(c);
            }).join('\n');
        } else {
            promptText = JSON.stringify(params.contents || params);
        }

        try {
            const resp = await fetch('/api/llm/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: activeProvider,
                    model: targetModel,
                    apiKey: llmConfig.apiKey,
                    oauthToken: llmConfig.oauthToken,
                    endpointUrl: llmConfig.endpointUrl,
                    prompt: promptText,
                    systemInstruction: params.config?.systemInstruction,
                    temperature: params.config?.temperature ?? 0.7,
                    maxTokens: params.config?.maxOutputTokens ?? 8192,
                    responseMimeType: params.config?.responseMimeType
                })
            });

            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                throw new Error(errData.error || `LLM generation failed for ${activeProvider} (${resp.status})`);
            }

            const data = await resp.json();
            return {
                text: data.text,
                candidates: [{ content: { parts: [{ text: data.text }] } }],
                provider: data.provider,
                model: data.model
            };
        } catch (proxyError: any) {
            console.error(`[LLM Router Error] ${activeProvider}:`, proxyError);
            const hasGoogleKey = !!getSafeEnvApiKey();
            if (activeProvider !== 'google' && !hasGoogleKey) {
                throw proxyError;
            }
            if (onStatusUpdate) {
                onStatusUpdate(`Provider ${activeProvider} unavailable. Falling back to Google Gemini...`);
            }
        }
    }

    // Config defaults
    const defaults = { temperature: 0.7, topK: 40 };
    params.config = { ...defaults, ...(params.config || {}) };

    // Allow user selected model to be preferred
    let currentModel = (llmConfig.provider === 'google' && (llmConfig.customModel || llmConfig.model)) 
        ? (llmConfig.customModel || llmConfig.model) 
        : modelName;
    let attempts = 0;
    const attemptedModels = new Set<string>();
    attemptedModels.add(currentModel);

    while (true) {
        try {
            const apiKey = getSafeEnvApiKey();
            if (!apiKey) throw new Error("No API Key available.");
        
            const ai = new GoogleGenAI({ apiKey });

            const response = await callGeminiWithTimeout(ai.models.generateContent({
                model: currentModel,
                ...params
            }), timeout);
            return response;
        } catch (error: any) {
            attempts++;
            const msg = error?.message || error?.toString() || "";
            console.error(`[API Error] Attempt ${attempts} failed for model ${currentModel}:`, error);
            
            const isQuota = msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED");
            const isOverloaded = msg.includes("503") || msg.includes("overloaded") || msg.includes("500") || msg.includes("Rpc failed");
            const isAuthError = msg.includes("401") || msg.includes("403") || msg.includes("API key") || msg.includes("PERMISSION_DENIED");
            const isTimeoutError = msg.includes("timed out");
            const isBadRequest = msg.includes("400") || msg.includes("Bad Request") || msg.includes("INVALID_ARGUMENT");
            
            if (isAuthError) {
                 if (typeof window !== 'undefined') localStorage.removeItem('hmap-gemini-api-key');
                 console.error(`[API Fatal Error] Auth/Permission error:`, msg);
                 throw new Error("Access Denied (403/401). Please check your API Key and ensure it has correct permissions.");
            }
            if (isBadRequest) {
                console.error(`[API Fatal Error] Bad Request:`, msg);
                throw error;
            }

            // Fallback Logic: Try next model in the chain if quota exhausted or retries exhausted
            if (attempts > maxRetries || isQuota) {
                 if (allowFallback && !modelName.includes('image')) {
                     const untriedModel = FALLBACK_MODELS.find(m => m !== currentModel && !attemptedModels.has(m));
                     if (untriedModel) {
                         const fallbackMsg = `Model ${currentModel} ${isQuota ? 'quota exhausted' : 'unresponsive'}. Rerouting to ${untriedModel}...`;
                         console.warn(fallbackMsg);
                         if (onStatusUpdate) onStatusUpdate(fallbackMsg);
                         
                         attemptedModels.add(untriedModel);
                         currentModel = untriedModel;
                         attempts = 0; // Reset attempts for the new model
                         await wait(1000);
                         continue;
                     }
                 }
                 if (attempts > maxRetries) {
                     console.error(`[API Exhausted] All ${attempts} attempts failed. Last error:`, msg);
                     throw error; // Exhausted all options
                 }
            }

            // Smart Backoff Calculation
            let waitTime = 1000 * Math.pow(2, attempts); // Exponential: 2s, 4s, 8s...
            
            if (isQuota) {
                // Quota errors need significantly more time + jitter to avoid thundering herd
                waitTime = 15000 + (Math.random() * 5000); // 15-20s window
                const seconds = Math.round(waitTime / 1000);
                if (onStatusUpdate) onStatusUpdate(`Quota Limit (429). Pausing for ${seconds}s to recover...`);
            } else if (isOverloaded) {
                if (onStatusUpdate) onStatusUpdate(`Model Overloaded (503). Retrying in ${Math.round(waitTime/1000)}s...`);
            } else if (isTimeoutError) {
                if (onStatusUpdate) onStatusUpdate(`API call timed out. Retrying (${attempts}/${maxRetries})...`);
            } else {
                 if (onStatusUpdate) onStatusUpdate(`Connection interrupted. Retrying (${attempts}/${maxRetries})...`);
            }

            console.log(`[API Retry] Attempt ${attempts} waiting ${waitTime}ms. Error: ${msg}`);
            await wait(waitTime);
        }
    }
};

export const callGeminiStreamWithRetry = async (
    modelName: string, 
    params: any,
    options: RetryOptions = {}
) => {
    const { maxRetries = 5, onStatusUpdate, timeout = 900000 } = options;

    let attempts = 0;
    while (true) {
        try {
            const apiKey = getSafeEnvApiKey();
            if (!apiKey) throw new Error("No API Key available.");
        
            const ai = new GoogleGenAI({ apiKey });

            const stream = await callGeminiWithTimeout(ai.models.generateContentStream({
                model: modelName,
                ...params
            }), timeout);
            return stream;
        } catch (error: any) {
            attempts++;
            const msg = error?.message || error?.toString() || "";
            const isBadRequest = msg.includes("400") || msg.includes("Bad Request") || msg.includes("INVALID_ARGUMENT");
            if (attempts > maxRetries || msg.includes("401") || isBadRequest) throw error;

            const waitTime = 2000 * attempts;
            if (onStatusUpdate) onStatusUpdate(`Stream connection failed. Retrying in ${waitTime/1000}s...`);
            await wait(waitTime);
        }
    }
};

/**
 * Generates an image using Gemini 3 Pro Image Preview.
 * Used for visualizing lab setups and data concepts.
 */
export const generateLabImage = async (prompt: string): Promise<string | null> => {
    const apiKey = getSafeEnvApiKey();
    if (!apiKey) throw new Error("No API Key available.");
    const ai = new GoogleGenAI({ apiKey });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: "16:9",
                    imageSize: "1K"
                }
            }
        });

        // Find image part in response
        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
             const content = candidates[0].content;
             if (content && content.parts) {
                 for (const part of content.parts) {
                     if (part.inlineData && part.inlineData.mimeType.startsWith('image')) {
                         return part.inlineData.data;
                     }
                 }
             }
        }
        return null;
    } catch (e) {
        console.error("Image generation failed", e);
        throw e;
    }
};

// --- UTILITIES ---

export const extractJson = (text: any): string => {
    if (typeof text !== 'string' || !text) return "";
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) return match[1].trim();
    
    // If no markdown blocks, find the first '{' or '[' and last '}' or ']'
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    
    let firstIndex = -1;
    let lastIndex = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        firstIndex = firstBrace;
        lastIndex = lastBrace;
    } else if (firstBracket !== -1) {
        firstIndex = firstBracket;
        lastIndex = lastBracket;
    }

    if (firstIndex !== -1 && lastIndex !== -1 && lastIndex > firstIndex) {
        return text.substring(firstIndex, lastIndex + 1).trim();
    }
    
    return text.trim();
};

export const tryRepairJson = (str: string): any => {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.trim();
    if (!trimmed) return null;

    try {
        return JSON.parse(trimmed);
    } catch {
        try {
            let cleaned = trimmed;
            cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

            const stack: string[] = [];
            let inString = false;
            let escape = false;

            for (let i = 0; i < cleaned.length; i++) {
                const char = cleaned[i];
                if (escape) {
                    escape = false;
                    continue;
                }
                if (char === '\\') {
                    escape = true;
                    continue;
                }
                if (char === '"') {
                    inString = !inString;
                    continue;
                }
                if (inString) continue;

                if (char === '{') {
                    stack.push('}');
                } else if (char === '[') {
                    stack.push(']');
                } else if (char === '}' || char === ']') {
                    if (stack.length > 0 && stack[stack.length - 1] === char) {
                        stack.pop();
                    }
                }
            }

            // If we ended inside a string, close it
            if (inString) {
                cleaned += '"';
            }

            // Remove any trailing comma or colon at the end
            cleaned = cleaned.trim().replace(/[,:]\s*$/, '');

            // Append all remaining closing brackets and braces in exact reverse order
            while (stack.length > 0) {
                cleaned += stack.pop();
            }

            return JSON.parse(cleaned);
        } catch {
            return null;
        }
    }
};

export const isValidJsonForSchema = (jsonString: string, schema: any): boolean => {
    try {
        const obj = JSON.parse(jsonString);
        if (!obj || typeof obj !== 'object') return false;
        
        const validate = (val: any, s: any): boolean => {
            if (!s) return true;
            if (s.type === 'OBJECT') { // Note Type.OBJECT resolves to 'OBJECT' or Type enum value
                if (typeof val !== 'object' || val === null || Array.isArray(val)) return false;
                if (s.required) {
                    for (const req of s.required) {
                        if (!(req in val) || val[req] === undefined || val[req] === null) return false;
                    }
                }
                if (s.properties) {
                    for (const key of Object.keys(val)) {
                        if (s.properties[key]) {
                            // If optional and null/undefined, skip validation
                            if ((val[key] === null || val[key] === undefined) && (!s.required || !s.required.includes(key))) {
                                continue;
                            }
                            if (!validate(val[key], s.properties[key])) return false;
                        }
                    }
                }
            } else if (s.type === 'ARRAY') {
                if (!Array.isArray(val)) return false;
                if (s.items) {
                    for (const item of val) {
                        if (!validate(item, s.items)) return false;
                    }
                }
            } else if (s.type === 'STRING') {
                if (typeof val !== 'string' && typeof val !== 'number') return false;
                if (s.enum && !s.enum.includes(val)) return false;
            } else if (s.type === 'NUMBER' || s.type === 'INTEGER') {
                if (typeof val === 'number') {
                    if (isNaN(val)) return false;
                } else if (typeof val === 'string') {
                    if (isNaN(Number(val))) return false;
                } else {
                    return false;
                }
            } else if (s.type === 'BOOLEAN') {
                if (typeof val !== 'boolean') return false;
            }
            return true;
        };

        // Standardize schema/Type check as Type enum resolves to string names (e.g. 'OBJECT') or lower
        const standardizeSchema = (sc: any): any => {
            if (!sc) return sc;
            const newSc = { ...sc };
            if (newSc.type) {
                newSc.type = String(newSc.type).toUpperCase();
            }
            if (newSc.properties) {
                const newProps: any = {};
                for (const key of Object.keys(newSc.properties)) {
                    newProps[key] = standardizeSchema(newSc.properties[key]);
                }
                newSc.properties = newProps;
            }
            if (newSc.items) {
                newSc.items = standardizeSchema(newSc.items);
            }
            return newSc;
        };

        return validate(obj, standardizeSchema(schema));
    } catch (e) {
        return false;
    }
};

export const safeGetText = (response: any): string => {
    try {
        return response.text || "";
    } catch (e) {
        console.error("Failed to extract text from response:", e);
        return "";
    }
};

export const parseBlockers = (text: string): Blocker[] => {
    try {
        const jsonStr = extractJson(text);
        if (!jsonStr) return [];
        const data = JSON.parse(jsonStr);
        const alert = data.BLOCKER_ALERT || (data.severity ? data : null);
        if (!alert) return [];

        const list = Array.isArray(alert) ? alert : [alert];
        return list.map((b: any, i: number) => ({
            id: `blk_${Date.now()}_${i}`,
            severity: b.severity,
            msg: b.msg,
            resolved: false
        }));
    } catch (e) {
        return [];
    }
};

export const generateNodeSummary = async (content: string, field: string): Promise<string> => {
    if (!content || content.length < 50) return content;
    const prompt = `As a Research Archivist in ${field}, compress the following content into a concise, high-density summary (max 3 sentences). Preserve key variables and findings.\n\nCONTENT:\n${content.substring(0, 15000)}...`;
    try {
        const response = await callGeminiWithRetry('gemini-3.1-flash-lite', { contents: prompt });
        return safeGetText(response) || content.substring(0, 200) + "...";
    } catch (e) {
        return content.substring(0, 200) + "...";
    }
};
