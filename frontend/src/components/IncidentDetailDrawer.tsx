import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MapPin, Users, Activity, Clock, ShieldCheck,
  AlertTriangle, Flame, Droplets, Zap, Shield, ExternalLink, RefreshCw
} from 'lucide-react';
import type { Incident } from '../types';
import IncidentPriorityBadge from './IncidentPriorityBadge';
import DemoBadge from './DemoBadge';

interface IncidentDetailDrawerProps {
  incident: Incident | null;
  onClose: () => void;
  onStatusChange?: (id: string, status: string) => void;
  onRetriage?: (id: string) => void;
  onGeneratePlan?: (id: string) => void;
  backdrop?: boolean;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  flood: Droplets,
  fire: Flame,
  heatwave: Activity,
  earthquake: Zap,
  other: AlertTriangle,
};

export default function IncidentDetailDrawer({
  incident,
  onClose,
  onStatusChange,
  onRetriage,
  onGeneratePlan,
  backdrop = true,
}: IncidentDetailDrawerProps) {
  if (!incident) return null;

  const TypeIcon = TYPE_ICONS[incident.incident_type] || AlertTriangle;
  let parsedScoreComponents: Record<string, any> = {};
  try {
    if (incident.score_components) {
      parsedScoreComponents = typeof incident.score_components === 'string'
        ? JSON.parse(incident.score_components)
        : incident.score_components;
    }
  } catch {
    // Ignored
  }

  return (
    <AnimatePresence>
      <div className={`fixed inset-0 z-[1000] overflow-hidden ${backdrop ? '' : 'pointer-events-none'}`}>
        {/* Full Backdrop (rendered only if backdrop is true) */}
        {backdrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm pointer-events-auto"
          />
        )}

        {/* Panel: Docked Right Drawer (if backdrop=true) OR Floating Tactical Inspector (if backdrop=false for Map) */}
        <div
          className={
            backdrop
              ? 'fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none'
              : 'fixed top-20 right-4 bottom-16 z-[1000] w-84 sm:w-96 max-w-[calc(100vw-2rem)] flex pointer-events-none'
          }
        >
          <motion.div
            initial={{ opacity: 0, x: 50, scale: backdrop ? 1 : 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: backdrop ? 1 : 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className={
              backdrop
                ? 'w-screen max-w-sm sm:max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl pointer-events-auto flex flex-col h-full'
                : 'w-full bg-slate-950/95 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl shadow-2xl shadow-black/90 pointer-events-auto flex flex-col h-full overflow-hidden'
            }
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <TypeIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <IncidentPriorityBadge priority={incident.priority_level} size="sm" />
                    {incident.is_demo && <DemoBadge />}
                  </div>
                  <h3 className="text-base font-bold text-white line-clamp-1">{incident.title}</h3>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Situation Briefing</span>
                <p className="text-xs sm:text-sm text-slate-300 bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/40 leading-relaxed">
                  {incident.description}
                </p>
              </div>

              {/* Geographic Coordinates & Location */}
              <div className="glass-card p-4 rounded-xl space-y-2 border border-slate-800">
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-white">{incident.address || 'Address unrecorded'}</span>
                    <p className="text-slate-400 font-mono mt-0.5">
                      {incident.latitude.toFixed(4)}° N, {incident.longitude.toFixed(4)}° E
                    </p>
                  </div>
                </div>
              </div>

              {/* Critical Indicators */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/40">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-red-400" /> Severity Level
                  </span>
                  <div className="text-xl font-bold text-white mt-1 font-mono">
                    {incident.severity} <span className="text-xs font-normal text-slate-400">/ 5</span>
                  </div>
                </div>

                <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/40">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" /> Affected Population
                  </span>
                  <div className="text-xl font-bold text-white mt-1 font-mono">
                    {incident.affected_population ? incident.affected_population.toLocaleString() : 'Est. Unknown'}
                  </div>
                </div>
              </div>

              {/* Agent B Triage Transparency */}
              <div className="bg-slate-800/70 p-4 rounded-xl border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    Agent B Triage Transparency
                  </h4>
                  <span className="text-xs font-mono font-bold text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40">
                    Score: {incident.priority_score.toFixed(1)} / 100
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300 py-1 border-b border-slate-700/40">
                    <span className="text-slate-400">Incident Base Weight ({incident.incident_type}):</span>
                    <span className="font-mono text-white">{parsedScoreComponents.base_score ?? '—'}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 py-1 border-b border-slate-700/40">
                    <span className="text-slate-400">Severity Multiplier ({incident.severity}/5):</span>
                    <span className="font-mono text-white">+{parsedScoreComponents.severity_points ?? '—'} pts</span>
                  </div>
                  <div className="flex justify-between text-slate-300 py-1 border-b border-slate-700/40">
                    <span className="text-slate-400">Data Confidence Factor:</span>
                    <span className="font-mono text-white">{((incident.data_confidence || 1) * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {onRetriage && (
                  <button
                    onClick={() => onRetriage(incident.id)}
                    className="w-full text-xs py-2 bg-slate-700 hover:bg-slate-600 text-cyan-300 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Recalculate Agent B Priority Score
                  </button>
                )}
              </div>

              {/* Status Management */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workflow State</span>
                <div className="grid grid-cols-2 gap-2">
                  {['reported', 'triaged', 'dispatched', 'resolved', 'closed'].map((st) => (
                    <button
                      key={st}
                      onClick={() => onStatusChange && onStatusChange(incident.id, st)}
                      className={`text-xs py-2 px-3 rounded-xl font-medium border text-center transition-all capitalize ${
                        incident.status === st
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)]'
                          : 'bg-slate-800 text-slate-400 border-slate-700/60 hover:text-white hover:bg-slate-750'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Rescue Link */}
              {onGeneratePlan && (
                <button
                  onClick={() => onGeneratePlan(incident.id)}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Shield className="w-4 h-4" />
                  Generate Structured Rescue Plan
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-500 flex justify-between items-center">
              <span>ID: {incident.id.slice(0, 8)}...</span>
              <span>Updated: {new Date(incident.updated_at).toLocaleTimeString()}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
