import React from 'react';

export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="glass-panel p-5 rounded-2xl border border-slate-800/80 animate-pulse space-y-4"
        >
          <div className="flex justify-between items-center">
            <div className="h-4 bg-slate-800 rounded w-28" />
            <div className="h-8 w-8 bg-slate-800 rounded-xl" />
          </div>
          <div className="h-8 bg-slate-800 rounded-lg w-20" />
          <div className="h-3 bg-slate-800 rounded w-36" />
        </div>
      ))}
    </>
  );
}

export function TableRowSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-slate-800/50 animate-pulse">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="py-4 px-4">
              <div className="h-4 bg-slate-800/80 rounded w-full max-w-[140px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function LoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`p-6 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse space-y-4 ${className}`}>
      <div className="h-5 bg-slate-800 rounded w-1/3" />
      <div className="h-4 bg-slate-800/70 rounded w-2/3" />
      <div className="h-32 bg-slate-800/40 rounded-xl" />
    </div>
  );
}
