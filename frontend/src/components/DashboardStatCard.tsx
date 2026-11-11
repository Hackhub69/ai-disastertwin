import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface DashboardStatCardProps {
  title?: string;
  label?: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  color?: 'cyan' | 'red' | 'amber' | 'emerald' | 'blue' | 'purple';
  variant?: 'cyan' | 'red' | 'amber' | 'emerald' | 'blue' | 'purple' | string;
  trend?: { value: number; label: string; positiveIsGood?: boolean };
  badge?: string;
  progress?: number; // 0 to 100
  onClick?: () => void;
  loading?: boolean;
}

const colorStyles = {
  cyan: {
    border: 'border-cyan-500/30 hover:border-cyan-400/50',
    iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    val: 'text-cyan-400',
    glow: 'hover:shadow-[0_0_25px_-5px_rgba(6,182,212,0.25)]',
    bar: 'bg-cyan-500',
  },
  red: {
    border: 'border-red-500/30 hover:border-red-400/50',
    iconBg: 'bg-red-500/10 text-red-400 border-red-500/20',
    val: 'text-red-400',
    glow: 'hover:shadow-[0_0_25px_-5px_rgba(239,68,68,0.25)]',
    bar: 'bg-red-500',
  },
  amber: {
    border: 'border-amber-500/30 hover:border-amber-400/50',
    iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    val: 'text-amber-400',
    glow: 'hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.25)]',
    bar: 'bg-amber-500',
  },
  emerald: {
    border: 'border-emerald-500/30 hover:border-emerald-400/50',
    iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    val: 'text-emerald-400',
    glow: 'hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)]',
    bar: 'bg-emerald-500',
  },
  blue: {
    border: 'border-blue-500/30 hover:border-blue-400/50',
    iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    val: 'text-blue-400',
    glow: 'hover:shadow-[0_0_25px_-5px_rgba(59,130,246,0.25)]',
    bar: 'bg-blue-500',
  },
  purple: {
    border: 'border-purple-500/30 hover:border-purple-400/50',
    iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    val: 'text-purple-400',
    glow: 'hover:shadow-[0_0_25px_-5px_rgba(168,85,247,0.25)]',
    bar: 'bg-purple-500',
  },
};

export default function DashboardStatCard({
  title,
  label,
  value,
  subtitle,
  icon: Icon,
  color = 'cyan',
  variant,
  trend,
  badge,
  progress,
  onClick,
  loading = false,
}: DashboardStatCardProps) {
  const displayTitle = title || label || '';
  const effectiveColor = (variant || color || 'cyan') as keyof typeof colorStyles;
  const c = colorStyles[effectiveColor] || colorStyles.cyan;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`glass-panel p-4 sm:p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden ${c.border} ${c.glow} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{displayTitle}</span>
            {badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {badge}
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-8 w-24 bg-slate-800 animate-pulse rounded-lg my-1" />
          ) : (
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${c.val} font-mono`}>
              {value}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl border shrink-0 ${c.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend || progress !== undefined) && (
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-col gap-2">
          {progress !== undefined && (
            <div className="w-full bg-slate-800/90 rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${c.bar}`}
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-2 text-xs">
            {subtitle && <span className="text-slate-400 truncate">{subtitle}</span>}
            {trend && (
              <span
                className={`flex items-center font-medium shrink-0 ml-auto ${
                  trend.value >= 0
                    ? trend.positiveIsGood !== false
                      ? 'text-emerald-400'
                      : 'text-red-400'
                    : trend.positiveIsGood !== false
                    ? 'text-red-400'
                    : 'text-emerald-400'
                }`}
              >
                {trend.value >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                {Math.abs(trend.value)}% {trend.label}
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
