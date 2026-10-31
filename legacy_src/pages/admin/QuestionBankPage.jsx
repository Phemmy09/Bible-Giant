import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Edit3, Save, X, BookOpen, Upload, FileUp } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { QUESTION_TYPES, ROUNDS } from '@/lib/constants';
import QuestionBulkImportModal from '@/components/admin/QuestionBulkImportModal';

export default function QuestionBankPage() {
  const { questions, addQuestion, updateQuestion, deleteQuestion } = useGameStore();
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    type: 'objective',
    questionText: '',
    options: [
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' },
    ],
    gaps: { wordBank: [] },
    correctAnswer: '',
    scriptureReference: '',
    roundNumber: 1,
  });
  const [wordBankInput, setWordBankInput] = useState('');

  const resetForm = () => {
    setForm({
      type: 'objective',
      questionText: '',
      options: [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
      ],
      gaps: { wordBank: [] },
      correctAnswer: '',
      scriptureReference: '',
      roundNumber: 1,
    });
    setWordBankInput('');
  };

  const handleSave = () => {
    const q = {
      type: form.type,
      questionText: form.questionText,
      correctAnswer: form.correctAnswer,
      scriptureReference: form.scriptureReference,
    };
    if (form.type === 'objective') {
      q.options = form.options;
    } else if (form.type === 'german') {
      q.gaps = { wordBank: wordBankInput.split('|').map(w => w.trim()).filter(Boolean) };
    }

    if (editingId) {
      updateQuestion(editingId, q);
      setEditingId(null);
    } else {
      addQuestion(q);
    }
    resetForm();
    setIsAdding(false);
  };

  const startEdit = (q) => {
    setForm({
      type: q.type,
      questionText: q.questionText,
      options: q.options || [
        { id: 'A', text: '' }, { id: 'B', text: '' },
        { id: 'C', text: '' }, { id: 'D', text: '' },
      ],
      gaps: q.gaps || { wordBank: [] },
      correctAnswer: q.correctAnswer || '',
      scriptureReference: q.scriptureReference || '',
      roundNumber: 1,
    });
    setWordBankInput(q.gaps?.wordBank?.join(' | ') || '');
    setEditingId(q.id);
    setIsAdding(true);
  };

  return (
    <div className="min-h-screen bg-afc-navy relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-celestial pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-afc-ivory-muted/50 hover:text-afc-gold transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-cinzel text-xl font-bold text-gold-gradient">Question Bank</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkImportOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-afc-gold/30 hover:border-afc-gold text-afc-gold font-cinzel text-xs font-semibold flex items-center gap-1.5 transition-all glass"
            >
              <FileUp className="w-4 h-4" /> Bulk Import
            </button>
            <button
              onClick={() => { resetForm(); setIsAdding(true); setEditingId(null); }}
              className="px-4 py-2 rounded-xl bg-gradient-gold text-afc-navy font-cinzel font-semibold text-sm flex items-center gap-2 hover:shadow-gold-intense transition-all"
            >
              <Plus className="w-4 h-4" /> Add Question
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card p-6 mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-cinzel text-afc-gold text-sm tracking-wider">
                  {editingId ? 'Edit Question' : 'New Question'}
                </h3>
                <button onClick={() => { setIsAdding(false); setEditingId(null); resetForm(); }}
                  className="text-afc-ivory-muted/40 hover:text-afc-gold">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Type selector */}
                <div className="flex gap-2">
                  {Object.entries({ objective: 'Objective', german: 'German (Gap)', theory: 'Theory/Open' }).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setForm(f => ({ ...f, type: key }))}
                      className={`px-4 py-2 rounded-lg text-xs font-outfit transition-all ${
                        form.type === key
                          ? 'bg-afc-gold/20 text-afc-gold border border-afc-gold/30'
                          : 'glass text-afc-ivory-muted/50 hover:text-afc-ivory'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Question text */}
                <div>
                  <label className="font-outfit text-afc-ivory-muted/60 text-xs mb-1 block">
                    Question Text {form.type === 'german' && '(use ____ for gaps)'}
                  </label>
                  <textarea
                    value={form.questionText}
                    onChange={(e) => setForm(f => ({ ...f, questionText: e.target.value }))}
                    rows={3}
                    className="w-full bg-afc-navy-mid/60 border border-afc-gold/20 rounded-lg px-3 py-2 text-afc-ivory font-outfit text-sm focus:border-afc-gold/50 focus:outline-none resize-none"
                    placeholder="Enter question text..."
                  />
                </div>

                {/* Options (Objective) */}
                {form.type === 'objective' && (
                  <div className="grid grid-cols-2 gap-3">
                    {form.options.map((opt, i) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <span className="font-cinzel text-afc-gold text-sm w-6">{opt.id}.</span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => {
                            const newOpts = [...form.options];
                            newOpts[i] = { ...opt, text: e.target.value };
                            setForm(f => ({ ...f, options: newOpts }));
                          }}
                          className="flex-1 bg-afc-navy-mid/60 border border-afc-gold/20 rounded-lg px-3 py-2 text-afc-ivory font-outfit text-sm focus:border-afc-gold/50 focus:outline-none"
                          placeholder={`Option ${opt.id}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Word Bank (German) */}
                {form.type === 'german' && (
                  <div>
                    <label className="font-outfit text-afc-ivory-muted/60 text-xs mb-1 block">
                      Word Bank (pipe-separated)
                    </label>
                    <input
                      type="text"
                      value={wordBankInput}
                      onChange={(e) => setWordBankInput(e.target.value)}
                      className="w-full bg-afc-navy-mid/60 border border-afc-gold/20 rounded-lg px-3 py-2 text-afc-ivory font-outfit text-sm focus:border-afc-gold/50 focus:outline-none"
                      placeholder="e.g., magicians | Chaldeans | Nebuchadnezzar"
                    />
                  </div>
                )}

                {/* Correct Answer */}
                {form.type !== 'theory' && (
                  <div>
                    <label className="font-outfit text-afc-ivory-muted/60 text-xs mb-1 block">Correct Answer</label>
                    <input
                      type="text"
                      value={form.correctAnswer}
                      onChange={(e) => setForm(f => ({ ...f, correctAnswer: e.target.value }))}
                      className="w-full bg-afc-navy-mid/60 border border-afc-gold/20 rounded-lg px-3 py-2 text-afc-ivory font-outfit text-sm focus:border-afc-gold/50 focus:outline-none"
                      placeholder={form.type === 'objective' ? 'A, B, C, or D' : 'Correct words'}
                    />
                  </div>
                )}

                {/* Scripture Reference */}
                <div>
                  <label className="font-outfit text-afc-ivory-muted/60 text-xs mb-1 block">Scripture Reference</label>
                  <input
                    type="text"
                    value={form.scriptureReference}
                    onChange={(e) => setForm(f => ({ ...f, scriptureReference: e.target.value }))}
                    className="w-full bg-afc-navy-mid/60 border border-afc-gold/20 rounded-lg px-3 py-2 text-afc-ivory font-outfit text-sm focus:border-afc-gold/50 focus:outline-none"
                    placeholder="e.g., Genesis 25:28"
                  />
                </div>

                {/* Save */}
                <button
                  onClick={handleSave}
                  disabled={!form.questionText}
                  className="w-full py-3 rounded-xl bg-gradient-gold text-afc-navy font-cinzel font-bold tracking-wider hover:shadow-gold-intense disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {editingId ? 'Update Question' : 'Save Question'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question List */}
        <div className="space-y-3">
          {questions.length === 0 && (
            <div className="glass-card p-12 text-center">
              <BookOpen className="w-12 h-12 text-afc-gold/20 mx-auto mb-4" />
              <p className="font-cinzel text-afc-ivory-muted/30 tracking-wider">No questions yet</p>
              <p className="font-outfit text-afc-ivory-muted/20 text-sm mt-2">Click "Add Question" to create your first question</p>
            </div>
          )}

          {questions.map((q, i) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4 flex items-start gap-4"
            >
              <div className="w-8 h-8 rounded-lg bg-afc-gold/10 flex items-center justify-center flex-shrink-0">
                <span className="font-cinzel text-afc-gold text-xs font-bold">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-outfit ${
                    q.type === 'objective' ? 'bg-blue-500/20 text-blue-400' :
                    q.type === 'german' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {q.type}
                  </span>
                  {q.scriptureReference && (
                    <span className="text-afc-ivory-muted/30 text-xs font-outfit">{q.scriptureReference}</span>
                  )}
                </div>
                <p className="font-outfit text-afc-ivory text-sm truncate">{q.questionText}</p>
                {q.options && (
                  <p className="font-outfit text-afc-ivory-muted/40 text-xs mt-1 truncate">
                    [{q.options.map(o => o.text).join(' | ')}]
                  </p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => startEdit(q)} className="p-2 rounded-lg hover:bg-afc-gold/10 text-afc-ivory-muted/40 hover:text-afc-gold transition-all">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteQuestion(q.id)} className="p-2 rounded-lg hover:bg-afc-crimson/10 text-afc-ivory-muted/40 hover:text-afc-crimson-light transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bulk Question Import Modal */}
      <QuestionBulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
      />
    </div>
  );
}
