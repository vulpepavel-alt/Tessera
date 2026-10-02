// Builders for everything that grows or stands on the ground: trees, bushes,
// cacti, mushrooms, boulders and crystals. Each biome lists which ones it uses
// in data/biomes.js.
//
// Every builder gets: the chunk volume, the ground position (x, y = first air
// block above the ground, z), the flora settings, and `rng` (a seeded random
// function, so the same spot always grows the same thing).

const between = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

// A round blob of blocks with a ragged edge (used for canopies and bushes).
function blob(volume, cx, cy, cz, radius, block, rng, squash = 1.4) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy * squash + dz * dz);
        if (d <= radius + 0.3 && (d < radius - 0.5 || rng() < 0.6)) {
          volume.setIfAir(cx + dx, cy + dy, cz + dz, block);
        }
      }
    }
  }
}

function column(volume, x, y, z, height, block) {
  for (let dy = 0; dy < height; dy++) volume.set(x, y + dy, z, block);
}

import { PROP } from '../data/props.js';
import { TREE_BUILDERS } from './trees.js';

export const FLORA_BUILDERS = {
  // A small decorative model (rock, mushroom, log...) instead of blocks.
  prop(volume, x, y, z, f, rng) {
    volume.addProp(PROP[f.prop], x + 0.5, y, z + 0.5, Math.floor(rng() * 4));
  },

  ...TREE_BUILDERS, // oak, tall, blossom and pine trees (world/trees.js)

  // A bare trunk with a couple of crooked branches.
  deadTree(volume, x, y, z, f, rng) {
    const height = between(rng, 4, 7);
    column(volume, x, y, z, height, f.trunk);
    const branches = between(rng, 1, 3);
    for (let b = 0; b < branches; b++) {
      const by = y + between(rng, 2, height - 1);
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const [dx, dz] = dirs[Math.floor(rng() * 4)];
      const length = between(rng, 1, 3);
      for (let l = 1; l <= length; l++) volume.setIfAir(x + dx * l, by + (l > 1 ? 1 : 0), z + dz * l, f.trunk);
    }
  },

  bush(volume, x, y, z, f, rng) {
    blob(volume, x, y, z, 1, f.leaves, rng, 2);
  },

  // A column cactus, sometimes with one arm.
  cactus(volume, x, y, z, f, rng) {
    const height = between(rng, 2, 5);
    column(volume, x, y, z, height, f.block);
    if (height >= 4 && rng() < 0.6) {
      const side = rng() < 0.5 ? 1 : -1;
      volume.setIfAir(x + side, y + 2, z, f.block);
      volume.setIfAir(x + side, y + 3, z, f.block);
    }
  },

  // A glowing lantern-like mushroom (they light up the marsh at night).
  lanternMushroom(volume, x, y, z, f, rng) {
    const height = between(rng, 2, 4);
    column(volume, x, y, z, height, f.stem);
    const capY = y + height;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) volume.setIfAir(x + dx, capY, z + dz, f.cap);
    }
    volume.setIfAir(x, capY + 1, z, f.cap);
  },

  boulder(volume, x, y, z, f, rng) {
    blob(volume, x, y, z, between(rng, 1, 2), f.block, rng, 1.8);
  },

  // A small group of short crystal shards.
  crystalCluster(volume, x, y, z, f, rng) {
    const shards = between(rng, 2, 4);
    for (let k = 0; k < shards; k++) {
      const sx = x + between(rng, -1, 1);
      const sz = z + between(rng, -1, 1);
      for (let dy = -1; dy < between(rng, 1, 4); dy++) volume.setIfAir(sx, y + dy, sz, f.block);
    }
  },
};

