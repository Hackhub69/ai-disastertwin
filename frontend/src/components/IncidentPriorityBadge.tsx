import React from 'react';
import { AlertCircle, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

interface IncidentPriorityBadgeProps {
  priority: PriorityLevel | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  pulse?: boolean;
  className?: string;
}

const configMap: Record<string, { label: string; icon: React.ElementType; classes: string; dot: string; glow: string }> = {
  critical: {
    label: 'Critical',
    icon: ShieldAlert,
    classes: 'bg-red-500/15 text-red-400 border-red-500/40',
    dot: 'bg-red-500',
    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.35)]',
  },
  high: {
    label: 'High Priority',
    icon: AlertTriangle,
    classes: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
    dot: 'bg-orange-500',
    glow: 'shadow-[0_0_12px_rgba(249,115,22,0.25)]',
  },
  medium: {
    label: 'Medium',
    icon: AlertCircle,
    classes: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
    dot: 'bg-amber-500',
    glow: '',
  },
  low: {
    label: 'Low',
    icon: CheckCircle,
    classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    dot: 'bg-emerald-500',
    glow: '',
  },
};

export default function IncidentPriorityBadge({
  priority,
  size = 'sm',
  showIcon = true,
  pulse = true,
  className = '',
}: IncidentPriorityBadgeProps) {
  const normKey = (priority || 'low').toLowerCase();
  const config = configMap[normKey] || configMap.low;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5 gap-1.5',
    md: 'text-xs px-3 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border tracking-wide uppercase transition-all ${config.classes} ${config.glow} ${sizeClasses} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {normKey === 'critical' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
      </span>
      {showIcon && <Icon className={iconSizes} />}
      <span>{config.label}</span>
    </span>
  );
}
