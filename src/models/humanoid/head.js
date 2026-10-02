// The head: a 16 x 13 x 13 block (BODY.head) with its edges stepped, the face
// drawn on a 12 x 10 grid (spec section 5), the race's features (ears,
// muzzle, snout, tusks, frog eyes, crest), skin overlays and facial hair.
// Hair and headgear are added on top by hair.js and headgear.js.
//
// Everything is drawn into one grid (data/characterSpec.js HEAD_GRID), so the
// ambient occlusion shades the creases between face, features and hair.

import { VoxelGrid } from '../VoxelGrid.js';
import { BODY, HEAD_GRID, FACE_GRID } from '../../data/characterSpec.js';
import { lighter, darker } from './colors.js';

export const [HW, HH, HD] = BODY.head.size; // head width, height, depth (MV)
export const X0 = HEAD_GRID.x0;          // head: x X0..X1
export const X1 = X0 + HW - 1;
export const Y0 = HEAD_GRID.y0;          // head: y Y0..Y1
export const Y1 = Y0 + HH - 1;
export const Z0 = HEAD_GRID.z0;          // head: z Z0..ZF (ZF = the face)
export const ZF = Z0 + HD - 1;

const DARK = 0x16121c;
const WHITE = 0xffffff; // frog eyes
const PINK = 0xff8f9a;
const PAINT = [0x2f6cf0, 0xffc83a]; // TESSERA blue and yellow face paint

// Face-grid cell -> head grid position (fx grows towards +X, fy upwards).
const fgx = (fx) => X0 + FACE_GRID.marginX + fx;
const fgy = (fy) => Y0 + FACE_GRID.marginY + fy;

