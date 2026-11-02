import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  parseQuestions,
  parseDocumentText,
  parseCsv,
  validateQuestionRow,
  ParsedQuestionRow,
} from '@/lib/parsers';

const fixturesDir = path.join(__dirname, '..', 'fixtures');

describe('Phase A Gate A5: Question Parsers & Import (U-A01–U-A06) (§4.5–§4.7, §10.2)', () => {
  // U-A01
  it('U-A01 DOCX parser: a fixture with 5 questions in the §4.6 layout yields 5 correct questions', async () => {
    const docxPath = path.join(fixturesDir, '5-questions.docx');
    const buf = fs.readFileSync(docxPath);

    const res = await parseQuestions(buf, '5-questions.docx');
    expect(res.format).toBe('DOCX');
    expect(res.questions.length).toBe(5);
    expect(res.readyCount).toBe(5);
    expect(res.attentionCount).toBe(0);
    expect(res.questions.every((q) => q.isValid)).toBe(true);

    // Verify content of first question
    const q1 = res.questions[0];
    expect(q1.body).toContain('In the beginning was the Word');
    expect(q1.options.length).toBe(4);
    expect(q1.options[0].text).toBe('Jesus Christ');
    expect(q1.correct_key).toBe('A');
    expect(q1.scripture_ref).toBe('John 1:1');
    expect(q1.explanation).toContain('Jesus Christ');

    // Verify content of second question
    const q2 = res.questions[1];
    expect(q2.body).toContain('How many days and nights did it rain');
    expect(q2.correct_key).toBe('B');
    expect(q2.scripture_ref).toBe('Genesis 7:12');
  });

  // U-A02
  it('U-A02 PDF parser: a text PDF fixture with the same content yields the same 5 questions', async () => {
    const pdfPath = path.join(fixturesDir, '5-questions.pdf');
    const buf = fs.readFileSync(pdfPath);

    const res = await parseQuestions(buf, '5-questions.pdf');
    expect(res.format).toBe('PDF');
    expect(res.questions.length).toBe(5);
    expect(res.readyCount).toBe(5);
    expect(res.attentionCount).toBe(0);
    expect(res.questions.every((q) => q.isValid)).toBe(true);

    expect(res.questions[0].correct_key).toBe('A');
    expect(res.questions[1].correct_key).toBe('B');
    expect(res.questions[2].correct_key).toBe('A');
    expect(res.questions[3].correct_key).toBe('C');
    expect(res.questions[4].correct_key).toBe('B');
  });

  // U-A03
  it('U-A03 Scanned/empty PDF fixture yields the "looks like a scan" message and zero questions', async () => {
    const emptyPdfPath = path.join(fixturesDir, 'scanned-empty.pdf');
    const buf = fs.readFileSync(emptyPdfPath);

    const res = await parseQuestions(buf, 'scanned-empty.pdf');
    expect(res.format).toBe('PDF');
    expect(res.questions.length).toBe(0);
    expect(res.readyCount).toBe(0);
    expect(res.error).toBe(
      'This PDF looks like a scan and has no readable text. Please use a Word or CSV file, or type the questions.'
    );
  });

  // U-A04
  it('U-A04 Bad fixtures: question with 1 option, answer letter E with only 4 options, missing Answer — each flagged ✗ with the right message', async () => {
    const badDocxPath = path.join(fixturesDir, 'bad-questions.docx');
    const buf = fs.readFileSync(badDocxPath);

    const res = await parseQuestions(buf, 'bad-questions.docx');
    expect(res.questions.length).toBe(3);
    expect(res.readyCount).toBe(0);
    expect(res.attentionCount).toBe(3);

    // Q1: only 1 option
    const q1 = res.questions[0];
    expect(q1.isValid).toBe(false);
    expect(q1.problem).toContain('must have at least 2 options');

    // Q2: answer letter E with 4 options A-D
    const q2 = res.questions[1];
    expect(q2.isValid).toBe(false);
    expect(q2.problem).toContain('Answer letter "E" has no matching option');

    // Q3: missing answer
    const q3 = res.questions[2];
    expect(q3.isValid).toBe(false);
    expect(q3.problem).toContain('Missing correct answer');
  });

  // U-A05
  it('U-A05 CSV fixture with 2 deliberate errors reports exactly those 2 rows', async () => {
    const csvPath = path.join(fixturesDir, 'sample-with-errors.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    const res = parseCsv(csvContent);
    expect(res.format).toBe('CSV');
    expect(res.questions.length).toBe(5);
    expect(res.readyCount).toBe(3);
    expect(res.attentionCount).toBe(2);

    // Row 2 has missing option B
    expect(res.questions[1].isValid).toBe(false);
    expect(res.questions[1].problem).toContain('text cannot be empty');

    // Row 4 has invalid correct key Z
    expect(res.questions[3].isValid).toBe(false);
    expect(res.questions[3].problem).toContain('Missing correct answer');

    // Valid rows
    expect(res.questions[0].isValid).toBe(true);
    expect(res.questions[2].isValid).toBe(true);
    expect(res.questions[4].isValid).toBe(true);
  });

  // U-A06
  it('U-A06 Round-trip: parse → preview edit → import payload preparation results in exactly the edited text', async () => {
    const csvPath = path.join(fixturesDir, 'sample-with-errors.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    const res = parseCsv(csvContent);
    const rowToEdit = { ...res.questions[1] };
    expect(rowToEdit.isValid).toBe(false);

    // Operator fixes the error in the preview table
    rowToEdit.options = [
      { key: 'A', text: 'First option' },
      { key: 'B', text: 'Fixed second option' },
    ];
    rowToEdit.body = 'Corrected question text';
    rowToEdit.correct_key = 'B';

    // Revalidate edited row
    const reval = validateQuestionRow(rowToEdit);
    rowToEdit.isValid = reval.isValid;
    rowToEdit.problem = reval.problem;

    expect(rowToEdit.isValid).toBe(true);
    expect(rowToEdit.problem).toBeNull();

    // Prepare import payload for host_import_questions
    const readyQuestions = [res.questions[0], rowToEdit, res.questions[2], res.questions[4]];
    const payload = readyQuestions.map((q) => ({
      body: q.body,
      options: q.options,
      correct_key: q.correct_key,
      scripture_ref: q.scripture_ref,
      explanation: q.explanation,
      answer_mode: q.answer_mode,
    }));

    expect(payload.length).toBe(4);
    expect(payload[1].body).toBe('Corrected question text');
    expect(payload[1].options[1].text).toBe('Fixed second option');
    expect(payload[1].correct_key).toBe('B');
  });
});

