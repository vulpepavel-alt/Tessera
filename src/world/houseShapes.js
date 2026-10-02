// The whimsical parts of a house, used by VillageBuilder.js: steep roofs with
// big overhangs and a slightly uneven ridge, gable walls with a beam, wooden
// hoods over the windows (they give the windows depth), a chunky chimney with
// a cap, and a little lean-to extension at the back of some houses.
// Everything is still made of blocks; nothing is a perfect box.

import { BLOCK } from '../data/blocks.js';

const OVERHANG = 2; // how far the roof sticks out past the walls

// h: the house ({ x0, x1, z0, z1, door, roof }); top: height of the wall tops.
// Returns the roof's ridge height.
export function steepRoof(volume, h, top, trim, wall) {
  const alongX = h.x1 - h.x0 >= h.z1 - h.z0;
  const seed = h.x0 * 31 + h.z0 * 17;
  const shade = darkerRoof(h.roof);
  let ridge = top;
  for (let i = 0; ; i++) {
    // Two of every three layers step inward: a steep, exaggerated roof.
    const inset = i - Math.floor(i / 3);
    const ry = top + 1 + i;
    const a = (alongX ? h.z0 : h.x0) - OVERHANG + inset;
    const b = (alongX ? h.z1 : h.x1) + OVERHANG - inset;
    if (a > b) break;
    ridge = ry;
    const from = (alongX ? h.x0 : h.z0) - OVERHANG + (i % 2); // gable edges step in a little too
    const to = (alongX ? h.x1 : h.z1) + OVERHANG - (i % 2);
    for (let u = from; u <= to; u++) {
      for (const v of [a, b]) {
        const block = i === 0 ? trim : i % 2 ? shade : h.roof;
        put(volume, alongX, u, ry, v, block);
        // Slightly uneven: here and there a shingle sits one block lower.
        if (i === 0 && hash(u, seed) < 0.18) put(volume, alongX, u, ry - 1, v, h.roof);
      }
      for (let v = a + 1; v < b; v++) put(volume, alongX, u, ry, v, i % 2 ? shade : h.roof);
    }
    // Gable walls: fill the triangle under the roof at both ends, with a beam.
    const ends = alongX ? [h.x0, h.x1] : [h.z0, h.z1];
    for (const e of ends) {
      for (let v = a + OVERHANG; v <= b - OVERHANG; v++) {
        const mid = Math.abs(v - ((alongX ? h.z0 + h.z1 : h.x0 + h.x1) / 2)) < 0.6;
        put(volume, alongX, e, ry, v, mid ? trim : wall);
      }
    }
  }
  return ridge;
}

// A wooden hood over every window, sticking out one block.
export function windowHoods(volume, windows, y, trim) {
  for (const { x, z, dx, dz } of windows) volume.setIfAir(x + dx, y + 4, z + dz, trim);
}

// A 2 x 2 stone chimney rising above the ridge, with a wider dark cap.
export function chimney(volume, h, top, ridge) {
  const x = h.x1 - 2;
  const z = h.z0 + 1;
  for (let y = top + 1; y <= ridge + 2; y++) {
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) volume.set(x + dx, y, z + dz, BLOCK.COBBLE);
  }
  for (const [dx, dz] of [[-1, 0], [2, 0], [0, -1], [0, 2], [1, -1], [1, 2], [-1, 1], [2, 1]]) {
    volume.set(x + dx, ridge + 2, z + dz, BLOCK.STONE_BRICK);
  }
}

// A small lean-to on the back wall (away from the door) of some houses.
export function backExtension(volume, h, y, s) {
  if (hash(h.x0 * 7, h.z1 * 13) > 0.6) return;
  const { door } = h;
  const back = { dx: -door.dx, dz: -door.dz };
  // The back wall line and the span along it.
  const wallX = back.dx !== 0;
  const edge = back.dx > 0 ? h.x1 : back.dx < 0 ? h.x0 : back.dz > 0 ? h.z1 : h.z0;
  const start = (wallX ? h.z0 : h.x0) + 1;
  const len = 4;
  for (let d = 1; d <= 3; d++) {
    for (let u = start; u < start + len; u++) {
      const outer = d === 3 || u === start || u === start + len - 1;
      for (let wy = y; wy <= y + 3; wy++) {
        const at = (wx, wz) => volume.set(wx, wy, wz, wy === y ? s.floor : wy === y + 3 ? h.roof : outer ? (u === start || u === start + len - 1 ? s.frame : s.wall) : BLOCK.AIR);
        if (wallX) at(edge + back.dx * d, u);
        else at(u, edge + back.dz * d);
      }
    }
  }
  // The lean-to roof slopes down away from the house.
  for (let u = start - 1; u <= start + len; u++) {
    for (let d = 1; d <= 4; d++) {
      const ry = y + 4 - (d > 2 ? 1 : 0);
      if (wallX) volume.setIfAir(edge + back.dx * d, ry, u, h.roof);
      else volume.setIfAir(u, ry, edge + back.dz * d, h.roof);
    }
  }
}

function put(volume, alongX, u, y, v, block) {
  if (alongX) volume.set(u, y, v, block);
  else volume.set(v, y, u, block);
}

// Alternating rows of a slightly darker roof block read as shingles.
function darkerRoof(roof) {
  const pairs = { [BLOCK.ROOF_RED]: BLOCK.ROOF_RED_DARK, [BLOCK.ROOF_BLUE]: BLOCK.ROOF_BLUE_DARK, [BLOCK.ROOF_GREEN]: BLOCK.ROOF_GREEN_DARK, [BLOCK.ROOF_BROWN]: BLOCK.DARK_PLANKS };
  return pairs[roof] ?? roof;
}

function hash(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
