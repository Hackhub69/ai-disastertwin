import React from 'react';

interface SeverityBarProps {
  severity: number; // 1-5
  showLabel?: boolean;
}

const severityConfig = [
  { label: 'Minimal', color: 'bg-green-500' },
  { label: 'Low', color: 'bg-lime-500' },
  { label: 'Moderate', color: 'bg-yellow-500' },
  { label: 'High', color: 'bg-orange-500' },
  { label: 'Critical', color: 'bg-red-500' },
];

export default function SeverityBar({ severity, showLabel = true }: SeverityBarProps) {
  const idx = Math.max(0, Math.min(4, severity - 1));
  const config = severityConfig[idx];
  const pct = (severity / 5) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${config.color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-slate-400 w-14 text-right">
          {severity}/5 {config.label}
        </span>
      )}
    </div>
  );
}
