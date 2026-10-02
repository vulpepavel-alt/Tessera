// The voxel shapes of weapons, shields and magic focuses. Chunky, like the
// classic voxel RPG look: thick blades with bright edges and a darker fuller,
// big guards and pommels, fat bow limbs, staffs taller than their owner.
// Same cube size as bodies (1 MV), sized next to the big 7 x 6 x 8 fists.
//
// Grid axes: Y = along the weapon (grip at the bottom), X = thickness,
// Z = width (a blade's edges are its Z sides). Every grid says where it is
// held: grid.grip (Y of the hand's centre) and grid.gripZ (Z, if not the
// middle). Handles are 2 x 2, so they disappear inside the fist.

import { VoxelGrid } from '../VoxelGrid.js';
import { lighter, darker } from '../humanoid/colors.js';

const WOOD = 0x9a5a2c;
const DARK_WOOD = 0x5a341c;
const GRIP = 0x3a2416;
const STRING = 0xf2eee2;
const BRASS = 0xc8963c;
const GOLD = 0xffc83a;

const trimOf = (item) => (item.tier >= 5 ? GOLD : BRASS);
const held = (g, grip, gripZ) => Object.assign(g, { grip, gripZ });

// A sword-like weapon: pommel, wrapped handle, guard, thick blade, pointed tip.
function blade(item, { width, length, guard, guardH = 3, handle }) {
  const m = item.metal ?? 0xc8ced8;
  const t = trimOf(item);
  const Z = guard;
  const c = Z / 2; // the middle, between z = c - 1 and z = c
  const g = new VoxelGrid(4, 2 + handle + guardH + length, Z);
  g.box(0, 0, c - 2, 4, 2, 4, t).box(1, 0, c - 1, 2, 1, 2, lighter(t, 0.2));                    // pommel
  for (let y = 2; y < 2 + handle; y++) g.box(1, y, c - 1, 2, 1, 2, y % 2 ? GRIP : DARK_WOOD);   // wrapped handle
  const gy = 2 + handle;
  g.box(0, gy, 0, 4, guardH, Z, t).box(0, gy, 0, 4, 1, Z, darker(t, 0.2));                       // guard
  g.box(0, gy + guardH - 1, 0, 4, 1, 1, null).box(0, gy + guardH - 1, Z - 1, 4, 1, 1, null);      // its tips curve down
  const by = gy + guardH;
  const z0 = c - width / 2;
  g.box(1, by, z0, 2, length, width, m);
  g.box(1, by, z0, 2, length, 1, lighter(m, 0.3)).box(1, by, z0 + width - 1, 2, length, 1, lighter(m, 0.3)); // bright edges
  if (width >= 4) g.box(1, by + 1, c - 1, 2, length - 5, 2, darker(m, 0.14));                    // fuller
  // Pointed tip: the last rows narrow towards the middle.
  [2, Math.max(2, width - 2)].forEach((w, k) => {
    const y = by + length - 1 - k;
    g.box(1, y, z0, 2, 1, width, null).box(1, y, c - w / 2, 2, 1, w, lighter(m, 0.3));
  });
  if (item.glow) g.box(0, gy + 1, c - 1, 4, 1, 2, item.glow).box(1, by + 2, c - 1, 2, Math.floor(length / 2), 2, item.glow);
  return held(g, 2 + handle / 2);
}

// A bow: thick limbs following `curve` (from the tip to the middle, how far
// forward each step is), a wrapped grip and a straight string behind.
function bow(item, length, curve) {
  const depth = Math.max(...curve) + 3;
  const g = new VoxelGrid(2, length, depth);
  const half = length / 2;
  for (let y = 0; y < length; y++) {
    const i = Math.min(y, length - 1 - y);
    const z = curve[Math.min(i, curve.length - 1)];
    g.box(0, y, z, 2, 1, 2, i % 4 === 0 ? darker(WOOD, 0.12) : WOOD);
  }
  for (let y = 1; y < length - 1; y++) g.set(0, y, depth - 1, STRING);
  g.box(0, 0, depth - 2, 2, 1, 2, DARK_WOOD).box(0, length - 1, depth - 2, 2, 1, 2, DARK_WOOD); // nocks
  g.box(0, half - 3, 0, 2, 6, 3, GRIP).box(0, half - 3, 0, 2, 1, 3, BRASS).box(0, half + 2, 0, 2, 1, 3, BRASS);
  if (item.metal) g.box(0, 2, curve[2], 2, 2, 2, item.metal).box(0, length - 4, curve[2], 2, 2, 2, item.metal);
  if (item.glow) g.box(0, half - 1, 0, 2, 2, 1, item.glow);
  return held(g, half, 1);
}

