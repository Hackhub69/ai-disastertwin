import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, RotateCcw, AlertTriangle, BarChart2, Zap, Droplets,
  CloudRain, Flame, Activity, CheckCircle, RefreshCw, MapPin, Users
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { createSimulation } from '../services/api';
import type { SimulationResult } from '../types';
import DemoBadge from '../components/DemoBadge';
import PageContainer from '../components/PageContainer';
import DashboardStatCard from '../components/DashboardStatCard';
import IncidentPriorityBadge from '../components/IncidentPriorityBadge';
import { useToast } from '../components/ToastContext';

interface ScenarioMeta {
  id: string;
  name: string;
  icon: React.ElementType;
  desc: string;
  region: string;
  color: string;
  glow: string;
}

const SCENARIOS: ScenarioMeta[] = [
  {
    id: 'urban_flooding',
    name: 'Urban Flooding',
    icon: Droplets,
    desc: 'Rapid onset inundation & coastal surge',
    region: 'Mumbai Metropolitan Region',
    color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-400',
    glow: 'rgba(6,182,212,0.25)',
  },
  {
    id: 'heavy_rainfall',
    name: 'Heavy Monsoon Rainfall',
    icon: CloudRain,
    desc: 'Sustained precipitation & drainage failure',
    region: 'Bengaluru Tech Corridor',
    color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/40 text-blue-400',
    glow: 'rgba(59,130,246,0.25)',
  },
  {
    id: 'heatwave',
    name: 'Extreme Heatwave',
    icon: Activity,
    desc: 'Critical wet-bulb threshold emergency',
    region: 'National Capital Region (Delhi)',
    color: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400',
    glow: 'rgba(245,158,11,0.25)',
  },
  {
    id: 'wildfire',
    name: 'Wildfire / Thermal Event',
    icon: Flame,
    desc: 'Rapidly spreading perimeter firefront',
    region: 'Ahmedabad Peri-Urban Belt',
    color: 'from-red-500/20 to-rose-500/10 border-red-500/40 text-red-400',
    glow: 'rgba(239,68,68,0.25)',
  },
];

const SEVERITY_COLORS = ['#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444'];

