// Small combat sounds, made on the fly with the browser's Web Audio API (no
// sound files, no libraries). They are placeholders with the right *timing*
// and character: a whoosh for a swing, a thud for a hit, a bright ping for a
// critical hit, a heavier crunch for a combo finisher, a soft whoosh for a
// dodge, a low blip when you get hurt, a twang for arrows, a shimmer for spells.
// Volume follows Settings > Volume.

import { settings } from '../save/Settings.js';

let ctx = null;
let noiseBuffer = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // One second of white noise, reused for whooshes and impacts.
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const volume = () => (settings.get('volume') ?? 70) / 100;

// A burst of filtered noise: type = filter type, from/to = filter frequency sweep.
function noise(duration, { type = 'bandpass', from = 800, to = 2000, gain = 0.3, q = 1 } = {}) {
  const a = audio();
  if (!a || volume() === 0) return;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = a.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, a.currentTime);
  filter.frequency.exponentialRampToValueAtTime(to, a.currentTime + duration);
  const g = a.createGain();
  g.gain.setValueAtTime(gain * volume(), a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + duration);
  src.connect(filter).connect(g).connect(a.destination);
  src.start();
  src.stop(a.currentTime + duration);
}

// A short tone: wave type, start/end pitch.
function tone(duration, { wave = 'sine', from = 440, to = 220, gain = 0.2, delay = 0 } = {}) {
  const a = audio();
  if (!a || volume() === 0) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  osc.type = wave;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + duration);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain * volume(), t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const Sfx = {
  swing(heavy = false) {
    noise(heavy ? 0.28 : 0.16, { from: heavy ? 500 : 900, to: heavy ? 1800 : 3200, gain: heavy ? 0.22 : 0.15, q: 0.8 });
  },
  hit(crit = false) {
    noise(0.09, { type: 'lowpass', from: 1400, to: 200, gain: 0.45 });
    tone(0.1, { wave: 'triangle', from: 180, to: 70, gain: 0.35 });
    if (crit) tone(0.18, { wave: 'square', from: 1300, to: 1900, gain: 0.08, delay: 0.02 });
  },
  finisher() {
    noise(0.22, { type: 'lowpass', from: 1800, to: 120, gain: 0.55 });
    tone(0.25, { wave: 'triangle', from: 140, to: 45, gain: 0.45 });
    tone(0.2, { wave: 'sine', from: 900, to: 1400, gain: 0.08, delay: 0.05 });
  },
  dodge() {
    noise(0.22, { from: 2400, to: 700, gain: 0.12, q: 0.6 });
  },
  hurt() {
    tone(0.16, { wave: 'square', from: 260, to: 120, gain: 0.12 });
    noise(0.08, { type: 'lowpass', from: 900, to: 200, gain: 0.25 });
  },
  shoot() {
    tone(0.12, { wave: 'triangle', from: 520, to: 160, gain: 0.18 });
    noise(0.12, { from: 3000, to: 1200, gain: 0.08 });
  },
  // Coins changing hands (buying, selling).
  coin() {
    tone(0.08, { wave: 'square', from: 1500, to: 1500, gain: 0.07 });
    tone(0.14, { wave: 'square', from: 2000, to: 2000, gain: 0.07, delay: 0.07 });
  },
  // Gulping a potion.
  drink() {
    for (let k = 0; k < 3; k++) tone(0.07, { wave: 'sine', from: 300, to: 520, gain: 0.14, delay: k * 0.09 });
  },
  cast() {
    tone(0.25, { wave: 'sine', from: 600, to: 1200, gain: 0.12 });
    tone(0.25, { wave: 'sine', from: 900, to: 1800, gain: 0.06, delay: 0.04 });
  },
};
