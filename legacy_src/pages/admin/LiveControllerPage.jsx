import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Play, Pause, SkipForward, RotateCcw,
  CheckCircle2, XCircle, Volume2, VolumeX,
  CircleDot, Trophy, Zap, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight as ChevronRightIcon, Timer, Target
} from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { TILE_STATES, ROUNDS, SOUND_CUES, ZONE_COLORS, SESSION_PHASES, ULTIMATE_CHALLENGE } from '@/lib/constants';
import soundEngine from '@/lib/soundEngine';

export default function LiveControllerPage() {
  const {
    session, zones, activeRound, boardTiles, currentQuestion, judgmentStamp,
    activeZoneId, ultimateChallenge, soundEnabled, drawOrder,
    setRoundNumber, setTopicLabel, pickTile, markCorrect, markIncorrect, clearJudgment,
    setActiveZone, showSpinner, setSoundEnabled, resetBoard, setPhase,
    startUltimateChallenge, ucKeypress, commitUltimateChallenge,
    updateZoneScore,
  } = useGameStore();

  const [scoreAdjustZone, setScoreAdjustZone] = useState('');
  const [scoreAdjustDelta, setScoreAdjustDelta] = useState('');
  const [scoreAdjustReason, setScoreAdjustReason] = useState('');
  const [topicInput, setTopicInput] = useState(activeRound?.topicLabel || '');

  const activeZones = zones.filter(z => !z.archived);
  const isUC = activeRound?.roundNumber === 6;
  const uc = ultimateChallenge;

  // Handle sound toggle
  const toggleSound = useCallback(async () => {
    if (!soundEnabled) {
      await soundEngine.enable();
      setSoundEnabled(true);
    } else {
      soundEngine.stopAll();
      setSoundEnabled(false);
    }
  }, [soundEnabled]);

  // Play sound cue
  const playCue = useCallback((cue) => {
    if (soundEnabled) soundEngine.playCue(cue);
  }, [soundEnabled]);

  // Handle score adjustment
  const handleScoreAdjust = () => {
    if (!scoreAdjustZone || !scoreAdjustDelta || !scoreAdjustReason || scoreAdjustReason.length < 5) return;
    updateZoneScore(scoreAdjustZone, parseInt(scoreAdjustDelta), scoreAdjustReason);
    setScoreAdjustDelta('');
    setScoreAdjustReason('');
  };

  return (
    <div className="min-h-screen bg-afc-navy relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-celestial pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-afc-ivory-muted/50 hover:text-afc-gold transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-cinzel text-xl font-bold text-gold-gradient">
              Live Stage Controller
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className={`px-3 py-2 rounded-lg glass flex items-center gap-2 text-sm font-outfit transition-all ${
                soundEnabled ? 'text-afc-gold border-afc-gold/30' : 'text-afc-ivory-muted/40'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {soundEnabled ? 'Sound On' : 'Sound Off'}
            </button>
            <Link to="/stage" target="_blank" className="px-3 py-2 rounded-lg glass text-afc-gold text-sm font-outfit">
              Stage ↗
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ==== LEFT COLUMN: Round Control + Board ==== */}
          <div className="lg:col-span-2 space-y-4">
            {/* Round Selector */}
            <div className="glass-card p-4">
              <h3 className="font-cinzel text-afc-gold text-sm tracking-wider mb-3">Round Selector</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {[1, 2, 3, 4, 5, 6].map((num) => {
                  const isActive = activeRound?.roundNumber === num;
                  const roundInfo = ROUNDS[num];
                  return (
                    <button
                      key={num}
                      onClick={() => setRoundNumber(num)}
                      className={`px-4 py-2 rounded-lg font-cinzel text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-gold text-afc-navy shadow-gold-glow'
                          : 'glass text-afc-ivory-muted/60 hover:text-afc-gold hover:border-afc-gold/30'
                      }`}
                    >
                      {num === 6 ? '⚡ UC' : `R${num}`}
                    </button>
                  );
                })}
              </div>
              {/* Topic Label */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="Topic/Book label (e.g., Genesis Book)"
                  className="flex-1 bg-afc-navy-mid/60 border border-afc-gold/20 rounded-lg px-3 py-2 text-afc-ivory font-outfit text-sm focus:border-afc-gold/50 focus:outline-none"
                />
                <button
                  onClick={() => setTopicLabel(topicInput)}
                  className="px-4 py-2 rounded-lg bg-afc-gold/10 text-afc-gold font-outfit text-sm hover:bg-afc-gold/20 transition-all"
                >
                  Set
                </button>
              </div>
              <p className="font-outfit text-afc-ivory-muted/30 text-xs mt-2">
                Current: <span className="text-afc-gold/50">{ROUNDS[activeRound?.roundNumber]?.description || ''}</span>
              </p>
            </div>

            {/* Question Board or UC Console */}
            {isUC ? (
              /* ---- Ultimate Challenge Console ---- */
              <div className="glass-card p-6">
                <h3 className="font-cinzel text-afc-gold text-sm tracking-wider mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Ultimate Challenge Console
                </h3>

                {!uc ? (
                  /* Zone selector to start UC */
                  <div className="space-y-3">
                    <p className="font-outfit text-afc-ivory-muted/60 text-sm">Select a zone to begin their 60-second attempt:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {activeZones.map((zone, i) => (
                        <button
                          key={zone.id}
                          onClick={() => startUltimateChallenge(zone.id)}
                          className="px-4 py-3 rounded-xl glass font-cinzel text-sm font-semibold hover:border-afc-gold/40 hover:shadow-gold-glow transition-all"
                          style={{ color: ZONE_COLORS[i % ZONE_COLORS.length].bg }}
                        >
                          {zone.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Active UC controls */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-outfit text-afc-ivory-muted/60 text-sm">Zone Up:</p>
                        <p className="font-cinzel text-afc-gold text-lg font-bold">
                          {activeZones.find(z => z.id === uc.activeZoneId)?.name || ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-outfit text-afc-ivory-muted/60 text-sm">Timer:</p>
                        <p className={`font-cinzel text-2xl font-bold ${
                          uc.timerLocked ? 'text-afc-crimson-light' : 'text-afc-gold'
                        }`}>
                          {Math.ceil(uc.timerRemainingMs / 1000)}s {uc.timerLocked ? '(LOCKED)' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-outfit text-afc-ivory-muted/60 text-sm">Q:</p>
                        <p className="font-cinzel text-2xl font-bold text-afc-ivory">
                          {uc.questionIndex}/{ULTIMATE_CHALLENGE.questionsPerAttempt}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-outfit text-afc-ivory-muted/60 text-sm">Subtotal:</p>
                        <p className="font-cinzel text-2xl font-bold text-afc-emerald-light">{uc.subtotal}</p>
                      </div>
                    </div>

                    {/* Keyboard controls */}
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => ucKeypress('back')} className="px-4 py-3 rounded-xl glass hover:border-afc-gold/40 transition-all">
                        <ChevronLeft className="w-6 h-6 text-afc-ivory" />
                      </button>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => { ucKeypress('up'); playCue(SOUND_CUES.CORRECT_CHIME); }} className="px-6 py-2 rounded-xl bg-afc-emerald/20 border border-afc-emerald/40 hover:bg-afc-emerald/30 transition-all">
                          <ChevronUp className="w-6 h-6 text-afc-emerald-light mx-auto" />
                          <span className="font-outfit text-xs text-afc-emerald-light">Mark ✓</span>
                        </button>
                        <button onClick={() => ucKeypress('down')} className="px-6 py-2 rounded-xl bg-afc-crimson/20 border border-afc-crimson/40 hover:bg-afc-crimson/30 transition-all">
                          <ChevronDown className="w-6 h-6 text-afc-crimson-light mx-auto" />
                          <span className="font-outfit text-xs text-afc-crimson-light">Unmark</span>
                        </button>
                      </div>
                      <button onClick={() => ucKeypress('next')} className="px-4 py-3 rounded-xl glass hover:border-afc-gold/40 transition-all">
                        <ChevronRightIcon className="w-6 h-6 text-afc-ivory" />
                      </button>
                    </div>

                    {/* Marks grid */}
                    <div className="flex gap-2 justify-center">
                      {uc.marks.map((m, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            i + 1 === uc.questionIndex
                              ? 'ring-2 ring-afc-gold bg-afc-gold/10'
                              : m.markedCorrect
                                ? 'bg-afc-emerald/20 text-afc-emerald-light'
                                : 'bg-afc-navy-surface text-afc-ivory-muted/30'
                          }`}
                        >
                          {m.markedCorrect ? '✓' : i + 1}
                        </div>
                      ))}
                    </div>

                    {/* Commit button */}
                    <button
                      onClick={commitUltimateChallenge}
                      className="w-full py-3 rounded-xl bg-gradient-gold text-afc-navy font-cinzel font-bold tracking-wider hover:shadow-gold-intense transition-all"
                    >
                      Commit {uc.subtotal} Points to {activeZones.find(z => z.id === uc.activeZoneId)?.name}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ---- Standard Round: Question Board Mirror ---- */
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-cinzel text-afc-gold text-sm tracking-wider">Question Board</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={showSpinner}
                      className="px-3 py-1.5 rounded-lg glass text-afc-gold text-xs font-outfit hover:border-afc-gold/30 transition-all flex items-center gap-1"
                    >
                      <CircleDot className="w-3 h-3" /> Spinner
                    </button>
                    <button
                      onClick={resetBoard}
                      className="px-3 py-1.5 rounded-lg glass text-afc-ivory-muted/40 text-xs font-outfit hover:text-afc-crimson-light transition-all flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  </div>
                </div>

                {/* Zone Turn Indicator */}
                <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                  {activeZones.map((zone, i) => (
                    <button
                      key={zone.id}
                      onClick={() => setActiveZone(zone.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-cinzel font-semibold transition-all whitespace-nowrap ${
                        activeZoneId === zone.id
                          ? 'bg-afc-gold/20 border border-afc-gold/40 text-afc-gold'
                          : 'glass text-afc-ivory-muted/40 hover:text-afc-ivory'
                      }`}
                    >
                      {zone.name}
                    </button>
                  ))}
                </div>

                {/* Tile Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {boardTiles.map((tile) => {
                    if (tile.state === TILE_STATES.REMOVED) return null;
                    const isActive = tile.state === TILE_STATES.ACTIVE;
                    const isUsed = tile.state === TILE_STATES.USED;

                    return (
                      <button
                        key={tile.tileNumber}
                        onClick={() => !isUsed && !isActive && pickTile(tile.tileNumber)}
                        disabled={isUsed || isActive}
                        className={`aspect-square rounded-lg font-cinzel font-bold text-sm transition-all ${
                          isActive
                            ? 'tile-active text-afc-navy'
                            : isUsed
                              ? 'tile-used'
                              : 'tile hover:scale-105'
                        }`}
                      >
                        {isUsed ? '✓' : tile.tileNumber}
                      </button>
                    );
                  })}
                </div>

                {/* Current Question Preview */}
                {currentQuestion && (
                  <div className="mt-4 p-4 rounded-xl bg-afc-navy-mid/50 border border-afc-gold/10">
                    <p className="font-outfit text-afc-ivory-muted/40 text-xs mb-1">Current Question:</p>
                    <p className="font-playfair text-afc-ivory text-sm">
                      {currentQuestion.questionText}
                    </p>
                    {currentQuestion.correctAnswer && (
                      <p className="font-outfit text-afc-emerald-light/50 text-xs mt-2">
                        Correct: {currentQuestion.correctAnswer}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Judgment Controls (Standard rounds only) */}
            {!isUC && (
              <div className="glass-card p-4">
                <h3 className="font-cinzel text-afc-gold text-sm tracking-wider mb-3">Judgment</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (activeZoneId) {
                        markCorrect(activeZoneId);
                        playCue(SOUND_CUES.CORRECT_CHIME);
                      }
                    }}
                    disabled={!currentQuestion || !activeZoneId || !!judgmentStamp}
                    className={`flex-1 py-4 rounded-xl font-cinzel font-bold text-lg tracking-wider transition-all flex items-center justify-center gap-2 ${
                      !currentQuestion || !activeZoneId || judgmentStamp
                        ? 'bg-afc-emerald/10 text-afc-emerald-light/30 cursor-not-allowed'
                        : 'bg-afc-emerald/20 text-afc-emerald-light border border-afc-emerald/30 hover:bg-afc-emerald/30 hover:shadow-lg'
                    }`}
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    CORRECT
                  </button>
                  <button
                    onClick={() => {
                      markIncorrect();
                      playCue(SOUND_CUES.INCORRECT_BUZZ);
                    }}
                    disabled={!currentQuestion || !!judgmentStamp}
                    className={`flex-1 py-4 rounded-xl font-cinzel font-bold text-lg tracking-wider transition-all flex items-center justify-center gap-2 ${
                      !currentQuestion || judgmentStamp
                        ? 'bg-afc-crimson/10 text-afc-crimson-light/30 cursor-not-allowed'
                        : 'bg-afc-crimson/20 text-afc-crimson-light border border-afc-crimson/30 hover:bg-afc-crimson/30 hover:shadow-lg'
                    }`}
                  >
                    <XCircle className="w-6 h-6" />
                    INCORRECT
                  </button>
                </div>
                {!activeZoneId && currentQuestion && (
                  <p className="font-outfit text-amber-400/60 text-xs mt-2 text-center">
                    ⚠ Select an active zone above before marking correct
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ==== RIGHT COLUMN: Scoreboard + Soundboard + Score Adjust ==== */}
          <div className="space-y-4">
            {/* Live Scoreboard */}
            <div className="glass-card p-4">
              <h3 className="font-cinzel text-afc-gold text-sm tracking-wider mb-3">Scoreboard</h3>
              <div className="space-y-2">
                {activeZones.sort((a, b) => b.score - a.score).map((zone, i) => (
                  <div
                    key={zone.id}
                    className={`flex items-center gap-3 py-2 px-3 rounded-lg ${
                      zone.id === activeZoneId ? 'bg-afc-gold/10 border border-afc-gold/20' : 'bg-afc-navy-mid/30'
                    }`}
                  >
                    <span className="font-cinzel text-afc-ivory-muted/40 text-xs w-6">#{i + 1}</span>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: ZONE_COLORS[zones.indexOf(zone) % ZONE_COLORS.length].bg }}
                    />
                    <span className="font-cinzel text-afc-ivory text-sm font-semibold flex-1">{zone.name}</span>
                    <span className="font-cinzel text-afc-gold text-lg font-bold">{zone.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Soundboard */}
            <div className="glass-card p-4">
              <h3 className="font-cinzel text-afc-gold text-sm tracking-wider mb-3">Soundboard</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Suspense', cue: SOUND_CUES.SUSPENSE_DRONE, icon: '🎵' },
                  { label: 'Correct', cue: SOUND_CUES.CORRECT_CHIME, icon: '✅' },
                  { label: 'Incorrect', cue: SOUND_CUES.INCORRECT_BUZZ, icon: '❌' },
                  { label: 'Fanfare', cue: SOUND_CUES.FANFARE, icon: '🎺' },
                  { label: 'Applause', cue: SOUND_CUES.APPLAUSE, icon: '👏' },
                  { label: 'Tick', cue: SOUND_CUES.METRONOME_TICK, icon: '🕐' },
                ].map(({ label, cue, icon }) => (
                  <button
                    key={cue}
                    onClick={() => playCue(cue)}
                    className="px-3 py-2 rounded-lg glass text-afc-ivory-muted/60 text-xs font-outfit hover:text-afc-gold hover:border-afc-gold/30 transition-all flex items-center gap-2"
                  >
                    <span>{icon}</span> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Score Adjustment */}
            <div className="glass-card p-4">
              <h3 className="font-cinzel text-afc-gold text-sm tracking-wider mb-3">Score Adjustment</h3>
              <div className="space-y-2">
                <select
                  value={scoreAdjustZone}
                  onChange={(e) => setScoreAdjustZone(e.target.value)}
                  className="w-full bg-afc-navy-mid/60 border border-afc-gold/20 rounded-lg px-3 py-2 text-afc-ivory font-outfit text-sm focus:border-afc-gold/50 focus:outline-none"
                >
                  <option value="">Select zone...</option>
                  {activeZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
                <input
                  type="number"
                  value={scoreAdjustDelta}
                  onChange={(e) => setScoreAdjustDelta(e.target.value)}
                  placeholder="Points (+/-)"
                  className="w-full bg-afc-navy-mid/60 border border-afc-gold/20 rounded-lg px-3 py-2 text-afc-ivory font-outfit text-sm focus:border-afc-gold/50 focus:outline-none"
                />
                <input
                  type="text"
                  value={scoreAdjustReason}
                  onChange={(e) => setScoreAdjustReason(e.target.value)}
                  placeholder="Reason (min 5 chars)"
                  className="w-full bg-afc-navy-mid/60 border border-afc-gold/20 rounded-lg px-3 py-2 text-afc-ivory font-outfit text-sm focus:border-afc-gold/50 focus:outline-none"
                />
                <button
                  onClick={handleScoreAdjust}
                  disabled={!scoreAdjustZone || !scoreAdjustDelta || scoreAdjustReason.length < 5}
                  className="w-full py-2 rounded-lg bg-afc-gold/10 text-afc-gold font-outfit text-sm hover:bg-afc-gold/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Apply Adjustment
                </button>
              </div>
            </div>

            {/* Phase Controls */}
            <div className="glass-card p-4">
              <h3 className="font-cinzel text-afc-gold text-sm tracking-wider mb-3">Session Phase</h3>
              <div className="flex flex-wrap gap-2">
                {Object.values(SESSION_PHASES).map(phase => (
                  <button
                    key={phase}
                    onClick={() => setPhase(phase)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-outfit transition-all ${
                      session.phase === phase
                        ? 'bg-afc-gold/20 text-afc-gold border border-afc-gold/30'
                        : 'glass text-afc-ivory-muted/40 hover:text-afc-ivory'
                    }`}
                  >
                    {phase.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Digital Live Controls (When engineMode === 'digital_live') */}
            {session.engineMode === 'digital_live' && (
              <div className="glass-card p-4 border border-afc-gold/40 shadow-gold-glow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-cinzel text-afc-gold text-sm tracking-wider flex items-center gap-1.5 font-bold">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    Digital Live Console
                  </h3>
                  <span className="font-mono text-xs text-afc-gold font-bold px-2 py-0.5 rounded bg-afc-gold/10">
                    {session.sessionCode}
                  </span>
                </div>

                {/* Stage View Switcher */}
                <div className="space-y-2 mb-4">
                  <span className="text-[10px] text-afc-ivory-muted uppercase font-bold">Stage View:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'join_lobby', label: '1. Join Lobby' },
                      { id: 'question', label: '2. Question' },
                      { id: 'reveal', label: '3. Reveal' },
                      { id: 'results', label: '4. Results' },
                    ].map(v => (
                      <button
                        key={v.id}
                        onClick={() => useGameStore.getState().setDigitalStageView(v.id)}
                        className="px-2 py-1.5 rounded-lg text-xs font-outfit text-left bg-white/5 hover:bg-afc-gold/20 border border-white/10 hover:border-afc-gold/40 text-white"
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Timer Control */}
                <div className="space-y-2 mb-4">
                  <span className="text-[10px] text-afc-ivory-muted uppercase font-bold">Question Timer & Reveal:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        useGameStore.setState({ questionTimerRemaining: 20, questionTimerRunning: true, digitalStageView: 'question' });
                        playCue(SOUND_CUES.METRONOME_TICK);
                      }}
                      className="flex-1 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-outfit text-xs font-bold hover:bg-emerald-500/30"
                    >
                      ▶ Start 20s
                    </button>
                    <button
                      onClick={() => useGameStore.getState().stopQuestionTimer()}
                      className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-afc-ivory-muted text-xs font-outfit hover:text-white"
                    >
                      Pause
                    </button>
                    <button
                      onClick={() => {
                        useGameStore.getState().revealDigitalAnswers();
                        playCue(SOUND_CUES.FANFARE);
                      }}
                      className="flex-1 py-2 rounded-xl bg-gradient-gold text-afc-navy font-cinzel text-xs font-bold shadow-md hover:scale-102"
                    >
                      Reveal & Score
                    </button>
                  </div>
                </div>

                {/* Audience Prediction Window Toggle */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-afc-ivory-muted">Audience Prediction Window:</span>
                  <button
                    onClick={() => useGameStore.getState().togglePredictionWindow(!useGameStore.getState().predictionWindowOpen)}
                    className="px-3 py-1 rounded-lg bg-afc-gold/15 hover:bg-afc-gold text-afc-gold hover:text-afc-navy text-xs font-bold transition-all"
                  >
                    Toggle Window
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
