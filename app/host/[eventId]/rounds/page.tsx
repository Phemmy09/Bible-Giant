'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Round, Question, QuestionKey, Contestant, Event, OptionKey, QuestionOption } from '@/lib/types';
import { HostHeader } from '@/components/host/HostHeader';
import { HostNavTabs } from '@/components/host/HostNavTabs';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { QuestionDocumentUploadModal } from '@/components/host/QuestionDocumentUploadModal';
import { QuestionCsvImportModal } from '@/components/host/QuestionCsvImportModal';

export default function RoundsAndQuestionsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const supabase = useMemo(() => createClient(), []);

  const [event, setEvent] = useState<Event | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionKeys, setQuestionKeys] = useState<Map<string, QuestionKey>>(new Map());
  const [contestants, setContestants] = useState<Contestant[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [roundModalOpen, setRoundModalOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [roundForm, setRoundForm] = useState<{
    title: string;
    type: 'speed' | 'individual';
    max_points: number;
    min_points: number;
    time_limit_sec: number;
    wrong_penalty: number;
    first_correct_bonus: number;
    audience_can_answer: boolean;
  }>({
    title: '',
    type: 'speed',
    max_points: 100,
    min_points: 40,
    time_limit_sec: 20,
    wrong_penalty: 0,
    first_correct_bonus: 0,
    audience_can_answer: true,
  });

  // Question Modal
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [qBody, setQBody] = useState('');
  const [qOptions, setQOptions] = useState<QuestionOption[]>([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
  ]);
  const [qCorrect, setQCorrect] = useState<OptionKey>('A');
  const [qScripture, setQScripture] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [qAnswerMode, setQAnswerMode] = useState<'choice' | 'spoken'>('choice');
  const [qAssignedContestant, setQAssignedContestant] = useState<string>('');
  const [qPointsOverride, setQPointsOverride] = useState<string>('');
  const [qImageFile, setQImageFile] = useState<File | null>(null);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // Delete Modals
  const [deleteRoundTarget, setDeleteRoundTarget] = useState<Round | null>(null);
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<Question | null>(null);

  const fetchEventData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Event
      const { data: evData, error: evErr } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (evErr) throw evErr;
      setEvent(evData as Event);

      // 2. Contestants
      const { data: cData } = await supabase
        .from('contestants')
        .select('*')
        .eq('event_id', eventId)
        .order('seat_no', { ascending: true });
      setContestants((cData as Contestant[]) || []);

      // 3. Rounds
      const { data: rData, error: rErr } = await supabase
        .from('rounds')
        .select('*')
        .eq('event_id', eventId)
        .order('position', { ascending: true });
      if (rErr) throw rErr;
      const loadedRounds = (rData as Round[]) || [];
      setRounds(loadedRounds);

      if (loadedRounds.length > 0 && (!selectedRoundId || !loadedRounds.some((r) => r.id === selectedRoundId))) {
        setSelectedRoundId(loadedRounds[0].id);
      }

      // 4. Questions
      const { data: qData, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('event_id', eventId)
        .order('position', { ascending: true });
      if (qErr) throw qErr;
      const loadedQuestions = (qData as Question[]) || [];
      setQuestions(loadedQuestions);

      // 5. Question Keys
      const { data: kData, error: kErr } = await supabase
        .from('question_keys')
        .select('*')
        .eq('event_id', eventId);
      if (kErr) throw kErr;
      const kMap = new Map<string, QuestionKey>();
      (kData || []).forEach((k) => kMap.set(k.question_id, k as QuestionKey));
      setQuestionKeys(kMap);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading rounds';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, selectedRoundId, supabase]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const selectedRound = useMemo(
    () => rounds.find((r) => r.id === selectedRoundId) || null,
    [rounds, selectedRoundId]
  );

  const selectedRoundQuestions = useMemo(
    () => questions.filter((q) => q.round_id === selectedRoundId),
    [questions, selectedRoundId]
  );

  // Round Management
  function openAddRoundModal() {
    setEditingRound(null);
    setRoundForm({
      title: `Round ${rounds.length + 1}`,
      type: 'speed',
      max_points: 100,
      min_points: 40,
      time_limit_sec: 20,
      wrong_penalty: 0,
      first_correct_bonus: 0,
      audience_can_answer: true,
    });
    setRoundModalOpen(true);
  }

  function openEditRoundModal(round: Round) {
    setEditingRound(round);
    setRoundForm({
      title: round.title,
      type: round.type,
      max_points: round.max_points,
      min_points: round.min_points,
      time_limit_sec: round.time_limit_sec,
      wrong_penalty: round.wrong_penalty,
      first_correct_bonus: round.first_correct_bonus,
      audience_can_answer: round.audience_can_answer,
    });
    setRoundModalOpen(true);
  }

  async function handleSaveRound(e: React.FormEvent) {
    e.preventDefault();
    if (!roundForm.title.trim()) return;

    if (editingRound) {
      const { error: rErr } = await supabase
        .from('rounds')
        .update({
          title: roundForm.title.trim(),
          type: roundForm.type,
          max_points: roundForm.max_points,
          min_points: roundForm.min_points,
          time_limit_sec: roundForm.time_limit_sec,
          wrong_penalty: roundForm.wrong_penalty,
          first_correct_bonus: roundForm.first_correct_bonus,
          audience_can_answer: roundForm.audience_can_answer,
        })
        .eq('id', editingRound.id);

      if (rErr) setError(rErr.message);
      else {
        setRoundModalOpen(false);
        fetchEventData();
      }
    } else {
      const newPos = rounds.length + 1;
      const { data: newRound, error: rErr } = await supabase
        .from('rounds')
        .insert({
          event_id: eventId,
          position: newPos,
          title: roundForm.title.trim(),
          type: roundForm.type,
          max_points: roundForm.max_points,
          min_points: roundForm.min_points,
          time_limit_sec: roundForm.time_limit_sec,
          wrong_penalty: roundForm.wrong_penalty,
          first_correct_bonus: roundForm.first_correct_bonus,
          audience_can_answer: roundForm.audience_can_answer,
        })
        .select('*')
        .single();

      if (rErr) setError(rErr.message);
      else {
        setRoundModalOpen(false);
        if (newRound) setSelectedRoundId(newRound.id);
        fetchEventData();
      }
    }
  }

  async function handleDeleteRound() {
    if (!deleteRoundTarget) return;
    const { error: delErr } = await supabase
      .from('rounds')
      .delete()
      .eq('id', deleteRoundTarget.id);

    if (delErr) setError(delErr.message);
    else {
      setDeleteRoundTarget(null);
      fetchEventData();
    }
  }

  async function handleMoveRound(roundId: string, direction: 'up' | 'down') {
    const idx = rounds.findIndex((r) => r.id === roundId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= rounds.length) return;

    const currentRound = rounds[idx];
    const targetRound = rounds[targetIdx];

    // Swap positions
    await supabase.from('rounds').update({ position: targetRound.position }).eq('id', currentRound.id);
    await supabase.from('rounds').update({ position: currentRound.position }).eq('id', targetRound.id);
    fetchEventData();
  }

  // Question Management
  function openAddQuestionModal() {
    setEditingQuestion(null);
    setQBody('');
    setQOptions([
      { key: 'A', text: '' },
      { key: 'B', text: '' },
      { key: 'C', text: '' },
      { key: 'D', text: '' },
    ]);
    setQCorrect('A');
    setQScripture('');
    setQExplanation('');
    setQAnswerMode('choice');
    setQAssignedContestant(contestants[0]?.id || '');
    setQPointsOverride('');
    setQImageFile(null);
    setQuestionModalOpen(true);
  }

  function openEditQuestionModal(q: Question) {
    setEditingQuestion(q);
    setQBody(q.body);
    setQOptions(q.options.length >= 2 ? q.options : [
      { key: 'A', text: '' },
      { key: 'B', text: '' },
    ]);
    const existingKey = questionKeys.get(q.id);
    setQCorrect(existingKey?.correct_key || 'A');
    setQScripture(q.scripture_ref || '');
    setQExplanation(existingKey?.explanation || '');
    setQAnswerMode(q.answer_mode);
    setQAssignedContestant(q.assigned_contestant_id || contestants[0]?.id || '');
    setQPointsOverride(q.points_override ? q.points_override.toString() : '');
    setQImageFile(null);
    setQuestionModalOpen(true);
  }

  function handleOptionTextChange(index: number, text: string) {
    setQOptions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], text };
      return next;
    });
  }

  function handleAddOption() {
    if (qOptions.length >= 5) return;
    const nextKey = ['A', 'B', 'C', 'D', 'E'][qOptions.length] as OptionKey;
    setQOptions((prev) => [...prev, { key: nextKey, text: '' }]);
  }

  function handleRemoveOption(index: number) {
    if (qOptions.length <= 2) return;
    const newOptions = qOptions
      .filter((_, i) => i !== index)
      .map((opt, i) => ({
        key: ['A', 'B', 'C', 'D', 'E'][i] as OptionKey,
        text: opt.text,
      }));
    setQOptions(newOptions);
    if (!newOptions.some((o) => o.key === qCorrect)) {
      setQCorrect(newOptions[0].key);
    }
  }

  async function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRoundId) return;
    if (qBody.trim().length < 3) {
      setError('Question text must be at least 3 characters');
      return;
    }

    if (qAnswerMode === 'choice') {
      const emptyOpts = qOptions.filter((o) => !o.text.trim());
      if (emptyOpts.length > 0) {
        setError('All multiple-choice options must have text');
        return;
      }
    }

    if (selectedRound?.type === 'individual' && !qAssignedContestant) {
      setError('Assigned contestant is required for questions in individual rounds');
      return;
    }

    setIsSavingQuestion(true);
    setError(null);

    try {
      let imageUrl = editingQuestion?.image_url || null;
      if (qImageFile) {
        if (qImageFile.size > 1024 * 1024) throw new Error('Question image must be under 1 MB');
        const ext = qImageFile.name.split('.').pop()?.toLowerCase();
        const path = `questions/${eventId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('media').upload(path, qImageFile);
        if (!upErr) {
          const { data: pubData } = supabase.storage.from('media').getPublicUrl(path);
          imageUrl = pubData.publicUrl;
        }
      }

      const pointsOverrideVal = qPointsOverride ? parseInt(qPointsOverride, 10) : null;
      const assignedIdVal = selectedRound?.type === 'individual' ? qAssignedContestant || null : null;

      if (editingQuestion) {
        // Update question
        const { error: qUpErr } = await supabase
          .from('questions')
          .update({
            body: qBody.trim(),
            options: qOptions,
            scripture_ref: qScripture.trim() || null,
            image_url: imageUrl,
            answer_mode: qAnswerMode,
            assigned_contestant_id: assignedIdVal,
            points_override: pointsOverrideVal,
          })
          .eq('id', editingQuestion.id);

        if (qUpErr) throw qUpErr;

        // Upsert question key
        if (qAnswerMode === 'choice') {
          const { error: kUpErr } = await supabase
            .from('question_keys')
            .upsert({
              question_id: editingQuestion.id,
              event_id: eventId,
              correct_key: qCorrect,
              explanation: qExplanation.trim() || null,
            });
          if (kUpErr) throw kUpErr;
        }
      } else {
        // Insert question
        const nextPos = selectedRoundQuestions.length + 1;
        const { data: newQ, error: qInErr } = await supabase
          .from('questions')
          .insert({
            event_id: eventId,
            round_id: selectedRoundId,
            position: nextPos,
            body: qBody.trim(),
            options: qOptions,
            scripture_ref: qScripture.trim() || null,
            image_url: imageUrl,
            answer_mode: qAnswerMode,
            assigned_contestant_id: assignedIdVal,
            points_override: pointsOverrideVal,
          })
          .select('id')
          .single();

        if (qInErr) throw qInErr;

        // Insert question key
        if (qAnswerMode === 'choice' && newQ) {
          const { error: kInErr } = await supabase.from('question_keys').insert({
            question_id: newQ.id,
            event_id: eventId,
            correct_key: qCorrect,
            explanation: qExplanation.trim() || null,
          });
          if (kInErr) throw kInErr;
        }
      }

      setQuestionModalOpen(false);
      setIsSavingQuestion(false);
      fetchEventData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving question';
      setError(msg);
      setIsSavingQuestion(false);
    }
  }

  async function handleDeleteQuestion() {
    if (!deleteQuestionTarget) return;
    const { error: delErr } = await supabase
      .from('questions')
      .delete()
      .eq('id', deleteQuestionTarget.id);

    if (delErr) setError(delErr.message);
    else {
      setDeleteQuestionTarget(null);
      fetchEventData();
    }
  }

  async function handleMoveQuestion(questionId: string, direction: 'up' | 'down') {
    const list = selectedRoundQuestions;
    const idx = list.findIndex((q) => q.id === questionId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const currentQ = list[idx];
    const targetQ = list[targetIdx];

    await supabase.from('questions').update({ position: targetQ.position }).eq('id', currentQ.id);
    await supabase.from('questions').update({ position: currentQ.position }).eq('id', targetQ.id);
    fetchEventData();
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <HostHeader eventName={event?.name} />
      <HostNavTabs eventId={eventId} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-700/15 pb-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy-900">
              Rounds & Questions
            </h1>
            <p className="text-ink-500 text-sm mt-1">
              Configure speed and individual rounds, manage question banks, or import from CSV.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => setCsvModalOpen(true)}
              className="font-bold flex items-center gap-1.5"
            >
              <span>📄 Upload Questions (PDF, DOCX, Sheets, CSV)</span>
            </Button>
            <Button variant="gold" size="md" onClick={openAddRoundModal}>
              + Add Round
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="p-4 rounded-btn bg-danger/10 border border-danger/30 text-danger text-sm font-medium"
          >
            {error}
          </div>
        )}

        {/* Two-Column Layout: Left = Rounds List, Right = Questions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Rounds List (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <h2 className="font-display text-xl font-bold text-navy-900 px-1">
              Rounds ({rounds.length})
            </h2>

            {rounds.length === 0 ? (
              <Card className="text-center py-12 bg-white border border-dashed border-navy-700/20">
                <p className="text-sm text-ink-500 mb-4">No rounds configured yet.</p>
                <Button variant="gold" size="md" onClick={openAddRoundModal}>
                  Create Round 1
                </Button>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {rounds.map((r, idx) => {
                  const isSelected = r.id === selectedRoundId;
                  const qCount = questions.filter((q) => q.round_id === r.id).length;

                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRoundId(r.id)}
                      className={`p-4 rounded-card border transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-white border-gold-500 shadow-soft ring-1 ring-gold-500/30'
                          : 'bg-cream-100 hover:bg-white border-navy-700/15'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-navy-900 bg-cream-50 px-2 py-0.5 rounded border border-navy-700/10">
                            #{r.position}
                          </span>
                          <span className="font-semibold text-navy-900 text-base">
                            {r.title}
                          </span>
                        </div>
                        <span className="text-xs uppercase font-semibold text-ink-500 tracking-wider">
                          {r.type}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-ink-500 pt-1">
                        <span>{qCount} question(s)</span>
                        <span>
                          {r.type === 'speed' ? `${r.max_points}–${r.min_points} pts (${r.time_limit_sec}s)` : `${r.max_points} pts`}
                        </span>
                      </div>

                      {/* Reorder and Edit Actions */}
                      <div
                        className="flex items-center justify-between pt-2 border-t border-navy-700/10 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveRound(r.id, 'up')}
                            disabled={idx === 0}
                            title="Move round up"
                            className="p-1 text-ink-500 hover:text-navy-900 disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => handleMoveRound(r.id, 'down')}
                            disabled={idx === rounds.length - 1}
                            title="Move round down"
                            className="p-1 text-ink-500 hover:text-navy-900 disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditRoundModal(r)}
                            className="text-xs font-medium text-navy-900 hover:underline"
                          >
                            Settings
                          </button>
                          <button
                            onClick={() => setDeleteRoundTarget(r)}
                            className="text-xs font-medium text-danger hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Questions in Selected Round (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {selectedRound ? (
              <Card className="bg-white p-6 shadow-soft flex flex-col gap-6">
                {/* Round Header & Add Question Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-700/15 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-navy-900 bg-cream-100 px-2.5 py-0.5 rounded border border-navy-700/10">
                        Round {selectedRound.position}
                      </span>
                      <h2 className="font-display text-2xl font-bold text-navy-900">
                        {selectedRound.title}
                      </h2>
                    </div>
                    <p className="text-xs text-ink-500 mt-1">
                      Type: <strong className="uppercase">{selectedRound.type}</strong> • Max points: {selectedRound.max_points} • Limit: {selectedRound.time_limit_sec}s
                    </p>
                  </div>

                  <Button variant="gold" size="md" onClick={openAddQuestionModal}>
                    + Add Question
                  </Button>
                </div>

                {/* Questions List */}
                {selectedRoundQuestions.length === 0 ? (
                  <div className="py-16 text-center text-ink-500 border border-dashed border-navy-700/15 rounded-card bg-cream-50">
                    <p className="font-medium mb-3">No questions in this round yet.</p>
                    <Button variant="primary" size="md" onClick={openAddQuestionModal}>
                      Add Question #1
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {selectedRoundQuestions.map((q, qIdx) => {
                      const key = questionKeys.get(q.id);
                      const assignedContestant = contestants.find((c) => c.id === q.assigned_contestant_id);
                      const hasProblem = q.answer_mode === 'choice' && !key?.correct_key;

                      return (
                        <div
                          key={q.id}
                          className={`p-4 rounded-btn border transition-colors flex flex-col gap-2 ${
                            hasProblem ? 'bg-danger/5 border-danger/30' : 'bg-cream-50/50 border-navy-700/15 hover:bg-cream-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span className="font-mono text-sm font-bold text-navy-900 bg-white px-2 py-0.5 rounded border border-navy-700/10 shrink-0">
                                Q{qIdx + 1}
                              </span>
                              <div>
                                <p className="font-medium text-navy-900 text-sm leading-snug">
                                  {q.body}
                                </p>
                                {q.scripture_ref && (
                                  <p className="text-xs text-gold-500 font-semibold mt-0.5">
                                    📖 {q.scripture_ref}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleMoveQuestion(q.id, 'up')}
                                disabled={qIdx === 0}
                                title="Move up"
                                className="p-1 text-ink-500 hover:text-navy-900 disabled:opacity-30"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => handleMoveQuestion(q.id, 'down')}
                                disabled={qIdx === selectedRoundQuestions.length - 1}
                                title="Move down"
                                className="p-1 text-ink-500 hover:text-navy-900 disabled:opacity-30"
                              >
                                ▼
                              </button>
                            </div>
                          </div>

                          {/* Options and Meta */}
                          <div className="flex flex-wrap items-center justify-between text-xs text-ink-500 pt-2 border-t border-navy-700/10">
                            <div className="flex items-center gap-3 flex-wrap">
                              {q.answer_mode === 'choice' ? (
                                <span className="flex items-center gap-1">
                                  <span>Correct:</span>
                                  <strong className="text-navy-900 bg-cream-100 px-1.5 py-0.5 rounded font-mono">
                                    {key?.correct_key || 'MISSING KEY'}
                                  </strong>
                                </span>
                              ) : (
                                <span className="font-semibold text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded">
                                  Spoken Marking
                                </span>
                              )}

                              {selectedRound.type === 'individual' && (
                                <span className="text-navy-900">
                                  For:{' '}
                                  <strong>
                                    {assignedContestant ? `Seat #${assignedContestant.seat_no} (${assignedContestant.name})` : 'Unassigned'}
                                  </strong>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => openEditQuestionModal(q)}
                                className="font-semibold text-navy-900 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeleteQuestionTarget(q)}
                                className="font-semibold text-danger hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            ) : (
              <Card className="bg-white p-12 text-center text-ink-500">
                Select or add a round on the left to configure its questions.
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Document / Question Import Modal (PDF, DOCX, Sheets, CSV) */}
      <QuestionDocumentUploadModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        eventId={eventId}
        rounds={rounds}
        onSuccess={() => {
          fetchEventData();
        }}
      />

      {/* Add / Edit Round Modal */}
      <Modal
        isOpen={roundModalOpen}
        onClose={() => setRoundModalOpen(false)}
        title={editingRound ? 'Edit Round Settings' : 'Add New Round'}
      >
        <form onSubmit={handleSaveRound} className="flex flex-col gap-4">
          <Input
            label="Round Title"
            value={roundForm.title}
            onChange={(e) => setRoundForm({ ...roundForm, title: e.target.value })}
            placeholder="e.g. Speed Round 1"
            required
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-900">Round Type</label>
            <select
              value={roundForm.type}
              onChange={(e) =>
                setRoundForm({ ...roundForm, type: e.target.value as 'speed' | 'individual' })
              }
              className="w-full min-h-[44px] px-4 py-2.5 rounded-btn bg-white border border-navy-700/20 text-ink-900 font-semibold"
            >
              <option value="speed">Speed Round (all answer concurrently, scored by speed)</option>
              <option value="individual">Individual Round (questions assigned to one contestant)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Points"
              type="number"
              value={roundForm.max_points}
              onChange={(e) => setRoundForm({ ...roundForm, max_points: parseInt(e.target.value, 10) || 0 })}
              required
            />
            {roundForm.type === 'speed' && (
              <Input
                label="Min Points (at deadline)"
                type="number"
                value={roundForm.min_points}
                onChange={(e) => setRoundForm({ ...roundForm, min_points: parseInt(e.target.value, 10) || 0 })}
                required
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Time Limit (seconds)"
              type="number"
              value={roundForm.time_limit_sec}
              onChange={(e) => setRoundForm({ ...roundForm, time_limit_sec: parseInt(e.target.value, 10) || 20 })}
              min={3}
              max={300}
              required
            />
            <Input
              label="Wrong Penalty (points)"
              type="number"
              value={roundForm.wrong_penalty}
              onChange={(e) => setRoundForm({ ...roundForm, wrong_penalty: parseInt(e.target.value, 10) || 0 })}
              min={0}
            />
          </div>

          {roundForm.type === 'speed' && (
            <Input
              label="First-Correct Bonus (points)"
              type="number"
              value={roundForm.first_correct_bonus}
              onChange={(e) => setRoundForm({ ...roundForm, first_correct_bonus: parseInt(e.target.value, 10) || 0 })}
              min={0}
            />
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="audience_can_answer"
              checked={roundForm.audience_can_answer}
              onChange={(e) => setRoundForm({ ...roundForm, audience_can_answer: e.target.checked })}
              className="w-4 h-4 text-gold-500 rounded border-navy-700/20"
            />
            <label htmlFor="audience_can_answer" className="text-sm font-medium text-ink-900">
              Allow audience to answer along on their phones
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setRoundModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold">
              Save Round
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Question Modal */}
      <Modal
        isOpen={questionModalOpen}
        onClose={() => setQuestionModalOpen(false)}
        title={editingQuestion ? 'Edit Question' : 'Add Question'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveQuestion} className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto px-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-900">Question Text</label>
            <textarea
              value={qBody}
              onChange={(e) => setQBody(e.target.value)}
              placeholder="e.g. Who was the first king of Israel?"
              rows={3}
              className="w-full p-3 rounded-btn bg-white border border-navy-700/20 text-ink-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-900">Answer Mode</label>
              <select
                value={qAnswerMode}
                onChange={(e) => setQAnswerMode(e.target.value as 'choice' | 'spoken')}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-btn bg-white border border-navy-700/20 text-ink-900 font-semibold"
              >
                <option value="choice">Multiple Choice (Options A–E)</option>
                <option value="spoken">Spoken (Answered aloud; Host marks)</option>
              </select>
            </div>

            {selectedRound?.type === 'individual' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink-900">Assigned Contestant</label>
                <select
                  value={qAssignedContestant}
                  onChange={(e) => setQAssignedContestant(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-btn bg-white border border-navy-700/20 text-ink-900 font-semibold"
                  required
                >
                  <option value="">Select contestant...</option>
                  {contestants.map((c) => (
                    <option key={c.id} value={c.id}>
                      Seat #{c.seat_no}: {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Multiple choice options */}
          {qAnswerMode === 'choice' && (
            <div className="flex flex-col gap-2.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-navy-900">
                  Answer Options & Correct Key
                </label>
                {qOptions.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-xs font-semibold text-gold-500 hover:text-navy-900"
                  >
                    + Add Option ({qOptions.length}/5)
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {qOptions.map((opt, i) => (
                  <div key={opt.key} className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="correct_option"
                        checked={qCorrect === opt.key}
                        onChange={() => setQCorrect(opt.key)}
                        className="w-4 h-4 text-gold-500 focus:ring-gold-500"
                      />
                      <span className="font-mono font-bold text-navy-900 text-sm w-4">
                        {opt.key}
                      </span>
                    </label>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionTextChange(i, e.target.value)}
                      placeholder={`Option ${opt.key} text`}
                      className="flex-1 min-h-[40px] px-3 rounded-btn bg-white border border-navy-700/20 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                      required
                    />

                    {qOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(i)}
                        className="text-danger hover:opacity-80 p-1 text-sm font-bold"
                        title="Remove option"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <Input
              label="Scripture Reference (Optional)"
              value={qScripture}
              onChange={(e) => setQScripture(e.target.value)}
              placeholder="e.g. 1 Samuel 9:1-2"
            />
            <Input
              label="Points Override (Optional)"
              type="number"
              value={qPointsOverride}
              onChange={(e) => setQPointsOverride(e.target.value)}
              placeholder="Default uses round points"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-900">Explanation (Optional)</label>
            <textarea
              value={qExplanation}
              onChange={(e) => setQExplanation(e.target.value)}
              placeholder="Displayed on all screens after the answer is revealed."
              rows={2}
              className="w-full p-3 rounded-btn bg-white border border-navy-700/20 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-900">
              Optional Illustration Image (Max 1 MB)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setQImageFile(e.target.files?.[0] || null)}
              className="text-xs text-ink-500 file:mr-3 file:py-2 file:px-4 file:rounded-btn file:border-0 file:text-xs file:font-semibold file:bg-cream-100 file:text-navy-900 hover:file:bg-cream-50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-navy-700/15">
            <Button type="button" variant="ghost" onClick={() => setQuestionModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" isLoading={isSavingQuestion}>
              Save Question
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Round Confirmation Modal */}
      <Modal
        isOpen={!!deleteRoundTarget}
        onClose={() => setDeleteRoundTarget(null)}
        title="Delete Round"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-500">
            Are you sure you want to delete <strong className="text-navy-900">{deleteRoundTarget?.title}</strong>? All questions contained within this round will also be deleted.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteRoundTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDeleteRound}>
              Delete Round
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Question Confirmation Modal */}
      <Modal
        isOpen={!!deleteQuestionTarget}
        onClose={() => setDeleteQuestionTarget(null)}
        title="Delete Question"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-500">
            Are you sure you want to delete this question: &quot;{deleteQuestionTarget?.body}&quot;?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteQuestionTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDeleteQuestion}>
              Delete Question
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
