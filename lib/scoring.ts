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

