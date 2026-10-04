// Dungeons: old crypts under the land. Where they are (DungeonLayout) and
// how they are built into the chunks (stampDungeon). Everything comes from
// the seed, so the chunk workers and the game agree on every dungeon.
//
// A dungeon, walking in from the surface:
//   a stone archway -> stairs down -> corridor -> ROOM 1 -> corridor ->
//   ROOM 2 -> corridor -> the HALL, where the mini-boss waits.
// All of it lies in a straight line (along x or z), walls of stone brick,
// cobble floors, lamps on the walls.

import { BLOCK } from '../data/blocks.js';
import { hash3, hashString } from './random.js';

export const DUNGEON = {
  cellSize: 240,   // the world is split into cells; each may hold one dungeon
  chance: 0.75,
  depth: 10,       // the floor lies this far under the lowest ground above it
  maxStairs: 16,   // no dungeon needs more steps than this
};

// The pieces along the way: [name, length, half width, height].
const PIECES = [
  ['corridor', 6, 1, 4],
  ['room1', 11, 5, 6],
  ['corridor', 5, 1, 4],
  ['room2', 11, 5, 6],
  ['corridor', 5, 1, 4],
  ['hall', 15, 7, 8],
];

export class DungeonLayout {
  constructor(seed, generator) {
    this.gen = generator;
    this.salt = hashString(`${seed}:dungeons`);
    this.cells = new Map();
  }

  static cellOf(v) {
    return Math.floor((v + DUNGEON.cellSize / 2) / DUNGEON.cellSize);
  }

  dungeonInCell(i, j) {
    const key = `${i},${j}`;
    if (!this.cells.has(key)) this.cells.set(key, this.plan(i, j));
    return this.cells.get(key);
  }

  // Dungeons in the cells around (x, z).
  dungeonsNear(x, z) {
    const ci = DungeonLayout.cellOf(x);
    const cj = DungeonLayout.cellOf(z);
    const out = [];
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const d = this.dungeonInCell(ci + di, cj + dj);
        if (d) out.push(d);
      }
    }
    return out;
  }

  plan(i, j) {
    const r = (n) => hash3(i, 700 + n, j, this.salt);
    const nearStart = Math.abs(i) <= 1 && Math.abs(j) <= 1; // always a few close to the start
    if (!nearStart && r(0) > DUNGEON.chance) return null;
    const size = DUNGEON.cellSize;
    for (let k = 0; k < (nearStart ? 30 : 10); k++) {
      const x = Math.round(i * size + (r(1 + k * 3) - 0.5) * size * 0.7);
      const z = Math.round(j * size + (r(2 + k * 3) - 0.5) * size * 0.7);
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const [dx, dz] = dirs[Math.floor(r(3 + k * 3) * 4)];
      const plan = this.tryPlan(`${i},${j}`, x, z, dx, dz);
      if (plan) return plan;
    }
    return null;
  }

  // A dungeon entered at (x, z), running in direction (dx, dz); null if the
  // ground there doesn't suit one (water, a village, steep hills).
  tryPlan(id, x, z, dx, dz) {
    const gen = this.gen;
    const entry = gen.column(x, z);
    if (entry.waterTop >= 0 || entry.village || entry.mountain > 4) return null;
    if (gen.villages.influence(x, z)) return null;
    const px = -dz;
    const pz = dx;
    const length = PIECES.reduce((sum, p) => sum + p[1], 0);
    // The floor goes under the lowest ground over the whole dungeon.
    let lowest = entry.top;
    for (let u = 0; u <= DUNGEON.maxStairs + length; u += 2) {
      for (const s of [-7, 0, 7]) {
        const c = gen.column(x + dx * u + px * s, z + dz * u + pz * s);
        if (c.village) return null;
        lowest = Math.min(lowest, c.top);
      }
    }
    const floor = lowest - DUNGEON.depth;
    const stairs = entry.top - floor;
    if (floor < 6 || stairs > DUNGEON.maxStairs) return null;

    const at = (u, s) => ({ x: x + dx * u + px * s, z: z + dz * u + pz * s });
    const pieces = [];
    let u = stairs + 1;
    for (const [name, len, half, height] of PIECES) {
      pieces.push({ name, u0: u, u1: u + len - 1, half, height });
      u += len;
    }
    const centre = (p) => at((p.u0 + p.u1) / 2, 0);
    const room1 = pieces.find((p) => p.name === 'room1');
    const room2 = pieces.find((p) => p.name === 'room2');
    const hall = pieces.find((p) => p.name === 'hall');
    const end = at(u, 0);
    return {
      id, x, z, dx, dz, px, pz, top: entry.top, floor, stairs, pieces,
      biomeId: gen.regions.sample(x, z).site.biomeId,
      rooms: [centre(room1), centre(room2)],
      hallCentre: centre(hall),
      // For quick "is this chunk / player near it" checks.
      box: { x0: Math.min(x, end.x) - 9, x1: Math.max(x, end.x) + 9, z0: Math.min(z, end.z) - 9, z1: Math.max(z, end.z) + 9 },
    };
  }
}

