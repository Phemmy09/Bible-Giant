'use client';

import React, { useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Round, Contestant } from '@/lib/types';
import { parseAndValidateCsv, generateRejectedCsv, CsvParseResult } from '@/lib/csv';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface QuestionCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  rounds: Round[];
  contestants: Contestant[];
  supabase: SupabaseClient;
  onSuccess: () => void;
}

export function QuestionCsvImportModal({
  isOpen,
  onClose,
  eventId,
  rounds,
  contestants,
  supabase,
  onSuccess,
}: QuestionCsvImportModalProps) {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setImportSummary(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
      try {
        const result = parseAndValidateCsv(text);
        setParseResult(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error parsing CSV file';
        setError(msg);
      }
    };
    reader.readAsText(file);
  }

  function handleDownloadRejected() {
    if (!parseResult || parseResult.invalidRows.length === 0) return;
    const rejectedCsv = generateRejectedCsv(parseResult.invalidRows);
    const blob = new Blob([rejectedCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rejected_questions_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleConfirmImport() {
    if (!parseResult || parseResult.validRows.length === 0) return;
    setIsImporting(true);
    setError(null);

    try {
      // Build a map of existing rounds by position
      const roundsByPos = new Map<number, Round>();
      rounds.forEach((r) => roundsByPos.set(r.position, r));

      // Map contestants by seat_no
      const contestantsBySeat = new Map<number, string>();
      contestants.forEach((c) => contestantsBySeat.set(c.seat_no, c.id));

      let importedCount = 0;

      for (const rowResult of parseResult.validRows) {
        const d = rowResult.data!;

        // 1. Resolve or create round
        let round = roundsByPos.get(d.round_position);
        if (!round) {
          const { data: newRound, error: rErr } = await supabase
            .from('rounds')
            .insert({
              event_id: eventId,
              position: d.round_position,
              title: d.round_title,
              type: d.round_type,
            })
            .select('*')
            .single();

          if (rErr) throw rErr;
          round = newRound as Round;
          roundsByPos.set(d.round_position, round);
        }

        // 2. Count existing questions in this round to assign position
        const { count, error: countErr } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('round_id', round.id);

        if (countErr) throw countErr;
        const nextQPos = (count || 0) + 1;

        // Resolve assigned contestant id if individual
        let assignedId: string | null = null;
        if (d.assigned_seat) {
          assignedId = contestantsBySeat.get(d.assigned_seat) || null;
        }

        // 3. Insert question
        const { data: newQ, error: qErr } = await supabase
          .from('questions')
          .insert({
            event_id: eventId,
            round_id: round.id,
            position: nextQPos,
            body: d.question,
            options: d.options,
            scripture_ref: d.scripture_ref,
            answer_mode: d.answer_mode,
            assigned_contestant_id: assignedId,
          })
          .select('id')
          .single();

        if (qErr) throw qErr;

        // 4. Insert question key if choice mode
        if (d.answer_mode === 'choice' && d.correct && newQ) {
          const { error: kErr } = await supabase.from('question_keys').insert({
            question_id: newQ.id,
            event_id: eventId,
            correct_key: d.correct,
            explanation: d.explanation,
          });
          if (kErr) throw kErr;
        }

        importedCount++;
      }

      setImportSummary(
        `Successfully imported ${importedCount} question(s)!` +
          (parseResult.invalidRows.length > 0
            ? ` (${parseResult.invalidRows.length} invalid rows were skipped and can be downloaded below.)`
            : '')
      );
      setIsImporting(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error importing rows';
      setError(msg);
      setIsImporting(false);
    }
  }

  function handleReset() {
    setFileContent(null);
    setParseResult(null);
    setImportSummary(null);
    setError(null);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Questions from CSV" maxWidth="lg">
      <div className="flex flex-col gap-4">
        {/* Template Download Link */}
        <div className="flex items-center justify-between text-xs sm:text-sm bg-cream-100 p-3 rounded-btn border border-navy-700/10">
          <span className="text-ink-500">Need the correct column structure?</span>
          <a
            href="/question-template.csv"
            download="question-template.csv"
            className="font-semibold text-navy-900 underline hover:text-gold-500"
          >
            Download CSV Template ↓
          </a>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 bg-danger/10 border border-danger/30 rounded-btn text-danger text-sm font-medium"
          >
            {error}
          </div>
        )}

        {importSummary && (
          <div
            role="status"
            className="p-3 bg-success/10 border border-success/30 rounded-btn text-success text-sm font-semibold"
          >
            {importSummary}
          </div>
        )}

        {/* File Input */}
        {!parseResult ? (
          <div className="border-2 border-dashed border-navy-700/20 rounded-card p-8 text-center flex flex-col items-center justify-center gap-3 bg-white">
            <svg
              className="w-10 h-10 text-ink-500/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm font-medium text-navy-900">
              Select a UTF-8 CSV question file
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="text-xs text-ink-500 file:mr-3 file:py-2 file:px-4 file:rounded-btn file:border-0 file:text-xs file:font-semibold file:bg-navy-900 file:text-cream-50 hover:file:bg-navy-700 cursor-pointer"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Summary statistics */}
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-navy-900">
                Total rows parsed: {parseResult.totalRows}
              </span>
              <div className="flex gap-3">
                <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-chip">
                  ✓ {parseResult.validRows.length} Valid
                </span>
                {parseResult.invalidRows.length > 0 && (
                  <span className="text-xs font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded-chip">
                    ✗ {parseResult.invalidRows.length} Errors
                  </span>
                )}
              </div>
            </div>

            {/* Preview table */}
            <div className="max-h-72 overflow-y-auto border border-navy-700/15 rounded-btn bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-cream-100 border-b border-navy-700/15 font-semibold text-navy-900 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Row</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Round</th>
                    <th className="py-2 px-3">Question</th>
                    <th className="py-2 px-3">Correct</th>
                    <th className="py-2 px-3">Details / Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/10">
                  {[...parseResult.validRows, ...parseResult.invalidRows]
                    .sort((a, b) => a.rowNumber - b.rowNumber)
                    .map((r) => (
                      <tr
                        key={r.rowNumber}
                        className={r.isValid ? 'hover:bg-cream-50' : 'bg-danger/5'}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-navy-900">
                          #{r.rowNumber}
                        </td>
                        <td className="py-2.5 px-3 font-semibold">
                          {r.isValid ? (
                            <span className="text-success">✓ OK</span>
                          ) : (
                            <span className="text-danger">✗ Invalid</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-ink-500 whitespace-nowrap">
                          {r.data ? `R${r.data.round_position} (${r.data.round_type})` : r.rawRow['round_position'] || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-navy-900 max-w-xs truncate">
                          {r.data?.question || r.rawRow['question'] || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-navy-900">
                          {r.data?.correct || r.rawRow['correct'] || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-danger font-medium max-w-xs">
                          {r.isValid ? (
                            <span className="text-ink-500">
                              {r.data?.options.length} options ({r.data?.answer_mode})
                            </span>
                          ) : (
                            r.errors.join('; ')
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-navy-700/15">
              <div>
                {parseResult.invalidRows.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={handleDownloadRejected}
                    className="text-xs text-danger hover:bg-danger/10 border-danger/20"
                  >
                    Download Rejected Rows CSV ({parseResult.invalidRows.length})
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <Button type="button" variant="ghost" onClick={handleReset}>
                  Choose Another File
                </Button>
                <Button
                  type="button"
                  variant="gold"
                  isLoading={isImporting}
                  disabled={parseResult.validRows.length === 0}
                  onClick={handleConfirmImport}
                >
                  Import {parseResult.validRows.length} Valid Row(s)
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
