import React, { useState } from 'react';
import { 
  SPECIALIZED_AGENT_ROSTER, 
  SpecializedAgentRole 
} from '../../services/specializedHarnesses';
import { useToast } from '../../toast';
import { 
  ShieldCheck, 
  UserCheck, 
  BrainCircuit, 
  Cpu, 
  Target, 
  Lock, 
  Sliders, 
  CheckCircle2, 
  AlertOctagon, 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Search,
  Activity
} from 'lucide-react';

export const SpecializedAgentsView: React.FC = () => {
  const { addToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<'all' | 'ideation' | 'methodology' | 'modeling' | 'analysis' | 'epistemic_control'>('all');
  const [selectedRole, setSelectedRole] = useState<SpecializedAgentRole | null>(SPECIALIZED_AGENT_ROSTER[0]);
  const [searchFilter, setSearchFilter] = useState('');

  // Human Authority Gate Modal State
  const [humanSignedOff, setHumanSignedOff] = useState(false);
  const [groundTruthGatePassed, setGroundTruthGatePassed] = useState(true);

  // Filtered Roster
  const filteredRoles = SPECIALIZED_AGENT_ROSTER.filter(role => {
    const matchesCat = activeCategory === 'all' || role.category === activeCategory;
    const matchesQuery = !searchFilter || role.name.toLowerCase().includes(searchFilter.toLowerCase()) || role.purpose.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleGrantHumanSignoff = () => {
    setHumanSignedOff(true);
    addToast('Human Principal Investigator authority granted for consequential Phase Gate advancement.', 'success');
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                SCIENTIFIC ROSTER & LAB GOVERNANCE
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Scientific Ideation & Discovery Roles
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-['Space_Grotesk']">
              Scientific Specialists, Human Authority & Ground-Truth Gates
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-3xl">
              Specialized scientific agents across theoretical ideation, experimental methodology, in-silico kinetic modeling, 
              biostatistical analysis, and epistemic reproducibility controls.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={handleGrantHumanSignoff}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition-all ${
                humanSignedOff 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{humanSignedOff ? 'Human Sign-off Authorized' : 'Grant Human PI Sign-off'}</span>
            </button>
          </div>
        </div>

        {/* Process Improvement Dashboard Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-xs">
            <span className="text-slate-400 block mb-1">Cycle Time Reduction:</span>
            <div className="text-xl font-bold text-emerald-400">-42% vs Baseline</div>
            <span className="text-[10px] text-slate-500">Autonomous loop efficiency</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-xs">
            <span className="text-slate-400 block mb-1">Defect Rework Rate:</span>
            <div className="text-xl font-bold text-cyan-400">1.8% Rework</div>
            <span className="text-[10px] text-slate-500">Self-healing worker repair</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-xs">
            <span className="text-slate-400 block mb-1">Reviewer Effort:</span>
            <div className="text-xl font-bold text-indigo-400">4.5 hrs / Gate</div>
            <span className="text-[10px] text-slate-500">Targeted HMAP mediation</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-xs">
            <span className="text-slate-400 block mb-1">First-Pass Acceptance:</span>
            <div className="text-xl font-bold text-amber-400">94.2% Passed</div>
            <span className="text-[10px] text-slate-500">Ground-truth gate compliance</span>
          </div>
        </div>

        {/* Category Pills & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pb-2 border-b border-slate-800/60 font-mono text-xs">
          <div className="flex flex-wrap gap-2">
            {(['all', 'ideation', 'methodology', 'modeling', 'analysis', 'epistemic_control'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg transition-all uppercase text-[11px] font-bold ${
                  activeCategory === cat 
                    ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40' 
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search scientific agent roles..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-60"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-2 space-y-3 font-mono text-xs">
          {filteredRoles.map(role => (
            <div 
              key={role.roleId}
              onClick={() => setSelectedRole(role)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                selectedRole?.roleId === role.roleId 
                  ? 'bg-purple-950/20 border-purple-500/50 shadow-md' 
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    role.category === 'ideation' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                    role.category === 'methodology' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    role.category === 'modeling' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                    role.category === 'analysis' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  }`}>
                    {role.category.replace('_', ' ')}
                  </span>
                  <h3 className="font-bold text-white text-sm">{role.name}</h3>
                </div>

                <div className="text-[11px] text-slate-400">
                  Max: {role.budgetLimits.maxTokens} tok • {role.budgetLimits.maxIterations} iters
                </div>
              </div>

              <p className="text-slate-300 font-sans text-xs leading-relaxed mb-3">
                {role.purpose}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
                <span>Tools: {role.permittedTools.join(', ')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Role Sidebar Details */}
        <div className="space-y-4">
          {selectedRole ? (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-purple-500/30 font-mono text-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">
                  Role Specification
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-bold">
                  {selectedRole.roleId}
                </span>
              </div>

              <h2 className="text-lg font-bold text-white font-['Space_Grotesk'] mb-3">
                {selectedRole.name}
              </h2>

              <p className="text-slate-300 font-sans text-xs mb-4 leading-relaxed">
                {selectedRole.purpose}
              </p>

              {/* Bounded Specialist Constraints */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 block mb-1 font-bold">Permitted Operating Tools:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRole.permittedTools.map(tool => (
                      <span key={tool} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 text-[10px]">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1 font-bold">Enforced Resource Budgets:</span>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1 text-slate-300 text-[11px]">
                    <div className="flex justify-between">
                      <span>Max Output Tokens:</span>
                      <span className="text-cyan-300">{selectedRole.budgetLimits.maxTokens}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Iteration Ceiling:</span>
                      <span className="text-amber-300">{selectedRole.budgetLimits.maxIterations} runs</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Execution Timeout:</span>
                      <span className="text-slate-400">{selectedRole.budgetLimits.runtimeTimeoutSec}s</span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1 font-bold">Mandatory Deliverables:</span>
                  <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-0.5">
                    {selectedRole.deliverablesRequired.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1 font-bold">Stopping Conditions:</span>
                  <div className="p-2.5 rounded bg-rose-950/20 border border-rose-800/30 text-rose-300 text-[11px]">
                    {selectedRole.stoppingConditions.join(', ')}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center font-mono text-xs text-slate-500">
              Select an agent specialist to inspect operational instructions and budget boundaries.
            </div>
          )}

          {/* Ground-Truth Gate Status */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 font-mono text-xs">
            <h4 className="font-bold text-white mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Independent Gatekeeper Status</span>
            </h4>
            <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-2 text-slate-300">
              <div className="flex justify-between items-center">
                <span>Ground Truth Gate:</span>
                <span className="text-emerald-400 font-bold">PASS (Certified)</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Human PI Authority:</span>
                <span className={humanSignedOff ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {humanSignedOff ? 'AUTHORIZED' : 'PENDING APPROVAL'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
