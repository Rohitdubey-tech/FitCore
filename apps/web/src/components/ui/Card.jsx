import React from 'react';
export const Card = ({ children, className = '' }) => (<div className={`rounded-2xl border border-fitcore-border bg-fitcore-card p-6 ${className}`}>
    {children}
  </div>);
export const Badge = ({ children, variant = 'neutral' }) => {
    const styles = {
        accent: 'bg-fitcore-accent/15 text-fitcore-accent border-fitcore-accent/30',
        neutral: 'bg-white/5 text-fitcore-muted border-fitcore-border',
        success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    };
    return (<span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>);
};
export const Skeleton = ({ className = 'h-4 w-full' }) => (<div className={`animate-pulse rounded-lg bg-white/10 ${className}`}/>);
