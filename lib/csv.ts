import Papa from 'papaparse';
import { z } from 'zod';
import { OptionKey } from '@/lib/types';

export interface ValidatedQuestionRow {
  round_position: number;
  round_title: string;
  round_type: 'speed' | 'individual';
  question: string;
  options: { key: OptionKey; text: string }[];
  correct: OptionKey | null;
  scripture_ref: string | null;
  explanation: string | null;
  assigned_seat: number | null;
  answer_mode: 'choice' | 'spoken';
}

export interface CsvRowResult {
  rowNumber: number; // 1-based index of data rows
  isValid: boolean;
  errors: string[];
  data?: ValidatedQuestionRow;
  rawRow: Record<string, string>;
}

export interface CsvParseResult {
  totalRows: number;
  validRows: CsvRowResult[];
  invalidRows: CsvRowResult[];
}

export function parseAndValidateCsv(csvContent: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const validRows: CsvRowResult[] = [];
  const invalidRows: CsvRowResult[] = [];

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 1;
    const errors: string[] = [];

    // 1. round_position
    const roundPosRaw = row['round_position']?.trim();
    const roundPos = parseInt(roundPosRaw || '', 10);
    if (!roundPosRaw || isNaN(roundPos) || roundPos < 1) {
      errors.push('round_position must be an integer >= 1');
    }

    // 2. round_title
    const roundTitle = row['round_title']?.trim() || `Round ${roundPos || rowNumber}`;

    // 3. round_type
    const roundTypeRaw = row['round_type']?.trim().toLowerCase() || 'speed';
    let roundType: 'speed' | 'individual' = 'speed';
    if (roundTypeRaw === 'speed' || roundTypeRaw === 'individual') {
      roundType = roundTypeRaw;
    } else {
      errors.push(`unknown round_type "${roundTypeRaw}" (must be "speed" or "individual")`);
    }

    // 4. question text
    const questionText = row['question']?.trim() || '';
    if (questionText.length < 3 || questionText.length > 400) {
      errors.push('question text must be between 3 and 400 characters');
    }

    // 5. answer_mode
    const answerModeRaw = row['answer_mode']?.trim().toLowerCase() || 'choice';
    let answerMode: 'choice' | 'spoken' = 'choice';
    if (answerModeRaw === 'choice' || answerModeRaw === 'spoken') {
      answerMode = answerModeRaw;
    } else {
      errors.push(`invalid answer_mode "${answerModeRaw}" (must be "choice" or "spoken")`);
    }

    // 6. options
    const optA = row['option_a']?.trim();
    const optB = row['option_b']?.trim();
    const optC = row['option_c']?.trim();
    const optD = row['option_d']?.trim();
    const optE = row['option_e']?.trim();

    const options: { key: OptionKey; text: string }[] = [];
    if (answerMode === 'choice') {
      if (!optA) errors.push('option_a is required for choice mode');
      if (!optB) errors.push('option_b is required for choice mode');

      if (optA) options.push({ key: 'A', text: optA });
      if (optB) options.push({ key: 'B', text: optB });

      // Check gap rule: no gaps (c before d before e)
      if (!optC && optD) {
        errors.push('gap in options: option_c is missing but option_d is present');
      }
      if (!optD && optE) {
        errors.push('gap in options: option_d is missing but option_e is present');
      }
      if (!optC && optE) {
        errors.push('gap in options: option_c is missing but option_e is present');
      }

      if (optC) options.push({ key: 'C', text: optC });
      if (optD && optC) options.push({ key: 'D', text: optD });
      if (optE && optD && optC) options.push({ key: 'E', text: optE });
    }

    // 7. correct key
    const correctRaw = row['correct']?.trim().toUpperCase() || '';
    let correctKey: OptionKey | null = null;
    if (answerMode === 'choice') {
      if (!correctRaw) {
        errors.push('correct option (A–E) is required for choice questions');
      } else if (!['A', 'B', 'C', 'D', 'E'].includes(correctRaw)) {
        errors.push(`invalid correct option "${correctRaw}" (must be A, B, C, D, or E)`);
      } else {
        const matchingOpt = options.find((o) => o.key === correctRaw);
        if (!matchingOpt) {
          errors.push(`correct option "${correctRaw}" references a non-existent option`);
        } else {
          correctKey = correctRaw as OptionKey;
        }
      }
    }

    // 8. assigned_seat (required for individual rounds)
    const seatRaw = row['assigned_seat']?.trim();
    let assignedSeat: number | null = null;
    if (seatRaw) {
      const s = parseInt(seatRaw, 10);
      if (isNaN(s) || s < 1 || s > 8) {
        errors.push('assigned_seat must be an integer between 1 and 8');
      } else {
        assignedSeat = s;
      }
    }

    if (roundType === 'individual' && !assignedSeat) {
      errors.push('assigned_seat is required for questions in individual rounds');
    }

    const result: CsvRowResult = {
      rowNumber,
      isValid: errors.length === 0,
      errors,
      rawRow: row,
    };

    if (errors.length === 0) {
      result.data = {
        round_position: roundPos,
        round_title: roundTitle,
        round_type: roundType,
        question: questionText,
        options,
        correct: correctKey,
        scripture_ref: row['scripture_ref']?.trim() || null,
        explanation: row['explanation']?.trim() || null,
        assigned_seat: assignedSeat,
        answer_mode: answerMode,
      };
      validRows.push(result);
    } else {
      invalidRows.push(result);
    }
  });

  return {
    totalRows: parsed.data.length,
    validRows,
    invalidRows,
  };
}

export function generateRejectedCsv(invalidRows: CsvRowResult[]): string {
  const exportData = invalidRows.map((r) => ({
    ...r.rawRow,
    errors: r.errors.join('; '),
  }));
  return Papa.unparse(exportData);
}

