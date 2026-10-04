// Music and nature sounds, composed while you play (Web Audio, no files).
//
// MUSIC: calm, sparse pieces in the spirit of classic exploration games -
// a soft pad of slow chords, a gentle bass note per bar, and a little melody
// that wanders over a pentatonic scale with rests between phrases. The mood
// follows where you are: each land has its own key, nights are slower and
// minor, crypts are a low hum with a few far-off notes. Moods change at the
// end of a bar, so nothing jumps.
//
// NATURE: birds now and then by day, crickets at night, wind up high.
//
// Volume: Settings > Music (music) and Settings > Volume (everything).

import { settings } from '../save/Settings.js';
import { sharedAudio } from './Sfx.js';

const LOOKAHEAD = 0.6;  // seconds of music planned ahead
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

const MAJOR_PENTA = [0, 2, 4, 7, 9];
const MINOR_PENTA = [0, 3, 5, 7, 10];
// Chord roots (scale steps) for each 2-bar block, and the land's key.
const PROGRESSIONS = { major: [0, 5, 3, 4], minor: [0, 3, 5, 4] };
const LAND_KEYS = { amberMeadows: 60, crystalfrostForest: 57, copperDunes: 62, lanternMarsh: 64, stormspirePeaks: 55 };

const MOODS = {
  day: { tempo: 84, scale: MAJOR_PENTA, prog: 'major', melody: 0.55, pad: 0.05, bass: 0.07, lead: 0.07 },
  night: { tempo: 64, scale: MINOR_PENTA, prog: 'minor', melody: 0.35, pad: 0.05, bass: 0.06, lead: 0.05 },
  crypt: { tempo: 52, scale: MINOR_PENTA, prog: 'minor', melody: 0.18, pad: 0.07, bass: 0.09, lead: 0.04, shift: -12 },
};

const musicVolume = () => ((settings.get('music') ?? 50) / 100) * ((settings.get('volume') ?? 70) / 100);
const natureVolume = () => (settings.get('volume') ?? 70) / 100;

export class Music {
  constructor() {
    this.started = false;
    this.context = { mood: 'day', land: 'amberMeadows' };
    this.nextBeat = 0;
    this.beat = 0;
    this.natureTimer = 2;
  }

