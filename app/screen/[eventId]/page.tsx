'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Event,
  Question,
  QuestionKey,
  Contestant,
  Answer,
  ContestantScore,
  AudienceScore,
  Prediction,
  ScreenMode,
  RaffleDraw,
} from '@/lib/types';
import { useGameState } from '@/lib/realtime/useGameState';
import { useServerClock } from '@/lib/realtime/useServerClock';
import { Countdown } from '@/components/ui/Countdown';
import { computeLeaderboard } from '@/lib/scoring';
import { usePresenceClient } from '@/lib/realtime/usePresenceSync';

export default function ProjectorDisplayPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const supabase = useMemo(() => createClient(), []);

  const { gameState, event, currentQuestion, currentRound, connectionStatus } = useGameState(eventId);
  const { getServerNow } = useServerClock();

  // Presence reporting (§9.4)
  usePresenceClient({
    eventId,
    role: 'projector',
    id: 'projector',
    name: 'Projector Screen',
    version: gameState?.version || 0,
  });

  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [questionKey, setQuestionKey] = useState<QuestionKey | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [scores, setScores] = useState<ContestantScore[]>([]);
  const [audienceScores, setAudienceScores] = useState<AudienceScore[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [latestRaffle, setLatestRaffle] = useState<RaffleDraw | null>(null);
  const [audienceCount, setAudienceCount] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch static & auxiliary event data
  useEffect(() => {
    async function fetchAuxData() {
      const [cRes, audCountRes] = await Promise.all([
        supabase.from('contestants').select('*').eq('event_id', eventId).order('seat_no', { ascending: true }),
        supabase.from('audience_members').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
      ]);
      if (cRes.data) setContestants(cRes.data as Contestant[]);
      if (audCountRes.count !== null) setAudienceCount(audCountRes.count);
    }
    fetchAuxData();
  }, [eventId, supabase]);

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
    } else {
      setQuestionKey(null);
    }
  }, [currentQuestion?.id, gameState?.question_status, supabase]);

  // Fetch answers & scores on reveal or question update
  useEffect(() => {
    if (currentQuestion?.id) {
      supabase
        .from('answers')
        .select('*')
        .eq('question_id', currentQuestion.id)
        .then(({ data }) => {
          if (data) setAnswers(data as Answer[]);
        });
    }

    supabase
      .from('contestant_scores')
      .select('*')
      .eq('event_id', eventId)
      .order('total_points', { ascending: false })
      .order('correct_count', { ascending: false })
      .order('correct_ms', { ascending: true })
      .then(({ data }) => {
        if (data) setScores(data as ContestantScore[]);
      });

    supabase
      .from('predictions')
      .select('*')
      .eq('event_id', eventId)
      .then(({ data }) => {
        if (data) setPredictions(data as Prediction[]);
      });
  }, [currentQuestion?.id, gameState?.question_status, eventId, supabase]);

  // Screen specific data fetching
  useEffect(() => {
    if (gameState?.screen === 'leaderboard') {
      supabase
        .from('audience_scores')
        .select('*')
        .eq('event_id', eventId)
        .order('total_points', { ascending: false })
        .order('correct_count', { ascending: false })
        .order('correct_ms', { ascending: true })
        .limit(10)
        .then(({ data }) => {
          if (data) setAudienceScores(data as AudienceScore[]);
        });
    } else if (gameState?.screen === 'raffle') {
      supabase
        .from('raffle_draws')
        .select('*')
        .eq('event_id', eventId)
        .order('drawn_at', { ascending: false })
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data) setLatestRaffle(data as RaffleDraw);
        });
    }
  }, [gameState?.screen, eventId, supabase]);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }

  const screen: ScreenMode = gameState?.screen || 'lobby';
  const qStatus = gameState?.question_status || 'hidden';

  const assignedContestant = useMemo(() => {
    if (!currentQuestion?.assigned_contestant_id) return null;
    return contestants.find((c) => c.id === currentQuestion.assigned_contestant_id) || null;
  }, [currentQuestion, contestants]);

  const contestantAnswersMap = useMemo(() => {
    const map = new Map<string, Answer>();
    answers.forEach((a) => {
      if (a.contestant_id) map.set(a.contestant_id, a);
    });
    return map;
  }, [answers]);

  // Ranked contestants with tie-breaks per docs/04-GAME-RULES-AND-SCORING.md §6
  const rankedContestants = useMemo(() => {
    const merged = contestants.map((c) => {
      const sc = scores.find((s) => s.contestant_id === c.id);
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
  }, [contestants, scores]);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-navy-950 text-cream-50 overflow-hidden flex flex-col justify-between p-8 sm:p-14 select-none transition-opacity duration-300">
      {/* Top Bar on Projector */}
      <header className="flex items-center justify-between border-b border-navy-700/60 pb-4">
        <div className="flex items-center gap-4">
          <span className="font-display text-3xl font-bold tracking-tight text-cream-50">
            Bible Giants
          </span>
          <span className="h-0.5 w-12 bg-gold-500 rounded-full" />
          <span className="text-gold-300 font-medium text-lg">
            {event?.name || 'Ondo & Ekiti Camp Meeting'}
          </span>
        </div>

        {connectionStatus !== 'connected' && (
          <span className="bg-danger/80 text-cream-50 px-3 py-1 rounded-chip text-xs font-semibold animate-pulse">
            Reconnecting…
          </span>
        )}
      </header>

      {/* Main Dynamic View Area */}
      <main className="flex-1 flex flex-col items-center justify-center my-auto w-full max-w-6xl mx-auto text-center">
        {/* 1. LOBBY MODE */}
        {screen === 'lobby' && (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
            <p className="text-xl sm:text-2xl uppercase tracking-widest text-gold-300 font-semibold">
              Live Bible Competition
            </p>
            <h1 className="font-display text-6xl sm:text-7xl font-bold text-cream-50">
              Welcome to the Grand Finale
            </h1>

            <div className="bg-navy-900 border border-gold-500/40 rounded-card p-8 sm:p-12 shadow-2xl flex flex-col items-center gap-4 mt-4">
              <span className="text-sm uppercase tracking-widest text-gold-300 font-bold">
                Audience & Contestants Join with Code
              </span>
              <span className="font-mono text-7xl sm:text-8xl font-black tracking-widest text-gold-500 select-all">
                {event?.join_code || '-----'}
              </span>
              <p className="text-cream-50/70 text-base mt-2">
                Open the app on your mobile browser or laptop to participate
              </p>
            </div>

            <div className="flex items-center gap-2 mt-4 text-cream-50/80 font-medium text-lg">
              <span className="w-3 h-3 rounded-full bg-success animate-ping" />
              <span>{audienceCount} Audience Members Connected</span>
            </div>
          </div>
        )}

        {/* 2. PREDICTIONS MODE */}
        {screen === 'predictions' && (
          <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
            <span className="text-lg uppercase tracking-widest text-gold-300 font-bold">
              Audience Predictions
            </span>
            <h2 className="font-display text-5xl font-bold text-cream-50">
              Who will be crowned Bible Giant?
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-5xl mt-4">
              {contestants.map((c) => {
                const count = predictions.filter((p) => p.contestant_id === c.id).length;
                const total = predictions.length || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div
                    key={c.id}
                    className="p-5 rounded-card bg-navy-900 border border-navy-700/80 flex flex-col items-center gap-2 text-center shadow-soft"
                  >
                    <span className="w-10 h-10 rounded-full bg-gold-500 text-navy-950 flex items-center justify-center font-mono font-bold text-base">
                      #{c.seat_no}
                    </span>
                    <p className="font-bold text-xl text-cream-50 truncate max-w-[150px]">
                      {c.name}
                    </p>
                    {c.group_label && (
                      <p className="text-xs text-gold-300 truncate max-w-[150px]">
                        {c.group_label}
                      </p>
                    )}
                    <div className="w-full bg-navy-950 h-2.5 rounded-full overflow-hidden mt-2">
                      <div
                        className="bg-gold-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs font-semibold text-cream-50/70">
                      {count} picks ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. QUESTION MODE */}
        {screen === 'question' && currentQuestion && (
          <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
            {/* Round info chip & Individual indicator */}
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-widest font-bold text-navy-950 bg-gold-500 px-3.5 py-1 rounded-chip">
                {currentRound?.title || 'Round'}
              </span>
              {assignedContestant && (
                <span className="text-xs uppercase tracking-widest font-bold text-cream-50 bg-navy-800 border border-gold-500/40 px-3.5 py-1 rounded-chip">
                  Seat #{assignedContestant.seat_no}: {assignedContestant.name}
                </span>
              )}
            </div>

            {/* Question Text (≥56px typography) */}
            <h1 className="font-display text-4xl sm:text-6xl font-bold text-cream-50 max-w-5xl leading-tight">
              {currentQuestion.body}
            </h1>

            {/* Scripture Reference */}
            {currentQuestion.scripture_ref && (
              <p className="text-xl sm:text-2xl font-semibold text-gold-300">
                📖 {currentQuestion.scripture_ref}
              </p>
            )}

            {/* Countdown Ring when Question is Open */}
            {qStatus === 'open' && (
              <div className="my-2">
                <Countdown
                  closesAt={gameState?.closes_at || null}
                  totalSeconds={currentRound?.time_limit_sec || 20}
                  getServerNow={getServerNow}
                  variant="ring"
                />
              </div>
            )}

            {qStatus === 'locked' && (
              <p className="text-3xl font-display font-bold text-danger tracking-wide">
                Time is up!
              </p>
            )}

            {/* Spoken Mode Announcement */}
            {currentQuestion.answer_mode === 'spoken' && (
              <div className="p-6 rounded-card bg-navy-900/80 border border-gold-500/40 text-center max-w-2xl w-full my-4 shadow-soft">
                <span className="text-4xl animate-pulse block mb-2">🎙️</span>
                <p className="font-display text-2xl font-bold text-gold-300">
                  Spoken Answer Mode
                </p>
                <p className="text-cream-50/80 text-base mt-1">
                  {assignedContestant
                    ? `${assignedContestant.name} is reciting their answer aloud to the judges.`
                    : 'Contestant is reciting their answer aloud to the judges.'}
                </p>
              </div>
            )}

            {/* Large Options Cards (Choice Mode) */}
            {currentQuestion.answer_mode === 'choice' && (
              <div className="grid grid-cols-2 gap-5 w-full max-w-4xl mt-4">
                {currentQuestion.options.map((opt) => (
                  <div
                    key={opt.key}
                    className="p-5 rounded-btn bg-navy-900 border border-navy-700 text-left flex items-center gap-4 text-cream-50 shadow-soft"
                  >
                    <span className="w-12 h-12 rounded-full bg-gold-500 text-navy-950 flex items-center justify-center font-mono font-extrabold text-2xl shrink-0">
                      {opt.key}
                    </span>
                    <span className="text-2xl sm:text-3xl font-medium leading-snug">
                      {opt.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. ANSWER REVEAL MODE */}
        {screen === 'answer' && currentQuestion && (
          <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
            <span className="text-sm uppercase tracking-widest font-bold text-success bg-success/20 border border-success/40 px-4 py-1 rounded-chip">
              Correct Answer Revealed
            </span>

            <h2 className="font-display text-4xl sm:text-5xl font-bold text-cream-50 max-w-4xl">
              {currentQuestion.body}
            </h2>

            {/* Correct Key Highlight */}
            {questionKey?.correct_key && (
              <div className="p-6 rounded-card bg-success/20 border-2 border-success text-center max-w-2xl w-full shadow-2xl">
                <div className="flex items-center justify-center gap-4 text-cream-50">
                  <span className="w-14 h-14 rounded-full bg-success text-white flex items-center justify-center font-mono font-extrabold text-3xl shrink-0">
                    {questionKey.correct_key}
                  </span>
                  <span className="text-3xl sm:text-4xl font-bold text-left">
                    {currentQuestion.options.find((o) => o.key === questionKey.correct_key)?.text}
                  </span>
                </div>
                {questionKey.explanation && (
                  <p className="text-sm sm:text-base text-cream-50/90 mt-3 pt-3 border-t border-success/30 font-medium">
                    {questionKey.explanation}
                  </p>
                )}
              </div>
            )}

            {/* Per-Contestant Result Rows */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl mt-2">
              {contestants.map((c) => {
                const ans = contestantAnswersMap.get(c.id);

                return (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-btn border text-left flex items-center justify-between ${
                      ans?.is_correct
                        ? 'bg-success/15 border-success text-success'
                        : 'bg-danger/15 border-danger text-danger'
                    }`}
                  >
                    <div>
                      <p className="font-mono text-xs font-bold">Seat #{c.seat_no}</p>
                      <p className="font-semibold text-cream-50 text-sm truncate max-w-[110px]">
                        {c.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-lg">
                        {ans?.is_correct ? '✓' : '✗'}
                      </p>
                      <p className="text-xs font-mono font-semibold">
                        {ans ? (ans.points >= 0 ? `+${ans.points}` : ans.points) : '0'} pts
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. LEADERBOARD MODE */}
        {screen === 'leaderboard' && (
          <div className="flex flex-col items-center gap-6 w-full animate-fade-in max-w-5xl">
            <div>
              <span className="text-sm uppercase tracking-widest text-gold-300 font-bold">
                Live Standings
              </span>
              <h2 className="font-display text-5xl font-bold text-cream-50 mt-1">
                Contestant Leaderboard
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full mt-2">
              {/* Contestants Table (2 cols) */}
              <div className="lg:col-span-2 space-y-2.5">
                {rankedContestants.map((entry) => {
                  const isTop3 = entry.rank <= 3;
                  return (
                    <div
                      key={entry.id}
                      className={`p-4 rounded-card border flex items-center justify-between text-left transition-all ${
                        entry.rank === 1
                          ? 'bg-gold-500/20 border-gold-500 shadow-2xl'
                          : entry.rank === 2
                          ? 'bg-slate-300/10 border-slate-300/40 shadow-soft'
                          : entry.rank === 3
                          ? 'bg-amber-700/15 border-amber-600/40 shadow-soft'
                          : 'bg-navy-900/80 border-navy-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`w-11 h-11 rounded-full flex items-center justify-center font-mono font-black text-xl shrink-0 ${
                            entry.rank === 1
                              ? 'bg-gold-500 text-navy-950'
                              : entry.rank === 2
                              ? 'bg-slate-300 text-navy-950'
                              : entry.rank === 3
                              ? 'bg-amber-600 text-cream-50'
                              : 'bg-navy-800 text-cream-50 border border-navy-700'
                          }`}
                        >
                          {entry.rankDisplay}
                        </span>
                        <div>
                          <p className="font-display text-2xl font-bold text-cream-50 leading-tight">
                            Seat #{entry.seat_no}: {entry.name}
                          </p>
                          {entry.group_label && (
                            <p className="text-xs text-gold-300/90">{entry.group_label}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="text-right text-xs text-cream-50/70 hidden sm:block font-mono">
                          <p>Correct: <strong className="text-cream-50">{entry.correct_count}</strong></p>
                          <p>Speed: <strong className="text-cream-50">{(entry.correct_ms / 1000).toFixed(1)}s</strong></p>
                        </div>
                        <div className="text-right">
                          <span className="font-display font-extrabold text-3xl sm:text-4xl text-gold-500 tabular-nums">
                            {entry.total_points}
                          </span>
                          <span className="text-xs text-cream-50/70 block">pts</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Audience Top 10 (1 col) */}
              <div className="bg-navy-900 border border-navy-700/70 rounded-card p-5 text-left flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-gold-300 text-sm uppercase tracking-wider mb-3">
                    Top 10 Audience
                  </h3>
                  <div className="space-y-2">
                    {audienceScores.length === 0 ? (
                      <p className="text-xs text-cream-50/60 py-4 text-center">
                        Scores updating…
                      </p>
                    ) : (
                      audienceScores.map((as, idx) => (
                        <div
                          key={as.audience_id}
                          className="flex items-center justify-between text-xs p-2 rounded bg-navy-950/60 border border-navy-700/30"
                        >
                          <span className="truncate max-w-[140px] text-cream-50">
                            #{idx + 1} {as.display_name}
                          </span>
                          <span className="font-mono font-bold text-gold-500">
                            {as.total_points} pts
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-cream-50/50 mt-4 text-center">
                  Live scores from audience mobile devices
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 6. WINNER MODE */}
        {screen === 'winner' && (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
            <span className="text-7xl animate-bounce">🏆</span>
            <div>
              <p className="text-2xl uppercase tracking-widest text-gold-300 font-extrabold">
                Grand Champion
              </p>
              <h1 className="font-display text-6xl sm:text-8xl font-black text-gold-500 mt-2">
                {rankedContestants[0]?.name || 'Bible Giant'}
              </h1>
              {rankedContestants[0]?.group_label && (
                <p className="text-2xl text-cream-50/80 mt-1">
                  {rankedContestants[0].group_label}
                </p>
              )}
            </div>

            {rankedContestants[0] && (
              <div className="bg-navy-900 border-2 border-gold-500 p-8 rounded-card max-w-md w-full shadow-2xl mt-4">
                <p className="text-sm uppercase tracking-widest text-gold-300 font-bold">
                  Winning Points
                </p>
                <p className="font-display text-6xl font-extrabold text-cream-50 mt-1">
                  {rankedContestants[0].total_points} pts
                </p>
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-navy-700/60 text-sm text-cream-50/80 font-mono">
                  <span>Correct: {rankedContestants[0].correct_count}</span>
                  <span>Speed: {(rankedContestants[0].correct_ms / 1000).toFixed(1)}s</span>
                </div>
              </div>
            )}
            <p className="text-cream-50/60 text-sm mt-4">
              &ldquo;Thy word have I hid in mine heart, that I might not sin against thee.&rdquo; — Psalm 119:11
            </p>
          </div>
        )}

        {/* 7. RAFFLE MODE */}
        {screen === 'raffle' && (
          <div className="flex flex-col items-center gap-6 animate-fade-in max-w-xl">
            <span className="text-7xl animate-bounce">🎟️</span>
            <div>
              <p className="text-xl uppercase tracking-widest text-gold-300 font-bold">
                Audience Raffle Winner
              </p>
              <h2 className="font-display text-5xl sm:text-6xl font-bold text-cream-50 mt-1">
                Congratulations!
              </h2>
            </div>

            {latestRaffle ? (
              <div className="bg-navy-900 border-2 border-gold-500/80 p-8 rounded-card w-full shadow-2xl mt-2 text-center">
                <span className="text-xs uppercase tracking-widest font-semibold text-gold-300">
                  Winning Ticket
                </span>
                <p className="font-display text-4xl sm:text-5xl font-extrabold text-cream-50 mt-2">
                  {latestRaffle.winner_name}
                </p>
                <div className="mt-4 pt-4 border-t border-navy-700/60">
                  <span className="inline-block px-4 py-1.5 bg-navy-950 rounded-chip text-xs font-semibold text-gold-300 border border-gold-500/30">
                    {latestRaffle.pool_kind === 'correct_predictors'
                      ? 'Correct Predictors Pool'
                      : 'All Audience Pool'}{' '}
                    • {latestRaffle.pool_size} Entries
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-cream-50/70 text-lg">
                Drawing winner from the audience pool…
              </p>
            )}
          </div>
        )}

        {/* 8. BLANK MODE */}
        {screen === 'blank' && (
          <div className="flex flex-col items-center justify-center gap-2 animate-fade-in opacity-40">
            <span className="font-display text-4xl font-bold text-cream-50">
              Bible Giants
            </span>
            <div className="h-0.5 w-24 bg-gold-500 rounded-full" />
          </div>
        )}
      </main>

      {/* Bottom Footer & Fullscreen Toggle */}
      <footer className="flex items-center justify-between text-xs text-cream-50/50 border-t border-navy-700/60 pt-4">
        <span>The Apostolic Faith Church • Ondo & Ekiti Area</span>

        <button
          onClick={toggleFullscreen}
          className="opacity-40 hover:opacity-100 p-1.5 rounded hover:bg-navy-900 transition-opacity"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          <svg className="w-5 h-5 text-cream-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </footer>
    </div>
  );
}
