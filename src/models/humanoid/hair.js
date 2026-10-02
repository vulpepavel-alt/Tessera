// Hair, built from a few large connected masses in zones (spec section 6):
//   cap     over the top of the head (1-2 cubes thick)
//   fringe  over the forehead (hangs 1-5 cubes)
//   side_l / side_r   the sides (1-2 thick)
//   back    the back of the head (1-3 thick)
//   top     tufts, spikes, crests (up to 3 above the cap)
//   tail    ponytails and braids: separate pieces hanging behind the head
// Hats and helmets hide some zones (r.hiddenHairZones). With something on the
// back (cape, pack, quiver) long tails are shortened so they don't clip.
//
// Every style uses 3 shades from the hair palette: highlight, base, shadow.

import { VoxelGrid } from '../VoxelGrid.js';
import { X0, X1, Y0, Y1, Z0, ZF } from './head.js';

// Style definitions: cap thickness, fringe (cubes hanging per column, 14
// columns across the face), side/back bottom rows (0 = jaw, 13 = top of head)
// and thickness, plus extras.
const STYLES = {
  cropped_block: { cap: 1, fringe: even(1), side: [10, 1], back: [7, 1] },
  side_sweep: { cap: 2, fringe: [5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 1, 1, 1, 1], side: [9, 1], back: [6, 2] },
  center_fringe: { cap: 1, fringe: [1, 1, 2, 2, 3, 3, 4, 4, 3, 3, 2, 2, 1, 1], side: [9, 1], back: [6, 2] },
  blunt_bob: { cap: 2, fringe: even(3), side: [3, 2], back: [3, 2] },
  layered_bob: { cap: 2, fringe: [2, 3, 2, 3, 2, 3, 2, 2, 3, 2, 3, 2, 3, 2], side: [4, 2], back: [4, 2], layered: true },
  short_spikes: { cap: 1, fringe: [2, 1, 3, 1, 2, 3, 1, 2, 3, 1, 2, 1, 3, 2], side: [10, 1], back: [7, 1], top: 'spikes' },
  tall_crest: { cap: 0, fringe: null, side: null, back: null, top: 'crest' },
  low_ponytail: { cap: 1, fringe: [1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1], side: [9, 1], back: [5, 1], tail: { kind: 'pony', from: 6, length: 10 } },
  high_ponytail: { cap: 2, fringe: [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1, 1], side: [10, 1], back: [7, 1], tail: { kind: 'pony', from: 13, length: 10 } },
  twin_tails: { cap: 1, fringe: [2, 2, 2, 1, 1, 1, 0, 0, 1, 1, 1, 2, 2, 2], side: [10, 1], back: [7, 1], tail: { kind: 'twin', from: 11, length: 9 } },
  short_braid: { cap: 1, fringe: [1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 2, 1], side: [9, 1], back: [6, 1], tail: { kind: 'braid', from: 7, length: 6 } },
  long_braid: { cap: 1, fringe: [2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1], side: [8, 1], back: [5, 1], tail: { kind: 'braid', from: 7, length: 12 } },
  rounded_curls: { cap: 2, fringe: [2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3], side: [6, 2], back: [5, 3], top: 'curls' },
  side_shave: { cap: 1, fringe: [0, 0, 0, 0, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5], side: [6, 2], back: [7, 1], shave: true, top: 'sweep' },
  swept_back: { cap: 2, fringe: null, side: [9, 1], back: [4, 3], top: 'swept' },
  bald: null,
};

function even(n) {
  return new Array(14).fill(n);
}

// Draws the zones into the head grid; returns tail pieces to attach separately:
// [{ grid, pivot, at: [x, y, z] (MV from the head's joint) }]
export function drawHair(g, r) {
  const style = STYLES[r.hairStyle];
  if (!style || !r.hair) return [];
  const show = (zone) => !r.hiddenHairZones.has(zone);
  const { highlight: hi, base: c, shadow: lo } = r.hair;
  const shade = (x, y, z) => (hash(x, y, z) < 0.14 ? hi : hash(z, x, y) < 0.12 ? lo : c);
  // Hair only grows into empty space: it never covers ears, crests, masks or headgear.
  const set = (x, y, z, col) => { if (g.get(x, y, z) === null) g.set(x, y, z, col); };

  // cap
  if (show('cap') && style.cap) {
    const fromX = style.shave ? X0 + 4 : X0 - 1;
    for (let z = Z0 - 1; z <= ZF; z++) for (let x = fromX; x <= X1 + 1; x++) set(x, Y1 + 1, z, shade(x, Y1 + 1, z));
    if (style.cap > 1) for (let z = Z0; z <= ZF - 1; z++) for (let x = Math.max(fromX, X0); x <= X1; x++) set(x, Y1 + 2, z, shade(x, Y1 + 2, z));
  }
  // sides
  if (style.side) {
    const [bottom, thick] = style.side;
    for (const [zone, x, out] of [['side_l', X0 - 1, -1], ['side_r', X1 + 1, 1]]) {
      if (!show(zone) || (style.shave && zone === 'side_l')) continue;
      // Side hair grows around the ears instead of covering them.
      const free = (px, py, pz) => g.get(px, py, pz) === null;
      for (let y = Y0 + bottom; y <= Y1; y++) {
        for (let z = Z0; z <= ZF - 2; z++) {
          if (free(x, y, z)) set(x, y, z, y === Y0 + bottom ? lo : shade(x, y, z));
          const outer = style.layered ? y >= Y0 + bottom + 3 : true;
          if (thick > 1 && outer && z <= ZF - 4 && free(x + out, y, z)) set(x + out, y, z, shade(x + out, y, z));
        }
      }
    }
  }
  // back
  if (style.back && show('back')) {
    const [bottom, thick] = style.back;
    const layers = r.compressHair ? 1 : thick;
    for (let t = 1; t <= layers; t++) {
      const inset = t - 1;
      const from = Y0 + bottom + (style.layered ? inset * 2 : inset);
      for (let y = from; y <= Y1 + (t === 1 ? 1 : 0); y++) {
        for (let x = X0 - 1 + inset; x <= X1 + 1 - inset; x++) set(x, y, Z0 - t, y === from ? lo : shade(x, y, Z0 - t));
      }
    }
  }
  // fringe (over the forehead)
  if (style.fringe && show('fringe')) {
    style.fringe.forEach((len, i) => {
      const x = X0 + i;
      set(x, Y1 + 1, ZF + 1, c);
      for (let k = 0; k < len; k++) set(x, Y1 - k, ZF + 1, k === len - 1 ? lo : k === 0 && i % 3 === 0 ? hi : c);
    });
  }
  // top
  if (style.top && show('top')) drawTop(style.top, set, shade, hi, c, lo);

  // tails
  if (!style.tail || !show('tail')) return [];
  return tails(style.tail, r, hi, c, lo);
}

