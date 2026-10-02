// A background "worker": a helper that runs on another processor core.
// It builds chunks (voxels + shapes) so the game itself never has to pause.
//
// It receives { id, seed, cx, cz } and sends back the finished chunk.

import { createGenerator } from './BenchmarkGenerator.js';
import { generateChunk } from './ChunkGenerator.js';
import { meshChunk } from './GreedyMesher.js';
import { chunkMapPixels } from './chunkMap.js';
import { groundDetails } from './groundDetails.js';

let world = null;

self.onmessage = (event) => {
  const { id, seed, cx, cz } = event.data;
  if (!world || world.seed !== seed) world = createGenerator(seed);

  const volume = generateChunk(world, cx, cz);
  const empty = volume.isEmpty();
  const mesh = empty ? null : meshChunk(volume);
  const map = chunkMapPixels(volume);
  const details = groundDetails(volume, world.salt);
  const props = new Float32Array(volume.props);

  // "Transfer" the big number lists instead of copying them (much faster).
  const transfer = [volume.data.buffer, map.pixels.buffer, map.heights.buffer, details.buffer, props.buffer];
  if (mesh) {
    for (const part of Object.values(mesh)) {
      if (part) transfer.push(part.positions.buffer, part.normals.buffer, part.colors.buffer, part.sway.buffer, part.tint.buffer, part.indices.buffer);
    }
  }
  self.postMessage({ id, cx, cz, empty, mesh, map, details, props, voxels: volume.data }, transfer);
};