export function headGrid(r) {
  const g = new VoxelGrid(HEAD_GRID.w, HEAD_GRID.h, HEAD_GRID.d);
  const skin = r.skin;
  g.box(X0, Y0, Z0, HW, HH, HD, skin.base);
  g.box(X0, Y0, Z0, HW, 1, HD, skin.shadow); // shade under the jaw
  // Silhouette: one cube off every edge of the block (except the chin's front
  // edge), so the head reads as a rounded, stepped mass instead of a crate.
  // (A TESSERA change from the spec, which only cut the corners; see docs.)
  for (let y = Y0; y <= Y1; y++) for (let z = Z0; z <= ZF; z++) for (let x = X0; x <= X1; x++) {
    const ex = x === X0 || x === X1;
    const ey = y === Y0 || y === Y1;
    const ez = z === Z0 || z === ZF;
    if (ex + ey + ez >= 2 && !(y === Y0 && z === ZF && !ex)) g.set(x, y, z, null);
  }

  const face = (fx, fy, color, out = 0) => g.set(fgx(fx), fgy(fy), ZF + out, color);
  const f = r.face;
  const feat = r.features;

  // ---- Eyes ----
  if (!feat.frogEyes) {
    const gap = { close: 2, standard: 4, wide: 6 }[f.eyeSpacing] ?? 4;
    const leftInner = 5 - gap / 2; // left eye's inner column
    for (const side of [-1, 1]) {
      const inner = side < 0 ? leftInner : 11 - leftInner;
      const outer = inner + side; // the outer column is further from the middle
      drawEye(face, f, inner, outer, r, side);
    }
    // Undead: dark hollows under the eyes.
    if (feat.sunken) for (let k = 0; k < 3; k++) face(leftInner - k, 2, skin.deepShadow).set(fgx(11 - leftInner + k), fgy(2), ZF, skin.deepShadow);
  }

  // ---- Brows (hair colour, or their own colour) ----
  const brow = r.browColor;
  if (feat.heavyBrow) for (let x = 1; x <= 10; x++) face(x, 8, skin.shadow, 1);
  else if (f.brow !== 'none' && !feat.frogEyes) {
    const gap = { close: 2, standard: 4, wide: 6 }[f.eyeSpacing] ?? 4;
    const li = 5 - gap / 2;
    const cols = (inner, step) => (f.brow === 'flat' ? [inner, inner - step, inner - 2 * step] : [inner, inner - step]);
    for (const [inner, step] of [[li, 1], [11 - li, -1]]) {
      cols(inner, step).forEach((x, i) => face(x, f.brow === 'angled' ? 8 + (i > 0 ? 1 : 0) : 8, brow));
    }
  }

  // ---- Nose ----
  if (feat.nose === 'big') {
    for (const fx of [5, 6]) face(fx, 3, skin.base, 1).set(fgx(fx), fgy(4), ZF + 1, skin.highlight);
  } else if (f.nose === 'dot') {
    face(5, 3, skin.shadow);
    face(6, 3, skin.shadow);
  } else if (f.nose === 'short') {
    for (const fx of [5, 6]) face(fx, 4, skin.base, 1).set(fgx(fx), fgy(3), ZF, skin.shadow);
  }

  // ---- Muzzle / snout (they carry the mouth) ----
  if (feat.muzzle) drawMuzzle(g, r);
  else if (feat.snout) drawSnout(g, r);
  else if (feat.wideMouth) drawFrogMouth(g, r);
  else {
    const m = skin.deepShadow;
    const mouths = {
      none: [],
      neutral: [[5, 1], [6, 1]],
      smile: [[5, 1], [6, 1], [4, 2], [7, 2]],
      frown: [[5, 2], [6, 2], [4, 1], [7, 1]],
      open: [[5, 1], [6, 1], [5, 2], [6, 2]],
    };
    for (const [x, y] of mouths[f.mouth] ?? mouths.smile) face(x, y, m);
    if (f.mouth === 'open') face(5, 1, darker(PINK, 0.3));
  }
  if (feat.tusks) for (const x of [4, 7]) face(x, 2, 0xf4ecd6, 1).set(fgx(x), fgy(3), ZF + 1, 0xf4ecd6);

  // ---- Overlays (stackable marks on the skin) ----
  for (const o of r.overlays) drawOverlay(face, o, skin);

  // ---- Ears and race features ----
  drawEars(g, feat.ears ?? f.earSize, skin, r);
  if (feat.frogEyes) drawFrogEyes(g, r, r.raceVariant);
  if (feat.crest) {
    for (let z = Z0 + 1; z <= ZF - 1; z++) {
      const h = 1 + ((z - Z0) % 3 === 0 ? 2 : 1);
      const xm = X0 + HW / 2;
      for (let y = Y1 + 1; y <= Y1 + h; y++) g.set(xm - 1, y, z, skin.shadow).set(xm, y, z, y === Y1 + h ? skin.highlight : skin.shadow);
    }
  }

  // ---- A cloth mask over the lower face (rogue hoods), else facial hair ----
  if (r.mask) {
    for (let x = X0; x <= X1; x++) for (let y = Y0; y <= fgy(3); y++) g.set(x, y, ZF + 1, (x + y) % 5 === 0 ? darker(r.mask, 0.2) : r.mask);
  } else {
    drawFacialHair(g, r);
  }
  return g;
}

// The classic voxel-hero eye: three cubes wide and four tall, its bottom a
// third of the way up the head - a dark lash row on top, a bright iris with a
// darker pupil on the inner side, and a lighter bottom row. "sleepy" eyes have
// a half-closed lid instead of the top iris row.
function drawEye(face, f, inner, outer, r, side) {
  const iris = r.eyeColor;
  const pupil = r.features.glowEyes ? lighter(iris, 0.6) : darker(iris, 0.7);
  const sleepy = f.eyeShape === 'sleepy';
  for (const x of [inner, outer, outer + side]) {
    face(x, 6, DARK);
    face(x, 5, sleepy ? r.skin.shadow : iris);
    face(x, 4, iris);
    face(x, 3, lighter(iris, 0.35));
  }
  if (!sleepy) face(inner, 5, pupil);
  face(inner, 4, pupil);
  if (r.gender === 'female') face(outer + side * 2, 7, DARK).set(fgx(outer + side), fgy(7), ZF, DARK); // longer lashes, flicked out
  if (r.features.glowEyes) face(outer, 4, lighter(iris, 0.8));
}

