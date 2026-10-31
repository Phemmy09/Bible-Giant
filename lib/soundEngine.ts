// AFC Bible Giant — Symphonic Audio Engine & Live Soundboard
// Supports authentic orchestral audio files with Web Audio API synthesis fallback

export type ClassicalTrack =
  | 'mozart_eine_kleine'
  | 'beethoven_symphony_5'
  | 'beethoven_ode_to_joy'
  | 'handel_hallelujah'
  | 'handel_fireworks'
  | 'rossini_william_tell'
  | 'vivaldi_summer_storm'
  | 'ceremonial_march'
  | 'victory_fanfare'
  | 'mozart_figaro_overture'
  | 'mozart_turkish_march';

export type SoundCue =
  | 'correct'
  | 'incorrect'
  | 'tick'
  | 'gong'
  | 'drumroll'
  | 'applause'
  | 'cheer'
  | 'fanfare'
  | 'suspense';

export interface TrackInfo {
  id: ClassicalTrack;
  title: string;
  composer: string;
  filename: string;
}

export const CLASSICAL_TRACKS: TrackInfo[] = [
  { id: 'beethoven_symphony_5', composer: 'L. v. Beethoven', title: 'Symphony No. 5 in C minor', filename: 'beethoven_symphony_5.ogg' },
  { id: 'beethoven_ode_to_joy', composer: 'L. v. Beethoven', title: 'Ode to Joy (9th Symphony)', filename: 'beethoven_ode_to_joy.ogg' },
  { id: 'mozart_eine_kleine', composer: 'W. A. Mozart', title: 'Eine kleine Nachtmusik', filename: 'mozart_eine_kleine.ogg' },
  { id: 'mozart_figaro_overture', composer: 'W. A. Mozart', title: 'The Marriage of Figaro Overture', filename: 'mozart_figaro_overture.ogg' },
  { id: 'mozart_turkish_march', composer: 'W. A. Mozart', title: 'Rondo alla Turca (Turkish March)', filename: 'mozart_turkish_march.ogg' },
  { id: 'handel_hallelujah', composer: 'G. F. Handel', title: 'Hallelujah Chorus (Messiah)', filename: 'handel_hallelujah.ogg' },
  { id: 'handel_fireworks', composer: 'G. F. Handel', title: 'Music for the Royal Fireworks', filename: 'handel_fireworks.ogg' },
  { id: 'rossini_william_tell', composer: 'G. Rossini', title: 'William Tell Overture (Finale)', filename: 'rossini_william_tell.ogg' },
  { id: 'vivaldi_summer_storm', composer: 'A. Vivaldi', title: 'Summer Storm (Four Seasons)', filename: 'vivaldi_summer_storm.ogg' },
  { id: 'ceremonial_march', composer: 'AFC Orchestra', title: 'Grand Ceremonial March', filename: 'ceremonial_march.ogg' },
  { id: 'victory_fanfare', composer: 'AFC Brass', title: 'Grand Victory Fanfare', filename: 'victory_fanfare.ogg' },
];

class SoundEngine {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private isEnabled = true;
  private masterGain: GainNode | null = null;
  private volume = 0.8;
  private isMuted = false;
  private currentTrackAudio: HTMLAudioElement | null = null;
  private activeTrackId: ClassicalTrack | null = null;
  private isTrackPlaying = false;
  private loopingCueAudio: HTMLAudioElement | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Lazy initialize on first user gesture
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public async init() {
    if (this.isInitialized && this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
        this.masterGain.connect(this.audioContext.destination);
      }
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio initialization warning:', e);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    const effective = this.isMuted ? 0 : this.volume;
    if (this.masterGain) {
      this.masterGain.gain.value = effective;
    }
    if (this.currentTrackAudio) {
      this.currentTrackAudio.volume = effective;
    }
    if (this.loopingCueAudio) {
      this.loopingCueAudio.volume = effective;
    }
    this.notify();
  }

  public getVolume() {
    return this.volume;
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    this.setVolume(this.volume);
    this.notify();
    return this.isMuted;
  }

  public getIsMuted() {
    return this.isMuted;
  }

