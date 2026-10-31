import { describe, it, expect } from 'vitest';
import { runLoadTest } from '../../scripts/load-test';

describe('Load Test (Phase 8 / doc 08 §5)', () => {
  it('runs load test with 8 contestants and 120 audience members and achieves P95 < 3000ms', async () => {
    const metrics = await runLoadTest({
      numContestants: 8,
      numAudience: 120,
    });

    expect(metrics.totalClients).toBe(128);
    expect(metrics.contestantCount).toBe(8);
    expect(metrics.audienceCount).toBe(120);
    expect(metrics.p95PropagationMs).toBeLessThan(3000);
    expect(metrics.droppedSubscriptions).toBe(0);
    expect(metrics.answersSubmitted).toBe(128);
    expect(metrics.answersAccepted).toBeGreaterThan(120);
  });
});

