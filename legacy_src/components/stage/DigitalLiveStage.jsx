import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Users,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Award,
  Zap,
  QrCode
} from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { ZONE_COLORS } from '@/lib/constants';

export default function DigitalLiveStage() {
  const session = useGameStore(s => s.session);
  const zones = useGameStore(s => s.zones);
  const activeRound = useGameStore(s => s.activeRound);
  const currentQuestion = useGameStore(s => s.currentQuestion);
  const digitalStageView = useGameStore(s => s.digitalStageView);
  const questionTimerRemaining = useGameStore(s => s.questionTimerRemaining);
  const questionTimerRunning = useGameStore(s => s.questionTimerRunning);
  const connectedTeams = useGameStore(s => s.connectedTeams);
  const teamSubmissions = useGameStore(s => s.teamSubmissions);
  const audienceMembers = useGameStore(s => s.audienceMembers);
  const audiencePredictions = useGameStore(s => s.audiencePredictions);
  const timerTick = useGameStore(s => s.timerTick);

  // Timer interval
  useEffect(() => {
    if (!questionTimerRunning) return;
    const interval = setInterval(() => {
      timerTick();
    }, 1000);
    return () => clearInterval(interval);
  }, [questionTimerRunning, timerTick]);

  const activeZones = zones.filter(z => !z.archived);
  const totalTeams = activeZones.length;
  const answeredCount = Object.keys(teamSubmissions).length;

  const timerPercent = (questionTimerRemaining / 20) * 100;
  const timerColor =
    timerPercent > 50
      ? 'bg-blue-500'
      : timerPercent > 20
      ? 'bg-amber-500'
      : 'bg-rose-500 animate-pulse';

  // 1. PRE-SESSION / LOBBY JOIN SCREEN
  if (digitalStageView === 'join_lobby' || !currentQuestion) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        <div className="max-w-4xl w-full text-center space-y-8">
          {/* Logo & Headline */}
          <div className="space-y-2">
            <span className="px-4 py-1.5 rounded-full bg-afc-gold/10 border border-afc-gold/30 text-afc-gold text-xs font-mono font-bold tracking-widest uppercase">
              Digital Live Quiz Standard • WECA Camp Meeting Format
            </span>
            <h2 className="font-cinzel text-4xl md:text-6xl font-black text-gold-shimmer">
              Connect Your Devices
            </h2>
            <p className="font-outfit text-afc-ivory-muted text-sm md:text-base">
              Scan the QR code or enter the session code on your smartphone or podium laptop
            </p>
          </div>

          {/* Join Code & QR Podia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Session Code Card */}
            <div className="glass-card p-8 rounded-3xl border border-afc-gold/40 flex flex-col items-center justify-center space-y-3">
              <span className="text-xs uppercase font-bold tracking-wider text-afc-gold">
                Join with Session Code
              </span>
              <div className="font-mono text-5xl md:text-6xl font-black text-gold-shimmer tracking-widest bg-black/40 px-6 py-3 rounded-2xl border border-afc-gold/30 shadow-inner">
                {session.sessionCode || '345TWJ'}
              </div>
              <div className="text-xs text-afc-ivory-muted font-mono mt-1">
                afcbiblegiant.vercel.app/join
              </div>
            </div>

            {/* QR Code Card */}
            <div className="glass-card p-8 rounded-3xl border border-afc-gold/40 flex flex-col items-center justify-center space-y-3">
              <span className="text-xs uppercase font-bold tracking-wider text-afc-gold">
                Audience Quick-Scan
              </span>
              <div className="w-36 h-36 bg-white p-2.5 rounded-2xl shadow-xl flex items-center justify-center">
                {/* Visual SVG QR Code simulation */}
                <svg className="w-full h-full text-afc-navy" viewBox="0 0 100 100" fill="currentColor">
                  {/* Position markers */}
                  <rect x="5" y="5" width="26" height="26" rx="4" fill="#060B19" />
                  <rect x="9" y="9" width="18" height="18" rx="2" fill="white" />
                  <rect x="13" y="13" width="10" height="10" rx="1" fill="#060B19" />

                  <rect x="69" y="5" width="26" height="26" rx="4" fill="#060B19" />
                  <rect x="73" y="9" width="18" height="18" rx="2" fill="white" />
                  <rect x="77" y="13" width="10" height="10" rx="1" fill="#060B19" />

                  <rect x="5" y="69" width="26" height="26" rx="4" fill="#060B19" />
                  <rect x="9" y="73" width="18" height="18" rx="2" fill="white" />
                  <rect x="13" y="77" width="10" height="10" rx="1" fill="#060B19" />

                  {/* Random QR data points */}
                  <rect x="36" y="8" width="6" height="6" fill="#060B19" />
                  <rect x="46" y="8" width="6" height="6" fill="#060B19" />
                  <rect x="56" y="8" width="6" height="6" fill="#060B19" />
                  <rect x="36" y="20" width="6" height="6" fill="#060B19" />
                  <rect x="48" y="22" width="8" height="6" fill="#060B19" />
                  <rect x="8" y="38" width="6" height="6" fill="#060B19" />
                  <rect x="20" y="44" width="8" height="6" fill="#060B19" />
                  <rect x="36" y="38" width="10" height="10" rx="2" fill="#D4A017" />
                  <rect x="52" y="38" width="6" height="6" fill="#060B19" />
                  <rect x="64" y="38" width="6" height="6" fill="#060B19" />
                  <rect x="76" y="44" width="8" height="6" fill="#060B19" />
                  <rect x="38" y="54" width="8" height="6" fill="#060B19" />
                  <rect x="54" y="52" width="6" height="6" fill="#060B19" />
                  <rect x="68" y="56" width="6" height="6" fill="#060B19" />
                  <rect x="82" y="54" width="8" height="6" fill="#060B19" />
                  <rect x="38" y="70" width="6" height="6" fill="#060B19" />
                  <rect x="50" y="74" width="8" height="6" fill="#060B19" />
                  <rect x="66" y="70" width="6" height="6" fill="#060B19" />
                  <rect x="78" y="72" width="8" height="6" fill="#060B19" />
                </svg>
              </div>
              <span className="text-[10px] text-afc-ivory-muted/70 font-mono">
                Scan with smartphone camera
              </span>
            </div>
          </div>

          {/* Real-time Connection Counters */}
          <div className="flex items-center justify-center gap-6 md:gap-12">
            <div className="flex items-center gap-3 glass px-5 py-2.5 rounded-2xl border border-emerald-500/30">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <div className="text-left">
                <div className="font-mono text-xl font-bold text-emerald-400">
                  {Object.keys(connectedTeams).length} / {totalTeams}
                </div>
                <div className="text-[10px] text-afc-ivory-muted uppercase">Teams Ready</div>
              </div>
            </div>

            <div className="flex items-center gap-3 glass px-5 py-2.5 rounded-2xl border border-blue-500/30">
              <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
              <div className="text-left">
                <div className="font-mono text-xl font-bold text-blue-400">
                  {audienceMembers.length}
                </div>
                <div className="text-[10px] text-afc-ivory-muted uppercase">Audience Connected</div>
              </div>
            </div>
          </div>

          {/* Competing Units Roster Strip */}
          <div className="pt-4 border-t border-afc-gold/15">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {activeZones.map((z, idx) => {
                const team = connectedTeams[z.id];
                const color = ZONE_COLORS[idx % ZONE_COLORS.length];
                return (
                  <div
                    key={z.id}
                    className="p-3 rounded-xl glass border border-white/5 flex flex-col items-center text-center"
                  >
                    <div className="w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center mb-1.5 shadow-md" style={{ backgroundColor: color?.bg || '#C5A44E', color: color?.text || '#060B19' }}>
                      {z.name.charAt(0)}
                    </div>
                    <span className="font-cinzel text-xs font-bold text-white truncate w-full">
                      {z.name}
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 mt-0.5">
                      {team ? '✓ Connected' : 'Waiting...'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. SIMULTANEOUS TIMED QUESTION SCREEN
  if (digitalStageView === 'question') {
    return (
      <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full p-6 md:p-10 space-y-6">
        {/* Countdown Timer Bar (3-Stage) */}
        <div className="glass p-3 rounded-2xl border border-afc-gold/30 flex items-center gap-4">
          <div className="flex-1 bg-black/50 h-5 rounded-full overflow-hidden p-0.5 border border-white/10">
            <motion.div
              className={`h-full rounded-full transition-all duration-300 ${timerColor}`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className={`font-mono text-2xl font-black min-w-[3.5rem] text-right ${questionTimerRemaining <= 5 ? 'text-rose-400 animate-ping' : 'text-afc-gold'}`}>
              {questionTimerRemaining}s
            </span>
          </div>
        </div>

        {/* Live Answer-Progress Dots Header */}
        <div className="flex items-center justify-between glass px-5 py-2.5 rounded-2xl border border-afc-gold/20">
          <div className="flex items-center gap-2 text-xs font-outfit">
            <span className="text-afc-gold font-bold">Answers Submitted:</span>
            <span className="font-mono font-bold text-white">{answeredCount} / {totalTeams}</span>
          </div>

          <div className="flex items-center gap-2">
            {activeZones.map((z, idx) => {
              const hasAnswered = !!teamSubmissions[z.id];
              const color = ZONE_COLORS[idx % ZONE_COLORS.length];
              return (
                <div
                  key={z.id}
                  title={`${z.name}: ${hasAnswered ? 'Answered' : 'Thinking...'}`}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-mono transition-all ${
                    hasAnswered
                      ? 'scale-110 shadow-lg shadow-emerald-500/30 ring-2 ring-white'
                      : 'bg-white/10 text-white/40 border border-white/20'
                  }`}
                  style={hasAnswered ? { backgroundColor: color?.bg || '#27AE60', color: color?.text || '#060B19' } : {}}
                >
                  {z.name.charAt(0)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Big Question Card */}
        <div className="glass-card p-8 md:p-10 rounded-3xl border border-afc-gold/40 text-center space-y-4">
          <span className="text-xs uppercase font-bold tracking-widest text-afc-gold">
            Round {activeRound.roundNumber} • {activeRound.topicLabel}
          </span>
          <h2 className="font-cinzel text-2xl md:text-4xl font-bold text-white leading-relaxed">
            {currentQuestion.questionText}
          </h2>
          {currentQuestion.reference && (
            <p className="font-playfair italic text-xs text-afc-gold/70">
              — {currentQuestion.reference}
            </p>
          )}
        </div>

        {/* Four Option Rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(currentQuestion.options || ['A', 'B', 'C', 'D']).map((opt, idx) => {
            const letter = ['A', 'B', 'C', 'D'][idx];
            return (
              <div
                key={idx}
                className="glass p-5 rounded-2xl border border-afc-gold/25 flex items-center gap-4 text-left shadow-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-black/40 border border-afc-gold/40 text-afc-gold font-mono font-bold text-lg flex items-center justify-center shrink-0">
                  {letter}
                </div>
                <span className="font-outfit text-base md:text-lg font-medium text-white leading-snug">
                  {opt}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. CORRECT-ANSWER REVEAL SCREEN
  if (digitalStageView === 'reveal') {
    const correctLetter = ['A', 'B', 'C', 'D'][currentQuestion.correctIndex || 0];
    const correctText = currentQuestion.options?.[currentQuestion.correctIndex || 0] || 'Correct Answer';

    return (
      <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full p-6 md:p-10 space-y-6">
        {/* Correct Answer Highlight Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 md:p-8 rounded-3xl bg-emerald-950/40 border-2 border-emerald-400 text-center shadow-2xl shadow-emerald-500/20 space-y-2"
        >
          <span className="px-4 py-1 rounded-full bg-emerald-500 text-afc-navy font-mono font-black text-xs uppercase tracking-widest">
            CORRECT SCRIPTURAL ANSWER
          </span>
          <h2 className="font-cinzel text-3xl md:text-5xl font-black text-emerald-300">
            [{correctLetter}] {correctText}
          </h2>
          <p className="font-outfit text-xs text-afc-ivory-muted/70 max-w-xl mx-auto">
            {currentQuestion.questionText}
          </p>
        </motion.div>

        {/* Team Response Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {activeZones.map((z, idx) => {
            const sub = teamSubmissions[z.id];
            const color = ZONE_COLORS[idx % ZONE_COLORS.length];
            const letter = sub ? ['A', 'B', 'C', 'D'][sub.answerIndex] : '-';

            return (
              <motion.div
                key={z.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border text-center flex flex-col justify-between ${
                  sub?.isCorrect
                    ? 'bg-emerald-950/30 border-emerald-400 shadow-lg shadow-emerald-500/20'
                    : 'bg-black/30 border-rose-500/30'
                }`}
              >
                <div>
                  <div className="w-8 h-8 rounded-xl font-bold text-xs mx-auto flex items-center justify-center mb-2" style={{ backgroundColor: color?.bg || '#C5A44E', color: color?.text || '#060B19' }}>
                    {z.name.charAt(0)}
                  </div>
                  <h4 className="font-cinzel text-xs font-bold text-white truncate">{z.name}</h4>
                  <div className="font-mono text-2xl font-black my-1 text-white">
                    {letter}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  {sub?.isCorrect ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="font-mono text-xs font-bold text-emerald-300 mt-0.5">
                        +{sub.pointsAwarded} pts
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <XCircle className="w-5 h-5 text-rose-400" />
                      <span className="font-mono text-xs font-bold text-afc-ivory-muted/60 mt-0.5">
                        +0 pts
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // 4. ROUND RESULTS SCREEN
  return (
    <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full p-6 md:p-10 space-y-6">
      <div className="text-center space-y-1">
        <span className="text-xs uppercase font-bold tracking-widest text-afc-gold font-mono">
          Round {activeRound.roundNumber} Cumulative Standings
        </span>
        <h2 className="font-cinzel text-3xl md:text-5xl font-bold text-gold-gradient">
          Leaderboard Rankings
        </h2>
      </div>

      {/* Ranked Horizontal Bars */}
      <div className="space-y-3">
        {[...activeZones]
          .sort((a, b) => b.score - a.score)
          .map((z, idx) => {
            const color = ZONE_COLORS[idx % ZONE_COLORS.length];
            return (
              <div
                key={z.id}
                className="glass p-4 rounded-2xl border border-afc-gold/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-full font-mono text-sm font-bold flex items-center justify-center ${
                    idx === 0 ? 'bg-amber-400 text-black' : idx === 1 ? 'bg-slate-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-afc-gold'
                  }`}>
                    #{idx + 1}
                  </span>
                  <span className="font-cinzel text-base font-bold text-white">{z.name} ZONE</span>
                </div>

                <div className="font-mono text-2xl font-black text-gold-shimmer">
                  {z.score} <span className="text-xs text-afc-ivory-muted">pts</span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
