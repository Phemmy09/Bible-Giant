'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Event } from '@/lib/types';

export interface JoinPanelProps {
  event: Event;
  contestantsSignedCount: number;
  totalContestantsCount?: number;
  audienceJoinedCount: number;
  maxAudience?: number;
  projectorConnected?: boolean;
  onShowOnProjector?: () => void;
  compact?: boolean;
}

export function JoinPanel({
  event,
  contestantsSignedCount,
  totalContestantsCount = 8,
  audienceJoinedCount,
  maxAudience = 120,
  projectorConnected = false,
  onShowOnProjector,
  compact = false,
}: JoinPanelProps) {
  const [origin, setOrigin] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAudienceLink, setCopiedAudienceLink] = useState(false);
  const [copiedContestantLink, setCopiedContestantLink] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const audienceUrl = origin ? `${origin}/audience?code=${event.join_code}` : `/audience?code=${event.join_code}`;
  const contestantUrl = origin ? `${origin}/contestant?code=${event.join_code}` : `/contestant?code=${event.join_code}`;

  function copyText(text: string, setCopied: (v: boolean) => void) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-card border border-navy-700/15 text-xs shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-cream-100 px-2.5 py-1 rounded-btn border border-navy-700/10">
            <span className="text-ink-500 font-semibold uppercase text-[10px]">Code:</span>
            <span className="font-mono font-extrabold text-navy-900 text-sm">{event.join_code}</span>
            <button
              type="button"
              onClick={() => copyText(event.join_code, setCopiedCode)}
              className="text-[11px] text-navy-900 font-bold hover:underline ml-1"
            >
              {copiedCode ? '✓' : 'Copy'}
            </button>
          </div>

          <div className="flex items-center gap-3 text-ink-500 font-medium">
            <span>Contestants: <strong className="text-navy-900">{contestantsSignedCount}/{totalContestantsCount}</strong></span>
            <span>•</span>
            <span>Audience: <strong className="text-navy-900">{audienceJoinedCount}/{maxAudience}</strong></span>
            <span>•</span>
            <span>Projector: <strong className={projectorConnected ? 'text-success' : 'text-ink-500'}>{projectorConnected ? 'Connected' : 'Offline'}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="md"
            onClick={() => copyText(audienceUrl, setCopiedAudienceLink)}
            className="text-[11px] px-2.5 py-1 min-h-[30px] h-auto border-navy-700/20 hover:bg-cream-100 text-navy-900"
          >
            {copiedAudienceLink ? '✓ Audience Link Copied' : 'Copy Audience Link'}
          </Button>

          {onShowOnProjector && (
            <Button
              variant="primary"
              size="md"
              onClick={onShowOnProjector}
              className="text-[11px] px-2.5 py-1 min-h-[30px] h-auto"
            >
              Show Code on Projector
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full bg-white p-6 sm:p-7 border-navy-700/15 shadow-soft flex flex-col gap-5">
      {/* Top row: Big Code & Links */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-5 border-b border-navy-700/10">
        {/* Left: Huge Event Code */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs uppercase font-bold tracking-widest text-ink-500">
              Event Join Code
            </span>
            <span className="font-mono text-4xl sm:text-5xl font-extrabold tracking-wider text-navy-900 mt-0.5">
              {event.join_code}
            </span>
          </div>

          <Button
            variant="ghost"
            size="md"
            onClick={() => copyText(event.join_code, setCopiedCode)}
            className="font-bold border border-navy-700/20 text-navy-900 hover:bg-cream-100 sm:self-end mb-1"
          >
            {copiedCode ? '✓ Copied Code!' : '📋 Copy Code'}
          </Button>
        </div>

        {/* Right: Join Links with Pre-filled Code */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="ghost"
            size="md"
            onClick={() => copyText(audienceUrl, setCopiedAudienceLink)}
            className="text-xs font-semibold border-navy-700/20 hover:bg-cream-100 text-navy-900 justify-between"
          >
            <span>📱 {copiedAudienceLink ? '✓ Copied Audience Link!' : 'Copy Audience Link'}</span>
          </Button>

          <Button
            variant="ghost"
            size="md"
            onClick={() => copyText(contestantUrl, setCopiedContestantLink)}
            className="text-xs font-semibold border-navy-700/20 hover:bg-cream-100 text-navy-900 justify-between"
          >
            <span>💻 {copiedContestantLink ? '✓ Copied Contestant Link!' : 'Copy Contestant Link'}</span>
          </Button>

          {onShowOnProjector && (
            <Button
              variant="primary"
              size="md"
              onClick={onShowOnProjector}
              className="text-xs font-bold"
            >
              🖥️ Show Code on Projector
            </Button>
          )}
        </div>
      </div>

      {/* Middle row: Plain instructions per §3.1 */}
      <p className="text-xs sm:text-sm text-ink-700 bg-cream-50 p-3 rounded-btn border border-navy-700/10 font-medium leading-relaxed">
        <strong>Instructions for attendees:</strong> Contestants: enter this code, your seat number and your PIN. Audience: enter this code and your name.
      </p>

      {/* Bottom row: Live Counters per §3.1 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        <div className="flex items-center justify-between p-3 rounded-btn bg-cream-50/70 border border-navy-700/10">
          <span className="text-xs text-ink-500 font-medium">Contestants Signed In:</span>
          <span className="font-mono text-sm font-bold text-navy-900">
            {contestantsSignedCount} / {totalContestantsCount}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-btn bg-cream-50/70 border border-navy-700/10">
          <span className="text-xs text-ink-500 font-medium">Audience Joined:</span>
          <span className="font-mono text-sm font-bold text-navy-900">
            {audienceJoinedCount} / {maxAudience}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-btn bg-cream-50/70 border border-navy-700/10">
          <span className="text-xs text-ink-500 font-medium">Projector Connected:</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${projectorConnected ? 'bg-success animate-pulse' : 'bg-ink-500'}`} />
            <span className={`text-xs font-bold ${projectorConnected ? 'text-success' : 'text-ink-500'}`}>
              {projectorConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

