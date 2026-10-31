import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
// eslint-disable-next-line
const pdfParse = require('pdf-parse');

export interface ParsedQuestionItem {
  id?: string;
  position: number;
  body: string;
  options: { key: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correct_key: 'A' | 'B' | 'C' | 'D' | null;
  scripture_ref: string | null;
  explanation: string | null;
  answer_mode: 'choice' | 'spoken';
  round_title?: string;
  round_position?: number;
}

export interface ParseResult {
  ok: boolean;
  questions: ParsedQuestionItem[];
  detectedFormat: string;
  errors: string[];
  totalParsed: number;
}

/**
 * Main entry point: parses questions from Buffer and filename/mimetype
 */
export async function parseQuestionsFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<ParseResult> {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const errors: string[] = [];

  try {
    if (ext === 'xlsx' || ext === 'xls') {
      return parseExcelBuffer(buffer);
    } else if (ext === 'csv') {
      const text = buffer.toString('utf-8');
      return parseCsvText(text);
    } else if (ext === 'docx') {
      const docxResult = await mammoth.extractRawText({ buffer });
      const rawText = docxResult.value;
      return parseDocumentText(rawText, 'Word Document (.docx)');
    } else if (ext === 'pdf') {
      const pdfData = await pdfParse(buffer);
      const rawText = pdfData.text;
      return parseDocumentText(rawText, 'PDF Document (.pdf)');
    } else {
      // Fallback: try reading as plain text or parsing strings
      const rawText = buffer.toString('utf-8');
      return parseDocumentText(rawText, 'Text Document');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown parsing error';
    return {
      ok: false,
      questions: [],
      detectedFormat: ext.toUpperCase(),
      errors: [msg],
      totalParsed: 0,
    };
  }
}

/**
 * Parse Excel Spreadsheets (.xlsx, .xls)
 */
function parseExcelBuffer(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { ok: false, questions: [], detectedFormat: 'Excel', errors: ['No sheet found in workbook'], totalParsed: 0 };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return parseTableRows(rows, 'Excel (.xlsx)');
}

/**
 * Parse CSV format
 */
function parseCsvText(text: string): ParseResult {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
    return {
      ok: false,
      questions: [],
      detectedFormat: 'CSV',
      errors: parsed.errors.map((e) => e.message),
      totalParsed: 0,
    };
  }
  return parseTableRows(parsed.data as Record<string, any>[], 'CSV (.csv)');
}

/**
 * Maps arbitrary table column names flexibly
 */
function parseTableRows(rows: Record<string, any>[], formatName: string): ParseResult {
  const questions: ParsedQuestionItem[] = [];
  const errors: string[] = [];

  rows.forEach((row, idx) => {
    // Fuzzy column locator
    const getVal = (...keys: string[]) => {
      for (const k of keys) {
        for (const rowKey of Object.keys(row)) {
          if (rowKey.trim().toLowerCase() === k.toLowerCase()) {
            return String(row[rowKey] || '').trim();
          }
        }
      }
      return '';
    };

    const body = getVal('question', 'question_body', 'body', 'question text', 'question_text', 'prompt');
    if (!body) return; // Skip empty question rows

    const optA = getVal('option_a', 'option a', 'a', 'choice_a', 'opt_a');
    const optB = getVal('option_b', 'option b', 'b', 'choice_b', 'opt_b');
    const optC = getVal('option_c', 'option c', 'c', 'choice_c', 'opt_c');
    const optD = getVal('option_d', 'option d', 'd', 'choice_d', 'opt_d');

    const options: { key: 'A' | 'B' | 'C' | 'D'; text: string }[] = [];
    if (optA) options.push({ key: 'A', text: optA });
    if (optB) options.push({ key: 'B', text: optB });
    if (optC) options.push({ key: 'C', text: optC });
    if (optD) options.push({ key: 'D', text: optD });

    const rawCorrect = getVal('correct', 'correct_key', 'answer', 'key', 'correct_answer').toUpperCase();
    const correct_key = (['A', 'B', 'C', 'D'].includes(rawCorrect) ? rawCorrect : null) as 'A' | 'B' | 'C' | 'D' | null;

    const scripture_ref = getVal('scripture', 'scripture_ref', 'reference', 'ref', 'verse') || null;
    const explanation = getVal('explanation', 'notes', 'note', 'reason') || null;

    const rawMode = getVal('mode', 'answer_mode', 'type').toLowerCase();
    const answer_mode: 'choice' | 'spoken' = rawMode === 'spoken' || options.length === 0 ? 'spoken' : 'choice';

    const roundTitle = getVal('round', 'round_title', 'round title') || undefined;
    const roundPosStr = getVal('round_position', 'round position', 'round_pos');
    const round_position = roundPosStr ? parseInt(roundPosStr, 10) : undefined;

    questions.push({
      position: idx + 1,
      body,
      options,
      correct_key,
      scripture_ref,
      explanation,
      answer_mode,
      round_title: roundTitle,
      round_position: isNaN(round_position as number) ? undefined : round_position,
    });
  });

  return {
    ok: questions.length > 0,
    questions,
    detectedFormat: formatName,
    errors,
    totalParsed: questions.length,
  };
}

/**
 * Intelligent text parser for PDF, DOCX, DOC and plain text
 * Understands multiple numbering styles and option formatting
 */
export function parseDocumentText(text: string, formatName: string): ParseResult {
  const questions: ParsedQuestionItem[] = [];
  const errors: string[] = [];

  // Normalize line breaks
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into question chunks using numbered regex (e.g. "1.", "Q1:", "Question 1:", or double newlines)
  const pattern = /(?:^|\n)(?:Q(?:uestion)?\s*\d+[:.]|\d+[\.)])\s+/i;
  const rawChunks = cleaned.split(pattern).filter((c) => c.trim().length > 10);

