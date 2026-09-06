import { CelebrationType } from './cricketCelebrations';

const CELEBRATION_SOUND_KEY = 'cricketstats-celebration-sound';

export const isSoundEnabled = (): boolean => {
  try {
    const val = localStorage.getItem(CELEBRATION_SOUND_KEY);
    return val !== 'disabled';
  } catch {
    return true;
  }
};

export const setSoundEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(CELEBRATION_SOUND_KEY, enabled ? 'enabled' : 'disabled');
  } catch (e) {
    console.warn('Could not save sound setting:', e);
  }
};

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/**
 * Generates an organic crowd applause / roar using filtered noise.
 */
const playCrowdCheer = (ctx: AudioContext, duration: number, intensity: number = 0.5) => {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02; // pinkish noise
    lastOut = data[i];
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  filter.Q.setValueAtTime(0.7, ctx.currentTime);

  const gain = ctx.createGain();
  const startTime = ctx.currentTime;
  gain.gain.setValueAtTime(0.01, startTime);
  gain.gain.linearRampToValueAtTime(intensity * 0.4, startTime + 0.25);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(startTime);
  noise.stop(startTime + duration);
};

/**
 * Generates a sharp wooden cricket bat hitting leather ball crack sound.
 */
const playBatCrack = (ctx: AudioContext, power: number = 1) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  const start = ctx.currentTime;
  osc.frequency.setValueAtTime(600 * power, start);
  osc.frequency.exponentialRampToValueAtTime(120, start + 0.08);

  gain.gain.setValueAtTime(0.6 * power, start);
  gain.gain.exponentialRampToValueAtTime(0.01, start + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + 0.12);
};

/**
 * Generates wooden stumps rattling and toppling crash sound.
 */
const playStumpsCrash = (ctx: AudioContext) => {
  const start = ctx.currentTime;

  // 1. Initial sharp wooden impact
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(450, start);
  osc1.frequency.exponentialRampToValueAtTime(80, start + 0.18);
  gain1.gain.setValueAtTime(0.7, start);
  gain1.gain.exponentialRampToValueAtTime(0.01, start + 0.2);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(start);
  osc1.stop(start + 0.22);

  // 2. High clatter of bails flying
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1200, start + 0.05);
  osc2.frequency.exponentialRampToValueAtTime(300, start + 0.25);
  gain2.gain.setValueAtTime(0.4, start + 0.05);
  gain2.gain.exponentialRampToValueAtTime(0.005, start + 0.3);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(start + 0.05);
  osc2.stop(start + 0.32);
};

/**
 * Plays an uplifting fanfare chord arpeggio for 50 / 100 milestones.
 */
const playFanfare = (ctx: AudioContext, notes: number[], noteDuration: number = 0.16) => {
  const startTime = ctx.currentTime;
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime + idx * noteDuration);

    const noteStart = startTime + idx * noteDuration;
    gain.gain.setValueAtTime(0.01, noteStart);
    gain.gain.linearRampToValueAtTime(0.35, noteStart + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration * 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteStart);
    osc.stop(noteStart + noteDuration * 1.6);
  });
};

/**
 * Plays synthesized celebration sound effect safely based on event type.
 */
export const playCelebrationSound = (type: CelebrationType): void => {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    switch (type) {
      case 'SIX':
        playBatCrack(ctx, 1.3);
        setTimeout(() => playCrowdCheer(ctx, 2.2, 0.7), 40);
        break;

      case 'FOUR':
        playBatCrack(ctx, 1.0);
        setTimeout(() => playCrowdCheer(ctx, 1.8, 0.5), 50);
        break;

      case 'WICKET':
        playStumpsCrash(ctx);
        setTimeout(() => playCrowdCheer(ctx, 2.0, 0.65), 100);
        break;

      case 'FIFTY':
        // C4, E4, G4, C5 uplifting fanfare
        playFanfare(ctx, [261.63, 329.63, 392.0, 523.25], 0.16);
        setTimeout(() => playCrowdCheer(ctx, 2.5, 0.75), 250);
        break;

      case 'CENTURY':
      case 'MILESTONE':
        // Grand fanfare: C4, G4, C5, E5, G5 victory chord
        playFanfare(ctx, [261.63, 392.0, 523.25, 659.25, 783.99], 0.18);
        setTimeout(() => playCrowdCheer(ctx, 3.2, 0.9), 300);
        break;
    }
  } catch (err) {
    // Non-critical: Audio autoplay or synth failure should never block UI
    console.warn('Celebration sound effect skipped:', err);
  }
};
