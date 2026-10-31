'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Contestant, ScoreAdjustment } from '@/lib/types';
import { rpcHostAdjustScore } from '@/lib/rpc';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface ScoreAdjustmentModalProps {
  eventId: string;
  contestants: Contestant[];
  isOpen: boolean;
  onClose: () => void;
  onAdjusted?: () => void;
}

export function ScoreAdjustmentModal({
  eventId,
  contestants,
  isOpen,
  onClose,
  onAdjusted,
}: ScoreAdjustmentModalProps) {
  const supabase = useMemo(() => createClient(), []);

  const [selectedContestantId, setSelectedContestantId] = useState<string>('');
  const [delta, setDelta] = useState<number>(10);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<ScoreAdjustment[]>([]);

  // Set default contestant when opened
  useEffect(() => {
    if (isOpen && contestants.length > 0 && !selectedContestantId) {
      setSelectedContestantId(contestants[0].id);
    }
  }, [isOpen, contestants, selectedContestantId]);

  // Fetch past adjustments for this event
  const fetchAdjustments = useCallback(async () => {
    if (!eventId || !isOpen) return;
    const { data } = await supabase
      .from('score_adjustments')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (data) {
      setAdjustments(data as ScoreAdjustment[]);
    }
  }, [eventId, isOpen, supabase]);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedContestantId) {
      setErrorMsg('Please select a contestant.');
      return;
    }

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      setErrorMsg('Reason must be at least 3 characters.');
      return;
    }

    if (delta === 0) {
      setErrorMsg('Delta points cannot be zero.');
      return;
    }

    setIsSubmitting(true);
    const res = await rpcHostAdjustScore(eventId, selectedContestantId, delta, trimmedReason, supabase);
    setIsSubmitting(false);

    if (res.ok) {
      setSuccessMsg(`Score adjusted successfully (${delta > 0 ? `+${delta}` : delta} pts).`);
      setReason('');
      fetchAdjustments();
      onAdjusted?.();
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(res.message);
    }
  }

  const contestantMap = useMemo(() => {
    const map = new Map<string, Contestant>();
    contestants.forEach((c) => map.set(c.id, c));
    return map;
  }, [contestants]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Contestant Score"
      maxWidth="lg"
    >
      <p className="text-xs text-ink-500 -mt-2">
        Manually add or deduct points for a contestant. A clear reason is required and will be logged permanently.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-danger/10 border border-danger/30 rounded-btn text-danger text-xs font-semibold">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-success/10 border border-success/30 rounded-btn text-success text-xs font-semibold">
            {successMsg}
          </div>
        )}

        {/* Contestant Select */}
        <div>
          <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1.5">
            Contestant
          </label>
          <select
            value={selectedContestantId}
            onChange={(e) => setSelectedContestantId(e.target.value)}
            className="w-full h-11 px-3.5 rounded-btn border border-navy-700/20 bg-white text-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            {contestants.map((c) => (
              <option key={c.id} value={c.id}>
                Seat #{c.seat_no}: {c.name} {c.group_label ? `(${c.group_label})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Delta Points Input + Quick Pills */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider">
              Points Adjustment (+/-)
            </label>
            <span className="text-xs text-ink-500">Positive to add, negative to deduct</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              step="1"
              value={delta}
              onChange={(e) => setDelta(parseInt(e.target.value, 10) || 0)}
              className="w-32 h-11 px-3.5 rounded-btn border border-navy-700/20 bg-white font-mono text-base font-bold text-navy-900 text-center focus:outline-none focus:ring-2 focus:ring-gold-500"
              required
            />

            {/* Quick Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[10, 20, 50, -10, -20].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDelta(val)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors ${
                    delta === val
                      ? 'bg-navy-900 text-cream-50 border-navy-900'
                      : val > 0
                      ? 'bg-cream-100 text-success border-success/30 hover:bg-success/10'
                      : 'bg-cream-100 text-danger border-danger/30 hover:bg-danger/10'
                  }`}
                >
                  {val > 0 ? `+${val}` : val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reason Input */}
        <div>
          <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider mb-1.5">
            Reason (Required, min 3 chars)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Judges bonus for accurate citation, or technical error credit"
            className="w-full h-11 px-3.5 rounded-btn border border-navy-700/20 bg-white text-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            required
            minLength={3}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving Adjustment…' : 'Apply Adjustment'}
          </Button>
        </div>
      </form>

      {/* Adjustments Log */}
      {adjustments.length > 0 && (
        <div className="mt-6 pt-5 border-t border-navy-700/10">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-2">
            Adjustment History ({adjustments.length})
          </h4>
          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
            {adjustments.map((adj) => {
              const contestant = contestantMap.get(adj.contestant_id);
              const isPositive = adj.delta > 0;

              return (
                <div
                  key={adj.id}
                  className="flex items-center justify-between p-2.5 rounded bg-cream-50 border border-navy-700/5 text-xs"
                >
                  <div>
                    <span className="font-bold text-navy-900">
                      {contestant ? `Seat #${contestant.seat_no} ${contestant.name}` : 'Unknown'}
                    </span>
                    <span className="text-ink-500 ml-2 font-medium">&ldquo;{adj.reason}&rdquo;</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono font-bold ${
                        isPositive ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {isPositive ? `+${adj.delta}` : adj.delta} pts
                    </span>
                    <span className="text-ink-500/60 font-mono text-[10px]">
                      {new Date(adj.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
