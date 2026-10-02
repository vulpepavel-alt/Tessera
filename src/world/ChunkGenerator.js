// Fills one chunk with voxels: terrain first, then villages, then plants.

import { CHUNK, WORLD } from '../data/world.js';
import { BLOCK } from '../data/blocks.js';
import { ChunkVolume } from './ChunkVolume.js';
import { FLORA_BUILDERS } from './Decorations.js';
import { waterBlockAt } from './WorldGenerator.js';
import { stampVillage } from './VillageBuilder.js';
import { VILLAGE } from '../data/villages.js';
import { hash3, mulberry32 } from './random.js';

const S = CHUNK.size;
const FLORA_MARGIN = 13; // plants this far outside the chunk can still reach into it (big trees)

export function generateChunk(world, cx, cz) {
  const volume = new ChunkVolume(cx, cz);
  const x0 = cx * S;
  const z0 = cz * S;

  // Pass 1: terrain for the chunk plus its 1-voxel border.
  // We also remember the columns around it, for plants that cross the edge.
  const columns = [];
  for (let z = z0 - FLORA_MARGIN; z < z0 + S + FLORA_MARGIN; z++) {
    for (let x = x0 - FLORA_MARGIN; x < x0 + S + FLORA_MARGIN; x++) {
      const col = world.column(x, z);
      columns.push({ x, z, col });
      if (x >= x0 - 1 && x <= x0 + S && z >= z0 - 1 && z <= z0 + S) fillColumn(volume, x, z, col);
    }
  }

  // Pass 2: villages whose area reaches into this chunk.
  for (const village of world.villages.villagesNear(x0 + S / 2, z0 + S / 2)) {
    const reach = VILLAGE.radius + 4;
    if (Math.abs(village.center.x - (x0 + S / 2)) < reach + S && Math.abs(village.center.z - (z0 + S / 2)) < reach + S) {
      stampVillage(volume, village);
    }
  }

  // Hand-built structures (only the benchmark world has these).
  world.stampStructures?.(volume);

  // Pass 3: plants (not inside villages).
  for (const { x, z, col } of columns) {
    if (col.village) continue;
    if (world.fixedFlora?.(volume, x, z, col, columnRng(x, z, world.salt))) continue; // benchmark: hand-placed
    placeFlora(volume, x, z, col, world.salt, world.groveAt(x, z));
  }

  return volume;
}

// Surface block on top, soil below it, stone deeper, deep stone at the very bottom.
function fillColumn(volume, x, z, col) {
  const { top, surface, biome, waterTop } = col;
  const soilDepth = surface === biome.stone || surface === biome.peak ? 1 : 3;
  for (let y = 0; y <= top; y++) {
    let block;
    if (y === top) block = surface;
    else if (y > top - soilDepth) block = surface === biome.beach ? biome.beach : biome.soil;
    else if (y < 4) block = BLOCK.DEEP_STONE;
    else block = biome.stone;
    volume.set(x, y, z, block);
  }
  for (let y = top + 1; y <= waterTop; y++) volume.set(x, y, z, waterBlockAt(biome, y, waterTop));
}

// Maybe grow one plant on this column, chosen from the biome's flora list.
// Trees only grow in groves (grove > GROVE_EDGE); other plants grow anywhere.
const GROVE_EDGE = 0.52;

function placeFlora(volume, x, z, col, salt, grove) {
  if (col.waterTop >= 0) return;
  const roll = hash3(x, 1, z, salt);
  let total = 0;
  for (const flora of col.biome.flora) {
    total += flora.chance;
    if (roll < total) {
      if (!flora.on.includes(col.surface)) return;
      if (flora.type.endsWith('Tree') && grove < GROVE_EDGE) return;
      FLORA_BUILDERS[flora.type](volume, x, col.top + 1, z, flora, columnRng(x, z, salt));
      return;
    }
  }
}

function columnRng(x, z, salt) {
  return mulberry32(Math.floor(hash3(x, 2, z, salt) * 4294967296));
}
