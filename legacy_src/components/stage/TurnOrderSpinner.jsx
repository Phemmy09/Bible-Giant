import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { ZONE_COLORS } from '@/lib/constants';
import soundEngine from '@/lib/soundEngine';

export default function TurnOrderSpinner() {
  const zones = useGameStore(s => s.zones);
  const spinnerVisible = useGameStore(s => s.spinnerVisible);
  const hideSpinner = useGameStore(s => s.hideSpinner);
  const setDrawOrder = useGameStore(s => s.setDrawOrder);
  const soundEnabled = useGameStore(s => s.soundEnabled);
  const activeRound = useGameStore(s => s.activeRound);

  const [drawnOrder, setDrawnOrder] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [remainingZones, setRemainingZones] = useState([]);

  const activeZones = zones.filter(z => !z.archived);

  // Reset when spinner becomes visible
  useEffect(() => {
    if (spinnerVisible) {
      setDrawnOrder([]);
      setRemainingZones(activeZones.map(z => z.id));
      setRotation(0);
    }
  }, [spinnerVisible]);

  const spin = useCallback(() => {
    if (isSpinning || remainingZones.length === 0) return;

    // Server-side logic: pick a random zone (uniform)
    const randomIndex = Math.floor(Math.random() * remainingZones.length);
    const chosenZoneId = remainingZones[randomIndex];

    // Calculate spin animation
    const segmentAngle = 360 / remainingZones.length;
    const targetSegment = remainingZones.indexOf(chosenZoneId);
    // Spin to land on the chosen segment (pointer at top = 0deg)
    const extraRotations = 3 + Math.floor(Math.random() * 3); // 3-5 full rotations
    const targetAngle = 360 * extraRotations + (360 - targetSegment * segmentAngle - segmentAngle / 2);

    setIsSpinning(true);
    setRotation(prev => prev + targetAngle);

    if (soundEnabled) soundEngine.playWheelSpin();

    // After animation completes
    setTimeout(() => {
      if (soundEnabled) soundEngine.playWheelLand();
      const zone = zones.find(z => z.id === chosenZoneId);
      const position = drawnOrder.length + 1;

      setDrawnOrder(prev => [...prev, { position, zoneId: chosenZoneId, zoneName: zone?.name }]);
      setRemainingZones(prev => prev.filter(id => id !== chosenZoneId));
      setIsSpinning(false);
    }, 4000);
  }, [isSpinning, remainingZones, drawnOrder, zones, soundEnabled]);

  const confirmOrder = () => {
    setDrawOrder({
      id: `draw-${Date.now()}`,
      roundId: activeRound?.id,
      drawnSequence: drawnOrder,
      completed: true,
    });
    hideSpinner();
  };

  if (!spinnerVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
    >
      <div className="w-full max-w-6xl px-8 flex flex-col items-center">
        {/* Header */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <p className="font-cinzel text-afc-gold text-xs tracking-[0.4em] uppercase mb-2">
            Round {activeRound?.roundNumber || ''}
          </p>
          <h2 className="font-cinzel text-4xl md:text-5xl font-bold text-white">
            Who Plays First?
          </h2>
        </motion.div>

        <div className="flex items-center gap-12 w-full justify-center">
          {/* Wheel */}
          <div className="relative">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-20">
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-afc-gold" />
            </div>

            <motion.div
              className="spinner-wheel w-64 h-64 md:w-80 md:h-80 relative overflow-hidden"
              animate={{ rotate: rotation }}
              transition={{
                duration: 4,
                ease: [0.17, 0.67, 0.12, 0.99],
              }}
            >
              {/* SVG wheel segments */}
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {remainingZones.map((zoneId, i) => {
                  const segAngle = 360 / remainingZones.length;
                  const startAngle = i * segAngle - 90;
                  const endAngle = startAngle + segAngle;

                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;

                  const x1 = 100 + 95 * Math.cos(startRad);
                  const y1 = 100 + 95 * Math.sin(startRad);
                  const x2 = 100 + 95 * Math.cos(endRad);
                  const y2 = 100 + 95 * Math.sin(endRad);

                  const largeArc = segAngle > 180 ? 1 : 0;
                  const zoneIndex = zones.findIndex(z => z.id === zoneId);
                  const color = ZONE_COLORS[zoneIndex % ZONE_COLORS.length];

                  // Label position (midpoint of arc)
                  const midRad = ((startAngle + segAngle / 2) * Math.PI) / 180;
                  const labelX = 100 + 60 * Math.cos(midRad);
                  const labelY = 100 + 60 * Math.sin(midRad);
                  const labelRotation = startAngle + segAngle / 2 + 90;

                  const zone = zones.find(z => z.id === zoneId);

                  return (
                    <g key={zoneId}>
                      <path
                        d={`M 100 100 L ${x1} ${y1} A 95 95 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={color.bg}
                        stroke="rgba(0,0,0,0.3)"
                        strokeWidth="1"
                      />
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${labelRotation}, ${labelX}, ${labelY})`}
                        fill={color.text}
                        fontSize="9"
                        fontFamily="'Cinzel', serif"
                        fontWeight="700"
                      >
                        {zone?.name || ''}
                      </text>
                    </g>
                  );
                })}
                {/* Center circle */}
                <circle cx="100" cy="100" r="18" fill="#060B19" stroke="rgba(197,164,78,0.5)" strokeWidth="2" />
                <text x="100" y="100" textAnchor="middle" dominantBaseline="middle" fill="#C5A44E" fontSize="8" fontFamily="'Cinzel', serif" fontWeight="700">
                  SPIN
                </text>
              </svg>
            </motion.div>
          </div>

          {/* Drawing Order Panel */}
          <div className="w-64 glass-card p-6">
            <h3 className="font-cinzel text-afc-gold text-sm tracking-wider uppercase mb-4">
              Drawing Order
            </h3>
            <div className="space-y-2">
              {Array.from({ length: activeZones.length }, (_, i) => {
                const drawn = drawnOrder[i];
                return (
                  <motion.div
                    key={i}
                    initial={drawn ? { x: -20, opacity: 0 } : {}}
                    animate={drawn ? { x: 0, opacity: 1 } : {}}
                    className={`flex items-center gap-3 py-2 px-3 rounded-lg ${
                      drawn ? 'bg-afc-gold/10 border border-afc-gold/20' : 'border border-afc-navy-surface'
                    }`}
                  >
                    <span className={`font-cinzel text-sm font-bold w-8 ${
                      drawn ? 'text-afc-gold' : 'text-afc-ivory-muted/30'
                    }`}>
                      {i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}
                    </span>
                    <span className={`font-outfit text-sm flex-1 ${
                      drawn ? 'text-afc-ivory' : 'text-afc-ivory-muted/20'
                    }`}>
                      {drawn ? drawn.zoneName : '—'}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Controls */}
            <div className="mt-6 space-y-2">
              {remainingZones.length > 0 ? (
                <button
                  onClick={spin}
                  disabled={isSpinning}
                  className={`w-full py-3 rounded-xl font-cinzel font-bold tracking-wider transition-all ${
                    isSpinning
                      ? 'bg-afc-gold/20 text-afc-gold/50 cursor-wait'
                      : 'bg-gradient-gold text-afc-navy hover:shadow-gold-intense hover:scale-105'
                  }`}
                >
                  {isSpinning ? 'Spinning...' : 'SPIN'}
                </button>
              ) : (
                <button
                  onClick={confirmOrder}
                  className="w-full py-3 rounded-xl font-cinzel font-bold tracking-wider bg-gradient-gold text-afc-navy hover:shadow-gold-intense hover:scale-105 transition-all"
                >
                  CONFIRM ORDER
                </button>
              )}
              <button
                onClick={hideSpinner}
                className="w-full py-2 rounded-xl font-outfit text-sm text-afc-ivory-muted/50 hover:text-afc-ivory transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