function drawOverlay(face, o, skin) {
  const freckle = darker(skin.base, 0.28);
  switch (o) {
    case 'freckles_light': for (const [x, y] of [[2, 4], [3, 3], [8, 3], [9, 4]]) face(x, y, freckle); break;
    case 'freckles_heavy': for (const [x, y] of [[1, 4], [2, 3], [3, 4], [2, 5], [8, 4], [9, 3], [10, 4], [9, 5], [5, 4], [6, 4]]) face(x, y, freckle); break;
    case 'rosy_cheeks': for (const x of [1, 2, 9, 10]) face(x, 3, mix(skin.base, PINK, 0.45)); break;
    case 'mole': face(9, 2, darker(skin.base, 0.5)); break;
    case 'scar_left': for (let y = 3; y <= 8; y++) face(1 + (y % 2), y, lighter(skin.shadow, 0.35)); break;
    case 'scar_right': for (let y = 3; y <= 8; y++) face(10 - (y % 2), y, lighter(skin.shadow, 0.35)); break;
    case 'scar_nose': for (let x = 3; x <= 8; x++) face(x, 4, lighter(skin.shadow, 0.35)); break;
    case 'paint_stripes': for (const y of [3, 4]) for (const x of [0, 1, 10, 11]) face(x, y, PAINT[y - 3]); break;
    case 'paint_dots': for (const [x, y] of [[1, 3], [10, 3], [0, 5], [11, 5]]) face(x, y, PAINT[0]); break;
    case 'paint_band': for (let x = 0; x <= 11; x++) face(x, 8, PAINT[0]); break;
    case 'stitches': for (let y = 1; y <= 7; y++) face(10, y, skin.deepShadow); for (const y of [2, 4, 6]) { face(9, y, skin.deepShadow); face(11, y, skin.deepShadow); } break;
    case 'tear_marks': for (const x of [3, 8]) { face(x, 4, 0x3a5ad0); face(x, 3, 0x3a5ad0); } break;
    default: break;
  }
}

function drawEars(g, kind, skin, r) {
  const zc = Z0 + Math.floor(HD / 2) - 1; // ears halfway back, at eye level
  const inner = mix(skin.base, PINK, 0.35);
  for (const [x, out] of [[X0 - 1, -1], [X1 + 1, 1]]) {
    switch (kind) {
      case 'small': g.box(x, Y0 + 6, zc, 1, 2, 2, skin.base); break;
      case 'standard':
      case 'round': g.box(x, Y0 + 6, zc, 1, 3, 2, skin.base).set(x, Y0 + 7, zc + 1, inner); break;
      case 'pointed': // orc: short and pointed backwards
        g.box(x, Y0 + 6, zc, 1, 3, 2, skin.base).set(x, Y0 + 9, zc - 1, skin.base).set(x, Y0 + 7, zc + 1, inner);
        break;
      case 'elf': // long and pointed, sweeping up and back
        g.box(x, Y0 + 6, zc, 1, 3, 2, skin.base).set(x, Y0 + 7, zc + 1, inner);
        for (let k = 1; k <= 4; k++) g.set(x + (k > 2 ? out : 0), Y0 + 8 + k, zc - Math.floor(k / 2), skin.base);
        break;
      case 'goblin': // big droopy ears sticking out sideways
        g.box(Math.min(x, x + out * 3), Y0 + 6, zc - 1, 3, 3, 3, skin.base).box(Math.min(x, x + out * 3), Y0 + 7, zc, 3, 1, 1, inner);
        g.box(x + out * 3, Y0 + 5, zc - 1, 1, 2, 2, skin.base);
        break;
      default: break; // none, or ears on top of the head (fox)
    }
  }
  if (kind === 'fox') {
    // Tall pointed ears on top, standing clear of any hair.
    const tip = r.features.earTip ?? skin.deepShadow;
    const widths = [4, 4, 3, 3, 2, 1];
    for (const ex of [X0 + 1, X1 - 4]) {
      widths.forEach((w, k) => {
        const x = ex + Math.floor((4 - w) / 2);
        g.box(x, Y1 + 1 + k, Z0 + 4, w, 1, 3, k >= 4 ? tip : skin.base);
        if (k >= 1 && k <= 3 && w > 2) g.box(x + 1, Y1 + 1 + k, Z0 + 6, w - 2, 1, 1, mix(skin.base, 0xffffff, 0.55));
      });
    }
  }
}

