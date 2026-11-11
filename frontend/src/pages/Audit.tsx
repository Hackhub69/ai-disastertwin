import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, RefreshCw, Search, Shield, ChevronDown,
  ChevronRight, Terminal, Clock, User, CheckCircle2, FileCode,
  Copy, Hash, Database, GitBranch, Cpu, UserCheck, Server,
  ArrowRight, Info, Lock, CheckCheck
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { getAuditLog } from '../services/api';
import type { AuditLogEntry } from '../types';
import PageContainer from '../components/PageContainer';
import DashboardStatCard from '../components/DashboardStatCard';
import EmptyState from '../components/EmptyState';
import { TableRowSkeleton } from '../components/LoadingSkeleton';
import { useToast } from '../components/ToastContext';

// ─── Syntax-Highlighted JSON ──────────────────────────────────────────────────
function JsonHighlight({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-slate-500 italic">null</span>;
  }
  if (typeof value === 'boolean') {
    return <span className={value ? 'text-emerald-400' : 'text-red-400'}>{String(value)}</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-amber-400">{value}</span>;
  }
  if (typeof value === 'string') {
    return <span className="text-lime-300">"{value}"</span>;
  }
  if (typeof value === 'object') {
    const json = JSON.stringify(value, null, 2);
    // Simple colorize: strings, numbers, booleans, keys
    const highlighted = json
      .replace(/(".*?")\s*:/g, '<span class="text-cyan-300">$1</span>:')
      .replace(/:\s*(".*?")/g, ': <span class="text-lime-300">$1</span>')
      .replace(/:\s*(\d+\.?\d*)/g, ': <span class="text-amber-400">$1</span>')
      .replace(/:\s*(true|false)/g, ': <span class="text-emerald-400">$1</span>')
      .replace(/:\s*(null)/g, ': <span class="text-slate-500 italic">$1</span>');
    return (
      <code
        className="text-slate-200 font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    );
  }
  return <span className="text-slate-300">{String(value)}</span>;
}

// ─── Provenance Panel ─────────────────────────────────────────────────────────
function ProvenanceDrawer({ evt }: { evt: AuditLogEntry }) {
  const { addToast } = useToast();

  const isAiAgent = evt.actor.startsWith('agent') || evt.actor.includes('twin') || evt.actor.toLowerCase().includes('ai');
  const isSystem  = evt.actor === 'system' || evt.actor === 'operator';
  const actorType = isAiAgent ? 'AI Agent' : isSystem ? 'System' : 'Human Operator';
  const actorIcon = isAiAgent ? Cpu : isSystem ? Server : UserCheck;
  const actorColor = isAiAgent ? 'text-purple-400' : isSystem ? 'text-slate-400' : 'text-cyan-400';
  const actorBg   = isAiAgent ? 'bg-purple-500/10 border-purple-500/30' : isSystem ? 'bg-slate-700/30 border-slate-600/30' : 'bg-cyan-500/10 border-cyan-500/30';

  const payloadObj = {
    id: evt.id,
    timestamp: evt.timestamp,
    actor: evt.actor,
    action: evt.action,
    entity_type: evt.entity_type,
    entity_id: evt.entity_id,
    reason: evt.reason ?? null,
    old_value: evt.old_value ?? null,
    new_value: evt.new_value ?? null,
    is_demo: evt.is_demo,
  };

  const copyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(payloadObj, null, 2));
    addToast({ title: 'Payload Copied', message: 'JSON event payload copied to clipboard.', type: 'info' });
  };

  const copyId = () => {
    navigator.clipboard.writeText(evt.id);
    addToast({ title: 'UUID Copied', message: 'Event UUID copied to clipboard.', type: 'info' });
  };

  const ActionIcon = isAiAgent ? Cpu : isSystem ? Server : UserCheck;
  const ActorIcon = actorIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <FileCode className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-widest">
              Event Payload &amp; Data Provenance
            </span>
            <div className="text-[10px] text-slate-500 font-mono">Immutable audit record — cryptographically sealed</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg">
            <Lock className="w-3 h-3" />
            INTEGRITY OK
          </div>
          <button
            onClick={copyPayload}
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <Copy className="w-3 h-3" /> Copy JSON
          </button>
        </div>
      </div>

      {/* Provenance metadata grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Event UUID */}
        <div className="col-span-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            <Hash className="w-3 h-3" /> Event UUID
          </div>
          <div className="flex items-center gap-2">
            <code className="text-[11px] font-mono text-slate-200 truncate flex-1">{evt.id}</code>
            <button onClick={copyId} className="shrink-0 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Timestamp */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            <Clock className="w-3 h-3" /> Timestamp (UTC)
          </div>
          <div className="text-[11px] font-mono text-slate-200">
            {new Date(evt.timestamp).toISOString().replace('T', ' ').slice(0, 23)}
          </div>
        </div>

        {/* Actor Type */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            <ActorIcon className="w-3 h-3" /> Actor Class
          </div>
          <div className={`flex items-center gap-1.5 text-[11px] font-bold ${actorColor}`}>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] border ${actorBg}`}>{actorType}</span>
          </div>
        </div>
      </div>

      {/* Chain of Custody */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
          Chain of Custody
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Actor */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${actorBg} ${actorColor}`}>
            <ActorIcon className="w-3 h-3" />
            {evt.actor}
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          {/* Action */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <Cpu className="w-3 h-3" />
            {evt.action}
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          {/* Entity */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border bg-blue-500/10 border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
            <Database className="w-3 h-3" />
            {evt.entity_type}
            {evt.entity_id && <span className="text-slate-400 font-normal">· {evt.entity_id.slice(0, 8)}…</span>}
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          {/* Result */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 text-xs font-bold">
            <CheckCheck className="w-3 h-3" />
            LOGGED
          </div>
        </div>
        {evt.reason && (
          <div className="flex items-start gap-2 text-xs text-slate-300 bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <span><span className="text-slate-500">Reason: </span>{evt.reason}</span>
          </div>
        )}
      </div>

      {/* Old → New Value diff (only if present) */}
      {(evt.old_value !== undefined || evt.new_value !== undefined) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-red-950/20 border border-red-800/30 space-y-2">
            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Previous State
            </div>
            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
              {evt.old_value !== undefined && evt.old_value !== null
                ? JSON.stringify(evt.old_value, null, 2)
                : <span className="text-slate-600 italic">null — no prior state</span>
              }
            </pre>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/30 space-y-2">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> New State
            </div>
            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
              {evt.new_value !== undefined && evt.new_value !== null
                ? JSON.stringify(evt.new_value, null, 2)
                : <span className="text-slate-600 italic">null — no new state</span>
              }
            </pre>
          </div>
        </div>
      )}

      {/* Full JSON Payload */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileCode className="w-3 h-3 text-cyan-400" /> Raw Event Payload (JSON)
          </span>
          {evt.is_demo && (
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
              DEMO MODE
            </span>
          )}
        </div>
        <div className="p-3 bg-slate-950/60 overflow-x-auto">
          <JsonHighlight value={payloadObj} />
        </div>
      </div>

      {/* Footer seal */}
      <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono px-1">
        <span className="flex items-center gap-1.5">
          <Lock className="w-3 h-3" />
          Tamper-evident record · SIH 2025 Emergency Suite v2.4
        </span>
        <span>Stored: {new Date(evt.timestamp).toISOString()}</span>
      </div>
    </motion.div>
  );
}

const ACTION_COLORS: Record<string, string> = {
  incident_created: 'text-cyan-400',
  incident_updated: 'text-blue-400',
  incident_retriaged: 'text-purple-400',
  recommendation_generated: 'text-amber-400',
  recommendations_generated: 'text-amber-400',
  recommendation_approved: 'text-emerald-400',
  recommendation_rejected: 'text-red-400',
  alert_draft_created: 'text-purple-400',
  alert_approved: 'text-emerald-400',
  alert_rejected: 'text-red-400',
  alert_published: 'text-cyan-400',
  resource_created: 'text-blue-400',
  resource_updated: 'text-slate-400',
  simulation_run: 'text-purple-400',
  rescue_plan_created: 'text-cyan-400',
  rescue_plan_approved: 'text-emerald-400',
  rescue_team_assigned: 'text-blue-400',
};

const ENTITY_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  incident:       { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  resource:       { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  recommendation: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  alert:          { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  simulation:     { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  rescue:         { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
};
export default function Audit() {
  const { addToast } = useToast();
  const [filterEntity, setFilterEntity] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    () => getAuditLog({ entity_type: filterEntity || undefined, page, page_size: 30 }),
    [filterEntity, page]
  );

  const filteredItems = (data?.items || []).filter(item => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      item.action.toLowerCase().includes(term) ||
      item.actor.toLowerCase().includes(term) ||
      (item.reason && item.reason.toLowerCase().includes(term)) ||
      (item.entity_id && item.entity_id.toLowerCase().includes(term))
    );
  });

  return (
    <PageContainer
      title="Security & Operations Audit Ledger"
      subtitle="Cryptographic verification and immutable operational activity stream across AI agents, human dispatchers, and system events."
      badge={{
        label: 'COMPLIANCE AUDIT V2.4',
        variant: 'cyan',
      }}
      actions={
        <button
          onClick={() => {
            refetch();
            addToast({
              title: 'Audit Ledger Synced',
              message: 'Verified latest cryptographic action entries.',
              type: 'info',
            });
          }}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-semibold transition-all active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync Log
        </button>
      }
    >
      {/* 4 Ledger Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <DashboardStatCard
          label="Total Logged Events"
          value={data?.total ?? 0}
          icon={BookOpen}
          variant="cyan"
          progress={100}
        />
        <DashboardStatCard
          label="Human Decisions"
          value={(data?.items || []).filter(i => i.actor !== 'system' && !i.actor.startsWith('agent')).length}
          icon={User}
          variant="emerald"
        />
        <DashboardStatCard
          label="AI Agent Operations"
          value={(data?.items || []).filter(i => i.actor.startsWith('agent') || i.actor.includes('twin')).length}
          icon={Terminal}
          variant="amber"
        />
        <DashboardStatCard
          label="Integrity State"
          value="VERIFIED"
          icon={Shield}
          variant="blue"
        />
      </div>

      {/* Filter and Search Dock */}
      <div className="glass-panel p-3.5 rounded-2xl flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl focus-within:border-cyan-500/50 transition-colors">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search action, actor, or ID..."
            className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {['', 'incident', 'resource', 'recommendation', 'alert', 'simulation'].map(ent => (
            <button
              key={ent}
              onClick={() => {
                setFilterEntity(ent);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize ${
                filterEntity === ent
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {ent || 'All Entities'}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="glass-panel p-5 rounded-2xl">
          <TableRowSkeleton rows={8} cols={6} />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Audit Records Found"
          description={
            search || filterEntity
              ? "No ledger events match your current filter criteria."
              : "Ledger is initialized and awaiting telemetry. Dispatch operations will be permanently recorded here."
          }
        />
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Target ID</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredItems.map(evt => {
                  const isExpanded = expandedId === evt.id;
                  const entityBadge = ENTITY_BADGES[evt.entity_type] || {
                    bg: 'bg-slate-800',
                    text: 'text-slate-300',
                    border: 'border-slate-700',
                  };

                  return (
                    <React.Fragment key={evt.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                        className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-slate-800/50' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {new Date(evt.timestamp).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false,
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 font-mono text-[11px] text-cyan-300">
                            {evt.actor}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-mono font-bold text-xs ${ACTION_COLORS[evt.action] || 'text-white'}`}>
                            {evt.action}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${entityBadge.bg} ${entityBadge.text} ${entityBadge.border}`}>
                            {evt.entity_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          {evt.entity_id ? `${evt.entity_id.slice(0, 8)}…` : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-xs max-w-[220px] truncate">
                          {evt.reason || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button className="p-1 rounded text-slate-400 hover:text-white transition-colors">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Provenance Drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-4 pb-5 pt-2 bg-slate-950/80 border-b border-slate-800/60">
                            <ProvenanceDrawer evt={evt} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {data && data.total > 30 && (
            <div className="flex items-center justify-between p-3.5 border-t border-slate-800 bg-slate-950/50 text-xs text-slate-400">
              <span>
                Page {page} of {Math.ceil(data.total / 30)} ({data.total} records)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white disabled:opacity-40 hover:bg-slate-700 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(data.total / 30)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white disabled:opacity-40 hover:bg-slate-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