function drawTop(kind, set, shade, hi, c, lo) {
  const top = Y1 + 2;
  if (kind === 'spikes') {
    // Chunky 2 x 2 tufts that lean backwards, in a staggered pattern.
    for (let x = X0; x <= X1 - 1; x += 3) for (let z = Z0 + ((x / 3) % 2 ? 1 : 0); z <= ZF - 2; z += 3) {
      const tall = 2 + ((x + z) % 2);
      for (let k = 0; k < tall; k++) {
        const back = k > 0 ? 1 : 0;
        for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          if (k === tall - 1 && dx + dz === 2) continue; // pointed tip
          set(x + dx, top + k, z + dz - back, k === tall - 1 ? hi : c);
        }
      }
    }
  } else if (kind === 'crest') {
    for (let z = Z0 - 1; z <= ZF; z++) {
      const rise = z < Z0 + 2 || z > ZF - 2 ? 1 : 3;
      for (let x = X0 + 5; x <= X0 + 8; x++) for (let y = Y1 + 1; y <= Y1 + rise; y++) set(x, y, z, y === Y1 + rise ? hi : c);
    }
    for (let y = Y0 + 8; y <= Y1; y++) for (let x = X0 + 5; x <= X0 + 8; x++) set(x, y, Z0 - 1, shade(x, y, Z0 - 1));
  } else if (kind === 'curls') {
    for (let x = X0 - 1; x <= X1 + 1; x++) for (let z = Z0 - 1; z <= ZF - 1; z++) if ((x * 3 + z * 5) % 4 === 0) set(x, top, z, hi);
  } else if (kind === 'sweep') {
    for (let x = X0 + 4; x <= X1 + 1; x++) {
      const h = Math.max(1, 3 - Math.floor((x - X0 - 4) / 4));
      for (let z = Z0; z <= ZF; z++) for (let y = Y1 + 1; y < Y1 + 1 + h; y++) set(x, y, z, shade(x, y, z));
    }
  } else if (kind === 'swept') {
    for (let z = Z0 - 1; z <= Z0 + 6; z++) {
      const h = z < Z0 + 3 ? 2 : 1;
      for (let x = X0; x <= X1; x++) for (let y = top; y < top + h; y++) set(x, y, z, y === top + h - 1 ? hi : c);
    }
    for (let x = X0; x <= X1; x++) set(x, Y1 + 1, ZF + 1, lo); // the hairline, swept up
  }
}

// Ponytails, twin tails and braids: separate pieces hanging behind the head.
function tails(t, r, hi, c, lo) {
  const length = r.compressHair ? Math.ceil(t.length / 2) : t.length;
  const piece = (w) => {
    const g = new VoxelGrid(w, length + 1, w);
    g.box(0, length, 0, w, 1, w, 0xd8384a); // the hair tie
    for (let y = 0; y < length; y++) {
      const narrow = y < 2 && w > 2 ? 1 : 0; // tapers at the end
      for (let z = narrow; z < w - narrow; z++) for (let x = narrow; x < w - narrow; x++) {
        g.set(x, y, z, t.kind === 'braid' ? ((y + x) % 2 ? c : hi) : y === 0 ? lo : (x + y + z) % 5 === 0 ? hi : c);
      }
    }
    return g;
  };
  if (t.kind === 'twin') {
    return [-8, 8].map((x) => ({ grid: piece(2), pivot: [1, length + 1, 1], at: [x, t.from, -2] }));
  }
  const w = t.kind === 'braid' ? 2 : 3;
  return [{ grid: piece(w), pivot: [w / 2, length + 1, w / 2], at: [0, t.from, -8] }];
}

function hash(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
