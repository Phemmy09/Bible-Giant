import { describe, it, expect } from 'vitest';
import { pointsFor, computeLeaderboard } from '@/lib/scoring';

describe('Scoring: pointsFor (U-01, U-02)', () => {
  it('U-01: calculates expected points for M=100, m=40, T=20', () => {
    expect(pointsFor(0, 100, 40, 20)).toBe(100);
    expect(pointsFor(2000, 100, 40, 20)).toBe(94);
    expect(pointsFor(4000, 100, 40, 20)).toBe(88);
    expect(pointsFor(10000, 100, 40, 20)).toBe(70);
    expect(pointsFor(15000, 100, 40, 20)).toBe(55);
    expect(pointsFor(20000, 100, 40, 20)).toBe(40);
    // Clamping above limit
    expect(pointsFor(25000, 100, 40, 20)).toBe(40);
  });

  it('U-02: calculates expected points for M=50, m=10, T=10 at 5000ms', () => {
    expect(pointsFor(5000, 50, 10, 10)).toBe(30);
  });
});

describe('Leaderboard: computeLeaderboard (U-03)', () => {
  it('U-03: sorts by points, then correct_count, then correct_ms, then seat_no; uses "=" for equal first three keys', () => {
    const rawContestants = [
      { id: 'c3', seat_no: 3, total_points: 150, correct_count: 2, correct_ms: 5000 },
      { id: 'c1', seat_no: 1, total_points: 200, correct_count: 2, correct_ms: 4000 },
      { id: 'c4', seat_no: 4, total_points: 150, correct_count: 2, correct_ms: 5000 },
      { id: 'c2', seat_no: 2, total_points: 200, correct_count: 3, correct_ms: 6000 },
      { id: 'c5', seat_no: 5, total_points: 150, correct_count: 2, correct_ms: 6000 },
    ];

    const result = computeLeaderboard(rawContestants);

    // Order expected:
    // 1st: c2 (200 pts, 3 correct) -> rank 1 ("1")
    // 2nd: c1 (200 pts, 2 correct) -> rank 2 ("2")
    // 3rd: c3 (150 pts, 2 correct, 5000 ms, seat 3) -> rank 3 ("=3")
    // 4th: c4 (150 pts, 2 correct, 5000 ms, seat 4) -> rank 3 ("=3")
    // 5th: c5 (150 pts, 2 correct, 6000 ms, seat 5) -> rank 5 ("5")

    expect(result[0].id).toBe('c2');
    expect(result[0].rank).toBe(1);
    expect(result[0].rankDisplay).toBe('1');

    expect(result[1].id).toBe('c1');
    expect(result[1].rank).toBe(2);
    expect(result[1].rankDisplay).toBe('2');

    expect(result[2].id).toBe('c3');
    expect(result[2].rank).toBe(3);
    expect(result[2].rankDisplay).toBe('=3');

    expect(result[3].id).toBe('c4');
    expect(result[3].rank).toBe(3);
    expect(result[3].rankDisplay).toBe('=3');

    expect(result[4].id).toBe('c5');
    expect(result[4].rank).toBe(5);
    expect(result[4].rankDisplay).toBe('5');
  });

  it('U-03: handles top tie correctly with =1', () => {
    const raw = [
      { id: 'c2', seat_no: 2, total_points: 100, correct_count: 1, correct_ms: 2000 },
      { id: 'c1', seat_no: 1, total_points: 100, correct_count: 1, correct_ms: 2000 },
    ];
    const res = computeLeaderboard(raw);
    expect(res[0].id).toBe('c1'); // seat 1 first
    expect(res[0].rankDisplay).toBe('=1');
    expect(res[1].id).toBe('c2'); // seat 2 second
    expect(res[1].rankDisplay).toBe('=1');
  });
});
