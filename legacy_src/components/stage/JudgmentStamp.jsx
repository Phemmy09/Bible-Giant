import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';

export default function JudgmentStamp() {
  const judgmentStamp = useGameStore(s => s.judgmentStamp);

  return (
    <AnimatePresence>
      {judgmentStamp && (
        <motion.div
          key={judgmentStamp}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 ${
              judgmentStamp === 'correct' ? 'bg-afc-emerald' : 'bg-afc-crimson'
            }`}
          />

          {/* Stamp */}
          <motion.div
            initial={{ scale: 3, rotate: -15, opacity: 0 }}
            animate={{
              scale: 1,
              rotate: -5,
              opacity: 1,
              transition: {
                type: 'spring',
                stiffness: 300,
                damping: 20,
                duration: 0.4,
              },
            }}
            exit={{
              scale: 0.8,
              opacity: 0,
              transition: { duration: 0.3 },
            }}
            className={`
              ${judgmentStamp === 'correct' ? 'stamp-correct' : 'stamp-incorrect'}
              text-3xl md:text-5xl px-8 md:px-12 py-4 md:py-6
            `}
          >
            {judgmentStamp === 'correct' ? 'CORRECT!' : 'INCORRECT'}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
