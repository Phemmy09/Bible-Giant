'use client';

import React, { useState, useEffect } from 'react';
import {
  soundEngine,
  CLASSICAL_TRACKS,
  ClassicalTrack,
  SoundCue,
} from '@/lib/soundEngine';

export function Soundboard() {
  const [selectedTrack, setSelectedTrack] = useState<ClassicalTrack>('mozart_eine_kleine');
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState<ClassicalTrack | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeDrumroll, setActiveDrumroll] = useState(false);

  useEffect(() => {
    if (!soundEngine) return;
    const unsubscribe = soundEngine.subscribe(() => {
      const active = soundEngine.getActiveTrack();
      setIsPlaying(active.isPlaying);
      setActiveTrackId(active.trackId);
      setIsMuted(soundEngine.getIsMuted());
      setVolume(soundEngine.getVolume());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  function handlePlayTrack() {
    if (!soundEngine) return;
    if (isPlaying && activeTrackId === selectedTrack) {
      soundEngine.pauseTrack();
    } else if (!isPlaying && activeTrackId === selectedTrack) {
      soundEngine.resumeTrack();
    } else {
      soundEngine.playTrack(selectedTrack, true);
    }
  }

  function handleStopTrack() {
    if (!soundEngine) return;
    soundEngine.stopTrack();
  }

  function handleCue(cue: SoundCue) {
    if (!soundEngine) return;
    if (cue === 'drumroll') {
      setActiveDrumroll(!activeDrumroll);
    }
    soundEngine.playCue(cue);
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value);
    setVolume(val);
    soundEngine?.setVolume(val);
  }

  function handleToggleMute() {
    soundEngine?.toggleMute();
  }

  function handleStopAll() {
    setActiveDrumroll(false);
    soundEngine?.stopAll();
  }

  return (
    <div className="bg-white border border-navy-700/15 rounded-card shadow-soft p-4 transition-all">
      {/* Soundboard Header */}
      <div className="flex items-center justify-between pb-3 border-b border-navy-700/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎼</span>
          <div>
            <h4 className="font-display text-sm font-bold text-navy-900 leading-none">
              Live Soundboard & Classical Music
            </h4>
            <p className="text-[10px] text-ink-500 mt-0.5">
              Orchestral audio cues, tension beats & classical themes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleStopAll}
            className="px-2 py-1 rounded bg-danger/10 hover:bg-danger/20 text-danger text-[11px] font-bold transition-colors"
          >
            ⏹ Stop All
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-ink-500 hover:text-navy-900 font-bold px-1"
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-3 animate-fade-in">
          {/* SECTION 1: Classical Background Track Player */}
          <div className="p-3 bg-cream-50 rounded-btn border border-gold-500/30 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-navy-900">
                Symphonic Theme / Background Music
              </span>
              {isPlaying && (
                <span className="text-[10px] font-bold text-success flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" /> Playing Live
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value as ClassicalTrack)}
                className="flex-1 px-2.5 py-1.5 text-xs font-semibold rounded bg-white border border-navy-700/20 text-navy-900 focus:outline-none focus:ring-1 focus:ring-gold-500 truncate"
              >
                {CLASSICAL_TRACKS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.composer} — {t.title}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handlePlayTrack}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                  isPlaying && activeTrackId === selectedTrack
                    ? 'bg-gold-500 text-navy-950 shadow-soft'
                    : 'bg-navy-900 text-cream-50 hover:bg-navy-800'
                }`}
              >
                {isPlaying && activeTrackId === selectedTrack ? '⏸ Pause' : '▶ Play'}
              </button>

              <button
                type="button"
                onClick={handleStopTrack}
                className="px-2 py-1.5 rounded text-xs font-bold bg-cream-100 hover:bg-cream-200 text-ink-700"
              >
                ⏹ Stop
              </button>
            </div>
          </div>

          {/* SECTION 2: Instant Sound Effects / Beats Grid */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500 block mb-2">
              Instant Sound Cues & Cues
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Correct Bell */}
              <button
                type="button"
                onClick={() => handleCue('correct')}
                className="p-2 rounded bg-success/10 hover:bg-success/20 border border-success/30 text-success text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              >
                <span>🔔</span> Correct Chime
              </button>

              {/* Incorrect Buzzer */}
              <button
                type="button"
                onClick={() => handleCue('incorrect')}
                className="p-2 rounded bg-danger/10 hover:bg-danger/20 border border-danger/30 text-danger text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              >
                <span>❌</span> Wrong Buzzer
              </button>

              {/* Clock Tick */}
              <button
                type="button"
                onClick={() => handleCue('tick')}
                className="p-2 rounded bg-cream-100 hover:bg-cream-200 border border-navy-700/15 text-navy-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              >
                <span>⏱️</span> Tick-Tock
              </button>

              {/* Time's Up Gong */}
              <button
                type="button"
                onClick={() => handleCue('gong')}
                className="p-2 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              >
                <span>🔔</span> Time&apos;s Up
              </button>

              {/* Drumroll */}
              <button
                type="button"
                onClick={() => handleCue('drumroll')}
                className={`p-2 rounded border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                  activeDrumroll
                    ? 'bg-gold-500 text-navy-950 border-gold-500 animate-pulse'
                    : 'bg-cream-100 hover:bg-cream-200 border-navy-700/15 text-navy-900'
                }`}
              >
                <span>🥁</span> {activeDrumroll ? 'Stop Roll' : 'Drum Roll'}
              </button>

              {/* Applause */}
              <button
                type="button"
                onClick={() => handleCue('applause')}
                className="p-2 rounded bg-cream-100 hover:bg-cream-200 border border-navy-700/15 text-navy-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              >
                <span>👏</span> Applause
              </button>

              {/* Stadium Cheer */}
              <button
                type="button"
                onClick={() => handleCue('cheer')}
                className="p-2 rounded bg-cream-100 hover:bg-cream-200 border border-navy-700/15 text-navy-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              >
                <span>🙌</span> Crowd Cheer
              </button>

              {/* Victory Fanfare */}
              <button
                type="button"
                onClick={() => handleCue('fanfare')}
                className="p-2 rounded bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/40 text-navy-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              >
                <span>🎺</span> Victory Fanfare
              </button>
            </div>
          </div>

          {/* SECTION 3: Volume & Mute Controls */}
          <div className="pt-2 border-t border-navy-700/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleMute}
                className="font-bold text-navy-900 hover:text-gold-600"
              >
                {isMuted ? '🔇 Unmute' : '🔊 Mute'}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-24 accent-gold-500"
              />
              <span className="font-mono text-[10px] text-ink-500">
                {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>

            <span className="text-[10px] text-ink-500">
              Symphonic Classical Sound Engine
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
