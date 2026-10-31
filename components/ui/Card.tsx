import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'cream' | 'white' | 'navy';
}

export function Card({
  className,
  variant = 'cream',
  children,
  ...props
}: CardProps) {
  const variants = {
    cream: 'bg-cream-100 border border-navy-700/15 text-ink-900',
    white: 'bg-white border border-navy-700/10 text-ink-900',
    navy: 'bg-navy-900 border border-navy-700 text-cream-50',
  };

  return (
    <div
      className={clsx('rounded-card p-6 shadow-soft', variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}

