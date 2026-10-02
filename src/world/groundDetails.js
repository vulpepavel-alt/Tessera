// Picks spots for small decorations that are not blocks: grass tufts, flowers,
// flower clusters, clover, pebbles and reeds. Runs in the chunk worker.
// Output: a flat list of numbers, 4 per item: x, y, z (ground top) and a kind:
//   0..9     grass tuft (kind = which grass block, for its colour)
//   100+n    single flower with colour n
//   200      pebbles
//   300+k    clover patch (k = grass block)
//   400+n    cluster of three little flowers with colour n
//   500      reeds (by the water)

import { CHUNK } from '../data/world.js';
import { BLOCK, BLOCK_INFO } from '../data/blocks.js';
import { hash3 } from './random.js';

const S = CHUNK.size;
const GRASSY = [BLOCK.GRASS, BLOCK.GOLDEN_GRASS, BLOCK.FROST_GRASS, BLOCK.MARSH_GRASS, BLOCK.STORM_GRASS];
const SHORE = [BLOCK.SAND, BLOCK.MUD, BLOCK.DUNE_SAND, BLOCK.COPPER_SAND];
const ROCKY = [BLOCK.STONE, BLOCK.DARK_ROCK, BLOCK.SANDSTONE, BLOCK.COBBLE];

// Plants grow in CLUSTERS, not evenly: a slow "patch" noise decides where
// dense grass grows, another where flowers bloom; in between the ground is
// mostly bare (visual rhythm: patch, open ground, flowers, open ground...).
// Chances per column inside each kind of patch (they add up from the top).
const GRASS_PATCH = [['clover', 0.05], ['tuft', 0.42]];
const FLOWER_PATCH = [['flower', 0.12], ['cluster', 0.16], ['tuft', 0.12]];
const OPEN_GROUND = [['pebbles', 0.008], ['tuft', 0.025], ['flower', 0.004]];

export function groundDetails(volume, salt) {
  const out = [];
  for (let z = 0; z < S; z++) {
    for (let x = 0; x < S; x++) {
      let y = CHUNK.height - 1;
      while (y > 0 && volume.getLocal(x + 1, y, z + 1) === 0) y--;
      const ground = volume.getLocal(x + 1, y, z + 1);
      if (volume.getLocal(x + 1, y + 1, z + 1) !== 0) continue; // something stands here
      const wx = volume.originX + 1 + x;
      const wz = volume.originZ + 1 + z;
      const r = hash3(wx, 7, wz, salt);
      const ox = 0.25 + hash3(wx, 8, wz, salt) * 0.5;
      const oz = 0.25 + hash3(wx, 9, wz, salt) * 0.5;
      const colour = Math.floor(hash3(wx, 10, wz, salt) * 4);
      const add = (kind) => out.push(wx + ox, y + 1, wz + oz, kind);

      const grass = GRASSY.indexOf(ground);
      if (grass >= 0) {
        let total = 0;
        const items = patchNoise(wx, wz, 11, salt) > 0.62 ? GRASS_PATCH
          : patchNoise(wx + 500, wz - 300, 8, salt) > 0.7 ? FLOWER_PATCH : OPEN_GROUND;
        for (const [item, chance] of items) {
          total += chance;
          if (r >= total) continue;
          if (item === 'flower' && grass !== 2) add(100 + colour);
          else if (item === 'cluster' && grass !== 2) add(400 + colour);
          else if (item === 'clover') add(300 + grass);
          else if (item === 'pebbles') add(200);
          else if (item === 'tuft') add(grass);
          break;
        }
      } else if (SHORE.includes(ground) && r < 0.25 && nextToWater(volume, x + 1, y, z + 1)) {
        add(500);
      } else if ((ROCKY.includes(ground) || SHORE.includes(ground)) && r < 0.03) {
        add(200);
      }
    }
  }
  return new Float32Array(out);
}

// A smooth 0..1 noise made from hashed grid corners (cell = patch size).
function patchNoise(x, z, cell, salt) {
  const gx = Math.floor(x / cell);
  const gz = Math.floor(z / cell);
  let fx = x / cell - gx;
  let fz = z / cell - gz;
  fx = fx * fx * (3 - 2 * fx);
  fz = fz * fz * (3 - 2 * fz);
  const h = (i, j) => hash3(i, 11, j, salt);
  const a = h(gx, gz) + (h(gx + 1, gz) - h(gx, gz)) * fx;
  const b = h(gx, gz + 1) + (h(gx + 1, gz + 1) - h(gx, gz + 1)) * fx;
  return a + (b - a) * fz;
}

function nextToWater(volume, lx, y, lz) {
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (const dy of [0, 1]) {
      if (BLOCK_INFO[volume.getLocal(lx + dx, y + dy, lz + dz)]?.liquid) return true;
    }
  }
  return false;
}