  // Call once the player has clicked / pressed a key (browsers need that).
  start() {
    const shared = sharedAudio();
    if (!shared || this.started) return;
    this.started = true;
    this.ctx = shared.ctx;
    this.noise = shared.noise;
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.ctx.destination);
    this.natureBus = this.ctx.createGain();
    this.natureBus.connect(this.ctx.destination);
    this.nextBeat = this.ctx.currentTime + 0.5;
    this.wind = this.makeWind();
    this.rainSound = this.makeRain();
  }

  // Every frame: where you are, so the music and sounds can follow.
  // where: { isNight, land (biome id), underground, altitude, paused }
  update(dt, where) {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    const target = where.paused ? musicVolume() * 0.4 : musicVolume();
    this.musicBus.gain.setTargetAtTime(target, now, 0.8);
    this.natureBus.gain.setTargetAtTime(where.underground ? 0 : natureVolume(), now, 0.5);
    this.wanted = { mood: where.underground ? 'crypt' : where.isNight ? 'night' : 'day', land: where.land };

    // Plan the beats that fall within the next LOOKAHEAD seconds.
    while (this.nextBeat < now + LOOKAHEAD) {
      this.playBeat(this.nextBeat);
      this.nextBeat += 60 / MOODS[this.context.mood].tempo;
      this.beat++;
    }
    this.updateNature(dt, where);
  }

  playBeat(t) {
    const inBar = this.beat % 4;
    // Moods and keys only change at the start of a bar.
    if (inBar === 0 && this.wanted) this.context = { ...this.wanted };
    const mood = MOODS[this.context.mood];
    const key = (LAND_KEYS[this.context.land] ?? 60) + (mood.shift ?? 0);
    const bar = Math.floor(this.beat / 4);
    const prog = PROGRESSIONS[mood.prog];
    const chordStep = prog[Math.floor(bar / 2) % prog.length];
    const note = (step, octave = 0) => {
      const n = mood.scale.length;
      const s = ((step % n) + n) % n;
      return key + mood.scale[s] + 12 * (Math.floor(step / n) + octave);
    };
    const beatLength = 60 / mood.tempo;

    // Pad chord every 2 bars, bass on each bar.
    if (inBar === 0 && bar % 2 === 0) {
      for (const s of [0, 2, 4]) this.voice(t, beatLength * 8, midi(note(chordStep + s, -1)), 'triangle', mood.pad, 1.2);
    }
    if (inBar === 0) this.voice(t, beatLength * 3.5, midi(note(chordStep, -2)), 'sine', mood.bass, 0.05);

    // Melody: a gentle random walk on the scale, with rests; phrases end on chord notes.
    if (Math.random() < mood.melody) {
      this.melodyStep = (this.melodyStep ?? chordStep + 5) + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
      this.melodyStep = Math.max(chordStep + 2, Math.min(chordStep + 11, this.melodyStep));
      if (inBar === 3) this.melodyStep = chordStep + 5; // land on the chord
      const dur = beatLength * (Math.random() < 0.3 ? 2 : 1);
      this.voice(t, dur, midi(note(this.melodyStep)), 'sine', mood.lead, 0.01, true);
      if (Math.random() < 0.25) this.voice(t + beatLength / 2, beatLength / 2, midi(note(this.melodyStep + 1)), 'sine', mood.lead * 0.7, 0.01, true);
    }
  }

  // One note: wave, volume, attack time; `pluck` notes fade like a harp.
  voice(t, duration, freq, wave, gain, attack, pluck = false) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    if (pluck) g.gain.exponentialRampToValueAtTime(0.0001, t + duration * 1.6);
    else {
      g.gain.setValueAtTime(gain, t + Math.max(attack, duration - 0.6));
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.4);
    }
    osc.connect(g).connect(this.musicBus);
    osc.start(t);
    osc.stop(t + duration * 1.6 + 0.5);
  }

  // ---- Nature -------------------------------------------------------------

  makeWind() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(this.natureBus);
    src.start();
    return { filter, gain };
  }

  // Rain: soft hiss of filtered noise, as loud as the rain is heavy.
  makeRain() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2600;
    filter.Q.value = 0.4;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(this.natureBus);
    src.start();
    return gain;
  }

  setRain(amount) {
    if (!this.started) return;
    this.rainSound.gain.setTargetAtTime(amount * 0.07, this.ctx.currentTime, 0.6);
  }

  updateNature(dt, where) {
    const now = this.ctx.currentTime;
    // Wind rises with height (and is always a little there in the peaks).
    const high = Math.max(0, Math.min(1, (where.altitude - 45) / 30)) + (where.land === 'stormspirePeaks' ? 0.3 : 0);
    const gust = 0.6 + 0.4 * Math.sin(now * 0.4) * Math.sin(now * 0.13);
    this.wind.gain.gain.setTargetAtTime(where.underground ? 0 : Math.min(1, high) * 0.05 * gust, now, 0.5);
    this.wind.filter.frequency.setTargetAtTime(300 + 500 * gust, now, 0.5);

    this.natureTimer -= dt;
    if (this.natureTimer > 0 || where.underground) return;
    if (where.isNight) {
      this.crickets();
      this.natureTimer = 1.5 + Math.random() * 3;
    } else if (where.land !== 'copperDunes' && where.land !== 'stormspirePeaks') {
      this.bird();
      this.natureTimer = 3 + Math.random() * 6;
    } else this.natureTimer = 4;
  }

  // A little bird: two to four quick rising chirps.
  bird() {
    const ctx = this.ctx;
    const base = 2200 + Math.random() * 1600;
    const count = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < count; k++) {
      const t = ctx.currentTime + k * 0.12;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * 1.35, t + 0.07);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.025, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(g).connect(this.natureBus);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  // Crickets: a fast trill of tiny high pulses.
  crickets() {
    const ctx = this.ctx;
    const freq = 4200 + Math.random() * 600;
    for (let k = 0; k < 8; k++) {
      const t = ctx.currentTime + k * 0.045;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.012, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      osc.connect(g).connect(this.natureBus);
      osc.start(t);
      osc.stop(t + 0.04);
    }
  }
}