  // If no numbered chunks found, split by double empty lines
  const chunks = rawChunks.length >= 2 ? rawChunks : cleaned.split(/\n\s*\n/).filter((c) => c.trim().length > 10);

  chunks.forEach((chunk, idx) => {
    const lines = chunk
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    let body = '';
    let scripture_ref: string | null = null;
    let explanation: string | null = null;
    let correct_key: 'A' | 'B' | 'C' | 'D' | null = null;
    const options: { key: 'A' | 'B' | 'C' | 'D'; text: string }[] = [];

    // Temporary store for lines that form the question body
    const bodyLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 1. Detect Option A, B, C, D
      const optMatch = line.match(/^([A-D])[\.\)\:\-]\s*(.+)$/i) || line.match(/^\[([A-D])\]\s*(.+)$/i);
      if (optMatch) {
        const key = optMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        const optText = optMatch[2].trim();
        options.push({ key, text: optText });
        continue;
      }

      // 2. Detect Scripture Reference
      const refMatch = line.match(/^(?:Scripture|Ref|Reference|Verse)[\:\-]\s*(.+)$/i);
      if (refMatch) {
        scripture_ref = refMatch[1].trim();
        continue;
      }

      // 3. Detect Correct Answer
      const ansMatch = line.match(/^(?:Answer|Correct|Key|Ans)[\:\-]\s*([A-D])/i);
      if (ansMatch) {
        correct_key = ansMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        continue;
      }

      // 4. Detect Explanation
      const expMatch = line.match(/^(?:Explanation|Note|Notes)[\:\-]\s*(.+)$/i);
      if (expMatch) {
        explanation = expMatch[1].trim();
        continue;
      }

      // If we haven't seen any options yet, it's part of the question body
      if (options.length === 0) {
        bodyLines.push(line);
      }
    }

    body = bodyLines.join(' ').trim();

    // Check if scripture ref is embedded in parentheses in the question, e.g. "Who was swallowed by a great fish? (Jonah 1:17)"
    if (!scripture_ref) {
      const inlineRef = body.match(/\(([1-3]?\s*[A-Za-z]+\s+\d+:\d+(?:-\d+)?)\)$/);
      if (inlineRef) {
        scripture_ref = inlineRef[1];
        body = body.replace(/\(([1-3]?\s*[A-Za-z]+\s+\d+:\d+(?:-\d+)?)\)$/, '').trim();
      }
    }

    if (body.length > 5) {
      questions.push({
        position: idx + 1,
        body,
        options,
        correct_key,
        scripture_ref,
        explanation,
        answer_mode: options.length > 0 ? 'choice' : 'spoken',
      });
    }
  });

  return {
    ok: questions.length > 0,
    questions,
    detectedFormat: formatName,
    errors,
    totalParsed: questions.length,
  };
}
