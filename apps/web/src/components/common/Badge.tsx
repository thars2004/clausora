import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'ai' | 'success' | 'warning' | 'danger' | 'neutral' | 'paypal';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    primary: 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/50',
    ai: 'bg-purple-950/80 text-purple-300 border border-purple-600/50 ai-glow',
    success: 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 verified-glow',
    warning: 'bg-amber-950/80 text-amber-300 border border-amber-600/50',
    danger: 'bg-rose-950/80 text-rose-300 border border-rose-600/50',
    neutral: 'bg-slate-800 text-slate-300 border border-slate-700',
    paypal: 'bg-[#002D62] text-[#00A6E8] border border-[#0070BA]/50 paypal-glow font-medium',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 rounded-full',
    md: 'text-xs px-2.5 py-1 rounded-md font-medium',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 transition-all',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};
