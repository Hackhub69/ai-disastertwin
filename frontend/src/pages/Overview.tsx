import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  AlertTriangle, ShieldAlert, Package, Clock,
  Thermometer, Wind, Droplets, MapPin, Activity, ArrowRight,
  Shield, CheckCircle2, ChevronRight, Zap, RefreshCw, Radio
} from 'lucide-react';
import { usePolling, useApi } from '../hooks/useApi';
import { getDashboardSummary, getIncident, getWeather, updateIncident } from '../services/api';
import DashboardStatCard from '../components/DashboardStatCard';
import IncidentPriorityBadge from '../components/IncidentPriorityBadge';
import DemoBadge from '../components/DemoBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorBanner from '../components/ErrorBanner';
import PageContainer from '../components/PageContainer';
import IncidentDetailDrawer from '../components/IncidentDetailDrawer';
import type { Incident } from '../types';

const TYPE_COLORS: Record<string, string> = {
  flood: '#06b6d4',
  fire: '#ef4444',
  heatwave: '#f97316',
  earthquake: '#a855f7',
  other: '#64748b',
};

const SEVERITY_COLORS = ['#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444'];

const CITIES = [
  { name: 'Mumbai', lat: 19.076, lon: 72.8777 },
  { name: 'New Delhi', lat: 28.6139, lon: 77.209 },
  { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
];

function formatTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return dateStr;
  }
}

function getWeatherIcon(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('thunder')) return '⛈️';
  if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) return '🌧️';
  if (d.includes('snow') || d.includes('sleet') || d.includes('blizzard')) return '❄️';
  if (d.includes('fog') || d.includes('mist') || d.includes('haze')) return '🌫️';
  if (d.includes('cloud') || d.includes('overcast')) return '☁️';
  if (d.includes('partly') || d.includes('mostly')) return '⛅';
  if (d.includes('clear') || d.includes('sunny') || d.includes('fair')) return '☀️';
  return '🌡️';
}

function getTempColor(temp: number): string {
  if (temp >= 42) return 'text-red-400';
  if (temp >= 35) return 'text-orange-400';
  if (temp >= 27) return 'text-amber-400';
  if (temp >= 18) return 'text-cyan-400';
  return 'text-blue-400';
}

function getHumidityColor(h: number): string {
  if (h >= 80) return 'bg-blue-500';
  if (h >= 60) return 'bg-cyan-500';
  if (h >= 40) return 'bg-teal-500';
  return 'bg-amber-500';
}

function getWindLevel(spd: number): { label: string; color: string } {
  if (spd >= 90) return { label: 'Storm', color: 'text-red-400' };
  if (spd >= 60) return { label: 'Strong', color: 'text-orange-400' };
  if (spd >= 30) return { label: 'Moderate', color: 'text-amber-400' };
  if (spd >= 10) return { label: 'Breezy', color: 'text-cyan-400' };
  return { label: 'Calm', color: 'text-slate-400' };
}

