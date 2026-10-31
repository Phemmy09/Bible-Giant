import React from 'react';
import clsx from 'clsx';
import { EventStatus, QuestionStatus } from '@/lib/types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'gold' | 'success' | 'danger' | 'warning' | 'navy';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-navy-700/10 text-ink-900 border border-navy-700/20',
    gold: 'bg-gold-500/15 text-navy-900 border border-gold-500/40 font-semibold',
    success: 'bg-success/15 text-success border border-success/30 font-semibold',
    danger: 'bg-danger/15 text-danger border border-danger/30 font-semibold',
    warning: 'bg-warning/15 text-warning border border-warning/30 font-semibold',
    navy: 'bg-navy-900 text-cream-50',
  };

  const sizes = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-chip font-medium',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const map: Record<EventStatus, { label: string; variant: BadgeProps['variant'] }> = {
    setup: { label: 'Setup', variant: 'default' },
    predictions_open: { label: 'Predictions Open', variant: 'gold' },
    predictions_locked: { label: 'Predictions Locked', variant: 'warning' },
    live: { label: 'Live Contest', variant: 'success' },
    finished: { label: 'Finished', variant: 'navy' },
  };

  const info = map[status] || { label: status, variant: 'default' };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

export function QuestionStatusBadge({ status }: { status: QuestionStatus }) {
  const map: Record<QuestionStatus, { label: string; variant: BadgeProps['variant'] }> = {
    hidden: { label: 'Hidden', variant: 'default' },
    shown: { label: 'Shown', variant: 'gold' },
    open: { label: 'Open', variant: 'success' },
    locked: { label: 'Locked', variant: 'danger' },
    revealed: { label: 'Revealed', variant: 'navy' },
  };

  const info = map[status] || { label: status, variant: 'default' };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

