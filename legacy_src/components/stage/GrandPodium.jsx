import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { ZONE_COLORS } from '@/lib/constants';
import { Trophy, Medal, Award, Crown, Star } from 'lucide-react';

const rankIcons = {
  1: Crown,
  2: Medal,
  3: Award,
};

const rankColors = {
  1: 'from-yellow-400 to-amber-600',
  2: 'from-gray-300 to-gray-500',
  3: 'from-amber-600 to-amber-800',
};

export default function GrandPodium() {
  const podiumReveals = useGameStore(s => s.podiumReveals);
  const zones = useGameStore(s => s.zones);
  const session = useGameStore(s => s.session);

  if (podiumReveals.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-24 h-24 text-afc-gold/20 mx-auto mb-6" />
          <p className="font-cinzel text-afc-ivory-muted/30 text-xl tracking-widest">
            AWAITING PODIUM CEREMONY
          </p>
        </div>
      </div>
    );
  }

  // Reverse the reveals to show highest rank at top
  const sortedReveals = [...podiumReveals].sort((a, b) => a.rank - b.rank);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <p className="font-cinzel text-afc-gold text-xs tracking-[0.4em] uppercase mb-2">
          Grand Podium
        </p>
        <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-gold-gradient">
          Certificate of Scriptural Mastery
        </h2>
      </motion.div>

      <div className="w-full max-w-3xl space-y-3">
        <AnimatePresence>
          {sortedReveals.map((reveal, i) => {
            const RankIcon = rankIcons[reveal.rank] || Star;
            const zoneIndex = zones.findIndex(z => z.id === reveal.zoneId);
            const color = ZONE_COLORS[zoneIndex % ZONE_COLORS.length];
            const gradientClass = rankColors[reveal.rank] || 'from-afc-gold/50 to-afc-gold-dark/50';

            return (
              <motion.div
                key={reveal.rank}
                initial={{ x: -100, opacity: 0, scale: 0.9 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                  delay: i * 0.3,
                }}
                className={`
                  glass-card p-4 md:p-6 flex items-center gap-4
                  ${reveal.rank === 1 ? 'ring-2 ring-yellow-400/50 shadow-gold-intense' : ''}
                `}
              >
                {/* Rank Badge */}
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center flex-shrink-0`}>
                  <RankIcon className={`w-7 h-7 md:w-8 md:h-8 ${reveal.rank <= 3 ? 'text-white' : 'text-afc-navy'}`} />
                </div>

                {/* Zone Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-cinzel text-xs text-afc-gold/60 tracking-wider uppercase">
                    {reveal.rank === 1 ? 'Champion' : reveal.rank === 2 ? '1st Runner-Up' : reveal.rank === 3 ? '2nd Runner-Up' : `${reveal.rank}th Place`}
                  </p>
                  <p className="font-cinzel text-xl md:text-2xl font-bold text-afc-ivory truncate"
                     style={{ color: color.bg }}>
                    {reveal.zoneName}
                  </p>
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0">
                  <p className="font-cinzel text-2xl md:text-3xl font-bold text-afc-gold">
                    {reveal.score}
                  </p>
                  <p className="font-outfit text-afc-ivory-muted/40 text-xs">points</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Confetti particles for champion reveal */}
      {podiumReveals.some(r => r.rank === 1) && (
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
          {Array.from({ length: 30 }, (_, i) => (
            <motion.div
              key={i}
              initial={{
                x: Math.random() * window.innerWidth,
                y: -20,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: window.innerHeight + 50,
                rotate: 720 * (Math.random() > 0.5 ? 1 : -1),
                opacity: 0,
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 1.5,
                ease: 'easeIn',
              }}
              className="absolute w-3 h-3 rounded-sm"
              style={{
                backgroundColor: ZONE_COLORS[i % ZONE_COLORS.length].bg,
                left: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