// Each land builds its crypts from its own stone: wall, floor, lamp.
const CRYPT_STYLES = {
  amberMeadows: { wall: BLOCK.STONE_BRICK, floor: BLOCK.COBBLE, lamp: BLOCK.LAMP },
  crystalfrostForest: { wall: BLOCK.STONE_BRICK, floor: BLOCK.ICE, lamp: BLOCK.FROST_CRYSTAL },
  copperDunes: { wall: BLOCK.SANDSTONE, floor: BLOCK.ADOBE, lamp: BLOCK.LAMP },
  lanternMarsh: { wall: BLOCK.DARK_PLANKS, floor: BLOCK.MUD, lamp: BLOCK.LANTERN_CAP },
  stormspirePeaks: { wall: BLOCK.DARK_ROCK, floor: BLOCK.COBBLE, lamp: BLOCK.STORM_CRYSTAL },
};

// Build the parts of a dungeon that fall inside this chunk.
export function stampDungeon(volume, d) {
  const style = CRYPT_STYLES[d.biomeId] ?? CRYPT_STYLES.amberMeadows;
  const swap = { [BLOCK.STONE_BRICK]: style.wall, [BLOCK.COBBLE]: style.floor, [BLOCK.LAMP]: style.lamp };
  const set = (u, s, y, block) => volume.set(d.x + d.dx * u + d.px * s, y, d.z + d.dz * u + d.pz * s, swap[block] ?? block);

  // Pieces: a shell of stone brick, then hollowed out, then lamps.
  for (const p of d.pieces) {
    for (let u = p.u0 - 1; u <= p.u1 + 1; u++) {
      for (let s = -p.half - 1; s <= p.half + 1; s++) {
        for (let y = d.floor - 1; y <= d.floor + p.height; y++) {
          const edge = u < p.u0 || u > p.u1 || s < -p.half || s > p.half || y === d.floor - 1 || y === d.floor + p.height;
          if (edge) set(u, s, y, y === d.floor - 1 ? BLOCK.COBBLE : BLOCK.STONE_BRICK);
        }
      }
    }
  }
  // Hollow every piece (after all shells, so doorways between pieces open up).
  for (const p of d.pieces) {
    const u0 = p.u0 - (p.name === 'corridor' ? 1 : 0);
    const u1 = p.u1 + (p.name === 'corridor' ? 1 : 0);
    for (let u = u0; u <= u1; u++) {
      for (let s = -p.half; s <= p.half; s++) {
        for (let y = d.floor; y < d.floor + p.height; y++) set(u, s, y, BLOCK.AIR);
      }
    }
    // Lamps along both walls (rooms and the hall), one per corridor.
    if (p.name === 'corridor') set(Math.round((p.u0 + p.u1) / 2), p.half + 1, d.floor + 2, BLOCK.LAMP);
    else {
      for (let u = p.u0 + 1; u <= p.u1; u += 4) {
        set(u, -p.half - 1, d.floor + 3, BLOCK.LAMP);
        set(u, p.half + 1, d.floor + 3, BLOCK.LAMP);
      }
      // Pillars in the corners of rooms and the hall.
      for (const [cu, cs] of [[p.u0 + 1, -p.half + 1], [p.u0 + 1, p.half - 1], [p.u1 - 1, -p.half + 1], [p.u1 - 1, p.half - 1]]) {
        for (let y = d.floor; y < d.floor + p.height; y++) set(cu, cs, y, BLOCK.STONE_BRICK);
      }
    }
  }

  // The stairs: one step down per block, from the surface to the floor,
  // with walls on both sides and a lamp halfway.
  for (let k = 0; k <= d.stairs; k++) {
    const floorY = d.top - k;
    for (let s = -2; s <= 2; s++) {
      const wall = Math.abs(s) === 2;
      set(k, s, floorY - 1, BLOCK.COBBLE);
      for (let y = floorY; y <= floorY + 4; y++) {
        if (wall) set(k, s, y, y <= d.top + 1 ? BLOCK.STONE_BRICK : BLOCK.AIR);
        else set(k, s, y, BLOCK.AIR);
      }
      if (!wall && floorY + 5 <= d.top) set(k, s, floorY + 5, BLOCK.STONE_BRICK); // ceiling once underground
    }
    if (k === Math.floor(d.stairs / 2)) set(k, 2, floorY + 2, BLOCK.LAMP);
  }

  // The archway at the top: two pillars, a lintel and lamps.
  for (const s of [-2, 2]) {
    for (let y = d.top; y <= d.top + 5; y++) set(-1, s, y, BLOCK.STONE_BRICK);
    set(-1, s, d.top + 6, BLOCK.LAMP);
  }
  for (let s = -2; s <= 2; s++) set(-1, s, d.top + 5, BLOCK.STONE_BRICK);
  for (let s = -1; s <= 1; s++) {
    set(-1, s, d.top, BLOCK.COBBLE);
    for (let y = d.top + 1; y <= d.top + 4; y++) set(-1, s, y, BLOCK.AIR);
  }
}

