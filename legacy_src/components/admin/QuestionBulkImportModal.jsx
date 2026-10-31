import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Sparkles, BookOpen, Layers } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';

export default function QuestionBulkImportModal({ isOpen, onClose }) {
  const { addQuestion } = useGameStore();
  const [inputText, setInputText] = useState('');
  const [targetRound, setTargetRound] = useState(1);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [activeTab, setActiveTab] = useState('paste'); // 'paste' | 'preview'
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  // Parser for raw text or formatted blocks
  const handleParse = (textToParse = inputText) => {
    const lines = textToParse.split(/\r?\n/);
    const questions = [];
    const errors = [];

    // Attempt JSON parse first if starts with [ or {
    const trimmed = textToParse.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const json = JSON.parse(trimmed);
        if (Array.isArray(json)) {
          const validated = json.map((item, idx) => ({
            id: `q-import-${Date.now()}-${idx}`,
            type: item.type || 'objective',
            roundNumber: Number(item.roundNumber || targetRound),
            questionText: item.questionText || item.question || '',
            options: item.options || [
              { id: 'A', text: item.optionA || '' },
              { id: 'B', text: item.optionB || '' },
              { id: 'C', text: item.optionC || '' },
              { id: 'D', text: item.optionD || '' },
            ],
            correctAnswer: item.correctAnswer || item.answer || 'A',
            scriptureReference: item.scriptureReference || item.ref || '',
            gaps: item.gaps || { wordBank: item.wordBank || [] },
          }));
          setParsedQuestions(validated);
          setParseErrors([]);
          setActiveTab('preview');
          return;
        }
      } catch (e) {
        // Fall back to block parsing
      }
    }

    // Block parser
    let currentQ = null;

    const finalizeCurrent = () => {
      if (!currentQ) return;
      if (!currentQ.questionText) {
        errors.push(`Question block missing text.`);
        return;
      }

      // Default options if objective
      if (currentQ.type === 'objective' && currentQ.options.length < 2) {
        errors.push(`"${currentQ.questionText.slice(0, 30)}..." has fewer than 2 options.`);
      }

      // If correctAnswer is letter, format nicely
      currentQ.correctAnswer = currentQ.correctAnswer ? currentQ.correctAnswer.toUpperCase() : 'A';
      currentQ.roundNumber = Number(currentQ.roundNumber || targetRound);
      questions.push(currentQ);
      currentQ = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check for start of new question: "1. ", "Question 1:", "Q1.", etc.
      const numMatch = line.match(/^(?:Q(?:uestion)?\s*)?(\d+)[\.:\)]\s*(.*)$/i);
      if (numMatch) {
        finalizeCurrent();
        currentQ = {
          id: `q-bulk-${Date.now()}-${questions.length}`,
          type: 'objective',
          roundNumber: targetRound,
          questionText: numMatch[2] || '',
          options: [],
          correctAnswer: 'A',
          scriptureReference: '',
          gaps: { wordBank: [] },
        };
        continue;
      }

      if (!currentQ) {
        // First line might just be a question text without number
        currentQ = {
          id: `q-bulk-${Date.now()}-${questions.length}`,
          type: 'objective',
          roundNumber: targetRound,
          questionText: line,
          options: [],
          correctAnswer: 'A',
          scriptureReference: '',
          gaps: { wordBank: [] },
        };
        continue;
      }

      // Options: "A. Text", "A) Text", "a. Text"
      const optMatch = line.match(/^([A-D])[\.\)]\s*(.*)$/i);
      if (optMatch) {
        currentQ.options.push({
          id: optMatch[1].toUpperCase(),
          text: optMatch[2].trim(),
        });
        continue;
      }

      // Answer line: "Answer: B", "Ans: B", "Correct: B"
      const ansMatch = line.match(/^(?:Answer|Ans|Correct)\s*[:=\-]\s*([A-Za-z0-9\s|]+)$/i);
      if (ansMatch) {
        currentQ.correctAnswer = ansMatch[1].trim();
        continue;
      }

      // Scripture Ref: "Ref: Genesis 2:7", "Scripture: ..."
      const refMatch = line.match(/^(?:Ref|Scripture|Passage)\s*[:=\-]\s*(.*)$/i);
      if (refMatch) {
        currentQ.scriptureReference = refMatch[1].trim();
        continue;
      }

      // Type line: "Type: german" | "Type: theory" | "Type: objective"
      const typeMatch = line.match(/^Type\s*[:=\-]\s*(objective|german|theory)/i);
      if (typeMatch) {
        currentQ.type = typeMatch[1].toLowerCase();
        continue;
      }

      // Words line: "Words: faith | grace | love"
      const wordsMatch = line.match(/^Words\s*[:=\-]\s*(.*)$/i);
      if (wordsMatch) {
        currentQ.gaps = {
          wordBank: wordsMatch[1].split('|').map(w => w.trim()).filter(Boolean),
        };
        continue;
      }

      // If it doesn't match above, append to question text
      if (currentQ && currentQ.options.length === 0 && !currentQ.correctAnswer) {
        currentQ.questionText += ' ' + line;
      }
    }

    finalizeCurrent();

    setParsedQuestions(questions);
    setParseErrors(errors);
    setActiveTab('preview');
  };

  // Handle file drop or upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setInputText(content);
        handleParse(content);
      }
    };
    reader.readAsText(file);
  };

  // Commit parsed questions to store
  const handleCommit = () => {
    if (parsedQuestions.length === 0) return;

    parsedQuestions.forEach(q => {
      addQuestion(q);
    });

    setSuccessMessage(`Successfully imported ${parsedQuestions.length} questions into Round ${targetRound}!`);
    setTimeout(() => {
      onClose();
      setSuccessMessage('');
      setParsedQuestions([]);
      setInputText('');
    }, 1200);
  };

  const sampleTemplate = `1. Who was chosen to replace Judas Iscariot among the twelve Apostles?
A. Barnabas
B. Matthias
C. Silas
D. Stephen
Answer: B
Ref: Acts 1:26
Round: 1
Type: objective

2. By faith Abraham, when he was called to go out into a place which he should after receive for an [inheritance], obeyed; and he went out, not knowing whither he [went].
Ref: Hebrews 11:8
Round: 2
Type: german
Words: inheritance | went | returned | journey

3. What are the Three Works of Grace taught by the Apostolic Faith Church?
Ref: 1 Thessalonians 5:23
Round: 3
Type: theory
Answer: Salvation, Entire Sanctification, and the Baptism of the Holy Ghost with evidence of speaking in tongues`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-afc-navy-deep border border-afc-gold/30 rounded-3xl shadow-2xl overflow-hidden my-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-afc-gold/20 bg-afc-navy-mid/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-afc-gold/10 border border-afc-gold/30 flex items-center justify-center text-afc-gold">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-cinzel text-lg font-bold text-gold-gradient">
                  Bulk Question Importer & Board Sizer
                </h3>
                <p className="font-outfit text-xs text-afc-ivory-muted/60">
                  Import questions via Text, Word document (.txt/.docx), or JSON with dry-run validation
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-afc-ivory-muted/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Round Selector Bar */}
          <div className="px-6 py-3 bg-afc-navy-mid/40 border-b border-afc-gold/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-cinzel text-afc-gold font-bold">Target Round:</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(r => (
                  <button
                    key={r}
                    onClick={() => setTargetRound(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-cinzel transition-all ${
                      targetRound === r
                        ? 'bg-afc-gold text-afc-navy font-bold shadow-md'
                        : 'glass text-afc-ivory-muted/60 hover:text-afc-gold'
                    }`}
                  >
                    Round {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab switch */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1 rounded-lg text-xs font-outfit transition-all ${
                  activeTab === 'paste'
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-afc-ivory-muted/50 hover:text-white'
                }`}
              >
                Input / Paste
              </button>
              <button
                onClick={() => handleParse()}
                className={`px-3 py-1 rounded-lg text-xs font-outfit transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-afc-ivory-muted/50 hover:text-white'
                }`}
              >
                Preview ({parsedQuestions.length})
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {successMessage ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center"
              >
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <h4 className="font-cinzel text-xl text-emerald-400 font-bold mb-2">Import Successful!</h4>
                <p className="font-outfit text-sm text-afc-ivory-muted/80">{successMessage}</p>
              </motion.div>
            ) : activeTab === 'paste' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-outfit text-afc-ivory-muted/60">
                    Paste raw question text, or choose a file:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInputText(sampleTemplate)}
                      className="text-xs font-outfit text-afc-gold hover:underline"
                    >
                      Load Sample Template
                    </button>
                    <label className="cursor-pointer px-3 py-1 rounded-lg glass border border-afc-gold/30 hover:border-afc-gold text-afc-gold text-xs font-outfit flex items-center gap-1.5 transition-all">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Upload File (.txt/.json)</span>
                      <input
                        type="file"
                        accept=".txt,.json,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <textarea
                  rows={12}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste question blocks here (e.g. 1. Question text... A. ... B. ... Answer: B)..."
                  className="w-full bg-afc-navy border border-afc-gold/20 rounded-2xl p-4 text-xs font-mono text-afc-ivory focus:border-afc-gold/60 focus:outline-none resize-none leading-relaxed"
                />

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] font-outfit text-afc-ivory-muted/40">
                    Supports Objective (A/B/C/D), German Gap-Fill, and Theory question types.
                  </span>
                  <button
                    onClick={() => handleParse()}
                    disabled={!inputText.trim()}
                    className="px-6 py-2.5 rounded-xl bg-gradient-gold text-afc-navy font-cinzel font-bold text-xs tracking-wider flex items-center gap-2 hover:shadow-gold-intense transition-all disabled:opacity-40"
                  >
                    <Sparkles className="w-4 h-4" />
                    Parse & Preview
                  </button>
                </div>
              </div>
            ) : (
              /* Preview Tab */
              <div className="space-y-4">
                {/* Board Sizing Banner */}
                <div className="p-4 rounded-2xl bg-afc-navy-mid/60 border border-afc-gold/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-afc-gold/10 border border-afc-gold/30 flex items-center justify-center text-afc-gold font-cinzel font-bold">
                      {parsedQuestions.length}
                    </div>
                    <div>
                      <h4 className="font-cinzel text-sm font-bold text-white">
                        {parsedQuestions.length} Questions Ready for Round {targetRound}
                      </h4>
                      <p className="font-outfit text-xs text-afc-ivory-muted/60">
                        Dynamic Stage Board Matrix:{' '}
                        <span className="text-afc-gold font-semibold">
                          {parsedQuestions.length} Numbered Tiles
                        </span>{' '}
                        ({Math.ceil(parsedQuestions.length / 2)} Left Board,{' '}
                        {Math.floor(parsedQuestions.length / 2)} Right Board)
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleCommit}
                    disabled={parsedQuestions.length === 0}
                    className="px-6 py-2.5 rounded-xl bg-gradient-gold text-afc-navy font-cinzel font-bold text-xs tracking-wider flex items-center gap-2 hover:shadow-gold-intense transition-all disabled:opacity-40"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Commit All to Bank
                  </button>
                </div>

                {/* Question Preview List */}
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {parsedQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3"
                    >
                      <span className="w-6 h-6 rounded-lg bg-afc-gold/15 text-afc-gold font-cinzel text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-outfit uppercase bg-blue-500/20 text-blue-300">
                            {q.type}
                          </span>
                          <span className="text-[10px] text-afc-gold font-mono">
                            Answer: {q.correctAnswer}
                          </span>
                          {q.scriptureReference && (
                            <span className="text-[10px] text-afc-ivory-muted/40 font-outfit">
                              • {q.scriptureReference}
                            </span>
                          )}
                        </div>
                        <p className="font-outfit text-xs text-white truncate">{q.questionText}</p>
                        {q.options?.length > 0 && (
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            {q.options.map(opt => (
                              <div
                                key={opt.id}
                                className={`text-[11px] font-outfit truncate px-2 py-0.5 rounded ${
                                  opt.id === q.correctAnswer
                                    ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                                    : 'text-white/60'
                                }`}
                              >
                                {opt.id}. {opt.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => setActiveTab('paste')}
                    className="text-xs font-outfit text-afc-ivory-muted/60 hover:text-white"
                  >
                    ← Back to Edit Input
                  </button>
                  <span className="text-[11px] font-outfit text-afc-ivory-muted/40">
                    Questions will be appended to your active Question Bank.
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
