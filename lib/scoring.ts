/**
 * Speed scoring formula per docs/04-GAME-RULES-AND-SCORING.md §4.
 *
 * M = max_points
 * m = min_points
 * T = time_limit_sec
 *
 * fraction = clamp(elapsed_ms / (T * 1000), 0, 1)
 * points = round( M - (M - m) * fraction )  [round half up]
 */
export function pointsFor(
  elapsedMs: number,
  maxPoints: number,
  minPoints: number,
  timeLimitSec: number
): number {
  const totalMs = timeLimitSec * 1000;
  if (totalMs <= 0) return minPoints;

  const fraction = Math.min(Math.max(elapsedMs / totalMs, 0), 1);
  return Math.round(maxPoints - (maxPoints - minPoints) * fraction);
}

/**
 * Leaderboard sorting and tie-break rules per docs/04-GAME-RULES-AND-SCORING.md §6:
 * - 1. total_points desc
 * - 2. correct_count desc
 * - 3. correct_ms asc (sum of elapsed_ms over correct answers; lower is better)
 * - 4. seat_no asc (last resort, deterministic)
 *
 * Ties on the first three keys are displayed with the same rank number ("=2").
 */
export interface LeaderboardInput {
  id: string;
  total_points: number;
  correct_count: number;
  correct_ms: number;
  seat_no?: number;
}

export type RankedEntry<T extends LeaderboardInput> = T & {
  rank: number;
  rankDisplay: string;
};

export function computeLeaderboard<T extends LeaderboardInput>(
  entries: T[]
): RankedEntry<T>[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    if (b.correct_count !== a.correct_count) return b.correct_count - a.correct_count;
    if (a.correct_ms !== b.correct_ms) return a.correct_ms - b.correct_ms;
    return (a.seat_no ?? 999) - (b.seat_no ?? 999);
  });

  return sorted.map((entry, idx) => {
    const firstMatchIdx = sorted.findIndex(
      (other) =>
        other.total_points === entry.total_points &&
        other.correct_count === entry.correct_count &&
        other.correct_ms === entry.correct_ms
    );
    const rank = firstMatchIdx + 1;

    const isTie = sorted.some(
      (other, otherIdx) =>
        otherIdx !== idx &&
        other.total_points === entry.total_points &&
        other.correct_count === entry.correct_count &&
        other.correct_ms === entry.correct_ms
    );

    const rankDisplay = isTie ? `=${rank}` : `${rank}`;
    return {
      ...entry,
      rank,
      rankDisplay,
    };
  });
}
