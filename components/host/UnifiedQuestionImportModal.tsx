'use client';

import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { Round, OptionKey } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';
import { rpcHostImportQuestions } from '@/lib/rpc';
import {
  parseQuestions,
  validateQuestionRow,
  ParsedQuestionRow,
} from '@/lib/parsers';

export interface UnifiedQuestionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  rounds: Round[];
  initialRoundId?: string;
  onImportSuccess: () => void;
}

export function UnifiedQuestionImportModal({
  isOpen,
  onClose,
  eventId,
  rounds,
  initialRoundId,
  onImportSuccess,
}: UnifiedQuestionImportModalProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard step: 1 = Choose file & round, 2 = Preview & fix, 3 = Summary
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string>(initialRoundId || rounds[0]?.id || '');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Preview state
  const [questions, setQuestions] = useState<ParsedQuestionRow[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<string>('');

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importResultCount, setImportResultCount] = useState<number>(0);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialRoundId) setSelectedRoundId(initialRoundId);
      else if (rounds.length > 0 && !selectedRoundId) setSelectedRoundId(rounds[0].id);
      setStep(1);
      setSelectedFile(null);
      setQuestions([]);
      setParseError(null);
      setImportError(null);
      setImportResultCount(0);
    }
  }, [isOpen, initialRoundId, rounds, selectedRoundId]);

  if (!isOpen) return null;

  const targetRound = rounds.find((r) => r.id === selectedRoundId);
  const readyQuestions = questions.filter((q) => q.isValid);
  const attentionQuestions = questions.filter((q) => !q.isValid);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: max 5 MB (§4.6)
    if (file.size > 5 * 1024 * 1024) {
      setParseError('Maximum file size is 5 MB. Please choose a smaller file.');
      return;
    }

    setSelectedFile(file);
    setParseError(null);
    setIsParsing(true);

    try {
      let arrayBuf: ArrayBuffer;
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const res = await parseQuestions(text, file.name);
        handleParseResult(res);
      } else {
        arrayBuf = await file.arrayBuffer();
        const res = await parseQuestions(Buffer.from(arrayBuf), file.name);
        handleParseResult(res);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse file';
      setParseError(msg);
      setIsParsing(false);
    }
  }

  function handleParseResult(res: any) {
    setIsParsing(false);
    if (!res.ok && res.error) {
      setParseError(res.error);
      return;
    }

    if (res.questions.length === 0) {
      setParseError('No questions were found. Check the layout against the guide below.');
      return;
    }

    if (res.questions.length > 500) {
      setParseError('File contains more than 500 questions (maximum 500 per import).');
      return;
    }

    setDetectedFormat(res.format);
    setQuestions(res.questions);
    setStep(2);
  }

  // Row cell editing in Step 2 preview table
  function handleUpdateRow(id: string, updates: Partial<ParsedQuestionRow>) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const updated = { ...q, ...updates };
        const validation = validateQuestionRow(updated);
        return {
          ...updated,
          isValid: validation.isValid,
          problem: validation.problem,
        };
      })
    );
  }

  function handleUpdateOption(rowId: string, optKey: OptionKey, newText: string) {
    const row = questions.find((q) => q.id === rowId);
    if (!row) return;

    const newOptions = row.options.map((o) => (o.key === optKey ? { ...o, text: newText } : o));
    handleUpdateRow(rowId, { options: newOptions });
  }

  function handleDownloadRejectedCsv() {
    if (attentionQuestions.length === 0) return;

    const rejectedRows = attentionQuestions.map((q) => ({
      number: q.position,
      question: q.body,
      option_a: q.options.find((o) => o.key === 'A')?.text || '',
      option_b: q.options.find((o) => o.key === 'B')?.text || '',
      option_c: q.options.find((o) => o.key === 'C')?.text || '',
      option_d: q.options.find((o) => o.key === 'D')?.text || '',
      option_e: q.options.find((o) => o.key === 'E')?.text || '',
      correct: q.correct_key || '',
      scripture_ref: q.scripture_ref || '',
      explanation: q.explanation || '',
      problem_reason: q.problem || 'Unknown error',
    }));

    const csvContent = Papa.unparse(rejectedRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rejected_questions_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Step 3: Perform atomic database import (§4.5, §7)
  async function handleImport() {
    if (readyQuestions.length === 0) return;
    if (!selectedRoundId) {
      setImportError('Please choose a target round.');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    // Prepare payload according to host_import_questions contract
    const payload = readyQuestions.map((q) => {
      // If question specifies its own round position/id, we can handle it
      return {
        body: q.body.trim(),
        options: q.options,
        correct_key: q.correct_key,
        scripture_ref: q.scripture_ref?.trim() || null,
        explanation: q.explanation?.trim() || null,
        answer_mode: q.answer_mode || 'choice',
      };
    });

    try {
      const res = await rpcHostImportQuestions(eventId, selectedRoundId, payload, supabase);
      setIsImporting(false);

      if (!res.ok) {
        setImportError(res.message);
      } else {
        setImportResultCount(res.data);
        setStep(3);
        onImportSuccess();
      }
    } catch (err: unknown) {
      setIsImporting(false);
      const msg = err instanceof Error ? err.message : 'Failed to import questions';
      setImportError(msg);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-card border border-navy-700/20 shadow-soft overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header with 3-Step Breadcrumbs */}
        <div className="px-6 py-4 bg-navy-900 text-cream-50 flex items-center justify-between border-b border-navy-700">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl sm:text-2xl font-bold">Import Questions</span>
            <div className="hidden sm:flex items-center gap-2 text-xs ml-4">
              <span
                className={`px-2 py-0.5 rounded font-semibold ${
                  step === 1 ? 'bg-gold-500 text-navy-950' : 'text-cream-50/60 bg-navy-800'
                }`}
              >
                1. Select File
              </span>
              <span>→</span>
              <span
                className={`px-2 py-0.5 rounded font-semibold ${
                  step === 2 ? 'bg-gold-500 text-navy-950' : 'text-cream-50/60 bg-navy-800'
                }`}
              >
                2. Preview & Fix
              </span>
              <span>→</span>
              <span
                className={`px-2 py-0.5 rounded font-semibold ${
                  step === 3 ? 'bg-gold-500 text-navy-950' : 'text-cream-50/60 bg-navy-800'
                }`}
              >
                3. Complete
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-cream-50/70 hover:text-cream-50 text-2xl font-bold leading-none"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: CHOOSE FILE AND ROUND */}
          {step === 1 && (
            <div className="space-y-6">
              {parseError && (
                <div
                  role="alert"
                  className="p-4 rounded-btn bg-danger/10 border border-danger/30 text-danger text-sm font-semibold"
                >
                  {parseError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left: Round & File Picker */}
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold text-navy-900 mb-1 text-sm">
                      Target Round <span className="text-danger">*</span>
                    </label>
                    <select
                      value={selectedRoundId}
                      onChange={(e) => setSelectedRoundId(e.target.value)}
                      className="w-full h-11 px-3 rounded-btn border border-navy-700/20 bg-cream-50 text-navy-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    >
                      {rounds.map((r) => (
                        <option key={r.id} value={r.id}>
                          Round {r.position}: {r.title} ({r.type})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-ink-500 mt-1">
                      (A CSV with a <code>round_position</code> column will place rows in their matching round).
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-navy-900 mb-1 text-sm">
                      Upload Document (.docx, .pdf, .csv) <span className="text-danger">*</span>
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-navy-700/20 hover:border-gold-500 p-8 rounded-card text-center cursor-pointer transition-colors bg-cream-50/50 hover:bg-cream-50 flex flex-col items-center justify-center gap-2"
                    >
                      <span className="text-3xl">📄</span>
                      <p className="text-sm font-bold text-navy-900">
                        {selectedFile ? selectedFile.name : 'Click to select Word, PDF, or CSV'}
                      </p>
                      <p className="text-xs text-ink-500">
                        Selectable text PDF, Word (.docx), or CSV · Max 5 MB · Max 500 questions
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".docx,.pdf,.csv"
                        onChange={handleFileSelected}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {isParsing && (
                    <div className="p-4 rounded-btn bg-gold-500/10 border border-gold-500/30 text-navy-900 flex items-center gap-3 text-xs font-semibold animate-pulse">
                      <span className="text-lg">⏳</span>
                      <span>Parsing document in browser…</span>
                    </div>
                  )}

                  {/* Template download links */}
                  <div className="pt-2 border-t border-navy-700/10 flex flex-wrap items-center gap-3">
                    <span className="text-xs text-ink-500 font-semibold">Download templates:</span>
                    <a
                      href="/question-template.docx"
                      download="question-template.docx"
                      className="text-xs font-bold text-navy-900 hover:text-gold-600 underline flex items-center gap-1"
                    >
                      Word Template (.docx) ⬇
                    </a>
                    <span>•</span>
                    <a
                      href="/question-template.csv"
                      download="question-template.csv"
                      className="text-xs font-bold text-navy-900 hover:text-gold-600 underline flex items-center gap-1"
                    >
                      CSV Template (.csv) ⬇
                    </a>
                  </div>
                </div>

                {/* Right: Required Document Layout Guide (§4.6) */}
                <Card className="p-5 bg-cream-50/70 border-navy-700/15 text-xs space-y-3">
                  <h3 className="font-display text-base font-bold text-navy-900">
                    Word & PDF Layout Guide
                  </h3>
                  <p className="text-ink-500">
                    Your Word or PDF document should follow this layout so questions and answers can be extracted deterministically:
                  </p>
                  <pre className="bg-navy-900 text-cream-50 p-3.5 rounded-btn font-mono text-[11px] leading-relaxed overflow-x-auto">
{`1. Who built the ark?
A. Moses
B. Noah
C. Abraham
D. David
Answer: B
Reference: Genesis 6:14
Explanation: God told Noah to build an ark.

2. Next question text...
A. ...
Answer: A`}
                  </pre>
                  <ul className="list-disc pl-4 space-y-1 text-ink-500 text-[11px]">
                    <li>Questions start with a number followed by <code>.</code> or <code>)</code>.</li>
                    <li>Options start with <code>A.</code>, <code>B.</code>, etc. (2 to 5 options).</li>
                    <li><code>Answer: [Letter]</code> indicates the correct choice.</li>
                    <li>PDFs must contain real selectable text (scanned images are not readable).</li>
                  </ul>
                </Card>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW AND FIX */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-card bg-cream-100 border border-navy-700/10 text-xs sm:text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-navy-900">
                    Format: <strong className="uppercase">{detectedFormat}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Ready: <strong className="text-success font-extrabold">{readyQuestions.length}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Need attention: <strong className={attentionQuestions.length > 0 ? 'text-danger font-extrabold' : 'text-ink-500'}>{attentionQuestions.length}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {attentionQuestions.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={handleDownloadRejectedCsv}
                      className="text-xs h-8 px-2.5 min-h-0 border-navy-700/20 text-danger"
                    >
                      Download {attentionQuestions.length} Problem Rows (CSV)
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => setStep(1)}
                    className="text-xs h-8 px-2.5 min-h-0"
                  >
                    ← Choose another file
                  </Button>
                </div>
              </div>

              {importError && (
                <div className="p-3 rounded-btn bg-danger/10 border border-danger/30 text-danger text-xs font-semibold">
                  {importError}
                </div>
              )}

              {/* Editable Preview Table (§4.5) */}
              <div className="border border-navy-700/20 rounded-card overflow-hidden">
                <div className="max-h-[55vh] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-navy-900 text-cream-50 sticky top-0 z-10 font-semibold">
                      <tr>
                        <th className="p-2.5 w-14 text-center">Status</th>
                        <th className="p-2.5 w-12 text-center">#</th>
                        <th className="p-2.5 min-w-[220px]">Question Text</th>
                        <th className="p-2.5 min-w-[260px]">Options (A–D)</th>
                        <th className="p-2.5 w-20 text-center">Correct</th>
                        <th className="p-2.5 min-w-[140px]">Reference / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-700/10">
                      {questions.map((q, idx) => {
                        return (
                          <tr
                            key={q.id}
                            className={`transition-colors ${
                              !q.isValid
                                ? 'bg-danger/5 hover:bg-danger/10'
                                : idx % 2 === 0
                                ? 'bg-white hover:bg-cream-50'
                                : 'bg-cream-50/40 hover:bg-cream-50'
                            }`}
                          >
                            {/* Status */}
                            <td className="p-2.5 text-center align-top">
                              {q.isValid ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/20 text-success font-bold text-xs" title="Ready to import">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-danger/20 text-danger font-bold text-xs" title={q.problem || 'Needs attention'}>
                                  ✗
                                </span>
                              )}
                            </td>

                            {/* Position */}
                            <td className="p-2.5 text-center font-mono font-bold text-ink-500 align-top">
                              {idx + 1}
                            </td>

                            {/* Question Text */}
                            <td className="p-2.5 align-top space-y-1">
                              <textarea
                                value={q.body}
                                rows={2}
                                onChange={(e) => handleUpdateRow(q.id, { body: e.target.value })}
                                className="w-full p-1.5 rounded border border-navy-700/20 bg-white text-navy-900 text-xs focus:ring-1 focus:ring-gold-500"
                              />
                              {!q.isValid && q.problem && (
                                <p className="text-[11px] text-danger font-semibold">
                                  {q.problem}
                                </p>
                              )}
                            </td>

                            {/* Options A-D */}
                            <td className="p-2.5 align-top">
                              <div className="space-y-1">
                                {q.options.map((opt) => (
                                  <div key={opt.key} className="flex items-center gap-1">
                                    <span className="font-mono font-bold text-[10px] w-4 shrink-0 text-navy-900">
                                      {opt.key}:
                                    </span>
                                    <input
                                      type="text"
                                      value={opt.text}
                                      onChange={(e) => handleUpdateOption(q.id, opt.key, e.target.value)}
                                      className="flex-1 px-1.5 py-0.5 rounded border border-navy-700/20 bg-white text-navy-900 text-xs focus:ring-1 focus:ring-gold-500"
                                    />
                                  </div>
                                ))}
                              </div>
                            </td>

                            {/* Correct Key */}
                            <td className="p-2.5 align-top text-center">
                              <select
                                value={q.correct_key || ''}
                                onChange={(e) => handleUpdateRow(q.id, { correct_key: (e.target.value as OptionKey) || null })}
                                className="w-16 h-8 px-1 text-center font-mono font-extrabold rounded border border-navy-700/20 bg-white text-navy-900 text-xs focus:ring-1 focus:ring-gold-500"
                              >
                                <option value="" disabled>–</option>
                                {q.options.map((opt) => (
                                  <option key={opt.key} value={opt.key}>
                                    {opt.key}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Reference / Explanation */}
                            <td className="p-2.5 align-top space-y-1">
                              <input
                                type="text"
                                placeholder="Reference"
                                value={q.scripture_ref || ''}
                                onChange={(e) => handleUpdateRow(q.id, { scripture_ref: e.target.value })}
                                className="w-full px-1.5 py-0.5 rounded border border-navy-700/20 bg-white text-navy-900 text-xs focus:ring-1 focus:ring-gold-500"
                              />
                              <input
                                type="text"
                                placeholder="Explanation"
                                value={q.explanation || ''}
                                onChange={(e) => handleUpdateRow(q.id, { explanation: e.target.value })}
                                className="w-full px-1.5 py-0.5 rounded border border-navy-700/20 bg-white text-navy-900 text-[11px] text-ink-500 focus:ring-1 focus:ring-gold-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUMMARY */}
          {step === 3 && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/20 text-success text-3xl font-extrabold flex items-center justify-center mx-auto">
                ✓
              </div>
              <h3 className="font-display text-2xl font-bold text-navy-900">
                Import Complete!
              </h3>
              <p className="text-sm text-ink-500 max-w-md mx-auto">
                Successfully added <strong className="text-navy-900 font-bold">{importResultCount} questions</strong> to{' '}
                <strong className="text-navy-900 font-bold">{targetRound?.title || 'the selected round'}</strong>.
              </p>
              <div className="pt-4">
                <Button
                  type="button"
                  variant="gold"
                  size="md"
                  onClick={onClose}
                  className="px-6"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {step === 2 && (
          <div className="px-6 py-4 bg-cream-100 border-t border-navy-700/10 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-ink-500">
              Target: <strong className="text-navy-900">{targetRound?.title}</strong> · Ready to save:{' '}
              <strong className="text-navy-900">{readyQuestions.length} / {questions.length}</strong>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={onClose}
                disabled={isImporting}
                className="text-xs h-9 min-h-0"
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleImport}
                disabled={readyQuestions.length === 0 || isImporting}
                isLoading={isImporting}
                className="text-xs h-9 min-h-0 font-bold"
              >
                Import {readyQuestions.length} Questions ➔
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

