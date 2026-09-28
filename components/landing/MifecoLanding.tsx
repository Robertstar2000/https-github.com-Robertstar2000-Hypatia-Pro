import React, { useState } from 'react';
import { useToast } from '../../toast';
import { useExperiment } from '../../services';
import { LLMProviderModal } from '../common/LLMProviderModal';
import { 
    FlaskConical, 
    FolderKanban, 
    Cpu, 
    Eye, 
    EyeOff, 
    LogOut, 
    Sparkles, 
    CheckCircle2, 
    Database, 
    BookOpen, 
    ShieldCheck, 
    ArrowRight, 
    Layers, 
    BarChart3, 
    FileText,
    ExternalLink,
    Play
} from 'lucide-react';

interface MifecoLandingProps {
  user: any;
  onOpenDatabase: () => void;
  onInitiateProtocol: () => void;
  onLogout: () => void;
  onKeyUpdate: () => void;
}

export const MifecoLanding: React.FC<MifecoLandingProps> = ({ 
    user, 
    onOpenDatabase, 
    onInitiateProtocol, 
    onLogout, 
    onKeyUpdate 
}) => {
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('hmap-gemini-api-key') || '');
  const [showKey, setShowKey] = useState(false);
  const [showLLMModal, setShowLLMModal] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const { addToast } = useToast();
  const { experiments, selectExperiment } = useExperiment();

  const handleSaveKey = () => {
    setIsSavingKey(true);
    try {
        if (geminiKey.trim()) {
            localStorage.setItem('hmap-gemini-api-key', geminiKey.trim());
            addToast('Gemini API credentials successfully synchronized.', 'success');
        } else {
            localStorage.removeItem('hmap-gemini-api-key');
            addToast('Custom API key removed. Reverting to environment default.', 'info');
        }
        onKeyUpdate();
    } catch (err) {
        addToast('Failed to update API credentials.', 'danger');
    } finally {
        setIsSavingKey(false);
    }
  };

  const recentExperiments = Array.isArray(experiments) ? experiments.slice(0, 3) : [];

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Dynamic Background Mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-indigo-500/10 via-cyan-500/5 to-transparent blur-3xl rounded-full"></div>
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-indigo-600/5 blur-3xl rounded-full"></div>
        <div className="absolute bottom-10 -right-32 w-96 h-96 bg-cyan-600/5 blur-3xl rounded-full"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 flex-1 flex flex-col justify-between">
        
        {/* Navigation / Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 p-[1px] shadow-lg shadow-cyan-500/10">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-widest text-cyan-400 font-mono uppercase">Hypatia Pro</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
                  ONLINE
                </span>
              </div>
              <h2 className="text-sm text-slate-400 font-medium">MIFECO Autonomous Research Architecture</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button 
              onClick={() => onOpenDatabase()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>Projects ({experiments?.length || 0})</span>
            </button>
            <button 
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
              title="Sign out of researcher session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-8 sm:py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-mono mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Authenticated Principal Investigator • {user?.username || 'Researcher'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white font-['Space_Grotesk'] max-w-3xl leading-[1.15]">
            Welcome to the <br />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Digital Laboratory
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
            Execute the complete scientific method autonomously. Formulate falsifiable hypotheses, generate Web-Worker simulated datasets, run multi-agent peer reviews, and synthesize journal-grade manuscripts.
          </p>

          {/* Telemetry Indicator Pills */}
          <div className="mt-6 flex flex-wrap gap-2.5 sm:gap-3 text-xs text-slate-400 font-mono">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Gemini 3.5 Engine
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              Isolated Code Worker
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Local IndexedDB Encrypted
            </span>
          </div>
        </section>

        {/* Primary Action Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 my-4">
          
          {/* Card 1: Initiate New Protocol (High Priority) */}
          <div className="group relative rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 p-6 sm:p-7 border border-slate-700/80 hover:border-cyan-500/50 shadow-xl hover:shadow-cyan-500/5 transition-all flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none"></div>
            
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 mb-2">
                10-STEP WORKFLOW
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white font-['Space_Grotesk'] tracking-tight">
                Initiate New Protocol
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Launch a fresh scientific investigation. Define your scope, simulate theoretical datasets, compute statistical power, and produce publication drafts.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800">
              <button 
                onClick={onInitiateProtocol}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all min-h-[44px]"
              >
                <span>Launch Protocol Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Research Archives & Projects */}
          <div className="group relative rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 p-6 sm:p-7 border border-slate-700/80 hover:border-indigo-500/50 shadow-xl hover:shadow-indigo-500/5 transition-all flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none"></div>
            
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-110 transition-transform">
                <FolderKanban className="w-6 h-6" />
              </div>
              <div className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 mb-2">
                STORAGE & PROVENANCE
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white font-['Space_Grotesk'] tracking-tight">
                Project Archives & Data
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Access your database of {experiments?.length || 0} stored investigation{experiments?.length === 1 ? '' : 's'}, view cryptographic provenance logs, and resume active workflows.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800">
              <button 
                onClick={onOpenDatabase}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600/80 active:scale-[0.98] transition-all min-h-[44px]"
              >
                <span>Browse Research Archives</span>
                <Database className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Card 3: AI Engine & Secrets */}
          <div className="group relative rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 p-6 sm:p-7 border border-slate-700/80 hover:border-slate-600 shadow-xl transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-5 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <div className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 mb-2">
                COGNITIVE ENGINE
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white font-['Space_Grotesk'] tracking-tight">
                API Key Credentials
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Configure your personal Google AI Studio key or leverage the pre-configured server proxy.
              </p>

              <div className="mt-4">
                <div className="relative">
                  <input 
                    type={showKey ? "text" : "password"}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="Enter custom Gemini key..."
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all pr-9 font-mono"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                    title={showKey ? "Hide key" : "Show key"}
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSaveKey}
                  disabled={isSavingKey}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 active:scale-[0.98] transition-all min-h-[38px] flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Key</span>
                </button>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
                  title="Get free API key from Google AI Studio"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <button
                type="button"
                onClick={() => setShowLLMModal(true)}
                className="w-full py-2 px-3 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all flex items-center justify-center gap-1.5"
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Configure OpenAI, Anthropic, Ollama, OpenRouter & OAuth &raquo;</span>
              </button>
            </div>
          </div>

        </section>

        {showLLMModal && (
          <LLMProviderModal
            isOpen={showLLMModal}
            onClose={() => setShowLLMModal(false)}
            onSaved={() => {
              onKeyUpdate();
            }}
          />
        )}

        {/* Recent Research Snapshot (if any) */}
        {recentExperiments.length > 0 && (
          <section className="my-6 p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-slate-200 font-['Space_Grotesk'] uppercase tracking-wider">
                  Recent Investigations
                </h4>
              </div>
              <button 
                onClick={onOpenDatabase}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
              >
                View all ({experiments.length}) <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recentExperiments.map((exp) => (
                <div 
                  key={exp.id}
                  onClick={() => selectExperiment(exp.id)}
                  className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {exp.field || 'General Science'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Step {exp.currentStep || 1}/10
                      </span>
                    </div>
                    <h5 className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 line-clamp-1 transition-colors">
                      {exp.title}
                    </h5>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-500">
                      {new Date(exp.updatedAt || exp.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Resume <Play className="w-2.5 h-2.5 fill-current" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Feature Highlights Footer Bar */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-800/80 text-slate-400">
          <div className="flex items-center gap-2.5 p-2 rounded-lg">
            <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-slate-200 leading-tight">10-Step Method</p>
              <p className="text-[11px] text-slate-500 leading-tight">Ideation to paper</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-lg">
            <BarChart3 className="w-4 h-4 text-indigo-400 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-slate-200 leading-tight">Monte Carlo Sim</p>
              <p className="text-[11px] text-slate-500 leading-tight">In-browser data synthesis</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-slate-200 leading-tight">OSF Rigor Score</p>
              <p className="text-[11px] text-slate-500 leading-tight">Statistical verification</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-lg">
            <FileText className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-slate-200 leading-tight">Journal Export</p>
              <p className="text-[11px] text-slate-500 leading-tight">LaTeX, PDF, & Slides</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
