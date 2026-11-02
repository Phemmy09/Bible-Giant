'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Round, OptionKey } from '@/lib/types';
import { Button } from '@/components/ui/Button';

export interface QuickAddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  rounds: Round[];
  initialRoundId: string;
  onQuestionAdded: () => void;
  onCreateRoundInline: (title: string) => Promise<string | null>;
}

export function QuickAddQuestionModal({
  isOpen,
  onClose,
  eventId,
  rounds,
  initialRoundId,
  onQuestionAdded,
  onCreateRoundInline,
}: QuickAddQuestionModalProps) {
  const supabase = createClient();
  const bodyInputRef = useRef<HTMLTextAreaElement>(null);

  const [selectedRoundId, setSelectedRoundId] = useState(initialRoundId);
  const [body, setBody] = useState('');
  const [options, setOptions] = useState<{ key: OptionKey; text: string }[]>([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
  ]);
  const [correctKey, setCorrectKey] = useState<OptionKey>('A');
  const [scriptureRef, setScriptureRef] = useState('');
  const [explanation, setExplanation] = useState('');

  const [sessionCount, setSessionCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline new round creation state
  const [isCreatingRound, setIsCreatingRound] = useState(false);
  const [newRoundTitle, setNewRoundTitle] = useState('');

  // Keep target round synced with initialRoundId on open
  useEffect(() => {
    if (isOpen) {
      if (initialRoundId) setSelectedRoundId(initialRoundId);
      setTimeout(() => bodyInputRef.current?.focus(), 100);
    }
  }, [isOpen, initialRoundId]);

  if (!isOpen) return null;

  const currentRound = rounds.find((r) => r.id === selectedRoundId);

  async function handleCreateRoundSubmit() {
    if (!newRoundTitle.trim()) return;
    const newId = await onCreateRoundInline(newRoundTitle.trim());
    if (newId) {
      setSelectedRoundId(newId);
      setIsCreatingRound(false);
      setNewRoundTitle('');
    }
  }

  async function handleSave(keepOpen: boolean) {
    if (!selectedRoundId) {
      setError('Please select a round first');
      return;
    }
    if (body.trim().length < 3) {
      setError('Question text must be at least 3 characters');
      bodyInputRef.current?.focus();
      return;
    }

    const emptyOpt = options.find((o) => !o.text.trim());
    if (emptyOpt) {
      setError(`Option ${emptyOpt.key} cannot be empty`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // 1. Get next position in target round
      const { data: existingQ } = await supabase
        .from('questions')
        .select('position')
        .eq('round_id', selectedRoundId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPos = (existingQ?.[0]?.position || 0) + 1;

      // 2. Insert question
      const { data: newQ, error: qErr } = await supabase
        .from('questions')
        .insert({
          event_id: eventId,
          round_id: selectedRoundId,
          position: nextPos,
          body: body.trim(),
          options,
          scripture_ref: scriptureRef.trim() || null,
          answer_mode: 'choice',
        })
        .select('id')
        .single();

      if (qErr || !newQ) throw new Error(qErr?.message || 'Failed to insert question');

      // 3. Insert question key
      const { error: kErr } = await supabase.from('question_keys').insert({
        question_id: newQ.id,
        event_id: eventId,
        correct_key: correctKey,
        explanation: explanation.trim() || null,
      });

      if (kErr) throw new Error(kErr.message);

      setSessionCount((prev) => prev + 1);
      onQuestionAdded();

      if (keepOpen) {
        // Reset inputs, preserve round, and focus question body (§4.3)
        setBody('');
        setOptions([
          { key: 'A', text: '' },
          { key: 'B', text: '' },
          { key: 'C', text: '' },
          { key: 'D', text: '' },
        ]);
        setCorrectKey('A');
        setScriptureRef('');
        setExplanation('');
        setIsSaving(false);
        setTimeout(() => bodyInputRef.current?.focus(), 50);
      } else {
        setIsSaving(false);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save question';
      setError(msg);
      setIsSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave(true);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white w-full max-w-2xl rounded-card border border-navy-700/20 shadow-soft overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-navy-900 text-cream-50 flex items-center justify-between border-b border-navy-700">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-bold">⚡ Quick Add Questions</span>
            {sessionCount > 0 && (
              <span className="text-xs bg-gold-500 text-navy-950 px-2 py-0.5 rounded-full font-bold">
                {sessionCount} added to {currentRound?.title || 'round'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-cream-50/70 hover:text-cream-50 text-xl font-bold leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="p-3 rounded-btn bg-danger/10 border border-danger/30 text-danger text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Round Selector */}
          <div>
            <label className="block font-bold text-navy-900 mb-1">
              Add to Round <span className="text-danger">*</span>
            </label>
            {!isCreatingRound ? (
              <div className="flex items-center gap-2">
                <select
                  value={selectedRoundId}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsCreatingRound(true);
                    } else {
                      setSelectedRoundId(e.target.value);
                    }
                  }}
                  className="w-full h-10 px-3 rounded-btn border border-navy-700/20 bg-cream-50 text-navy-900 font-medium focus:outline-none focus:ring-2 focus:ring-gold-500 text-xs sm:text-sm"
                >
                  {rounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      Round {r.position}: {r.title} ({r.type})
                    </option>
                  ))}
                  <option value="__NEW__">+ Create New Round…</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New round title (e.g. Round 3: Advanced)"
                  value={newRoundTitle}
                  onChange={(e) => setNewRoundTitle(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-btn border border-gold-500 bg-cream-50 text-navy-900 font-medium text-xs sm:text-sm"
                />
                <Button
                  variant="gold"
                  size="md"
                  type="button"
                  onClick={handleCreateRoundSubmit}
                  className="text-xs h-10 px-3 min-h-0"
                >
                  Create
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  type="button"
                  onClick={() => setIsCreatingRound(false)}
                  className="text-xs h-10 px-2 min-h-0"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Question Text */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-navy-900">
                Question Text <span className="text-danger">*</span>
              </label>
              <span className="text-[11px] text-ink-500">Shortcuts: Ctrl+Enter to save & next</span>
            </div>
            <textarea
              ref={bodyInputRef}
              rows={3}
              placeholder="e.g. In the beginning was the Word, and the Word was with God... Who does the Word refer to?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3 rounded-btn border border-navy-700/20 bg-cream-50 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          {/* Options A-D with Correct Option Selector */}
          <div>
            <label className="block font-bold text-navy-900 mb-1.5">
              Options (Click letter to set as Correct Answer) <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {options.map((opt, idx) => {
                const isCorrect = correctKey === opt.key;
                return (
                  <div
                    key={opt.key}
                    className={`flex items-center rounded-btn border transition-colors overflow-hidden ${
                      isCorrect ? 'border-success bg-emerald-50/60 ring-1 ring-success' : 'border-navy-700/20 bg-cream-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setCorrectKey(opt.key)}
                      title={`Click to mark Option ${opt.key} as correct`}
                      className={`w-10 h-10 shrink-0 font-mono font-extrabold flex items-center justify-center transition-colors ${
                        isCorrect
                          ? 'bg-success text-white'
                          : 'bg-navy-900 text-cream-50 hover:bg-gold-500 hover:text-navy-950'
                      }`}
                    >
                      {opt.key}
                    </button>
                    <input
                      type="text"
                      placeholder={`Option ${opt.key}`}
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx].text = e.target.value;
                        setOptions(newOpts);
                      }}
                      className="flex-1 px-3 py-2 bg-transparent text-navy-900 focus:outline-none text-xs sm:text-sm"
                    />
                    {isCorrect && (
                      <span className="text-success font-bold text-xs pr-2.5">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scripture & Explanation (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-bold text-navy-900 mb-1">
                Scripture Reference <span className="text-ink-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. John 1:1, 14"
                value={scriptureRef}
                onChange={(e) => setScriptureRef(e.target.value)}
                className="w-full h-9 px-3 rounded-btn border border-navy-700/20 bg-cream-50 text-navy-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <div>
              <label className="block font-bold text-navy-900 mb-1">
                Explanation <span className="text-ink-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Revealed after question lock"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="w-full h-9 px-3 rounded-btn border border-navy-700/20 bg-cream-50 text-navy-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-cream-100 border-t border-navy-700/10 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-ink-500 flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-navy-700/20 font-mono font-bold text-[10px]">
              Ctrl
            </kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-navy-700/20 font-mono font-bold text-[10px]">
              Enter
            </kbd>
            <span>saves and readies next question</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs h-9 min-h-0"
            >
              Close
            </Button>
            <Button
              type="button"
              variant="gold"
              size="md"
              onClick={() => handleSave(false)}
              isLoading={isSaving}
              className="text-xs h-9 min-h-0"
            >
              Save & Close
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => handleSave(true)}
              isLoading={isSaving}
              className="text-xs h-9 min-h-0 font-bold"
            >
              Save & Add Next ➔
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

