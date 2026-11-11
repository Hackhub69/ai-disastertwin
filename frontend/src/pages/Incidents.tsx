import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, ChevronRight, X, AlertTriangle, RefreshCw, CheckCircle,
  LayoutGrid, List, Shield, ArrowUpRight, Droplets, Flame, Activity, Zap, Users, MapPin, Sparkles
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { getIncidents, createIncident, updateIncident, triageIncident, getRecommendations, approveRecommendation } from '../services/api';
import type { Incident, ResourceRecommendation } from '../types';
import IncidentPriorityBadge from '../components/IncidentPriorityBadge';
import DemoBadge from '../components/DemoBadge';
import PageContainer from '../components/PageContainer';
import IncidentDetailDrawer from '../components/IncidentDetailDrawer';
import EmptyState from '../components/EmptyState';
import { TableRowSkeleton, CardSkeleton } from '../components/LoadingSkeleton';
import { useToast } from '../components/ToastContext';
import { useNavigate } from 'react-router-dom';

const INCIDENT_TYPES = ['flood', 'fire', 'heatwave', 'earthquake', 'other'];

const TYPE_ICONS: Record<string, React.ElementType> = {
  flood: Droplets,
  fire: Flame,
  heatwave: Activity,
  earthquake: Zap,
  other: AlertTriangle,
};

function formatTime(d: string) {
  try {
    return new Date(d).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return d;
  }
}

interface CreateForm {
  title: string;
  description: string;
  incident_type: string;
  latitude: string;
  longitude: string;
  severity: number;
  affected_population: string;
  reporter_name: string;
  address: string;
}

const defaultForm: CreateForm = {
  title: '',
  description: '',
  incident_type: 'flood',
  latitude: '19.0760',
  longitude: '72.8777',
  severity: 3,
  affected_population: '120',
  reporter_name: 'Field Ops',
  address: 'Kurla West, Mumbai',
};

