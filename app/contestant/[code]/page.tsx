'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Contestant,
  ContestantScore,
  QuestionKey,
  Answer,
  OptionKey,
  QuestionStatus,
} from '@/lib/types';
import { rpcGetEventByCode, rpcSubmitAnswer } from '@/lib/rpc';
import { useGameState } from '@/lib/realtime/useGameState';
import { useServerClock } from '@/lib/realtime/useServerClock';
import { ConnectionDot } from '@/components/ui/ConnectionDot';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Countdown } from '@/components/ui/Countdown';
import { OptionCard } from '@/components/ui/OptionCard';

export default function ContestantViewPage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = (params.code as string) || '';
  const code = rawCode.toUpperCase();

  const supabase = useMemo(() => createClient(), []);

  const [eventId, setEventId] = useState<string | null>(null);
  const [contestant, setContestant] = useState<Contestant | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [contestantScore, setContestantScore] = useState<number>(0);
  const [contestantRank, setContestantRank] = useState<number>(1);
  const [initError, setInitError] = useState<string | null>(null);

  // Live question state
  const [myAnswer, setMyAnswer] = useState<Answer | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<OptionKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [questionKey, setQuestionKey] = useState<QuestionKey | null>(null);

  // Realtime hooks
  const { gameState, event, currentQuestion, currentRound, connectionStatus } = useGameState(eventId);
  const { getServerNow } = useServerClock();

  // 1. Initial auth & contestant claim validation
  useEffect(() => {
    async function initContestant() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push('/contestant');
          return;
        }

        const evRes = await rpcGetEventByCode(code, supabase);
        if (!evRes.ok || !evRes.data) {
          setInitError('Event not found with that code');
          return;
        }

        const evId = evRes.data.id;
        setEventId(evId);

        // Find claimed contestant row
        const { data: cData, error: cErr } = await supabase
          .from('contestants')
          .select('*')
          .eq('event_id', evId)
          .eq('auth_user_id', session.user.id)
          .single();

        if (cErr || !cData) {
          setInitError('You have not claimed a seat in this event. Please sign in with your PIN.');
          return;
        }

        setContestant(cData as Contestant);

        // Fetch all contestants for individual name lookups
        const { data: allC } = await supabase.from('contestants').select('*').eq('event_id', evId);
        if (allC) setContestants(allC as Contestant[]);

        // Fetch score
        const { data: scData } = await supabase
          .from('contestant_scores')
          .select('total_points')
          .eq('contestant_id', cData.id)
          .single();
        if (scData) {
          setContestantScore(scData.total_points || 0);
        }

        // Fetch rank from all scores
        const { data: allScores } = await supabase
          .from('contestant_scores')
          .select('contestant_id, total_points, correct_count, correct_ms')
          .eq('event_id', evId)
          .order('total_points', { ascending: false })
          .order('correct_count', { ascending: false })
          .order('correct_ms', { ascending: true });

        if (allScores) {
          const rank = allScores.findIndex((s) => s.contestant_id === cData.id) + 1;
          setContestantRank(rank || 1);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error loading contestant data';
        setInitError(msg);
      }
    }

    initContestant();
  }, [code, router, supabase]);

  // Presence channel to broadcast connected status to operator console
  useEffect(() => {
    if (!eventId || !contestant) return;

    const presenceChannel = supabase.channel(`presence:${eventId}`, {
      config: { presence: { key: contestant.id } },
    });

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          contestant_id: contestant.id,
          seat_no: contestant.seat_no,
          name: contestant.name,
        });
      }
    });

    // Subscribe to score updates
    const scoreChannel = supabase
      .channel(`contestant_score:${contestant.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contestant_scores', filter: `contestant_id=eq.${contestant.id}` },
        (payload) => {
          const sc = payload.new as ContestantScore;
          if (sc) setContestantScore(sc.total_points || 0);
        }
      )
      .subscribe();

    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(scoreChannel);
    };
  }, [eventId, contestant, supabase]);

  // Fetch my answer for the current question
  const fetchMyAnswer = useCallback(async () => {
    if (!currentQuestion?.id || !contestant?.id) {
      setMyAnswer(null);
      setSelectedChoice(null);
      return;
    }

    const { data: ansData } = await supabase
      .from('answers')
      .select('*')
      .eq('question_id', currentQuestion.id)
      .eq('contestant_id', contestant.id)
      .single();

    if (ansData) {
      setMyAnswer(ansData as Answer);
      setSelectedChoice(ansData.choice_key as OptionKey);
    } else {
      setMyAnswer(null);
      setSelectedChoice(null);
    }
  }, [currentQuestion?.id, contestant?.id, supabase]);

  useEffect(() => {
    fetchMyAnswer();
  }, [fetchMyAnswer]);

  // Fetch question key when question is revealed
  useEffect(() => {
    if (currentQuestion?.id && gameState?.question_status === 'revealed') {
      supabase
        .from('question_keys')
        .select('*')
        .eq('question_id', currentQuestion.id)
        .single()
        .then(({ data }) => {
          if (data) setQuestionKey(data as QuestionKey);
        });
      fetchMyAnswer();
    } else {
      setQuestionKey(null);
    }
  }, [currentQuestion?.id, gameState?.question_status, fetchMyAnswer, supabase]);

  // Answer submission handler
  const handleSelectAnswer = useCallback(
    async (choice: OptionKey) => {
      if (!currentQuestion?.id || isSubmitting || myAnswer) return;
      if (gameState?.question_status !== 'open') return;

      // Optimistic selection
      setSelectedChoice(choice);
      setIsSubmitting(true);
      setSubmitError(null);

      const res = await rpcSubmitAnswer(currentQuestion.id, choice, supabase);
      setIsSubmitting(false);

      if (res.ok) {
        // Answer accepted
        setMyAnswer({
          id: '',
          event_id: eventId || '',
          question_id: currentQuestion.id,
          contestant_id: contestant?.id || null,
          audience_id: null,
          choice_key: choice,
          submitted_at: new Date().toISOString(),
          elapsed_ms: res.data.elapsed_ms || null,
          is_correct: null,
          points: 0,
        });
      } else {
        setSubmitError(res.message);
        // If server says already answered, re-fetch actual answer
        if (res.code === 'already_answered') {
          fetchMyAnswer();
        }
      }
    },
    [currentQuestion?.id, isSubmitting, myAnswer, gameState?.question_status, supabase, eventId, contestant?.id, fetchMyAnswer]
  );

  // Keyboard shortcut listener for options A, B, C, D, E
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (gameState?.question_status !== 'open' || myAnswer || isSubmitting) return;
      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
        const matchingOpt = currentQuestion?.options.find((o) => o.key === key);
        if (matchingOpt) {
          handleSelectAnswer(key as OptionKey);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState?.question_status, myAnswer, isSubmitting, currentQuestion?.options, handleSelectAnswer]);

  if (initError) {
    return (
      <main className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center bg-white p-8">
          <p className="text-danger font-semibold mb-4">{initError}</p>
          <Link href="/contestant">
            <Button variant="primary">← Back to Seat Sign In</Button>
          </Link>
        </Card>
      </main>
    );
  }

  if (!contestant) {
    return (
      <main className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2 text-ink-500">
          <svg className="animate-spin h-6 w-6 text-gold-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm">Connecting to podium…</p>
        </div>
      </main>
    );
  }

  const qStatus: QuestionStatus = gameState?.question_status || 'hidden';
  const isAssignedToOther =
    currentQuestion?.assigned_contestant_id &&
    currentQuestion.assigned_contestant_id !== contestant.id;

  const assignedContestantName = isAssignedToOther
    ? contestants.find((c) => c.id === currentQuestion?.assigned_contestant_id)?.name || 'Another contestant'
    : null;

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col justify-between select-none">
      {/* Contestant Header: Name, Seat, Connection Dot, Score & Rank */}
      <header className="w-full bg-navy-900 text-cream-50 border-b border-navy-700 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-soft sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-extrabold text-navy-950 bg-gold-500 px-2.5 py-0.5 rounded-chip">
              Seat #{contestant.seat_no}
            </span>
            <span className="font-semibold text-cream-50 text-base sm:text-lg">
              {contestant.name}
            </span>
          </div>
          <ConnectionDot status={connectionStatus} className="text-gold-300" />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            <span className="text-gold-300 font-medium">Rank:</span>
            <span className="font-display font-bold text-cream-50 text-lg tabular-nums">
              #{contestantRank}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-navy-700/80 border border-gold-500/30 px-3 py-1 rounded-chip">
            <span className="text-xs uppercase tracking-wider text-gold-300 font-semibold">
              Score:
            </span>
            <span className="font-display font-bold text-cream-50 text-xl tabular-nums">
              {contestantScore}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 flex flex-col justify-center items-center">
        {/* 1. WAITING / LOBBY STATE */}
        {qStatus === 'hidden' && (
          <div className="text-center flex flex-col items-center gap-5 w-full animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-navy-900 border-2 border-gold-500 text-gold-500 flex items-center justify-center text-3xl font-mono font-bold shadow-soft">
              #{contestant.seat_no}
            </div>

            <div>
              <h1 className="font-display text-3xl sm:text-5xl font-bold text-navy-900">
                Welcome, {contestant.name}
              </h1>
              <p className="text-base text-ink-500 mt-2 max-w-md mx-auto">
                Your podium is connected. Please wait for the operator to present the next question.
              </p>
            </div>

            <Card className="bg-white border-navy-700/15 p-6 w-full max-w-md shadow-soft mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">Event:</span>
                <span className="font-semibold text-navy-900">{event?.name || 'Bible Giants'}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-navy-700/10">
                <span className="text-ink-500">Podium Status:</span>
                <span className="font-semibold text-success flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  Ready to compete
                </span>
              </div>
            </Card>
          </div>
        )}

        {/* 2. SHOWN / OPEN / LOCKED / REVEALED QUESTION STATES */}
        {qStatus !== 'hidden' && currentQuestion && (
          <div className="w-full flex flex-col gap-6 animate-fade-in">
            {/* Round info chip & Individual indicator */}
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-navy-700/15 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest font-bold text-navy-950 bg-gold-500 px-3 py-1 rounded-chip">
                  {currentRound?.title || 'Round'}
                </span>
                {currentRound?.type === 'speed' && (
                  <span className="text-xs text-ink-500 font-semibold">
                    Speed Round • {currentRound.max_points} max pts
                  </span>
                )}
              </div>

              {isAssignedToOther ? (
                <span className="text-xs font-bold text-navy-900 bg-cream-100 border border-navy-700/20 px-3 py-1 rounded-chip">
                  👤 {assignedContestantName} is answering
                </span>
              ) : currentQuestion.assigned_contestant_id === contestant.id ? (
                <span className="text-xs font-bold text-navy-950 bg-gold-300 px-3 py-1 rounded-chip">
                  ⭐ Your Assigned Question
                </span>
              ) : null}
            </div>

            {/* Question Text */}
            <div>
              <h2 className="font-display text-2xl sm:text-4xl font-bold text-navy-900 leading-snug">
                {currentQuestion.body}
              </h2>
              {currentQuestion.scripture_ref && (
                <p className="text-sm font-semibold text-gold-500 mt-1">
                  📖 {currentQuestion.scripture_ref}
                </p>
              )}
            </div>

            {/* Countdown Bar (when Open) */}
            {qStatus === 'open' && !isAssignedToOther && (
              <Countdown
                closesAt={gameState?.closes_at || null}
                totalSeconds={currentRound?.time_limit_sec || 20}
                getServerNow={getServerNow}
                variant="bar"
              />
            )}

            {/* Feedback / Error banner */}
            {submitError && (
              <div className="p-3 bg-danger/10 border border-danger/30 rounded-btn text-danger text-sm font-semibold text-center">
                {submitError}
              </div>
            )}

            {/* Answer Options */}
            {currentQuestion.answer_mode === 'choice' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-2">
                {currentQuestion.options.map((opt) => {
                  let cardState: 'default' | 'selected' | 'disabled' | 'correct' | 'wrong' | 'dimmed' = 'default';

                  if (qStatus === 'shown' || isAssignedToOther) {
                    cardState = 'disabled';
                  } else if (qStatus === 'open') {
                    if (myAnswer) {
                      cardState = selectedChoice === opt.key ? 'selected' : 'disabled';
                    } else if (isSubmitting) {
                      cardState = selectedChoice === opt.key ? 'selected' : 'disabled';
                    } else {
                      cardState = 'default';
                    }
                  } else if (qStatus === 'locked') {
                    cardState = selectedChoice === opt.key ? 'selected' : 'disabled';
                  } else if (qStatus === 'revealed') {
                    const isCorrect = questionKey?.correct_key === opt.key;
                    const wasChosen = selectedChoice === opt.key;

                    if (isCorrect) {
                      cardState = 'correct';
                    } else if (wasChosen && !isCorrect) {
                      cardState = 'wrong';
                    } else {
                      cardState = 'dimmed';
                    }
                  }

                  return (
                    <OptionCard
                      key={opt.key}
                      optionKey={opt.key}
                      text={opt.text}
                      state={cardState}
                      onClick={() => handleSelectAnswer(opt.key)}
                      disabled={qStatus !== 'open' || !!myAnswer || isSubmitting || !!isAssignedToOther}
                    />
                  );
                })}
              </div>
            )}

            {/* Answer Received confirmation banner */}
            {myAnswer && qStatus === 'open' && (
              <div className="p-4 bg-success/15 border border-success/30 rounded-btn text-center text-success font-bold text-base flex items-center justify-center gap-2">
                <span>✓ Answer received! Choice: Option {selectedChoice}</span>
              </div>
            )}

            {qStatus === 'shown' && (
              <p className="text-center font-display text-xl text-gold-500 font-semibold animate-pulse">
                Get ready to answer…
              </p>
            )}

            {qStatus === 'locked' && !myAnswer && !isAssignedToOther && (
              <div className="p-4 bg-danger/10 border border-danger/20 rounded-btn text-center text-danger font-semibold">
                Time is up! No answer recorded.
              </div>
            )}

            {/* REVEALED RESULTS CARD */}
            {qStatus === 'revealed' && (
              <Card className="bg-white border-2 border-gold-500/40 p-6 flex flex-col gap-4 shadow-soft">
                <div className="flex items-center justify-between border-b border-navy-700/10 pb-3">
                  <span className="font-display text-2xl font-bold text-navy-900">
                    Question Results
                  </span>
                  {myAnswer ? (
                    <span
                      className={`text-sm font-bold px-3 py-1 rounded-chip ${
                        myAnswer.is_correct
                          ? 'bg-success text-white'
                          : 'bg-danger text-white'
                      }`}
                    >
                      {myAnswer.is_correct ? '✓ Correct' : '✗ Wrong'} ({myAnswer.points >= 0 ? `+${myAnswer.points}` : myAnswer.points} pts)
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-ink-500 bg-cream-100 px-3 py-1 rounded-chip">
                      No Answer (0 pts)
                    </span>
                  )}
                </div>

                {myAnswer?.elapsed_ms && (
                  <p className="text-xs text-ink-500">
                    Response time:{' '}
                    <strong className="text-navy-900 font-mono">
                      {(myAnswer.elapsed_ms / 1000).toFixed(2)} seconds
                    </strong>
                  </p>
                )}

                {questionKey?.explanation && (
                  <p className="text-sm text-ink-900 bg-cream-50 p-3 rounded-btn border border-navy-700/10">
                    <strong>Explanation:</strong> {questionKey.explanation}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 text-sm font-semibold text-navy-900">
                  <span>Your Total Score: {contestantScore} pts</span>
                  <span>Rank: #{contestantRank}</span>
                </div>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 border-t border-navy-700/10 text-xs text-ink-500 font-medium">
        Bible Giants • Ondo & Ekiti Camp Meeting • Seat #{contestant.seat_no}
      </footer>
    </div>
  );
}
