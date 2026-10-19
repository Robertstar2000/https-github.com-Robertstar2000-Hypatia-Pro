import React, { useState, useEffect } from 'react';
import { WaitlistModal } from './WaitlistModal';
import { LLMProviderModal } from '../common/LLMProviderModal';
import { getKeyStatus } from '../../services/api';
import { getStoredLLMConfig, saveLLMConfig, MODEL_CAPABILITY_NOTICE } from '../../services/llmConfig';
import { useToast } from '../../toast';
import { 
    FlaskConical, 
    ShieldCheck, 
    Lock, 
    User, 
    Mail, 
    Key, 
    ArrowRight, 
    Sparkles, 
    Eye, 
    EyeOff, 
    CheckCircle2, 
    ExternalLink, 
    Atom, 
    Play, 
    Cpu, 
    Server
} from 'lucide-react';

interface AuthViewProps {
  onAuthSuccess: (user: any) => void;
  onContinueAsGuest?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, onContinueAsGuest }) => {
  const { addToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [showLLMModal, setShowLLMModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Environment state (detects if running in Google AI Studio)
  const [isAIStudio, setIsAIStudio] = useState(false);
  const [hasStudioKey, setHasStudioKey] = useState(false);
  const [studioEmail, setStudioEmail] = useState('robertstar2000@gmail.com');
  const [isStudioLoggingIn, setIsStudioLoggingIn] = useState(false);

  const [keyStatus, setKeyStatus] = useState(getKeyStatus);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const curConfig = getStoredLLMConfig();
    return curConfig.model || 'gemini-3.8-flash';
  });

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    geminiKey: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if running in AI Studio on mount
  useEffect(() => {
    let isMounted = true;
    const checkEnvironment = async () => {
      try {
        const resp = await fetch('/api/auth/environment');
        if (resp.ok) {
          const data = await resp.json();
          if (isMounted) {
            setIsAIStudio(Boolean(data.isStudio));
            setHasStudioKey(Boolean(data.hasStudioGeminiKey));
            if (data.userEmail) setStudioEmail(data.userEmail);
          }
        }
      } catch (e) {
        // Fallback client detection
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        const isRunApp = hostname.includes('run.app') || hostname.includes('localhost') || hostname.includes('aistudio');
        if (isMounted) {
          setIsAIStudio(isRunApp);
          setHasStudioKey(true);
        }
      }
    };
    checkEnvironment();

    const handleKeyUpdate = () => setKeyStatus(getKeyStatus());
    window.addEventListener('hypatia-llm-config-updated', handleKeyUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('hypatia-llm-config-updated', handleKeyUpdate);
    };
  }, []);

  // Standard Sign In / Sign Up submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    const payload = isLogin 
      ? { emailOrUsername: formData.email || formData.username, password: formData.password }
      : formData;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('hmap-current-user', JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem('hmap-token', data.token);
      }
      
      const effectiveKey = formData.geminiKey?.trim() || data.user.geminiKey?.trim();
      if (effectiveKey) {
        localStorage.setItem('hmap-gemini-api-key', effectiveKey);
        const curConfig = getStoredLLMConfig();
        saveLLMConfig({
          ...curConfig,
          provider: 'google',
          apiKey: effectiveKey,
          model: selectedModel || curConfig.model || 'gemini-3.8-flash',
          isVerified: true
        });
      } else if (selectedModel) {
        const curConfig = getStoredLLMConfig();
        if (curConfig.model !== selectedModel) {
          saveLLMConfig({
            ...curConfig,
            model: selectedModel
          });
        }
      }
      
      addToast(`Welcome back, ${data.user.username || 'Researcher'}!`, 'success');
      onAuthSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Demo Free Access handler
  const handleDemoFree = async () => {
    try {
      const resp = await fetch('/api/auth/demo-free', { method: 'POST' });
      const data = await resp.json();
      const user = data.user || {
        id: 'demo_user_' + Date.now(),
        username: 'Principal Investigator',
        email: 'demo@hypatia.pro',
        tier: 'free_byo_llm'
      };

      localStorage.setItem('hmap-current-user', JSON.stringify(user));
      if (data.token) localStorage.setItem('hmap-token', data.token);
      
      addToast('Entered as Demo Free Researcher. Provide your own LLM key as needed.', 'info');
      if (onContinueAsGuest) onContinueAsGuest();
      else onAuthSuccess(user);
    } catch {
      const fallbackUser = {
        id: 'guest_' + Date.now(),
        username: 'Principal Investigator',
        email: 'demo@hypatia.pro',
        tier: 'free_byo_llm'
      };
      localStorage.setItem('hmap-current-user', JSON.stringify(fallbackUser));
      if (onContinueAsGuest) onContinueAsGuest();
      else onAuthSuccess(fallbackUser);
    }
  };

  // AI Studio Test Login (Exclusively for AI Studio)
  const handleStudioTestLogin = async () => {
    setIsStudioLoggingIn(true);
    try {
      const resp = await fetch('/api/auth/studio-test-login', { method: 'POST' });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to authenticate with AI Studio');

      localStorage.setItem('hmap-current-user', JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem('hmap-token', data.token);
      }
      if (data.user.geminiKey) {
        localStorage.setItem('hmap-gemini-api-key', data.user.geminiKey);
      }

      addToast('Authenticated with Google AI Studio Developer Account', 'success');
      onAuthSuccess(data.user);
    } catch (err: any) {
      addToast(err.message || 'AI Studio test login failed', 'danger');
    } finally {
      setIsStudioLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-indigo-500/10 via-cyan-500/5 to-transparent blur-3xl rounded-full"></div>
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-indigo-600/5 blur-3xl rounded-full"></div>
        <div className="absolute bottom-10 -right-32 w-96 h-96 bg-cyan-600/5 blur-3xl rounded-full"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-10 lg:px-8 flex-1 flex flex-col justify-center">
        
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between pb-5 mb-6 border-b border-slate-800/80 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 p-[1px] shadow-lg shadow-cyan-500/10">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-widest text-cyan-400 font-mono uppercase">HYPATIA.PRO</span>
                <span className="badge bg-slate-800 text-slate-400 font-mono text-[10px] px-2 py-0.5 rounded">v2.5</span>
              </div>
              <h2 className="text-sm text-slate-400 font-medium">MIFECO Autonomous Research Architecture</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDemoFree}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Explore Research Pipeline</span>
            </button>
            <button
              onClick={() => setShowLLMModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>LLM Provider Setup</span>
            </button>
          </div>
        </div>

        {/* AI Studio Developer Testing: EXCLUSIVELY AVAILABLE FOR DEVELOPER TESTING ON AI STUDIO */}
        {isAIStudio && (
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-cyan-950/60 border border-emerald-500/40 shadow-xl shadow-emerald-950/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded">
                      AI Studio Developer Testing (Internal Only)
                    </span>
                    <span className="text-white-50 font-mono text-xs">
                      {studioEmail}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1 mb-0.5">
                    Studio Developer Testing Mode
                  </h4>
                  <p className="text-xs text-slate-300 mb-0">
                    This option exists exclusively when running on Google AI Studio for developer testing. When engaged, it advances directly to the application functionality and autonomous discovery pipeline.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStudioTestLogin}
                disabled={isStudioLoggingIn}
                className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider uppercase bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[40px]"
              >
                {isStudioLoggingIn ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Advancing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Engage Studio Dev Testing</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Model Capability Requirement Notice */}
        <div className="mb-5 p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/35 text-sky-200 text-xs flex items-start gap-3 shadow-lg">
          <Atom className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-white mb-0.5 font-mono uppercase tracking-wider text-[11px] flex items-center gap-2">
              <span>Model Capability Requirement</span>
              <span className="badge bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[10px] px-1.5 py-0.5">Required</span>
            </div>
            <div className="text-sky-200 leading-relaxed">
              {MODEL_CAPABILITY_NOTICE}
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Column: Research Access & Protocol Features */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* 1. Open Access Scientific Architecture Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    OPEN RESEARCH PROTOCOL
                  </span>
                  <span className="text-xs font-semibold text-white">Full Autonomous Pipeline</span>
                </div>
                <span className="text-xs font-mono text-cyan-400 font-bold">Standard Researcher Access</span>
              </div>
              
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Full exploratory access to null hypothesis formulation, literature synthesis across 80+ scientific fields, and in-silico Monte Carlo datasets. Connect your preferred LLM provider or operate with the autonomous emulation engine.
              </p>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-slate-300 font-mono">
                    Engine: <strong className="text-white">{keyStatus.providerName || 'Google Gemini'}</strong> ({keyStatus.model || 'gemini-3.8-flash'})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLLMModal(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold font-mono underline cursor-pointer"
                >
                  Configure LLM &raquo;
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDemoFree}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 min-h-[38px]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Research Pipeline</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLLMModal(true)}
                  className="py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 min-h-[38px]"
                >
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Select LLM Provider (6 Engines)</span>
                </button>
              </div>
            </div>

            {/* 2. Scientific Core Architecture Capabilities */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-purple-950/30 border border-indigo-500/30 transition-all">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    DISCOVERY CAPABILITIES
                  </span>
                  <span className="text-xs font-semibold text-white">Full-Stack Scientific Rigor</span>
                </div>
                <span className="text-xs font-mono text-indigo-300">10 Coordinated Phases</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Automated multi-agent research architecture linking theoretical hypothesis ideation, double-blind cohort protocols, Monte Carlo kinetic modeling, inferential biostatistics, and academic publication dossiers.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-3 text-[11px] text-slate-300 font-mono">
                <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>In-Browser Monte Carlo Runs</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Multi-Agent Peer Audits</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Camera-Ready LaTeX & PDFs</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>80+ Scientific Field Ontologies</span>
                </div>
              </div>
            </div>

            {/* Protocol Summary Pill */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
              <span className="font-mono text-cyan-400">10-Phase End-to-End Discovery Pipeline</span>
              <button
                type="button"
                onClick={() => setShowWaitlist(true)}
                className="text-slate-400 hover:text-white font-mono uppercase tracking-wider"
              >
                Institutional Inquiries &raquo;
              </button>
            </div>

          </div>

          {/* Right Column: Standard Account Sign In / Sign Up Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl p-5 sm:p-6">
              
              {/* Tab Switcher */}
              <div className="flex p-1 bg-slate-950 rounded-xl mb-4 border border-slate-800">
                <button 
                  type="button"
                  onClick={() => { setIsLogin(true); setError(''); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
                    isLogin ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button 
                  type="button"
                  onClick={() => { setIsLogin(false); setError(''); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
                    !isLogin ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                
                {!isLogin && (
                  <div>
                    <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      Researcher Name / Handle
                    </label>
                    <input 
                      type="text" 
                      required
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      placeholder="e.g. dr_hypatia"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all min-h-[40px]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    {isLogin ? 'Email or Username' : 'Institutional Email'}
                  </label>
                  <input 
                    type={isLogin ? "text" : "email"}
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder={isLogin ? "user@example.com or username" : "researcher@university.edu"}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all min-h-[40px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all pr-9 min-h-[40px]"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-300">
                      Provide Your Own Key
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowLLMModal(true)}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
                    >
                      <Cpu className="w-3 h-3" />
                      <span>All 6 Providers (including Grok) &raquo;</span>
                    </button>
                  </div>

                  <div className="relative mb-2">
                    <input 
                      type={showApiKey ? "text" : "password"}
                      value={formData.geminiKey}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({...formData, geminiKey: val});
                        if (val.trim()) {
                          localStorage.setItem('hmap-gemini-api-key', val.trim());
                          const curConfig = getStoredLLMConfig();
                          saveLLMConfig({
                            ...curConfig,
                            provider: 'google',
                            apiKey: val.trim(),
                            model: selectedModel || curConfig.model || 'gemini-3.8-flash',
                            isVerified: true
                          });
                        }
                      }}
                      placeholder="Optional API Key (AIzaSy... or xai-...)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all pr-9 min-h-[38px] font-mono"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Allowed Model Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1 text-[10px] font-mono">
                      <span className="text-slate-400 uppercase">Selected Engine:</span>
                      <span className="text-cyan-300 font-bold truncate max-w-[170px]">{selectedModel}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: 'gemini-3.8-flash', label: 'Gemini 3.8', tag: 'Google' },
                        { id: 'grok-3', label: 'Grok 3', tag: 'xAI' },
                        { id: 'o3-mini', label: 'o3-mini', tag: 'OpenAI' },
                        { id: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7', tag: 'Anthropic' }
                      ].map(m => {
                        const isChosen = selectedModel === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(m.id);
                              const curConfig = getStoredLLMConfig();
                              saveLLMConfig({
                                ...curConfig,
                                model: m.id
                              });
                            }}
                            className={`py-1 px-1.5 rounded-lg text-[10px] font-mono transition-all text-center border ${
                              isChosen 
                                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60 font-bold shadow-sm' 
                                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                            }`}
                          >
                            <span className="block truncate">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/20 active:scale-95 transition-all min-h-[40px]"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>{isLogin ? 'Sign In to Hypatia' : 'Create Researcher Account'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Direct Alternative Links */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col gap-2">
                <button 
                  type="button"
                  onClick={handleDemoFree}
                  className="w-full py-2 px-3 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-all flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 text-cyan-400 fill-current" />
                  <span>Demo Free (No Account Needed)</span>
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="pt-6 mt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-500">
          <span>Project Hypatia Pro • Autonomous Science Protocol</span>
          <span>Open Access Scientific Discovery Architecture</span>
        </div>

      </div>

      {/* Modals */}
      <WaitlistModal 
        isOpen={showWaitlist} 
        onClose={() => setShowWaitlist(false)} 
        stackOrder={1} 
      />

      <LLMProviderModal
        isOpen={showLLMModal}
        onClose={() => setShowLLMModal(false)}
        onSaved={() => {
          setKeyStatus(getKeyStatus());
        }}
      />
    </div>
  );
};
