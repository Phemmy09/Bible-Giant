import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Smartphone,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Sparkles,
  Trophy,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { ZONE_COLORS } from '@/lib/constants';
import { initRealtimeSync } from '@/lib/realtimeSync';

export default function AudiencePage() {
  const [searchParams] = useSearchParams();
  const session = useGameStore(s => s.session);
  const zones = useGameStore(s => s.zones);
  const currentQuestion = useGameStore(s => s.currentQuestion);
  const questionTimerRemaining = useGameStore(s => s.questionTimerRemaining);
  const questionTimerRunning = useGameStore(s => s.questionTimerRunning);
  const digitalStageView = useGameStore(s => s.digitalStageView);
  const audienceMembers = useGameStore(s => s.audienceMembers);
  const predictionWindowOpen = useGameStore(s => s.predictionWindowOpen);
  const registerAudience = useGameStore(s => s.registerAudience);
  const submitAudienceAnswer = useGameStore(s => s.submitAudienceAnswer);
  const submitAudiencePrediction = useGameStore(s => s.submitAudiencePrediction);

  // Local state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(searchParams.get('session') || '');
  const [audienceId, setAudienceId] = useState(null);
  const [activeTab, setActiveTab] = useState('trivia'); // 'trivia' | 'prediction' | 'leaderboard'
  const [selectedOption, setSelectedOption] = useState(null);
  const [startTime, setStartTime] = useState(Date.now());
  const [predictedRanks, setPredictedRanks] = useState([]);
  const [predictionSubmitted, setPredictionSubmitted] = useState(false);

  // Connect to realtime channel
  useEffect(() => {
    const cleanup = initRealtimeSync(code || session.sessionCode);
    return cleanup;
  }, [code, session.sessionCode]);

  // Initialize predicted ranks with active zones
  useEffect(() => {
    if (zones.length > 0 && predictedRanks.length === 0) {
      setPredictedRanks(zones.filter(z => !z.archived).map(z => z.id));
    }
  }, [zones]);

  // Reset answer selection on new question
  useEffect(() => {
    setSelectedOption(null);
    setStartTime(Date.now());
  }, [currentQuestion?.id]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = registerAudience(name.trim(), phone.trim());
    setAudienceId(id);
  };

  const handleSelectAnswer = (index) => {
    if (selectedOption !== null || !questionTimerRunning || !currentQuestion || !audienceId) return;
    const elapsed = Date.now() - startTime;
    setSelectedOption(index);
    submitAudienceAnswer(audienceId, index, elapsed);
  };

  const handlePredictionReorder = (fromIdx, toIdx) => {
    const list = [...predictedRanks];
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    setPredictedRanks(list);
  };

  const handleSubmitPrediction = () => {
    if (!audienceId) return;
    submitAudiencePrediction(audienceId, predictedRanks);
    setPredictionSubmitted(true);
  };

  const myMember = audienceMembers.find(m => m.id === audienceId);

  // If not joined, show audience registration card
  if (!audienceId) {
    return (
      <div className="min-h-screen bg-[#060B19] text-afc-ivory flex flex-col justify-between p-4 md:p-8 relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-celestial pointer-events-none" />
        <div className="bg-particles" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between max-w-md mx-auto w-full">
          <Link to="/" className="flex items-center gap-1.5 text-afc-ivory-muted hover:text-afc-gold text-xs font-outfit">
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <img src="/afc/jesus_light_logo.png" alt="Logo" className="w-6 h-6 object-contain" onError={(e) => { e.target.src = '/afc/Jesus the light of the world.jpg'; }} />
            <span className="font-cinzel text-xs font-bold text-afc-gold">Audience App</span>
          </div>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-md w-full mx-auto glass-card rounded-3xl p-6 sm:p-8 border border-afc-gold/30 shadow-2xl my-8"
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/40 text-blue-400 mx-auto flex items-center justify-center mb-3">
              <Users className="w-7 h-7" />
            </div>
            <h2 className="font-cinzel text-2xl font-bold text-gold-gradient">
              Audience Companion
            </h2>
            <p className="font-outfit text-xs text-afc-ivory-muted/70 mt-1">
              Join the live congregation arena. Play along with trivia and predict the winning Zone!
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block font-outfit text-xs text-afc-gold font-semibold uppercase tracking-wider mb-1">
                Session Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. 345TWJ"
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-afc-gold/30 text-afc-gold font-mono font-bold text-center tracking-widest uppercase focus:outline-none focus:border-afc-gold"
                required
              />
            </div>

            <div>
              <label className="block font-outfit text-xs text-afc-gold font-semibold uppercase tracking-wider mb-1">
                Your Name / Branch
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sis. Kehinde (Ado Zone)"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-afc-gold/20 text-white text-xs focus:outline-none focus:border-afc-gold"
                required
              />
            </div>

            <div>
              <label className="block font-outfit text-xs text-afc-gold font-semibold uppercase tracking-wider mb-1">
                Mobile Number (Masked for Privacy)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 08012345678"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-afc-gold/20 text-white text-xs focus:outline-none focus:border-afc-gold"
                required
              />
              <span className="text-[10px] text-afc-ivory-muted/50 mt-1 block">
                Only the last 4 digits will appear on the Top 100 Leaderboard.
              </span>
            </div>

            <button
              type="submit"
              className="w-full mt-4 py-3 rounded-xl bg-gradient-gold text-afc-navy font-cinzel font-bold text-sm shadow-gold-glow hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              Join Audience Arena →
            </button>
          </form>
        </motion.div>

        <div className="relative z-10 text-center font-outfit text-[11px] text-afc-ivory-muted/40">
          The Apostolic Faith Church • Ekiti Area YDD Live Trivia
        </div>
      </div>
    );
  }

  // Active Audience View
  return (
    <div className="min-h-screen bg-[#060B19] text-afc-ivory flex flex-col justify-between p-3 sm:p-6 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-celestial pointer-events-none" />

      {/* Header Bar */}
      <header className="relative z-10 glass-card p-3 rounded-2xl border border-afc-gold/20 mb-4 flex items-center justify-between">
        <div>
          <div className="font-cinzel text-sm font-bold text-white flex items-center gap-2">
            <span>{myMember?.name}</span>
            <span className="text-[10px] font-mono text-afc-gold px-2 py-0.5 rounded-full bg-afc-gold/10">
              {myMember?.phoneMask}
            </span>
          </div>
          <div className="text-[10px] text-afc-ivory-muted font-outfit">Congregational Participant</div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-afc-gold font-bold">Your Score</div>
          <div className="font-mono text-xl font-bold text-gold-shimmer">
            {myMember?.score || 0} <span className="text-xs text-afc-ivory-muted">pts</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="relative z-10 flex items-center justify-center gap-2 mb-4">
        <button
          onClick={() => setActiveTab('trivia')}
          className={`px-4 py-2 rounded-xl text-xs font-outfit font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'trivia'
              ? 'bg-gradient-gold text-afc-navy shadow-gold-glow'
              : 'glass text-afc-ivory-muted hover:text-white'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Live Trivia</span>
        </button>

        <button
          onClick={() => setActiveTab('prediction')}
          className={`px-4 py-2 rounded-xl text-xs font-outfit font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'prediction'
              ? 'bg-gradient-gold text-afc-navy shadow-gold-glow'
              : 'glass text-afc-ivory-muted hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Zone Prediction</span>
          {predictionWindowOpen && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 rounded-xl text-xs font-outfit font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'leaderboard'
              ? 'bg-gradient-gold text-afc-navy shadow-gold-glow'
              : 'glass text-afc-ivory-muted hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Leaderboard</span>
        </button>
      </nav>

      {/* Body Content */}
      <main className="relative z-10 flex-1 flex flex-col justify-center max-w-xl mx-auto w-full my-auto">
        {/* TAB 1: LIVE TRIVIA */}
        {activeTab === 'trivia' && (
          <div>
            {!currentQuestion ? (
              <div className="glass-card rounded-3xl p-8 text-center border border-afc-gold/20 space-y-4">
                <Clock className="w-12 h-12 text-afc-gold mx-auto animate-pulse" />
                <h3 className="font-cinzel text-xl font-bold text-gold-gradient">
                  Waiting for Next Scripture Question...
                </h3>
                <p className="font-outfit text-xs text-afc-ivory-muted/70">
                  When a question is revealed on the stage projector, it will appear here in real time for you to answer!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="glass p-2.5 rounded-2xl border border-afc-gold/20 flex items-center justify-between text-xs">
                  <span className="text-afc-gold font-bold">Speed Timer:</span>
                  <span className="font-mono text-base font-bold text-white">{questionTimerRemaining}s</span>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-afc-gold/30">
                  <h3 className="font-cinzel text-base font-bold text-white leading-relaxed">
                    {currentQuestion.questionText}
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {(currentQuestion.options || ['A', 'B', 'C', 'D']).map((opt, idx) => {
                    const letter = ['A', 'B', 'C', 'D'][idx];
                    const isSelected = selectedOption === idx;
                    const isDisabled = selectedOption !== null || !questionTimerRunning;

                    return (
                      <button
                        key={idx}
                        disabled={isDisabled}
                        onClick={() => handleSelectAnswer(idx)}
                        className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                          isSelected
                            ? 'bg-afc-gold text-afc-navy font-bold border-white scale-[1.01]'
                            : isDisabled
                            ? 'bg-white/5 border-white/10 opacity-40 text-white'
                            : 'bg-white/5 border-afc-gold/20 hover:border-afc-gold text-white active:scale-98'
                        }`}
                      >
                        <span className="w-7 h-7 rounded-lg bg-black/40 text-afc-gold font-mono font-bold flex items-center justify-center shrink-0">
                          {letter}
                        </span>
                        <span className="font-outfit text-xs sm:text-sm">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ZONE PREDICTION */}
        {activeTab === 'prediction' && (
          <div className="glass-card rounded-3xl p-6 border border-afc-gold/30 space-y-4">
            <div className="text-center">
              <h3 className="font-cinzel text-lg font-bold text-gold-gradient">
                Who's Winning the Tournament?
              </h3>
              <p className="font-outfit text-xs text-afc-ivory-muted/70 mt-1">
                Rank the competing Zones from 1st to Last place based on who you predict will triumph!
              </p>
            </div>

            <div className="space-y-2">
              {predictedRanks.map((zoneId, idx) => {
                const zone = zones.find(z => z.id === zoneId);
                const zIdx = zones.findIndex(z => z.id === zoneId);
                const color = ZONE_COLORS[zIdx >= 0 ? zIdx % ZONE_COLORS.length : 0];
                return (
                  <div
                    key={zoneId}
                    className="p-3 rounded-xl glass border border-afc-gold/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-afc-gold/20 text-afc-gold font-mono font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="font-cinzel text-xs font-bold text-white">{zone?.name} ZONE</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {idx > 0 && (
                        <button
                          onClick={() => handlePredictionReorder(idx, idx - 1)}
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] text-afc-gold"
                        >
                          ▲ Up
                        </button>
                      )}
                      {idx < predictedRanks.length - 1 && (
                        <button
                          onClick={() => handlePredictionReorder(idx, idx + 1)}
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] text-afc-gold"
                        >
                          ▼ Down
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSubmitPrediction}
              className="w-full py-3 rounded-xl bg-gradient-gold text-afc-navy font-cinzel font-bold text-xs shadow-gold-glow hover:scale-[1.02] active:scale-95 transition-all"
            >
              {predictionSubmitted ? '✓ Prediction Submitted (Tap to Update)' : 'Lock In Your Prediction →'}
            </button>
          </div>
        )}

        {/* TAB 3: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="glass-card rounded-3xl p-6 border border-afc-gold/30 space-y-4">
            <div className="text-center">
              <Trophy className="w-8 h-8 text-afc-gold mx-auto mb-1" />
              <h3 className="font-cinzel text-lg font-bold text-gold-gradient">
                Audience Top 100 Rewards
              </h3>
              <p className="font-outfit text-xs text-afc-ivory-muted/70">
                Top scripture participants across the congregation
              </p>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {audienceMembers
                .sort((a, b) => b.score - a.score)
                .map((m, idx) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl flex items-center justify-between border ${
                      m.id === audienceId
                        ? 'bg-afc-gold/15 border-afc-gold text-white font-bold'
                        : 'glass border-white/5 text-afc-ivory-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full font-mono text-xs flex items-center justify-center font-bold ${
                        idx === 0 ? 'bg-amber-400 text-black' : idx === 1 ? 'bg-slate-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-afc-gold'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-outfit text-white">{m.name}</div>
                        <div className="text-[10px] font-mono text-afc-ivory-muted/60">{m.phoneMask}</div>
                      </div>
                    </div>

                    <div className="font-mono text-sm font-bold text-afc-gold">
                      {m.score} pts
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center font-outfit text-[10px] text-afc-ivory-muted/50 mt-2">
        Apostolic Faith Church Ekiti Area • 74 Ajilosun St, Ado-Ekiti
      </footer>
    </div>
  );
}
