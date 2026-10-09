import React, { useState, useRef, useEffect } from 'react';
import { 
  INITIAL_KNOWLEDGE_NODES, 
  INITIAL_KNOWLEDGE_EDGES, 
  runConsistencyAudit, 
  computeChangeImpact,
  KnowledgeNode, 
  KnowledgeEdge, 
  ConsistencyIssue, 
  ChangeImpactAnalysis,
  EvidenceClass,
  NodeType
} from '../../services/knowledgeGraph';
import { useToast } from '../../toast';
import { 
  Network, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  Layers, 
  Filter, 
  Activity, 
  ShieldAlert, 
  ArrowRight,
  Info
} from 'lucide-react';

export const KnowledgeGraphView: React.FC = () => {
  const { addToast } = useToast();
  const [nodes, setNodes] = useState<KnowledgeNode[]>(INITIAL_KNOWLEDGE_NODES);
  const [edges, setEdges] = useState<KnowledgeEdge[]>(INITIAL_KNOWLEDGE_EDGES);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(INITIAL_KNOWLEDGE_NODES[0]);
  const [filterClass, setFilterClass] = useState<EvidenceClass | 'all'>('all');
  
  // Consistency Audit State
  const [issues, setIssues] = useState<ConsistencyIssue[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);

  // Impact Analysis State
  const [impactAnalysis, setImpactAnalysis] = useState<ChangeImpactAnalysis | null>(null);

  // Canvas View State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Run initial consistency audit on mount
  useEffect(() => {
    const auditResults = runConsistencyAudit(nodes, edges);
    setIssues(auditResults);
    if (selectedNode) {
      setImpactAnalysis(computeChangeImpact(selectedNode.id, nodes, edges));
    }
  }, [nodes, edges]);

  // When selected node changes, recompute impact analysis
  useEffect(() => {
    if (selectedNode) {
      setImpactAnalysis(computeChangeImpact(selectedNode.id, nodes, edges));
    } else {
      setImpactAnalysis(null);
    }
  }, [selectedNode]);

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Filter nodes if needed
    const visibleNodes = nodes.filter(n => {
      const matchesClass = filterClass === 'all' || n.evidenceClass === filterClass;
      const matchesSearch = !searchQuery || n.label.toLowerCase().includes(searchQuery.toLowerCase()) || n.stableId.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesClass && matchesSearch;
    });

    const nodePositions = new Map<string, { x: number; y: number }>();

    // Position nodes radially or in layered clusters
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const count = visibleNodes.length;

    visibleNodes.forEach((node, i) => {
      const angle = (i * 2 * Math.PI) / count;
      const radius = 130 + (i % 2) * 45;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      nodePositions.set(node.id, { x, y });
    });

    // Draw Edges
    edges.forEach(edge => {
      const src = nodePositions.get(edge.sourceId);
      const tgt = nodePositions.get(edge.targetId);
      if (src && tgt) {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = edge.relationship === 'supports' ? 'rgba(52, 211, 153, 0.5)' :
                          edge.relationship === 'falsifies' ? 'rgba(244, 63, 94, 0.6)' :
                          'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Relationship label along midpoint
        const mx = (src.x + tgt.x) / 2;
        const my = (src.y + tgt.y) / 2;
        ctx.fillStyle = '#64748b';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillText(edge.relationship, mx - 15, my);
      }
    });

    // Draw Nodes
    visibleNodes.forEach(node => {
      const pos = nodePositions.get(node.id);
      if (!pos) return;

      const isSelected = selectedNode?.id === node.id;
      const isImpacted = impactAnalysis?.directDependents.some(d => d.id === node.id) || impactAnalysis?.indirectDependents.some(d => d.id === node.id);

      // Node Outer Halo
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected ? 22 : 18, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.3)' :
                      isImpacted ? 'rgba(251, 191, 36, 0.25)' :
                      'rgba(15, 23, 42, 0.8)';
      ctx.fill();

      // Node Border
      ctx.strokeStyle = isSelected ? '#38bdf8' :
                        isImpacted ? '#f59e0b' :
                        node.evidenceClass === 'observed' ? '#10b981' :
                        node.evidenceClass === 'calculated_modeled' ? '#6366f1' :
                        node.evidenceClass === 'assumption' ? '#f59e0b' :
                        '#94a3b8';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Node Inner Circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = node.evidenceClass === 'observed' ? '#10b981' :
                      node.evidenceClass === 'calculated_modeled' ? '#6366f1' :
                      node.evidenceClass === 'assumption' ? '#f59e0b' :
                      '#64748b';
      ctx.fill();

      // Stable ID Label
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(node.stableId, pos.x, pos.y + 32);
    });

  }, [nodes, edges, selectedNode, filterClass, searchQuery, impactAnalysis]);

  // Click on canvas to select node
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const visibleNodes = nodes.filter(n => filterClass === 'all' || n.evidenceClass === filterClass);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const count = visibleNodes.length;

    visibleNodes.forEach((node, i) => {
      const angle = (i * 2 * Math.PI) / count;
      const radius = 130 + (i % 2) * 45;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      const dist = Math.hypot(clickX - x, clickY - y);
      if (dist < 25) {
        setSelectedNode(node);
      }
    });
  };

  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const res = runConsistencyAudit(nodes, edges);
      setIssues(res);
      setIsAuditing(false);
      addToast(`Consistency audit complete: ${res.length} check(s) flagged.`, res.some(i => i.severity === 'critical') ? 'warning' : 'success');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                WIKI MEMORY & GRAPH RELATIONSHIPS
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                GraphRAG & Traceability
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-['Space_Grotesk']">
              Persistent Knowledge Graph & Consistency Engine
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-3xl">
              Connects empirical claims to sources, requirements to tests, components to CAD, and decisions to affected work.
              Audits conflicting numerical tolerances, stale assumptions, and computes downstream change impact.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              <span>{isAuditing ? 'Auditing Consistency...' : 'Run Consistency Audit'}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Filter Evidence Class:</span>
            {(['all', 'observed', 'calculated_modeled', 'assumption', 'unknown'] as const).map(cls => (
              <button
                key={cls}
                onClick={() => setFilterClass(cls)}
                className={`px-2.5 py-1 rounded-md transition-all uppercase text-[10px] font-bold ${
                  filterClass === cls 
                    ? 'bg-slate-700 text-cyan-300 border border-cyan-500/50' 
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {cls.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search stable IDs (REQ-101, HYP-001)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-64"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Graph Canvas */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center relative">
          <canvas 
            ref={canvasRef} 
            width={600} 
            height={440} 
            onClick={handleCanvasClick}
            className="max-w-full h-auto cursor-pointer"
          />

          <div className="absolute top-4 left-4 flex flex-wrap gap-2 text-[10px] font-mono">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Observed Evidence
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Calculated / Modeled
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> Assumption
            </span>
          </div>

          <div className="absolute bottom-3 right-4 text-[10px] font-mono text-slate-500">
            Click any node circle to inspect provenance & blast radius
          </div>
        </div>

        {/* Selected Node Inspector & Blast Radius */}
        <div className="space-y-4">
          {selectedNode ? (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/30 font-mono text-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {selectedNode.stableId} (v{selectedNode.version})
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-300">
                  {selectedNode.type}
                </span>
              </div>

              <h3 className="text-base font-bold text-white font-['Space_Grotesk'] mb-2">
                {selectedNode.label}
              </h3>

              <p className="text-slate-300 font-sans text-xs mb-4 leading-relaxed">
                {selectedNode.description}
              </p>

              {/* Provenance Metadata */}
              <div className="space-y-1.5 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Evidence Class:</span>
                  <span className="text-cyan-300 uppercase font-bold">{selectedNode.evidenceClass.replace('_', ' ')}</span>
                </div>
                {selectedNode.metadata.author && (
                  <div className="flex justify-between">
                    <span>Origin Author:</span>
                    <span className="text-slate-200">{selectedNode.metadata.author}</span>
                  </div>
                )}
                {selectedNode.metadata.reviewedBy && (
                  <div className="flex justify-between">
                    <span>Reviewed By:</span>
                    <span className="text-emerald-400">{selectedNode.metadata.reviewedBy}</span>
                  </div>
                )}
                {selectedNode.metadata.numericValues && (
                  <div className="pt-2 border-t border-slate-800/60">
                    <span className="text-slate-400 block mb-1">Numeric Parameters:</span>
                    {Object.entries(selectedNode.metadata.numericValues).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-slate-200">
                        <span>{k}:</span>
                        <span className="text-cyan-300 font-bold">{v} {selectedNode.metadata.units?.[k] || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Blast Radius Impact Analysis */}
              {impactAnalysis && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      <span>Change Blast Radius</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Score: {impactAnalysis.blastRadiusScore} / 100
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div>Direct Dependents: <strong className="text-cyan-300">{impactAnalysis.directDependents.length}</strong></div>
                    <div>Indirect Dependents: <strong className="text-slate-400">{impactAnalysis.indirectDependents.length}</strong></div>
                    <div>Affected Claims: <strong className="text-indigo-400">{impactAnalysis.affectedClaims.length}</strong></div>
                    <div>Affected Statistical Tests: <strong className="text-emerald-400">{impactAnalysis.affectedTests.length}</strong></div>
                    <div>Confounding Variables: <strong className="text-rose-400">{impactAnalysis.affectedConfounders.length}</strong></div>
                  </div>

                  <div className="mt-2.5 p-2 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400">
                    {impactAnalysis.recommendations[0]}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center font-mono text-xs text-slate-500">
              Select a node from the canvas to inspect provenance, graph links, and change propagation.
            </div>
          )}

          {/* Consistency Issues Drawer */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 font-mono text-xs">
            <h4 className="font-bold text-white mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Consistency Audit Logs ({issues.length})</span>
              </span>
            </h4>

            {issues.length === 0 ? (
              <div className="p-3 rounded bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 text-xs">
                Zero consistency conflicts found. Knowledge base is aligned.
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {issues.map(issue => (
                  <div key={issue.id} className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold uppercase ${
                        issue.severity === 'critical' ? 'text-rose-400' :
                        issue.severity === 'warning' ? 'text-amber-400' : 'text-cyan-400'
                      }`}>
                        {issue.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-white mb-1">{issue.title}</div>
                    <p className="text-[11px] text-slate-400 mb-1.5">{issue.description}</p>
                    <div className="text-[10px] text-emerald-400">Action: {issue.suggestedAction}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
