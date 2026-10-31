'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

export interface CountdownProps {
  closesAt: string | null;
  totalSeconds: number;
  getServerNow: () => number;
  variant?: 'bar' | 'ring';
  className?: string;
  onExpire?: () => void;
}

export function Countdown({
  closesAt,
  totalSeconds,
  getServerNow,
  variant = 'bar',
  className,
  onExpire,
}: CountdownProps) {
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    if (!closesAt) return totalSeconds * 1000;
    return Math.max(0, new Date(closesAt).getTime() - getServerNow());
  });

  useEffect(() => {
    if (!closesAt) return;

    const interval = setInterval(() => {
      const rem = Math.max(0, new Date(closesAt).getTime() - getServerNow());
      setRemainingMs(rem);
      if (rem <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [closesAt, getServerNow, onExpire]);

  const totalMs = totalSeconds * 1000;
  const fraction = Math.min(Math.max(remainingMs / totalMs, 0), 1);
  const remainingSec = Math.ceil(remainingMs / 1000);

  // Color thresholds: gold at 50%, danger at 20%
  const colorClass =
    fraction <= 0.2
      ? 'text-danger bg-danger'
      : fraction <= 0.5
      ? 'text-gold-500 bg-gold-500'
      : 'text-success bg-success';

  if (variant === 'ring') {
    const size = 120;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - fraction);

    const strokeColor =
      fraction <= 0.2 ? '#B3402F' : fraction <= 0.5 ? '#C9A24B' : '#2E7D5B';

    return (
      <div
        className={clsx('relative inline-flex items-center justify-center', className)}
        role="timer"
        aria-live="polite"
      >
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-navy-700/20 fill-none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="fill-none transition-all duration-100 ease-linear"
          />
        </svg>
        <span className="absolute font-mono font-extrabold text-3xl tabular-nums text-current">
          {remainingSec}s
        </span>
      </div>
    );
  }

  // Variant: bar (laptop-first)
  return (
    <div
      className={clsx('w-full flex flex-col gap-1.5', className)}
      role="timer"
      aria-live="polite"
    >
      <div className="flex justify-between items-center text-xs font-bold tracking-wider uppercase">
        <span className="text-ink-500">Time Remaining</span>
        <span className={clsx('font-mono text-base tabular-nums', colorClass.split(' ')[0])}>
          {remainingSec}s
        </span>
      </div>
      <div className="w-full h-3 bg-cream-100 border border-navy-700/15 rounded-chip overflow-hidden">
        <div
          className={clsx('h-full rounded-chip transition-all duration-100 ease-linear', colorClass.split(' ')[1])}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </div>
  );
}

