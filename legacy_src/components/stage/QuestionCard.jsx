import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { QUESTION_TYPES } from '@/lib/constants';

function ObjectiveCard({ question }) {
  const optionsText = question.options?.map(o => o.text).join(' | ') || '';
  return (
    <div className="space-y-4">
      <p className="font-playfair text-xl md:text-2xl text-[#2C1810] leading-relaxed text-center font-medium">
        {question.questionText}
      </p>
      {question.scriptureReference && (
        <p className="text-center text-[#6B5B3E] text-sm font-playfair italic">
          ({question.scriptureReference})
        </p>
      )}
      <div className="border-t border-[#B8A06A]/40 pt-4">
        <p className="text-center font-outfit text-[#3D2B1F] text-base md:text-lg tracking-wide">
          [{optionsText}]
        </p>
      </div>
    </div>
  );
}

function GermanCard({ question }) {
  // Render question with gaps highlighted
  const parts = question.questionText.split('____');
  const wordBank = question.gaps?.wordBank || [];

  return (
    <div className="space-y-4">
      <p className="font-playfair text-xl md:text-2xl text-[#2C1810] leading-relaxed text-center font-medium">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="inline-block min-w-[80px] border-b-2 border-[#8B6914] mx-1 text-transparent">____</span>
            )}
          </span>
        ))}
      </p>
      {question.scriptureReference && (
        <p className="text-center text-[#6B5B3E] text-sm font-playfair italic">
          ({question.scriptureReference})
        </p>
      )}
      <div className="border-t border-[#B8A06A]/40 pt-4">
        <p className="text-center font-outfit text-[#3D2B1F] text-base md:text-lg tracking-wide">
          [{wordBank.join(' | ')}]
        </p>
      </div>
    </div>
  );
}

function TheoryCard({ question }) {
  return (
    <div className="space-y-4">
      <p className="font-playfair text-xl md:text-2xl text-[#2C1810] leading-relaxed text-center font-medium">
        {question.questionText}
      </p>
      {question.scriptureReference && (
        <p className="text-center text-[#6B5B3E] text-sm font-playfair italic">
          ({question.scriptureReference})
        </p>
      )}
    </div>
  );
}

export default function QuestionCard() {
  const currentQuestion = useGameStore(s => s.currentQuestion);

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <AnimatePresence mode="wait">
        {currentQuestion ? (
          <motion.div
            key={currentQuestion.id}
            initial={{ scaleY: 0, opacity: 0, transformOrigin: 'top' }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="parchment w-full max-w-2xl p-8 md:p-10"
          >
            {currentQuestion.type === QUESTION_TYPES.OBJECTIVE && (
              <ObjectiveCard question={currentQuestion} />
            )}
            {currentQuestion.type === QUESTION_TYPES.GERMAN && (
              <GermanCard question={currentQuestion} />
            )}
            {currentQuestion.type === QUESTION_TYPES.THEORY && (
              <TheoryCard question={currentQuestion} />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-afc-gold/5 border border-afc-gold/10 flex items-center justify-center">
              <span className="font-cinzel text-4xl text-afc-gold/20">?</span>
            </div>
            <p className="font-cinzel text-afc-ivory-muted/30 text-sm tracking-widest uppercase">
              Awaiting Question Selection
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
