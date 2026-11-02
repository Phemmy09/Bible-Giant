'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Papa from 'papaparse';
import { createClient } from '@/lib/supabase/client';
import {
  Event,
  Contestant,
  ContestantScore,
  AudienceScore,
  RaffleDraw,
  ScoreAdjustment,
  Round,
  Question,
  Answer,
  ScreenMode,
} from '@/lib/types';
import {
  rpcHostDrawRaffle,
  rpcHostSetScreen,
  rpcHostSetEventStatus,
  rpcHostShowRoundSummary,
} from '@/lib/rpc';
import { computeLeaderboard } from '@/lib/scoring';
import { HostHeader } from '@/components/host/HostHeader';
import { HostNavTabs } from '@/components/host/HostNavTabs';
import { usePresenceHost } from '@/lib/realtime/usePresenceSync';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScoreAdjustmentModal } from '@/components/host/ScoreAdjustmentModal';
import { Modal } from '@/components/ui/Modal';

export default function HostEventResultsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const supabase = useMemo(() => createClient(), []);

  const { inSyncCount, totalTrackedCount, laggingDevices } = usePresenceHost(eventId, 0);

  const [event, setEvent] = useState<Event | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [scores, setScores] = useState<ContestantScore[]>([]);
  const [audienceScores, setAudienceScores] = useState<AudienceScore[]>([]);
  const [raffleDraws, setRaffleDraws] = useState<RaffleDraw[]>([]);
  const [adjustments, setAdjustments] = useState<ScoreAdjustment[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [top5Audience, setTop5Audience] = useState<Array<{
    rank: number;
    id: string;
    name: string;
    assembly: string;
    phone: string;
    region?: string;
    total_points: number;
    correct_count: number;
    correct_ms: number;
  }>>([]);
  const [fullAudience, setFullAudience] = useState<any[]>([]);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [showAudienceAnswers, setShowAudienceAnswers] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawingRaffle, setIsDrawingRaffle] = useState(false);
  const [raffleSuccessModal, setRaffleSuccessModal] = useState<RaffleDraw | null>(null);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [screenMode, setScreenMode] = useState<ScreenMode>('leaderboard');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch all results data
  const fetchData = useCallback(async () => {
    try {
      const [
        evRes,
        cRes,
        scRes,
        audRes,
        rafRes,
        adjRes,
        rRes,
        qRes,
        ansRes,
        gsRes,
      ] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('contestants').select('*').eq('event_id', eventId).order('seat_no', { ascending: true }),
        supabase.from('contestant_scores').select('*').eq('event_id', eventId),
        supabase
          .from('audience_scores')
          .select('*')
          .eq('event_id', eventId)
          .order('total_points', { ascending: false })
          .order('correct_count', { ascending: false })
          .order('correct_ms', { ascending: true }),
        supabase.from('raffle_draws').select('*').eq('event_id', eventId).order('drawn_at', { ascending: false }),
        supabase.from('score_adjustments').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
        supabase.from('rounds').select('*').eq('event_id', eventId).order('position', { ascending: true }),
        supabase.from('questions').select('*').eq('event_id', eventId).order('position', { ascending: true }),
        supabase.from('answers').select('*').eq('event_id', eventId),
        supabase.from('game_state').select('screen').eq('event_id', eventId).single(),
      ]);

      if (evRes.data) setEvent(evRes.data as Event);
      if (cRes.data) setContestants(cRes.data as Contestant[]);
      if (scRes.data) setScores(scRes.data as ContestantScore[]);
      if (audRes.data) setAudienceScores(audRes.data as AudienceScore[]);
      if (rafRes.data) setRaffleDraws(rafRes.data as RaffleDraw[]);
      if (adjRes.data) setAdjustments(adjRes.data as ScoreAdjustment[]);
      if (rRes.data) setRounds(rRes.data as Round[]);
      if (qRes.data) setQuestions(qRes.data as Question[]);
      if (ansRes.data) setAnswers(ansRes.data as Answer[]);
      if (gsRes.data?.screen) setScreenMode(gsRes.data.screen as ScreenMode);

      // Fetch Audience Leaderboard with Phone Numbers & Points
      try {
        const lbRes = await fetch(`/api/audience/leaderboard?eventId=${eventId}`);
        const lbData = await lbRes.json();
        if (lbData.ok) {
          if (Array.isArray(lbData.top5)) setTop5Audience(lbData.top5);
          if (Array.isArray(lbData.all)) setFullAudience(lbData.all);
        }
      } catch (err) {
        console.warn('Audience leaderboard load warning:', err);
      }
    } catch {
      setActionNotice({ type: 'error', message: 'Failed to load results data.' });
    } finally {
      setIsLoading(false);
    }
  }, [eventId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription for live scores, adjustments, and raffle updates
  useEffect(() => {
    const channel = supabase
      .channel(`host_results:${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contestant_scores', filter: `event_id=eq.${eventId}` }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audience_scores', filter: `event_id=eq.${eventId}` }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'raffle_draws', filter: `event_id=eq.${eventId}` }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'score_adjustments', filter: `event_id=eq.${eventId}` }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, (payload) => {
        if (payload.new) setEvent(payload.new as Event);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state', filter: `event_id=eq.${eventId}` }, (payload) => {
        if (payload.new && 'screen' in payload.new) {
          setScreenMode(payload.new.screen as ScreenMode);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, supabase, fetchData]);

  // Ranked contestants with deterministic 4-tier tie-breaking
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

  const champion = rankedContestants[0] || null;

  // Draw Raffle Handler
  async function handleDrawRaffle() {
    setIsDrawingRaffle(true);
    setActionNotice(null);
    const res = await rpcHostDrawRaffle(eventId, supabase);
    setIsDrawingRaffle(false);

    if (res.ok) {
      const newDraw: RaffleDraw = {
        id: '',
        event_id: eventId,
        audience_id: null,
        winner_name: res.data.winner_name,
        pool_kind: res.data.pool_kind as 'correct_predictors' | 'all_audience',
        pool_size: res.data.pool_size,
        drawn_at: new Date().toISOString(),
      };
      setRaffleSuccessModal(newDraw);
      fetchData();
    } else {
      setActionNotice({ type: 'error', message: res.message });
    }
  }

  // Switch Projector Screen
  async function handleSetProjectorScreen(mode: ScreenMode, roundId?: string) {
    if (mode === 'round_summary') {
      const targetRoundId = roundId || rounds[0]?.id;
      if (!targetRoundId) {
        setActionNotice({ type: 'error', message: 'No round available to display summary.' });
        return;
      }
      const res = await rpcHostShowRoundSummary(eventId, targetRoundId, supabase);
      if (res.ok) {
        setScreenMode('round_summary');
        setActionNotice({ type: 'success', message: 'Projector screen switched to Round Summary.' });
        setTimeout(() => setActionNotice(null), 3000);
      } else {
        setActionNotice({ type: 'error', message: res.message });
      }
      return;
    }

    const res = await rpcHostSetScreen(eventId, mode, supabase);
    if (res.ok) {
      setScreenMode(mode);
      setActionNotice({ type: 'success', message: `Projector screen switched to ${mode.replace('_', ' ')}.` });
      setTimeout(() => setActionNotice(null), 3000);
    } else {
      setActionNotice({ type: 'error', message: res.message });
    }
  }

  // Finish Event Handler
  async function handleFinishEvent() {
    if (!confirm('Are you sure you want to officially finish this competition?')) return;
    const res = await rpcHostSetEventStatus(eventId, 'finished', supabase);
    if (res.ok) {
      setActionNotice({ type: 'success', message: 'Competition officially marked as Finished.' });
      fetchData();
    } else {
      setActionNotice({ type: 'error', message: res.message });
    }
  }

  // CSV Export Generation
  function handleExportCsv() {
    if (!event) return;

    // 1. Leaderboard Section
    const leaderboardRows = rankedContestants.map((rc) => ({
      Rank: rc.rankDisplay,
      Seat: rc.seat_no,
      Name: rc.name,
      Group: rc.group_label || '',
      Total_Points: rc.total_points,
      Correct_Count: rc.correct_count,
      Total_Speed_Sec: (rc.correct_ms / 1000).toFixed(2),
    }));

    // 2. Per-Question Detailed Answers
    const qMap = new Map<string, Question>();
    questions.forEach((q) => qMap.set(q.id, q));
    const rMap = new Map<string, Round>();
    rounds.forEach((r) => rMap.set(r.id, r));
    const cMap = new Map<string, Contestant>();
    contestants.forEach((c) => cMap.set(c.id, c));

    const answerRows = answers
      .filter((a) => a.contestant_id)
      .map((a) => {
        const q = qMap.get(a.question_id);
        const r = q ? rMap.get(q.round_id) : null;
        const c = a.contestant_id ? cMap.get(a.contestant_id) : null;

        return {
          Round: r?.title || 'Unknown',
          Question_Number: q?.position || '',
          Question_Text: q?.body || '',
          Answer_Mode: q?.answer_mode || '',
          Contestant_Seat: c?.seat_no || '',
          Contestant_Name: c?.name || '',
          Choice_Key: a.choice_key || 'Spoken',
          Elapsed_Sec: a.elapsed_ms !== null ? (a.elapsed_ms / 1000).toFixed(2) : '',
          Is_Correct: a.is_correct === true ? 'YES' : a.is_correct === false ? 'NO' : '',
          Points: a.points,
        };
      });

    // 3. Audience Directory & Scoring
    const audDataList = fullAudience.length > 0 ? fullAudience : audienceScores;
    const audienceRows = audDataList.map((as: any, idx: number) => ({
      Rank: idx + 1,
      Audience_Name: as.name || as.display_name,
      Phone_Number: as.phone || '',
      Region: as.region || 'General',
      Total_Points: as.total_points || 0,
      Correct_Count: as.correct_count || 0,
      Speed_Sec: ((as.correct_ms || 0) / 1000).toFixed(2),
    }));

    // 4. Detailed Audience Answers (Backend Visibility Only)
    const audienceAnswerRows = answers
      .filter((a) => a.audience_id)
      .map((a) => {
        const q = qMap.get(a.question_id);
        const r = q ? rMap.get(q.round_id) : null;
        const aud = fullAudience.find((m: any) => m.id === a.audience_id || m.audience_id === a.audience_id);

        return {
          Round: r?.title || 'Unknown',
          Question_Number: q?.position || '',
          Question_Text: q?.body || '',
          Audience_Name: aud?.name || aud?.display_name || a.audience_id,
          Audience_Phone: aud?.phone || '',
          Audience_Region: aud?.region || '',
          Choice_Key: a.choice_key || '',
          Elapsed_Sec: a.elapsed_ms !== null ? (a.elapsed_ms / 1000).toFixed(2) : '',
          Is_Correct: a.is_correct === true ? 'YES' : a.is_correct === false ? 'NO' : '',
          Points: a.points,
        };
      });

    // 5. Score Adjustments
    const adjustmentRows = adjustments.map((adj) => {
      const c = cMap.get(adj.contestant_id);
      return {
        Seat: c?.seat_no || '',
        Contestant: c?.name || '',
        Delta: adj.delta,
        Reason: adj.reason,
        Timestamp: adj.created_at,
      };
    });

    const csvContent = [
      `# BIBLE GIANTS RESULTS EXPORT`,
      `# Event: ${event.name}`,
      `# Join Code: ${event.join_code}`,
      `# Exported At: ${new Date().toISOString()}`,
      ``,
      `--- FINAL CONTESTANT STANDINGS ---`,
      Papa.unparse(leaderboardRows),
      ``,
      `--- DETAILED PER-QUESTION CONTESTANT ANSWERS ---`,
      Papa.unparse(answerRows),
      ``,
      `--- ALL REGISTERED AUDIENCE & AWARDS STANDINGS ---`,
      Papa.unparse(audienceRows),
      ``,
      `--- DETAILED AUDIENCE ANSWERS (BACKEND ONLY) ---`,
      Papa.unparse(audienceAnswerRows),
      ``,
      `--- SCORE ADJUSTMENTS LOG ---`,
      Papa.unparse(adjustmentRows),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.name.replace(/\s+/g, '_')}_final_results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Audience Standings CSV Export (§6.3)
  function handleExportAudienceCsv() {
    if (!event) return;

    const audDataList = fullAudience.length > 0 ? fullAudience : audienceScores;
    const qMap = new Map<string, Question>();
    questions.forEach((q) => qMap.set(q.id, q));

    const audienceRows = audDataList.map((as: any, idx: number) => {
      const memberId = as.id || as.audience_id;
      const memberAnswers = answers.filter((a) => a.audience_id === memberId);

      const row: Record<string, any> = {
        Rank: idx + 1,
        Name: as.name || as.display_name,
        Assembly: as.assembly || as.region || 'Unknown',
        Phone: as.phone || '',
        Total_Points: as.total_points || 0,
        Correct_Count: as.correct_count || 0,
      };

      // Per-round points
      rounds.forEach((r) => {
        const roundPoints = memberAnswers
          .filter((a) => {
            const q = qMap.get(a.question_id);
            return q && q.round_id === r.id;
          })
          .reduce((sum, a) => sum + (a.points || 0), 0);

        row[`Round_${r.position}_${r.title.replace(/\s+/g, '_')}`] = roundPoints;
      });

      return row;
    });

    const csvContent = Papa.unparse(audienceRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.name.replace(/\s+/g, '_')}_audience_standings.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-ink-500">
          <svg className="animate-spin h-6 w-6 text-gold-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm">Loading final results…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <HostHeader
        eventName={event?.name}
        eventStatus={event?.status}
        joinCode={event?.join_code}
        eventId={eventId}
        inSyncCount={inSyncCount}
        totalTrackedCount={totalTrackedCount}
        laggingDevices={laggingDevices}
      />
      <HostNavTabs eventId={eventId} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Banner Notice */}
        {actionNotice && (
          <div
            className={`p-4 rounded-btn text-sm font-semibold flex items-center justify-between animate-fade-in ${
              actionNotice.type === 'success'
                ? 'bg-success/15 border border-success/30 text-success'
                : 'bg-danger/15 border border-danger/30 text-danger'
            }`}
          >
            <span>{actionNotice.message}</span>
            <button
              onClick={() => setActionNotice(null)}
              className="text-xs font-bold uppercase ml-4"
            >
              ✕ Dismiss
            </button>
          </div>
        )}

        {/* TOP SUMMARY ROW: Champion, Raffle Draw & Projector Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Champion Podium */}
          <Card className="p-6 bg-navy-900 text-cream-50 border-gold-500/50 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-widest font-bold text-gold-500">
                  🏆 Competition Champion
                </span>
                <span className="font-mono text-xs bg-navy-800 text-gold-300 px-2.5 py-0.5 rounded-chip border border-gold-500/30">
                  Seat #{champion?.seat_no || '—'}
                </span>
              </div>
              <h2 className="font-display text-3xl font-extrabold text-cream-50 leading-tight">
                {champion?.name || 'Awaiting Results'}
              </h2>
              {champion?.group_label && (
                <p className="text-sm text-gold-300 mt-1">{champion.group_label}</p>
              )}
              <div className="mt-4 pt-4 border-t border-navy-700 flex items-center justify-between">
                <div>
                  <span className="text-xs text-cream-50/60 block">Total Points</span>
                  <span className="font-display text-4xl font-black text-gold-500 tabular-nums">
                    {champion?.total_points || 0}
                  </span>
                </div>
                <div className="text-right text-xs text-cream-50/70 font-mono">
                  <p>Correct: <strong className="text-cream-50">{champion?.correct_count || 0}</strong></p>
                  <p>Speed: <strong className="text-cream-50">{((champion?.correct_ms || 0) / 1000).toFixed(1)}s</strong></p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-navy-700/80 flex items-center gap-3">
              <Button
                variant="gold"
                size="md"
                onClick={() => handleSetProjectorScreen('winner')}
                className="flex-1 font-bold shadow-soft"
              >
                👑 Show Winner on Screen
              </Button>
            </div>
          </Card>

          {/* Card 2: Audience Raffle Draws */}
          <Card className="p-6 bg-white border-navy-700/10 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-widest font-bold text-ink-500">
                  🎟️ Audience Raffle
                </span>
                <span className="text-xs font-mono font-bold text-navy-900 bg-cream-100 px-2 py-0.5 rounded">
                  {raffleDraws.length} Draws Completed
                </span>
              </div>
              <h3 className="font-display text-2xl font-bold text-navy-900">
                Random Winner Selection
              </h3>
              <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                Draws exclusively from correct champion predictors first; falls back to all audience members if depleted. Prevents duplicate wins.
              </p>

              {raffleDraws[0] && (
                <div className="mt-4 p-3 rounded-btn bg-cream-50 border border-gold-500/30 text-xs">
                  <span className="text-ink-500 font-semibold block text-[10px] uppercase">
                    Latest Drawn Winner:
                  </span>
                  <span className="font-bold text-navy-900 text-sm">
                    {raffleDraws[0].winner_name}
                  </span>
                  <span className="text-ink-500 ml-1">
                    ({raffleDraws[0].pool_kind === 'correct_predictors' ? 'Predictors Pool' : 'All Audience'}, {raffleDraws[0].pool_size} pool)
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-navy-700/10 flex items-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleDrawRaffle}
                disabled={isDrawingRaffle}
                className="flex-1 font-bold"
              >
                {isDrawingRaffle ? 'Drawing Winner…' : '🎟️ Draw Raffle Winner'}
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => handleSetProjectorScreen('raffle')}
                className="text-xs"
              >
                Show on Screen
              </Button>
            </div>
          </Card>

          {/* Card 3: Projector & Event Status */}
          <Card className="p-6 bg-white border-navy-700/10 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-widest font-bold text-ink-500">
                  🖥️ Projector Screen Mode
                </span>
                <span className="font-mono text-xs font-bold text-gold-500 bg-navy-900 px-2.5 py-0.5 rounded-chip">
                  Active: {screenMode}
                </span>
              </div>
              <h3 className="font-display text-2xl font-bold text-navy-900">
                Auditorium Display
              </h3>
              <p className="text-xs text-ink-500 mt-1">
                Control what the main hall projector screen displays to attendees.
              </p>

              <div className="grid grid-cols-2 gap-2 mt-4">
                {[
                  { mode: 'leaderboard' as ScreenMode, label: 'Leaderboard' },
                  { mode: 'round_summary' as ScreenMode, label: 'Round Summary' },
                  { mode: 'audience_board' as ScreenMode, label: 'Audience Top 5' },
                  { mode: 'winner' as ScreenMode, label: 'Winner' },
                  { mode: 'raffle' as ScreenMode, label: 'Raffle' },
                  { mode: 'blank' as ScreenMode, label: 'Blank' },
                ].map(({ mode, label }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleSetProjectorScreen(mode)}
                    className={`py-2 px-3 rounded text-xs font-bold transition-all border ${
                      screenMode === mode
                        ? 'bg-navy-900 text-cream-50 border-navy-900 shadow-soft ring-2 ring-gold-500'
                        : 'bg-cream-50 text-navy-900 border-navy-700/20 hover:bg-cream-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-navy-700/10 flex items-center justify-between">
              {event?.status !== 'finished' ? (
                <Button
                  variant="danger"
                  size="md"
                  onClick={handleFinishEvent}
                  className="w-full text-xs font-bold"
                >
                  ✓ Conclude & Finish Competition
                </Button>
              ) : (
                <span className="text-xs font-bold text-success flex items-center gap-1.5 mx-auto">
                  ✓ Event Officially Finished
                </span>
              )}
            </div>
          </Card>
        </div>

        {/* SECTION 2: FINAL CONTESTANT LEADERBOARD TABLE */}
        <Card className="p-6 bg-white border-navy-700/10 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-navy-700/10">
            <div>
              <h3 className="font-display text-2xl font-bold text-navy-900">
                Final Contestant Leaderboard
              </h3>
              <p className="text-xs text-ink-500 mt-0.5">
                Deterministic tie-breaking: Total Points → Correct Answers → Total Response Speed → Seat Number
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setAdjustModalOpen(true)}
                className="text-xs font-semibold text-gold-500 border border-gold-500/30 hover:bg-gold-500/10"
              >
                ⚖️ Adjust Scores
              </Button>

              <Button
                variant="gold"
                size="md"
                onClick={handleExportCsv}
                className="text-xs font-bold flex items-center gap-1.5"
              >
                <span>📥 Download Results CSV</span>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream-100/70 text-ink-500 text-xs uppercase tracking-wider font-bold border-b border-navy-700/10">
                <tr>
                  <th className="py-3 px-4 w-16">Rank</th>
                  <th className="py-3 px-4 w-20">Seat</th>
                  <th className="py-3 px-4">Contestant Name</th>
                  <th className="py-3 px-4">Group / Zone</th>
                  <th className="py-3 px-4 text-center">Correct Answers</th>
                  <th className="py-3 px-4 text-center">Total Correct Time</th>
                  <th className="py-3 px-4 text-right">Total Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700/5">
                {rankedContestants.map((c) => {
                  const isChampion = c.rank === 1;
                  return (
                    <tr
                      key={c.id}
                      className={isChampion ? 'bg-gold-500/10 font-medium' : 'hover:bg-cream-50/60'}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-base">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs ${
                            c.rank === 1
                              ? 'bg-gold-500 text-navy-950 font-black shadow-soft'
                              : c.rank === 2
                              ? 'bg-slate-300 text-navy-950 font-bold'
                              : c.rank === 3
                              ? 'bg-amber-600 text-cream-50 font-bold'
                              : 'text-navy-900'
                          }`}
                        >
                          {c.rankDisplay}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-ink-500">
                        #{c.seat_no}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-navy-900 text-base">
                        {c.name} {isChampion && <span className="ml-1">👑</span>}
                      </td>
                      <td className="py-3.5 px-4 text-ink-500 text-xs">
                        {c.group_label || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-navy-900">
                        {c.correct_count}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-ink-500">
                        {(c.correct_ms / 1000).toFixed(2)} s
                      </td>
                      <td className="py-3.5 px-4 text-right font-display font-extrabold text-xl text-navy-900 tabular-nums">
                        {c.total_points} <span className="text-xs font-normal text-ink-500">pts</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* SECTION 3: AUDIENCE STANDINGS & RAFFLE HISTORY */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Audience Award Winners */}
          <Card className="p-6 bg-white border-gold-500/40 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-navy-700/10 mb-4 gap-2">
                <div>
                  <h3 className="font-display text-xl font-bold text-navy-900 flex items-center gap-2">
                    <span>🏆 Top 5 Audience Award Winners</span>
                  </h3>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Official prize winners to be contacted and awarded at the close of the competition
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={handleExportAudienceCsv}
                    className="text-xs font-semibold text-navy-900 border border-navy-700/20 hover:bg-cream-100 min-h-[32px] px-2.5 py-1"
                  >
                    📥 Download Audience CSV
                  </Button>
                  <span className="text-xs font-mono font-semibold text-ink-500 bg-cream-100 px-2 py-1 rounded">
                    {fullAudience.length > 0 ? fullAudience.length : audienceScores.length} registered
                  </span>
                </div>
              </div>

              {top5Audience.length === 0 && audienceScores.length === 0 ? (
                <div className="text-center py-8 text-ink-500 text-xs">
                  No audience submissions recorded yet. Audience members can join using the event code.
                </div>
              ) : (
                <div className="space-y-3">
                  {(top5Audience.length > 0
                    ? top5Audience
                    : audienceScores.slice(0, 5).map((as, idx) => ({
                        rank: idx + 1,
                        id: as.audience_id,
                        name: as.display_name,
                        assembly: (as as any).assembly || (as as any).region || 'Unknown',
                        phone: (as as any).phone || '',
                        region: 'General',
                        total_points: as.total_points,
                        correct_count: as.correct_count,
                        correct_ms: as.correct_ms,
                      }))
                  ).map((winner) => (
                    <div
                      key={winner.id}
                      className="p-3.5 rounded-card bg-cream-50 border border-gold-500/30 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                              winner.rank === 1
                                ? 'bg-gold-500 text-navy-950 shadow-soft'
                                : winner.rank === 2
                                ? 'bg-slate-300 text-navy-950'
                                : winner.rank === 3
                                ? 'bg-amber-600 text-cream-50'
                                : 'bg-navy-900 text-cream-50'
                            }`}
                          >
                            #{winner.rank}
                          </span>
                          <div>
                            <span className="font-bold text-navy-900 text-sm block">
                              {winner.name}
                            </span>
                            <span className="text-[11px] text-ink-500 font-medium">
                              ⛪ {winner.assembly || winner.region || 'Unknown'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-display font-extrabold text-navy-900 text-base tabular-nums">
                            {winner.total_points} pts
                          </span>
                          <span className="text-[10px] text-ink-500 block">
                            {winner.correct_count} correct
                          </span>
                        </div>
                      </div>

                      {/* Phone Contact details for Organizer */}
                      <div className="pt-2 border-t border-navy-700/10 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-ink-500 font-medium">📞 Phone:</span>
                          {winner.phone ? (
                            <a
                              href={`tel:${winner.phone}`}
                              className="font-mono font-bold text-navy-900 hover:text-gold-600 underline"
                            >
                              {winner.phone}
                            </a>
                          ) : (
                            <span className="italic text-ink-500 font-mono text-[11px]">
                              Not provided
                            </span>
                          )}
                        </div>

                        {winner.phone && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(winner.phone);
                              setCopiedPhone(winner.phone);
                              setTimeout(() => setCopiedPhone(null), 2000);
                            }}
                            className="px-2 py-0.5 rounded text-[11px] font-bold bg-white border border-navy-700/20 text-navy-900 hover:bg-cream-100 transition-colors"
                          >
                            {copiedPhone === winner.phone ? '✓ Copied!' : 'Copy Number'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Toggle to view audience backend answers */}
              <div className="mt-4 pt-3 border-t border-navy-700/10 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowAudienceAnswers(!showAudienceAnswers)}
                  className="text-xs font-semibold text-navy-900 hover:text-gold-600 transition-colors"
                >
                  {showAudienceAnswers ? '▲ Hide Audience Answers Log' : '▼ View Audience Answers Log (Backend Only)'}
                </button>
                <span className="text-[11px] text-ink-500">
                  {answers.filter((a) => a.audience_id).length} recorded
                </span>
              </div>

              {showAudienceAnswers && (
                <div className="mt-3 max-h-60 overflow-y-auto space-y-2 pr-1">
                  {answers.filter((a) => a.audience_id).length === 0 ? (
                    <p className="text-[11px] text-ink-500 italic py-2 text-center">
                      No audience answers submitted yet.
                    </p>
                  ) : (
                    answers
                      .filter((a) => a.audience_id)
                      .slice(0, 30)
                      .map((ans, idx) => {
                        const aud = fullAudience.find((m: any) => m.id === ans.audience_id || m.audience_id === ans.audience_id);
                        const q = questions.find((ques) => ques.id === ans.question_id);
                        return (
                          <div
                            key={ans.id || idx}
                            className="p-2 rounded bg-cream-50 border border-navy-700/10 text-xs flex items-center justify-between"
                          >
                            <div className="truncate max-w-[200px]">
                              <p className="font-bold text-navy-900 truncate">
                                {aud?.name || aud?.display_name || 'Audience'}
                              </p>
                              <p className="text-[10px] text-ink-500 truncate">
                                {q ? `Q: ${q.body.slice(0, 35)}…` : 'Question'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                  ans.is_correct
                                    ? 'bg-success/15 text-success'
                                    : 'bg-danger/15 text-danger'
                                }`}
                              >
                                {ans.choice_key || '—'}
                              </span>
                              <span className="text-ink-500 text-[10px] tabular-nums font-mono">
                                +{ans.points} pts
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Raffle Draws History */}
          <Card className="p-6 bg-white border-navy-700/10 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-navy-700/10 mb-4">
                <div>
                  <h3 className="font-display text-xl font-bold text-navy-900">
                    Raffle Draws History
                  </h3>
                  <p className="text-xs text-ink-500">
                    Audit log of all prize winners drawn on stage
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleDrawRaffle}
                  disabled={isDrawingRaffle}
                  className="text-xs font-bold"
                >
                  + Draw Winner
                </Button>
              </div>

              {raffleDraws.length === 0 ? (
                <div className="text-center py-10 text-ink-500 text-xs">
                  No raffle draws have been conducted yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {raffleDraws.map((d, idx) => (
                    <div
                      key={d.id || idx}
                      className="p-3 rounded bg-cream-50 border border-navy-700/10 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-navy-900">
                            {d.winner_name}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-cream-100 text-[10px] font-semibold text-ink-500">
                            {d.pool_kind === 'correct_predictors' ? 'Predictors Pool' : 'All Audience'}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-500 mt-0.5">
                          Pool Size: {d.pool_size} eligible tickets
                        </p>
                      </div>
                      <span className="text-ink-500 font-mono text-[10px]">
                        {new Date(d.drawn_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* SECTION 4: SCORE ADJUSTMENTS AUDIT LOG */}
        <Card className="p-6 bg-white border-navy-700/10 shadow-soft">
          <div className="flex items-center justify-between pb-3 border-b border-navy-700/10 mb-4">
            <div>
              <h3 className="font-display text-xl font-bold text-navy-900">
                Score Adjustments Audit Log
              </h3>
              <p className="text-xs text-ink-500">
                Permanent record of all manual operator adjustments and corrections
              </p>
            </div>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setAdjustModalOpen(true)}
              className="text-xs font-semibold text-gold-500 border border-gold-500/30"
            >
              + Add Adjustment
            </Button>
          </div>

          {adjustments.length === 0 ? (
            <p className="text-xs text-ink-500 py-4 text-center">
              No manual score adjustments recorded. Scores strictly reflect quiz answer points.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-cream-100/70 text-ink-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Contestant</th>
                    <th className="py-2.5 px-3">Adjustment</th>
                    <th className="py-2.5 px-3">Mandatory Reason</th>
                    <th className="py-2.5 px-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/5">
                  {adjustments.map((adj) => {
                    const c = contestants.find((con) => con.id === adj.contestant_id);
                    const isPos = adj.delta > 0;
                    return (
                      <tr key={adj.id}>
                        <td className="py-2.5 px-3 font-bold text-navy-900">
                          {c ? `Seat #${c.seat_no} ${c.name}` : 'Unknown Contestant'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <span
                            className={isPos ? 'text-success' : 'text-danger'}
                          >
                            {isPos ? `+${adj.delta}` : adj.delta} pts
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-ink-900 font-medium">
                          &ldquo;{adj.reason}&rdquo;
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-ink-500">
                          {new Date(adj.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      {/* RAFFLE WINNER CELEBRATION MODAL */}
      {raffleSuccessModal && (
        <Modal
          isOpen={!!raffleSuccessModal}
          onClose={() => setRaffleSuccessModal(null)}
          title="🎉 Raffle Winner Drawn!"
        >
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span className="text-5xl animate-bounce">🎟️</span>
            <div>
              <span className="text-xs uppercase tracking-widest font-semibold text-gold-500">
                Congratulations
              </span>
              <h2 className="font-display text-3xl font-extrabold text-navy-900 mt-1">
                {raffleSuccessModal.winner_name}
              </h2>
            </div>
            <div className="p-3 bg-cream-100 rounded-btn border border-gold-500/30 text-xs w-full max-w-xs">
              <p className="font-semibold text-navy-900">
                {raffleSuccessModal.pool_kind === 'correct_predictors'
                  ? 'Drawn from Correct Predictors Pool'
                  : 'Drawn from All Audience Pool'}
              </p>
              <p className="text-ink-500 mt-0.5">
                Pool Size: {raffleSuccessModal.pool_size} tickets
              </p>
            </div>
            <p className="text-xs text-ink-500">
              The winner&apos;s name has also been sent live to the main auditorium projector screen.
            </p>
            <div className="flex items-center gap-3 w-full mt-2">
              <Button
                variant="primary"
                onClick={() => setRaffleSuccessModal(null)}
                className="w-full"
              >
                Close & Continue
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* SCORE ADJUSTMENT MODAL */}
      <ScoreAdjustmentModal
        eventId={eventId}
        contestants={contestants}
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        onAdjusted={() => {
          fetchData();
        }}
      />
    </div>
  );
}
