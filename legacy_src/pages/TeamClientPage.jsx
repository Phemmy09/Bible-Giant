import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Smartphone,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  ChevronRight,
  Sparkles,
  Zap,
  Flame,
  ArrowLeft
} from 'lucide-react';
import { useGameStore, calculateSpeedPoints } from '@/stores/gameStore';
import { ZONE_COLORS } from '@/lib/constants';
import { initRealtimeSync } from '@/lib/realtimeSync';

export default function TeamClientPage() {
  const [searchParams] = useSearchParams();
  const session = useGameStore(s => s.session);
  const zones = useGameStore(s => s.zones);
  const currentQuestion = useGameStore(s => s.currentQuestion);
  const questionTimerRemaining = useGameStore(s => s.questionTimerRemaining);
  const questionTimerRunning = useGameStore(s => s.questionTimerRunning);
  const digitalStageView = useGameStore(s => s.digitalStageView);
  const teamSubmissions = useGameStore(s => s.teamSubmissions);
  const registerTeam = useGameStore(s => s.registerTeam);
  const submitTeamAnswer = useGameStore(s => s.submitTeamAnswer);

  // Local join form state
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [code, setCode] = useState(searchParams.get('session') || '');
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [timeTaken, setTimeTaken] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());

  // Connect to realtime channel
  useEffect(() => {
    const cleanup = initRealtimeSync(code || session.sessionCode);
    return cleanup;
  }, [code, session.sessionCode]);

  // Join handler
  const handleJoin = (e) => {
    e.preventDefault();
    if (!selectedZoneId) return;
    registerTeam(selectedZoneId, [player1 || 'Representative 1', player2 || 'Representative 2']);
    setIsJoined(true);
  };

  // Reset local answer selection on new question
  useEffect(() => {
    setSelectedOption(null);
    setStartTime(Date.now());
  }, [currentQuestion?.id]);

  const activeZone = zones.find(z => z.id === selectedZoneId);
  const zoneIndex = zones.findIndex(z => z.id === selectedZoneId);
  const zoneColor = zoneIndex >= 0 ? ZONE_COLORS[zoneIndex % ZONE_COLORS.length] : null;
  const mySubmission = selectedZoneId ? teamSubmissions[selectedZoneId] : null;

  const handleSelectAnswer = (index) => {
    if (selectedOption !== null || !questionTimerRunning || !currentQuestion) return;
    const elapsed = Date.now() - startTime;
    setSelectedOption(index);
    setTimeTaken(elapsed);
    submitTeamAnswer(selectedZoneId, index, elapsed);
  };

  // If not joined yet, show the Team Registration / Join Screen
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-afc-navy text-afc-ivory flex flex-col justify-between p-4 md:p-8 relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-celestial pointer-events-none" />
        <div className="bg-particles" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between max-w-xl mx-auto w-full">
          <Link to="/" className="flex items-center gap-2 text-afc-ivory-muted hover:text-afc-gold text-xs font-outfit transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <img src="/afc/jesus_light_logo.png" alt="Logo" className="w-6 h-6 object-contain" onError={(e) => { e.target.src = '/afc/Jesus the light of the world.jpg'; }} />
            <span className="font-cinzel text-xs font-bold text-afc-gold">Team Device Client</span>
          </div>
        </div>

        {/* Join Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 max-w-xl w-full mx-auto glass-card rounded-3xl p-6 sm:p-8 border border-afc-gold/30 shadow-2xl shadow-black/80 my-8"
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center mb-3">
              <Smartphone className="w-7 h-7" />
            </div>
            <h2 className="font-cinzel text-2xl font-bold text-gold-gradient">
              Zone Representative Portal
            </h2>
            <p className="font-outfit text-xs text-afc-ivory-muted/70 mt-1">
              Connect your team's podium laptop or tablet to the live tournament arena
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            {/* Session Code */}
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

            {/* Zone Selector */}
            <div>
              <label className="block font-outfit text-xs text-afc-gold font-semibold uppercase tracking-wider mb-1">
                Select Your Zone / Competing Unit
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {zones.filter(z => !z.archived).map((z, idx) => {
                  const isSelected = selectedZoneId === z.id;
                  const color = ZONE_COLORS[idx % ZONE_COLORS.length];
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setSelectedZoneId(z.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'font-bold shadow-md scale-[1.02] border-white'
                          : 'bg-white/5 border-afc-gold/20 hover:border-afc-gold/40 text-white'
                      }`}
                      style={isSelected ? { backgroundColor: color?.bg || '#C5A44E', color: color?.text || '#060B19' } : {}}
                    >
                      <div className="font-cinzel text-xs font-bold truncate">{z.name}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{z.score} pts</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Named Representatives */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block font-outfit text-[11px] text-afc-ivory-muted mb-1">
                  Representative 1 (Name)
                </label>
                <input
                  type="text"
                  value={player1}
                  onChange={(e) => setPlayer1(e.target.value)}
                  placeholder="e.g. Bro. Samuel A."
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-afc-gold/20 text-white text-xs focus:outline-none focus:border-afc-gold"
                  required
                />
              </div>
              <div>
                <label className="block font-outfit text-[11px] text-afc-ivory-muted mb-1">
                  Representative 2 (Name)
                </label>
                <input
                  type="text"
                  value={player2}
                  onChange={(e) => setPlayer2(e.target.value)}
                  placeholder="e.g. Sis. Deborah B."
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-afc-gold/20 text-white text-xs focus:outline-none focus:border-afc-gold"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedZoneId}
              className="w-full mt-4 py-3.5 rounded-xl bg-gradient-gold text-afc-navy font-cinzel font-bold text-sm shadow-gold-glow hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              Enter Live Arena As {activeZone?.name || 'Team'} →
            </button>
          </form>
        </motion.div>

        {/* Footer */}
        <div className="relative z-10 text-center font-outfit text-[11px] text-afc-ivory-muted/40">
          The Apostolic Faith Church • Ekiti Area YDD Broadcast Standard
        </div>
      </div>
    );
  }

  // Active Client Arena
  const timerPercent = (questionTimerRemaining / 20) * 100;
  const timerStageClass =
    timerPercent > 50
      ? 'bg-blue-500'
      : timerPercent > 20
      ? 'bg-amber-500'
      : 'bg-rose-500 animate-pulse';

  return (
    <div className="min-h-screen bg-[#060B19] text-afc-ivory flex flex-col justify-between p-3 sm:p-6 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-celestial pointer-events-none" />

      {/* Top Status Bar */}
      <header className="relative z-10 flex items-center justify-between glass-card p-3 rounded-2xl border border-afc-gold/20 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-md" style={{ backgroundColor: zoneColor?.bg || '#C5A44E', color: zoneColor?.text || '#060B19' }}>
            {activeZone?.name?.charAt(0)}
          </div>
          <div>
            <div className="font-cinzel text-sm font-bold text-white flex items-center gap-2">
              <span>{activeZone?.name} ZONE</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                CONNECTED
              </span>
            </div>
            <div className="text-[11px] text-afc-ivory-muted/70 font-outfit">
              {player1 || 'Rep 1'} & {player2 || 'Rep 2'}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-afc-gold font-bold">Cumulative Score</div>
          <div className="font-mono text-xl sm:text-2xl font-black text-gold-shimmer">
            {activeZone?.score} <span className="text-xs text-afc-ivory-muted">pts</span>
          </div>
        </div>
      </header>

      {/* Main Arena Content */}
      <main className="relative z-10 flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full my-auto">
        {/* CASE 1: WAITING STATE (No question active or lobby) */}
        {(!currentQuestion || digitalStageView === 'join_lobby') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-3xl p-8 sm:p-12 text-center border border-afc-gold/30 shadow-2xl my-auto space-y-5"
          >
            <div className="w-16 h-16 rounded-full bg-afc-gold/10 border border-afc-gold/40 text-afc-gold mx-auto flex items-center justify-center animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="font-cinzel text-2xl font-bold text-gold-gradient">
              Waiting for Next Question...
            </h3>
            <p className="font-outfit text-sm text-afc-ivory-muted/80 max-w-md mx-auto">
              The Quizmaster is preparing the next challenge. Watch the main sanctuary screen and keep your hands ready.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-afc-gold/20 text-xs font-mono text-afc-gold">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Speed-weighted scoring active: up to 1,000 pts per question</span>
            </div>
          </motion.div>
        )}

        {/* CASE 2: LIVE QUESTION ANSWERING */}
        {currentQuestion && digitalStageView === 'question' && (
          <div className="space-y-4">
            {/* 3-Stage Animated Timer Bar */}
            <div className="glass p-2 rounded-2xl border border-afc-gold/20 flex items-center gap-3">
              <div className="flex-1 bg-black/40 h-4 rounded-full overflow-hidden p-0.5 border border-white/10">
                <motion.div
                  className={`h-full rounded-full transition-all duration-300 ${timerStageClass}`}
                  style={{ width: `${timerPercent}%` }}
                />
              </div>
              <span className={`font-mono text-base font-bold min-w-[3rem] text-right ${questionTimerRemaining <= 5 ? 'text-rose-400 animate-ping' : 'text-afc-gold'}`}>
                {questionTimerRemaining}s
              </span>
            </div>

            {/* Question Text Display */}
            <div className="glass-card p-6 rounded-2xl border border-afc-gold/30">
              <div className="flex items-center justify-between text-xs text-afc-gold font-bold mb-2">
                <span>QUESTION IN PLAY</span>
                <span className="font-mono">{currentQuestion.reference || 'Scripture Challenge'}</span>
              </div>
              <h2 className="font-cinzel text-lg sm:text-xl font-bold text-white leading-relaxed">
                {currentQuestion.questionText}
              </h2>
            </div>

            {/* Answer Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(currentQuestion.options || ['Option A', 'Option B', 'Option C', 'Option D']).map((opt, idx) => {
                const letter = ['A', 'B', 'C', 'D'][idx];
                const isSelected = selectedOption === idx;
                const isDisabled = selectedOption !== null || !questionTimerRunning;

                return (
                  <button
                    key={idx}
                    disabled={isDisabled}
                    onClick={() => handleSelectAnswer(idx)}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                      isSelected
                        ? 'bg-afc-gold text-afc-navy font-bold border-white shadow-gold-glow scale-[1.02]'
                        : isDisabled
                        ? 'bg-white/5 border-white/10 opacity-40 cursor-not-allowed text-white'
                        : 'bg-white/5 border-afc-gold/20 hover:border-afc-gold hover:bg-afc-gold/10 text-white cursor-pointer active:scale-98'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`w-8 h-8 rounded-xl font-bold font-mono text-sm flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-afc-navy text-afc-gold' : 'bg-black/40 text-afc-gold border border-afc-gold/30'
                      }`}>
                        {letter}
                      </span>
                      <span className="font-outfit text-sm font-medium pt-1 leading-snug">
                        {opt}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Post-selection feedback */}
            {selectedOption !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 text-center flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="font-outfit text-sm font-semibold text-emerald-300">
                  Answer locked in at {(timeTaken / 1000).toFixed(2)}s. Waiting for official stage reveal...
                </span>
              </motion.div>
            )}
          </div>
        )}

        {/* CASE 3: REVEAL / RESULTS STAGE */}
        {currentQuestion && digitalStageView === 'reveal' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 sm:p-8 rounded-3xl border border-afc-gold/40 text-center space-y-5"
          >
            {mySubmission?.isCorrect ? (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border-2 border-emerald-400 shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="font-cinzel text-2xl font-bold text-emerald-400">
                  CORRECT ANSWER!
                </h3>
                <div className="font-mono text-3xl font-black text-gold-shimmer">
                  +{mySubmission.pointsAwarded} PTS
                </div>
                <p className="font-outfit text-xs text-afc-ivory-muted">
                  Answered in {(mySubmission.timeTakenMs / 1000).toFixed(2)} seconds
                </p>
              </div>
            ) : mySubmission ? (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center border-2 border-rose-400">
                  <XCircle className="w-10 h-10" />
                </div>
                <h3 className="font-cinzel text-2xl font-bold text-rose-400">
                  INCORRECT
                </h3>
                <div className="font-mono text-xl font-bold text-afc-ivory-muted">
                  +0 PTS
                </div>
                <p className="font-outfit text-xs text-afc-ivory-muted">
                  Correct Answer: {currentQuestion.options?.[currentQuestion.correctIndex]}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Clock className="w-12 h-12 text-amber-400 mx-auto" />
                <h3 className="font-cinzel text-xl font-bold text-amber-300">
                  TIME EXPIRED — NO ANSWER
                </h3>
                <p className="font-outfit text-xs text-afc-ivory-muted">
                  Correct Answer: {currentQuestion.options?.[currentQuestion.correctIndex]}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Persistent Bottom Ticker */}
      <footer className="relative z-10 glass-card px-4 py-2.5 rounded-2xl border border-afc-gold/15 flex items-center justify-between text-xs font-outfit text-afc-ivory-muted/70">
        <div>Session Code: <span className="font-mono font-bold text-afc-gold">{session.sessionCode}</span></div>
        <div>Ekiti Area Inter-Zonal Bible Challenge</div>
      </footer>
    </div>
  );
}
