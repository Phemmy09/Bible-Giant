import { useGameStore } from '@/stores/gameStore';

export default function TitleBar() {
  const activeRound = useGameStore(s => s.activeRound);
  const session = useGameStore(s => s.session);
  const ultimateChallenge = useGameStore(s => s.ultimateChallenge);
  const zones = useGameStore(s => s.zones);

  const unitLabel = session.unitLabel || 'Zone';
  const topicLabel = activeRound?.topicLabel || 'Scripture';
  const roundNumber = activeRound?.roundNumber || 1;
  const isUC = activeRound?.isUltimateChallenge || roundNumber === 6;

  // Find active zone name for UC display
  const activeZoneName = ultimateChallenge?.activeZoneId
    ? zones.find(z => z.id === ultimateChallenge.activeZoneId)?.name || ''
    : '';

  return (
    <div className="w-full text-center py-3 px-4">
      {/* Line 1: Event title */}
      <p className="font-cinzel text-afc-gold text-xs md:text-sm tracking-[0.2em] uppercase">
        Inter-{unitLabel}al Bible Challenge on "{topicLabel}"
      </p>

      {/* Line 2: Round indicator */}
      <h2 className="font-cinzel text-afc-ivory text-xl md:text-2xl font-bold mt-1 tracking-wider">
        {isUC ? (
          <>
            <span className="text-gold-gradient">Ultimate Challenge</span>
            {activeZoneName && (
              <span className="block text-sm md:text-base text-afc-gold/70 font-normal mt-1">
                {unitLabel} Up: <span className="font-bold text-afc-gold">{activeZoneName}</span>
              </span>
            )}
          </>
        ) : (
          <span className="text-gold-gradient">Round {roundNumber}</span>
        )}
      </h2>
    </div>
  );
}
