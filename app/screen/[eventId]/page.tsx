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
  Prediction,
  ScreenMode,
} from '@/lib/types';
import { useGameState } from '@/lib/realtime/useGameState';
import { useServerClock } from '@/lib/realtime/useServerClock';
import { Countdown } from '@/components/ui/Countdown';

export default function ProjectorDisplayPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const supabase = useMemo(() => createClient(), []);

  const { gameState, event, currentQuestion, currentRound, connectionStatus } = useGameState(eventId);
  const { getServerNow } = useServerClock();

  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [questionKey, setQuestionKey] = useState<QuestionKey | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [scores, setScores] = useState<ContestantScore[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
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
              {event?.name}
            </h1>
            <p className="text-lg text-cream-50/70 max-w-xl">
              Audience & contestants, open the web app and enter the code below on your device to join:
            </p>

            <div className="bg-navy-900 border-2 border-gold-500/60 rounded-card p-8 sm:p-12 shadow-2xl my-4">
              <p className="text-sm uppercase font-bold tracking-widest text-gold-300 mb-2">
                Join Code
              </p>
              <p className="font-mono text-7xl sm:text-9xl font-extrabold tracking-widest text-cream-50 select-all">
                {event?.join_code}
              </p>
            </div>

            <div className="flex items-center gap-2 text-gold-300 text-lg font-medium">
              <span className="w-3 h-3 rounded-full bg-success animate-pulse" />
              <span>{audienceCount} Audience Members Connected</span>
            </div>
          </div>
        )}

        {/* 2. PREDICTIONS MODE */}
        {screen === 'predictions' && (
          <div className="flex flex-col items-center gap-8 w-full animate-fade-in">
            <div>
              <p className="text-gold-300 uppercase tracking-widest font-semibold text-lg">
                Audience Participation
              </p>
              <h2 className="font-display text-5xl sm:text-6xl font-bold text-cream-50 mt-1">
                Who Will Win Bible Giants?
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full mt-4">
              {contestants.map((c) => {
                const count = predictions.filter((p) => p.contestant_id === c.id).length;
                const total = predictions.length;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;

                return (
                  <div
                    key={c.id}
                    className="bg-navy-900 border border-navy-700 rounded-card p-6 flex flex-col items-center gap-3 shadow-soft"
                  >
                    <div className="w-16 h-16 rounded-full bg-navy-700 border-2 border-gold-500/60 flex items-center justify-center font-display text-2xl font-bold text-gold-300 overflow-hidden">
                      {c.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        c.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <p className="font-mono text-xs text-gold-300 font-bold">Seat #{c.seat_no}</p>
                      <p className="font-display text-xl font-bold text-cream-50 leading-tight">
                        {c.name}
                      </p>
                    </div>

                    <div className="w-full mt-2">
                      <div className="flex justify-between text-xs text-gold-300 font-semibold mb-1">
                        <span>{count} votes</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-navy-950 rounded-chip overflow-hidden border border-navy-700">
                        <div
                          className="h-full bg-gold-500 rounded-chip transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. QUESTION MODE */}
        {screen === 'question' && currentQuestion && (
          <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
            {/* Round info chip & assigned contestant chip */}
            <div className="flex items-center gap-3">
              <span className="text-sm uppercase tracking-widest font-bold text-navy-950 bg-gold-500 px-4 py-1 rounded-chip">
                {currentRound?.title || 'Competition Round'}
              </span>
              {assignedContestant && (
                <span className="text-sm font-bold text-cream-50 bg-navy-900 border border-gold-500/40 px-4 py-1 rounded-chip">
                  Question for: Seat #{assignedContestant.seat_no} ({assignedContestant.name})
                </span>
              )}
            </div>

            {/* Giant Question Text (>= 56 px) */}
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold text-cream-50 leading-tight max-w-5xl my-2">
              {currentQuestion.body}
            </h1>

            {/* Status / Countdown */}
            {qStatus === 'shown' && (
              <p className="text-2xl font-display font-semibold text-gold-300 tracking-wide animate-pulse">
                Get ready…
              </p>
            )}

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
              <p className="text-2xl font-display font-bold text-danger tracking-wide">
                Time is up!
              </p>
            )}

            {/* Large Options Cards */}
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

        {/* 5. BLANK MODE */}
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

