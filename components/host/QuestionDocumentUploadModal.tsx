'use client';

import React, { useState } from 'react';
import { Round } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ParsedQuestionItem } from '@/lib/questionParser';

export interface QuestionDocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  rounds: Round[];
  onSuccess: () => void;
}

export function QuestionDocumentUploadModal({
  isOpen,
  onClose,
  eventId,
  rounds,
  onSuccess,
}: QuestionDocumentUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string>(rounds[0]?.id || '');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsePreview, setParsePreview] = useState<{
    detectedFormat: string;
    totalFound: number;
    questions: ParsedQuestionItem[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Reset state when opened
  React.useEffect(() => {
    if (isOpen) {
      if (!selectedRoundId && rounds.length > 0) {
        setSelectedRoundId(rounds[0].id);
      }
      setError(null);
      setSuccessNotice(null);
    }
  }, [isOpen, rounds, selectedRoundId]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setSuccessNotice(null);
    setParsePreview(null);
    setIsParsing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('eventId', eventId);
      formData.append('previewOnly', 'true');

      const res = await fetch('/api/questions/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || 'Failed to extract questions');
      }

      setParsePreview({
        detectedFormat: data.detectedFormat,
        totalFound: data.totalFound,
        questions: data.questions,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error reading document';
      setError(msg);
    } finally {
      setIsParsing(false);
    }
  }

  async function handleConfirmImport() {
    if (!selectedFile) return;

    setIsImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('eventId', eventId);
      formData.append('roundId', selectedRoundId);
      formData.append('previewOnly', 'false');

      const res = await fetch('/api/questions/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || 'Failed to import questions');
      }

      setSuccessNotice(
        `Successfully imported ${data.importedCount} questions into ${data.roundTitle || 'the selected round'}!`
      );
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setError(msg);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Questions Document">
      <div className="flex flex-col gap-5 max-w-2xl">
        <p className="text-xs text-ink-500">
          Upload competition questions in any format: <strong>PDF</strong>, <strong>Word (.docx, .doc)</strong>, <strong>Excel (.xlsx, .xls)</strong>, or <strong>CSV / Text</strong>. The system automatically extracts question statements, choices, scripture references, and correct answer keys.
        </p>

        {error && (
          <div className="p-3 rounded-btn bg-danger/10 border border-danger/30 text-danger text-xs font-semibold">
            {error}
          </div>
        )}

        {successNotice && (
          <div className="p-3 rounded-btn bg-success/15 border border-success/40 text-success text-xs font-bold">
            ✓ {successNotice}
          </div>
        )}

        {/* 1. Round Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-navy-900 uppercase tracking-wider">
            Target Round for Imported Questions
          </label>
          <select
            value={selectedRoundId}
            onChange={(e) => setSelectedRoundId(e.target.value)}
            className="w-full px-3 py-2 text-sm font-semibold rounded-btn bg-cream-50 border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                Round #{r.position}: {r.title} ({r.type.toUpperCase()})
              </option>
            ))}
            <option value="">+ Auto-create new round from document</option>
          </select>
        </div>

        {/* 2. File Upload Box */}
        <div className="border-2 border-dashed border-navy-700/20 rounded-card p-6 text-center hover:border-gold-500 transition-colors bg-cream-50/50">
          <input
            type="file"
            id="question-doc-file"
            accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label htmlFor="question-doc-file" className="cursor-pointer flex flex-col items-center gap-2">
            <span className="text-3xl">📄</span>
            <span className="text-sm font-bold text-navy-900">
              {selectedFile ? selectedFile.name : 'Click to select or drag document here'}
            </span>
            <span className="text-[11px] text-ink-500">
              Supports PDF, DOCX, DOC, XLSX, XLS, CSV, TXT (up to 20MB)
            </span>
          </label>
        </div>

        {isParsing && (
          <div className="flex items-center justify-center gap-2 text-xs text-ink-500 py-3">
            <svg className="animate-spin h-4 w-4 text-gold-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Analyzing and extracting questions…</span>
          </div>
        )}

        {/* 3. Questions Preview */}
        {parsePreview && (
          <div className="border border-navy-700/15 rounded-card p-4 bg-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-navy-700/10">
              <span className="text-xs font-bold text-navy-900">
                Found {parsePreview.totalFound} questions in {parsePreview.detectedFormat}
              </span>
              <span className="text-[11px] bg-gold-500/20 text-navy-900 px-2 py-0.5 rounded font-mono font-bold">
                Ready to Import
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
              {parsePreview.questions.map((q, idx) => (
                <div key={idx} className="p-2.5 rounded bg-cream-50 border border-navy-700/10 text-xs">
                  <div className="flex items-center justify-between font-bold text-navy-900 mb-1">
                    <span className="truncate max-w-[400px]">
                      #{idx + 1}: {q.body}
                    </span>
                    {q.correct_key && (
                      <span className="text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded font-mono">
                        Key: {q.correct_key}
                      </span>
                    )}
                  </div>
                  {q.scripture_ref && (
                    <p className="text-[10px] text-gold-600 font-semibold mb-1">
                      📖 {q.scripture_ref}
                    </p>
                  )}
                  {q.options.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-ink-600">
                      {q.options.map((opt) => (
                        <span key={opt.key} className={opt.key === q.correct_key ? 'font-bold text-success' : ''}>
                          {opt.key}) {opt.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-navy-700/10">
          <Button variant="ghost" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            variant="gold"
            onClick={handleConfirmImport}
            disabled={!parsePreview || parsePreview.totalFound === 0 || isImporting}
            isLoading={isImporting}
            className="font-bold shadow-soft"
          >
            {isImporting ? 'Importing Questions…' : `✓ Import ${parsePreview?.totalFound || ''} Questions`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

