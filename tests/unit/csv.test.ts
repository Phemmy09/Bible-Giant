import { describe, it, expect } from 'vitest';
import { parseAndValidateCsv, generateRejectedCsv } from '@/lib/csv';

describe('CSV Validation (U-04 & Phase 3 Gate)', () => {
  it('U-04: flags missing correct, bad letter, gap in options, individual without assigned_seat, and unknown round_type with exact row numbers', () => {
    const csvContent = `round_position,round_title,round_type,question,option_a,option_b,option_c,option_d,option_e,correct,scripture_ref,explanation,assigned_seat,answer_mode
1,Round 1,speed,Valid question text here?,Option A,Option B,,,,A,John 1:1,Test,1,choice
1,Round 1,speed,Question with missing correct?,Option A,Option B,,,,,John 1:1,Test,1,choice
1,Round 1,speed,Question with bad letter?,Option A,Option B,,,,F,John 1:1,Test,1,choice
1,Round 1,speed,Question with gap in options?,Option A,Option B,,Option D,,B,John 1:1,Test,1,choice
2,Round 2,individual,Individual without assigned seat?,Option A,Option B,,,,A,John 1:1,Test,,choice
1,Round 1,unknown_type,Question with bad round type?,Option A,Option B,,,,A,John 1:1,Test,1,choice`;

    const result = parseAndValidateCsv(csvContent);

    expect(result.totalRows).toBe(6);
    expect(result.validRows.length).toBe(1);
    expect(result.validRows[0].rowNumber).toBe(1);

    expect(result.invalidRows.length).toBe(5);

    // Row 2: Missing correct
    const row2 = result.invalidRows.find((r) => r.rowNumber === 2);
    expect(row2).toBeDefined();
    expect(row2?.errors.some((e) => e.includes('correct option'))).toBe(true);

    // Row 3: Bad letter (F)
    const row3 = result.invalidRows.find((r) => r.rowNumber === 3);
    expect(row3).toBeDefined();
    expect(row3?.errors.some((e) => e.includes('invalid correct option'))).toBe(true);

    // Row 4: Gap in options (c missing but d present)
    const row4 = result.invalidRows.find((r) => r.rowNumber === 4);
    expect(row4).toBeDefined();
    expect(row4?.errors.some((e) => e.includes('gap in options'))).toBe(true);

    // Row 5: Individual without assigned_seat
    const row5 = result.invalidRows.find((r) => r.rowNumber === 5);
    expect(row5).toBeDefined();
    expect(row5?.errors.some((e) => e.includes('assigned_seat is required for questions in individual rounds'))).toBe(true);

    // Row 6: Unknown round_type
    const row6 = result.invalidRows.find((r) => r.rowNumber === 6);
    expect(row6).toBeDefined();
    expect(row6?.errors.some((e) => e.includes('unknown round_type'))).toBe(true);
  });

  it('Phase 3 Gate: CSV import with 2 deliberate errors reports exactly those 2 rows', () => {
    const csvWithTwoErrors = `round_position,round_title,round_type,question,option_a,option_b,option_c,option_d,option_e,correct,scripture_ref,explanation,assigned_seat,answer_mode
1,General Knowledge,speed,Who built the ark in Genesis?,Noah,Moses,David,Abraham,,A,Genesis 6:14,Noah built the ark.,,choice
1,General Knowledge,speed,Deliberate Error 1: bad letter?,Option A,Option B,,,Z,Genesis 1:1,Explanation,,choice
1,General Knowledge,speed,How many disciples did Jesus choose?,12,7,70,3,,A,Luke 6:13,He chose twelve disciples.,,choice
2,Challengers,individual,Deliberate Error 2: missing assigned seat for individual round?,Elijah,Elisha,Enoch,Isaiah,,A,2 Kings 2:11,Elijah was taken up.,,choice`;

    const result = parseAndValidateCsv(csvWithTwoErrors);

    expect(result.totalRows).toBe(4);
    expect(result.validRows.length).toBe(2);
    expect(result.invalidRows.length).toBe(2);

    expect(result.validRows.map((r) => r.rowNumber)).toEqual([1, 3]);
    expect(result.invalidRows.map((r) => r.rowNumber)).toEqual([2, 4]);

    // Check rejected CSV generation
    const rejectedCsv = generateRejectedCsv(result.invalidRows);
    expect(rejectedCsv).toContain('Deliberate Error 1');
    expect(rejectedCsv).toContain('Deliberate Error 2');
    expect(rejectedCsv).toContain('errors');
  });
});
