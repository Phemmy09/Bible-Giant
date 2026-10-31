import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { TILE_STATES } from '@/lib/constants';

export default function NumberBoard({ side = 'left' }) {
  const boardTiles = useGameStore(s => s.boardTiles);

  // Filter out removed tiles for display (but keep used ones briefly)
  const visibleTiles = boardTiles.filter(t => t.state !== TILE_STATES.REMOVED);

  // Split tiles between left and right boards
  const halfIndex = Math.ceil(visibleTiles.length / 2);
  const sideTiles = side === 'left'
    ? boardTiles.slice(0, Math.ceil(boardTiles.length / 2))
    : boardTiles.slice(Math.ceil(boardTiles.length / 2));

  // Calculate grid dimensions
  const tileCount = sideTiles.length;
  const cols = tileCount <= 4 ? 2 : tileCount <= 9 ? 3 : 4;

  return (
    <div className="flex flex-col items-center gap-1 p-2">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        <AnimatePresence mode="popLayout">
          {sideTiles.map((tile) => {
            if (tile.state === TILE_STATES.REMOVED) {
              return null;
            }

            const isActive = tile.state === TILE_STATES.ACTIVE;
            const isUsed = tile.state === TILE_STATES.USED;

            return (
              <motion.div
                key={tile.tileNumber}
                layout
                initial={{ opacity: 1, scale: 1 }}
                animate={{
                  opacity: isUsed ? 0.4 : 1,
                  scale: isUsed ? 0.92 : 1,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.7,
                  transition: { duration: 0.5 },
                }}
                className={`
                  w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center
                  font-cinzel font-bold text-base md:text-lg
                  transition-all duration-300
                  ${isActive
                    ? 'tile-active text-afc-navy'
                    : isUsed
                      ? 'tile-used'
                      : 'tile'
                  }
                `}
              >
                {isUsed ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-afc-gold/30 text-xl"
                  >
                    ✓
                  </motion.span>
                ) : (
                  tile.tileNumber
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
