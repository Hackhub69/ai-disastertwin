import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  const effectiveAction = action || (actionLabel && onAction ? { label: actionLabel, onClick: onAction } : undefined);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-panel border border-slate-800/80 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-cyan-400 mb-4 shadow-[0_0_20px_-5px_rgba(6,182,212,0.15)]">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">{title}</h3>
      {description && <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">{description}</p>}
      {effectiveAction && (
        <div className="mt-5">
          <button
            onClick={effectiveAction.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-cyan-600/20 transition-all duration-150 active:scale-95"
          >
            {effectiveAction.icon && <effectiveAction.icon className="w-4 h-4" />}
            {effectiveAction.label}
          </button>
        </div>
      )}
    </motion.div>
  );
}
