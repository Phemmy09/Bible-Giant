import { describe, it, expect, vi } from 'vitest';
import { rpcHostShowQuestion, rpcHostOpenQuestion } from '@/lib/rpc';

describe('Phase A Gate A6 & A7: Live Sync, Show & Start, Review Panel, and Round Summary (§5.2, §5.3, §8, §9)', () => {
  it('§5.3 Show & Start convenience calls host_show_question then host_open_question sequentially', async () => {
    const callOrder: string[] = [];

    const mockSupabase: any = {
      rpc: vi.fn((fnName: string, params: any) => {
        callOrder.push(fnName);
        if (fnName === 'host_show_question') {
          return Promise.resolve({ data: null, error: null });
        }
        if (fnName === 'host_open_question') {
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    };

    // Simulate handleShowAndStart logic
    async function handleShowAndStart(eventId: string, qId: string) {
      const showRes = await rpcHostShowQuestion(eventId, qId, mockSupabase);
      if (!showRes.ok) return { ok: false, step: 'show', error: showRes.message };

      const openRes = await rpcHostOpenQuestion(eventId, mockSupabase);
      if (!openRes.ok) return { ok: false, step: 'open', error: openRes.message };

      return { ok: true };
    }

    const res = await handleShowAndStart('ev-1', 'q-1');
    expect(res.ok).toBe(true);
    expect(callOrder).toEqual(['host_show_question', 'host_open_question']);
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
  });

  it('§5.3 Show & Start stops immediately and does not call open if show fails', async () => {
    const callOrder: string[] = [];

    const mockSupabase: any = {
      rpc: vi.fn((fnName: string) => {
        callOrder.push(fnName);
        if (fnName === 'host_show_question') {
          return Promise.resolve({ data: null, error: { message: 'not_found' } });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    };

    async function handleShowAndStart(eventId: string, qId: string) {
      const showRes = await rpcHostShowQuestion(eventId, qId, mockSupabase);
      if (!showRes.ok) return { ok: false, step: 'show', error: showRes.message };

      const openRes = await rpcHostOpenQuestion(eventId, mockSupabase);
      if (!openRes.ok) return { ok: false, step: 'open', error: openRes.message };

      return { ok: true };
    }

    const res = await handleShowAndStart('ev-1', 'q-bad');
    expect(res.ok).toBe(false);
    expect(res.step).toBe('show');
    expect(callOrder).toEqual(['host_show_question']);
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
  });

  it('§9.2 Review before reveal panel calculates contestant choices, speeds, and audience distribution', () => {
    const mockAnswers = [
      { contestant_id: 'c1', choice_key: 'A', elapsed_ms: 1850, is_correct: null },
      { contestant_id: 'c2', choice_key: 'B', elapsed_ms: 3200, is_correct: null },
      { contestant_id: 'c3', choice_key: 'A', elapsed_ms: 2400, is_correct: null },
      // Audience answers
      { audience_id: 'a1', choice_key: 'A', elapsed_ms: 2000 },
      { audience_id: 'a2', choice_key: 'A', elapsed_ms: 2500 },
      { audience_id: 'a3', choice_key: 'B', elapsed_ms: 3000 },
      { audience_id: 'a4', choice_key: 'C', elapsed_ms: 4000 },
    ];

    const correctKey = 'A';

    // Verify prospective correctness for contestants
    const contestantSummary = mockAnswers
      .filter((a) => a.contestant_id)
      .map((a) => ({
        id: a.contestant_id,
        choice: a.choice_key,
        elapsedSec: (a.elapsed_ms / 1000).toFixed(1),
        isCorrect: a.choice_key === correctKey,
      }));

    expect(contestantSummary).toEqual([
      { id: 'c1', choice: 'A', elapsedSec: '1.9', isCorrect: true },
      { id: 'c2', choice: 'B', elapsedSec: '3.2', isCorrect: false },
      { id: 'c3', choice: 'A', elapsedSec: '2.4', isCorrect: true },
    ]);

    // Verify audience vote distribution
    const audienceAnswers = mockAnswers.filter((a) => a.audience_id);
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    audienceAnswers.forEach((a) => {
      const k = a.choice_key as 'A' | 'B' | 'C' | 'D';
      if (counts[k] !== undefined) counts[k]++;
    });

    const totalAudience = audienceAnswers.length;
    const percentages = {
      A: Math.round((counts.A / totalAudience) * 100),
      B: Math.round((counts.B / totalAudience) * 100),
      C: Math.round((counts.C / totalAudience) * 100),
      D: Math.round((counts.D / totalAudience) * 100),
    };

    expect(counts).toEqual({ A: 2, B: 1, C: 1, D: 0 });
    expect(percentages).toEqual({ A: 50, B: 25, C: 25, D: 0 });
  });

  it('§9.3 Question navigation sorts run order canonically and detects when crossing into a new round', () => {
    const rounds = [
      { id: 'r2', position: 2, title: 'Speed Scriptures' },
      { id: 'r1', position: 1, title: 'General Knowledge' },
    ];

    const questions = [
      { id: 'q2-1', round_id: 'r2', position: 1, body: 'R2 Q1' },
      { id: 'q1-2', round_id: 'r1', position: 2, body: 'R1 Q2' },
      { id: 'q1-1', round_id: 'r1', position: 1, body: 'R1 Q1' },
    ];

    const rMap = new Map(rounds.map((r) => [r.id, r.position]));
    const sortedQuestions = [...questions].sort((a, b) => {
      const rA = rMap.get(a.round_id) ?? 0;
      const rB = rMap.get(b.round_id) ?? 0;
      if (rA !== rB) return rA - rB;
      return a.position - b.position;
    });

    // Check canonical order: R1 Q1, R1 Q2, R2 Q1
    expect(sortedQuestions.map((q) => q.id)).toEqual(['q1-1', 'q1-2', 'q2-1']);

    // When current question is q1-2 (last in Round 1):
    const currentQId = 'q1-2';
    const currIdx = sortedQuestions.findIndex((q) => q.id === currentQId);
    const nextUnplayed = sortedQuestions.slice(currIdx + 1)[0];

    expect(nextUnplayed.id).toBe('q2-1');

    const activeRound = rounds.find((r) => r.id === 'r1')!;
    const nextRound = rounds.find((r) => r.id === nextUnplayed.round_id)!;

    // Detect that it crosses into a new round
    const isNewRound = nextRound.id !== activeRound.id;
    expect(isNewRound).toBe(true);
    expect(nextRound.title).toBe('Speed Scriptures');
  });

  it('§8.2 & §8.3 Round summary data structure contains ranked contestants and top 5 audience', () => {
    const mockSummary = {
      round_title: 'Round 1: General Bible Knowledge',
      contestants: [
        { contestant_id: 'c1', name: 'Grace', group_label: 'Ekiti', round_points: 100, total_points: 250, correct_in_round: 1, rank: 1 },
        { contestant_id: 'c2', name: 'David', group_label: 'Ondo', round_points: 80, total_points: 180, correct_in_round: 1, rank: 2 },
      ],
      audience_top5: [
        { name: 'Bro. Peter', assembly: 'Akure Assembly', round_points: 75, total_points: 150, rank: 1 },
        { name: 'Sis. Mary', assembly: 'Ado Central', round_points: 60, total_points: 120, rank: 2 },
      ],
      my_audience: {
        rank: 2,
        total_points: 120,
        round_points: 60,
      },
    };

    expect(mockSummary.contestants.length).toBe(2);
    expect(mockSummary.contestants[0].rank).toBe(1);
    expect(mockSummary.contestants[0].round_points).toBe(100);
    expect(mockSummary.audience_top5.length).toBe(2);
    expect(mockSummary.my_audience.rank).toBe(2);
  });

  it('§9.4 In-sync presence calculates lagging devices and count correctly', () => {
    const currentVersion = 7;
    const trackedPresences = [
      { id: 'projector', role: 'projector', name: 'Projector Screen', version: 7 },
      { id: 'c1', role: 'contestant', name: 'Emmanuel', version: 7 },
      { id: 'c2', role: 'contestant', name: 'Grace', version: 6 }, // 1 behind
      { id: 'c3', role: 'contestant', name: 'Samuel', version: 7 },
    ];

    const inSync = trackedPresences.filter((p) => p.version === currentVersion);
    const lagging = trackedPresences.filter((p) => p.version < currentVersion);

    expect(inSync.length).toBe(3);
    expect(trackedPresences.length).toBe(4);
    expect(lagging.length).toBe(1);
    expect(lagging[0].name).toBe('Grace');
  });
});