function WeatherWidget() {
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);

  const { data, loading, error, refetch } = useApi(
    () => getWeather(selectedCity.lat, selectedCity.lon, selectedCity.name),
    [selectedCity]
  );

  const cur = data?.current;
  const tempColor = cur ? getTempColor(cur.temperature_c ?? 25) : 'text-white';
  const windInfo = cur ? getWindLevel(cur.windspeed_kmh ?? 0) : { label: '—', color: 'text-slate-400' };
  const humidityPct = cur?.humidity_pct ?? 0;
  const weatherDesc = cur?.weather_description ?? '';
  const weatherIcon = weatherDesc ? getWeatherIcon(weatherDesc) : '🌡️';

  return (
    <div className="glass-panel rounded-2xl border border-cyan-500/20 p-0 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <Thermometer className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white tracking-tight truncate">Meteorological Station</h3>
            <p className="text-[10px] text-slate-500 font-mono">Open-Meteo Real-Time Atmospheric Feed</p>
          </div>
        </div>
        <select
          value={selectedCity.name}
          onChange={(e) => {
            const found = CITIES.find((c) => c.name === e.target.value);
            if (found) setSelectedCity(found);
          }}
          className="text-xs bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500 shrink-0"
        >
          {CITIES.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Body */}
      <div className="flex-1 p-4">
        {loading ? (
          <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
            <Activity className="w-5 h-5 animate-spin text-cyan-400" />
            <span>Querying weather station...</span>
          </div>
        ) : error || !data || data.error ? (
          <div className="h-32 flex flex-col items-center justify-center gap-2">
            <p className="text-xs text-slate-400">Weather data temporarily unreachable.</p>
            <button
              onClick={refetch}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold border border-cyan-500/30 rounded-lg px-3 py-1 hover:bg-cyan-500/10 transition-all"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Big weather display */}
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex items-end gap-2">
                <span className={`text-4xl font-black font-mono leading-none ${tempColor}`}>
                  {cur?.temperature_c?.toFixed(1) ?? '—'}
                </span>
                <span className="text-lg font-bold text-slate-400 mb-0.5">°C</span>
              </div>
              <div className="text-right">
                <div className="text-3xl leading-none">{weatherIcon}</div>
                <div className="text-[11px] text-slate-300 capitalize font-medium mt-1 max-w-[90px] text-right leading-tight">
                  {weatherDesc || 'Clear Sky'}
                </div>
              </div>
            </div>

            {/* 2×2 metric grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Humidity */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Humidity</span>
                </div>
                <div className="text-xl font-extrabold text-white font-mono">
                  {humidityPct}<span className="text-sm font-normal text-slate-400">%</span>
                </div>
                <div className="w-full h-1 rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${getHumidityColor(humidityPct)}`}
                    style={{ width: `${Math.min(humidityPct, 100)}%` }}
                  />
                </div>
              </div>

              {/* Wind */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Wind</span>
                </div>
                <div className="text-xl font-extrabold text-white font-mono">
                  {cur?.windspeed_kmh?.toFixed(0) ?? '—'}<span className="text-xs font-normal text-slate-400"> km/h</span>
                </div>
                <div className={`text-[10px] font-bold ${windInfo.color}`}>{windInfo.label}</div>
              </div>

              {/* Precipitation */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Precip.</span>
                </div>
                <div className="text-xl font-extrabold text-white font-mono">
                  {cur?.precipitation_mm?.toFixed(1) ?? '0.0'}<span className="text-xs font-normal text-slate-400"> mm</span>
                </div>
                <div className="w-full h-1 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                    style={{ width: `${Math.min((cur?.precipitation_mm ?? 0) * 10, 100)}%` }}
                  />
                </div>
              </div>

              {/* Feels Like / UV */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Feels Like</span>
                </div>
                <div className={`text-xl font-extrabold font-mono ${tempColor}`}>
                  {cur?.temperature_c != null
                    ? (cur.temperature_c + (humidityPct > 60 ? 2 : -1)).toFixed(1)
                    : '—'}<span className="text-xs font-normal text-slate-400">°C</span>
                </div>
                <div className="text-[10px] text-slate-500">Heat index adjusted</div>
              </div>
            </div>

            {/* Footer status bar */}
            <div className="flex items-center justify-between text-[10px] px-1 pt-1 border-t border-slate-800/60">
              <div className="flex items-center gap-1 text-slate-500">
                <MapPin className="w-3 h-3" />
                <span>{selectedCity.name}, India</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                LIVE FEED
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Overview() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = usePolling(getDashboardSummary, 15000);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [openingIncidentId, setOpeningIncidentId] = useState<string | null>(null);

  const handleWorkflowStateChange = (id: string, status: Incident['status']) => {
    // Keep the drawer responsive while the demo API records the workflow event.
    setSelectedIncident(current => (
      current?.id === id ? { ...current, status } : current
    ));

    void updateIncident(id, { status }).then(updated => {
      setSelectedIncident(current => current?.id === id ? updated : current);
      refetch();
    }).catch(() => {
      // Demo status selections remain visible even if a serverless instance
      // rotates before it can persist the synthetic record.
    });
  };

  const openIncidentDetails = async (incidentId: string) => {
    setOpeningIncidentId(incidentId);
    try {
      // The dashboard intentionally receives compact incident summaries. Fetch
      // the full record before rendering it in the detail inspector.
      setSelectedIncident(await getIncident(incidentId));
    } catch {
      // Preserve access to the incident if its record is unavailable for a
      // moment instead of rendering the incomplete dashboard summary.
      navigate('/incidents');
    } finally {
      setOpeningIncidentId(null);
    }
  };

  const typeChartData = (data?.incidents_by_type && typeof data.incidents_by_type === 'object')
    ? Object.entries(data.incidents_by_type).map(([name, value]) => ({ name, value }))
    : [];

  const severityChartData = (data?.incidents_by_severity && typeof data.incidents_by_severity === 'object')
    ? Object.entries(data.incidents_by_severity).map(([name, value]) => ({
        name: `Sev ${name}`,
        value,
        color: SEVERITY_COLORS[parseInt(name) - 1] || '#64748b',
      }))
    : [];

  return (
    <PageContainer
      title="Disaster Response Command Center"
      subtitle="Multi-Agent AI Emergency Orchestration Deck — Live Telemetry & Field Readiness"
      badge={
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
          OPERATIONAL GRID v2.4
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Feeds
          </button>
          <button
            onClick={() => navigate('/rescue')}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
          >
            <Shield className="w-3.5 h-3.5" />
            Launch Rescue Response
          </button>
        </div>
      }
    >
      {error && <ErrorBanner error={error} onRetry={refetch} />}

      {/* KPI Cards Grid with Staggered Entrance */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.08 } },
        }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <DashboardStatCard
          title="Active Incidents"
          value={data?.active_incidents ?? (loading ? '—' : 0)}
          subtitle="Triaged & responding"
          icon={AlertTriangle}
          color="cyan"
          progress={75}
          onClick={() => navigate('/incidents')}
        />
        <DashboardStatCard
          title="Critical & High"
          value={data?.critical_incidents ?? (loading ? '—' : 0)}
          subtitle="Priority 1 alerts requiring action"
          icon={ShieldAlert}
          color="red"
          badge="PRIORITY"
          onClick={() => navigate('/incidents')}
        />
        <DashboardStatCard
          title="Available Resources"
          value={data?.available_resources ?? (loading ? '—' : 0)}
          subtitle="Responders, boats, ambulances ready"
          icon={Package}
          color="emerald"
          badge="READY"
          onClick={() => navigate('/resources')}
        />
        <DashboardStatCard
          title="Pending Approvals"
          value={data?.pending_approvals ?? (loading ? '—' : 0)}
          subtitle="Human authorizations pending"
          icon={Clock}
          color="amber"
          badge="OPERATOR"
          onClick={() => navigate('/rescue')}
        />
      </motion.div>

      {/* Tactical Quick Links Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/rescue')}
          className="glass-panel p-4 rounded-2xl border border-cyan-500/30 hover:border-cyan-400/60 cursor-pointer transition-all duration-200 group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">Rescue Coordination Room</h4>
              <p className="text-xs text-slate-400">Generate plans, deploy teams, review multilingual comms</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors shrink-0" />
        </div>

        <div
          onClick={() => navigate('/map')}
          className="glass-panel p-4 rounded-2xl border border-blue-500/30 hover:border-blue-400/60 cursor-pointer transition-all duration-200 group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-105 transition-transform">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">Tactical GIS Map View</h4>
              <p className="text-xs text-slate-400">Real-time incident & resource coordinate visualizer</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors shrink-0" />
        </div>

        <div
          onClick={() => navigate('/simulator')}
          className="glass-panel p-4 rounded-2xl border border-purple-500/30 hover:border-purple-400/60 cursor-pointer transition-all duration-200 group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">Disaster Twin Simulator</h4>
              <p className="text-xs text-slate-400">Stress-test scenarios: floods, heatwaves, wildfires</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors shrink-0" />
        </div>
      </div>

      {/* Main Grid: Charts & Weather */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident Type Distribution */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight">Incidents by Disaster Type</h3>
            <span className="text-[11px] text-slate-400 font-mono">Agent A Categorized</span>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
          ) : typeChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-500">No incident data</div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {typeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.name] || '#38bdf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Severity Spectrum */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight">Severity Classification</h3>
            <span className="text-[11px] text-slate-400 font-mono">Scale 1 (Low) to 5 (Extreme)</span>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
          ) : severityChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-500">No severity data</div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {severityChartData.map((entry, index) => (
                      <Cell key={`sev-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Weather Station */}
        <div className="lg:col-span-1">
          <WeatherWidget />
        </div>
      </div>

      {/* Two Column Section: Priority Triage Queue & Recent Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Triage Queue */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              <h3 className="text-sm font-bold text-white tracking-tight">Priority Incident Queue</h3>
            </div>
            <button
              onClick={() => navigate('/incidents')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              All Incidents <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(!data?.recent_incidents || data.recent_incidents.length === 0) ? (
              <p className="text-xs text-slate-500 text-center py-8">No incidents currently reported.</p>
            ) : (
              data.recent_incidents.slice(0, 5).map((inc) => (
                <button
                  type="button"
                  key={inc.id}
                  onClick={() => openIncidentDetails(inc.id)}
                  disabled={openingIncidentId === inc.id}
                  aria-label={`View details for ${inc.title}`}
                  aria-busy={openingIncidentId === inc.id}
                  className="w-full p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-900/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 disabled:cursor-wait disabled:opacity-70 transition-all text-left flex items-center justify-between gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <IncidentPriorityBadge priority={inc.priority_level || 'medium'} size="sm" />
                      <span className="text-[10px] text-slate-400 font-mono capitalize">
                        {inc.incident_type}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white truncate">
                      {inc.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{inc.address}</p>
                  </div>
                  {openingIncidentId === inc.id ? (
                    <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors shrink-0" aria-hidden="true" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Recent Audit Actions */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight">Operational Audit Stream</h3>
            <button
              onClick={() => navigate('/audit')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              View Full Audit <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(!data?.recent_audit || data.recent_audit.length === 0) ? (
              <p className="text-xs text-slate-500 text-center py-8">No recent audit log recorded.</p>
            ) : (
              data.recent_audit.slice(0, 5).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/70 flex items-start gap-3 text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-200 font-mono">{ev.action?.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                        {ev.timestamp ? formatTime(ev.timestamp) : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Actor: <span className="text-cyan-300">{ev.actor || 'system'}</span> · Entity: {ev.entity_type}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Incident Detail Drawer */}
      <IncidentDetailDrawer
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onStatusChange={handleWorkflowStateChange}
        onGeneratePlan={() => {
          setSelectedIncident(null);
          navigate('/rescue');
        }}
      />
    </PageContainer>
  );
}
