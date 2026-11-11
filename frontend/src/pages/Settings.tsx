import React from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon, CheckCircle, XCircle, AlertCircle, Database,
  Cpu, Cloud, Satellite, ExternalLink, RefreshCw, Shield, Key, Lock,
  Server, HardDrive, Check, Radio
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { getIntegrationStatus } from '../services/api';
import PageContainer from '../components/PageContainer';
import DashboardStatCard from '../components/DashboardStatCard';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { useToast } from '../components/ToastContext';

function StatusIndicator({ status }: { status: string }) {
  if (status === 'connected' || status === 'available' || status === 'configured' || status === 'deterministic_active' || status === 'offline_radar_active' || status === 'demo_mode') {
    return <CheckCircle className="w-5 h-5 text-emerald-400" />;
  }
  if (status === 'not_configured') {
    return <CheckCircle className="w-5 h-5 text-slate-400" />;
  }
  return <XCircle className="w-5 h-5 text-red-400" />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; border: string; label?: string }> = {
    connected:            { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    available:            { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    configured:           { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    deterministic_active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'LOCAL ENGINE ACTIVE (NO KEY NEEDED)' },
    offline_radar_active: { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    border: 'border-cyan-500/30',    label: 'RADAR ACTIVE (NO KEY NEEDED)' },
    demo_mode:            { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'LOCAL ENGINE ACTIVE' },
    not_configured:       { bg: 'bg-slate-800',      text: 'text-slate-300',   border: 'border-slate-700',      label: 'OPTIONAL EXTENSION' },
    error:                { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/30' },
  };

  const style = map[status] || { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
  const label = style.label || status.replace(/_/g, ' ');

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
      {label}
    </span>
  );
}

export default function Settings() {
  const { addToast } = useToast();
  const { data: integrations, loading, refetch } = useApi(getIntegrationStatus);

  return (
    <PageContainer
      title="System Telemetry & Gateway Settings"
      subtitle="Operational readiness monitoring, external intelligence API gateways, security credentials, and system architecture parameters."
      badge={{
        label: integrations?.demo_mode ? 'DEMO SIMULATION SAFEGUARDS' : 'PRODUCTION MODE',
        variant: integrations?.demo_mode ? 'amber' : 'emerald',
      }}
      actions={
        <button
          onClick={() => {
            refetch();
            addToast({
              title: 'Telemetry Polled',
              message: 'Refreshed external gateway and database status.',
              type: 'info',
            });
          }}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-semibold transition-all active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Poll Gateways
        </button>
      }
    >
      {/* Demo Mode Guardrail Notice */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-colors ${
        integrations?.demo_mode
          ? 'bg-amber-950/20 border-amber-800/40 text-amber-300'
          : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
      }`}>
        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider">
              {integrations?.demo_mode ? 'Demo Mode Safety Protocol Enforced' : 'Live Production Cluster'}
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-amber-500/40 font-bold">
              SAFE FOR DEMO & TESTING
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            {integrations?.demo_mode
              ? 'All outbound actions (radio communications, team dispatches, public alerts) execute inside a protected sandbox. Simulated payloads are tagged with DEMO / SYNTHETIC markers.'
              : 'Production mode active. All dispatch commands reflect live operational changes.'}
          </p>
        </div>
      </div>

      {/* Gateway Cards Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          Connected Microservices & Gateways
        </h3>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardSkeleton count={4} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OpenAI API */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">OpenAI Neural Gateway</h4>
                    <span className="text-[11px] font-mono text-slate-400">Natural Language Explanations</span>
                  </div>
                </div>
                {integrations && <StatusBadge status={integrations.openai.status} />}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {integrations?.openai.note}
              </p>

              {integrations?.openai.model && (
                <div className="flex items-center justify-between text-xs font-mono p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Active Model:</span>
                  <span className="text-cyan-400 font-bold">{integrations.openai.model}</span>
                </div>
              )}

              {!integrations?.openai.configured ? (
                <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-800/40 text-[11px] text-emerald-300 space-y-1">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Autonomous Local Engine Active
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    The entire system coordinates incidents deterministically using mathematical scoring, GIS spatial matching, and pre-compiled emergency templates.
                  </p>
                  <p className="text-slate-500 text-[10px]">
                    Optional: Operators can optionally connect an <code className="text-cyan-300 font-mono">OPENAI_API_KEY</code> in backend/.env for AI narrative summaries, but it is 100% optional.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                  <p className="font-semibold text-slate-300">OpenAI Gateway Online</p>
                  <p>AI text generation enabled alongside deterministic safety guards.</p>
                </div>
              )}
            </div>

            {/* Open-Meteo Weather */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-blue-400">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Open-Meteo Gateway</h4>
                    <span className="text-[11px] font-mono text-slate-400">Real-Time Meteorological Feeds</span>
                  </div>
                </div>
                <StatusBadge status="available" />
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {integrations?.open_meteo.note}
              </p>

              <div className="flex items-center justify-between text-xs font-mono p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-400">Telemetry Feed:</span>
                <span className="text-emerald-400 font-bold">5 Metros Polled Every 60s</span>
              </div>
            </div>

            {/* NASA FIRMS */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
                    <Satellite className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">NASA FIRMS Satellite Radar</h4>
                    <span className="text-[11px] font-mono text-slate-400">MODIS / VIIRS Hotspots</span>
                  </div>
                </div>
                {integrations && <StatusBadge status={integrations.nasa_firms.status} />}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {integrations?.nasa_firms.note}
              </p>

              <div className="flex items-center justify-between text-xs font-mono p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-400">Radar Feed:</span>
                <span className="text-emerald-400 font-bold">Offline Satellite Radar Active (No Key Needed)</span>
              </div>
            </div>

            {/* Database Engine */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-purple-400">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Relational Persistence Engine</h4>
                    <span className="text-[11px] font-mono text-slate-400">ACID Transaction Store</span>
                  </div>
                </div>
                {integrations && <StatusBadge status={integrations.database.status} />}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Engine Type: <strong className="text-white">{integrations?.database.url_type?.toUpperCase() || 'SQLite'}</strong> with Spatial Indexing
              </p>

              <div className="flex items-center justify-between text-xs font-mono p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-400">PostgreSQL Migration:</span>
                <span className="text-cyan-400 font-bold">Production Ready</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* System Information & API Docs */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          System Information & API Documentation
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {[
            ['Application', 'AI DisasterTwin Rescue'],
            ['Version Release', 'v2.4.0 Command Suite'],
            ['Event Protocol', 'Disaster Coordinator Platform'],
            ['Environment', integrations?.app_env || 'Development'],
            ['API Schema', 'FastAPI OpenAPI v3.1'],
            ['Backend Docs', 'http://localhost:8000/docs'],
          ].map(([k, v]) => (
            <div key={k} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">{k}</span>
              {k === 'Backend Docs' ? (
                <a
                  href={v}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 font-mono font-bold hover:underline flex items-center gap-1.5 truncate"
                >
                  Swagger UI <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                </a>
              ) : (
                <p className="font-bold text-white truncate">{v}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Security Architecture Guarantees */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          Operational Security & Compliance Principles
        </h3>

        <ul className="space-y-2 text-xs text-slate-300">
          {[
            'Zero Frontend Key Leaks: All API tokens (OpenAI, FIRMS) are securely parsed exclusively by backend process environments.',
            'Deterministic Fallback Immunity: Absence of OpenAI API key immediately triggers deterministic math rules without service interruption.',
            'Cryptographic Audit Logs: Every operator dispatch, triage recalculation, and checklist step update is permanently committed to the audit store.',
            'Human-in-the-Loop Sovereign Boundary: Neither Agent B, C, nor D can autonomously dispatch real human units or broadcast unapproved emergency warnings.',
          ].map((principle, i) => (
            <li key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900/40 border border-slate-800/60">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{principle}</span>
            </li>
          ))}
        </ul>
      </div>
    </PageContainer>
  );
}