// Fox muzzle: a pale snout two cubes long with a dark nose and a little mouth.
function drawMuzzle(g, r) {
  const cream = mix(r.skin.base, 0xfff6e8, 0.7);
  for (let x = fgx(3); x <= fgx(8); x++) {
    for (let y = fgy(0); y <= fgy(3); y++) {
      g.set(x, y, ZF + 1, cream);
      if (x >= fgx(4) && x <= fgx(7) && y <= fgy(2)) g.set(x, y, ZF + 2, cream);
    }
  }
  g.box(fgx(5), fgy(2), ZF + 3, 2, 1, 1, DARK); // nose
  g.box(fgx(5), fgy(0), ZF + 3, 2, 1, 1, r.skin.deepShadow); // mouth
}

// Lizard snout: a long tapering snout with nostrils and a mouth line.
function drawSnout(g, r) {
  const s = r.skin;
  for (let d = 1; d <= 4; d++) {
    const inset = d > 2 ? 1 : 0;
    for (let x = fgx(3 + inset); x <= fgx(8 - inset); x++) {
      for (let y = fgy(0); y <= fgy(4 - (d > 3 ? 1 : 0)); y++) g.set(x, y, ZF + d, y === fgy(0) ? s.shadow : s.base);
    }
  }
  for (let d = 1; d <= 4; d++) g.set(fgx(3 + (d > 2 ? 1 : 0)), fgy(1), ZF + d, s.deepShadow).set(fgx(8 - (d > 2 ? 1 : 0)), fgy(1), ZF + d, s.deepShadow);
  g.set(fgx(5), fgy(3), ZF + 5, s.deepShadow).set(fgx(6), fgy(3), ZF + 5, s.deepShadow); // nostrils
  for (let x = fgx(5); x <= fgx(6); x++) for (let y = fgy(0); y <= fgy(2); y++) g.set(x, y, ZF + 5, s.base);
}

// Frogfolk mouth: a wide groove right across the face with an upper lip that
// sticks out over it, corners curling up, puffy cheek pouches at the sides
// and a pale throat under the chin (it carries on into the chest).
function drawFrogMouth(g, r) {
  const s = r.skin;
  const throat = mix(s.base, 0xfff2cc, 0.6);
  for (let fx = 0; fx <= 11; fx++) {
    g.set(fgx(fx), fgy(2), ZF, s.deepShadow);                // the mouth line
    if (fx >= 1 && fx <= 10) g.set(fgx(fx), fgy(3), ZF + 1, s.base); // upper lip ledge
  }
  g.set(fgx(0), fgy(3), ZF, s.deepShadow).set(fgx(11), fgy(3), ZF, s.deepShadow); // corners curl up
  g.set(fgx(4), fgy(5), ZF, s.deepShadow).set(fgx(7), fgy(5), ZF, s.deepShadow);   // nostrils
  for (let x = X0 + 1; x <= X1 - 1; x++) {
    for (let y = Y0; y <= fgy(1); y++) g.set(x, y, ZF, throat);  // pale chin and throat
    for (let z = Z0 + 2; z <= ZF; z++) g.set(x, Y0, z, throat);  // the underside too
  }
  for (const x of [X0 - 1, X1 + 1]) g.box(x, fgy(1), ZF - 4, 1, 3, 3, s.highlight); // cheek pouches
}

