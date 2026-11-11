import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Users, ClipboardList, MessageSquare, CheckCircle2,
  AlertTriangle, Clock, ChevronRight, ChevronDown, Plus, RefreshCw,
  ThumbsUp, ThumbsDown, FileText, Radio, AlertCircle, Info,
  MapPin, Loader2, Check, X, Copy, ExternalLink, Activity, ArrowRight,
  Shield, CheckCheck, Flame, Droplets, Zap
} from 'lucide-react';
import { rescueApi, getIncidents } from '../services/api';
import { useApi } from '../hooks/useApi';
import type {
  RescueTeam, RescueAssignment, ResponsePlan, ChecklistItem,
  TeamMessage, RescueDashboard, Incident
} from '../types';
import PageContainer from '../components/PageContainer';
import DashboardStatCard from '../components/DashboardStatCard';
import DemoBadge from '../components/DemoBadge';
import EmptyState from '../components/EmptyState';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { useToast } from '../components/ToastContext';

// ─── Status Utilities ────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  'available',
  'recommended',
  'awaiting_approval',
  'assigned',
  'responding',
  'on_scene',
  'assisting',
  'completed',
];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  available:        { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  deployed:         { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  standby:          { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  offline:          { bg: 'bg-slate-700/30', text: 'text-slate-400', border: 'border-slate-600/30' },
  recommended:      { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  awaiting_approval:{ bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/40' },
  assigned:         { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/40' },
  responding:       { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/40' },
  on_scene:         { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/40' },
  assisting:        { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/40' },
  completed:        { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/40' },
  cancelled:        { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  escalated:        { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/50' },
  draft:            { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700' },
  approved:         { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/40' },
  rejected:         { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/40' },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${c.bg} ${c.text} ${c.border}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function CategoryBadge({ cat }: { cat: string }) {
  const colors: Record<string, string> = {
    safety: 'bg-red-500/15 text-red-300 border-red-500/30',
    action: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    communication: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    report: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    escalation: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  };
  return (
    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${colors[cat] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
      {cat}
    </span>
  );
}

// ─── Team Card ────────────────────────────────────────────────────────────────

function TeamCard({ team, onStatusChange }: { team: RescueTeam; onStatusChange: () => void }) {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const toggleStandby = async () => {
    setLoading(true);
    const newStatus = team.status === 'standby' ? 'available' : 'standby';
    try {
      await rescueApi.updateTeam(team.id, { status: newStatus });
      addToast({
        title: 'Team State Updated',
        message: `${team.name} shifted to ${newStatus.toUpperCase()}`,
        type: 'info',
      });
      onStatusChange();
    } catch (err: any) {
      addToast({
        title: 'Update Failed',
        message: err.message || 'Could not update team status',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group"
    >
      <div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                {team.team_code || 'UNIT'}
              </span>
              {team.is_demo && <DemoBadge />}
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
              {team.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Leader: {team.team_leader || 'Unassigned'}</p>
          </div>
          <StatusBadge status={team.status} />
        </div>

        <div className="space-y-2 mb-4 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              Responders
            </span>
            <span className="font-bold text-white font-mono">{team.responder_count} active</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              Specialty
            </span>
            <span className="font-semibold text-cyan-400 capitalize">{team.specialty || 'General'}</span>
          </div>

          {team.base_location && (
            <div className="flex items-center gap-1.5 text-slate-400 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span className="truncate">{team.base_location}</span>
            </div>
          )}
        </div>

        {team.skills && team.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {team.skills.slice(0, 3).map(s => (
              <span key={s} className="text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                {s.replace(/_/g, ' ')}
              </span>
            ))}
            {team.skills.length > 3 && (
              <span className="text-[10px] font-mono text-slate-500">+{team.skills.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <button
        onClick={toggleStandby}
        disabled={loading || team.status === 'deployed'}
        className="w-full text-xs font-semibold py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : team.status === 'standby' ? (
          <>Set Available</>
        ) : (
          <>Set Standby</>
        )}
      </button>
    </motion.div>
  );
}

// ─── Interactive Checklist Panel ─────────────────────────────────────────────

function ChecklistPanel({
  items,
  onToggle,
}: {
  items: ChecklistItem[];
  onToggle: (id: string, completed: boolean) => Promise<void>;
}) {
  const completed = items.filter(i => i.completed).length;
  const progress = items.length > 0 ? (completed / items.length) * 100 : 0;
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const handleToggle = async (item: ChecklistItem) => {
    setUpdatingItemId(item.id);
    try {
      await onToggle(item.id, !item.completed);
    } finally {
      setUpdatingItemId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
            Checklist Execution Progress
          </span>
          <span className="font-mono font-bold text-cyan-400">
            {completed}/{items.length} ({Math.round(progress)}%)
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {items.map(item => (
          <motion.button
            type="button"
            key={item.id}
            layout
            onClick={() => void handleToggle(item)}
            disabled={updatingItemId === item.id}
            aria-label={`${item.completed ? 'Reopen' : 'Complete'} step ${item.step_number}: ${item.title}`}
            aria-busy={updatingItemId === item.id}
            className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 disabled:cursor-wait disabled:opacity-70 ${
              item.completed
                ? 'bg-emerald-950/20 border-emerald-800/40 opacity-80'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div
              className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                item.completed
                  ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                  : 'border-slate-600 bg-slate-800'
              }`}
            >
              {updatingItemId === item.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" aria-hidden="true" />
              ) : item.completed ? (
                <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
              ) : null}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className={`text-xs font-bold ${
                    item.completed ? 'text-emerald-300 line-through' : 'text-white'
                  }`}
                >
                  Step {item.step_number}: {item.title}
                </span>
                <CategoryBadge cat={item.category} />
                {item.requires_approval && (
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded">
                    Requires Authorization
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── Assignment Detail Panel ─────────────────────────────────────────────────

function AssignmentDetail({
  assignment,
  onRefresh,
}: {
  assignment: RescueAssignment;
  onRefresh: () => void;
}) {
  const { addToast } = useToast();
  const [tab, setTab] = useState<'checklist' | 'timeline' | 'messages'>('checklist');
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [msgLang, setMsgLang] = useState<'en' | 'hi' | 'mr'>('en');

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await rescueApi.getMessages(assignment.id);
      setMessages(msgs);
    } catch {
      // Ignored
    }
  }, [assignment.id]);

  React.useEffect(() => {
    if (tab === 'messages') loadMessages();
  }, [tab, loadMessages]);

  const handleChecklistToggle = async (itemId: string, completed: boolean) => {
    try {
      await rescueApi.updateChecklistItem(itemId, completed);
      addToast({
        title: completed ? 'Task Complete' : 'Task Reopened',
        message: `Checklist item updated.`,
        type: 'info',
      });
      onRefresh();
    } catch (err: any) {
      addToast({
        title: 'Checklist Error',
        message: err.message || 'Could not update task item',
        type: 'error',
      });
    }
  };

  const handleApprove = async (action: 'approve' | 'reject') => {
    setActionLoading(true);
    try {
      await rescueApi.approveAssignment(assignment.id, action, 'commander_officer');
      addToast({
        title: action === 'approve' ? 'Assignment Authorized' : 'Assignment Rejected',
        message: `Team deployment marked as ${action}d.`,
        type: action === 'approve' ? 'success' : 'warning',
      });
      onRefresh();
    } catch (err: any) {
      addToast({
        title: 'Action Failed',
        message: err.message || 'Approval command failed',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    setActionLoading(true);
    try {
      await rescueApi.updateAssignmentStatus(assignment.id, status, 'commander_officer');
      addToast({
        title: 'Operational Status Advanced',
        message: `Deployment state moved to ${status.toUpperCase()}`,
        type: 'info',
      });
      onRefresh();
    } catch (err: any) {
      addToast({
        title: 'Status Update Failed',
        message: err.message || 'Failed to update assignment status',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    try {
      const input = prompt('Enter number of people assisted during this operation:', '12');
      const people = parseInt(input || '0', 10);
      await rescueApi.completeAssignment(assignment.id, {
        people_assisted: isNaN(people) ? 0 : people,
        outstanding_risks: 'Sector stabilized. Handover to civil authority.',
        notes: 'Operational mission successfully completed with zero casualty report.',
      });
      addToast({
        title: 'Mission Completed',
        message: `Incident assignment completed. Assisted count: ${people}.`,
        type: 'success',
      });
      onRefresh();
    } catch (err: any) {
      addToast({
        title: 'Completion Error',
        message: err.message || 'Could not complete mission',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const generateMsg = async (type: string) => {
    setLoadingMsg(true);
    try {
      await rescueApi.generateMessage({ message_type: type, assignment_id: assignment.id });
      addToast({
        title: 'Draft Comms Synthesized',
        message: `Generated multilingual ${type.replace(/_/g, ' ')} draft.`,
        type: 'info',
      });
      await loadMessages();
    } catch (err: any) {
      addToast({
        title: 'Drafting Failed',
        message: err.message || 'Could not synthesize message draft',
        type: 'error',
      });
    } finally {
      setLoadingMsg(false);
    }
  };

  const approveMsg = async (msgId: string, action: 'approve' | 'reject') => {
    try {
      await rescueApi.approveMessage(msgId, action, 'commander_officer');
      addToast({
        title: action === 'approve' ? 'Message Approved' : 'Message Rejected',
        message: `Comms dispatch marked as ${action}.`,
        type: action === 'approve' ? 'success' : 'warning',
      });
      await loadMessages();
    } catch (err: any) {
      addToast({
        title: 'Message Action Error',
        message: err.message || 'Failed to process message action',
        type: 'error',
      });
    }
  };

  const copyMessageText = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({
      title: 'Copied to Clipboard',
      message: 'Comms text copied for field dispatch transmission.',
      type: 'info',
    });
  };

  const nextStatusButtons: Record<string, string[]> = {
    assigned: ['responding'],
    responding: ['on_scene'],
    on_scene: ['assisting'],
    assisting: [],
  };

  const canApprove = ['recommended', 'awaiting_approval'].includes(assignment.status);
  const canComplete = ['on_scene', 'assisting', 'responding'].includes(assignment.status);
  const nextStatuses = nextStatusButtons[assignment.status] || [];

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded shrink-0">
                {assignment.team_code || 'UNIT'}
              </span>
              <StatusBadge status={assignment.status} />
              {assignment.is_demo && <DemoBadge />}
            </div>
            <h3 className="text-sm font-bold text-white leading-snug">{assignment.team_name || 'Assigned Unit'}</h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              <span className="text-slate-500">Target: </span>
              <span className="text-slate-200 font-medium">{assignment.incident_title || assignment.incident_id}</span>
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 font-mono shrink-0">
            <div className="text-slate-500 text-[10px]">Logged</div>
            <div className="text-slate-300 font-semibold">
              {assignment.created_at ? new Date(assignment.created_at).toLocaleTimeString() : '—'}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-800/80">
          {canApprove && (
            <>
              <button
                onClick={() => handleApprove('approve')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <ThumbsUp className="w-3.5 h-3.5" /> Authorize
              </button>
              <button
                onClick={() => handleApprove('reject')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-red-900/50 hover:bg-red-800 border border-red-700/60 text-red-200 rounded-xl transition-all active:scale-95 disabled:opacity-50"
              >
                <ThumbsDown className="w-3.5 h-3.5" /> Decline
              </button>
            </>
          )}

          {nextStatuses.map(s => (
            <button
              key={s}
              onClick={() => handleStatusUpdate(s)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 capitalize"
            >
              <ChevronRight className="w-3.5 h-3.5" /> Advance to {s.replace(/_/g, ' ')}
            </button>
          ))}

          {canComplete && (
            <button
              onClick={handleComplete}
              disabled={actionLoading}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Complete Mission
            </button>
          )}

          {actionLoading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/40">
        {(['checklist', 'timeline', 'messages'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-bold capitalize transition-all flex items-center justify-center gap-2 border-b-2 ${
              tab === t
                ? 'text-cyan-400 border-cyan-400 bg-cyan-950/20'
                : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-850'
            }`}
          >
            {t === 'checklist' && <ClipboardList className="w-3.5 h-3.5" />}
            {t === 'timeline' && <Clock className="w-3.5 h-3.5" />}
            {t === 'messages' && <MessageSquare className="w-3.5 h-3.5" />}
            {t}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="p-5 flex-1 overflow-y-auto">
        {tab === 'checklist' && (
          <ChecklistPanel items={assignment.checklist || []} onToggle={handleChecklistToggle} />
        )}

        {tab === 'timeline' && (
          <div className="space-y-3">
            {(!assignment.timeline || assignment.timeline.length === 0) ? (
              <p className="text-xs text-slate-500 text-center py-8">No status transition recorded yet.</p>
            ) : (
              [...assignment.timeline].reverse().map((ev, i) => (
                <div key={ev.id || i} className="flex gap-3 items-start p-2.5 rounded-xl bg-slate-900/40 border border-slate-800">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 mt-1 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white font-semibold">
                      {ev.old_status && <span className="text-slate-400 font-normal">{ev.old_status} → </span>}
                      <span className="text-cyan-300 font-bold uppercase">{ev.new_status}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Operator: {ev.updated_by} • {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ''}
                    </div>
                    {ev.notes && <p className="text-xs text-slate-300 mt-1 italic">{ev.notes}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'messages' && (
          <div className="space-y-4">
            {/* Generate Comms Section */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wide">Generate Structured Comms</span>
                {loadingMsg && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 ml-auto" />}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'briefing', label: 'Draft Briefing', icon: FileText },
                  { type: 'situation_update', label: 'Situation Update', icon: AlertCircle },
                  { type: 'resource_request', label: 'Resource Request', icon: Activity },
                  { type: 'completion', label: 'Draft Completion', icon: CheckCircle2 },
                ].map(({ type, label, icon: BtnIcon }) => (
                  <button
                    key={type}
                    onClick={() => generateMsg(type)}
                    disabled={loadingMsg}
                    className="flex items-center gap-2 text-xs font-semibold px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-600/50 text-slate-300 hover:text-white rounded-xl transition-all disabled:opacity-50 group"
                  >
                    <BtnIcon className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300 shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 px-2 font-mono font-bold uppercase tracking-wider shrink-0">Lang</span>
              <div className="flex flex-1 gap-1">
                {(['en', 'hi', 'mr'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setMsgLang(lang)}
                    className={`flex-1 text-xs font-bold py-1.5 px-2 rounded-lg transition-all ${
                      msgLang === lang
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {lang === 'en' ? '🇬🇧 EN' : lang === 'hi' ? '🇮🇳 HI' : '🫘 MR'}
                  </button>
                ))}
              </div>
            </div>

            {/* Full language label */}
            <div className="text-[10px] text-slate-500 font-mono px-1 -mt-2">
              {msgLang === 'en' ? 'English' : msgLang === 'hi' ? 'हिंदी (Hindi)' : 'मराठी (Marathi)'}
            </div>

            {/* Messages Feed */}
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  <Radio className="w-6 h-6 mx-auto mb-2 opacity-30 text-cyan-400" />
                  <p className="text-xs font-medium text-slate-400">No comms drafted yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">Click a generate button above to synthesize a tactical field message.</p>
                </div>
              ) : (
                messages.map(msg => {
                  const content = msgLang === 'en' ? msg.content_en : msgLang === 'hi' ? msg.content_hi : msg.content_mr;
                  return (
                    <div key={msg.id} className="rounded-xl border border-slate-800 overflow-hidden">
                      {/* Message header bar */}
                      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/80 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
                            {msg.message_type.replace(/_/g, ' ')}
                          </span>
                          <StatusBadge status={msg.status} />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyMessageText(content || '')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            title="Copy text"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {msg.status === 'draft' && (
                            <>
                              <button
                                onClick={() => approveMsg(msg.id, 'approve')}
                                className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-400 hover:text-emerald-300 transition-colors"
                                title="Approve & dispatch"
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => approveMsg(msg.id, 'reject')}
                                className="p-1.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800/60 text-red-400 hover:text-red-300 transition-colors"
                                title="Reject"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Message body */}
                      <div className="bg-slate-950/50 p-3.5">
                        <pre className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                          {content}
                        </pre>
                        {msg.delivery_note && (
                          <p className="text-[11px] text-amber-300/90 mt-2.5 italic flex items-center gap-1.5 border-t border-slate-800 pt-2">
                            <Info className="w-3 h-3 flex-shrink-0 text-amber-400" />
                            {msg.delivery_note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  incidents,
  teams,
  onRefresh,
}: {
  plan: ResponsePlan;
  incidents: Incident[];
  teams: RescueTeam[];
  onRefresh: () => void;
}) {
  const { addToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [loading, setLoading] = useState(false);

  const incident = incidents.find(i => i.id === plan.incident_id);

  const handleApprove = async (action: 'approve' | 'reject') => {
    setLoading(true);
    try {
      await rescueApi.approvePlan(plan.id, action, 'commander_officer');
      addToast({
        title: action === 'approve' ? 'Plan Approved' : 'Plan Rejected',
        message: `Response plan for incident ${plan.incident_id.slice(0, 8)} marked as ${action}d.`,
        type: action === 'approve' ? 'success' : 'warning',
      });
      onRefresh();
    } catch (err: any) {
      addToast({
        title: 'Plan Action Failed',
        message: err.message || 'Failed to update plan status',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedTeam) return;
    setLoading(true);
    try {
      await rescueApi.createAssignment({
        incident_id: plan.incident_id,
        team_id: selectedTeam,
        response_plan_id: plan.id,
      });
      addToast({
        title: 'Team Assigned',
        message: 'Assigned recommended team to response plan.',
        type: 'success',
      });
      setAssigning(false);
      onRefresh();
    } catch (err: any) {
      addToast({
        title: 'Assignment Failed',
        message: err.message || 'Could not assign team to plan',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const availableTeams = teams.filter(t => t.status === 'available' &&
    (!plan.recommended_team_type || t.specialty === plan.recommended_team_type || t.specialty === 'general')
  );

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 hover:border-slate-700 transition-all overflow-hidden">
      <button
        className="w-full p-5 text-left hover:bg-slate-800/30 transition-colors flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusBadge status={plan.approval_status} />
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded capitalize">
              {plan.template_used} Protocol
            </span>
            {plan.is_demo && <DemoBadge />}
          </div>
          <h3 className="text-sm font-bold text-white truncate">
            {incident?.title || `Incident ${plan.incident_id.slice(0, 8)}`}
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {plan.situation_summary}
          </p>
        </div>
        <div className="p-2 rounded-xl bg-slate-800/80 text-slate-400 flex-shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-slate-800 p-5 space-y-4 bg-slate-950/40"
        >
          {/* Known Hazards */}
          {plan.known_hazards && plan.known_hazards.length > 0 && (
            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-800/40">
              <h4 className="text-xs font-bold text-red-300 mb-2 flex items-center gap-1.5 uppercase">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Operational Hazards & Restrictions
              </h4>
              <ul className="space-y-1">
                {plan.known_hazards.map((h, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Required Skills & Equipment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <h4 className="text-xs font-bold text-cyan-400 mb-2 uppercase">Required Responder Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {plan.required_skills?.map(s => (
                  <span key={s} className="text-[11px] font-mono bg-slate-800 border border-slate-700 text-slate-200 px-2 py-0.5 rounded-lg">
                    {s.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <h4 className="text-xs font-bold text-cyan-400 mb-2 uppercase">Recommended Gear & Equipment</h4>
              <div className="flex flex-wrap gap-1.5">
                {plan.recommended_equipment?.map(e => (
                  <span key={e} className="text-[11px] font-mono bg-slate-800 border border-slate-700 text-slate-200 px-2 py-0.5 rounded-lg">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Coordination Instructions */}
          {plan.coordination_instructions && (
            <div>
              <h4 className="text-xs font-bold text-blue-400 mb-1.5 uppercase">Coordination & Radio Instructions</h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                {plan.coordination_instructions}
              </p>
            </div>
          )}

          {/* External Services */}
          {plan.external_services_needed && plan.external_services_needed.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-amber-400 mb-1.5 uppercase">External Agencies Required</h4>
              <div className="flex gap-2 flex-wrap">
                {plan.external_services_needed.map(s => (
                  <span key={s} className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold px-2.5 py-1 rounded-xl uppercase">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Escalation Conditions */}
          {plan.escalation_conditions && plan.escalation_conditions.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-orange-400 mb-1.5 uppercase">Escalation Triggers</h4>
              <ul className="space-y-1">
                {plan.escalation_conditions.map((c, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-orange-400 font-bold font-mono">!</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-300 flex items-start gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-cyan-400" />
            <span>
              Decision-support checklist generated via safety rules. Does not replace official emergency command protocols.
            </span>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
            {plan.approval_status === 'draft' && (
              <>
                <button
                  onClick={() => handleApprove('approve')}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  <ThumbsUp className="w-3.5 h-3.5" /> Approve Response Plan
                </button>
                <button
                  onClick={() => handleApprove('reject')}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-red-900/50 hover:bg-red-800 border border-red-700/60 text-red-200 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  <ThumbsDown className="w-3.5 h-3.5" /> Reject Plan
                </button>
              </>
            )}

            {plan.approval_status === 'approved' && !assigning && (
              <button
                onClick={() => setAssigning(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
              >
                <Users className="w-3.5 h-3.5" /> Assign Response Team
              </button>
            )}

            {loading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
          </div>

          {/* Assign Team Selector Box */}
          {assigning && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-3"
            >
              <h4 className="text-xs font-bold text-white uppercase">Assign Response Team</h4>
              {availableTeams.length === 0 ? (
                <p className="text-xs text-amber-400">
                  No available teams currently match the required specialty. Check Team tab to free up units.
                </p>
              ) : (
                <>
                  <select
                    value={selectedTeam}
                    onChange={e => setSelectedTeam(e.target.value)}
                    className="w-full text-xs bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-cyan-500"
                  >
                    <option value="">— Select recommended rescue unit —</option>
                    {availableTeams.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.team_code} • {t.name} ({t.responder_count} responders, {t.specialty})
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAssign}
                      disabled={!selectedTeam || loading}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
                    >
                      Confirm Assignment
                    </button>
                    <button
                      onClick={() => setAssigning(false)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

type TabKey = 'plans' | 'assignments' | 'teams';

export default function RescueResponse() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('plans');
  const [selectedAssignment, setSelectedAssignment] = useState<RescueAssignment | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');

  const { data: dash, refetch: refetchDash } =
    useApi<RescueDashboard>(() => rescueApi.getDashboard());
  const { data: plans, loading: plansLoading, error: plansError, refetch: refetchPlans } =
    useApi<ResponsePlan[]>(() => rescueApi.getPlans());
  const { data: assignments, loading: assignmentsLoading, error: assignmentsError, refetch: refetchAssignments } =
    useApi<RescueAssignment[]>(() => rescueApi.getAssignments());
  const { data: teams, loading: teamsLoading, error: teamsError, refetch: refetchTeams } =
    useApi<RescueTeam[]>(() => rescueApi.getTeams());
  const { data: incidentsData } =
    useApi<{ items: Incident[]; total: number }>(() => getIncidents());

  const incidents = incidentsData?.items || [];

  const refetchAll = () => {
    refetchDash();
    refetchPlans();
    refetchAssignments();
    refetchTeams();
    addToast({
      title: 'Rescue Grid Synced',
      message: 'Dashboard and tactical team states refreshed.',
      type: 'info',
    });
  };

  const refreshAndUpdateSelected = async () => {
    refetchAll();
    if (selectedAssignment) {
      try {
        const updated = await rescueApi.getAssignment(selectedAssignment.id);
        setSelectedAssignment(updated);
      } catch {
        // Ignored
      }
    }
  };

  const handleGeneratePlan = async () => {
    if (!selectedIncidentId) return;
    setGenerating(true);
    try {
      await rescueApi.generatePlan(selectedIncidentId);
      addToast({
        title: 'Structured Plan Synthesized',
        message: 'Generated action checklist and resource requirements.',
        type: 'success',
      });
      refetchPlans();
      setActiveTab('plans');
    } catch (err: any) {
      addToast({
        title: 'Generation Failed',
        message: err.message || 'Could not synthesize response plan',
        type: 'error',
      });
    } finally {
      setGenerating(false);
      setSelectedIncidentId('');
    }
  };

  const tabs: Array<{ key: TabKey; label: string; icon: React.ElementType; count?: number }> = [
    { key: 'plans', label: 'Response Plans', icon: FileText, count: plans?.length },
    { key: 'assignments', label: 'Field Deployments', icon: ShieldCheck, count: assignments?.length },
    { key: 'teams', label: 'Rescue Units', icon: Users, count: teams?.length },
  ];

  return (
    <PageContainer
      title="Rescue Response Coordinator"
      subtitle="Rescue team dispatch management, deterministic AI response plans, action checklists, and multilingual comms."
      badge={{
        label: 'SIMULATED DISPATCH ACTIVE',
        variant: 'cyan',
      }}
      actions={
        <button
          onClick={refetchAll}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-semibold transition-all active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync Operations
        </button>
      }
    >
      {/* 6 High-Density Stat Cards */}
      {dash && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <DashboardStatCard
            label="Active Plans"
            value={dash.active_plans}
            icon={FileText}
            variant="cyan"
            progress={Math.min(100, dash.active_plans * 20)}
          />
          <DashboardStatCard
            label="Units Available"
            value={dash.teams_available}
            icon={Users}
            variant="emerald"
            progress={Math.min(100, dash.teams_available * 20)}
          />
          <DashboardStatCard
            label="Units Deployed"
            value={dash.teams_deployed}
            icon={MapPin}
            variant="amber"
            progress={Math.min(100, dash.teams_deployed * 25)}
          />
          <DashboardStatCard
            label="Pending Approvals"
            value={dash.pending_approvals}
            icon={Clock}
            variant="red"
            progress={Math.min(100, dash.pending_approvals * 30)}
          />
          <DashboardStatCard
            label="Assignments"
            value={dash.active_assignments}
            icon={ShieldCheck}
            variant="blue"
            progress={Math.min(100, dash.active_assignments * 25)}
          />
          <DashboardStatCard
            label="Draft Messages"
            value={dash.pending_messages}
            icon={MessageSquare}
            variant="purple"
            progress={Math.min(100, dash.pending_messages * 20)}
          />
        </div>
      )}

      {/* Plan Generation Dock */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider flex-shrink-0">
          <Plus className="w-4 h-4 text-cyan-400" />
          <span>Synthesize Response Plan:</span>
        </div>
        <select
          value={selectedIncidentId}
          onChange={e => setSelectedIncidentId(e.target.value)}
          className="flex-1 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 w-full sm:w-auto outline-none focus:border-cyan-500"
        >
          <option value="">— Select an incident to synthesize tactical response plan —</option>
          {incidents.map(inc => (
            <option key={inc.id} value={inc.id}>
              [{inc.priority_level?.toUpperCase()}] {inc.title} ({inc.incident_type})
            </option>
          ))}
        </select>
        <button
          onClick={handleGeneratePlan}
          disabled={!selectedIncidentId || generating}
          className="flex items-center gap-2 text-xs font-bold px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-500/25 disabled:opacity-50 transition-all active:scale-95 w-full sm:w-auto justify-center"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Generate Protocol
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === t.key
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.count !== undefined && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                activeTab === t.key ? 'bg-cyan-400/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Plans */}
      {activeTab === 'plans' && (
        <div className="space-y-3">
          {plansLoading && <CardSkeleton count={3} />}
          {!plansLoading && plans?.length === 0 && (
            <EmptyState
              icon={FileText}
              title="No Response Plans Synthesized"
              description="Select an incident above to generate an actionable response checklist and safety protocol."
              actionLabel="Sync Incidents"
              onAction={refetchAll}
            />
          )}
          {plans?.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              incidents={incidents}
              teams={teams || []}
              onRefresh={refetchAll}
            />
          ))}
        </div>
      )}

      {/* Tab 2: Assignments */}
      {activeTab === 'assignments' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
          {/* Assignment List — sticky scrollable left panel */}
          <div className="lg:col-span-2 space-y-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto pr-0.5">
            {/* Panel header */}
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Deployments</span>
              <span className="text-[10px] font-mono text-slate-500">{assignments?.length || 0} units</span>
            </div>
            {assignmentsLoading && <CardSkeleton count={3} />}
            {!assignmentsLoading && assignments?.length === 0 && (
              <EmptyState
                icon={ShieldCheck}
                title="No Deployments Registered"
                description="Approve a response plan and assign an available rescue team to initialize field deployment."
              />
            )}
            {assignments?.map(a => {
              const isSelected = selectedAssignment?.id === a.id;
              const completedCount = a.checklist ? a.checklist.filter(c => c.completed).length : 0;
              const totalCount = a.checklist?.length || 0;
              const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
              const priorityColors: Record<string, string> = {
                critical: 'text-red-400',
                high: 'text-orange-400',
                medium: 'text-amber-400',
                low: 'text-slate-400',
              };
              const priorityColor = priorityColors[a.priority_at_assignment || 'medium'] || 'text-amber-400';

              return (
                <motion.div
                  key={a.id}
                  layout
                  onClick={() => setSelectedAssignment(a)}
                  className={`glass-panel p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded shrink-0">
                          {a.team_code || 'UNIT'}
                        </span>
                        <StatusBadge status={a.status} />
                        {a.is_demo && <DemoBadge />}
                      </div>
                      <h4 className="text-xs font-bold text-white truncate">{a.team_name}</h4>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {a.incident_title || a.incident_id}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs text-cyan-400 font-bold">{completedCount}/{totalCount}</span>
                      <div className={`text-[10px] font-bold capitalize mt-0.5 ${priorityColor}`}>
                        {a.priority_at_assignment || 'medium'}
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {isSelected && (
                    <div className="mt-2 text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
                      SELECTED — view details →
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Assignment Detail Panel — takes 3 of 5 cols */}
          <div className="lg:col-span-3">
            {selectedAssignment ? (
              <AssignmentDetail
                assignment={selectedAssignment}
                onRefresh={refreshAndUpdateSelected}
              />
            ) : (
              <div className="glass-panel p-10 rounded-2xl border border-slate-800 text-center text-slate-500">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30 text-cyan-400" />
                <h4 className="text-sm font-bold text-slate-300 mb-1">Select Active Deployment</h4>
                <p className="text-xs max-w-sm mx-auto text-slate-500">
                  Click any deployment card on the left to review the execution checklist, operational timeline, and generate multilingual field radio comms.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Teams */}
      {activeTab === 'teams' && (
        <div>
          {teamsLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <CardSkeleton count={6} />
            </div>
          )}
          {!teamsLoading && teams?.length === 0 && (
            <EmptyState
              icon={Users}
              title="No Rescue Units Found"
              description="Rescue units can be seeded via the backend orchestrator."
            />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams?.map(team => (
              <TeamCard key={team.id} team={team} onStatusChange={refetchTeams} />
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
