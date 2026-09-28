import React, { useState, useEffect } from 'react';
import { WaitlistModal } from './WaitlistModal';
import { MifecoStripeModal } from './MifecoStripeModal';
import { LLMProviderModal } from '../common/LLMProviderModal';
import { getKeyStatus } from '../../services/api';
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
    CreditCard, 
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
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [showLLMModal, setShowLLMModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Environment state (detects if running in Google AI Studio)
  const [isAIStudio, setIsAIStudio] = useState(false);
  const [hasStudioKey, setHasStudioKey] = useState(false);
  const [studioEmail, setStudioEmail] = useState('robertstar2000@gmail.com');
  const [isStudioLoggingIn, setIsStudioLoggingIn] = useState(false);

  const [keyStatus, setKeyStatus] = useState(getKeyStatus);

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
      if (data.user.geminiKey) {
        localStorage.setItem('hmap-gemini-api-key', data.user.geminiKey);
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

      addToast('Authenticated with Google AI Studio Gemini key (gemini-3.8-flash)', 'success');
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
              <span>Free Demo Entry</span>
            </button>
            <button
              onClick={() => setShowStripeModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-300 hover:text-white bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Mifeco Stripe Authority</span>
            </button>
          </div>
        </div>

        {/* AI Studio Test Login Banner: ONLY APPEARS WHEN RUN IN AI STUDIO */}
        {isAIStudio && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-cyan-950/60 border border-emerald-500/40 shadow-xl shadow-emerald-950/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded">
                      Google AI Studio Environment
                    </span>
                    <span className="text-white-50 font-mono text-xs">
                      {studioEmail}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1 mb-0.5">
                    AI Studio Direct Test Login
                  </h4>
                  <p className="text-xs text-slate-300 mb-0">
                    Runs using the studio's pre-configured Gemini key (<code>gemini-3.8-flash</code>). No Stripe payment or manual keys required for development testing.
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
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Studio Test Login</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Column: Tiers & Access Methods */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* 1. Free Demo & BYO-LLM Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    TIER 1: DEMO FREE
                  </span>
                  <span className="text-xs font-semibold text-white">Provide Your Own LLM</span>
                </div>
                <span className="text-xs font-mono text-cyan-400 font-bold">$0 / Free Forever</span>
              </div>
              
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Full exploratory access to null hypothesis formulation, literature synthesis, and Monte Carlo datasets. Connect your own LLM provider API key or OAuth subscription.
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
                  <span>Launch Free Demo Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLLMModal(true)}
                  className="py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 min-h-[38px]"
                >
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Set LLM Provider (5 Options)</span>
                </button>
              </div>
            </div>

            {/* 2. Mifeco Business Paid Access (Stripe Authority) Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/50 via-slate-900/90 to-purple-950/40 border border-indigo-500/35 hover:border-indigo-400/60 shadow-lg shadow-indigo-950/20 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    TIER 2: MIFECO BUSINESS
                  </span>
                  <span className="text-xs font-semibold text-white">Stripe Authority Access</span>
                </div>
                <span className="text-xs font-mono text-indigo-300 font-bold">From $29 / month</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Institutional high-throughput reasoning authority. Managed cloud inference across Claude 3.7 Sonnet, GPT-4o, and Gemini 3.8 Pro with zero setup or personal keys required.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-3 text-[11px] text-slate-300 font-mono">
                <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Unlimited Monte Carlo Runs</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Multi-Agent Peer Audits</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Camera-Ready LaTeX & PDFs</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Stripe Invoicing & SLA</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowStripeModal(true)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[40px]"
              >
                <CreditCard className="w-4 h-4" />
                <span>Subscribe via Mifeco Stripe Authority</span>
              </button>
            </div>

            {/* Protocol Summary Pill */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
              <span className="font-mono text-cyan-400">10-Phase End-to-End Discovery Pipeline</span>
              <button
                type="button"
                onClick={() => setShowWaitlist(true)}
                className="text-slate-400 hover:text-white font-mono uppercase tracking-wider"
              >
                Institutional Waitlist &raquo;
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

                {!isLogin && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-300">
                        Optional Gemini Key
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowLLMModal(true)}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono"
                      >
                        All Providers &raquo;
                      </button>
                    </div>
                    <div className="relative">
                      <input 
                        type={showApiKey ? "text" : "password"}
                        value={formData.geminiKey}
                        onChange={e => setFormData({...formData, geminiKey: e.target.value})}
                        placeholder="AIzaSy..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all pr-9 min-h-[40px] font-mono"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

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
          <span>Mifeco Business Stripe Authority & Google AI Studio Integration</span>
        </div>

      </div>

      {/* Modals */}
      <WaitlistModal 
        isOpen={showWaitlist} 
        onClose={() => setShowWaitlist(false)} 
        stackOrder={1} 
      />

      <MifecoStripeModal
        isOpen={showStripeModal}
        onClose={() => setShowStripeModal(false)}
        initialEmail={formData.email}
        onSuccess={(user) => {
          onAuthSuccess(user);
        }}
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
