'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Event, Contestant, Round, Question, AudienceMember, Prediction, EventStatus } from '@/lib/types';
import { rpcHostSetEventStatus } from '@/lib/rpc';
import { HostHeader } from '@/components/host/HostHeader';
import { HostNavTabs } from '@/components/host/HostNavTabs';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EventStatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

export default function EventOverviewPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const supabase = useMemo(() => createClient(), []);

  const [event, setEvent] = useState<Event | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [audience, setAudience] = useState<AudienceMember[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [hasQuestionKeysError, setHasQuestionKeysError] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Status transition state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    targetStatus: EventStatus;
    title: string;
    message: string;
  }>({
    isOpen: false,
    targetStatus: 'setup',
    title: '',
    message: '',
  });

  const fetchData = useCallback(async () => {
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
      const { data: rData } = await supabase
        .from('rounds')
        .select('*')
        .eq('event_id', eventId)
        .order('position', { ascending: true });
      setRounds((rData as Round[]) || []);

      // 4. Questions
      const { data: qData } = await supabase
        .from('questions')
        .select('*')
        .eq('event_id', eventId)
        .order('position', { ascending: true });
      const loadedQuestions = (qData as Question[]) || [];
      setQuestions(loadedQuestions);

      // 5. Question keys check for choice questions
      const choiceQuestionIds = loadedQuestions
        .filter((q) => q.answer_mode === 'choice')
        .map((q) => q.id);

      if (choiceQuestionIds.length > 0) {
        const { data: kData } = await supabase
          .from('question_keys')
          .select('question_id, correct_key')
          .in('question_id', choiceQuestionIds);

        const keysMap = new Map((kData || []).map((k) => [k.question_id, k.correct_key]));
        const missingKey = choiceQuestionIds.some((id) => !keysMap.get(id));
        setHasQuestionKeysError(missingKey);
      } else {
        setHasQuestionKeysError(false);
      }

      // 6. Audience
      const { data: audData } = await supabase
        .from('audience_members')
        .select('*')
        .eq('event_id', eventId)
        .order('joined_at', { ascending: false });
      setAudience((audData as AudienceMember[]) || []);

      // 7. Predictions
      const { data: predData } = await supabase
        .from('predictions')
        .select('*')
        .eq('event_id', eventId);
      setPredictions((predData as Prediction[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load event data';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, supabase]);

  useEffect(() => {
    fetchData();

    // Subscribe to realtime changes on audience and predictions
    const channel = supabase
      .channel(`overview:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audience_members', filter: `event_id=eq.${eventId}` },
        () => {
          supabase
            .from('audience_members')
            .select('*')
            .eq('event_id', eventId)
            .order('joined_at', { ascending: false })
            .then(({ data }) => setAudience((data as AudienceMember[]) || []));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predictions', filter: `event_id=eq.${eventId}` },
        () => {
          supabase
            .from('predictions')
            .select('*')
            .eq('event_id', eventId)
            .then(({ data }) => setPredictions((data as Prediction[]) || []));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        () => {
          supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single()
            .then(({ data }) => {
              if (data) setEvent(data as Event);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchData, supabase]);

  // Ready check calculation
  const readyCheckIssues = useMemo(() => {
    const issues: { text: string; link: string }[] = [];
    if (contestants.length < 2) {
      issues.push({
        text: `At least 2 contestants required (currently ${contestants.length})`,
        link: `/host/${eventId}/contestants`,
      });
    }
    const unclaimed = contestants.filter((c) => !c.auth_user_id);
    if (unclaimed.length > 0) {
      issues.push({
        text: `${unclaimed.length} contestant(s) haven't claimed their seat yet`,
        link: `/host/${eventId}/contestants`,
      });
    }
    if (rounds.length < 1) {
      issues.push({
        text: 'At least 1 round is required',
        link: `/host/${eventId}/rounds`,
      });
    }
    rounds.forEach((r) => {
      const count = questions.filter((q) => q.round_id === r.id).length;
      if (count === 0) {
        issues.push({
          text: `Round "${r.title}" has no questions`,
          link: `/host/${eventId}/rounds`,
        });
      }
    });
    if (hasQuestionKeysError) {
      issues.push({
        text: 'One or more multiple-choice questions have no correct answer key set',
        link: `/host/${eventId}/rounds`,
      });
    }
    return issues;
  }, [contestants, rounds, questions, hasQuestionKeysError, eventId]);

  const isReadyForLive = readyCheckIssues.length === 0;

  async function handleSetStatus(target: EventStatus) {
    if (!event) return;
    setIsUpdatingStatus(true);
    const res = await rpcHostSetEventStatus(event.id, target, supabase);
    setIsUpdatingStatus(false);
    if (res.ok) {
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      setEvent((prev) => (prev ? { ...prev, status: target } : null));
    } else {
      setError(res.message);
    }
  }

  async function handleRemoveAudience(memberId: string) {
    const { error: delErr } = await supabase
      .from('audience_members')
      .delete()
      .eq('id', memberId);
    if (delErr) {
      setError(delErr.message);
    } else {
      setAudience((prev) => prev.filter((m) => m.id !== memberId));
    }
  }

  function handleCopyJoinCode() {
    if (!event) return;
    navigator.clipboard.writeText(event.join_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  // Prediction counts per contestant
  const predictionStats = useMemo(() => {
    const counts = new Map<string, number>();
    predictions.forEach((p) => {
      counts.set(p.contestant_id, (counts.get(p.contestant_id) || 0) + 1);
    });
    const total = predictions.length;
    return contestants.map((c) => {
      const count = counts.get(c.id) || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return { contestant: c, count, pct };
    });
  }, [contestants, predictions]);

  if (isLoading && !event) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col">
        <HostHeader />
        <div className="flex-1 flex items-center justify-center text-ink-500 font-medium">
          Loading event…
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col">
        <HostHeader />
        <div className="flex-1 max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-danger font-medium mb-4">{error || 'Event not found'}</p>
          <Link href="/host" className="text-navy-900 underline font-semibold">
            ← Back to Events List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <HostHeader eventName={event.name} />
      <HostNavTabs eventId={eventId} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 flex flex-col gap-8">
        {error && (
          <div
            role="alert"
            className="p-4 rounded-btn bg-danger/10 border border-danger/30 text-danger text-sm font-medium"
          >
            {error}
          </div>
        )}

        {/* Top Hero Section: Join Code & Lifecycle Stepper */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Join Code Card */}
          <Card className="lg:col-span-1 bg-navy-900 text-cream-50 flex flex-col justify-between items-center text-center p-6 border-gold-500/30">
            <div>
              <p className="text-xs uppercase tracking-widest text-gold-300 font-semibold mb-2">
                Join Code
              </p>
              <div className="font-mono text-5xl sm:text-6xl font-bold tracking-widest text-cream-50 my-2 select-all">
                {event.join_code}
              </div>
              <p className="text-xs text-cream-50/70 mt-1 max-w-xs mx-auto">
                Audience & contestants join at the home page with this code.
              </p>
            </div>
            <Button
              variant="gold"
              size="md"
              onClick={handleCopyJoinCode}
              className="w-full mt-6 text-sm"
            >
              {copiedCode ? '✓ Copied to Clipboard' : 'Copy Join Code'}
            </Button>
          </Card>

          {/* Event Lifecycle Stepper */}
          <Card className="lg:col-span-2 bg-white flex flex-col justify-between p-6">
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="font-display text-2xl font-bold text-navy-900">
                    Event Status & Flow
                  </h2>
                  <p className="text-xs sm:text-sm text-ink-500">
                    Control the stage progression from setup through live competition to final standings.
                  </p>
                </div>
                <EventStatusBadge status={event.status} />
              </div>

              {/* Status Flow Indicators */}
              <div className="grid grid-cols-5 gap-2 my-6 text-center text-xs font-semibold">
                {[
                  { key: 'setup', label: '1. Setup' },
                  { key: 'predictions_open', label: '2. Predictions' },
                  { key: 'predictions_locked', label: '3. Locked' },
                  { key: 'live', label: '4. Live Contest' },
                  { key: 'finished', label: '5. Finished' },
                ].map((s) => {
                  const isCurrent = event.status === s.key;
                  return (
                    <div
                      key={s.key}
                      className={`p-2 rounded-btn border transition-colors ${
                        isCurrent
                          ? 'bg-gold-500/20 border-gold-500 text-navy-900 font-bold'
                          : 'bg-cream-100 border-navy-700/10 text-ink-500'
                      }`}
                    >
                      {s.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stepper Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-navy-700/10">
              {/* Allowed back-steps */}
              <div>
                {event.status === 'predictions_locked' && (
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() =>
                      setConfirmModal({
                        isOpen: true,
                        targetStatus: 'predictions_open',
                        title: 'Reopen Predictions?',
                        message: 'Audience members will be allowed to submit or adjust their predictions.',
                      })
                    }
                    className="text-xs sm:text-sm"
                  >
                    ← Reopen Predictions
                  </Button>
                )}
                {event.status === 'finished' && (
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() =>
                      setConfirmModal({
                        isOpen: true,
                        targetStatus: 'live',
                        title: 'Resume Contest?',
                        message: 'This will return the event to live status.',
                      })
                    }
                    className="text-xs sm:text-sm"
                  >
                    ← Resume Contest
                  </Button>
                )}
              </div>

              {/* Next forward transitions */}
              <div className="flex items-center gap-3 ml-auto">
                {event.status === 'setup' && (
                  <>
                    <Button
                      variant="gold"
                      size="md"
                      isLoading={isUpdatingStatus}
                      onClick={() => handleSetStatus('predictions_open')}
                    >
                      Open Predictions →
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      isLoading={isUpdatingStatus}
                      disabled={!isReadyForLive}
                      onClick={() => handleSetStatus('live')}
                      title={!isReadyForLive ? 'Complete Ready Check first' : ''}
                    >
                      Skip to Contest →
                    </Button>
                  </>
                )}

                {event.status === 'predictions_open' && (
                  <Button
                    variant="gold"
                    size="md"
                    isLoading={isUpdatingStatus}
                    onClick={() => handleSetStatus('predictions_locked')}
                  >
                    Lock Predictions →
                  </Button>
                )}

                {event.status === 'predictions_locked' && (
                  <Button
                    variant="gold"
                    size="md"
                    isLoading={isUpdatingStatus}
                    disabled={!isReadyForLive}
                    onClick={() => handleSetStatus('live')}
                    title={!isReadyForLive ? 'Complete Ready Check first' : ''}
                  >
                    Start Contest →
                  </Button>
                )}

                {event.status === 'live' && (
                  <>
                    <Link
                      href={`/host/${eventId}/live`}
                      className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 rounded-btn bg-gold-500 text-navy-950 font-bold hover:bg-gold-300 transition-colors text-sm shadow-sm"
                    >
                      Open Live Console ⚡
                    </Link>
                    <Button
                      variant="danger"
                      size="md"
                      onClick={() =>
                        setConfirmModal({
                          isOpen: true,
                          targetStatus: 'finished',
                          title: 'Finish Competition?',
                          message: 'All questions will be concluded and the final podium will be revealed.',
                        })
                      }
                      className="text-xs sm:text-sm"
                    >
                      Finish Contest
                    </Button>
                  </>
                )}

                {event.status === 'finished' && (
                  <Link
                    href={`/host/${eventId}/results`}
                    className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 rounded-btn bg-gold-500 text-navy-950 font-bold hover:bg-gold-300 transition-colors text-sm"
                  >
                    View Results & Raffle →
                  </Link>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-white p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-ink-500 tracking-wider">Contestants</p>
              <p className="font-display text-3xl font-bold text-navy-900 mt-1">
                {contestants.length} / 8
              </p>
              <p className="text-xs text-ink-500 mt-0.5">
                {contestants.filter((c) => c.auth_user_id).length} claimed seats
              </p>
            </div>
            <Link
              href={`/host/${eventId}/contestants`}
              className="text-xs font-semibold text-navy-900 bg-cream-100 hover:bg-cream-50 px-3 py-1.5 rounded-btn border border-navy-700/10"
            >
              Manage
            </Link>
          </Card>

          <Card className="bg-white p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-ink-500 tracking-wider">Rounds & Questions</p>
              <p className="font-display text-3xl font-bold text-navy-900 mt-1">
                {rounds.length} <span className="text-base font-normal text-ink-500">rounds</span>
              </p>
              <p className="text-xs text-ink-500 mt-0.5">
                {questions.length} total questions
              </p>
            </div>
            <Link
              href={`/host/${eventId}/rounds`}
              className="text-xs font-semibold text-navy-900 bg-cream-100 hover:bg-cream-50 px-3 py-1.5 rounded-btn border border-navy-700/10"
            >
              Manage
            </Link>
          </Card>

          <Card className="bg-white p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-ink-500 tracking-wider">Audience</p>
              <p className="font-display text-3xl font-bold text-navy-900 mt-1">
                {audience.length} / {event.max_audience}
              </p>
              <p className="text-xs text-ink-500 mt-0.5">
                {predictions.length} predictions placed
              </p>
            </div>
            <span className="text-xs font-medium text-ink-500 bg-cream-100 px-2.5 py-1 rounded-chip">
              Live
            </span>
          </Card>
        </div>

        {/* Ready Check Panel */}
        <Card
          className={`p-6 border transition-colors ${
            isReadyForLive
              ? 'bg-success/5 border-success/30'
              : 'bg-warning/5 border-warning/30'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`p-2 rounded-full text-white text-lg font-bold shrink-0 ${
                isReadyForLive ? 'bg-success' : 'bg-warning'
              }`}
            >
              {isReadyForLive ? '✓' : '!'}
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl font-bold text-navy-900">
                {isReadyForLive ? 'Ready Check Passed' : 'Ready Check: Action Required Before Starting Contest'}
              </h3>
              {isReadyForLive ? (
                <p className="text-sm text-ink-500 mt-1">
                  All requirements met: at least 2 contestants claimed, question rounds configured, and answer keys validated.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {readyCheckIssues.map((issue, idx) => (
                    <li key={idx} className="flex items-center justify-between text-sm text-ink-900">
                      <span>• {issue.text}</span>
                      <Link
                        href={issue.link}
                        className="text-xs font-semibold text-navy-900 underline hover:text-gold-500 ml-4 shrink-0"
                      >
                        Fix this →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>

        {/* Bottom Dual Panels: Predictions & Audience List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Predictions Bar List */}
          <Card className="bg-white p-6">
            <h3 className="font-display text-xl font-bold text-navy-900 mb-1">
              Audience Predictions
            </h3>
            <p className="text-xs text-ink-500 mb-4">
              Realtime breakdown of predicted champions ({predictions.length} total).
            </p>

            {contestants.length === 0 ? (
              <p className="text-sm text-ink-500 italic py-6 text-center">
                Add contestants to enable audience predictions.
              </p>
            ) : predictions.length === 0 ? (
              <p className="text-sm text-ink-500 italic py-6 text-center">
                No predictions have been submitted yet.
              </p>
            ) : (
              <div className="space-y-3">
                {predictionStats.map(({ contestant, count, pct }) => (
                  <div key={contestant.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-navy-900">
                        Seat {contestant.seat_no}: {contestant.name}
                      </span>
                      <span className="font-semibold text-ink-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-cream-100 rounded-full overflow-hidden border border-navy-700/10">
                      <div
                        className="h-full bg-gold-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Live Audience List */}
          <Card className="bg-white p-6 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display text-xl font-bold text-navy-900">
                Joined Audience Members
              </h3>
              <span className="text-xs font-semibold text-ink-500">
                {audience.length} / {event.max_audience}
              </span>
            </div>
            <p className="text-xs text-ink-500 mb-4">
              Phones connected live to this event session.
            </p>

            {audience.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-500 italic">
                Waiting for audience members to join with code{' '}
                <strong className="text-navy-900">{event.join_code}</strong>.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-navy-700/10 border border-navy-700/10 rounded-btn">
                {audience.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 flex items-center justify-between text-sm hover:bg-cream-50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-navy-900">{m.display_name}</p>
                      <p className="text-xs text-ink-500">
                        Joined {new Date(m.joined_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => handleRemoveAudience(m.id)}
                      className="text-xs text-danger hover:bg-danger/10 border-danger/20 min-h-[32px] px-2.5 py-1"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Confirmation Modal for Stepper Transitions */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-500">{confirmModal.message}</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={isUpdatingStatus}
              onClick={() => handleSetStatus(confirmModal.targetStatus)}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

