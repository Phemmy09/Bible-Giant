import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { ULTIMATE_CHALLENGE, DEMO_QUESTIONS } from '@/lib/constants';
import soundEngine from '@/lib/soundEngine';

export default function UltimateChallengeView() {
  const ultimateChallenge = useGameStore(s => s.ultimateChallenge);
  const ucKeypress = useGameStore(s => s.ucKeypress);
  const ucTimerTick = useGameStore(s => s.ucTimerTick);
  const zones = useGameStore(s => s.zones);
  const questions = useGameStore(s => s.questions);
  const soundEnabled = useGameStore(s => s.soundEnabled);
  const timerRef = useRef(null);

  const uc = ultimateChallenge;
  if (!uc) return null;

  const activeZone = zones.find(z => z.id === uc.activeZoneId);
  const timerSeconds = Math.ceil(uc.timerRemainingMs / 1000);
  const timerPercent = (uc.timerRemainingMs / ULTIMATE_CHALLENGE.timerDurationMs) * 100;

  // Timer
  useEffect(() => {
    if (uc && !uc.timerLocked) {
      timerRef.current = setInterval(() => {
        ucTimerTick();
        if (soundEnabled) soundEngine.playUCTick();
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [uc?.timerLocked, soundEnabled]);

  // Lock sound
  useEffect(() => {
    if (uc?.timerLocked && soundEnabled) {
      soundEngine.playTimerLockThud();
    }
  }, [uc?.timerLocked]);

  // Current question for display
  const currentQ = questions[uc.questionIndex - 1] || DEMO_QUESTIONS[0];
  const currentMark = uc.marks[uc.questionIndex - 1];

  return (
    <div className="flex-1 flex items-stretch gap-4 px-4 py-2">
      {/* LEFT: Countdown Bar */}
      <div className="flex flex-col items-center gap-2 w-16">
        <p className="font-cinzel text-afc-gold text-xs tracking-wider uppercase">Timer</p>
        <div className="countdown-bar flex-1 w-10 relative">
          <motion.div
            className={`countdown-fill ${uc.timerLocked ? 'countdown-locked' : ''}`}
            animate={{ height: `${timerPercent}%` }}
            transition={{ duration: 0.8, ease: 'linear' }}
          />
        </div>
        <p className={`font-cinzel text-2xl font-bold ${
          uc.timerLocked ? 'text-afc-crimson-light' : timerSeconds <= 10 ? 'text-afc-crimson-light' : 'text-afc-gold'
        }`}>
          {timerSeconds}
        </p>
        <p className="font-outfit text-afc-ivory-muted/40 text-xs">
          {uc.timerLocked ? 'LOCKED' : 'sec'}
        </p>
      </div>

      {/* CENTER: Question Display */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="font-cinzel text-afc-gold/60 text-sm mb-2 tracking-wider">
          Question {uc.questionIndex} of {ULTIMATE_CHALLENGE.questionsPerAttempt}
        </p>

        <motion.div
          key={uc.questionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className={`parchment w-full max-w-xl p-6 md:p-8 ${
            currentMark?.markedCorrect ? 'ring-2 ring-afc-emerald-light/50' : ''
          }`}
        >
          <p className="font-playfair text-lg md:text-xl text-[#2C1810] leading-relaxed text-center">
            {currentQ?.questionText || `Ultimate Challenge Question ${uc.questionIndex}`}
          </p>
          {currentMark?.markedCorrect && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mt-3 text-center"
            >
              <span className="inline-block px-4 py-1 rounded-full bg-afc-emerald/20 text-afc-emerald-light font-cinzel text-sm font-bold">
                ✓ MARKED CORRECT
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Navigation dots */}
        <div className="flex gap-2 mt-4">
          {Array.from({ length: ULTIMATE_CHALLENGE.questionsPerAttempt }, (_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                i + 1 === uc.questionIndex
                  ? 'bg-afc-gold scale-125'
                  : uc.marks[i]?.markedCorrect
                    ? 'bg-afc-emerald-light'
                    : 'bg-afc-navy-surface border border-afc-gold/20'
              }`}
            />
          ))}
        </div>

        <p className="font-outfit text-afc-ivory-muted/30 text-xs mt-3">
          ← Back | Next → | ↑ Mark Correct | ↓ Unmark
        </p>
      </div>

      {/* RIGHT: Point Ladder */}
      <div className="flex flex-col items-center gap-1 w-20">
        <p className="font-cinzel text-afc-gold text-xs tracking-wider uppercase mb-1">Points</p>
        <div className="flex flex-col-reverse gap-1 flex-1 justify-end">
          {ULTIMATE_CHALLENGE.ladderSteps.map((step) => {
            const isActive = uc.subtotal >= step;
            const isCurrent = uc.subtotal === step;

            return (
              <motion.div
                key={step}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`ladder-step text-sm ${
                  isCurrent
                    ? 'ladder-active text-lg'
                    : isActive
                      ? 'bg-afc-gold/10 text-afc-gold/80 border border-afc-gold/20'
                      : 'text-afc-ivory-muted/30'
                }`}
              >
                {step}
              </motion.div>
            );
          })}
        </div>
        <div className="mt-2 text-center">
          <p className="font-cinzel text-2xl font-bold text-afc-gold">{uc.subtotal}</p>
          <p className="font-outfit text-afc-ivory-muted/40 text-xs">subtotal</p>
        </div>
      </div>
    </div>
  );
}
