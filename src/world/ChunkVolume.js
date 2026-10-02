// The voxels of one chunk, stored as one long list of numbers (one byte each).
//
// It stores a 1-voxel border around the chunk ("padding") copied from the
// neighbouring chunks. That way, when we decide which faces to draw at the
// chunk's edge, we already know what's on the other side.

import { CHUNK } from '../data/world.js';
import { BLOCK } from '../data/blocks.js';

const S = CHUNK.size;
const H = CHUNK.height;
export const PADDED = S + 2;
const BEDROCK = BLOCK.DEEP_STONE;

export class ChunkVolume {
  constructor(cx, cz, data = null) {
    this.cx = cx;
    this.cz = cz;
    // World position of the padded corner (one voxel before the chunk starts).
    this.originX = cx * S - 1;
    this.originZ = cz * S - 1;
    this.data = data ?? new Uint8Array(PADDED * H * PADDED);
    this.props = []; // small decorations: x, y, z, turn (0-3), type — 5 numbers each
  }

  // Add a prop, but only if it stands inside this chunk (not its border), so
  // neighbouring chunks never draw the same prop twice.
  addProp(type, x, y, z, turn = 0) {
    const lx = Math.floor(x) - this.originX;
    const lz = Math.floor(z) - this.originZ;
    if (lx < 1 || lz < 1 || lx > S || lz > S) return;
    this.props.push(x, y, z, turn, type);
  }

  // Local padded coordinates: lx, lz go from 0 to 33 (1..32 is the chunk itself).
  index(lx, y, lz) {
    return lx + PADDED * (lz + PADDED * y);
  }

  // Below the world counts as solid rock, so the world's floor is never drawn.
  getLocal(lx, y, lz) {
    if (y < 0) return BEDROCK;
    if (y >= H || lx < 0 || lz < 0 || lx >= PADDED || lz >= PADDED) return 0;
    return this.data[this.index(lx, y, lz)];
  }

  // World-coordinate setters. Anything outside this chunk (+ border) is ignored,
  // so trees that cross chunk edges are simply clipped (the neighbour builds the rest).
  set(wx, y, wz, block) {
    const lx = wx - this.originX;
    const lz = wz - this.originZ;
    if (y < 0 || y >= H || lx < 0 || lz < 0 || lx >= PADDED || lz >= PADDED) return;
    this.data[this.index(lx, y, lz)] = block;
  }

  get(wx, y, wz) {
    return this.getLocal(wx - this.originX, y, wz - this.originZ);
  }

  setIfAir(wx, y, wz, block) {
    const lx = wx - this.originX;
    const lz = wz - this.originZ;
    if (y < 0 || y >= H || lx < 0 || lz < 0 || lx >= PADDED || lz >= PADDED) return;
    const i = this.index(lx, y, lz);
    if (this.data[i] === 0) this.data[i] = block;
  }

  isEmpty() {
    for (let i = 0; i < this.data.length; i++) if (this.data[i] !== 0) return false;
    return true;
  }
}