export default function Incidents() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [recommendations, setRecommendations] = useState<ResourceRecommendation[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<Record<string, string>>({});

  const fetcher = useCallback(() => getIncidents({
    search: search || undefined,
    incident_type: filterType || undefined,
    priority_level: filterPriority || undefined,
    status: filterStatus || undefined,
    page,
    page_size: 15,
  }), [search, filterType, filterPriority, filterStatus, page]);

  const { data, loading, error, refetch } = useApi(fetcher, [search, filterType, filterPriority, filterStatus, page]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await createIncident({
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        affected_population: form.affected_population ? parseInt(form.affected_population) : undefined,
        is_demo: true,
      } as any);
      setShowCreate(false);
      setForm(defaultForm);
      addToast({
        title: 'Incident Logged',
        message: `Incident "${form.title}" registered & submitted for Agent B triage.`,
        type: 'success',
      });
      refetch();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'object' ? JSON.stringify(detail) : (detail || err.message || 'Failed to create incident');
      setFormError(msg);
      addToast({
        title: 'Registration Error',
        message: msg,
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateIncident(id, { status } as any);
      addToast({
        title: 'Status Updated',
        message: `Incident state shifted to ${status.toUpperCase()}`,
        type: 'info',
      });
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident(prev => prev ? { ...prev, status: status as any } : null);
      }
      refetch();
    } catch (err: any) {
      addToast({
        title: 'Update Failed',
        message: err.message || 'Could not update status',
        type: 'error',
      });
    }
  };

  const handleRetriage = async (id: string) => {
    try {
      const res = await triageIncident(id);
      addToast({
        title: 'Agent B Re-Triage Complete',
        message: `Calculated priority score: ${res?.priority_score?.toFixed(1) || 'Updated'}`,
        type: 'success',
      });
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident(res);
      }
      refetch();
    } catch (err: any) {
      addToast({
        title: 'Triage Failed',
        message: err.message || 'Could not retriage incident',
        type: 'error',
      });
    }
  };

  const handleGetRecommendations = async (incidentId: string) => {
    setRecLoading(true);
    try {
      const result = await getRecommendations(incidentId);
      const candidates = (result as any).candidates || [];
      setRecommendations(candidates);
      addToast({
        title: 'Agent C Recommendations Ready',
        message: `Calculated ${candidates.length} resource candidates.`,
        type: 'info',
      });
    } catch (err: any) {
      addToast({
        title: 'Recommendations Error',
        message: err.message || 'Unable to retrieve resource candidates',
        type: 'error',
      });
    } finally {
      setRecLoading(false);
    }
  };

  const handleApproval = async (recId: string, decision: 'approved' | 'rejected') => {
    try {
      await approveRecommendation(recId, decision, 'operator', decision === 'rejected' ? 'Operator declined assignment' : 'Authorized for dispatch');
      setApprovalStatus(prev => ({ ...prev, [recId]: decision }));
      addToast({
        title: decision === 'approved' ? 'Assignment Authorized' : 'Assignment Rejected',
        message: `Recommendation ${recId.slice(0, 8)} marked as ${decision}.`,
        type: decision === 'approved' ? 'success' : 'warning',
      });
    } catch (err: any) {
      addToast({
        title: 'Approval Action Failed',
        message: err.message || 'Approval action failed',
        type: 'error',
      });
    }
  };

  return (
    <PageContainer
      title="Incident Intake & Triage"
      subtitle="Intake triage stream, Agent B priority scoring, and tactical resource recommendations."
      badge={{
        label: `${data?.total ?? 0} ACTIVE INCIDENTS`,
        variant: 'cyan',
      }}
      actions={
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-slate-900 border border-slate-700/80 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
              title="Card Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
              title="Data Table"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 text-xs font-semibold transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync
          </button>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Log New Incident
          </button>
        </div>
      }
    >
      {/* Tactical Filter Dock */}
      <div className="glass-panel p-3.5 rounded-2xl flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl focus-within:border-cyan-500/50 transition-colors">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by title, location, or incident ID..."
            className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-full"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1); }}
            className="bg-slate-900/80 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
          >
            <option value="">All Hazard Types</option>
            {INCIDENT_TYPES.map(t => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={e => { setFilterPriority(e.target.value); setPage(1); }}
            className="bg-slate-900/80 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="bg-slate-900/80 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
          >
            <option value="">All Workflow Statuses</option>
            <option value="reported">Reported</option>
            <option value="triaged">Triaged</option>
            <option value="dispatched">Dispatched</option>
            <option value="resolved">Resolved</option>
          </select>

          {(search || filterType || filterPriority || filterStatus) && (
            <button
              onClick={() => {
                setSearch('');
                setFilterType('');
                setFilterPriority('');
                setFilterStatus('');
                setPage(1);
              }}
              className="text-xs text-slate-400 hover:text-cyan-400 px-2 py-1.5 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CardSkeleton count={6} />
          </div>
        ) : (
          <div className="glass-panel p-4 rounded-2xl">
            <TableRowSkeleton rows={5} cols={6} />
          </div>
        )
      ) : !data?.items.length ? (
        <EmptyState
          icon={AlertTriangle}
          title="No Incident Reports Found"
          description={
            search || filterType || filterPriority || filterStatus
              ? "No incident matching the active criteria was found. Try loosening the filter parameters."
              : "All incident sectors report normal status. Ready to receive dispatch reports."
          }
          actionLabel="Report New Incident"
          onAction={() => setShowCreate(true)}
        />
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {data.items.map((incident, idx) => {
              const TypeIcon = TYPE_ICONS[incident.incident_type] || AlertTriangle;
              const isSelected = selectedIncident?.id === incident.id;

              return (
                <motion.div
                  key={incident.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  onClick={() => setSelectedIncident(incident)}
                  className={`glass-panel p-5 rounded-2xl border cursor-pointer transition-all relative group flex flex-col justify-between ${
                    isSelected
                      ? 'border-cyan-500 bg-slate-900/90 shadow-lg shadow-cyan-500/10'
                      : 'border-slate-800/80 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900/70'
                  }`}
                >
                  {/* Top Bar */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-slate-800/90 border border-slate-700 text-cyan-400 group-hover:scale-105 transition-transform">
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          {incident.incident_type}
                        </span>
                      </div>
                      <IncidentPriorityBadge priority={incident.priority_level} size="sm" pulse />
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1 mb-1.5">
                      {incident.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                      {incident.description}
                    </p>
                  </div>

                  {/* Metadata Grid */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate max-w-[170px]">{incident.address || `${incident.latitude.toFixed(2)}, ${incident.longitude.toFixed(2)}`}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{incident.affected_population ? incident.affected_population.toLocaleString() : '—'}</span>
                      </div>
                    </div>

                    {/* Score Bar & Badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-mono">SCORE:</span>
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {incident.priority_score ? incident.priority_score.toFixed(1) : '—'}/100
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                          {incident.status}
                        </span>
                        {incident.is_demo && <DemoBadge />}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Hazard & Title</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Agent B Score</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Time</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {data.items.map((incident) => {
                  const TypeIcon = TYPE_ICONS[incident.incident_type] || AlertTriangle;
                  return (
                    <tr
                      key={incident.id}
                      onClick={() => setSelectedIncident(incident)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400">
                            <TypeIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors max-w-[220px] truncate">
                              {incident.title}
                            </div>
                            <div className="text-[11px] text-slate-400 capitalize">{incident.incident_type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-[180px] truncate">
                        {incident.address || `${incident.latitude.toFixed(2)}, ${incident.longitude.toFixed(2)}`}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-white">{incident.severity}/5</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                        {incident.priority_score ? incident.priority_score.toFixed(1) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <IncidentPriorityBadge priority={incident.priority_level} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                          {incident.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {formatTime(incident.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIncident(incident);
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {data && data.total > 15 && (
        <div className="flex items-center justify-between p-3 glass-panel rounded-xl text-xs text-slate-400">
          <span>
            Page {page} of {Math.ceil(data.total / 15)} ({data.total} incidents)
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
              disabled={page >= Math.ceil(data.total / 15)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white disabled:opacity-40 hover:bg-slate-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Slide-out Incident Detail Drawer */}
      <IncidentDetailDrawer
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onStatusChange={handleStatusUpdate}
        onRetriage={handleRetriage}
        onGeneratePlan={() => {
          navigate('/rescue');
        }}
      />

      {/* Create Incident Modal */}
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
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4 text-cyan-400" />
                    Log Field Emergency Report
                  </h3>
                  <p className="text-[11px] text-slate-400">Synthesize dispatch telemetry into the incident grid</p>
                </div>
                <button
                  onClick={() => setShowCreate(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-5 space-y-4 overflow-y-auto">
                {formError && (
                  <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Incident Title *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Severe Flash Flood Inundation"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Situation Description * (min 10 chars)</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Provide on-ground description, known hazards, stranded individuals..."
                    required
                    rows={3}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Hazard Classification</label>
                    <select
                      value={form.incident_type}
                      onChange={e => setForm(f => ({ ...f, incident_type: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 capitalize"
                    >
                      {INCIDENT_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Severity (1–5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={form.severity}
                      onChange={e => setForm(f => ({ ...f, severity: parseInt(e.target.value) || 1 }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Latitude *</label>
                    <input
                      type="number"
                      step="any"
                      value={form.latitude}
                      onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                      required
                      placeholder="19.0760"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Longitude *</label>
                    <input
                      type="number"
                      step="any"
                      value={form.longitude}
                      onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                      required
                      placeholder="72.8777"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Street Address / Landmark</label>
                  <input
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="e.g. Near CST Railway Station, Mumbai"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Affected Population</label>
                    <input
                      type="number"
                      value={form.affected_population}
                      onChange={e => setForm(f => ({ ...f, affected_population: e.target.value }))}
                      placeholder="120"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Field Reporter ID</label>
                    <input
                      value={form.reporter_name}
                      onChange={e => setForm(f => ({ ...f, reporter_name: e.target.value }))}
                      placeholder="Operator Delta"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Logging Incident...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Confirm & Trigger Triage
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}
