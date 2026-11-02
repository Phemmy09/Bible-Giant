import Papa from 'papaparse';
import mammoth from 'mammoth';
import { OptionKey } from '@/lib/types';

export interface ParsedOption {
  key: OptionKey;
  text: string;
}

export interface ParsedQuestionRow {
  id: string; // Client unique id for stable keys in preview table
  position: number;
  body: string;
  options: ParsedOption[];
  correct_key: OptionKey | null;
  scripture_ref: string | null;
  explanation: string | null;
  answer_mode: 'choice' | 'spoken';
  round_position?: number;
  round_title?: string;
  isValid: boolean;
  problem: string | null;
}

export interface ParseResult {
  ok: boolean;
  format: 'CSV' | 'DOCX' | 'PDF';
  questions: ParsedQuestionRow[];
  totalDetected: number;
  readyCount: number;
  attentionCount: number;
  error: string | null;
}

const OPTION_SEQUENCE: OptionKey[] = ['A', 'B', 'C', 'D', 'E'];

/**
 * Validates a single question row according to §4.6 and §7 rules.
 * Never guesses an answer. Produces plain English error descriptions.
 */
export function validateQuestionRow(row: Partial<ParsedQuestionRow>): {
  isValid: boolean;
  problem: string | null;
} {
  const body = (row.body || '').trim();
  if (body.length < 3) {
    return { isValid: false, problem: 'Question text is too short (min 3 characters)' };
  }

  const options = row.options || [];
  if (row.answer_mode === 'spoken') {
    return { isValid: true, problem: null };
  }

  if (options.length < 2) {
    return {
      isValid: false,
      problem: `Question must have at least 2 options (found ${options.length})`,
    };
  }

  if (options.length > 5) {
    return { isValid: false, problem: 'Question cannot have more than 5 options' };
  }

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const expectedKey = OPTION_SEQUENCE[i];
    if (opt.key !== expectedKey) {
      return {
        isValid: false,
        problem: `Option letters must be in sequence A, B, C... (found ${opt.key} at position ${i + 1})`,
      };
    }
    if (!opt.text || opt.text.trim().length === 0) {
      return { isValid: false, problem: `Option ${opt.key} text cannot be empty` };
    }
  }

  if (!row.correct_key) {
    return { isValid: false, problem: 'Missing correct answer (e.g. Answer: B)' };
  }

  const matchingOption = options.find((o) => o.key === row.correct_key);
  if (!matchingOption) {
    return {
      isValid: false,
      problem: `Answer letter "${row.correct_key}" has no matching option`,
    };
  }

  return { isValid: true, problem: null };
}

/**
 * Deterministic text parser for Word (.docx) and PDF text according to §4.6 rules.
 */
