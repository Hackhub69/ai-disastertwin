import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, ShieldCheck, Truck, MessageSquare, Activity, CheckCircle,
  AlertCircle, Info, ArrowRight, ShieldAlert, Cpu, Sparkles, Sliders,
  RefreshCw, Check, AlertTriangle
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { getIntegrationStatus, getAuditLog } from '../services/api';
import PageContainer from '../components/PageContainer';
import { useToast } from '../components/ToastContext';

interface AgentDef {
  id: string;
  code: string;
  name: string;
  role: string;
  icon: React.ElementType;
  theme: 'cyan' | 'amber' | 'blue' | 'purple';
  description: string;
  responsibilities: string[];
  safetyNote?: string;
  status: 'active' | 'standby';
}

const AGENTS: AgentDef[] = [
  {
    id: 'a',
    code: 'AGENT-A',
    name: 'Alert Intake & Deduplication',
    role: 'Perception & Ingestion',
    icon: ShieldCheck,
    theme: 'cyan',
    description: 'Validates incoming telemetry, detects duplicate reports using spatial-temporal heuristics (≤1km, ≤30min), normalizes payloads, and binds data provenance.',
    responsibilities: [
      'Validate coordinates, hazard classification, and severity bounds',
      'Normalize incoming multi-channel emergency feeds',
      'Detect duplicate reports using radius (≤1.0 km) & time window (≤30 min)',
      'Synthesize situational executive summaries',
      'Tag verified source provenance and synthetic telemetry markers'
    ],
    status: 'active',
  },
  {
    id: 'b',
    code: 'AGENT-B',
    name: 'Triage & Risk Scoring',
    role: 'Deterministic Risk Evaluation',
    icon: Activity,
    theme: 'amber',
    description: 'Calculates transparent, deterministic priority scores (0–100) using mathematical weights. LLM is strictly restricted to qualitative reasoning without decision authority.',
    responsibilities: [
      'Calculate deterministic priority scores using base weights and severity factors',
      'Compute population vulnerability bonus (up to +20 points)',
      'Apply sensor data confidence factor (0.50 – 1.00)',
      'Assign operational classification (CRITICAL, HIGH, MEDIUM, LOW)',
      'Audit all human score overrides with immutable reasoning logs'
    ],
    safetyNote: 'Agent B priority scoring always runs deterministically. Emergency triage disposition is NEVER delegated to LLM hallucinations.',
    status: 'active',
  },
  {
    id: 'c',
    code: 'AGENT-C',
    name: 'Dispatch & Resource Matching',
    role: 'Resource Allocation Support',
    icon: Truck,
    theme: 'blue',
    description: 'Computes multi-criteria candidate rankings based on proximity, asset suitability, and capacity. Enforces strict Human-in-the-Loop approval prior to actual dispatch.',
    responsibilities: [
      'Track real-time rescue resource inventory and readiness status',
      'Calculate weighted suitability score: Suitability (40%) + Distance (40%) + Capacity (20%)',
      'Prevent resource double-booking and allocation deadlocks',
      'Mandate explicit authorized operator sign-off before physical dispatch',
      'Log full candidate evaluation metrics for operational audit review'
    ],
    safetyNote: 'Agent C recommendations require explicit human operator approval before any resource is deployed. Autonomous physical dispatch is disabled.',
    status: 'active',
  },
  {
    id: 'd',
    code: 'AGENT-D',
    name: 'Public Alert & Comms Generator',
    role: 'Crisis Communication Synthesis',
    icon: MessageSquare,
    theme: 'purple',
    description: 'Generates multilingual citizen emergency notices and field radio updates in English, Hindi, and Marathi. Enforces mandatory operator review before broadcast.',
    responsibilities: [
      'Draft situational alerts in English, Hindi (हिंदी), and Marathi (मराठी)',
      'Strictly separate verified facts from provisional estimations',
      'Hold all synthesized broadcasts in DRAFT state until operator review',
      'Support one-click operator modification, approval, or rejection',
      'Simulate civil broadcast delivery for training and rehearsal environments'
    ],
    safetyNote: 'All alert drafts remain in DRAFT status until signed off by an authorized human commander. No automated mass broadcasting occurs.',
    status: 'active',
  },
];

