import React from 'react';
import { motion } from 'framer-motion';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode | { label: string; variant?: string };
  actions?: React.ReactNode;
  className?: string;
}

export default function PageContainer({
  children,
  title,
  subtitle,
  badge,
  actions,
  className = '',
}: PageContainerProps) {
  const renderedBadge = badge && typeof badge === 'object' && 'label' in (badge as any) ? (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
      (badge as any).variant === 'cyan' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
      (badge as any).variant === 'amber' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
      (badge as any).variant === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
      (badge as any).variant === 'purple' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
      (badge as any).variant === 'red' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
      'bg-slate-800 text-slate-300 border-slate-700'
    }`}>
      {(badge as any).label}
    </span>
  ) : (
    badge as React.ReactNode
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={`p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 ${className}`}
    >
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              {title && <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{title}</h1>}
              {renderedBadge}
            </div>
            {subtitle && <p className="text-xs sm:text-sm text-slate-400 font-normal">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
        </div>
      )}
      {children}
    </motion.div>
  );
}