export const MODELS = {
  sword: (item) => blade(item, { width: 4, length: 22, guard: 12, handle: 6 }),
  shortsword: (item) => blade(item, { width: 4, length: 16, guard: 8, guardH: 2, handle: 5 }),
  dagger: (item) => blade(item, { width: 4, length: 10, guard: 8, guardH: 2, handle: 4 }),
  greatsword: (item) => blade(item, { width: 6, length: 32, guard: 16, handle: 10 }),

  // A knobbly wooden club, much thicker at the top.
  club() {
    const g = new VoxelGrid(6, 22, 6).box(2, 0, 2, 2, 10, 2, DARK_WOOD).box(1, 9, 1, 4, 3, 4, WOOD).box(0, 12, 0, 6, 10, 6, WOOD);
    for (const [x, z] of [[0, 0], [5, 0], [0, 5], [5, 5]]) g.box(x, 21, z, 1, 1, 1, null);
    for (const [x, y, z] of [[0, 14, 2], [5, 17, 3], [2, 19, 0], [3, 15, 5], [1, 20, 5]]) g.set(x, y, z, DARK_WOOD);
    g.box(1, 21, 1, 4, 1, 4, lighter(WOOD, 0.15));
    return held(g, 4);
  },

  axe(item) {
    const m = item.metal;
    const g = new VoxelGrid(4, 32, 14).box(1, 0, 2, 2, 31, 2, WOOD).box(1, 0, 2, 2, 8, 2, GRIP);
    g.box(0, 22, 1, 4, 6, 4, darker(m, 0.2));                                  // the head's socket
    [3, 5, 6, 7, 8, 8, 8, 8, 8, 7, 6, 5, 3].forEach((w, k) => {                // a crescent blade
      const y = 19 + k;
      g.box(1, y, 5, 2, 1, w, m).box(1, y, 5 + w - 1, 2, 1, 1, lighter(m, 0.35));
    });
    g.box(1, 23, 0, 2, 3, 1, darker(m, 0.15));                                 // back spike
    return held(g, 4);
  },

  hammer(item) {
    const m = item.metal;
    const t = trimOf(item);
    const g = new VoxelGrid(10, 34, 12).box(4, 0, 5, 2, 27, 2, WOOD).box(4, 0, 5, 2, 9, 2, GRIP);
    g.box(0, 26, 0, 10, 8, 12, m).box(0, 26, 0, 10, 1, 12, t).box(0, 33, 0, 10, 1, 12, t);
    g.box(1, 27, 0, 8, 6, 1, lighter(m, 0.2)).box(1, 27, 11, 8, 6, 1, lighter(m, 0.2)); // striking faces
    return held(g, 5);
  },

  roundShield(item) {
    const m = item.metal;
    const t = trimOf(item);
    const g = new VoxelGrid(3, 18, 18);
    for (let y = 0; y < 18; y++) for (let z = 0; z < 18; z++) {
      const d = Math.hypot(y - 8.5, z - 8.5);
      if (d > 9) continue;
      const rim = d > 7.6;
      const plank = item.tier === 1 && z % 4 === 0;
      g.set(2, y, z, darker(m, 0.25)).set(1, y, z, rim ? t : plank ? darker(m, 0.15) : m);
      if (rim) g.set(0, y, z, t);
      if (d < 2.6) g.set(0, y, z, d < 1.4 ? lighter(t, 0.3) : t); // the boss in the middle
    }
    return held(g, 9);
  },

  kiteShield(item) {
    const m = item.metal;
    const t = trimOf(item);
    const g = new VoxelGrid(3, 24, 16);
    for (let y = 0; y < 24; y++) {
      const half = y > 8 ? 8 : Math.max(1, y); // pointed at the bottom
      for (let z = 8 - half; z < 8 + half; z++) {
        const edge = z === 8 - half || z === 7 + half || y === 23;
        g.set(2, y, z, darker(m, 0.25)).set(1, y, z, edge ? t : m);
        if (edge) g.set(0, y, z, t);
      }
    }
    g.box(0, 6, 7, 1, 15, 2, t).box(0, 15, 3, 1, 2, 10, t); // a cross on the front
    if (item.glow) g.box(0, 15, 7, 1, 2, 2, item.glow);
    return held(g, 12);
  },

  // Held in the middle at fist height, so they stay clear of the ground.
  shortbow: (item) => bow(item, 26, [6, 5, 4, 3, 3, 2, 2, 1, 1, 1, 0]),
  longbow: (item) => bow(item, 30, [7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1, 1, 0]),
  recurve: (item) => bow(item, 28, [3, 5, 6, 6, 5, 4, 3, 2, 2, 1, 1, 0]),

  // Lying flat, pointing forward (+Z), held by the stock near the back.
  crossbow(item) {
    const m = item.metal;
    const g = new VoxelGrid(26, 6, 26).box(11, 0, 0, 4, 4, 26, WOOD).box(11, 0, 0, 4, 2, 7, DARK_WOOD);
    g.box(0, 3, 20, 26, 2, 3, m).box(0, 3, 20, 2, 3, 3, darker(m, 0.2)).box(24, 3, 20, 2, 3, 3, darker(m, 0.2));
    g.box(2, 4, 17, 22, 1, 1, STRING).box(12, 4, 8, 2, 2, 12, lighter(WOOD, 0.2)).box(12, 5, 14, 2, 1, 4, 0xdc4b4b); // bolt
    g.box(12, 0, 5, 2, 1, 2, BRASS); // trigger
    return held(g, 2, 5);
  },

  wand(item) {
    const g = new VoxelGrid(5, 22, 5).box(1, 0, 1, 3, 16, 3, WOOD).box(1, 0, 1, 3, 5, 3, GRIP);
    g.box(0, 16, 0, 5, 1, 5, BRASS).box(1, 17, 1, 3, 4, 3, item.glow).box(2, 21, 2, 1, 1, 1, lighter(item.glow, 0.4));
    g.box(0, 17, 0, 1, 2, 1, BRASS).box(4, 17, 4, 1, 2, 1, BRASS).box(4, 17, 0, 1, 2, 1, BRASS).box(0, 17, 4, 1, 2, 1, BRASS);
    return held(g, 3);
  },

  staff(item) {
    const top = item.metal ?? DARK_WOOD;
    const g = new VoxelGrid(7, 50, 7).box(2, 0, 2, 3, 42, 3, WOOD).box(2, 0, 2, 3, 2, 3, DARK_WOOD);
    for (const y of [9, 22, 31]) g.box(2, y, 2, 3, 1, 3, darker(WOOD, 0.25)); // knots
    g.box(0, 41, 0, 7, 2, 7, top);
    for (const [x, z] of [[0, 0], [6, 0], [0, 6], [6, 6]]) g.box(x, 43, z, 1, 5, 1, top).set(x + (x ? -1 : 1), 48, z + (z ? -1 : 1), top);
    g.box(2, 43, 2, 3, 5, 3, item.glow).box(3, 48, 3, 1, 1, 1, lighter(item.glow, 0.4));
    if (item.tier >= 4) g.box(2, 18, 2, 3, 1, 3, GOLD).box(2, 26, 2, 3, 1, 3, GOLD);
    return held(g, 12); // the foot of the staff just above the ground
  },

  tome(item) {
    const g = new VoxelGrid(4, 11, 9).box(0, 0, 0, 4, 11, 9, item.metal).box(1, 1, 1, 2, 9, 8, 0xf4ecd6);
    g.box(0, 0, 0, 4, 11, 1, darker(item.metal, 0.25)).box(0, 4, 8, 4, 3, 1, GOLD).box(0, 4, 3, 1, 3, 3, GOLD);
    return held(g, 5.5);
  },

  orb(item) {
    const g = new VoxelGrid(9, 12, 9).box(2, 0, 2, 5, 3, 5, BRASS).box(1, 2, 1, 1, 2, 1, BRASS).box(7, 2, 7, 1, 2, 1, BRASS);
    g.box(2, 3, 1, 5, 8, 7, item.glow).box(1, 4, 2, 7, 6, 5, item.glow).box(2, 4, 0, 5, 6, 9, item.glow).box(0, 5, 3, 9, 4, 3, item.glow);
    g.box(3, 9, 3, 2, 2, 2, lighter(item.glow, 0.45));
    return held(g, 1);
  },
};
