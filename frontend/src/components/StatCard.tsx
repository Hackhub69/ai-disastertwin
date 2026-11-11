import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  color?: 'cyan' | 'red' | 'amber' | 'green' | 'blue' | 'purple';
  trend?: { value: number; label: string };
  loading?: boolean;
}

const colorMap = {
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    icon: 'text-cyan-400',
    value: 'text-cyan-400',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-400',
    value: 'text-red-400',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
    value: 'text-amber-400',
  },
  green: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: 'text-green-400',
    value: 'text-green-400',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    value: 'text-blue-400',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: 'text-purple-400',
    value: 'text-purple-400',
  },
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'cyan',
  trend,
  loading = false,
}: StatCardProps) {
  const c = colorMap[color];

  return (
    <div className={`bg-slate-800 rounded-xl border ${c.border} p-4 flex items-start gap-4`}>
      {Icon && (
        <div className={`flex-shrink-0 p-2.5 rounded-lg ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{title}</p>
        {loading ? (
          <div className="mt-1 h-7 w-20 bg-slate-700 animate-pulse rounded" />
        ) : (
          <p className={`text-2xl font-bold mt-0.5 ${c.value}`}>{value}</p>
        )}
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        {trend && (
          <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-red-400' : 'text-green-400'}`}>
            {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)} {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}
