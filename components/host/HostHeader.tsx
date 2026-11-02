'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { EventStatusBadge } from '@/components/ui/Badge';
import { EventStatus } from '@/lib/types';
import { LaggingDevice } from '@/lib/realtime/usePresenceSync';

export interface HostHeaderProps {
  eventName?: string;
  eventStatus?: EventStatus;
  joinCode?: string;
  connectionStatus?: 'connected' | 'reconnecting' | 'disconnected' | 'connecting';
  inSyncCount?: number;
  totalTrackedCount?: number;
  laggingDevices?: LaggingDevice[];
  eventId?: string;
  screenMode?: string;
  onToggleScreenBlank?: () => void;
}

export function HostHeader({
  eventName,
  eventStatus,
  joinCode,
  connectionStatus = 'connected',
  inSyncCount = 0,
  totalTrackedCount = 0,
  laggingDevices = [],
  eventId,
  screenMode,
  onToggleScreenBlank,
}: HostHeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const [copiedCode, setCopiedCode] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  async function handleSignOut() {
    document.cookie = 'operator_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    try {
      await fetch('/api/auth/operator-logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    router.push('/host/login');
    router.refresh();
  }

  function handleCopyCode() {
    if (!joinCode) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(joinCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }

  return (
    <header className="w-full bg-navy-900 border-b border-navy-700 text-cream-50 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-soft">
      {/* Left: Brand + Event Name + Status */}
      <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
        <Link href="/host" className="flex flex-col shrink-0">
          <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-cream-50">
            Bible Giants
          </span>
          <span className="h-0.5 w-full bg-gold-500 rounded-full" />
        </Link>

        {eventName && (
          <div className="flex items-center gap-2.5 border-l border-navy-700 pl-3 sm:pl-4">
            <span className="text-gold-300 font-semibold text-base sm:text-lg truncate max-w-[200px] sm:max-w-xs">
              {eventName}
            </span>
            {eventStatus && <EventStatusBadge status={eventStatus} />}
          </div>
        )}
      </div>

      {/* Right: Small Copyable Code + In-Sync Indicator + Connection + Sign Out */}
      <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap">
        {/* Small Copyable Join Code (§3.3) */}
        {joinCode && (
          <button
            type="button"
            onClick={handleCopyCode}
            title="Click to copy join code"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-navy-800/90 border border-gold-500/30 hover:border-gold-500/60 transition-colors text-xs font-mono text-cream-50"
          >
            <span className="text-ink-500 uppercase text-[10px] font-sans">Code:</span>
            <span className="font-extrabold text-gold-400">{joinCode}</span>
            <span className="text-[10px] text-ink-500 ml-0.5">{copiedCode ? '✓' : '📋'}</span>
          </button>
        )}

        {/* In-Sync Indicator (§9.4) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSyncModal((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-navy-800/90 border border-navy-700 text-xs font-medium text-cream-50 hover:bg-navy-700 transition-colors"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                totalTrackedCount === 0
                  ? 'bg-ink-500'
                  : inSyncCount === totalTrackedCount
                  ? 'bg-success'
                  : 'bg-warning animate-pulse'
              }`}
            />
            <span>
              In sync {inSyncCount}/{totalTrackedCount}
            </span>
          </button>

          {/* Sync Details Dropdown */}
          {showSyncModal && (
            <div className="absolute right-0 mt-2 w-72 bg-white text-navy-900 rounded-card shadow-soft border border-navy-700/20 p-3 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-navy-700/10 mb-2">
                <span className="font-bold text-navy-900">Device Sync Status (§9.4)</span>
                <button
                  type="button"
                  onClick={() => setShowSyncModal(false)}
                  className="text-ink-500 hover:text-navy-900 font-bold"
                >
                  ✕
                </button>
              </div>

              {totalTrackedCount === 0 ? (
                <p className="text-ink-500 italic py-2">
                  No contestant laptops or projector connected to live presence yet.
                </p>
              ) : laggingDevices.length === 0 ? (
                <div className="py-2 text-success font-medium flex items-center gap-1.5">
                  <span>✓</span>
                  <span>All {totalTrackedCount} connected devices are in sync with current state.</span>
                </div>
              ) : (
                <div className="space-y-1.5 py-1">
                  <p className="text-warning font-semibold text-[11px]">
                    {laggingDevices.length} device(s) behind current version:
                  </p>
                  <ul className="space-y-1 max-h-36 overflow-y-auto">
                    {laggingDevices.map((d) => (
                      <li
                        key={d.id}
                        className="p-1.5 rounded bg-cream-50 border border-navy-700/10 flex items-center justify-between"
                      >
                        <span className="font-medium truncate max-w-[140px]">{d.name}</span>
                        <span className="text-[10px] text-danger font-mono font-bold">
                          {d.secondsBehind}s behind
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[10px] text-ink-500 pt-2 border-t border-navy-700/10 mt-2">
                Audience devices sync via realtime/polling to protect venue network.
              </p>
            </div>
          )}
        </div>

        {/* Screen Output Toggle (§3.1) */}
        {onToggleScreenBlank && (
          <button
            type="button"
            onClick={onToggleScreenBlank}
            className={`px-2.5 py-1 rounded font-bold text-xs transition-colors flex items-center gap-1 ${
              screenMode === 'blank'
                ? 'bg-danger/20 border border-danger text-danger hover:bg-danger/30'
                : 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900'
            }`}
          >
            <span>{screenMode === 'blank' ? '⚫ Screen: Blank' : '🟢 Screen: Live'}</span>
          </button>
        )}

        {/* Projector Screen Button (§3.1) */}
        {eventId && (
          <Link
            href={`/screen/${eventId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded bg-navy-800/90 border border-gold-500/40 text-gold-300 hover:text-cream-50 hover:bg-navy-700 text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <span>Projector Screen</span>
            <span>↗</span>
          </Link>
        )}

        {/* Connection Status Dot */}
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-success animate-pulse'
                : connectionStatus === 'reconnecting'
                ? 'bg-warning animate-ping'
                : 'bg-danger'
            }`}
          />
          <span className="hidden sm:inline capitalize text-ink-500">
            {connectionStatus}
          </span>
        </div>

        {/* Sign Out */}
        <Button
          variant="ghost"
          size="md"
          onClick={handleSignOut}
          className="text-cream-50 hover:bg-navy-700 border-navy-700 text-xs px-2.5 py-1 min-h-[30px] h-auto"
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