export function parseDocumentText(rawText: string, format: 'DOCX' | 'PDF'): ParseResult {
  const cleaned = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Check for scanned or empty document
  const wordsOnly = cleaned.replace(/[^a-zA-Z0-9]/g, '');
  if (wordsOnly.length < 10) {
    if (format === 'PDF') {
      return {
        ok: false,
        format,
        questions: [],
        totalDetected: 0,
        readyCount: 0,
        attentionCount: 0,
        error: 'This PDF looks like a scan and has no readable text. Please use a Word or CSV file, or type the questions.',
      };
    }
    return {
      ok: false,
      format,
      questions: [],
      totalDetected: 0,
      readyCount: 0,
      attentionCount: 0,
      error: 'No questions were found. Check the layout against the guide above.',
    };
  }

  const lines = cleaned.split('\n');
  const questionBlocks: {
    number: number;
    bodyLines: string[];
    options: { key: OptionKey; text: string }[];
    correct_key: OptionKey | null;
    scripture_ref: string | null;
    explanation: string | null;
  }[] = [];

  let currentBlock: (typeof questionBlocks)[0] | null = null;
  let currentState: 'BODY' | 'OPTION' | 'ANSWER' | 'REF' | 'EXP' = 'BODY';
  let currentOptIndex = -1;

  const questionStartRegex = /^\s*(\d+)[\.\)]\s*(.*)$/;
  const optionStartRegex = /^\s*(?:\(?([A-Ea-e])[\.\)]|\(([A-Ea-e])\))\s*(.*)$/;
  const answerRegex = /^\s*(?:Answer|Ans|Correct)\s*[:=\-]?\s*\(?([A-Ea-e])\)?\b(.*)$/i;
  const refRegex = /^\s*(?:Reference|Ref|Scripture)\s*[:=\-]?\s*(.*)$/i;
  const expRegex = /^\s*(?:Explanation|Explain|Notes?)\s*[:=\-]?\s*(.*)$/i;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue; // blank lines ignored per §4.6

    // 1. Check for Question Start ("1. ...", "1) ...")
    const qMatch = trimmed.match(questionStartRegex);
    if (qMatch) {
      if (currentBlock) {
        questionBlocks.push(currentBlock);
      }
      currentBlock = {
        number: parseInt(qMatch[1], 10),
        bodyLines: qMatch[2] ? [qMatch[2].trim()] : [],
        options: [],
        correct_key: null,
        scripture_ref: null,
        explanation: null,
      };
      currentState = 'BODY';
      currentOptIndex = -1;
      continue;
    }

    if (!currentBlock) continue;

    // 2. Check for Option ("A. ...", "(A) ...", "A) ...")
    const optMatch = trimmed.match(optionStartRegex);
    if (optMatch) {
      const letter = (optMatch[1] || optMatch[2]).toUpperCase() as OptionKey;
      const text = optMatch[3].trim();
      currentBlock.options.push({ key: letter, text });
      currentState = 'OPTION';
      currentOptIndex = currentBlock.options.length - 1;
      continue;
    }

    // 3. Check for Answer ("Answer: B", "Ans: B", "Correct: B")
    const ansMatch = trimmed.match(answerRegex);
    if (ansMatch) {
      currentBlock.correct_key = ansMatch[1].toUpperCase() as OptionKey;
      currentState = 'ANSWER';
      continue;
    }

    // 4. Check for Scripture ("Reference: John 1:1")
    const refMatch = trimmed.match(refRegex);
    if (refMatch) {
      currentBlock.scripture_ref = refMatch[1].trim() || null;
      currentState = 'REF';
      continue;
    }

    // 5. Check for Explanation ("Explanation: ...")
    const expMatch = trimmed.match(expRegex);
    if (expMatch) {
      currentBlock.explanation = expMatch[1].trim() || null;
      currentState = 'EXP';
      continue;
    }

    // 6. Continuation Lines
    if (currentState === 'BODY') {
      currentBlock.bodyLines.push(trimmed);
    } else if (currentState === 'OPTION' && currentOptIndex >= 0) {
      currentBlock.options[currentOptIndex].text += ' ' + trimmed;
    } else if (currentState === 'REF' && currentBlock.scripture_ref) {
      currentBlock.scripture_ref += ' ' + trimmed;
    } else if (currentState === 'EXP' && currentBlock.explanation) {
      currentBlock.explanation += ' ' + trimmed;
    }
  }

  if (currentBlock) {
    questionBlocks.push(currentBlock);
  }

  if (questionBlocks.length === 0) {
    return {
      ok: false,
      format,
      questions: [],
      totalDetected: 0,
      readyCount: 0,
      attentionCount: 0,
      error: 'No questions were found. Check the layout against the guide above.',
    };
  }

  const questions: ParsedQuestionRow[] = questionBlocks.map((block, idx) => {
    const body = block.bodyLines.join(' ').trim();
    const validation = validateQuestionRow({
      body,
      options: block.options,
      correct_key: block.correct_key,
      answer_mode: 'choice',
    });

    return {
      id: `q-row-${idx + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      position: idx + 1,
      body,
      options: block.options,
      correct_key: block.correct_key,
      scripture_ref: block.scripture_ref,
      explanation: block.explanation,
      answer_mode: 'choice',
      isValid: validation.isValid,
      problem: validation.problem,
    };
  });

  const readyCount = questions.filter((q) => q.isValid).length;
  const attentionCount = questions.length - readyCount;

  return {
    ok: readyCount > 0,
    format,
    questions,
    totalDetected: questions.length,
    readyCount,
    attentionCount,
    error: null,
  };
}

/**
 * Parses CSV text per doc 03 §6.
 */
export function parseCsv(csvText: string): ParseResult {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
  });

  if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
    return {
      ok: false,
      format: 'CSV',
      questions: [],
      totalDetected: 0,
      readyCount: 0,
      attentionCount: 0,
      error: parsed.errors[0]?.message || 'Failed to read CSV file.',
    };
  }

  const rows = parsed.data as Record<string, string>[];
  const questions: ParsedQuestionRow[] = [];

  rows.forEach((row, idx) => {
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
    const optA = getVal('option_a', 'option a', 'a', 'choice_a', 'opt_a');
    const optB = getVal('option_b', 'option b', 'b', 'choice_b', 'opt_b');
    const optC = getVal('option_c', 'option c', 'c', 'choice_c', 'opt_c');
    const optD = getVal('option_d', 'option d', 'd', 'choice_d', 'opt_d');
    const optE = getVal('option_e', 'option e', 'e', 'choice_e', 'opt_e');

    const rawOpts = [
      { key: 'A' as OptionKey, text: optA },
      { key: 'B' as OptionKey, text: optB },
      { key: 'C' as OptionKey, text: optC },
      { key: 'D' as OptionKey, text: optD },
      { key: 'E' as OptionKey, text: optE },
    ];

    // Find highest option index that has content
    let highestIdx = -1;
    for (let i = rawOpts.length - 1; i >= 0; i--) {
      if (rawOpts[i].text) {
        highestIdx = i;
        break;
      }
    }
    // Include all options up to highestIdx (at least A and B)
    const countToInclude = Math.max(2, highestIdx + 1);
    const options: ParsedOption[] = [];
    for (let i = 0; i < countToInclude; i++) {
      options.push(rawOpts[i]);
    }

    const rawCorrect = getVal('correct', 'correct_key', 'answer', 'key', 'correct_answer').toUpperCase();
    const correct_key = (['A', 'B', 'C', 'D', 'E'].includes(rawCorrect) ? rawCorrect : null) as OptionKey | null;

    const scripture_ref = getVal('scripture', 'scripture_ref', 'reference', 'ref', 'verse') || null;
    const explanation = getVal('explanation', 'notes', 'note', 'reason') || null;

    const rawMode = getVal('mode', 'answer_mode', 'type').toLowerCase();
    const answer_mode: 'choice' | 'spoken' = rawMode === 'spoken' ? 'spoken' : 'choice';

    const roundTitle = getVal('round', 'round_title', 'round title') || undefined;
    const roundPosStr = getVal('round_position', 'round position', 'round_pos');
    const round_position = roundPosStr ? parseInt(roundPosStr, 10) : undefined;

    const validation = validateQuestionRow({
      body,
      options,
      correct_key,
      answer_mode,
    });

    questions.push({
      id: `q-csv-${idx + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      position: idx + 1,
      body,
      options,
      correct_key,
      scripture_ref,
      explanation,
      answer_mode,
      round_title: roundTitle,
      round_position: isNaN(round_position as number) ? undefined : round_position,
      isValid: validation.isValid,
      problem: validation.problem,
    });
  });

  const readyCount = questions.filter((q) => q.isValid).length;
  const attentionCount = questions.length - readyCount;

  return {
    ok: readyCount > 0,
    format: 'CSV',
    questions,
    totalDetected: questions.length,
    readyCount,
    attentionCount,
    error: questions.length === 0 ? 'No questions were found in this CSV file.' : null,
  };
}