export default function Simulator() {
  const { addToast } = useToast();
  const [scenario, setScenario] = useState('urban_flooding');
  const [intensity, setIntensity] = useState(0.65);
  const [numLocations, setNumLocations] = useState(6);
  const [numResources, setNumResources] = useState(4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState('');

  const runSimulation = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await createSimulation({
        scenario_type: scenario,
        intensity,
        num_locations: numLocations,
        num_resources: numResources,
      });
      setResult(data as any);
      addToast({
        title: 'Simulation Synthesized',
        message: `Injected ${(data as any).incidents?.length || numLocations} synthetic incidents across the operational grid.`,
        type: 'success',
      });
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Simulation run failed';
      setError(msg);
      addToast({
        title: 'Simulation Error',
        message: msg,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const severityChartData = result
    ? [1, 2, 3, 4, 5].map(s => ({
        name: `Severity ${s}`,
        count: result.summary?.by_severity?.[String(s)] || 0,
      }))
    : [];

  const activeScenarioMeta = SCENARIOS.find(s => s.id === scenario) || SCENARIOS[0];

  return (
    <PageContainer
      title="Disaster Twin Simulator"
      subtitle="Synthesize high-fidelity scenario twins to stress-test multi-agent dispatch pipelines and operational readiness."
      badge={{
        label: 'ISOLATED SYNTHETIC ENVIRONMENT',
        variant: 'purple',
      }}
      actions={
        result && (
          <button
            onClick={() => {
              setResult(null);
              addToast({
                title: 'Workspace Reset',
                message: 'Cleared simulation results.',
                type: 'info',
              });
            }}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-semibold transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Twin
          </button>
        )
      }
    >
      {/* Simulation Safety Warning */}
      <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Simulation Sandbox Guardrails Active
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
              SYNTHETIC DATA TAGGED
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            All generated incidents and telemetry are synthetic mathematical models. They are tagged with <span className="text-purple-300 font-mono font-bold">SYNTHETIC</span> provenance markers to safeguard against confusion with authentic real-world dispatches.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Controls Column */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Scenario Parameters
            </h3>
            <span className="text-[10px] font-mono text-slate-400">CONFIG V1.2</span>
          </div>

          {/* Scenario Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 block">
              Crisis Scenario Archetype
            </label>
            <div className="space-y-2">
              {SCENARIOS.map(s => {
                const Icon = s.icon;
                const isSelected = scenario === s.id;
                return (
                  <motion.button
                    key={s.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setScenario(s.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 bg-gradient-to-r ${
                      isSelected
                        ? `${s.color} ring-1 ring-cyan-500/60 shadow-lg`
                        : 'from-slate-900/60 to-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-white mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {s.name}
                        </span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{s.desc}</p>
                      <span className="text-[10px] font-mono text-slate-500 mt-1 block">{s.region}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Intensity Slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-300">Hazard Intensity Factor</span>
              <span className="font-mono font-bold text-cyan-400">{(intensity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={intensity}
              onChange={e => setIntensity(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>Moderate (10%)</span>
              <span>Severe (100%)</span>
            </div>
          </div>

          {/* Locations Count */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-300">Cluster Epicenters</span>
              <span className="font-mono font-bold text-cyan-400">{numLocations} nodes</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={numLocations}
              onChange={e => setNumLocations(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>1 Node</span>
              <span>15 Nodes</span>
            </div>
          </div>

          {/* Resources Available */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-300">Target Resources Available</span>
              <span className="font-mono font-bold text-cyan-400">{numResources} assets</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={numResources}
              onChange={e => setNumResources(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Launch Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={runSimulation}
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Executing Twin Telemetry...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Initialize Simulation Twin
              </>
            )}
          </motion.button>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-2 space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 text-red-200 text-xs">
              {error}
            </div>
          )}

          {!result && !loading && (
            <div className="glass-panel p-16 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-cyan-400">
                <Zap className="w-8 h-8 opacity-60" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Twin Simulation Inactive</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Select your disaster parameters on the left and trigger the simulation to inject synthetic incidents, trigger Agent B triage scoring, and populate response pipelines.
              </p>
            </div>
          )}

          {loading && (
            <div className="glass-panel p-16 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 flex items-center justify-center mb-4 text-cyan-400">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Generating Digital Twin Scenario</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Computing spatial-temporal coordinates, assigning severity distributions, and feeding Agent B auto-triage...
              </p>
              <div className="w-48 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
            </div>
          )}

          {result && (
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* 4 Outcome Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <DashboardStatCard
                    label="Synthesized Incidents"
                    value={result.summary?.total_incidents || 0}
                    icon={MapPin}
                    variant="cyan"
                  />
                  <DashboardStatCard
                    label="Critical Tier"
                    value={result.summary?.critical_count || 0}
                    icon={AlertTriangle}
                    variant="red"
                  />
                  <DashboardStatCard
                    label="Avg Severity"
                    value={result.summary?.average_severity ? `${result.summary.average_severity.toFixed(1)}/5` : '—'}
                    icon={Activity}
                    variant="amber"
                  />
                  <DashboardStatCard
                    label="Archetype"
                    value={result.scenario_type.replace(/_/g, ' ').toUpperCase()}
                    icon={Zap}
                    variant="blue"
                  />
                </div>

                {/* Severity Distribution Chart */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-cyan-400" />
                      Injected Incidents by Severity Distribution
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">NORMALIZED FREQUENCY</span>
                  </div>

                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={severityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                        <XAxis
                          dataKey="name"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          axisLine={{ stroke: '#334155' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          allowDecimals={false}
                          axisLine={{ stroke: '#334155' }}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #1e293b',
                            borderRadius: '12px',
                            fontSize: '12px',
                          }}
                          labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {severityChartData.map((_, idx) => (
                            <Cell key={idx} fill={SEVERITY_COLORS[idx] || '#06b6d4'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Injected Incidents Table */}
                <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Telemetry Log of Injected Nodes
                      </h4>
                      <p className="text-[11px] text-slate-400">Available across Incident Management and Live Map</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold border border-purple-500/40">
                        SYNTHETIC
                      </span>
                      <DemoBadge />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-4">Title</th>
                          <th className="py-2.5 px-4">Type</th>
                          <th className="py-2.5 px-4">Severity</th>
                          <th className="py-2.5 px-4">Priority</th>
                          <th className="py-2.5 px-4">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {result.incidents.map((inc: any) => (
                          <tr key={inc.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-white max-w-[200px] truncate">
                              {inc.title}
                            </td>
                            <td className="py-2.5 px-4 capitalize text-slate-300">
                              {inc.incident_type}
                            </td>
                            <td className="py-2.5 px-4 font-mono font-bold text-white">
                              {inc.severity}/5
                            </td>
                            <td className="py-2.5 px-4">
                              <IncidentPriorityBadge priority={inc.priority_level} size="sm" />
                            </td>
                            <td className="py-2.5 px-4 text-slate-400 text-[11px] max-w-[160px] truncate">
                              {inc.address || `${inc.latitude.toFixed(2)}, ${inc.longitude.toFixed(2)}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