  public getActiveTrack() {
    return {
      trackId: this.activeTrackId,
      isPlaying: this.isTrackPlaying,
    };
  }

  // --- Real Symphonic Track Controls ---
  public async playTrack(trackId: ClassicalTrack, loop = false) {
    await this.init();
    const track = CLASSICAL_TRACKS.find((t) => t.id === trackId);
    if (!track) return;

    if (this.currentTrackAudio) {
      try {
        this.currentTrackAudio.pause();
        this.currentTrackAudio.currentTime = 0;
      } catch {}
    }

    try {
      const audio = new Audio(`/audio/${track.filename}`);
      audio.volume = this.isMuted ? 0 : this.volume;
      audio.loop = loop;
      audio.onended = () => {
        this.isTrackPlaying = false;
        this.notify();
      };
      await audio.play();
      this.currentTrackAudio = audio;
      this.activeTrackId = trackId;
      this.isTrackPlaying = true;
      this.notify();
    } catch (e) {
      console.warn('Failed to play track:', e);
      this.isTrackPlaying = false;
      this.notify();
    }
  }

  public pauseTrack() {
    if (this.currentTrackAudio) {
      this.currentTrackAudio.pause();
      this.isTrackPlaying = false;
      this.notify();
    }
  }

  public resumeTrack() {
    if (this.currentTrackAudio && !this.isTrackPlaying) {
      this.currentTrackAudio.play().catch(() => {});
      this.isTrackPlaying = true;
      this.notify();
    }
  }

  public stopTrack() {
    if (this.currentTrackAudio) {
      try {
        this.currentTrackAudio.pause();
        this.currentTrackAudio.currentTime = 0;
      } catch {}
      this.currentTrackAudio = null;
      this.activeTrackId = null;
      this.isTrackPlaying = false;
      this.notify();
    }
  }

  // --- Sound Cues ---
  public playCue(cue: SoundCue) {
    this.init().catch(() => {});
    const effectiveVol = this.isMuted ? 0 : this.volume;

    const fileMap: Record<SoundCue, string> = {
      correct: 'correct_bell.ogg',
      incorrect: 'incorrect_buzz.ogg',
      tick: 'clock_tick.ogg',
      gong: 'times_up_gong.ogg',
      drumroll: 'drumroll.ogg',
      applause: 'applause.ogg',
      cheer: 'stadium_cheer.ogg',
      fanfare: 'victory_fanfare.ogg',
      suspense: 'mozart_eine_kleine.ogg',
    };

    const filename = fileMap[cue];
    if (cue === 'drumroll') {
      // Loopable drumroll
      if (this.loopingCueAudio) {
        try {
          this.loopingCueAudio.pause();
        } catch {}
        this.loopingCueAudio = null;
        return;
      }
      try {
        const audio = new Audio(`/audio/${filename}`);
        audio.volume = effectiveVol;
        audio.loop = true;
        audio.play().catch(() => this.synthesizeCue(cue));
        this.loopingCueAudio = audio;
        return;
      } catch {
        this.synthesizeCue(cue);
        return;
      }
    }

    try {
      const audio = new Audio(`/audio/${filename}`);
      audio.volume = effectiveVol;
      audio.play().catch(() => this.synthesizeCue(cue));
    } catch {
      this.synthesizeCue(cue);
    }
  }

  public stopAll() {
    this.stopTrack();
    if (this.loopingCueAudio) {
      try {
        this.loopingCueAudio.pause();
        this.loopingCueAudio.currentTime = 0;
      } catch {}
      this.loopingCueAudio = null;
    }
    this.notify();
  }

  // Synthesized Web Audio API fallback (100% offline & reliable)
  private synthesizeCue(cue: SoundCue) {
    if (!this.audioContext || !this.masterGain || this.isMuted) return;
    const now = this.audioContext.currentTime;

    if (cue === 'correct') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.3, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.4);
      });
    } else if (cue === 'incorrect') {
      [220, 207.65, 185].forEach((freq, i) => {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.25, now + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.35);
      });
    } else if (cue === 'tick') {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (cue === 'gong') {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.value = 80;
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.2);
    }
  }
}

export const soundEngine = typeof window !== 'undefined' ? new SoundEngine() : (null as unknown as SoundEngine);

