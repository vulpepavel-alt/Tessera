// Hair styles, built around the head in the head grid. Hair has two tones:
// the main colour and lighter highlight streaks; a fringe of uneven strands
// hangs over the forehead.
//
// The head is 16 wide, 14 tall, 14 deep with its corner at (x0, 0, z0);
// there are 3 free cubes around it for hair (and 5 above).

import { lighter, darker } from './colors.js';

export const HAIR_STYLES = ['short', 'spiky', 'long', 'ponytail', 'bob', 'bun', 'mohawk', 'curly',
  'swept', 'braids', 'afro', 'pigtails', 'fringe', 'bald'];

export function drawHair(g, s, h) {
  const style = s.hairStyle ?? 'short';
  if (style === 'bald') return;
  const c = s.hair;
  const hi = lighter(c, 0.32);
  const lo = darker(c, 0.18);
  const X0 = h.x0;
  const Z0 = h.z0;
  const X1 = X0 + 15;
  const Z1 = Z0 + 13;
  const set = (x, y, z, col = c) => g.set(x, y, z, col);
  const streak = (x, z) => ((x * 3 + z * 5) % 7 === 0 ? hi : c);

  if (style === 'mohawk') {
    for (let z = Z0 - 1; z <= Z1; z++) for (let y = 14; y <= 17; y++) for (let x = X0 + 6; x <= X0 + 9; x++) {
      if (y - 14 <= 3 - Math.abs(z - (Z0 + 6)) / 4) set(x, y, z, y === 17 ? hi : streak(x, z));
    }
    return;
  }

  if (style === 'afro') {
    const cx = X0 + 7.5;
    const cy = 11;
    const cz = Z0 + 6;
    for (let y = 4; y <= 18; y++) for (let z = Z0 - 3; z <= Z1 - 2; z++) for (let x = X0 - 3; x <= X1 + 3; x++) {
      const d = Math.hypot((x - cx) / 10.5, (y - cy) / 7.5, (z - cz) / 9.5);
      if (d <= 1 && (d > 0.75 || y > 13)) set(x, y, z, (x + y + z) % 4 === 0 ? hi : (x * y + z) % 5 === 0 ? lo : c);
    }
    fringe(g, s, h, [1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1], c, hi);
    return;
  }

  // The cap every style shares, built from layers so it has real depth from
  // every side: two layers over the back and the sides, three on top (the
  // highest one in lumps), with darker cubes underneath and light streaks.
  const backBottom = { long: 0, braids: 3, bob: 2, curly: 3 }[style] ?? 5;
  const sideBottom = { long: 0, bob: 2, braids: 4, curly: 4 }[style] ?? 7;
  for (let z = Z0 - 2; z <= Z1 + 1; z++) for (let x = X0 - 2; x <= X1 + 2; x++) {
    const outer = x < X0 - 1 || x > X1 + 1 || z < Z0 - 1;
    if (!outer) set(x, 14, z, streak(x, z));
    else if (z <= Z1 - 2) set(x, 13, z, lo); // the second layer flares out a little lower
    if (x >= X0 - 1 && x <= X1 + 1 && z >= Z0 - 1 && z <= Z1) set(x, 15, z, (x + z) % 4 === 0 ? hi : c);
    const lump = ((x * 7 + z * 13) % 5) < 2;
    if (lump && x >= X0 && x <= X1 && z >= Z0 && z <= Z1 - 2) set(x, 16, z, (x + z) % 3 === 0 ? hi : c);
  }
  for (let y = backBottom; y <= 14; y++) {
    for (let x = X0 - 1; x <= X1 + 1; x++) {
      set(x, y, Z0 - 1, (x + y) % 6 === 0 ? lo : c);
      if (y >= backBottom + 2 && x >= X0 && x <= X1) set(x, y, Z0 - 2, (x * 3 + y) % 5 === 0 ? hi : (x + y) % 4 === 0 ? lo : c);
    }
  }
  for (let y = sideBottom; y <= 14; y++) {
    for (let z = Z0 - 1; z <= Z1 - 3; z++) {
      set(X0 - 1, y, z, (y + z) % 5 === 0 ? lo : c);
      set(X1 + 1, y, z, (y + z) % 5 === 0 ? lo : c);
      if (y >= sideBottom + 3 && z <= Z1 - 5) {
        set(X0 - 2, y, z, (y + z) % 4 === 0 ? hi : c);
        set(X1 + 2, y, z, (y + z) % 4 === 0 ? hi : c);
      }
    }
  }

  // The fringe: how many cubes each column hangs down over the forehead.
  const fringes = {
    short: [2, 1, 2, 3, 2, 1, 2, 2, 1, 2, 3, 2, 1, 2, 1, 2],
    spiky: [3, 2, 1, 3, 2, 1, 3, 2, 2, 3, 1, 2, 3, 1, 2, 3],
    long: [2, 3, 2, 2, 3, 2, 1, 2, 2, 1, 2, 3, 2, 2, 3, 2],
    ponytail: [1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1],
    bob: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    bun: [1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1],
    curly: [2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3],
    swept: [6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1],
    braids: [2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2],
    pigtails: [2, 2, 1, 2, 2, 1, 2, 2, 2, 1, 2, 2, 1, 2, 2, 2],
    fringe: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  };
  fringe(g, s, h, fringes[style] ?? fringes.short, c, hi);

  if (style === 'spiky') {
    for (let x = X0; x <= X1; x += 3) for (let z = Z0; z <= Z1 - 2; z += 3) {
      const tall = 2 + ((x + z) % 3);
      for (let k = 0; k < tall; k++) set(x + (k > 1 ? 1 : 0), 16 + k, z - (k > 1 ? 1 : 0), k === tall - 1 ? hi : c);
    }
  }
  if (style === 'curly') {
    for (let z = Z0 - 2; z <= Z1; z++) for (let x = X0 - 2; x <= X1 + 2; x++) {
      if ((x * 7 + z * 11) % 3 === 0) set(x, 16, z, hi);
      if ((x * 5 + z * 3) % 4 === 0 && (x < X0 || x > X1 || z < Z0)) for (let y = 4; y <= 13; y += 2) set(x, y, z, lo);
    }
  }
  if (style === 'ponytail') {
    for (let y = 3; y <= 12; y++) for (let x = X0 + 6; x <= X0 + 9; x++) set(x, y, Z0 - 2, y % 3 === 0 ? hi : c);
    for (let x = X0 + 6; x <= X0 + 9; x++) set(x, 11, Z0 - 3, s.accent ?? 0xff5a6a);
  }
  if (style === 'bun') {
    for (let y = 15; y <= 18; y++) for (let z = Z0 + 1; z <= Z0 + 5; z++) for (let x = X0 + 5; x <= X0 + 10; x++) {
      if (Math.hypot(x - (X0 + 7.5), y - 16.5, z - (Z0 + 3)) < 2.8) set(x, y, z, (x + y) % 3 === 0 ? hi : c);
    }
  }
  if (style === 'braids') {
    for (const bx of [X0 - 2, X1 + 2]) for (let y = 0; y <= 9; y++) {
      set(bx, y, Z0 + 4, y % 2 ? c : hi);
      set(bx, y, Z0 + 5, y % 2 ? hi : c);
    }
  }
  if (style === 'pigtails') {
    for (const [px, dir] of [[X0 - 3, -1], [X1 + 3, 1]]) {
      for (let y = 7; y <= 12; y++) for (let z = Z0 + 3; z <= Z0 + 7; z++) {
        if (Math.hypot(y - 9.5, z - (Z0 + 5)) < 2.6) set(px, y, z, (y + z) % 3 === 0 ? hi : c);
      }
      set(px - dir, 11, Z0 + 5, s.accent ?? 0xff5a6a);
    }
  }
}

// Uneven strands hanging over the forehead (one number per column of the face).
function fringe(g, s, h, lengths, c, hi) {
  const z = h.z0 + 14;
  lengths.forEach((len, i) => {
    for (let k = 0; k < len; k++) g.set(h.x0 + i, 13 - k, z, k === 0 && i % 3 === 0 ? hi : c);
  });
}