const THEME_STYLES = {
  cyan: {
    border: 'border-cyan-500/40 hover:border-cyan-500/80',
    bg: 'bg-cyan-950/20',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  amber: {
    border: 'border-amber-500/40 hover:border-amber-500/80',
    bg: 'bg-amber-950/20',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  blue: {
    border: 'border-blue-500/40 hover:border-blue-500/80',
    bg: 'bg-blue-950/20',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  purple: {
    border: 'border-purple-500/40 hover:border-purple-500/80',
    bg: 'bg-purple-950/20',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
};

export default function Agents() {
  const { addToast } = useToast();
  const { data: integrations } = useApi(getIntegrationStatus);
  const { data: auditData, refetch: refetchAudit } = useApi(() => getAuditLog({ page_size: 20 }));
  const [expandedAgent, setExpandedAgent] = useState<string | null>('b');

  // Agent B Sandbox State
  const [sbType, setSbType] = useState('flood');
  const [sbSev, setSbSev] = useState(3);
  const [sbPop, setSbPop] = useState(150);
  const [sbConf, setSbConf] = useState(0.9);

  // Calculate live sandbox score
  const BASE_SCORES: Record<string, number> = { earthquake: 60, fire: 55, flood: 50, heatwave: 45, other: 35 };
  const SEV_MULTS: Record<number, number> = { 1: 0.4, 2: 0.6, 3: 0.8, 4: 1.0, 5: 1.3 };

  const baseScore = BASE_SCORES[sbType] || 35;
  const sevMult = SEV_MULTS[sbSev] || 0.8;
  const popBonus = Math.min(20, Math.round(Math.log10(Math.max(1, sbPop)) * 6.5));
  const rawScore = (baseScore * sevMult) + popBonus;
  const finalScore = Math.min(100, Math.max(0, rawScore * sbConf));
  const priorityLevel = finalScore >= 70 ? 'CRITICAL' : finalScore >= 50 ? 'HIGH' : finalScore >= 30 ? 'MEDIUM' : 'LOW';

  const llmActive = integrations?.openai?.configured;

  return (
    <PageContainer
      title="Multi-Agent AI Grid"
      subtitle="Autonomous coordination grid: 4 decoupled, auditable decision-support agents operating under strict Human-in-the-Loop constraints."
      badge={{
        label: llmActive ? 'HYBRID DETERMINISTIC + LLM' : 'AUTONOMOUS GRID v2.4',
        variant: 'cyan',
      }}
      actions={
        <button
          onClick={() => {
            refetchAudit();
            addToast({
              title: 'Grid Status Synced',
              message: 'Refreshed agent telemetry and execution audit streams.',
              type: 'info',
            });
          }}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-semibold transition-all active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync Agents
        </button>
      }
    >
      {/* Visual Agent Flow Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Multi-Agent Operational Pipeline</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">DECISION-SUPPORT PIPELINE V2.4</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
          {AGENTS.map((agent, i) => {
            const Icon = agent.icon;
            const style = THEME_STYLES[agent.theme];
            return (
              <div
                key={agent.id}
                onClick={() => setExpandedAgent(agent.id)}
                className={`p-3.5 rounded-xl border ${style.bg} ${style.border} cursor-pointer transition-all relative group ${
                  expandedAgent === agent.id ? 'ring-2 ring-cyan-500/50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${style.badge}`}>
                    {agent.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-mono text-emerald-400 uppercase">ONLINE</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 ${style.text}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {agent.name.split('—')[0]}
                    </h4>
                    <p className="text-[10px] text-slate-400">{agent.role}</p>
                  </div>
                </div>

                {i < 3 && (
                  <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-slate-600">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Agent B Triage Sandbox */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Agent B — Interactive Triage Calculation Sandbox
            </h3>
          </div>
          <span className="text-[11px] font-mono text-cyan-400">LIVE MATHEMATICAL EVALUATION</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800">
          {/* Controls */}
          <div className="space-y-3 lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Incident Type</label>
                <select
                  value={sbType}
                  onChange={e => setSbType(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-slate-700 text-white rounded-xl p-2 outline-none focus:border-amber-500 capitalize"
                >
                  {Object.keys(BASE_SCORES).map(t => (
                    <option key={t} value={t}>{t} (Base: {BASE_SCORES[t]})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Severity: <span className="text-amber-400 font-bold">{sbSev}/5 ({SEV_MULTS[sbSev]}×)</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={sbSev}
                  onChange={e => setSbSev(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Population: <span className="text-cyan-400 font-bold">{sbPop} (+{popBonus} pts)</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5000"
                  step="50"
                  value={sbPop}
                  onChange={e => setSbPop(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Confidence: <span className="text-blue-400 font-bold">{(sbConf * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={sbConf}
                  onChange={e => setSbConf(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Formula Breakdown Bar */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 font-mono flex flex-wrap items-center justify-between gap-2">
              <span>Formula: [(Base {baseScore} × Sev {sevMult}) + PopBonus {popBonus}] × Conf {sbConf.toFixed(2)}</span>
              <span className="text-white font-bold">= {finalScore.toFixed(1)} / 100</span>
            </div>
          </div>

          {/* Result Card */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Calculated Priority</span>
            <span className="text-3xl font-mono font-bold text-white mb-1">{finalScore.toFixed(1)}</span>
            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full uppercase border ${
              priorityLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
              priorityLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
              priorityLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
              'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}>
              {priorityLevel} PRIORITY
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Agent Dossiers */}
      <div className="space-y-4">
        {AGENTS.map(agent => {
          const Icon = agent.icon;
          const isExpanded = expandedAgent === agent.id;
          const style = THEME_STYLES[agent.theme];

          return (
            <div
              key={agent.id}
              className={`glass-panel rounded-2xl border transition-all overflow-hidden ${
                isExpanded ? `${style.border} shadow-lg` : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <button
                onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 ${style.text}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${style.badge}`}>
                        {agent.code}
                      </span>
                      <h3 className="text-sm font-bold text-white">{agent.name}</h3>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">{agent.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    ONLINE
                  </span>
                  <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                    {isExpanded ? '▲' : '▼'}
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-5 border-t border-slate-800 bg-slate-950/40 space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Responsibilities */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                          Standard Operating Procedures
                        </h4>
                        <ul className="space-y-2">
                          {agent.responsibilities.map((r, i) => (
                            <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                              <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                              <span className="leading-relaxed">{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Audit Trail */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                          Recent Agent Execution Log
                        </h4>
                        <div className="space-y-2">
                          {auditData?.items.filter(e => {
                            if (agent.id === 'a') return e.action === 'incident_created';
                            if (agent.id === 'b') return e.action.includes('triage');
                            if (agent.id === 'c') return e.action.includes('recommendation') || e.action.includes('assignment');
                            if (agent.id === 'd') return e.action.includes('alert') || e.action.includes('message');
                            return false;
                          }).slice(0, 4).map(evt => (
                            <div key={evt.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                <span className="font-mono text-white truncate">{evt.action}</span>
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono flex-shrink-0">
                                {new Date(evt.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                          {(!auditData?.items || auditData.items.length === 0) && (
                            <p className="text-xs text-slate-500 py-3 text-center">
                              No recent telemetry events recorded for this unit.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Safety Note */}
                    {agent.safetyNote && (
                      <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{agent.safetyNote}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}
