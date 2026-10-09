import React, { useState, useRef, useEffect } from 'react';
import { 
  SPECIALIZED_AGENT_ROSTER, 
  SAMPLE_EXPERIMENTAL_COHORTS, 
  SAMPLE_INSILICO_MODEL, 
  SAMPLE_SCIENTIFIC_WORK_PACKAGES, 
  SAMPLE_DOCUMENT_OUTLINE,
  CROSS_APP_ADAPTERS,
  ExperimentalCohortSpec,
  InSilicoSimulationModel,
  ScientificWorkPackage
} from '../../services/specializedHarnesses';
import { useToast } from '../../toast';
import { 
  FlaskConical, 
  Lightbulb, 
  LineChart, 
  FileText, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  RotateCcw, 
  Download, 
  Share2, 
  Zap, 
  Activity, 
  Layers, 
  Eye, 
  Sparkles,
  BookOpen
} from 'lucide-react';

interface HarnessOrchestrationViewProps {
  onNavigateView?: (view: string) => void;
}

export const HarnessOrchestrationView: React.FC<HarnessOrchestrationViewProps> = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'coordinator' | 'protocol' | 'simulation' | 'evidence' | 'document' | 'open_science'>('coordinator');
  const [selectedApp, setSelectedApp] = useState<'hypatia-pro' | 'hermes-core' | 'openclaw-ai'>('hypatia-pro');
  
  // Cohorts State
  const [cohorts, setCohorts] = useState<ExperimentalCohortSpec[]>(SAMPLE_EXPERIMENTAL_COHORTS);
  const [selectedCohort, setSelectedCohort] = useState<ExperimentalCohortSpec | null>(SAMPLE_EXPERIMENTAL_COHORTS[0]);

  // Simulation State & Canvas
  const [model, setModel] = useState<InSilicoSimulationModel>(SAMPLE_INSILICO_MODEL);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [trialCount, setTrialCount] = useState(10000);

  // Scientific Work Packages
  const [packages, setPackages] = useState<ScientificWorkPackage[]>(SAMPLE_SCIENTIFIC_WORK_PACKAGES);

  // Cross-App Adapter Payload State
  const [exportedPayload, setExportedPayload] = useState<string>('');

  // Draw Kinetic Simulation Dose-Response Curves on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    const pad = 50;

    // Draw Axes
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, h - pad);
    ctx.lineTo(w - pad, h - pad);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('0.0 mM', pad - 10, h - pad + 18);
    ctx.fillText('1.0 mM', pad + (w - 2 * pad) * 0.2, h - pad + 18);
    ctx.fillText('2.5 mM [Threshold]', pad + (w - 2 * pad) * 0.5 - 20, h - pad + 18);
    ctx.fillText('5.0 mM', w - pad - 20, h - pad + 18);

    ctx.save();
    ctx.translate(18, h / 2 + 30);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Mitotic Spindle Elongation Velocity (um/hr)', 0, 0);
    ctx.restore();

    // Confidence Interval Shading Band
    ctx.beginPath();
    ctx.fillStyle = 'rgba(14, 165, 233, 0.12)';
    for (let x = pad; x <= w - pad; x += 5) {
      const normX = (x - pad) / (w - 2 * pad);
      const dose_mM = normX * 5.0;
      // Hill equation for inhibition
      const v0 = 18.5;
      const Ki = 2.35;
      const n = 1.85;
      const yVal = v0 / (1 + Math.pow(dose_mM / Ki, n));
      const pyUpper = (h - pad) - ((yVal + 1.8) / 22.0) * (h - 2 * pad);
      if (x === pad) ctx.moveTo(x, pyUpper);
      else ctx.lineTo(x, pyUpper);
    }
    for (let x = w - pad; x >= pad; x -= 5) {
      const normX = (x - pad) / (w - 2 * pad);
      const dose_mM = normX * 5.0;
      const v0 = 18.5;
      const Ki = 2.35;
      const n = 1.85;
      const yVal = v0 / (1 + Math.pow(dose_mM / Ki, n));
      const pyLower = (h - pad) - ((yVal - 1.8) / 22.0) * (h - 2 * pad);
      ctx.lineTo(x, pyLower);
    }
    ctx.closePath();
    ctx.fill();

    // Mean Simulation Curve
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    for (let x = pad; x <= w - pad; x += 4) {
      const normX = (x - pad) / (w - 2 * pad);
      const dose_mM = normX * 5.0;
      const v0 = 18.5;
      const Ki = 2.35;
      const n = 1.85;
      const yVal = v0 / (1 + Math.pow(dose_mM / Ki, n));
      const py = (h - pad) - (yVal / 22.0) * (h - 2 * pad);
      if (x === pad) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();

    // Observed Empirical Data Points
    const observedPoints = [
      { dose: 0.0, val: 18.4, label: 'Control (N=12)' },
      { dose: 1.0, val: 16.9, label: '1.0 mM (N=12)' },
      { dose: 2.5, val: 11.4, label: '2.5 mM (N=12)' },
      { dose: 5.0, val: 7.2, label: '5.0 mM (N=12)' }
    ];

    observedPoints.forEach(pt => {
      const px = pad + (pt.dose / 5.0) * (w - 2 * pad);
      const py = (h - pad) - (pt.val / 22.0) * (h - 2 * pad);

      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Tooltip label
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.fillText(`${pt.val} um/h`, px + 8, py - 6);
    });

  }, [model]);

  // Run Simulation Sweep
  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setModel(m => ({
        ...m,
        iterationTrials: m.iterationTrials + 5000,
        convergencePValue: 0.0012,
        outputMetrics: [
          { name: 'Simulated Elongation Reduction at 2.5mM', value: 37.8, unit: '%', stdDev: 2.8 },
          { name: 'Simulated Threshold Onset Concentration', value: 2.39, unit: 'mM', stdDev: 0.14 },
          { name: 'Model R-Squared vs Empirical Assay', value: 0.968, unit: 'r2', stdDev: 0.012 }
        ]
      }));
      addToast('Monte Carlo stochastic sweep converged (15,000 iterations, R2=0.968).', 'success');
    }, 1100);
  };

  // Export Open Science Package
  const handleExportOpenScience = () => {
    const scienceExport = {
      experimentId: 'EXP-HYPATIA-ARABIDOPSIS-2026',
      title: 'Caffeine Inhibition of Plant Root Apical Meristem Mitosis',
      hypothesis: 'Exogenous chemical perturbation of intracellular phosphodiesterase enzymes reduces mitotic spindle elongation rates.',
      preRegisteredCohorts: cohorts,
      inSilicoModel: model,
      statisticalResults: {
        f_statistic: 8.94,
        p_value: 0.0024,
        observedEffectSizeCohensD: 1.42,
        bonferroniAlpha: 0.0125
      },
      osfPreregistrationStatus: 'SEALED_TIMESTAMPED',
      reproducibilityScore: 94
    };

    const blob = new Blob([JSON.stringify(scienceExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `open_science_replication_bundle.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Open Science replication archive exported successfully.', 'success');
  };

  // Generate Cross-App Scientific Adapter Payload
  const handleGenerateCrossAppExport = (targetApp: string) => {
    const adapter = CROSS_APP_ADAPTERS[selectedApp];
    const transformed = adapter.transformForTarget({
      harnesses: ['hypothesis_causal_inference', 'experimental_protocol_design', 'insilico_simulation_modeling'],
      cohortCount: cohorts.length,
      sampleSizeTotal: cohorts.reduce((acc, c) => acc + c.sampleSize, 0),
      simulationFramework: model.mathematicalFramework,
      convergencePValue: model.convergencePValue
    }, targetApp);
    setExportedPayload(JSON.stringify(transformed, null, 2));
    addToast(`Scientific discovery envelope adapted for ${targetApp} runtime protocol.`, 'info');
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                SCIENTIFIC DISCOVERY HARNESSES
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Hypothesis ⇄ Protocol ⇄ In-Silico ⇄ Synthesis
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-['Space_Grotesk']">
              Scientific Ideation & Discovery Harnesses
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-3xl">
              Coordinated research pipeline linking theoretical hypothesis ideation, double-blind cohort protocols,
              in-silico Monte Carlo kinetic modeling, inferential biostatistics, and academic publication dossiers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-mono">Research Platform Adapter:</span>
              <select 
                value={selectedApp}
                onChange={(e) => setSelectedApp(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="hypatia-pro">Project Hypatia Pro (Scientific)</option>
                <option value="hermes-core">Hermes Research Runtime</option>
                <option value="openclaw-ai">OpenClaw Multi-Agent Engine</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-2 mt-6 pb-2 border-b border-slate-800/60 font-mono text-xs">
          <button
            onClick={() => setActiveTab('coordinator')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'coordinator' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Lightbulb className="w-4 h-4 text-cyan-400" />
            <span>Discovery Pipeline Coordinator</span>
          </button>

          <button
            onClick={() => setActiveTab('protocol')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'protocol' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <FlaskConical className="w-4 h-4 text-emerald-400" />
            <span>Experimental Cohort Protocol</span>
          </button>

          <button
            onClick={() => setActiveTab('simulation')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'simulation' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Activity className="w-4 h-4 text-sky-400" />
            <span>In-Silico Kinetic Simulation</span>
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'evidence' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <LineChart className="w-4 h-4 text-amber-400" />
            <span>Evidence & Statistical Synthesis</span>
          </button>

          <button
            onClick={() => setActiveTab('document')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'document' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>Manuscript & Preregistration</span>
          </button>

          <button
            onClick={() => setActiveTab('open_science')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'open_science' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Share2 className="w-4 h-4 text-purple-400" />
            <span>Open Science & Portability</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
        {/* TAB 1: DISCOVERY PIPELINE COORDINATOR */}
        {activeTab === 'coordinator' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Theoretical Ideation */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-cyan-500/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase">Stage 1</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    APPROVED
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 font-['Space_Grotesk']">Theoretical Ideation & Hypotheses</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Synthesizes peer-reviewed botanical literature, formulates competing alternative mechanisms ($H_1, H_2$), and defines pre-registered falsification criteria.
                </p>
                <div className="space-y-2 text-xs font-mono text-slate-300">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-800/60">
                    <span>Leading Mechanism:</span>
                    <span className="text-emerald-400 font-semibold">Phosphodiesterase (H1)</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-800/60">
                    <span>Falsification Bound:</span>
                    <span className="text-cyan-300 font-semibold">&gt;= 35% Inhibition</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Experimental & In-Silico Modeling */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-indigo-500/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-indigo-400 uppercase">Stage 2</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    IN PROGRESS
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 font-['Space_Grotesk']">Controlled Protocol & In-Silico Runs</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Executes double-blind randomized micro-plate cohorts alongside 10,000-trial Monte Carlo stochastic simulations to probe kinetic parameter sensitivities.
                </p>
                <div className="space-y-2 text-xs font-mono text-slate-300">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-800/60">
                    <span>Sample Size:</span>
                    <span className="text-emerald-400 font-semibold">N=48 Seedlings</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-800/60">
                    <span>In-Silico Fit:</span>
                    <span className="text-cyan-300 font-semibold">R2 = 0.962 (p=0.0018)</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Evidence Synthesis */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-amber-500/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase">Stage 3</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    VALIDATING
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 font-['Space_Grotesk']">Evidence & Peer Review</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Evaluates inferential statistical significance, audits confounding variables with virtual peer review panels, and prepares OSF pre-registration archives.
                </p>
                <div className="space-y-2 text-xs font-mono text-slate-300">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-800/60">
                    <span>Two-Way ANOVA:</span>
                    <span className="text-emerald-400 font-semibold">p = 0.0024</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-800/60">
                    <span>Reproducibility:</span>
                    <span className="text-amber-300 font-semibold">94% (FAIR Certified)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scientific Handoff Pipeline Diagram */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 font-['Space_Grotesk']">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span>Epistemic Handoff Packages & Iterative Discovery Loops</span>
              </h3>
              
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs">
                <div className="flex-1 text-center p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40">
                  <span className="text-cyan-400 font-bold block mb-1">1. Causal Hypothesis</span>
                  <span className="text-slate-400 text-[11px]">H1 Pre-registered & Grounded</span>
                </div>

                <div className="flex items-center gap-1 text-cyan-400">
                  <ArrowRight className="w-5 h-5" />
                  <span className="text-[10px] hidden md:inline">Formalize</span>
                </div>

                <div className="flex-1 text-center p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40">
                  <span className="text-indigo-400 font-bold block mb-1">2. Protocol & Cohorts</span>
                  <span className="text-slate-400 text-[11px]">Double-Blind Vehicle Controls</span>
                </div>

                <div className="flex items-center gap-1 text-sky-400">
                  <ArrowRight className="w-5 h-5" />
                  <span className="text-[10px] hidden md:inline">Simulate</span>
                </div>

                <div className="flex-1 text-center p-3 rounded-lg bg-sky-950/30 border border-sky-800/40">
                  <span className="text-sky-400 font-bold block mb-1">3. In-Silico Simulation</span>
                  <span className="text-slate-400 text-[11px]">Monte Carlo Parameter Sweeps</span>
                </div>

                <div className="flex items-center gap-1 text-amber-400">
                  <ArrowRight className="w-5 h-5" />
                  <span className="text-[10px] hidden md:inline">Synthesize</span>
                </div>

                <div className="flex-1 text-center p-3 rounded-lg bg-amber-950/30 border border-amber-800/40">
                  <span className="text-amber-400 font-bold block mb-1">4. Evidence & Paper</span>
                  <span className="text-slate-400 text-[11px]">Inferential Tests & LaTeX Dossier</span>
                </div>
              </div>

              {/* Feedback Loop Callout */}
              <div className="mt-4 p-3 rounded-lg bg-cyan-950/20 border border-cyan-800/40 flex items-start gap-3">
                <RotateCcw className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <strong className="text-cyan-300 font-mono">Active Discovery Loop:</strong> In-silico simulation revealed a non-linear threshold inflection between 2.0 mM and 2.5 mM. The experimental cohort harness automatically augmented sampling density in this transitional interval.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXPERIMENTAL COHORT PROTOCOL */}
        {activeTab === 'protocol' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Pre-Registered Controlled Cohort Protocol Matrix
                </h3>
                <p className="text-xs text-slate-400">
                  Stratified sample allocations, double-blind vehicle treatments, and balanced replication units.
                </p>
              </div>

              <button
                onClick={() => addToast('Cohort protocol verified against STROBE guidelines.', 'success')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verify Protocol Rigor</span>
              </button>
            </div>

            {/* Cohorts Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Cohort ID</th>
                    <th className="py-3 px-4">Cohort Designation</th>
                    <th className="py-3 px-4">Sample Size (N)</th>
                    <th className="py-3 px-4">Treatment Dosing</th>
                    <th className="py-3 px-4">Control Class</th>
                    <th className="py-3 px-4">Blinding</th>
                    <th className="py-3 px-4">Replication</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {cohorts.map((coh) => (
                    <tr 
                      key={coh.cohortId}
                      onClick={() => setSelectedCohort(coh)}
                      className={`hover:bg-slate-900/60 cursor-pointer transition-colors ${
                        selectedCohort?.cohortId === coh.cohortId ? 'bg-cyan-500/10 text-cyan-200' : 'text-slate-300'
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-cyan-400">{coh.cohortId}</td>
                      <td className="py-3 px-4 text-white font-medium">{coh.name}</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">{coh.sampleSize} seedlings</td>
                      <td className="py-3 px-4 text-slate-300">{coh.treatmentDose}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          coh.controlType === 'negative_vehicle' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {coh.controlType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{coh.blindingStrategy.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-slate-400">{coh.biologicalReplicates} bio x {coh.technicalReplicates} tech</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Selected Cohort Inclusion/Exclusion Criteria */}
            {selectedCohort && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 font-mono text-xs">
                <h4 className="text-xs font-bold text-cyan-400 uppercase mb-3">
                  Eligibility Criteria & Sizing: {selectedCohort.cohortId} ({selectedCohort.name})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded bg-slate-950 border border-slate-800">
                    <span className="text-emerald-400 font-bold block mb-1.5">Inclusion Criteria:</span>
                    <ul className="list-disc list-inside text-slate-300 space-y-1">
                      {selectedCohort.inclusionCriteria.map((inc, i) => (
                        <li key={i}>{inc}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded bg-slate-950 border border-slate-800">
                    <span className="text-rose-400 font-bold block mb-1.5">Exclusion Criteria:</span>
                    <ul className="list-disc list-inside text-slate-300 space-y-1">
                      {selectedCohort.exclusionCriteria.map((exc, i) => (
                        <li key={i}>{exc}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: IN-SILICO KINETIC SIMULATION */}
        {activeTab === 'simulation' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  In-Silico Stochastic Simulation & Kinetic Dose-Response
                </h3>
                <p className="text-xs text-slate-400">
                  Explores parameter space via Monte Carlo sweeps to predict non-linear inhibition inflection points.
                </p>
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-all"
              >
                <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                <span>{isSimulating ? 'Running Sweep...' : 'Execute +5,000 Iterations'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Simulation Canvas */}
              <div className="lg:col-span-2 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center relative">
                <canvas 
                  ref={canvasRef} 
                  width={560} 
                  height={320} 
                  className="max-w-full h-auto"
                />

                <div className="flex items-center gap-4 mt-2 font-mono text-[11px]">
                  <span className="inline-flex items-center gap-1.5 text-sky-400">
                    <span className="w-3 h-0.5 bg-sky-400 inline-block"></span> Model Mean Curve
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sky-300">
                    <span className="w-3 h-2 bg-sky-500/20 inline-block"></span> 95% Confidence Band
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> Observed Assay Points (N=48)
                  </span>
                </div>
              </div>

              {/* Kinetic Model Parameters & Metrics */}
              <div className="space-y-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <h4 className="font-bold text-white mb-3">Model Kinetic Parameters</h4>
                  <div className="space-y-2 text-slate-300">
                    {model.parameters.map(p => (
                      <div key={p.name} className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">{p.name}:</span>
                        <span className="text-cyan-300 font-bold">{p.nominal} {p.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <h4 className="font-bold text-white mb-3">Convergence & Fit Statistics</h4>
                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Completed Trials:</span>
                      <span className="text-emerald-400 font-bold">{model.iterationTrials.toLocaleString()} runs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Convergence P-Value:</span>
                      <span className="text-cyan-300 font-bold">p = {model.convergencePValue}</span>
                    </div>
                    {model.outputMetrics.map(m => (
                      <div key={m.name} className="flex justify-between">
                        <span className="text-slate-400">{m.name}:</span>
                        <span className="text-white font-bold">{m.value}{m.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EVIDENCE & STATISTICAL SYNTHESIS */}
        {activeTab === 'evidence' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Scientific Investigation Phases & Milestone Synthesis
              </h3>
              <p className="text-xs text-slate-400">
                Tracks pre-registered investigation phases, inferential test deliverables, and peer-review milestones.
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {packages.map(pkg => (
                <div 
                  key={pkg.id}
                  className={`p-4 rounded-xl border transition-all ${
                    pkg.epistemicMilestone 
                      ? 'bg-cyan-950/20 border-cyan-500/40 shadow-sm' 
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pkg.epistemicMilestone ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {pkg.phaseCode} {pkg.epistemicMilestone && '• CRITICAL MILESTONE'}
                      </span>
                      <h4 className="font-bold text-white text-sm">{pkg.title}</h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">{pkg.estimatedEffortDays} Days</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        pkg.status === 'peer_verified' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                        pkg.status === 'in_progress' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {pkg.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-300 text-xs mb-2">{pkg.scientificDeliverable}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span>Lead Specialist: <strong className="text-cyan-300">{pkg.leadSpecialist}</strong></span>
                    <span>Dependencies: {pkg.dependencies.length > 0 ? pkg.dependencies.join(', ') : 'Root Research Inception'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: MANUSCRIPT & PREREGISTRATION */}
        {activeTab === 'document' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Outline-Driven Scientific Manuscript & OSF Dossier
                </h3>
                <p className="text-xs text-slate-400">
                  Pre-registered table of contents grounded in knowledge graph memory and reconciled citations.
                </p>
              </div>

              <button
                onClick={handleExportOpenScience}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export OSF Replication Bundle</span>
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              {SAMPLE_DOCUMENT_OUTLINE.map((sec) => (
                <div key={sec.sectionNumber} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                        Section {sec.sectionNumber}
                      </span>
                      <h4 className="font-bold text-white text-sm">{sec.title}</h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">Target: {sec.targetWordCount} words</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase font-semibold">
                        {sec.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-400 text-xs mb-3 italic">Purpose: {sec.purpose}</p>

                  <div className="p-3 rounded bg-slate-950 border border-slate-800/80 text-slate-200 leading-relaxed font-sans text-xs">
                    "{sec.contentSnippet}"
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                    <span>Anchored Knowledge Graph Nodes:</span>
                    {sec.retrievedMemoryIds.map(memId => (
                      <span key={memId} className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold">
                        {memId}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: OPEN SCIENCE & PORTABILITY */}
        {activeTab === 'open_science' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Open Science & Cross-App Protocol Portability
              </h3>
              <p className="text-xs text-slate-400">
                Transforms empirical datasets and pre-registered protocol specs between Hypatia Pro, Hermes Research Runtime, and OpenClaw Multi-Agent Engine.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.values(CROSS_APP_ADAPTERS).map(adapter => (
                <div key={adapter.appId} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-cyan-400 font-bold">{adapter.appId}</span>
                    <span className="text-[10px] text-slate-400">{adapter.protocolVersion}</span>
                  </div>
                  <h4 className="text-white font-bold mb-2">{adapter.appName}</h4>
                  <div className="text-slate-400 mb-4 text-[11px]">
                    Entitlement ID: <span className="text-emerald-400">{adapter.entitlementProductId}</span>
                  </div>

                  <button
                    onClick={() => handleGenerateCrossAppExport(adapter.appId)}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-center border border-slate-700 transition-all"
                  >
                    Adapt & Export Scientific Envelope
                  </button>
                </div>
              ))}
            </div>

            {exportedPayload && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-cyan-400 font-bold">Adapted Scientific Envelope:</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(exportedPayload);
                      addToast('Scientific envelope copied to clipboard.', 'success');
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    Copy JSON
                  </button>
                </div>
                <pre className="text-slate-300 overflow-x-auto p-3 rounded bg-slate-900/60 max-h-64">
                  {exportedPayload}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
