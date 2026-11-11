import React from 'react';

interface IncidentBadgeProps {
  priority: 'critical' | 'high' | 'medium' | 'low';
  size?: 'sm' | 'md';
}

const priorityConfig = {
  critical: { label: 'Critical', classes: 'bg-red-500/20 text-red-400 border border-red-500/40' },
  high: { label: 'High', classes: 'bg-orange-500/20 text-orange-400 border border-orange-500/40' },
  medium: { label: 'Medium', classes: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' },
  low: { label: 'Low', classes: 'bg-green-500/20 text-green-400 border border-green-500/40' },
};

export default function IncidentBadge({ priority, size = 'sm' }: IncidentBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.low;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-full ${config.classes} ${sizeClass}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