/**
 * Extracts raw text from PDF buffer using pdfjs-dist or pdf-parse.
 */
export async function extractPdfText(buffer: ArrayBuffer | Buffer): Promise<string> {
  const nodeBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  // Try pdf-parse (reliable in Node and tests)
  try {
    // eslint-disable-next-line
    const pdfParse = require('pdf-parse');
    const parser = new pdfParse.PDFParse({ data: nodeBuf });
    const res = await parser.getText();
    await parser.destroy().catch(() => {});
    return typeof res === 'string' ? res : res?.text || '';
  } catch {
    // Fallback: try pdfjs-dist
    try {
      const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
      const data = new Uint8Array(nodeBuf);
      const loadingTask = pdfjs.getDocument({
        data,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });
      const doc = await loadingTask.promise;
      let fullText = '';
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        fullText += strings.join(' ') + '\n';
      }
      return fullText;
    } catch (e: any) {
      throw new Error(`PDF extraction failed: ${e.message || String(e)}`);
    }
  }
}

/**
 * Main in-browser / test parser dispatcher for File or Buffer.
 */
export async function parseQuestions(
  data: Buffer | ArrayBuffer | string,
  filename: string
): Promise<ParseResult> {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (ext === 'csv') {
    const text = typeof data === 'string' ? data : Buffer.from(data as any).toString('utf-8');
    return parseCsv(text);
  }

  if (ext === 'docx') {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
    const docxResult = await mammoth.extractRawText({ buffer: buf });
    return parseDocumentText(docxResult.value, 'DOCX');
  }

  if (ext === 'pdf') {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
    const text = await extractPdfText(buf);
    return parseDocumentText(text, 'PDF');
  }

  return {
    ok: false,
    format: 'CSV',
    questions: [],
    totalDetected: 0,
    readyCount: 0,
    attentionCount: 0,
    error: `Unsupported file format ".${ext}". Please use .docx, .pdf, or .csv.`,
  };
}
