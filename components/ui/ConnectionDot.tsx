import React from 'react';
import clsx from 'clsx';
import { ConnectionStatus } from '@/lib/realtime/useGameState';

export interface ConnectionDotProps {
  status: ConnectionStatus;
  showLabel?: boolean;
  className?: string;
}

export function ConnectionDot({
  status,
  showLabel = true,
  className,
}: ConnectionDotProps) {
  const configs: Record<
    ConnectionStatus,
    { dotColor: string; label: string; pulse?: boolean }
  > = {
    connected: {
      dotColor: 'bg-success',
      label: 'Connected',
      pulse: false,
    },
    connecting: {
      dotColor: 'bg-gold-500',
      label: 'Connecting…',
      pulse: true,
    },
    reconnecting: {
      dotColor: 'bg-danger',
      label: 'Reconnecting…',
      pulse: true,
    },
    disconnected: {
      dotColor: 'bg-danger',
      label: 'Offline',
      pulse: false,
    },
  };

  const current = configs[status] || configs.disconnected;

  return (
    <div
      className={clsx('inline-flex items-center gap-2 text-xs font-medium', className)}
      role="status"
      aria-label={`Connection: ${current.label}`}
    >
      <span className="relative flex h-2.5 w-2.5">
        {current.pulse && (
          <span
            className={clsx(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              current.dotColor
            )}
          />
        )}
        <span
          className={clsx('relative inline-flex rounded-full h-2.5 w-2.5', current.dotColor)}
        />
      </span>
      {showLabel && <span className="text-ink-500">{current.label}</span>}
    </div>
  );
}