// Is (x, z) in the dungeon's open entrance (no trees or plants there)?
export function inDungeonEntrance(d, x, z) {
  const rx = x - d.x;
  const rz = z - d.z;
  const u = rx * d.dx + rz * d.dz;
  const s = rx * d.px + rz * d.pz;
  return u >= -2 && u <= d.stairs + 1 && Math.abs(s) <= 3;
}

export function chunkTouches(d, x0, z0, size) {
  return d.box.x1 >= x0 - 1 && d.box.x0 <= x0 + size && d.box.z1 >= z0 - 1 && d.box.z0 <= z0 + size;
}

// Crypt walls have one doorway between pieces, always on the crypt's middle
// line. Monsters walk straight at you, so in a crypt they first step onto
// that line, follow it, and only head straight for you once you are in the
// same piece. Returns the point to walk toward (world x, z).
export function cryptWaypoint(d, from, to) {
  const local = (p) => {
    const rx = p.x - d.x;
    const rz = p.z - d.z;
    return { u: rx * d.dx + rz * d.dz, s: rx * d.px + rz * d.pz };
  };
  const pieceOf = (u) => d.pieces.findIndex((p) => u >= p.u0 - 0.5 && u <= p.u1 + 0.5);
  const a = local(from);
  const b = local(to);
  const pa = pieceOf(a.u);
  const pb = pieceOf(b.u);
  if (pa === pb || pa < 0) return to; // same room (or not inside): straight there
  const world = (u, s) => ({ x: d.x + d.dx * u + d.px * s, z: d.z + d.dz * u + d.pz * s });
  if (Math.abs(a.s) > 0.6) return world(a.u, 0);          // onto the middle line first
  return world(a.u + Math.sign(b.u - a.u) * 3, 0);         // then along it, toward you
}
