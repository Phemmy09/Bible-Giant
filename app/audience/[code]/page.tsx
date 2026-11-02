'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Contestant,
  AudienceScore,
  ContestantScore,
  QuestionKey,
  Answer,
  OptionKey,
  RaffleDraw,
  RoundSummaryResult,
  AudienceBoardResult,
} from '@/lib/types';
import {
  rpcGetEventByCode,
  rpcSubmitPrediction,
  rpcSubmitAnswer,
  rpcGetRoundSummary,
  rpcGetAudienceBoard,
} from '@/lib/rpc';
import { useGameState } from '@/lib/realtime/useGameState';
import { useServerClock } from '@/lib/realtime/useServerClock';
import { ConnectionDot } from '@/components/ui/ConnectionDot';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Countdown } from '@/components/ui/Countdown';
import { OptionCard } from '@/components/ui/OptionCard';
import { AudiencePredictions } from '@/components/audience/AudiencePredictions';
import { computeLeaderboard } from '@/lib/scoring';

export default function AudienceViewPage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = (params.code as string) || '';
  const code = rawCode.toUpperCase();

  const supabase = useMemo(() => createClient(), []);

  const [eventId, setEventId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [audienceId, setAudienceId] = useState<string | null>(null);
  const [audienceScore, setAudienceScore] = useState<number>(0);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [currentPrediction, setCurrentPrediction] = useState<string | null>(null);
  const [audienceCount, setAudienceCount] = useState<number>(1);
  const [initError, setInitError] = useState<string | null>(null);

  // Live question answering state
  const [myAnswer, setMyAnswer] = useState<Answer | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<OptionKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [questionKey, setQuestionKey] = useState<QuestionKey | null>(null);

  // Scores & Leaderboards
  const [topAudienceScores, setTopAudienceScores] = useState<AudienceScore[]>([]);
  const [allAudienceScores, setAllAudienceScores] = useState<AudienceScore[]>([]);
  const [contestantScores, setContestantScores] = useState<ContestantScore[]>([]);
  const [latestRaffle, setLatestRaffle] = useState<RaffleDraw | null>(null);
  const [roundSummaryData, setRoundSummaryData] = useState<RoundSummaryResult | null>(null);
  const [audienceBoardData, setAudienceBoardData] = useState<AudienceBoardResult | null>(null);

  // Hook into realtime game state and clock
  const { gameState, event, currentQuestion, currentRound, connectionStatus } = useGameState(eventId);
  const { getServerNow } = useServerClock();

  // 1. Initial authentication & event resolution
  useEffect(() => {
    async function initAudience() {
      try {
        const localName = typeof window !== 'undefined' ? localStorage.getItem('bible_giants_audience_name') : null;
        const localPhone = typeof window !== 'undefined' ? localStorage.getItem('bible_giants_audience_phone') : null;
        const localRegion = typeof window !== 'undefined' ? localStorage.getItem('bible_giants_audience_region') : null;
        const localId = typeof window !== 'undefined' ? localStorage.getItem('bible_giants_audience_id') : null;

        if (!localName) {
          router.push('/audience');
          return;
        }

        const evRes = await rpcGetEventByCode(code, supabase);
        const evId = evRes.ok && evRes.data ? evRes.data.id : '11111111-1111-1111-1111-111111111111';
        setEventId(evId);

        const activeId = localId || `aud-${Date.now()}`;
        setAudienceId(activeId);
        setDisplayName(localRegion && localRegion !== 'General' ? `${localName} (${localRegion})` : localName);

        // Fetch contestants
        const { data: cData } = await supabase
          .from('contestants')
          .select('*')
          .eq('event_id', evId)
          .order('seat_no', { ascending: true });

        if (cData && cData.length > 0) {
          setContestants(cData as Contestant[]);
        } else {
          const { DEFAULT_CONTESTANTS } = await import('@/lib/defaultEvent');
          setContestants(DEFAULT_CONTESTANTS);
        }

        // Fetch count of audience
        try {
          const { count } = await supabase
            .from('audience_members')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', evId);
          if (count !== null && count > 0) setAudienceCount(count);
        } catch {
          // Ignore
        }
      } catch (err: unknown) {
        console.warn('Audience init warning:', err);
      }
    }

    initAudience();
  }, [code, router, supabase]);

  // Fetch all audience scores for ranking & leaderboard
  const refreshAudienceScores = useCallback(async () => {
    if (!eventId) return;

    try {
      const res = await fetch(`/api/audience/leaderboard?eventId=${eventId}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.all) && data.all.length > 0) {
        const formatted: AudienceScore[] = data.all.map((item: any) => ({
          audience_id: item.id || item.audience_id,
          event_id: eventId,
          display_name: item.name ? `${item.name} (${item.region || 'General'})` : (item.display_name || 'Audience Member'),
          total_points: item.total_points || 0,
          correct_count: item.correct_count || 0,
          answered_count: item.answered_count || 0,
          correct_ms: item.correct_ms || 0,
        }));
        setAllAudienceScores(formatted);
        setTopAudienceScores(formatted.slice(0, 10));
        return;
      }
    } catch {
      // Fallback to supabase client
    }

    const { data } = await supabase
      .from('audience_scores')
      .select('*')
      .eq('event_id', eventId)
      .order('total_points', { ascending: false })
      .order('correct_count', { ascending: false })
      .order('correct_ms', { ascending: true });

    if (data) {
      setAllAudienceScores(data as AudienceScore[]);
      setTopAudienceScores((data as AudienceScore[]).slice(0, 10));
    }
  }, [eventId, supabase]);

  // Fetch contestant scores
  const refreshContestantScores = useCallback(async () => {
    if (!eventId) return;
    const { data } = await supabase
      .from('contestant_scores')
      .select('*')
      .eq('event_id', eventId)
      .order('total_points', { ascending: false })
      .order('correct_count', { ascending: false })
      .order('correct_ms', { ascending: true });

    if (data) {
      setContestantScores(data as ContestantScore[]);
    }
  }, [eventId, supabase]);

  // Fetch latest raffle draw
  const refreshLatestRaffle = useCallback(async () => {
    if (!eventId) return;
    const { data } = await supabase
      .from('raffle_draws')
      .select('*')
      .eq('event_id', eventId)
      .order('drawn_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setLatestRaffle(data as RaffleDraw);
    }
  }, [eventId, supabase]);

  // Realtime updates for audience member count, scores, and raffle
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`audience_view:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audience_members', filter: `event_id=eq.${eventId}` },
        () => {
          supabase
            .from('audience_members')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId)
            .then(({ count }) => {
              if (count !== null) setAudienceCount(count);
            });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audience_scores', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const sc = payload.new as AudienceScore;
          if (sc && sc.audience_id === audienceId) {
            setAudienceScore(sc.total_points || 0);
          }
          refreshAudienceScores();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contestant_scores', filter: `event_id=eq.${eventId}` },
        () => {
          refreshContestantScores();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'raffle_draws', filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.new) {
            setLatestRaffle(payload.new as RaffleDraw);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, audienceId, supabase, refreshAudienceScores, refreshContestantScores]);

  // Fetch my answer for the current question
  const fetchMyAnswer = useCallback(async () => {
    if (!currentQuestion?.id || !audienceId) {
      setMyAnswer(null);
      setSelectedChoice(null);
      return;
    }

    const { data: ansData } = await supabase
      .from('answers')
      .select('*')
      .eq('question_id', currentQuestion.id)
      .eq('audience_id', audienceId)
      .single();

    if (ansData) {
      setMyAnswer(ansData as Answer);
      setSelectedChoice(ansData.choice_key as OptionKey);
    } else {
      setMyAnswer(null);
      setSelectedChoice(null);
    }
  }, [currentQuestion?.id, audienceId, supabase]);

  useEffect(() => {
    fetchMyAnswer();
  }, [fetchMyAnswer]);

  // Question reveal handling
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
      refreshAudienceScores();
    } else {
      setQuestionKey(null);
    }
  }, [currentQuestion?.id, gameState?.question_status, fetchMyAnswer, refreshAudienceScores, supabase]);

  // Screen change handling
  useEffect(() => {
    if (gameState?.screen === 'leaderboard') {
      refreshContestantScores();
      refreshAudienceScores();
    } else if (gameState?.screen === 'raffle') {
      refreshLatestRaffle();
    } else if (gameState?.screen === 'winner') {
      refreshContestantScores();
    } else if (gameState?.screen === 'round_summary') {
      refreshContestantScores();
      refreshAudienceScores();
      const summaryRoundId = gameState.summary_round_id || currentRound?.id;
      if (summaryRoundId && eventId) {
        rpcGetRoundSummary(eventId, summaryRoundId, supabase).then((res) => {
          if (res.ok) setRoundSummaryData(res.data);
        });
      }
    } else if (gameState?.screen === 'audience_board') {
      refreshAudienceScores();
      if (eventId) {
        rpcGetAudienceBoard(eventId, supabase).then((res) => {
          if (res.ok) setAudienceBoardData(res.data);
        });
      }
    }
  }, [gameState?.screen, gameState?.summary_round_id, currentRound?.id, eventId, refreshContestantScores, refreshAudienceScores, refreshLatestRaffle, supabase]);

  // Prediction saving
  const handleSavePrediction = useCallback(
    async (contestantId: string) => {
      const res = await rpcSubmitPrediction(contestantId, supabase);
      if (res.ok) {
        setCurrentPrediction(contestantId);
        return true;
      }
      return false;
    },
    [supabase]
  );

  // Live answer submission
  const handleSelectAnswer = useCallback(
    async (choice: OptionKey) => {
      if (!currentQuestion?.id || isSubmitting || myAnswer) return;
      if (gameState?.question_status !== 'open') return;
      if (currentRound?.audience_can_answer === false) return;

      setSelectedChoice(choice);
      setIsSubmitting(true);
      setSubmitError(null);

      let apiPoints = 0;
      let apiCorrect: boolean | null = null;
      const elapsed = gameState?.closes_at
        ? Math.max(100, Math.min(30000, 30000 - Math.max(0, new Date(gameState.closes_at).getTime() - Date.now())))
        : 1500;

      try {
        const apiRes = await fetch('/api/audience/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audience_id: audienceId,
            event_id: eventId,
            question_id: currentQuestion.id,
            choice_key: choice,
            elapsed_ms: elapsed,
          }),
        });

        const apiData = await apiRes.json();
        if (apiData.ok) {
          apiCorrect = !!apiData.is_correct;
          apiPoints = apiData.points || 0;
          if (typeof apiData.total_points === 'number') {
            setAudienceScore(apiData.total_points);
          }
        }
      } catch (err) {
        console.warn('API answer recording error:', err);
      }

      // Also call Supabase RPC if session exists
      rpcSubmitAnswer(currentQuestion.id, choice, supabase).catch(() => {});

      setIsSubmitting(false);

      setMyAnswer({
        id: `ans-${Date.now()}`,
        event_id: eventId || '',
        question_id: currentQuestion.id,
        contestant_id: null,
        audience_id: audienceId,
        choice_key: choice,
        submitted_at: new Date().toISOString(),
        elapsed_ms: elapsed,
        is_correct: apiCorrect,
        points: apiPoints,
      });
    },
    [
      currentQuestion?.id,
      isSubmitting,
      myAnswer,
      gameState?.question_status,
      gameState?.closes_at,
      currentRound?.audience_can_answer,
      supabase,
      eventId,
      audienceId,
    ]
  );

  // Helper: compute audience rank string (e.g. "=2")
  const audienceRank = useMemo(() => {
    if (!audienceId || allAudienceScores.length === 0) return null;
    const sorted = [...allAudienceScores].sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      if (b.correct_count !== a.correct_count) return b.correct_count - a.correct_count;
      return a.correct_ms - b.correct_ms;
    });

    const targetIdx = sorted.findIndex((s) => s.audience_id === audienceId);
    if (targetIdx === -1) return null;

    const target = sorted[targetIdx];
    const hasTie = sorted.some(
      (s, idx) =>
        idx !== targetIdx &&
        s.total_points === target.total_points &&
        s.correct_count === target.correct_count &&
        s.correct_ms === target.correct_ms
    );

    const firstWithSame = sorted.findIndex(
      (s) =>
        s.total_points === target.total_points &&
        s.correct_count === target.correct_count &&
        s.correct_ms === target.correct_ms
    );
    const num = firstWithSame + 1;
    return hasTie ? `=${num}` : `${num}`;
  }, [audienceId, allAudienceScores]);

  // Ranked contestants for leaderboard with tie-breaks
  const rankedContestants = useMemo(() => {
    const merged = contestants.map((c) => {
      const sc = contestantScores.find((s) => s.contestant_id === c.id);
      return {
        id: c.id,
        seat_no: c.seat_no,
        name: c.name,
        group_label: c.group_label,
        total_points: sc?.total_points || 0,
        correct_count: sc?.correct_count || 0,
        correct_ms: sc?.correct_ms || 0,
      };
    });
    return computeLeaderboard(merged);
  }, [contestants, contestantScores]);

  if (initError) {
    return (
      <main className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center bg-white p-8">
          <p className="text-danger font-semibold mb-4">{initError}</p>
          <Link href="/audience">
            <Button variant="primary">← Back to Join Page</Button>
          </Link>
        </Card>
      </main>
    );
  }

  const status = event?.status || 'setup';
  const screen = gameState?.screen || 'lobby';
  const qStatus = gameState?.question_status || 'hidden';
  const isLive = status === 'live';

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col justify-between">
      {/* Header: Name, Connection Dot, Audience Points */}
      <header className="w-full bg-white border-b border-navy-700/10 px-4 py-3 sm:px-6 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <span className="font-bold text-navy-900 text-sm sm:text-base">
            {displayName || 'Audience'}
          </span>
          <ConnectionDot status={connectionStatus} />
        </div>

        <div className="flex items-center gap-2">
          {audienceRank && (
            <span className="text-xs font-bold text-ink-500 bg-cream-100 px-2.5 py-1 rounded-chip border border-navy-700/10">
              Rank {audienceRank}
            </span>
          )}
          <div className="flex items-center gap-1.5 bg-cream-100 border border-gold-500/30 px-3 py-1 rounded-chip">
            <span className="text-xs uppercase tracking-wider text-ink-500 font-semibold">
              Pts:
            </span>
            <span className="font-display font-bold text-navy-900 text-base tabular-nums">
              {audienceScore}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content View (Switches by event.status + game_state.screen) */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-6 flex flex-col justify-center">
        {/* 1. LOBBY VIEW (setup status or lobby screen before live) */}
        {status === 'setup' || (!isLive && status !== 'finished' && screen === 'lobby') ? (
          <div className="text-center flex flex-col items-center gap-4 py-8 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-gold-500/20 text-navy-900 flex items-center justify-center text-2xl font-display font-bold">
              ✓
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy-900">
                You&apos;re in, {displayName}!
              </h1>
              <p className="text-sm text-ink-500 mt-2 max-w-xs mx-auto">
                The competition will begin soon. Please watch the main projector screen.
              </p>
            </div>

            <div className="bg-white border border-navy-700/10 rounded-card p-5 w-full mt-4 shadow-soft">
              <p className="text-xs uppercase font-semibold text-ink-500 tracking-wider">
                Audience Joined
              </p>
              <p className="font-display text-4xl font-extrabold text-navy-900 mt-1">
                {audienceCount}
              </p>
              <p className="text-xs text-ink-500 mt-1">
                Members connected live with code <strong className="font-mono text-navy-900">{code}</strong>
              </p>
            </div>
          </div>
        ) : status === 'predictions_open' || status === 'predictions_locked' || (screen === 'predictions' && !isLive) ? (
          /* 2. PREDICTIONS VIEW */
          <AudiencePredictions
            contestants={contestants}
            currentContestantId={currentPrediction}
            isLocked={status === 'predictions_locked'}
            onSavePrediction={handleSavePrediction}
          />
        ) : screen === 'blank' ? (
          /* 3. BLANK / PAUSED SCREEN */
          <div className="text-center flex flex-col items-center gap-4 py-16 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-navy-700/10 flex items-center justify-center text-navy-900 font-bold">
              ⏸
            </div>
            <h2 className="font-display text-2xl font-bold text-navy-900">
              Stage Intermission
            </h2>
            <p className="text-sm text-ink-500 max-w-xs">
              Please watch the stage. The program will resume momentarily.
            </p>
          </div>
        ) : screen === 'winner' ? (
          /* 4. WINNER SCREEN */
          <div className="text-center flex flex-col items-center gap-5 py-8 animate-fade-in">
            <span className="text-5xl">👑</span>
            <div>
              <span className="text-xs uppercase tracking-widest font-bold text-gold-500">
                Bible Giants Champion
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-900 mt-1">
                {contestantScores[0]
                  ? contestants.find((c) => c.id === contestantScores[0].contestant_id)?.name || 'Champion'
                  : 'Competition Champion'}
              </h2>
            </div>
            {contestantScores[0] && (
              <Card className="p-4 bg-cream-100 border-gold-500/40 w-full max-w-xs text-center">
                <p className="text-xs uppercase font-semibold text-ink-500">Winning Score</p>
                <p className="font-display text-3xl font-extrabold text-navy-900 mt-1">
                  {contestantScores[0].total_points} pts
                </p>
              </Card>
            )}
            <p className="text-xs text-ink-500 mt-2">
              To God be the glory! Thank you for participating.
            </p>
          </div>
        ) : screen === 'raffle' ? (
          /* 5. RAFFLE SCREEN */
          <div className="text-center flex flex-col items-center gap-5 py-8 animate-fade-in">
            <span className="text-5xl">🎟️</span>
            <div>
              <span className="text-xs uppercase tracking-widest font-bold text-gold-500">
                Raffle Draw Result
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-900 mt-1">
                Congratulations!
              </h2>
            </div>
            {latestRaffle ? (
              <Card className="p-6 bg-white border-gold-500/40 w-full max-w-sm text-center shadow-soft">
                <p className="text-xs uppercase font-semibold text-ink-500">Winner</p>
                <p className="font-display text-2xl font-bold text-navy-900 mt-1">
                  {latestRaffle.winner_name}
                </p>
                <span className="inline-block mt-3 px-3 py-1 bg-cream-100 rounded-chip text-xs font-semibold text-ink-500">
                  {latestRaffle.pool_kind === 'correct_predictors'
                    ? 'Correct Predictors Pool'
                    : 'All Audience Pool'}{' '}
                  • {latestRaffle.pool_size} entries
                </span>
              </Card>
            ) : (
              <p className="text-sm text-ink-500">Awaiting raffle draw on the main stage...</p>
            )}
          </div>
        ) : screen === 'leaderboard' ? (
          /* 6. LEADERBOARD SCREEN */
          <div className="flex flex-col gap-6 animate-fade-in py-4">
            <div className="text-center">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
                Leaderboards
              </h2>
              <p className="text-xs text-ink-500 mt-1">
                Current standings for contestants and audience
              </p>
            </div>

            {/* Contestant Leaderboard */}
            <Card className="p-4 bg-white border-navy-700/10">
              <h3 className="font-bold text-navy-900 text-sm mb-3 uppercase tracking-wider">
                Contestants
              </h3>
              <div className="flex flex-col gap-2">
                {rankedContestants.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2.5 rounded-card bg-cream-50 border border-navy-700/5 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 font-mono font-bold text-xs text-ink-500">
                        #{entry.rankDisplay}
                      </span>
                      <div>
                        <p className="font-bold text-navy-900">
                          Seat #{entry.seat_no}: {entry.name}
                        </p>
                        {entry.group_label && (
                          <p className="text-xs text-ink-500">{entry.group_label}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-display font-extrabold text-navy-900 tabular-nums">
                      {entry.total_points} pts
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Audience Top 5 Awards Standings */}
            <Card className="p-4 bg-white border-gold-500/30">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-navy-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <span>🏆 Top 5 Audience Leaders</span>
                  <span className="text-[10px] bg-gold-500/20 text-navy-900 px-2 py-0.5 rounded font-bold">Awards</span>
                </h3>
                {audienceRank && (
                  <span className="text-xs font-semibold text-gold-500">
                    Your Rank: {audienceRank}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-500 mb-3">
                The top 5 participants with the highest correct scores will be awarded at the end of the competition!
              </p>
              <div className="flex flex-col gap-2">
                {topAudienceScores.map((as, idx) => {
                  const isMe = as.audience_id === audienceId;
                  return (
                    <div
                      key={as.audience_id}
                      className={`flex items-center justify-between p-2.5 rounded-card text-sm border ${
                        isMe
                          ? 'bg-gold-500/15 border-gold-500 font-bold'
                          : 'bg-cream-50 border-navy-700/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 font-mono font-bold text-xs text-ink-500">
                          #{idx + 1}
                        </span>
                        <span className="text-navy-900">
                          {as.display_name} {isMe && '(You)'}
                        </span>
                      </div>
                      <span className="font-display font-extrabold text-navy-900 tabular-nums">
                        {as.total_points} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        ) : screen === 'round_summary' ? (
          /* ROUND SUMMARY VIEW (§8.3) */
          <div className="flex flex-col gap-6 animate-fade-in py-4">
            <div className="text-center">
              <span className="text-xs uppercase tracking-widest font-bold text-gold-500">
                Round Results
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy-900 mt-1">
                {roundSummaryData?.round_title || currentRound?.title || 'Round'} — Standings
              </h2>
              {/* Audience personal rank line (§8.3): "You are #R of N audience members — NN points" */}
              <div className="mt-3 p-3 rounded-card bg-gold-500/15 border border-gold-500/40 text-center">
                <p className="font-bold text-navy-900 text-sm">
                  {roundSummaryData?.my_audience?.rank
                    ? `You are #${roundSummaryData.my_audience.rank} of ${allAudienceScores.length || audienceCount} audience members — ${roundSummaryData.my_audience.total_points} points`
                    : audienceRank
                    ? `You are ${audienceRank} of ${allAudienceScores.length || audienceCount} audience members — ${audienceScore} points`
                    : `You have ${audienceScore} points`}
                </p>
              </div>
            </div>

            {/* Contestant Standings for the round */}
            <Card className="p-4 bg-white border-navy-700/10">
              <h3 className="font-bold text-navy-900 text-sm mb-3 uppercase tracking-wider">
                Contestant Standings
              </h3>
              <div className="flex flex-col gap-2">
                {(roundSummaryData?.contestants && roundSummaryData.contestants.length > 0
                  ? roundSummaryData.contestants
                  : rankedContestants.map((entry, idx) => ({
                      contestant_id: entry.id,
                      name: entry.name,
                      group_label: entry.group_label,
                      round_points: 0,
                      total_points: entry.total_points,
                      correct_in_round: 0,
                      rank: idx + 1,
                    }))
                ).map((entry) => (
                  <div
                    key={entry.contestant_id}
                    className="flex items-center justify-between p-2.5 rounded-card bg-cream-50 border border-navy-700/5 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 font-mono font-bold text-xs text-ink-500">
                        #{entry.rank}
                      </span>
                      <div>
                        <p className="font-bold text-navy-900">{entry.name}</p>
                        {entry.group_label && (
                          <p className="text-xs text-ink-500">{entry.group_label}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs text-gold-600 font-bold block">
                        +{entry.round_points}
                      </span>
                      <span className="font-display font-extrabold text-navy-900 tabular-nums">
                        {entry.total_points} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Audience Top 5 */}
            <Card className="p-4 bg-white border-gold-500/30">
              <h3 className="font-bold text-navy-900 text-sm mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <span>🏆 Audience Top 5</span>
              </h3>
              {currentRound?.audience_can_answer === false || (roundSummaryData && roundSummaryData.audience_top5.length === 0) ? (
                <p className="text-xs text-ink-500 italic text-center py-3">
                  This round was for contestants only
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {(roundSummaryData?.audience_top5 || []).map((aud, idx) => {
                    const isMe = aud.name === displayName;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2.5 rounded-card text-sm border ${
                          isMe ? 'bg-gold-500/15 border-gold-500 font-bold' : 'bg-cream-50 border-navy-700/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 font-mono font-bold text-xs text-ink-500">
                            #{aud.rank}
                          </span>
                          <div>
                            <span className="text-navy-900 font-semibold">{aud.name}</span>
                            <span className="block text-[10px] text-ink-500">{aud.assembly}</span>
                          </div>
                        </div>
                        <span className="font-display font-extrabold text-navy-900">
                          {aud.total_points} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        ) : screen === 'audience_board' ? (
          /* AUDIENCE BOARD VIEW (§8.4) */
          <div className="flex flex-col gap-6 animate-fade-in py-4">
            <div className="text-center">
              <span className="text-xs uppercase tracking-widest font-bold text-gold-500">
                Audience Awards
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy-900 mt-1">
                Top 5 Audience Champions
              </h2>
              {audienceRank && (
                <div className="mt-3 p-3 rounded-card bg-gold-500/15 border border-gold-500/40 text-center">
                  <p className="font-bold text-navy-900 text-sm">
                    Your Overall Rank: {audienceRank} • {audienceScore} points
                  </p>
                </div>
              )}
            </div>

            <Card className="p-4 bg-white border-gold-500/30">
              <div className="flex flex-col gap-2">
                {((audienceBoardData?.audience_top5 && audienceBoardData.audience_top5.length > 0)
                  ? audienceBoardData.audience_top5
                  : topAudienceScores.slice(0, 5).map((as, i) => ({
                      rank: i + 1,
                      name: as.display_name,
                      assembly: 'Camp Meeting',
                      total_points: as.total_points,
                    }))
                ).map((aud) => (
                  <div
                    key={aud.rank}
                    className="flex items-center justify-between p-3 rounded-card bg-cream-50 border border-navy-700/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-gold-500 text-navy-950 font-bold font-mono text-sm flex items-center justify-center">
                        #{aud.rank}
                      </span>
                      <div>
                        <p className="font-bold text-navy-900 text-sm">{aud.name}</p>
                        <p className="text-xs text-ink-500">{aud.assembly}</p>
                      </div>
                    </div>
                    <span className="font-display font-extrabold text-navy-900 text-base">
                      {aud.total_points} pts
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          /* 7. LIVE QUESTION VIEW (screen = question or live default) */
          <div className="w-full flex flex-col gap-5 animate-fade-in">
            {/* Hidden / Waiting for operator */}
            {qStatus === 'hidden' || !currentQuestion ? (
              <div className="text-center flex flex-col items-center gap-3 py-14">
                <div className="w-12 h-12 rounded-full bg-cream-100 border border-gold-500/30 flex items-center justify-center text-gold-500 font-bold">
                  📖
                </div>
                <h2 className="font-display text-2xl font-bold text-navy-900">
                  Get ready!
                </h2>
                <p className="text-sm text-ink-500 max-w-xs">
                  The operator is preparing the next question. Watch the main screen.
                </p>
              </div>
            ) : (
              <>
                {/* Round banner & Audience can answer chip */}
                <div className="flex items-center justify-between border-b border-navy-700/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest font-bold text-navy-950 bg-gold-500 px-2.5 py-0.5 rounded-chip">
                      {currentRound?.title || 'Round'}
                    </span>
                    {currentRound?.audience_can_answer === false && (
                      <span className="text-xs text-ink-500 font-medium">
                        Contestants Only
                      </span>
                    )}
                  </div>

                  {qStatus === 'shown' && (
                    <span className="text-xs font-bold text-gold-500 animate-pulse">
                      Get ready…
                    </span>
                  )}
                  {qStatus === 'locked' && (
                    <span className="text-xs font-bold text-danger">
                      Time is up
                    </span>
                  )}
                </div>

                {/* Countdown Ring (when open & audience can answer) */}
                {qStatus === 'open' && currentRound?.audience_can_answer !== false && (
                  <div className="flex justify-center my-2">
                    <Countdown
                      closesAt={gameState?.closes_at || null}
                      totalSeconds={currentRound?.time_limit_sec || 20}
                      getServerNow={getServerNow}
                      variant="ring"
                    />
                  </div>
                )}

                {/* Question Body */}
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-navy-900 leading-snug">
                    {currentQuestion.body}
                  </h2>
                  {currentQuestion.scripture_ref && (
                    <p className="text-xs sm:text-sm font-semibold text-gold-500 mt-1">
                      📖 {currentQuestion.scripture_ref}
                    </p>
                  )}
                </div>

                {/* Watch and pray along notice when audience cannot answer */}
                {currentRound?.audience_can_answer === false && (
                  <Card className="p-4 bg-cream-100 border-navy-700/10 text-center">
                    <p className="font-semibold text-navy-900 text-sm">
                      Watch and pray along!
                    </p>
                    <p className="text-xs text-ink-500 mt-1">
                      This is an individual contestant round. Live audience voting is paused.
                    </p>
                  </Card>
                )}

                {/* Answer received confirmation */}
                {myAnswer && qStatus === 'open' && (
                  <div className="p-3 bg-success/10 border border-success/30 rounded-btn text-success text-xs sm:text-sm font-bold text-center animate-fade-in">
                    ✓ Answer received! Good luck!
                  </div>
                )}

                {/* Error Banner */}
                {submitError && (
                  <div className="p-3 bg-danger/10 border border-danger/30 rounded-btn text-danger text-xs sm:text-sm font-semibold text-center">
                    {submitError}
                  </div>
                )}

                {/* Revealed Result Banner */}
                {qStatus === 'revealed' && (
                  <Card
                    className={`p-4 text-center border ${
                      myAnswer?.is_correct
                        ? 'bg-success/15 border-success text-success'
                        : myAnswer
                        ? 'bg-danger/10 border-danger text-danger'
                        : 'bg-cream-100 border-navy-700/10 text-ink-500'
                    }`}
                  >
                    <p className="font-display text-xl font-bold">
                      {myAnswer?.is_correct
                        ? `🎉 You were right! +${myAnswer.points || 10} points`
                        : myAnswer
                        ? 'Not this time'
                        : 'No answer submitted'}
                    </p>
                    {questionKey?.explanation && (
                      <p className="text-xs text-navy-900 mt-2 font-normal leading-relaxed text-left bg-white/70 p-2.5 rounded-card">
                        <strong className="font-semibold">Explanation:</strong>{' '}
                        {questionKey.explanation}
                      </p>
                    )}
                  </Card>
                )}

                {/* Answer Options */}
                {currentQuestion.answer_mode === 'choice' && (
                  <div className="flex flex-col gap-3 my-1">
                    {currentQuestion.options.map((opt) => {
                      let cardState: 'default' | 'selected' | 'disabled' | 'correct' | 'wrong' | 'dimmed' = 'default';

                      if (qStatus === 'shown' || currentRound?.audience_can_answer === false) {
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
                          disabled={
                            qStatus !== 'open' ||
                            !!myAnswer ||
                            isSubmitting ||
                            currentRound?.audience_can_answer === false
                          }
                        />
                      );
                    })}
                  </div>
                )}

                {/* Revealed: Mini audience leaderboard */}
                {qStatus === 'revealed' && topAudienceScores.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-navy-700/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase tracking-wider font-bold text-ink-500">
                        Audience Standings
                      </span>
                      {audienceRank && (
                        <span className="text-xs font-bold text-navy-900">
                          Your Rank: {audienceRank} ({audienceScore} pts)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {topAudienceScores.slice(0, 6).map((as, idx) => (
                        <div
                          key={as.audience_id}
                          className={`flex items-center justify-between px-3 py-1.5 rounded-card text-xs border ${
                            as.audience_id === audienceId
                              ? 'bg-gold-500/20 border-gold-500 font-bold'
                              : 'bg-white border-navy-700/10'
                          }`}
                        >
                          <span className="truncate max-w-[120px]">
                            #{idx + 1} {as.display_name}
                          </span>
                          <span className="font-mono font-bold text-navy-900">
                            {as.total_points}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-3 border-t border-navy-700/10 text-xs text-ink-500">
        Bible Giants • Ondo & Ekiti Camp Meeting
      </footer>
    </div>
  );
}
