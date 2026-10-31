import { useEffect, useCallback, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { SESSION_PHASES } from '@/lib/constants';
import soundEngine from '@/lib/soundEngine';
import ZoneScoreboard from '@/components/stage/ZoneScoreboard';
import TitleBar from '@/components/stage/TitleBar';
import NumberBoard from '@/components/stage/NumberBoard';
import QuestionCard from '@/components/stage/QuestionCard';
import JudgmentStamp from '@/components/stage/JudgmentStamp';
import UltimateChallengeView from '@/components/stage/UltimateChallenge';
import TurnOrderSpinner from '@/components/stage/TurnOrderSpinner';
import GrandPodium from '@/components/stage/GrandPodium';
import FooterBanner from '@/components/stage/FooterBanner';

import DigitalLiveStage from '@/components/stage/DigitalLiveStage';
import { initRealtimeSync } from '@/lib/realtimeSync';

export default function StagePage() {
  const session = useGameStore(s => s.session);
  const activeRound = useGameStore(s => s.activeRound);
  const ultimateChallenge = useGameStore(s => s.ultimateChallenge);
  const ucKeypress = useGameStore(s => s.ucKeypress);
  const soundEnabled = useGameStore(s => s.soundEnabled);
  const setSoundEnabled = useGameStore(s => s.setSoundEnabled);
  const [audioGated, setAudioGated] = useState(true);

  const isUC = activeRound?.isUltimateChallenge || activeRound?.roundNumber === 6;
  const isPodium = session.phase === SESSION_PHASES.PODIUM;
  const isDigitalLive = session.engineMode === 'digital_live';

  // Initialize Real-time synchronization
  useEffect(() => {
    const cleanup = initRealtimeSync(session.sessionCode);
    return cleanup;
  }, [session.sessionCode]);

  // Enable sound on first click
  const enableSound = useCallback(async () => {
    await soundEngine.enable();
    setSoundEnabled(true);
    setAudioGated(false);
  }, []);

  // Keyboard handler for Ultimate Challenge
  useEffect(() => {
    if (!ultimateChallenge) return;

    const handleKey = (e) => {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          ucKeypress('next');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          ucKeypress('back');
          break;
        case 'ArrowUp':
          e.preventDefault();
          ucKeypress('up');
          if (soundEnabled) soundEngine.playCorrectChime();
          break;
        case 'ArrowDown':
          e.preventDefault();
          ucKeypress('down');
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [ultimateChallenge, ucKeypress, soundEnabled]);

  return (
    <div className="min-h-screen bg-afc-navy flex flex-col relative overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-celestial pointer-events-none z-0" />

      {/* Sound Gate Overlay */}
      {audioGated && (
        <div
          className="fixed inset-0 z-[100] bg-afc-navy/90 backdrop-blur-sm flex items-center justify-center cursor-pointer"
          onClick={enableSound}
        >
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-gold flex items-center justify-center animate-pulse-gold">
              <svg className="w-10 h-10 text-afc-navy" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            </div>
            <p className="font-cinzel text-afc-gold text-lg tracking-wider">Click to Enable Sound</p>
            <p className="font-outfit text-afc-ivory-muted/50 text-sm mt-2">Required for the full broadcast experience</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Zone Scoreboard */}
        <ZoneScoreboard />

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-afc-gold/30 to-transparent" />

        {/* Title Bar */}
        <TitleBar />

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-afc-gold/20 to-transparent" />

        {/* Main Stage Area */}
        <div className="flex-1 flex items-stretch relative min-h-[400px]">
          {isPodium ? (
            <GrandPodium />
          ) : isDigitalLive ? (
            <DigitalLiveStage />
          ) : isUC && ultimateChallenge ? (
            <UltimateChallengeView />
          ) : (
            <>
              {/* Left Number Board */}
              <div className="hidden md:flex items-center">
                <NumberBoard side="left" />
              </div>

              {/* Center: Question Card + Judgment */}
              <div className="flex-1 relative flex items-center justify-center">
                <QuestionCard />
                <JudgmentStamp />
              </div>

              {/* Right Number Board */}
              <div className="hidden md:flex items-center">
                <NumberBoard side="right" />
              </div>
            </>
          )}
        </div>

        {/* Footer Banner */}
        <FooterBanner />
      </div>

      {/* Turn-Order Spinner Overlay */}
      <TurnOrderSpinner />
    </div>
  );
}
