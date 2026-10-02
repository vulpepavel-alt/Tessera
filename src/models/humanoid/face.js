// The face: eyes, eyebrows, mouth, nose, cheeks, freckles, facial hair and
// ears, drawn onto the front of the head grid. Every part has several styles
// to choose from on the New Game screen.
//
// `h` describes where the head sits in its grid: { x0, z0 } is the head's
// left-back corner (the head is 16 wide, 14 tall, 14 deep), front = z0 + 13.

import { darker, lighter } from './colors.js';

const LASH = 0x1a1622;
const WHITE = 0xffffff;
const MOUTH = 0x7a2a2a;
const TONGUE = 0xd8505a;
const BLUSH = 0xff9aa0;

// Eye patterns for the LEFT eye, top row first (the right eye is mirrored).
// Kept to a few cubes so faces read clearly from the gameplay camera.
//   L dark, I iris colour, P dark iris, H white glint, S eyelid (darker skin), . nothing
export const EYE_STYLES = {
  round: ['HI', 'II', 'PP'],
  big: ['HII', 'III', 'PPP'],
  narrow: ['HI', 'PP'],
  sleepy: ['SS', 'II', 'PP'],
  happy: ['.L.', 'L.L'],
  fierce: ['L.', 'HL', 'PP'],
};

// Mouth patterns (4 wide), top row first. M dark, T teeth, R tongue.
export const MOUTH_STYLES = {
  smile: ['.MM.'],
  grin: ['MMMM', 'MTTM', '.MM.'],
  neutral: ['.M..'],
  open: ['.MM.', 'MRRM', '.MM.'],
  smirk: ['...M', 'MMM.'],
  fangs: ['MMMM', 'T..T'],
};

export const BROW_STYLES = ['thin', 'thick', 'angry', 'none'];
export const FACIAL_HAIR = ['none', 'mustache', 'beard', 'goatee'];

export function drawFace(g, s, h) {
  const z = h.z0 + 13;
  const put = (fx, fy, color, dz = 0) => g.set(h.x0 + fx, fy, z + dz, color);
  const iris = s.eyes;
  const palette = { L: LASH, W: WHITE, I: iris, P: darker(iris, 0.55), H: WHITE, S: darker(s.skin, 0.12) };

  // Eyes: two small blocks, mirrored around the middle of the face, top row at y 8.
  const pattern = EYE_STYLES[s.eyeStyle] ?? EYE_STYLES.round;
  const start = 6 - pattern[0].length; // a 2-wide eye sits at x 4-5 (and 10-11)
  pattern.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === '.') return;
      put(start + c, 8 - r, palette[ch]);
      put(15 - start - c, 8 - r, palette[ch]);
    });
  });

  // Eyebrows (in the hair colour), just above the eyes.
  const brow = s.browColor ?? s.hair;
  if (s.brows === 'thin') for (const x of [3, 4, 5, 10, 11, 12]) put(x, 10, brow);
  if (s.brows === 'thick') for (const x of [3, 4, 5, 10, 11, 12]) put(x, 10, brow).set(h.x0 + x, 9, z, x === 5 || x === 10 ? s.skin : brow);
  if (s.brows === 'angry') {
    put(3, 11, brow).set(h.x0 + 4, 10, z, brow).set(h.x0 + 5, 10, z, brow);
    put(12, 11, brow).set(h.x0 + 11, 10, z, brow).set(h.x0 + 10, 10, z, brow);
  }

  // No nose (a flat, simple face), rosy cheeks and freckles.
  if (s.blush !== false) for (const x of [2, 3, 12, 13]) put(x, 4, mix(s.skin, BLUSH));
  if (s.freckles) for (const [x, y] of [[2, 5], [4, 4], [11, 4], [13, 5], [3, 3], [12, 3]]) put(x, y, darker(s.skin, 0.25));

  // Mouth (centred, 4 wide at x 6-9, top row at y 3).
  if (!s.muzzle) {
    const mouth = MOUTH_STYLES[s.mouth] ?? MOUTH_STYLES.smile;
    const mp = { M: MOUTH, T: WHITE, R: TONGUE };
    mouth.forEach((row, r) => [...row].forEach((ch, c) => ch !== '.' && put(6 + c, 3 - r, mp[ch])));
  } else {
    // Fox folk: a pale muzzle sticking out, with a dark nose.
    for (let x = 5; x <= 10; x++) for (let y = 1; y <= 4; y++) put(x, y, s.muzzle, 1);
    put(7, 4, LASH, 2);
    put(8, 4, LASH, 2);
    put(7, 2, MOUTH, 2);
    put(8, 2, MOUTH, 2);
  }

  // Facial hair.
  const fh = s.facialHair === true ? 'beard' : s.facialHair;
  if (fh === 'mustache' || fh === 'beard') for (let x = 5; x <= 10; x++) put(x, 3, s.hair, 1);
  if (fh === 'beard') {
    for (let x = 1; x <= 14; x++) for (let y = 0; y <= 2; y++) if (!(y >= 1 && x >= 6 && x <= 9)) put(x, y, s.hair, y === 0 ? 1 : 0);
    for (const x of [1, 14]) for (let y = 3; y <= 6; y++) put(x, y, s.hair);
  }
  if (fh === 'goatee') for (let x = 6; x <= 9; x++) for (let y = 0; y <= 1; y++) put(x, y, s.hair, 1);
}

export function drawEars(g, s, h) {
  const left = h.x0 - 1;
  const right = h.x0 + 16;
  const zc = h.z0 + 7;
  const skin = s.skin;
  const inner = mix(skin, BLUSH);
  for (const x of [left, right]) {
    const out = x === left ? -1 : 1;
    switch (s.ears) {
      case 'pointy': // elf ears sweeping up and back
        g.box(x, 5, zc, 1, 4, 2, skin).set(x, 9, zc - 1, skin).set(x, 10, zc - 2, skin).set(x, 6, zc + 1, inner);
        g.set(x + out, 8, zc - 1, skin).set(x + out, 9, zc - 2, skin);
        break;
      case 'long': // big droopy ears (Mossfolk)
        g.box(x, 4, zc - 2, 1, 5, 5, skin).box(x + out, 3, zc - 1, 1, 4, 4, skin).set(x, 6, zc, inner);
        break;
      case 'fox': // pointed ears on top of the head
        break;
      case 'none':
        break;
      default: // round ears
        g.box(x, 5, zc, 1, 3, 2, skin).set(x, 6, zc + 1, inner);
    }
  }
  if (s.ears === 'fox') {
    for (const ex of [h.x0 + 2, h.x0 + 11]) {
      g.box(ex, 14, h.z0 + 5, 3, 2, 3, skin).box(ex + 1, 16, h.z0 + 6, 1, 2, 1, skin).set(ex + 1, 14, h.z0 + 8, inner);
    }
  }
}

function mix(a, b) {
  const r = (((a >> 16) & 255) + ((b >> 16) & 255)) >> 1;
  const gg = (((a >> 8) & 255) + ((b >> 8) & 255)) >> 1;
  const bb = ((a & 255) + (b & 255)) >> 1;
  return (r << 16) | (gg << 8) | bb;
}
