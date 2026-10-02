// Seeded randomness. The same seed always gives the same numbers,
// which is why the same seed always gives the same world.

import { createNoise2D } from 'simplex-noise';

// Turns any text (like "tessera") into a 32-bit number.
export function hashString(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A small, fast random number generator ("mulberry32").
// Returns a function that gives a new number between 0 and 1 each call.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A random generator for one purpose ("salt"), e.g. createRng(seed, 'trees').
// Different salts give independent sequences from the same world seed.
export function createRng(seed, salt) {
  return mulberry32(hashString(`${seed}:${salt}`));
}

// A random number 0..1 for one exact voxel position. Always the same for the same input.
export function hash3(x, y, z, salt = 0) {
  let h = salt ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440670441);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// A smooth noise function (gentle random hills) for one purpose.
export function makeNoise2D(seed, salt) {
  return createNoise2D(createRng(seed, salt));
}

// "Fractal" noise: several layers of noise added together, big shapes plus
// small details. Returns roughly -1..1.
export function fbm2(noise, x, z, octaves, frequency) {
  let sum = 0;
  let amplitude = 1;
  let total = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * noise(x * frequency, z * frequency);
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / total;
}

// "Ridged" noise: sharp crests, good for mountain ranges. Returns 0..1.
export function ridged2(noise, x, z, frequency) {
  return 1 - Math.abs(noise(x * frequency, z * frequency));
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function smoothstep(edge0, edge1, v) {
  const t = clamp((v - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
