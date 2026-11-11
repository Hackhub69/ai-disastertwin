import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Map, AlertTriangle, Bot, Play,
  Package, Bell, BookOpen, Settings, Menu, X,
  Shield, Activity, Wifi, WifiOff, ShieldCheck,
  ChevronLeft, ChevronRight, Search, Radio, User
} from 'lucide-react';
import { getHealth } from '../services/api';
import { ToastProvider } from './ToastContext';

const navItems = [
  { path: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { path: '/map', label: 'Live Incident Map', icon: Map },
  { path: '/incidents', label: 'Incident Management', icon: AlertTriangle },
  { path: '/rescue', label: 'Rescue Response', icon: ShieldCheck, badge: 'ACTIVE' },
  { path: '/agents', label: 'AI Agents', icon: Bot },
  { path: '/simulator', label: 'Disaster Twin Simulator', icon: Play },
  { path: '/resources', label: 'Resource Management', icon: Package },
  { path: '/alerts', label: 'Public Alerts', icon: Bell },
  { path: '/audit', label: 'Audit Log', icon: BookOpen },
  { path: '/settings', label: 'System Settings', icon: Settings },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const location = useLocation();

  // Live military clocks
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        `${now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC`
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Health check
  useEffect(() => {
    const check = async () => {
      try {
        await getHealth();
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  // Current page label
  const activeNavItem = navItems.find((item) =>
    item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)
  ) || navItems[0];

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full bg-slate-950/90 border-r border-slate-800/80 backdrop-blur-xl">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800/80 h-16 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Shield className="w-5 h-5" />
          </div>
          {(!collapsed || isMobile) && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col min-w-0"
            >
              <span className="text-sm font-extrabold text-white tracking-wider leading-none">
                AI DISASTER<span className="text-cyan-400">TWIN</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">
                Rescue Command
              </span>
            </motion.div>
          )}
        </div>

        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map(({ path, label, icon: Icon, end, badge }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            onClick={() => isMobile && setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 relative group ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`
            }
            title={collapsed && !isMobile ? label : undefined}
          >
            <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            {(!collapsed || isMobile) && (
              <span className="truncate flex-1 tracking-wide">{label}</span>
            )}
            {(!collapsed || isMobile) && badge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 shrink-0">
        {(!collapsed || isMobile) ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> Telemetry
              </span>
              <span className="font-mono text-cyan-300 font-bold">{currentTime || '00:00:00 UTC'}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 px-2">
              <span>Emergency Suite</span>
              <span className="text-emerald-400 font-bold">ONLINE</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="System Live">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <ToastProvider>
      <div className="flex h-screen bg-[#090d16] text-slate-100 overflow-hidden font-sans antialiased">
        {/* Desktop Sidebar with Motion Width */}
        <motion.aside
          animate={{ width: collapsed ? 76 : 256 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:block shrink-0 h-full z-30"
        >
          <SidebarContent />
        </motion.aside>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="absolute left-0 top-0 bottom-0 w-64 shadow-2xl z-10"
              >
                <button
                  onClick={() => setMobileOpen(false)}
                  className="absolute top-4 right-3 z-20 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
                <SidebarContent isMobile />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top Command Bar */}
          <header className="h-16 px-4 sm:px-6 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between gap-4 shrink-0 z-20">
            {/* Left: Mobile trigger & Breadcrumbs */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                aria-label="Open navigation menu"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-slate-500 hidden sm:inline">Coordination Deck</span>
                <span className="text-slate-600 hidden sm:inline">/</span>
                <div className="flex items-center gap-1.5 text-white font-bold tracking-tight">
                  <activeNavItem.icon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">{activeNavItem.label}</span>
                </div>
              </div>
            </div>

            {/* Right: Telemetry, Demo Mode, Operator Profile */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {/* Demo Mode Pill */}
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                SIMULATED DATASET
              </div>

              {/* Backend Live Indicator */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  backendOnline === true
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                    : backendOnline === false
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {backendOnline === true ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                ) : backendOnline === false ? (
                  <WifiOff className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                )}
                <span className="hidden sm:inline">
                  {backendOnline === null ? 'Connecting...' : backendOnline ? 'System Live' : 'Offline'}
                </span>
              </div>

              {/* Operator Badge */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 border border-cyan-400/50 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-cyan-500/20">
                  CO
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-xs font-bold text-white leading-none">Commander Officer</span>
                </div>
              </div>
            </div>
          </header>

          {/* Incident Alert Ticker */}
          <div className="bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-950/40 border-b border-cyan-900/30 px-4 py-1.5 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 overflow-hidden truncate">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-red-500 text-white animate-pulse">
                DEFCON 2
              </span>
              <span className="text-slate-300 font-medium truncate">
                Active Multi-Agent Response Grid: Monitoring 5 Incident Sectors across Mumbai, Delhi, Bangalore & Chennai.
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400 font-mono shrink-0">
              <span>AGENTS: 4/4 READY</span>
              <span>•</span>
              <span>TEAMS: 5 DEPLOYABLE</span>
            </div>
          </div>

          {/* Main View Container */}
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
