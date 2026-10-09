import React, { useState } from 'react';
import { 
  SAMPLE_COMPETING_HYPOTHESES, 
  SAMPLE_TRADE_STUDY, 
  SAMPLE_FAILURE_CASES, 
  SAMPLE_CHALLENGE_PANEL,
  calculatePughScores,
  MethodologyTradeStudy,
  CompetingHypothesis,
  BoundaryFailureCase,
  ChallengePanelReviewer
} from '../../services/tradeStudies';
import { useToast } from '../../toast';
import { 
  GitBranch, 
  Scale, 
  ShieldAlert, 
  Users, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sliders, 
  HelpCircle, 
  RefreshCw, 
  Plus, 
  Trash2,
  FileCheck2,
  TrendingUp
} from 'lucide-react';

export const StructuredReasoningView: React.FC = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'hypotheses' | 'trade_study' | 'tot' | 'boundary' | 'challenge_panel'>('hypotheses');
  
  // Competing Hypotheses State
  const [hypotheses, setHypotheses] = useState<CompetingHypothesis[]>(SAMPLE_COMPETING_HYPOTHESES);
  const [selectedHyp, setSelectedHyp] = useState<CompetingHypothesis | null>(SAMPLE_COMPETING_HYPOTHESES[0]);

  // Trade Study State
  const [tradeStudy, setTradeStudy] = useState<MethodologyTradeStudy>(SAMPLE_TRADE_STUDY);
  const pughScores = calculatePughScores(tradeStudy);

  // Boundary Stress Cases State
  const [failureCases, setFailureCases] = useState<BoundaryFailureCase[]>(SAMPLE_FAILURE_CASES);

  // Challenge Panel State
  const [challengePanel, setChallengePanel] = useState<ChallengePanelReviewer[]>(SAMPLE_CHALLENGE_PANEL);

  // Tree of Thoughts (ToT) interactive state
  const [totLayer, setTotLayer] = useState<number>(3);
  const [totBranches, setTotBranches] = useState<{ id: string; name: string; score: number; pruned: boolean; reason?: string }[]>([
    { id: 'tot-1', name: 'Phosphodiesterase (PDE) Inhibition Pathway', score: 0.92, pruned: false },
    { id: 'tot-2', name: 'Cortical Microtubule Depolymerization', score: 0.58, pruned: true, reason: 'Failed confocal orientation check' },
    { id: 'tot-3', name: 'Auxin Polar Transport Carrier Blockade', score: 0.42, pruned: true, reason: 'PIN1/PIN2 localization unaffected in Step 6 assay' },
    { id: 'tot-4', name: 'Direct Calcium Channel Activation', score: 0.74, pruned: false }
  ]);

  const handleUpdateCriterionWeight = (critId: string, delta: number) => {
    setTradeStudy(ts => ({
      ...ts,
      criteria: ts.criteria.map(c => {
        if (c.id === critId) {
          const newWeight = Math.max(1, Math.min(5, c.weight + delta));
          return { ...c, weight: newWeight };
        }
        return c;
      })
    }));
  };

  const handleResolveChallengeBlocker = (reviewerId: string, blockerId: string) => {
    setChallengePanel(panel => panel.map(rev => {
      if (rev.id === reviewerId) {
        return {
          ...rev,
          blockersRaised: rev.blockersRaised.map(b => b.id === blockerId ? { ...b, resolved: true } : b)
        };
      }
      return rev;
    }));
    addToast('Virtual Reviewer blocker mitigated and confirmed in audit log.', 'success');
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                STRUCTURED REASONING & VIRTUAL CHALLENGES
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Epistemic Rigor & Anti-Bias
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-['Space_Grotesk']">
              Reasoning Trees, Trade Studies & Adversarial Audits
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-3xl">
              Falsifiable competing hypotheses, Pugh matrix multi-criteria design studies, boundary stress testing, 
              Tree-of-Thoughts candidate pruning, and diverse-model challenge panels.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 mt-6 pb-2 border-b border-slate-800/60 font-mono text-xs">
          <button
            onClick={() => setActiveTab('hypotheses')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'hypotheses' 
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <span>Competing Hypotheses Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('trade_study')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'trade_study' 
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Scale className="w-4 h-4 text-emerald-400" />
            <span>Pugh Trade Studies</span>
          </button>

          <button
            onClick={() => setActiveTab('tot')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'tot' 
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>Tree of Thoughts (ToT)</span>
          </button>

          <button
            onClick={() => setActiveTab('boundary')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'boundary' 
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Boundary Stress Testing</span>
          </button>

          <button
            onClick={() => setActiveTab('challenge_panel')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'challenge_panel' 
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span>Diverse-Model Challenge Panel</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
        {/* TAB 1: COMPETING HYPOTHESES MATRIX */}
        {activeTab === 'hypotheses' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Analysis of Competing Hypotheses (ACH)
              </h3>
              <p className="text-xs text-slate-400">
                Systematically weighs alternative theoretical explanations against empirical evidence to eliminate cognitive bias.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {hypotheses.map(hyp => (
                <div 
                  key={hyp.id}
                  onClick={() => setSelectedHyp(hyp)}
                  className={`p-5 rounded-xl border transition-all cursor-pointer ${
                    selectedHyp?.id === hyp.id 
                      ? 'bg-indigo-950/30 border-cyan-500/60 shadow-lg shadow-cyan-500/5' 
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {hyp.code}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                      hyp.status === 'leading' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                      hyp.status === 'contender' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                      'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}>
                      {hyp.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-sans mb-4 leading-relaxed font-medium">
                    {hyp.claim}
                  </p>

                  <div className="space-y-2 pt-3 border-t border-slate-800 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Epistemic Confidence:</span>
                      <span className="text-cyan-400 font-bold">{Math.round(hyp.epistemicConfidence * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Falsifiability:</span>
                      <span className="text-indigo-300 font-bold">{Math.round(hyp.falsifiabilityScore * 100)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Hypothesis Falsification Criteria */}
            {selectedHyp && (
              <div className="p-5 rounded-xl bg-slate-900/80 border border-cyan-500/30 font-mono text-xs">
                <h4 className="text-xs font-bold text-cyan-400 uppercase mb-2">
                  Formal Falsification Threshold: {selectedHyp.code}
                </h4>
                <p className="text-slate-300 mb-4 font-sans text-sm">
                  "{selectedHyp.falsificationCondition}"
                </p>
                <div className="flex flex-wrap gap-4 text-slate-400 text-[11px] pt-3 border-t border-slate-800">
                  <span>Linked Supporting Evidence: <strong className="text-emerald-400">{selectedHyp.supportingEvidenceIds.join(', ') || 'None'}</strong></span>
                  <span>Linked Falsifying Evidence: <strong className="text-rose-400">{selectedHyp.falsifyingEvidenceIds.join(', ') || 'None'}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PUGH TRADE STUDIES */}
        {activeTab === 'trade_study' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                {tradeStudy.title}
              </h3>
              <p className="text-xs text-slate-400">
                {tradeStudy.problemStatement}
              </p>
            </div>

            {/* Pugh Matrix Scoring Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Evaluation Criteria</th>
                    <th className="py-3 px-4 text-center">Weight</th>
                    {tradeStudy.candidates.map(cand => (
                      <th key={cand.id} className="py-3 px-4">
                        <div className="text-white font-bold">{cand.name.split(' (')[0]}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{cand.technique}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tradeStudy.criteria.map(crit => (
                    <tr key={crit.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 text-slate-200 font-medium">
                        {crit.name}
                        {crit.unit && <span className="text-slate-400 text-[10px] ml-1">({crit.unit})</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                          <button 
                            onClick={() => handleUpdateCriterionWeight(crit.id, -1)}
                            className="text-slate-400 hover:text-white"
                          >-</button>
                          <span className="text-cyan-400 font-bold">{crit.weight}</span>
                          <button 
                            onClick={() => handleUpdateCriterionWeight(crit.id, 1)}
                            className="text-slate-400 hover:text-white"
                          >+</button>
                        </div>
                      </td>
                      {tradeStudy.candidates.map(cand => (
                        <td key={cand.id} className="py-3 px-4">
                          <span className="text-sm font-bold text-white">
                            {cand.scores[crit.id] ?? 3} / 5
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-slate-900 font-bold text-sm border-t-2 border-slate-700">
                    <td className="py-4 px-4 text-cyan-300">Weighted Total Score</td>
                    <td className="py-4 px-4 text-center text-slate-400">—</td>
                    {tradeStudy.candidates.map(cand => {
                      const scoreInfo = pughScores[cand.id];
                      const isWinner = cand.id === tradeStudy.selectedCandidateId;
                      return (
                        <td key={cand.id} className="py-4 px-4">
                          <div className={`text-base ${isWinner ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {scoreInfo.totalScore} pts
                          </div>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                            isWinner ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                          }`}>
                            Rank #{scoreInfo.rank} {isWinner && '• SELECTED'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Preserved Dissent Log */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-xs">
              <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Preserved Minority Dissent & Residual Risk Log</span>
              </h4>
              <div className="space-y-2">
                {tradeStudy.dissentLog.map((dissent, idx) => (
                  <div key={idx} className="p-3 rounded bg-slate-950 border border-slate-800 text-slate-300">
                    <div className="text-amber-400 font-bold mb-1">{dissent.reviewerRole}:</div>
                    <p className="text-slate-300 text-xs italic">"{dissent.objectionReason}"</p>
                    <div className="text-[10px] text-slate-500 mt-2">
                      Residual Risk Accepted by Human Principal Investigator: <strong className="text-emerald-400">YES</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TREE OF THOUGHTS (ToT) */}
        {activeTab === 'tot' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Formal 5-Layer Tree of Thoughts (ToT)
              </h3>
              <p className="text-xs text-slate-400">
                Explores candidate hypothesis paths, evaluates intermediate alternatives, and backtracks with recorded pruning rationale.
              </p>
            </div>

            {/* Stepper for 5 Layers */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs">
              {[1, 2, 3, 4, 5].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setTotLayer(lvl)}
                  className={`flex-1 py-2 rounded-lg text-center transition-all ${
                    totLayer === lvl 
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Layer {lvl}: {lvl === 1 ? 'Problem Scope' : lvl === 2 ? 'Variables' : lvl === 3 ? 'Causal Paths' : lvl === 4 ? 'SAP Protocol' : 'Final Synthesis'}
                </button>
              ))}
            </div>

            {/* Candidate Branches */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
              {totBranches.map(branch => (
                <div 
                  key={branch.id} 
                  className={`p-4 rounded-xl border transition-all ${
                    branch.pruned 
                      ? 'bg-slate-950/60 border-slate-800/80 opacity-60' 
                      : 'bg-slate-900/80 border-cyan-500/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white">{branch.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      branch.pruned ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {branch.pruned ? 'PRUNED' : 'SURVIVOR'}
                    </span>
                  </div>

                  <div className="text-slate-400 mb-3">
                    Evaluation Score: <strong className="text-cyan-300">{Math.round(branch.score * 100)} / 100</strong>
                  </div>

                  {branch.pruned && branch.reason && (
                    <div className="p-2.5 rounded bg-rose-950/20 border border-rose-800/40 text-rose-300 text-[11px]">
                      <strong>Pruning Reason:</strong> {branch.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: BOUNDARY & FAILURE CASES */}
        {activeTab === 'boundary' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Boundary Condition Stress Testing & Failure Mode Analysis
              </h3>
              <p className="text-xs text-slate-400">
                Challenges physical and simulated parameters well outside nominal operating envelopes to verify failure behaviors.
              </p>
            </div>

            <div className="space-y-4 font-mono text-xs">
              {failureCases.map(fc => (
                <div key={fc.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                        {fc.parameterName}
                      </span>
                      <span className="text-slate-400 text-xs">
                        Nominal: {fc.nominalValue}{fc.unit} ➔ Stress: <strong className="text-rose-400">{fc.stressValue}{fc.unit}</strong>
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      fc.testOutcome === 'passed_safe' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                      fc.testOutcome === 'graceful_degradation' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                      'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}>
                      {fc.testOutcome.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs mb-3 font-sans">
                    <strong>Biological Failure Mode:</strong> {fc.biologicalFailureMode}
                  </p>

                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-emerald-300 text-[11px]">
                    <strong>Mitigation Guardrail:</strong> {fc.mitigationStrategy}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: DIVERSE-MODEL CHALLENGE PANEL */}
        {activeTab === 'challenge_panel' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Virtual Peer Review & Adversarial Challenge Panel
              </h3>
              <p className="text-xs text-slate-400">
                Multi-persona critique panel simulating independent peer reviewers (Methodologist, Statistician, Bioethics Steward) to prevent echo-chamber blind spots.
              </p>
            </div>

            <div className="space-y-4 font-mono text-xs">
              {challengePanel.map(reviewer => (
                <div key={reviewer.id} className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white">{reviewer.personaName}</h4>
                      <span className="text-[10px] text-cyan-400 uppercase tracking-widest">{reviewer.archetype.replace('_', ' ')}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Rigor Score:</span>
                      <span className="text-sm font-bold text-emerald-400">{reviewer.rating} / 10</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed mb-4">
                    "{reviewer.critiqueText}"
                  </p>

                  {/* Blockers Raised */}
                  {reviewer.blockersRaised.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-slate-800">
                      <div className="text-[11px] font-bold text-amber-400 uppercase">Reviewer Audit Blockers:</div>
                      {reviewer.blockersRaised.map(b => (
                        <div key={b.id} className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
                          <span className={`text-xs ${b.resolved ? 'line-through text-slate-500' : 'text-amber-300'}`}>
                            {b.msg}
                          </span>
                          {!b.resolved ? (
                            <button
                              onClick={() => handleResolveChallengeBlocker(reviewer.id, b.id)}
                              className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold transition-all"
                            >
                              Resolve
                            </button>
                          ) : (
                            <span className="text-emerald-400 text-[10px] font-bold">MITIGATED</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
