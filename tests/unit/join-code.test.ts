import { describe, it, expect } from 'vitest';
import { generateJoinCode, isValidJoinCode, JOIN_CODE_CHARS } from '@/lib/joinCode';

describe('Join Code Generator (U-06)', () => {
  const FORBIDDEN_CHARS = ['0', 'O', '1', 'I', 'L'];

  it('never produces 0, O, 1, I, L across 1000 generated codes', () => {
    for (let i = 0; i < 1000; i++) {
      const code = generateJoinCode();
      expect(code.length).toBe(5);
      for (const char of FORBIDDEN_CHARS) {
        expect(code).not.toContain(char);
      }
      expect(isValidJoinCode(code)).toBe(true);
    }
  });

  it('rejects codes containing forbidden characters or invalid length', () => {
    expect(isValidJoinCode('ABCDE')).toBe(true);
    expect(isValidJoinCode('ABCD0')).toBe(false);
    expect(isValidJoinCode('ABCD1')).toBe(false);
    expect(isValidJoinCode('ABCDO')).toBe(false);
    expect(isValidJoinCode('ABCDI')).toBe(false);
    expect(isValidJoinCode('ABCDL')).toBe(false);
    expect(isValidJoinCode('ABCD')).toBe(false);
    expect(isValidJoinCode('ABCDEF')).toBe(false);
  });
});