// Frogfolk eyes, three designs (appearance.raceVariant), compared side by side
// in ?lineup&focus=frogfolk:dome,frogfolk:side,frogfolk:ridge:
//   dome  - two big domes on top of the head with large eyes (chosen default:
//           the most frog-like silhouette, eyes still readable from the front)
//   side  - bulging out at the upper sides, looking a little outwards
//   ridge - set into a raised ridge across the top front
function drawFrogEyes(g, r, variant = 'dome') {
  const s = r.skin;
  const pupil = darker(r.eyeColor, 0.75);
  const eye = (x0, y0, z, w = 3, h = 3) => {
    g.box(x0, y0, z, w, h, 1, WHITE);                                   // white of the eye
    g.box(x0 + Math.floor((w - 2) / 2), y0, z, 2, h - 1, 1, r.eyeColor); // iris
    g.set(x0 + Math.floor((w - 2) / 2), y0, z, pupil).set(x0 + Math.floor((w - 2) / 2) + 1, y0 + 1, z, pupil);
    g.box(x0, y0 + h, z, w, 1, 1, s.shadow);                            // eyelid
  };
  if (variant === 'side') {
    for (const [x, out] of [[X0 - 3, -1], [X1 + 1, 1]]) {
      g.box(x, Y1 - 5, ZF - 5, 3, 5, 5, s.base).box(x, Y1 - 5, ZF - 5, 3, 1, 5, s.shadow);
      eye(x, Y1 - 4, ZF, 3, 3);
      g.box(out < 0 ? x : x + 2, Y1 - 4, ZF - 4, 1, 3, 3, WHITE).set(out < 0 ? x : x + 2, Y1 - 3, ZF - 2, pupil);
    }
  } else if (variant === 'ridge') {
    g.box(X0 + 1, Y1, ZF - 3, HW - 2, 2, 4, s.base).box(X0 + 1, Y1 + 1, ZF - 3, HW - 2, 1, 4, s.highlight);
    for (const x of [X0 + 2, X1 - 5]) eye(x, Y1 - 2, ZF + 1, 4, 3);
  } else {
    for (const x of [X0, X1 - 4]) {
      g.box(x, Y1 - 1, ZF - 5, 5, 5, 5, s.base);                        // the dome
      for (const [dx, dz] of [[0, 0], [4, 0], [0, 4], [4, 4]]) g.set(x + dx, Y1 + 3, ZF - 5 + dz, null);
      g.box(x + 1, Y1 + 3, ZF - 4, 3, 1, 3, s.highlight);
      eye(x === X0 ? x : x + 1, Y1 - 1, ZF + 1, 4, 3); // big, readable eyes on the dome fronts
    }
  }
}

function drawFacialHair(g, r) {
  const fh = r.facialHair;
  if (!fh || fh === 'none' || !r.hair) return;
  const c = r.hair.base;
  const sh = r.hair.shadow;
  const front = (x, y, color = c, out = 0) => g.set(x, y, ZF + out, color);
  const mouthLeft = fgx(4);
  const mouthRight = fgx(7);
  switch (fh) {
    case 'stubble':
      for (let x = X0 + 1; x <= X1 - 1; x++) for (let y = Y0; y <= fgy(2); y++) if ((x + y) % 2 === 0 && !(x >= mouthLeft && x <= mouthRight && y >= fgy(1))) front(x, y, mix(r.skin.base, sh, 0.5));
      break;
    case 'mustache':
    case 'curled_mustache':
      for (let x = fgx(3); x <= fgx(8); x++) front(x, fgy(3), c, 1);
      if (fh === 'curled_mustache') front(fgx(2), fgy(4), c, 1).set(fgx(9), fgy(4), ZF + 1, c);
      break;
    case 'goatee':
      g.box(fgx(5), Y0 - 2, ZF, 2, fgy(1) - Y0 + 2, 1, c);
      break;
    case 'chin_strap':
      for (let y = Y0; y <= fgy(3); y++) front(X0, y).set(X1, y, ZF, c);
      for (let x = X0; x <= X1; x++) front(x, Y0);
      break;
    case 'short_beard':
    case 'full_beard':
    case 'braided_beard': {
      const top = fgy(fh === 'short_beard' ? 2 : 3);
      for (let x = X0; x <= X1; x++) for (let y = Y0; y <= top; y++) {
        if (x >= mouthLeft && x <= mouthRight && y >= fgy(1) && y <= fgy(2)) continue; // keep the mouth free
        front(x, y, (x + y) % 3 === 0 ? sh : c, 1);
      }
      for (let x = fgx(3); x <= fgx(8); x++) front(x, fgy(3), c, 1); // mustache
      if (fh !== 'short_beard') {
        // Hangs below the chin onto the chest.
        for (let y = Y0 - 3; y < Y0; y++) for (let x = X0 + 2 + (Y0 - y); x <= X1 - 2 - (Y0 - y); x++) g.set(x, y, ZF + 1, (x + y) % 3 === 0 ? sh : c);
      }
      if (fh === 'braided_beard') for (const x of [fgx(3), fgx(8)]) for (let y = 0; y < Y0; y++) g.set(x, y, ZF + 1, y % 2 ? c : r.hair.highlight);
      break;
    }
    default: break;
  }
}

function mix(a, b, t) {
  const ch = (c, s) => (c >> s) & 255;
  const m = (s) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}
