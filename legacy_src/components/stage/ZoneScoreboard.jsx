import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { ZONE_COLORS } from '@/lib/constants';

export default function ZoneScoreboard() {
  const zones = useGameStore(s => s.zones);
  const activeZoneId = useGameStore(s => s.activeZoneId);
  const activeZones = zones.filter(z => !z.archived);

  return (
    <div className="w-full px-3 py-2">
      <div className="flex gap-2 justify-center">
        {activeZones.map((zone, i) => {
          const color = ZONE_COLORS[i % ZONE_COLORS.length];
          const isActive = zone.id === activeZoneId;

          return (
            <motion.div
              key={zone.id}
              layout
              className={`
                score-card flex-1 max-w-[180px] min-w-[100px] py-2 px-3 text-center
                ${isActive ? 'score-card-highlight ring-2 ring-afc-gold/50' : ''}
              `}
              style={{
                borderTopColor: color.bg,
                borderTopWidth: '3px',
              }}
            >
              {/* Zone Name */}
              <p className="font-cinzel text-xs font-bold tracking-wider text-afc-ivory/90 truncate uppercase">
                {zone.name}
              </p>

              {/* Score */}
              <motion.p
                key={zone.score}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.5 }}
                className="font-cinzel text-2xl md:text-3xl font-bold mt-1"
                style={{ color: color.bg }}
              >
                {zone.score}
              </motion.p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
