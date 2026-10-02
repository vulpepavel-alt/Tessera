// A tiny top-down picture of one chunk for the minimap (plus the ground height
// of every column, for the 3D relief): 32 x 32 pixels, the
// colour of the highest block in each column, a little darker where the ground
// drops away (so hills show), and blue where there is water.

import { CHUNK } from '../data/world.js';
import { BLOCK_INFO } from '../data/blocks.js';

const S = CHUNK.size;
const H = CHUNK.height;
const RGB = BLOCK_INFO.map((b) => [(b.color >> 16) & 255, (b.color >> 8) & 255, b.color & 255]);

export function chunkMapPixels(volume) {
  const heights = new Int16Array(S * S);
  const blocks = new Uint8Array(S * S);
  for (let z = 0; z < S; z++) {
    for (let x = 0; x < S; x++) {
      let y = H - 1;
      while (y >= 0 && volume.getLocal(x + 1, y, z + 1) === 0) y--;
      heights[x + z * S] = y;
      blocks[x + z * S] = y >= 0 ? volume.getLocal(x + 1, y, z + 1) : 0;
    }
  }
  const pixels = new Uint8ClampedArray(S * S * 4);
  for (let z = 0; z < S; z++) {
    for (let x = 0; x < S; x++) {
      const i = x + z * S;
      const o = i * 4;
      if (heights[i] < 0) {
        // Open sky over a rift: pale cloud colour.
        pixels.set([226, 234, 244, 255], o);
        continue;
      }
      // Light from the north-west: brighter when higher than the neighbour there.
      const nw = x > 0 && z > 0 ? heights[i - 1 - S] : heights[i];
      const shade = Math.max(0.65, Math.min(1.25, 1 + (heights[i] - nw) * 0.12));
      const [r, g, b] = RGB[blocks[i]];
      pixels[o] = r * shade;
      pixels[o + 1] = g * shade;
      pixels[o + 2] = b * shade;
      pixels[o + 3] = 255;
    }
  }
  return { pixels, heights: new Uint8Array(heights.map((h) => Math.max(0, h))) };
}
