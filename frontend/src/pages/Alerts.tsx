import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Plus, RefreshCw, CheckCircle, XCircle, Globe,
  ShieldCheck, AlertTriangle, Copy, Radio, ThumbsUp, ThumbsDown,
  Clock, Check, X, Info
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { getAlerts, createAlertDraft, approveAlert, getIncidents } from '../services/api';
import type { AlertDraft } from '../types';
import DemoBadge from '../components/DemoBadge';
import PageContainer from '../components/PageContainer';
import DashboardStatCard from '../components/DashboardStatCard';
import EmptyState from '../components/EmptyState';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { useToast } from '../components/ToastContext';

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  draft:     { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' },
  approved:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  rejected:  { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  published: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/40' },
};

export default function Alerts() {
  const { addToast } = useToast();
  const { data, loading, error, refetch } = useApi(getAlerts);
  const { data: incidentsData } = useApi(() => getIncidents({ page_size: 50 }));
  const [selectedAlert, setSelectedAlert] = useState<AlertDraft | null>(null);
  const [lang, setLang] = useState<'en' | 'hi' | 'mr'>('en');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [creating, setCreating] = useState(false);
  const [decidedBy, setDecidedBy] = useState('Commander Officer');
  const [approving, setApproving] = useState(false);

  const handleCreate = async () => {
    if (!selectedIncidentId) return;
    setCreating(true);
    try {
      await createAlertDraft(selectedIncidentId, 'commander_officer');
      setShowCreate(false);
      setSelectedIncidentId('');
      addToast({
        title: 'Alert Draft Synthesized',
        message: 'Agent D generated multilingual alerts (EN, HI, MR).',
        type: 'success',
      });
      refetch();
    } catch (err: any) {
      addToast({
        title: 'Drafting Error',
        message: err.message || 'Failed to synthesize alert draft',
        type: 'error',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleApproval = async (alertId: string, decision: string) => {
    setApproving(true);
    try {
      await approveAlert(
        alertId,
        decision,
        decidedBy || 'commander_officer',
        decision === 'rejected' ? 'Declined by human operator' : 'Authorized for simulated broadcast'
      );
      addToast({
        title: decision === 'approved' ? 'Alert Authorized' : decision === 'published' ? 'Broadcast Simulated' : 'Alert Rejected',
        message: `Alert draft ${alertId.slice(0, 8)} status shifted to ${decision.toUpperCase()}.`,
        type: decision === 'approved' || decision === 'published' ? 'success' : 'warning',
      });
      refetch();
      if (selectedAlert?.id === alertId) {
        setSelectedAlert(prev => prev ? { ...prev, status: decision as any } : null);
      }
    } catch (err: any) {
      addToast({
        title: 'Approval Action Failed',
        message: err.message || 'Failed to record operator decision',
        type: 'error',
      });
    } finally {
      setApproving(false);
    }
  };

  const copyAlert = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({
      title: 'Alert Copied',
      message: 'Transmission text copied to clipboard.',
      type: 'info',
    });
  };

  const alertContent = (a: AlertDraft) => {
    if (lang === 'hi') return a.content_hi || a.content_en;
    if (lang === 'mr') return a.content_mr || a.content_en;
    return a.content_en;
  };

  const totalDrafts = data?.items.filter(a => a.status === 'draft').length ?? 0;
  const totalApproved = data?.items.filter(a => a.status === 'approved').length ?? 0;
  const totalPublished = data?.items.filter(a => a.status === 'published').length ?? 0;

  return (
    <PageContainer
      title="Civil Protection Alerts"
      subtitle="Multilingual emergency public warning studio (English, Hindi, Marathi). Strict Human-in-the-Loop review."
      badge={{
        label: 'BROADCAST GUARDRAILS ACTIVE',
        variant: 'cyan',
      }}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetch();
              addToast({
                title: 'Alert Grid Synced',
                message: 'Refreshed public warning drafts and publication states.',
                type: 'info',
              });
            }}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-semibold transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Synthesize Alert
          </button>
        </div>
      }
    >
      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <DashboardStatCard
          label="Total Warning Drafts"
          value={data?.total ?? 0}
          icon={Bell}
          variant="cyan"
          progress={100}
        />
        <DashboardStatCard
          label="Pending Review"
          value={totalDrafts}
          icon={Clock}
          variant="amber"
          progress={data?.total ? (totalDrafts / data.total) * 100 : 0}
        />
        <DashboardStatCard
          label="Approved Releases"
          value={totalApproved}
          icon={ShieldCheck}
          variant="emerald"
          progress={data?.total ? (totalApproved / data.total) * 100 : 0}
        />
        <DashboardStatCard
          label="Simulated Published"
          value={totalPublished}
          icon={Radio}
          variant="blue"
          progress={data?.total ? (totalPublished / data.total) * 100 : 0}
        />
      </div>

      {/* Mandatory Human Review Guardrail */}
      <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
              Human Operator Review Mandate Active
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-cyan-700 text-cyan-300 font-bold">
              AGENT D PROTECTED
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            All AI-synthesized alerts remain strictly held in <span className="text-amber-300 font-mono font-bold">DRAFT</span> state until an authorized human operator inspects translations and issues explicit broadcast authorization.
          </p>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Alerts List */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <CardSkeleton count={4} />
          ) : !data?.items.length ? (
            <EmptyState
              icon={Bell}
              title="No Public Warning Drafts"
              description="Click 'Synthesize Alert' to generate multilingual citizen advisories from active incidents."
              actionLabel="Synthesize Alert"
              onAction={() => setShowCreate(true)}
            />
          ) : (
            data.items.map(alert => {
              const isSelected = selectedAlert?.id === alert.id;
              const statusStyle = STATUS_STYLES[alert.status] || {
                bg: 'bg-slate-800',
                text: 'text-slate-400',
                border: 'border-slate-700',
              };

              return (
                <motion.div
                  key={alert.id}
                  layout
                  onClick={() => setSelectedAlert(isSelected ? null : alert)}
                  className={`glass-panel p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-cyan-500 bg-slate-900/90 shadow-lg shadow-cyan-500/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white">
                        Advisory • Node {alert.incident_id.slice(0, 8)}
                      </span>
                      <DemoBadge />
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                      {alert.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
                    {alert.content_en}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800/80">
                    <span>Origin: {alert.created_by}</span>
                    <span>{new Date(alert.created_at).toLocaleString()}</span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Selected Alert Studio Panel */}
        <div className="lg:col-span-5">
          {selectedAlert ? (
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col"
            >
              {/* Studio Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    Multilingual Broadcast Studio
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">ID: {selectedAlert.id.slice(0, 10)}</span>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Language Selector */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                  {(['en', 'hi', 'mr'] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        lang === l
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {l === 'en' ? 'English' : l === 'hi' ? 'हिंदी (Hindi)' : 'मराठी (Marathi)'}
                    </button>
                  ))}
                </div>

                {/* Content Box */}
                <div className="relative">
                  <pre className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                    {alertContent(selectedAlert)}
                  </pre>
                  <button
                    onClick={() => copyAlert(alertContent(selectedAlert))}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    title="Copy transmission text"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {selectedAlert.approved_by && (
                  <div className="text-[11px] font-mono text-slate-400 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    Sign-off: <span className="text-white font-bold">{selectedAlert.approved_by}</span>
                  </div>
                )}

                {/* Operator Actions */}
                {selectedAlert.status === 'draft' && (
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Sign-off Operator Identity
                      </label>
                      <input
                        value={decidedBy}
                        onChange={e => setDecidedBy(e.target.value)}
                        className="w-full text-xs bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleApproval(selectedAlert.id, 'approved')}
                        disabled={approving}
                        className="py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Authorize Broadcast
                      </button>
                      <button
                        onClick={() => handleApproval(selectedAlert.id, 'rejected')}
                        disabled={approving}
                        className="py-2.5 px-3 bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Decline Draft
                      </button>
                    </div>
                  </div>
                )}

                {selectedAlert.status === 'approved' && (
                  <button
                    onClick={() => handleApproval(selectedAlert.id, 'published')}
                    disabled={approving}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Radio className="w-4 h-4" />
                    Transmit Broadcast (Simulated Delivery)
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="glass-panel p-10 rounded-2xl border border-slate-800 text-center text-slate-500">
              <Radio className="w-10 h-10 mx-auto mb-3 opacity-30 text-cyan-400" />
              <h4 className="text-sm font-bold text-slate-300 mb-1">Select Warning Advisory</h4>
              <p className="text-xs max-w-xs mx-auto">
                Click any alert on the left to inspect translations in Hindi and Marathi, edit sign-off credentials, and authorize broadcast simulation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Synthesize Alert Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4 text-cyan-400" />
                    Synthesize Multilingual Public Warning
                  </h3>
                  <p className="text-[11px] text-slate-400">Agent D natural language synthesis pipeline</p>
                </div>
                <button
                  onClick={() => setShowCreate(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">
                    Select Target Incident *
                  </label>
                  <select
                    value={selectedIncidentId}
                    onChange={e => setSelectedIncidentId(e.target.value)}
                    className="w-full text-xs bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none focus:border-cyan-500"
                  >
                    <option value="">— Choose an active incident report —</option>
                    {incidentsData?.items.map(inc => (
                      <option key={inc.id} value={inc.id}>
                        [{inc.priority_level?.toUpperCase()}] {inc.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                  Agent D will automatically draft citizen advisories in <strong className="text-white">English</strong>, <strong className="text-white">Hindi</strong>, and <strong className="text-white">Marathi</strong>. All drafts require human authorization.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!selectedIncidentId || creating}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2"
                  >
                    {creating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Synthesizing...
                      </>
                    ) : (
                      <>
                        <Radio className="w-3.5 h-3.5" />
                        Generate Warning Drafts
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}
