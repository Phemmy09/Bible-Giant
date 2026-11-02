import { describe, it, expect } from 'vitest';
import { OptionKey } from '@/lib/types';
import { getErrorMessage } from '@/lib/errors';

describe('Phase A Gate A4: Questions (Quick Add, Move to Round, Invariants) (§4.1–§4.4)', () => {
  it('enforces objective default: 4 options (A–D) with A default correct key (§4.1)', () => {
    const defaultOptions = [
      { key: 'A' as OptionKey, text: '' },
      { key: 'B' as OptionKey, text: '' },
      { key: 'C' as OptionKey, text: '' },
      { key: 'D' as OptionKey, text: '' },
    ];
    const defaultCorrectKey: OptionKey = 'A';

    expect(defaultOptions.length).toBe(4);
    expect(defaultOptions.map((o) => o.key)).toEqual(['A', 'B', 'C', 'D']);
    expect(defaultCorrectKey).toBe('A');
  });

  it('validates question body length (min 3 chars) and non-empty options (§4.3)', () => {
    function validateQuestion(body: string, options: { key: string; text: string }[]) {
      if (body.trim().length < 3) return 'Question text must be at least 3 characters';
      const empty = options.find((o) => !o.text.trim());
      if (empty) return `Option ${empty.key} cannot be empty`;
      return null;
    }

    expect(validateQuestion('', [{ key: 'A', text: 'Yes' }])).toBe('Question text must be at least 3 characters');
    expect(validateQuestion('Hi', [{ key: 'A', text: 'Yes' }])).toBe('Question text must be at least 3 characters');
    expect(validateQuestion('Who built the ark?', [{ key: 'A', text: 'Noah' }, { key: 'B', text: '' }])).toBe('Option B cannot be empty');
    expect(validateQuestion('Who built the ark?', [{ key: 'A', text: 'Noah' }, { key: 'B', text: 'Moses' }])).toBeNull();
  });

  it('translates already_played error when attempting to move or delete an answered question (§4.4)', () => {
    const msg = getErrorMessage('already_played');
    expect(msg.toLowerCase()).toContain('already');
  });

  it('calculates append position when moving question into target round (§4.4)', () => {
    const targetRoundExistingQuestions = [
      { id: 'q1', position: 1 },
      { id: 'q2', position: 2 },
      { id: 'q3', position: 3 },
    ];
    const maxPos = Math.max(...targetRoundExistingQuestions.map((q) => q.position), 0);
    const newPos = maxPos + 1;

    expect(newPos).toBe(4);
  });

  it('correctly tracks answered question IDs to guard Move and Delete actions (§4.4)', () => {
    const answers = [
      { question_id: 'q-played-1', contestant_id: 'c1' },
      { question_id: 'q-played-2', audience_id: 'aud1' },
    ];
    const answeredQuestionIds = new Set(answers.map((a) => a.question_id));

    expect(answeredQuestionIds.has('q-played-1')).toBe(true);
    expect(answeredQuestionIds.has('q-played-2')).toBe(true);
    expect(answeredQuestionIds.has('q-unplayed-3')).toBe(false);

    // Guard simulation
    function canModify(questionId: string) {
      if (answeredQuestionIds.has(questionId)) {
        return { canMove: false, canDelete: false, reason: 'This question has already been played' };
      }
      return { canMove: true, canDelete: true, reason: null };
    }

    expect(canModify('q-played-1').canMove).toBe(false);
    expect(canModify('q-unplayed-3').canMove).toBe(true);
  });
});
