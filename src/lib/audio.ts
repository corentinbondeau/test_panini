// Audio and haptic utilities for booster opening experience

// Pre-load sounds as base64 to avoid external files
// These are synthesized sounds generated at runtime

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

/** Paper tearing sound effect */
export function playRipSound() {
  try {
    const ctx = getAudioContext();
    // Create noise buffer for tearing effect
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.5);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(2000, ctx.currentTime);
    bandpass.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.3);
    bandpass.Q.setValueAtTime(2, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    source.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available
  }
}

/** Triumphant jingle for legendary cards */
export function playLegendaryJingle() {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.3, 'sine', 0.25), i * 150);
  });
}

/** Short celebration for rare cards */
export function playRareChime() {
  playTone(659.25, 0.2, 'sine', 0.2);
  setTimeout(() => playTone(783.99, 0.3, 'sine', 0.2), 100);
}

/** Vibration feedback */
export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
