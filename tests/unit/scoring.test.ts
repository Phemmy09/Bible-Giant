import { describe, it, expect } from 'vitest';
import { pointsFor } from '@/lib/scoring';

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

