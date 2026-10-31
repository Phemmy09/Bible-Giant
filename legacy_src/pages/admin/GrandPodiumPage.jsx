import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Medal, Award, Crown, Star, Sparkles, FileText } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { ZONE_COLORS, SESSION_PHASES } from '@/lib/constants';
import soundEngine from '@/lib/soundEngine';
import CertificateModal from '@/components/admin/CertificateModal';

export default function GrandPodiumPage() {
  const [isCertOpen, setIsCertOpen] = useState(false);
  const { zones, podiumReveals, revealNextPodiumRank, resetPodium, setPhase, soundEnabled } = useGameStore();
  const activeZones = zones.filter(z => !z.archived);
  const sortedZones = [...activeZones].sort((a, b) => b.score - a.score);

  const canReveal = podiumReveals.length < activeZones.length;
  const allRevealed = podiumReveals.length === activeZones.length;

  const handleReveal = () => {
    if (soundEnabled) {
      if (podiumReveals.length === activeZones.length - 1) {
        soundEngine.playFanfare();
      } else {
        soundEngine.playPodiumReveal();
      }
    }
    revealNextPodiumRank();
  };

  return (
    <div className="min-h-screen bg-afc-navy relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-celestial pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin" className="text-afc-ivory-muted/50 hover:text-afc-gold transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-cinzel text-xl font-bold text-gold-gradient">Grand Podium & Ceremony</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div className="glass-card p-6">
              <h3 className="font-cinzel text-afc-gold text-sm tracking-wider mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4" /> Ceremony Controls
              </h3>

              <div className="space-y-3">
                <button
                  onClick={() => setPhase(SESSION_PHASES.PODIUM)}
                  className="w-full py-3 rounded-xl glass text-afc-gold font-cinzel text-sm tracking-wider hover:border-afc-gold/40 transition-all"
                >
                  Switch Stage to Podium Mode
                </button>

                <button
                  onClick={handleReveal}
                  disabled={!canReveal}
                  className={`w-full py-4 rounded-xl font-cinzel font-bold text-lg tracking-wider transition-all flex items-center justify-center gap-2 ${
                    canReveal
                      ? 'bg-gradient-gold text-afc-navy hover:shadow-gold-intense hover:scale-[1.02]'
                      : 'bg-afc-gold/10 text-afc-gold/30 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  {podiumReveals.length === 0
                    ? 'Begin Reveal'
                    : allRevealed
                      ? 'All Revealed!'
                      : `Reveal #${activeZones.length - podiumReveals.length} Place`
                  }
                </button>

                <button
                  onClick={() => setIsCertOpen(true)}
                  className="w-full py-3 rounded-xl border border-afc-gold/40 bg-afc-gold/10 text-afc-gold font-cinzel font-semibold text-sm tracking-wider hover:bg-afc-gold/20 hover:border-afc-gold transition-all flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  Generate Official Certificates
                </button>

                {podiumReveals.length > 0 && (
                  <button
                    onClick={resetPodium}
                    className="w-full py-2 rounded-xl glass text-afc-ivory-muted/40 font-outfit text-sm hover:text-afc-crimson-light transition-all"
                  >
                    Reset Podium
                  </button>
                )}
              </div>
            </div>

            {/* Current Rankings Preview */}
            <div className="glass-card p-6">
              <h3 className="font-cinzel text-afc-gold text-sm tracking-wider mb-4">Current Rankings</h3>
              <div className="space-y-2">
                {sortedZones.map((zone, i) => {
                  const zoneIndex = zones.indexOf(zone);
                  return (
                    <div key={zone.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-afc-navy-mid/30">
                      <span className="font-cinzel text-afc-gold/40 text-xs w-6">#{i + 1}</span>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ZONE_COLORS[zoneIndex % ZONE_COLORS.length].bg }} />
                      <span className="font-cinzel text-afc-ivory text-sm flex-1">{zone.name}</span>
                      <span className="font-cinzel text-afc-gold text-sm font-bold">{zone.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Revealed History */}
          <div className="glass-card p-6">
            <h3 className="font-cinzel text-afc-gold text-sm tracking-wider mb-4">Revealed</h3>
            {podiumReveals.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-afc-gold/10 mx-auto mb-4" />
                <p className="font-outfit text-afc-ivory-muted/20 text-sm">
                  No ranks revealed yet. Click "Begin Reveal" to start the ceremony.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...podiumReveals].sort((a, b) => a.rank - b.rank).map((reveal) => {
                  const icons = { 1: Crown, 2: Medal, 3: Award };
                  const Icon = icons[reveal.rank] || Star;
                  return (
                    <motion.div
                      key={reveal.rank}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex items-center gap-3 py-3 px-4 rounded-xl ${
                        reveal.rank === 1 ? 'bg-yellow-500/10 border border-yellow-500/20' :
                        reveal.rank === 2 ? 'bg-gray-400/10 border border-gray-400/20' :
                        reveal.rank === 3 ? 'bg-amber-700/10 border border-amber-700/20' :
                        'bg-afc-navy-mid/30'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${
                        reveal.rank === 1 ? 'text-yellow-400' :
                        reveal.rank === 2 ? 'text-gray-300' :
                        reveal.rank === 3 ? 'text-amber-600' :
                        'text-afc-gold/40'
                      }`} />
                      <div className="flex-1">
                        <p className="font-cinzel text-afc-ivory font-semibold">{reveal.zoneName}</p>
                        <p className="font-outfit text-afc-ivory-muted/40 text-xs">
                          {reveal.rank === 1 ? 'Champion' : reveal.rank === 2 ? '1st Runner-Up' : reveal.rank === 3 ? '2nd Runner-Up' : `${reveal.rank}th Place`}
                        </p>
                      </div>
                      <span className="font-cinzel text-afc-gold text-lg font-bold">{reveal.score}</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Certificate Modal */}
      <CertificateModal
        isOpen={isCertOpen}
        onClose={() => setIsCertOpen(false)}
        zones={zones}
        reveals={podiumReveals}
      />
    </div>
  );
}
