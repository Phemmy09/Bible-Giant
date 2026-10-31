'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Event,
  Round,
  Question,
  QuestionKey,
  Contestant,
  Answer,
  ScreenMode,
  QuestionStatus,
  ContestantScore,
} from '@/lib/types';
import {
  rpcHostShowQuestion,
  rpcHostOpenQuestion,
  rpcHostLockQuestion,
  rpcHostRevealQuestion,
  rpcHostResetQuestion,
  rpcHostSetScreen,
  rpcHostMarkSpoken,
} from '@/lib/rpc';
import { useGameState } from '@/lib/realtime/useGameState';
import { useServerClock } from '@/lib/realtime/useServerClock';
import { ConnectionDot } from '@/components/ui/ConnectionDot';
import { QuestionStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Countdown } from '@/components/ui/Countdown';
import { Modal } from '@/components/ui/Modal';
import { ScoreAdjustmentModal } from '@/components/host/ScoreAdjustmentModal';
import { QuestionDocumentUploadModal } from '@/components/host/QuestionDocumentUploadModal';
import { Soundboard } from '@/components/host/Soundboard';
import { soundEngine } from '@/lib/soundEngine';

export default function HostLiveConsolePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const supabase = useMemo(() => createClient(), []);

  // Realtime hooks
  const { gameState, event, connectionStatus, refetch } = useGameState(eventId);
  const { getServerNow } = useServerClock();

  // Static loaded data
  const [rounds, setRounds] = useState<Round[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionKeys, setQuestionKeys] = useState<Map<string, QuestionKey>>(new Map());
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [connectedContestants, setConnectedContestants] = useState<Set<string>>(new Set());
  const [audienceCount, setAudienceCount] = useState<number>(0);
  const [liveAudienceList, setLiveAudienceList] = useState<any[]>([]);

  // Live answers & scores for current question
  const [currentAnswers, setCurrentAnswers] = useState<Answer[]>([]);
  const [scores, setScores] = useState<Map<string, ContestantScore>>(new Map());

  // Local selection state (operator can select an unplayed question before showing it)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  // Modals & UI actions
  const [isCallingRpc, setIsCallingRpc] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [docUploadOpen, setDocUploadOpen] = useState(false);
  const [autoBroadcastOnSelect, setAutoBroadcastOnSelect] = useState(true);
  const [showAudienceLiveFeed, setShowAudienceLiveFeed] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const autoLockCalledRef = useRef(false);

  // Fetch static data on mount
  const fetchSetupData = useCallback(async () => {
    try {
      const [rRes, qRes, kRes, cRes, audCountRes] = await Promise.all([
        supabase.from('rounds').select('*').eq('event_id', eventId).order('position', { ascending: true }),
        supabase.from('questions').select('*').eq('event_id', eventId).order('position', { ascending: true }),
        supabase.from('question_keys').select('*').eq('event_id', eventId),
        supabase.from('contestants').select('*').eq('event_id', eventId).order('seat_no', { ascending: true }),
        supabase.from('audience_members').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
      ]);

      if (rRes.data && rRes.data.length > 0) {
        setRounds(rRes.data as Round[]);
      } else if (eventId === '11111111-1111-1111-1111-111111111111') {
        const { DEFAULT_ROUNDS } = await import('@/lib/defaultEvent');
        setRounds(DEFAULT_ROUNDS);
      }

      if (qRes.data && qRes.data.length > 0) {
        setQuestions(qRes.data as Question[]);
      } else if (eventId === '11111111-1111-1111-1111-111111111111') {
        const { DEFAULT_QUESTIONS } = await import('@/lib/defaultEvent');
        setQuestions(DEFAULT_QUESTIONS);
      }

      if (kRes.data && kRes.data.length > 0) {
        const kMap = new Map<string, QuestionKey>();
        (kRes.data as QuestionKey[]).forEach((k) => kMap.set(k.question_id, k));
        setQuestionKeys(kMap);
      } else if (eventId === '11111111-1111-1111-1111-111111111111') {
        const { DEFAULT_QUESTION_KEYS } = await import('@/lib/defaultEvent');
        const kMap = new Map<string, QuestionKey>();
        DEFAULT_QUESTION_KEYS.forEach((k) => kMap.set(k.question_id, k));
        setQuestionKeys(kMap);
      }

      if (cRes.data && cRes.data.length > 0) {
        setContestants(cRes.data as Contestant[]);
      } else if (eventId === '11111111-1111-1111-1111-111111111111') {
        const { DEFAULT_CONTESTANTS } = await import('@/lib/defaultEvent');
        setContestants(DEFAULT_CONTESTANTS);
      }

      if (audCountRes.count !== null) setAudienceCount(audCountRes.count);
    } catch {
      if (eventId === '11111111-1111-1111-1111-111111111111') {
        const {
          DEFAULT_ROUNDS,
          DEFAULT_QUESTIONS,
          DEFAULT_QUESTION_KEYS,
          DEFAULT_CONTESTANTS,
        } = await import('@/lib/defaultEvent');
        setRounds(DEFAULT_ROUNDS);
        setQuestions(DEFAULT_QUESTIONS);
        const kMap = new Map<string, QuestionKey>();
        DEFAULT_QUESTION_KEYS.forEach((k) => kMap.set(k.question_id, k));
        setQuestionKeys(kMap);
        setContestants(DEFAULT_CONTESTANTS);
      }
    }
  }, [eventId, supabase]);

  useEffect(() => {
    fetchSetupData();
  }, [fetchSetupData]);

  // Presence channel for connected contestants
  useEffect(() => {
    const presence = supabase.channel(`presence:${eventId}`);
    presence
      .on('presence', { event: 'sync' }, () => {
        const state = presence.presenceState();
        const active = new Set<string>();
        Object.values(state).forEach((presences) => {
          presences.forEach((item) => {
            const p = item as unknown as { contestant_id?: string };
            if (p.contestant_id) active.add(p.contestant_id);
          });
        });
        setConnectedContestants(active);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(presence);
    };
  }, [eventId, supabase]);

  // Fetch answers & scores for current question
  const activeQuestionId = gameState?.current_question_id || selectedQuestionId;

  const fetchAnswersAndScores = useCallback(async () => {
    if (!activeQuestionId) return;

    const [ansRes, scRes] = await Promise.all([
      supabase.from('answers').select('*').eq('question_id', activeQuestionId),
      supabase.from('contestant_scores').select('*').eq('event_id', eventId),
    ]);

    if (ansRes.data) setCurrentAnswers(ansRes.data as Answer[]);
    if (scRes.data) {
      const sMap = new Map<string, ContestantScore>();
      (scRes.data as ContestantScore[]).forEach((s) => sMap.set(s.contestant_id, s));
      setScores(sMap);
    }
  }, [activeQuestionId, eventId, supabase]);

  useEffect(() => {
    fetchAnswersAndScores();

    // Subscribe to answers
    const ansChannel = supabase
      .channel(`live_answers:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'answers', filter: `event_id=eq.${eventId}` },
        () => {
          fetchAnswersAndScores();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contestant_scores', filter: `event_id=eq.${eventId}` },
        () => {
          fetchAnswersAndScores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ansChannel);
    };
  }, [eventId, fetchAnswersAndScores, supabase]);

  // Active question object
  const activeQuestion = useMemo(() => {
    if (!activeQuestionId) return null;
    return questions.find((q) => q.id === activeQuestionId) || null;
  }, [activeQuestionId, questions]);

  const activeRound = useMemo(() => {
    if (!activeQuestion) return null;
    return rounds.find((r) => r.id === activeQuestion.round_id) || null;
  }, [activeQuestion, rounds]);

  const activeQuestionKey = useMemo(() => {
    if (!activeQuestion) return null;
    return questionKeys.get(activeQuestion.id) || null;
  }, [activeQuestion, questionKeys]);

  const qStatus: QuestionStatus = gameState?.question_status || 'hidden';

  // Auto-lock timer logic
  useEffect(() => {
    if (qStatus === 'open' && gameState?.closes_at) {
      autoLockCalledRef.current = false;
      const closesAtMs = new Date(gameState.closes_at).getTime();

      const timer = setInterval(() => {
        const now = getServerNow();
        if (now >= closesAtMs && !autoLockCalledRef.current) {
          autoLockCalledRef.current = true;
          rpcHostLockQuestion(eventId, supabase).then(() => refetch());
        }
      }, 300);

      return () => clearInterval(timer);
    }
  }, [qStatus, gameState?.closes_at, eventId, getServerNow, supabase, refetch]);

  // Continuous sync of registered and live audience members
  useEffect(() => {
    async function syncAudience() {
      try {
        const res = await fetch(`/api/audience/leaderboard?eventId=${eventId}`);
        const data = await res.json();
        if (data.ok) {
          if (typeof data.total_registered === 'number') {
            setAudienceCount(data.total_registered);
          }
          if (Array.isArray(data.all)) {
            setLiveAudienceList(data.all);
          }
        }
      } catch {}
    }

    syncAudience();
    const interval = setInterval(syncAudience, 4000);
    return () => clearInterval(interval);
  }, [eventId]);

  // Stage transition step handlers with audio cue integration
  async function handleShow() {
    if (!activeQuestionId) return;
    setIsCallingRpc(true);
    setErrorNotice(null);
    const res = await rpcHostShowQuestion(eventId, activeQuestionId, supabase);
    setIsCallingRpc(false);
    if (!res.ok) setErrorNotice(res.message);
    else {
      refetch();
      soundEngine?.playCue('tick');
    }
  }

  // Instant switch and broadcast to all screens
  async function handleSwitchAndShowQuestion(qId: string) {
    setSelectedQuestionId(qId);
    setIsCallingRpc(true);
    setErrorNotice(null);
    const res = await rpcHostShowQuestion(eventId, qId, supabase);
    setIsCallingRpc(false);
    if (!res.ok) {
      setErrorNotice(res.message);
    } else {
      refetch();
      fetchAnswersAndScores();
      soundEngine?.playCue('tick');
    }
  }

  function handleSelectQuestion(qId: string) {
    if (autoBroadcastOnSelect) {
      handleSwitchAndShowQuestion(qId);
    } else {
      setSelectedQuestionId(qId);
    }
  }

  async function handleToggleScreenOutput() {
    const isCurrentlyBlank = gameState?.screen === 'blank';
    const targetMode: ScreenMode = isCurrentlyBlank ? 'question' : 'blank';
    await rpcHostSetScreen(eventId, targetMode, supabase);
    refetch();
  }

  async function handleOpen() {
    setIsCallingRpc(true);
    setErrorNotice(null);
    const res = await rpcHostOpenQuestion(eventId, supabase);
    setIsCallingRpc(false);
    if (!res.ok) setErrorNotice(res.message);
    else {
      refetch();
      soundEngine?.playCue('tick');
    }
  }

  async function handleLock() {
    setIsCallingRpc(true);
    setErrorNotice(null);
    const res = await rpcHostLockQuestion(eventId, supabase);
    setIsCallingRpc(false);
    if (!res.ok) setErrorNotice(res.message);
    else {
      refetch();
      soundEngine?.playCue('gong');
    }
  }

  async function handleReveal() {
    setIsCallingRpc(true);
    setErrorNotice(null);
    const res = await rpcHostRevealQuestion(eventId, supabase);
    setIsCallingRpc(false);
    if (!res.ok) setErrorNotice(res.message);
    else {
      refetch();
      fetchAnswersAndScores();
      soundEngine?.playCue('drumroll');
      setTimeout(() => {
        soundEngine?.playCue('correct');
      }, 700);
    }
  }

  async function handleReset() {
    setIsCallingRpc(true);
    setErrorNotice(null);
    const res = await rpcHostResetQuestion(eventId, supabase);
    setIsCallingRpc(false);
    setResetModalOpen(false);
    if (!res.ok) setErrorNotice(res.message);
    else {
      refetch();
      fetchAnswersAndScores();
    }
  }

  async function handleSetScreen(mode: ScreenMode) {
    await rpcHostSetScreen(eventId, mode, supabase);
    refetch();
  }

  async function handleMarkSpoken(contestantId: string, isCorrect: boolean) {
    setIsCallingRpc(true);
    const res = await rpcHostMarkSpoken(eventId, contestantId, isCorrect, supabase);
    setIsCallingRpc(false);
    if (!res.ok) setErrorNotice(res.message);
    else {
      refetch();
      fetchAnswersAndScores();
      soundEngine?.playCue(isCorrect ? 'correct' : 'incorrect');
    }
  }

  // Keyboard shortcuts (Space = next valid action, L = leaderboard, B = blank, Q = question)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (qStatus === 'hidden' && activeQuestionId) handleShow();
        else if (qStatus === 'shown') handleOpen();
        else if (qStatus === 'open') handleLock();
        else if (qStatus === 'locked') handleReveal();
      } else if (e.key === 'l' || e.key === 'L') {
        handleSetScreen('leaderboard');
      } else if (e.key === 'b' || e.key === 'B') {
        handleSetScreen('blank');
      } else if (e.key === 'q' || e.key === 'Q') {
        handleSetScreen('question');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Next question logic (selects the first unplayed question)
  function handleSelectNextUnplayed() {
    const unplayed = questions.find((q) => {
      return q.id !== gameState?.current_question_id;
    });
    if (unplayed) {
      if (autoBroadcastOnSelect) {
        handleSwitchAndShowQuestion(unplayed.id);
      } else {
        setSelectedQuestionId(unplayed.id);
      }
    }
  }

  // Answers statistics
  const contestantAnswersMap = useMemo(() => {
    const map = new Map<string, Answer>();
    currentAnswers.forEach((a) => {
      if (a.contestant_id) map.set(a.contestant_id, a);
    });
    return map;
  }, [currentAnswers]);

  const audienceAnswers = useMemo(() => {
    return currentAnswers.filter((a) => a.audience_id);
  }, [currentAnswers]);

  const audienceAnswersCount = audienceAnswers.length;

  const audienceDistribution = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    audienceAnswers.forEach((a) => {
      const k = a.choice_key as 'A' | 'B' | 'C' | 'D';
      if (counts[k] !== undefined) counts[k]++;
    });
    const total = audienceAnswers.length || 1;
    return {
      counts,
      percentages: {
        A: Math.round((counts.A / total) * 100),
        B: Math.round((counts.B / total) * 100),
        C: Math.round((counts.C / total) * 100),
        D: Math.round((counts.D / total) * 100),
      },
    };
  }, [audienceAnswers]);

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col text-ink-900 select-none">
      {/* 1. TOP BAR */}
      <header className="w-full bg-navy-900 text-cream-50 px-4 sm:px-6 py-3 border-b border-navy-700 flex items-center justify-between shadow-soft">
        <div className="flex items-center gap-4">
          <Link
            href={`/host/${eventId}`}
            className="text-xs font-semibold text-gold-300 hover:text-cream-50 transition-colors"
          >
            ← Overview
          </Link>
          <div className="h-4 w-px bg-navy-700" />
          <span className="font-display text-xl font-bold text-cream-50">
            {event?.name || 'Live Competition'}
          </span>
          <ConnectionDot status={connectionStatus} className="text-gold-300 ml-2" />
        </div>

        <div className="flex items-center gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-gold-300 font-medium">Contestants:</span>
            <span className="font-mono font-bold text-cream-50">
              {connectedContestants.size} / {contestants.length}
            </span>
          </div>
          <div className="h-4 w-px bg-navy-700" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-gold-300 font-medium">Audience:</span>
            <span className="font-mono font-bold text-cream-50">{audienceCount} live</span>
          </div>
          <div className="h-4 w-px bg-navy-700" />
          <button
            type="button"
            onClick={handleToggleScreenOutput}
            className={`px-2.5 py-1 rounded font-bold text-xs transition-colors flex items-center gap-1.5 ${
              gameState?.screen === 'blank'
                ? 'bg-danger/20 border border-danger text-danger hover:bg-danger/30'
                : 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900'
            }`}
          >
            <span>{gameState?.screen === 'blank' ? '⚫ Screen: Off (Blank)' : '🟢 Screen: Live'}</span>
          </button>
          <div className="h-4 w-px bg-navy-700" />
          <button
            type="button"
            onClick={() => setDocUploadOpen(true)}
            className="px-2.5 py-1 rounded bg-navy-800 border border-gold-500/40 text-gold-300 font-bold text-xs hover:bg-navy-700 transition-colors flex items-center gap-1.5"
          >
            <span>📄</span>
            <span>Upload Questions</span>
          </button>
          <div className="h-4 w-px bg-navy-700" />
          <button
            type="button"
            onClick={() => setAdjustModalOpen(true)}
            className="px-2.5 py-1 rounded bg-navy-800 border border-gold-500/40 text-gold-300 font-bold text-xs hover:bg-navy-700 transition-colors flex items-center gap-1.5"
          >
            <span>⚖️</span>
            <span>Adjust Scores</span>
          </button>
          <div className="h-4 w-px bg-navy-700" />
          <Link
            href={`/screen/${eventId}`}
            target="_blank"
            className="px-2.5 py-1 rounded bg-gold-500 text-navy-950 font-bold text-xs hover:bg-gold-300 transition-colors"
          >
            Projector Screen ↗
          </Link>
        </div>
      </header>

      {errorNotice && (
        <div className="bg-danger text-cream-50 text-xs sm:text-sm py-2 px-4 text-center font-medium flex items-center justify-between">
          <span className="mx-auto">{errorNotice}</span>
          <button onClick={() => setErrorNotice(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* 2. THREE-COLUMN LIVE ENGINE LAYOUT */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 max-w-[1600px] w-full mx-auto">
        {/* COLUMN 1: RUN ORDER (3 COLS) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-3 max-h-[85vh] overflow-y-auto pr-1">
          <div className="flex items-center justify-between pb-2 border-b border-navy-700/15">
            <div>
              <h3 className="font-display text-lg font-bold text-navy-900">Run Order</h3>
              <span className="text-xs font-semibold text-ink-500">
                {questions.length} questions
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDocUploadOpen(true)}
              className="px-2.5 py-1 rounded bg-gold-500 hover:bg-gold-400 text-navy-950 text-xs font-bold transition-all shadow-xs"
            >
              + Upload Docs
            </button>
          </div>

          {/* Instant Live Broadcast Switch on Select Toggle */}
          <div className="p-2.5 rounded bg-cream-100 border border-navy-700/10 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-navy-900 block">⚡ Instant Live on Click</span>
              <span className="text-[10px] text-ink-500">
                {autoBroadcastOnSelect ? 'Clicking question broadcasts live to all screens' : 'Clicking question only previews in console'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAutoBroadcastOnSelect(!autoBroadcastOnSelect)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                autoBroadcastOnSelect
                  ? 'bg-success text-white shadow-xs'
                  : 'bg-cream-200 text-ink-600'
              }`}
            >
              {autoBroadcastOnSelect ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="space-y-4">
            {rounds.map((r) => {
              const roundQuestions = questions.filter((q) => q.round_id === r.id);

              return (
                <div key={r.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-navy-900 bg-cream-100 p-2 rounded">
                    <span>
                      Round {r.position}: {r.title}
                    </span>
                    <span className="text-[10px] text-ink-500">{r.type}</span>
                  </div>

                  <div className="space-y-1 pl-1">
                    {roundQuestions.map((q, idx) => {
                      const isCurrent = gameState?.current_question_id === q.id;
                      const isSelected = selectedQuestionId === q.id;

                      return (
                        <div
                          key={q.id}
                          onClick={() => handleSelectQuestion(q.id)}
                          className={`p-2.5 rounded-btn border text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isCurrent
                              ? 'bg-gold-500/20 border-gold-500 font-bold text-navy-900 shadow-sm ring-1 ring-gold-500'
                              : isSelected
                              ? 'bg-white border-navy-900 font-semibold'
                              : 'bg-white border-navy-700/15 hover:border-gold-500/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-ink-500">Q{idx + 1}</span>
                            <span className="truncate">{q.body}</span>
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] uppercase font-extrabold text-gold-500 px-1.5 py-0.5 bg-navy-900 rounded shrink-0">
                              Live
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: CENTER STAGE CONTROLS (6 COLS) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
          {/* Main Question Card */}
          <Card className="bg-white p-6 shadow-soft flex flex-col justify-between min-h-[380px] border border-navy-700/15">
            <div>
              {/* Question Switch Notice */}
              {selectedQuestionId && selectedQuestionId !== gameState?.current_question_id && (
                <div className="mb-3 p-3 bg-amber-500/15 border border-amber-500/40 rounded-btn flex items-center justify-between animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-navy-900 block">Selected question is not yet live on stage</span>
                    <span className="text-[11px] text-ink-500">Click below to switch and broadcast live across projector, audience, and contestant screens.</span>
                  </div>
                  <Button
                    variant="gold"
                    size="md"
                    onClick={() => handleSwitchAndShowQuestion(selectedQuestionId)}
                    disabled={isCallingRpc}
                    className="font-bold shadow-soft whitespace-nowrap text-xs py-1.5 px-3"
                  >
                    ⚡ Broadcast Live Now
                  </Button>
                </div>
              )}

              {/* Question Header */}
              <div className="flex items-center justify-between mb-3 border-b border-navy-700/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded">
                    {activeRound?.title || 'Competition Round'}
                  </span>
                  <span className="text-xs font-medium text-ink-500">
                    Mode: <strong className="uppercase">{activeQuestion?.answer_mode}</strong>
                  </span>
                </div>
                <QuestionStatusBadge status={qStatus} />
              </div>

              {/* Question Text */}
              <div className="my-4">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy-900 leading-snug">
                  {activeQuestion?.body || 'No question selected'}
                </h2>
                {activeQuestion?.scripture_ref && (
                  <p className="text-sm font-semibold text-gold-500 mt-1">
                    📖 {activeQuestion.scripture_ref}
                  </p>
                )}
              </div>

              {/* Options with Operator Answer Key */}
              {activeQuestion?.answer_mode === 'choice' && (
                <div className="grid grid-cols-2 gap-2.5 my-4">
                  {activeQuestion.options.map((opt) => {
                    const isKey = activeQuestionKey?.correct_key === opt.key;

                    return (
                      <div
                        key={opt.key}
                        className={`p-3 rounded-btn border text-xs sm:text-sm flex items-center gap-2.5 ${
                          isKey
                            ? 'bg-success/15 border-success font-bold text-success'
                            : 'bg-cream-50 border-navy-700/15 text-navy-900'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                            isKey ? 'bg-success text-white' : 'bg-cream-100 text-navy-900'
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className="truncate">{opt.text}</span>
                        {isKey && <span className="ml-auto text-xs">✓ Correct</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Spoken Mode Marks */}
              {activeQuestion?.answer_mode === 'spoken' && (
                <div className="my-4 p-4 bg-cream-100 rounded-btn border border-gold-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider font-bold text-navy-900">
                      Spoken Marking
                    </p>
                    {activeQuestion.assigned_contestant_id && (
                      <span className="text-xs font-bold text-gold-500 bg-white px-2 py-0.5 rounded border border-gold-500/20">
                        Assigned Seat #{contestants.find((c) => c.id === activeQuestion.assigned_contestant_id)?.seat_no}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {contestants
                      .filter((c) => !activeQuestion.assigned_contestant_id || activeQuestion.assigned_contestant_id === c.id)
                      .map((c) => {
                        const ans = contestantAnswersMap.get(c.id);

                        return (
                          <div key={c.id} className="flex items-center justify-between text-sm bg-white p-2.5 rounded-btn border border-navy-700/10">
                            <span className="font-bold text-navy-900">
                              Seat #{c.seat_no}: {c.name} {c.group_label ? `(${c.group_label})` : ''}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleMarkSpoken(c.id, true)}
                                disabled={isCallingRpc}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                                  ans?.is_correct === true
                                    ? 'bg-success text-white ring-2 ring-success'
                                    : 'bg-cream-50 border border-success/40 text-success hover:bg-success/15'
                                }`}
                              >
                                ✓ Correct
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkSpoken(c.id, false)}
                                disabled={isCallingRpc}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                                  ans?.is_correct === false
                                    ? 'bg-danger text-white ring-2 ring-danger'
                                    : 'bg-cream-50 border border-danger/40 text-danger hover:bg-danger/15'
                                }`}
                              >
                                ✗ Wrong
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Prominent Countdown when Question is Open */}
            {qStatus === 'open' && (
              <div className="py-2">
                <Countdown
                  closesAt={gameState?.closes_at || null}
                  totalSeconds={activeRound?.time_limit_sec || 20}
                  getServerNow={getServerNow}
                  variant="bar"
                />
              </div>
            )}

            {/* STEP BUTTONS: Show -> Open -> Lock -> Reveal */}
            <div className="pt-4 border-t border-navy-700/10 flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setResetModalOpen(true)}
                disabled={qStatus === 'hidden'}
                className="text-xs text-danger hover:bg-danger/10 border-danger/20"
              >
                Reset Question
              </Button>

              <div className="flex items-center gap-2.5">
                {/* Step 1: SHOW */}
                <Button
                  variant="primary"
                  size="lg"
                  disabled={qStatus !== 'hidden' || !activeQuestionId || isCallingRpc}
                  onClick={handleShow}
                  className={qStatus === 'hidden' ? 'ring-2 ring-gold-500 font-bold' : ''}
                >
                  1. Show
                </Button>

                {/* Step 2: OPEN */}
                <Button
                  variant="gold"
                  size="lg"
                  disabled={qStatus !== 'shown' || isCallingRpc}
                  onClick={handleOpen}
                  className={qStatus === 'shown' ? 'ring-2 ring-gold-500 font-bold animate-pulse' : ''}
                >
                  2. Open
                </Button>

                {/* Step 3: LOCK */}
                <Button
                  variant="danger"
                  size="lg"
                  disabled={qStatus !== 'open' || isCallingRpc}
                  onClick={handleLock}
                  className={qStatus === 'open' ? 'ring-2 ring-danger font-bold' : ''}
                >
                  3. Lock
                </Button>

                {/* Step 4: REVEAL */}
                <Button
                  variant="primary"
                  size="lg"
                  disabled={qStatus !== 'locked' || isCallingRpc}
                  onClick={handleReveal}
                  className={qStatus === 'locked' ? 'ring-2 ring-gold-500 bg-gold-500 text-navy-950 font-bold' : ''}
                >
                  4. Reveal
                </Button>
              </div>
            </div>
          </Card>

          {/* Projector Screen Controls & Mirror */}
          <Card className="bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-navy-900">
                Projector View Mode ({gameState?.screen})
              </span>
              <span className="text-[11px] text-ink-500">
                Shortcuts: Space (Step), L (Leaderboard), B (Blank), Q (Question)
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { mode: 'lobby', label: 'Lobby' },
                { mode: 'predictions', label: 'Predictions' },
                { mode: 'question', label: 'Question' },
                { mode: 'answer', label: 'Answer' },
                { mode: 'leaderboard', label: 'Leaderboard' },
                { mode: 'winner', label: 'Winner' },
                { mode: 'raffle', label: 'Raffle' },
                { mode: 'blank', label: 'Blank' },
              ].map(({ mode, label }) => {
                const isActive = gameState?.screen === mode;

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleSetScreen(mode as ScreenMode)}
                    className={`px-3 py-1.5 rounded-btn text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-navy-900 text-cream-50 shadow-sm ring-2 ring-gold-500'
                        : 'bg-cream-100 text-navy-900 hover:bg-cream-50 border border-navy-700/15'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </Card>
          {/* Live Soundboard & Classical Audio */}
          <Soundboard />
        </div>

        {/* COLUMN 3: CONTESTANTS ANSWER PANEL (3 COLS) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          <Card className="bg-white p-4 shadow-soft flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-navy-700/15">
              <h3 className="font-display text-lg font-bold text-navy-900">
                Live Contestants ({contestants.length})
              </h3>
              <Button
                variant="ghost"
                size="md"
                onClick={handleSelectNextUnplayed}
                className="text-xs min-h-[30px] px-2 py-0.5"
              >
                Next Question →
              </Button>
            </div>

            <div className="space-y-2">
              {contestants.map((c) => {
                const ans = contestantAnswersMap.get(c.id);
                const score = scores.get(c.id)?.total_points || 0;
                const isConnected = connectedContestants.has(c.id);

                return (
                  <div
                    key={c.id}
                    className="p-3 rounded-btn border border-navy-700/10 bg-cream-50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                      <span className="font-mono font-bold text-navy-900">#{c.seat_no}</span>
                      <span className="font-semibold text-navy-900 truncate max-w-[100px]">
                        {c.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {ans ? (
                        qStatus === 'revealed' ? (
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-xs ${
                              ans.is_correct
                                ? 'bg-success/15 text-success'
                                : 'bg-danger/15 text-danger'
                            }`}
                          >
                            {ans.choice_key || 'Spoken'} ({ans.points >= 0 ? `+${ans.points}` : ans.points})
                          </span>
                        ) : qStatus === 'locked' ? (
                          <span className="font-mono font-bold text-navy-900 bg-cream-100 px-2 py-0.5 rounded">
                            {ans.choice_key || '✓'} ({((ans.elapsed_ms || 0) / 1000).toFixed(1)}s)
                          </span>
                        ) : (
                          <span className="font-semibold text-success bg-success/10 px-2 py-0.5 rounded">
                            ✓ Answered
                          </span>
                        )
                      ) : (
                        <span className="text-ink-500 italic">Waiting</span>
                      )}

                      <span className="font-mono font-bold text-navy-900 pl-2 border-l border-navy-700/10">
                        {score} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Audience Mini-Panel & Real-Time Answer Distribution */}
          <Card className="bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-navy-900 uppercase tracking-wider">
                Audience Activity
              </span>
              <span className="font-semibold text-gold-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Live
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-center">
              <div className="p-3 bg-cream-100 rounded-btn border border-navy-700/10">
                <p className="text-[10px] text-ink-500 uppercase font-semibold">Joined</p>
                <p className="font-display text-2xl font-bold text-navy-900">{audienceCount}</p>
              </div>
              <div className="p-3 bg-cream-100 rounded-btn border border-navy-700/10">
                <p className="text-[10px] text-ink-500 uppercase font-semibold">Answered</p>
                <p className="font-display text-2xl font-bold text-navy-900">
                  {audienceAnswersCount}
                </p>
              </div>
            </div>

            {/* Live Vote Distribution Bars */}
            {activeQuestion?.answer_mode === 'choice' && (
              <div className="mt-4 pt-3 border-t border-navy-700/10 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500 block">
                  Live Vote Distribution
                </span>
                {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                  <div key={opt} className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold w-4 text-navy-900">{opt}</span>
                    <div className="flex-1 bg-cream-100 rounded-full h-3 overflow-hidden border border-navy-700/10">
                      <div
                        className="bg-gold-500 h-full transition-all duration-300"
                        style={{ width: `${audienceDistribution.percentages[opt]}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-ink-500 w-16 text-right">
                      {audienceDistribution.percentages[opt]}% ({audienceDistribution.counts[opt]})
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Real-time Audience Feed Toggle */}
            <div className="mt-4 pt-3 border-t border-navy-700/10">
              <button
                type="button"
                onClick={() => setShowAudienceLiveFeed(!showAudienceLiveFeed)}
                className="text-xs font-semibold text-navy-900 hover:text-gold-600 w-full flex items-center justify-between"
              >
                <span>{showAudienceLiveFeed ? '▲ Hide Live Audience Feed' : '▼ Live Audience Submissions Feed'}</span>
                <span className="text-[10px] font-mono font-bold bg-cream-100 px-1.5 py-0.5 rounded text-navy-900">
                  {audienceAnswers.length}
                </span>
              </button>

              {showAudienceLiveFeed && (
                <div className="mt-2.5 max-h-52 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {audienceAnswers.length === 0 ? (
                    <p className="text-[11px] text-ink-500 italic py-2 text-center">
                      Awaiting audience answers…
                    </p>
                  ) : (
                    audienceAnswers.map((ans, idx) => {
                      const aud = liveAudienceList.find(
                        (m) => m.id === ans.audience_id || m.audience_id === ans.audience_id
                      );
                      return (
                        <div
                          key={ans.id || idx}
                          className="p-2 rounded bg-cream-50 border border-navy-700/10 flex items-center justify-between text-[11px]"
                        >
                          <span className="font-semibold text-navy-900 truncate max-w-[130px]">
                            {aud?.name || aud?.display_name || 'Audience Member'}
                          </span>
                          <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-cream-100 text-navy-900">
                            Choice {ans.choice_key}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Reset Question Confirmation Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Current Question"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-500">
            Emergency Action: This will <strong>delete all answers and points</strong> recorded for this question and return its status to <strong>Shown</strong>.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setResetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset}>
              Reset Question
            </Button>
          </div>
        </div>
      </Modal>

      {/* Score Adjustment Modal */}
      <ScoreAdjustmentModal
        eventId={eventId}
        contestants={contestants}
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        onAdjusted={() => {
          fetchAnswersAndScores();
          refetch();
        }}
      />

      {/* Upload Questions Document Modal (PDF, DOCX, Sheets, CSV) */}
      <QuestionDocumentUploadModal
        isOpen={docUploadOpen}
        onClose={() => setDocUploadOpen(false)}
        eventId={eventId}
        rounds={rounds}
        onSuccess={() => {
          fetchSetupData();
          refetch();
        }}
      />
    </div>
  );
}

