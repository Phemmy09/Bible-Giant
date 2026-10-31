import { describe, it, expect } from 'vitest';
import { ERROR_MESSAGES, getErrorMessage, DEFAULT_ERROR_MESSAGE } from '@/lib/errors';

describe('Error mapping (U-05)', () => {
  const doc02Codes = [
    'closed',
    'late',
    'already_answered',
    'not_joined',
    'not_your_question',
    'bad_pin',
    'locked_out',
    'audience_full',
    'no_event',
    'not_owner',
  ];

  it('covers every error code listed in doc 02 §10', () => {
    for (const code of doc02Codes) {
      expect(ERROR_MESSAGES[code], `Missing error message for code: ${code}`).toBeDefined();
      expect(typeof ERROR_MESSAGES[code]).toBe('string');
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0);
    }
  });

  it('returns appropriate message for mapped and unknown codes', () => {
    expect(getErrorMessage('bad_pin')).toBe('Wrong PIN. Please try again.');
    expect(getErrorMessage('unknown_random_error')).toBe(DEFAULT_ERROR_MESSAGE);
    expect(getErrorMessage(null)).toBe(DEFAULT_ERROR_MESSAGE);
  });
});

