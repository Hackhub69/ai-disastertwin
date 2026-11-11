import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, RefreshCw, Package, Search, Truck, ShieldCheck,
  AlertTriangle, Phone, User, MapPin, Gauge
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { getResources, createResource } from '../services/api';
import type { Resource } from '../types';
import DemoBadge from '../components/DemoBadge';
import PageContainer from '../components/PageContainer';
import DashboardStatCard from '../components/DashboardStatCard';
import EmptyState from '../components/EmptyState';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { useToast } from '../components/ToastContext';

const RESOURCE_TYPES = ['ambulance', 'rescue_team', 'shelter', 'fire_engine', 'medical_supply', 'water_tanker', 'helicopter', 'other'];

const TYPE_ICONS: Record<string, string> = {
  ambulance: '🚑',
  rescue_team: '🦺',
  shelter: '🏠',
  fire_engine: '🚒',
  medical_supply: '💊',
  water_tanker: '🚰',
  helicopter: '🚁',
  other: '📦',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  available:   { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  deployed:    { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  maintenance: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  offline:     { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

function CapacityBar({ capacity, current_load }: { capacity: number; current_load: number }) {
  const pct = capacity > 0 ? Math.min(100, (current_load / capacity) * 100) : 0;
  const color = pct >= 90 ? 'from-red-500 to-rose-600' : pct >= 60 ? 'from-amber-500 to-orange-500' : 'from-emerald-500 to-teal-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-400">Load Factor</span>
        <span className="font-mono text-white font-bold">{current_load}/{capacity} ({Math.round(pct)}%)</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <motion.div
          className={`h-1.5 rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

interface CreateForm {
  name: string;
  resource_type: string;
  latitude: string;
  longitude: string;
  address: string;
  capacity: string;
  operator_name: string;
  contact: string;
}

const defaultForm: CreateForm = {
  name: '',
  resource_type: 'ambulance',
  latitude: '19.0760',
  longitude: '72.8777',
  address: 'Mumbai Central Depot',
  capacity: '4',
  operator_name: 'Field Ops Lead',
  contact: '+91 98200 12345',
};

export default function Resources() {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { data, loading, error, refetch } = useApi(
    () => getResources({ resource_type: filterType || undefined, status: filterStatus || undefined, page_size: 100 }),
    [filterType, filterStatus]
  );

  const filteredItems = (data?.items || []).filter(r => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(term) ||
      (r.address && r.address.toLowerCase().includes(term)) ||
      r.resource_type.toLowerCase().includes(term)
    );
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await createResource({
        name: form.name,
        resource_type: form.resource_type as any,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        address: form.address,
        capacity: parseInt(form.capacity) || 1,
        operator_name: form.operator_name,
        is_demo: true,
      } as any);
      setShowCreate(false);
      setForm(defaultForm);
      addToast({
        title: 'Asset Registered',
        message: `${form.name} registered and ready for Agent C dispatch matching.`,
        type: 'success',
      });
      refetch();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to register resource';
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

  const totalAvailable = data?.items.filter(r => r.status === 'available').length ?? 0;
  const totalDeployed = data?.items.filter(r => r.status === 'deployed').length ?? 0;
  const totalMaintenance = data?.items.filter(r => r.status === 'maintenance' || r.status === 'offline').length ?? 0;

  return (
    <PageContainer
      title="Resource Inventory & Logistics"
      subtitle="Rescue fleet, shelters, medical stations, and heavy equipment readiness tracked across operational grids."
      badge={{
        label: `${data?.total ?? 0} ASSETS LOGGED`,
        variant: 'cyan',
      }}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetch();
              addToast({
                title: 'Logistics Synced',
                message: 'Asset availability and capacity refreshed.',
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
            Register Asset
          </button>
        </div>
      }
    >
      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <DashboardStatCard
          label="Total Fleet Assets"
          value={data?.total ?? 0}
          icon={Package}
          variant="cyan"
          progress={100}
        />
        <DashboardStatCard
          label="Immediately Available"
          value={totalAvailable}
          icon={ShieldCheck}
          variant="emerald"
          progress={data?.total ? (totalAvailable / data.total) * 100 : 0}
        />
        <DashboardStatCard
          label="Field Deployed"
          value={totalDeployed}
          icon={Truck}
          variant="blue"
          progress={data?.total ? (totalDeployed / data.total) * 100 : 0}
        />
        <DashboardStatCard
          label="Offline / Maintenance"
          value={totalMaintenance}
          icon={AlertTriangle}
          variant="amber"
          progress={data?.total ? (totalMaintenance / data.total) * 100 : 0}
        />
      </div>

      {/* Filter Dock */}
      <div className="glass-panel p-3.5 rounded-2xl flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl focus-within:border-cyan-500/50 transition-colors">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assets by name or location..."
            className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-cyan-500"
          >
            <option value="">All Asset Categories</option>
            {RESOURCE_TYPES.map(t => (
              <option key={t} value={t}>
                {TYPE_ICONS[t]} {t.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-cyan-500"
          >
            <option value="">All Operational Statuses</option>
            <option value="available">Available</option>
            <option value="deployed">Deployed</option>
            <option value="maintenance">Maintenance</option>
            <option value="offline">Offline</option>
          </select>

          {(search || filterType || filterStatus) && (
            <button
              onClick={() => {
                setSearch('');
                setFilterType('');
                setFilterStatus('');
              }}
              className="text-xs text-slate-400 hover:text-cyan-400 px-2 py-1.5 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Resource Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton count={6} />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No Logistics Assets Found"
          description={
            search || filterType || filterStatus
              ? "No assets match your search parameters. Try clearing filters."
              : "No emergency response assets have been logged yet. Register a new asset or run seed data."
          }
          actionLabel="Register Asset"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((r, idx) => {
              const statusStyle = STATUS_STYLES[r.status] || {
                bg: 'bg-slate-800',
                text: 'text-slate-400',
                border: 'border-slate-700',
              };

              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900/70 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                          {TYPE_ICONS[r.resource_type] || '📦'}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {r.name}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-400 capitalize">
                            {r.resource_type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                          {r.status}
                        </span>
                        {r.is_demo && <DemoBadge />}
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{r.address || `${r.latitude.toFixed(3)}, ${r.longitude.toFixed(3)}`}</span>
                      </div>

                      <CapacityBar capacity={r.capacity} current_load={r.current_load} />

                      {r.operator_name && (
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                          <span className="text-slate-500 flex items-center gap-1">
                            <User className="w-3 h-3" /> Handler
                          </span>
                          <span className="text-slate-300 font-medium">{r.operator_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>GPS: {r.latitude.toFixed(2)}, {r.longitude.toFixed(2)}</span>
                    <span className="text-cyan-400">Agent C Eligible</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create Asset Modal */}
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
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4 text-cyan-400" />
                    Register Response Resource
                  </h3>
                  <p className="text-[11px] text-slate-400">Add operational asset into the Agent C matching grid</p>
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
                  <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Asset Name *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. NDRF Water Rescue Bravo"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Asset Type</label>
                    <select
                      value={form.resource_type}
                      onChange={e => setForm(f => ({ ...f, resource_type: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 capitalize"
                    >
                      {RESOURCE_TYPES.map(t => (
                        <option key={t} value={t}>
                          {TYPE_ICONS[t]} {t.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Capacity Units</label>
                    <input
                      type="number"
                      min={1}
                      value={form.capacity}
                      onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
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
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Station / Depot Base Address</label>
                  <input
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="e.g. Bandra Fire Brigade Station"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Operator / Team Leader</label>
                    <input
                      value={form.operator_name}
                      onChange={e => setForm(f => ({ ...f, operator_name: e.target.value }))}
                      placeholder="e.g. Inspector Deshmukh"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Radio / Phone Contact</label>
                    <input
                      value={form.contact}
                      onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                      placeholder="+91 98200 12345"
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
                        Registering...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Register Asset
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
