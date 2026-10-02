// Small decorative voxel models, built in code with cubes 1/8 of a block.
// Each one stands on the ground with its centre at x = z = 0 and faces +Z.

import { VoxelGrid } from './VoxelGrid.js';

export const PROP_VOXEL = 0.125;

const WOOD = 0xb5854f;
const DARK = 0x6e4a2c;
const CLAY = 0xd0703c;
const SOIL = 0x5a3a22;
const LEAF = 0x4fb83a;
const LEAF_DARK = 0x3b9a2e;
const STEEL = 0xd5dbe3;
const GOLD = 0xffcc33;
const STONE = 0xa8a4a0;
const STONE_DARK = 0x86827e;

// Each builder returns [grid, pivot]; the pivot is the bottom centre.
export const PROP_BUILDERS = {
  flowerPot() {
    const g = new VoxelGrid(5, 7, 5).box(0, 0, 0, 5, 3, 5, CLAY).box(0, 2, 0, 5, 1, 5, 0xe08850).box(1, 3, 1, 3, 1, 3, SOIL);
    g.box(1, 4, 1, 3, 1, 3, LEAF).set(2, 5, 2, LEAF_DARK);
    g.set(1, 5, 1, 0xff5a6a).set(3, 5, 3, 0xffd84a).set(3, 5, 1, 0xff8ac8).set(1, 6, 3, 0xffffff).set(2, 6, 2, 0xff5a6a);
    return [g, [2.5, 0, 2.5]];
  },
  vase() {
    const g = new VoxelGrid(5, 10, 5).box(1, 0, 1, 3, 1, 3, 0x3f86e0).box(0, 1, 0, 5, 4, 5, 0x3f86e0).box(1, 5, 1, 3, 2, 3, 0x3f86e0);
    g.box(0, 2, 0, 5, 1, 5, GOLD).box(1, 7, 1, 3, 1, 3, 0x2a6ac0);
    g.set(2, 8, 2, LEAF).set(2, 9, 2, 0xff5a6a).set(1, 8, 2, LEAF).set(1, 9, 1, 0xffd84a);
    return [g, [2.5, 0, 2.5]];
  },
  table() {
    const g = new VoxelGrid(10, 6, 8).box(0, 5, 0, 10, 1, 8, WOOD);
    for (const [x, z] of [[1, 1], [8, 1], [1, 6], [8, 6]]) g.box(x, 0, z, 1, 5, 1, DARK);
    g.box(3, 6 - 1, 2, 4, 1, 4, 0xd8c8a0); // table cloth runner
    return [g, [5, 0, 4]];
  },
  chair() {
    const g = new VoxelGrid(5, 9, 5).box(0, 3, 0, 5, 1, 5, WOOD).box(0, 4, 0, 5, 5, 1, WOOD).box(1, 6, 0, 3, 2, 1, DARK);
    for (const [x, z] of [[0, 0], [4, 0], [0, 4], [4, 4]]) g.box(x, 0, z, 1, 3, 1, DARK);
    return [g, [2.5, 0, 2.5]];
  },
  bench() {
    const g = new VoxelGrid(14, 6, 5).box(0, 3, 0, 14, 1, 4, WOOD).box(0, 4, 0, 14, 2, 1, WOOD);
    for (const x of [1, 12]) g.box(x, 0, 0, 1, 3, 4, DARK);
    return [g, [7, 0, 2.5]];
  },
  barrel() {
    const g = new VoxelGrid(6, 8, 6).box(1, 0, 0, 4, 8, 6, 0x9a6a3a).box(0, 0, 1, 6, 8, 4, 0x9a6a3a);
    for (const y of [1, 6]) g.box(1, y, 0, 4, 1, 6, 0x5a5a62).box(0, y, 1, 6, 1, 4, 0x5a5a62);
    g.box(1, 7, 1, 4, 1, 4, 0x7a4e2a);
    return [g, [3, 0, 3]];
  },
  crate() {
    const g = new VoxelGrid(7, 7, 7).box(0, 0, 0, 7, 7, 7, 0xc8965a);
    for (const [x, z] of [[0, 0], [6, 0], [0, 6], [6, 6]]) g.box(x, 0, z, 1, 7, 1, DARK);
    g.box(0, 0, 0, 7, 1, 7, DARK).box(0, 6, 0, 7, 1, 7, DARK);
    for (let i = 1; i < 6; i++) g.set(i, i, 0, DARK).set(i, i, 6, DARK);
    return [g, [3.5, 0, 3.5]];
  },
  weaponRack() {
    const g = new VoxelGrid(12, 12, 3).box(0, 0, 0, 1, 10, 3, DARK).box(11, 0, 0, 1, 10, 3, DARK).box(0, 8, 0, 12, 1, 3, DARK);
    for (const x of [3, 6, 9]) g.box(x, 1, 1, 1, 9, 1, STEEL).set(x, 2, 1, GOLD).set(x - 1, 2, 1, GOLD).set(x + 1, 2, 1, GOLD).set(x, 1, 1, 0x4e3420);
    return [g, [6, 0, 1.5]];
  },
  armorStand() {
    const g = new VoxelGrid(8, 15, 4).box(3, 0, 1, 2, 9, 2, DARK).box(1, 0, 0, 6, 1, 4, DARK);
    g.box(1, 6, 0, 6, 5, 4, 0x9aa3b0).box(2, 7, 3, 4, 3, 1, 0xb8c2d4).box(0, 9, 0, 8, 2, 4, 0x9aa3b0);
    g.box(2, 11, 0, 4, 4, 4, 0x9aa3b0).box(2, 12, 3, 4, 1, 1, 0x2a2a32).set(3, 15 - 1, 1, 0xdc4b4b).set(4, 14, 1, 0xdc4b4b);
    return [g, [4, 0, 2]];
  },
  fruitBasket() {
    const g = new VoxelGrid(7, 5, 7).box(0, 0, 0, 7, 3, 7, 0xb58a4a).box(1, 1, 1, 5, 2, 5, 0x8a6030);
    const fruit = [0xe8443a, 0x7ad03a, 0xffd84a, 0xff9a2a];
    for (let x = 1; x < 6; x += 2) for (let z = 1; z < 6; z += 2) g.box(x, 3, z, 2, 1, 2, fruit[(x + z) % 4]);
    g.set(3, 4, 3, 0xe8443a);
    return [g, [3.5, 0, 3.5]];
  },
  sack() {
    const g = new VoxelGrid(6, 7, 6).box(0, 0, 0, 6, 5, 6, 0xe0cfa0).box(1, 5, 1, 4, 1, 4, 0xd0bf90).box(2, 6, 2, 2, 1, 2, 0x8a6a3a);
    return [g, [3, 0, 3]];
  },
  rock() {
    const g = new VoxelGrid(6, 4, 5).box(0, 0, 0, 6, 2, 5, STONE).box(1, 2, 1, 4, 1, 3, STONE).box(2, 3, 1, 2, 1, 2, STONE).box(0, 0, 0, 6, 1, 5, STONE_DARK);
    return [g, [3, 0, 2.5]];
  },
  bigRock() {
    const g = new VoxelGrid(12, 8, 10).box(0, 0, 1, 12, 4, 8, STONE).box(1, 0, 0, 10, 3, 10, STONE).box(2, 4, 2, 8, 2, 6, STONE).box(3, 6, 3, 5, 2, 4, STONE);
    g.box(0, 0, 1, 12, 1, 8, STONE_DARK).box(3, 7, 3, 3, 1, 2, 0xc4c0bc).box(1, 3, 2, 3, 1, 2, 0x6aaa3a);
    return [g, [6, 0, 5]];
  },
  mushroom() {
    const g = new VoxelGrid(6, 6, 6).box(2, 0, 2, 2, 3, 2, 0xf4ead8).box(0, 3, 0, 6, 2, 6, 0xe8443a).box(1, 5, 1, 4, 1, 4, 0xe8443a);
    g.set(1, 4, 0, 0xffffff).set(4, 5, 2, 0xffffff).set(5, 4, 4, 0xffffff).set(2, 4, 5, 0xffffff);
    return [g, [3, 0, 3]];
  },
  log() {
    const g = new VoxelGrid(16, 5, 5).box(0, 0, 0, 16, 5, 5, 0x845531).box(0, 1, 1, 1, 3, 3, 0xd8b07a).box(15, 1, 1, 1, 3, 3, 0xd8b07a);
    g.set(0, 2, 2, 0x9a6a3a).set(15, 2, 2, 0x9a6a3a).box(4, 5 - 1, 1, 3, 1, 2, 0x4fb83a).box(10, 4, 2, 2, 1, 2, 0x3b9a2e);
    return [g, [8, 0, 2.5]];
  },
  signpost() {
    const g = new VoxelGrid(10, 14, 2).box(4, 0, 0, 2, 13, 2, DARK).box(0, 9, 1, 10, 4, 1, WOOD).box(1, 10, 1, 8, 2, 1, 0x9a6a3a);
    g.set(9, 11, 1, DARK).set(0, 11, 1, DARK);
    return [g, [5, 0, 1]];
  },
  door() {
    // Fills a 1 x 2 block doorway: planks, a frame and a golden knob.
    const g = new VoxelGrid(8, 16, 1).box(0, 0, 0, 8, 16, 1, 0x9a6a3a);
    for (const x of [2, 5]) g.box(x, 0, 0, 1, 16, 1, 0x845531);
    g.box(0, 15, 0, 8, 1, 1, DARK).box(0, 0, 0, 1, 16, 1, DARK).box(7, 0, 0, 1, 16, 1, DARK).box(1, 7, 0, 6, 1, 1, DARK);
    g.set(6, 8, 0, GOLD).box(2, 11, 0, 4, 3, 1, 0x9fe0ff);
    return [g, [4, 0, -0.5]];
  },
  shutter() {
    // Covers the side of a 2-block-tall window.
    const g = new VoxelGrid(3, 16, 1).box(0, 0, 0, 3, 16, 1, 0x3f86e0);
    for (const y of [1, 4, 7, 10, 13]) g.box(0, y, 0, 3, 1, 1, 0x2a6ac0);
    return [g, [1.5, 0, -0.5]];
  },
  bed() {
    const g = new VoxelGrid(8, 5, 16).box(0, 0, 0, 8, 3, 16, WOOD).box(0, 3, 0, 8, 2, 1, DARK).box(0, 3, 15, 8, 1, 1, DARK);
    g.box(0, 3, 4, 8, 1, 11, 0xdc4b4b).box(1, 3, 1, 6, 1, 3, 0xffffff).box(0, 3, 4, 8, 1, 1, 0xf2eee2);
    return [g, [4, 0, 8]];
  },
  pumpkin() {
    const g = new VoxelGrid(7, 6, 7).box(1, 0, 0, 5, 5, 7, 0xf5902a).box(0, 0, 1, 7, 5, 5, 0xf5902a);
    for (const x of [1, 3, 5]) g.box(x, 1, 0, 1, 3, 1, 0xd8761a);
    g.box(3, 5, 3, 1, 1, 1, 0x5a7a2a).set(4, 5, 3, 0x4fb83a);
    return [g, [3.5, 0, 3.5]];
  },
  // A wooden window box full of flowers (one block long).
  planter() {
    const g = new VoxelGrid(8, 5, 4).box(0, 0, 0, 8, 3, 4, 0x9a6a3a).box(0, 2, 0, 8, 1, 4, DARK).box(1, 3, 1, 6, 1, 2, LEAF);
    const petals = [0xff5a6a, 0xffd84a, 0xffffff, 0xff8ac8, 0x8fa8ff];
    for (let x = 1; x < 7; x++) g.set(x, 4, 1 + (x % 2), petals[x % petals.length]);
    return [g, [4, 0, 2]];
  },
  berryBush() {
    const g = new VoxelGrid(9, 7, 9);
    for (let y = 0; y < 7; y++) {
      for (let z = 0; z < 9; z++) {
        for (let x = 0; x < 9; x++) {
          const d = Math.hypot(x - 4, (y - 2.5) * 1.3, z - 4);
          if (d < 4.3) g.set(x, y, z, y < 3 ? LEAF_DARK : LEAF);
        }
      }
    }
    for (const [x, y, z] of [[1, 3, 4], [4, 5, 7], [7, 3, 3], [3, 4, 1], [6, 5, 6], [4, 6, 3]]) g.set(x, y, z, 0xe8344a);
    return [g, [4.5, 0, 4.5]];
  },
};
