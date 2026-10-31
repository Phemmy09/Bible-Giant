'use client';

import React, { useState } from 'react';
import { Contestant } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export interface AudiencePredictionsProps {
  contestants: Contestant[];
  currentContestantId: string | null;
  isLocked: boolean;
  onSavePrediction: (contestantId: string) => Promise<boolean>;
}

export function AudiencePredictions({
  contestants,
  currentContestantId,
  isLocked,
  onSavePrediction,
}: AudiencePredictionsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(currentContestantId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function handleConfirm() {
    if (!selectedId || isLocked) return;
    setIsSubmitting(true);
    const ok = await onSavePrediction(selectedId);
    setIsSubmitting(false);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  }

  const pickedContestant = contestants.find((c) => c.id === currentContestantId);

  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto">
      <div className="text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
          Predict the Champion
        </h2>
        <p className="text-xs sm:text-sm text-ink-500 mt-1">
          {isLocked
            ? 'Predictions are now locked for this competition.'
            : 'Select the contestant you believe will win the Bible Giants trophy. You may change your choice until predictions are locked.'}
        </p>

        {currentContestantId && (
          <div className="mt-3 inline-block bg-gold-500/15 border border-gold-500/40 px-3 py-1.5 rounded-chip text-xs sm:text-sm font-semibold text-navy-900">
            {isLocked ? '🔒 Predictions are closed. You picked:' : '⭐ Your current pick:'}{' '}
            <span className="underline">{pickedContestant?.name || 'Selected'}</span>
          </div>
        )}
      </div>

      {/* Contestant cards list */}
      <div className="flex flex-col gap-3">
        {contestants.map((c) => {
          const isSelected = selectedId === c.id;
          const isCurrentPick = currentContestantId === c.id;

          return (
            <div
              key={c.id}
              onClick={() => {
                if (!isLocked) {
                  setSelectedId(c.id);
                }
              }}
              className={`p-4 rounded-card border transition-all flex items-center justify-between gap-3 ${
                isLocked
                  ? isCurrentPick
                    ? 'bg-gold-500/10 border-gold-500 font-semibold'
                    : 'bg-white border-navy-700/10 opacity-60'
                  : isSelected
                  ? 'bg-cream-100 border-gold-500 shadow-soft ring-2 ring-gold-500/50 cursor-pointer'
                  : 'bg-white border-navy-700/15 hover:border-navy-700/30 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cream-50 border border-navy-700/15 flex items-center justify-center font-bold text-navy-900 overflow-hidden shrink-0">
                  {c.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    c.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-navy-900 bg-cream-100 px-1.5 py-0.5 rounded border border-navy-700/10">
                      #{c.seat_no}
                    </span>
                    <span className="font-semibold text-navy-900 text-base">
                      {c.name}
                    </span>
                  </div>
                  {c.group_label && (
                    <p className="text-xs text-ink-500 mt-0.5">{c.group_label}</p>
                  )}
                </div>
              </div>

              {!isLocked && (
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-gold-500 bg-gold-500 text-navy-950 font-bold text-xs'
                      : 'border-navy-700/30 bg-transparent'
                  }`}
                >
                  {isSelected && '✓'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isLocked && (
        <div className="pt-2">
          <Button
            variant="gold"
            size="lg"
            onClick={handleConfirm}
            isLoading={isSubmitting}
            disabled={!selectedId || selectedId === currentContestantId}
            className="w-full text-base font-bold shadow-soft"
          >
            {saveSuccess
              ? '✓ Prediction Saved'
              : selectedId === currentContestantId
              ? 'Prediction Saved'
              : 'Confirm Prediction'}
          </Button>
        </div>
      )}
    </div>
  );
}

