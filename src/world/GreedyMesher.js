// Turns a chunk's voxels into shapes the graphics card can draw.
//
// Two tricks keep this fast:
// 1. Hidden-face culling: a cube side is only drawn when it touches air
//    (or water). Sides hidden between two cubes are skipped.
// 2. Greedy meshing: neighbouring sides that look exactly the same (same block,
//    same corner shading) are merged into one big rectangle. A flat meadow of
//    100 grass tops becomes a handful of rectangles instead of 100 squares.
//
// Corners in nooks between blocks get darker ("ambient occlusion"), which gives
// the soft voxel look. Only sides with identical shading are merged, so this
// stays correct.
//
// The result is plain number lists (no Three.js here), because this runs in a
// background worker. Three groups come out: solid, glowing and liquid blocks.

import { CHUNK } from '../data/world.js';
import { BLOCK, BLOCK_INFO } from '../data/blocks.js';

const S = CHUNK.size;
const H = CHUNK.height;
const DIMS = [S, H, S];

// How bright a corner is, from 0 (deep nook) to 3 (fully open).
const AO_BRIGHTNESS = [0.36, 0.58, 0.8, 1.0]; // strong: separates steps and cubes clearly

// Block colours converted to "linear" colour space (what the renderer expects).
const LINEAR_COLORS = BLOCK_INFO.map((info) => [
  toLinear((info.color >> 16) & 255),
  toLinear((info.color >> 8) & 255),
  toLinear(info.color & 255),
]);
// Side colour for blocks that have one (e.g. grass), otherwise the main colour.
const LINEAR_SIDES = BLOCK_INFO.map((info, i) => {
  if (info.side === undefined) return LINEAR_COLORS[i];
  return [toLinear((info.side >> 16) & 255), toLinear((info.side >> 8) & 255), toLinear(info.side & 255)];
});
const OPAQUE = BLOCK_INFO.map((info) => (info.opaque ? 1 : 0));
const LIQUID = BLOCK_INFO.map((info) => (info.liquid ? 1 : 0));
const GLOW = BLOCK_INFO.map((info) => (info.glow ? 1 : 0));
const SWAY = BLOCK_INFO.map((info) => (info.sway ? 1 : 0));

function toLinear(c255) {
  const c = c255 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function meshChunk(volume) {
  const out = { solid: new MeshBuffers(), glow: new MeshBuffers(), liquid: new MeshBuffers() };
  // Read a voxel using chunk coordinates (0..31); the padding makes -1 and 32 work too.
  const get = (x, y, z) => volume.getLocal(x + 1, y, z + 1);
  const mask = new Int32Array(Math.max(S * H, S * S));
  const pos = [0, 0, 0];

  // For each axis (d) we slice the chunk into layers and handle both facing directions.
  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3;
    const v = (d + 2) % 3;
    for (const side of [-1, 1]) {
      for (pos[d] = 0; pos[d] < DIMS[d]; pos[d]++) {
        // Step 1: for every cell of this layer, which face (if any) is visible?
        let n = 0;
        for (pos[v] = 0; pos[v] < DIMS[v]; pos[v]++) {
          for (pos[u] = 0; pos[u] < DIMS[u]; pos[u]++) {
            mask[n++] = faceKey(get, pos, d, u, v, side);
          }
        }
        // Step 2: merge equal neighbours into rectangles.
        mergeLayer(mask, DIMS[u], DIMS[v], (i, j, w, h, key) => {
          emitQuad(out, pos[d], d, u, v, side, i, j, w, h, key);
        });
      }
    }
  }

  return { solid: out.solid.pack(), glow: out.glow.pack(), liquid: out.liquid.pack() };
}

// Describes the visible face as one number: block id + 4 corner shading levels.
// 0 means "no face here".
function faceKey(get, pos, d, u, v, side) {
  const block = get(pos[0], pos[1], pos[2]);
  if (block === 0) return 0;
  const nx = pos[0] + (d === 0 ? side : 0);
  const ny = pos[1] + (d === 1 ? side : 0);
  const nz = pos[2] + (d === 2 ? side : 0);
  const neighbour = get(nx, ny, nz);

  if (LIQUID[block]) return neighbour === 0 ? block | (255 << 8) : 0;
  if (OPAQUE[neighbour]) return 0;
  if (GLOW[block]) return block | (255 << 8); // glowing blocks are not shaded

  // Corner order: a(-u,-v), b(+u,-v), c(-u,+v), d(+u,+v).
  const n = [nx, ny, nz];
  let ao = 0;
  let shift = 0;
  for (const [su, sv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ao |= cornerAO(get, n, u, v, su, sv) << shift;
    shift += 2;
  }
  return block | (ao << 8);
}

// Counts solid blocks around one corner, in the layer just in front of the face.
function cornerAO(get, n, u, v, su, sv) {
  const p1 = [n[0], n[1], n[2]];
  const p2 = [n[0], n[1], n[2]];
  const pc = [n[0], n[1], n[2]];
  p1[u] += su;
  p2[v] += sv;
  pc[u] += su;
  pc[v] += sv;
  const side1 = OPAQUE[get(p1[0], p1[1], p1[2])];
  const side2 = OPAQUE[get(p2[0], p2[1], p2[2])];
  if (side1 && side2) return 0;
  return 3 - (side1 + side2 + OPAQUE[get(pc[0], pc[1], pc[2])]);
}

// The "greedy" part: grow each rectangle as wide, then as tall, as possible.
function mergeLayer(mask, width, height, emit) {
  let n = 0;
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; ) {
      const key = mask[n];
      if (key === 0) {
        i++;
        n++;
        continue;
      }
      let w = 1;
      while (i + w < width && mask[n + w] === key) w++;
      let h = 1;
      grow: while (j + h < height) {
        for (let k = 0; k < w; k++) if (mask[n + k + h * width] !== key) break grow;
        h++;
      }
      emit(i, j, w, h, key);
      for (let l = 0; l < h; l++) for (let k = 0; k < w; k++) mask[n + k + l * width] = 0;
      i += w;
      n += w;
    }
  }
}

function emitQuad(out, layer, d, u, v, side, i, j, w, h, key) {
  const block = key & 255;
  const target = LIQUID[block] ? out.liquid : GLOW[block] ? out.glow : out.solid;
  const isTop = d === 1 && side > 0;
  const base = isTop ? LINEAR_COLORS[block] : LINEAR_SIDES[block];
  const ao = [(key >> 8) & 3, (key >> 10) & 3, (key >> 12) & 3, (key >> 14) & 3];

  // The 4 corners a, b, c, d of the rectangle.
  const corners = [];
  for (const [cu, cv] of [[i, j], [i + w, j], [i, j + h], [i + w, j + h]]) {
    const p = [0, 0, 0];
    p[d] = layer + (side > 0 ? 1 : 0);
    p[u] = cu;
    p[v] = cv;
    corners.push(p);
  }
  const normal = [0, 0, 0];
  normal[d] = side;
  const colors = ao.map((level) => {
    const k = AO_BRIGHTNESS[level];
    return [base[0] * k, base[1] * k, base[2] * k];
  });
  // Flip the diagonal when needed so the shading looks smooth.
  const flip = ao[0] + ao[3] > ao[1] + ao[2];
  // Meadow grass gets its shade in the shader (world/grassPalette.js): 1 = top, 2 = side.
  const tint = block === BLOCK.GRASS ? (isTop ? 1 : 2) : 0;
  target.addQuad(corners, normal, colors, side > 0, flip, SWAY[block], tint);
}

// Collects corners, colours and triangles, then packs them into typed arrays.
class MeshBuffers {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.colors = [];
    this.sway = [];   // 1 for blocks that move in the wind (leaves, crops)
    this.tint = [];   // 1/2 for meadow grass tops/sides (shaded by the grass palette)
    this.indices = [];
  }

  addQuad(corners, normal, colors, frontIsPositive, flip, sway = 0, tint = 0) {
    const s = this.positions.length / 3;
    for (let k = 0; k < 4; k++) {
      this.positions.push(corners[k][0], corners[k][1], corners[k][2]);
      this.normals.push(normal[0], normal[1], normal[2]);
      this.colors.push(colors[k][0], colors[k][1], colors[k][2]);
      this.sway.push(sway);
      this.tint.push(tint);
    }
    // Triangles must be listed counter-clockwise as seen from the front.
    const [a, b, c, d] = [s, s + 1, s + 2, s + 3];
    let tris = flip ? [a, b, d, a, d, c] : [a, b, c, c, b, d];
    if (!frontIsPositive) tris = [tris[0], tris[2], tris[1], tris[3], tris[5], tris[4]];
    this.indices.push(...tris);
  }

  pack() {
    if (this.indices.length === 0) return null;
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      colors: new Float32Array(this.colors),
      sway: new Float32Array(this.sway),
      tint: new Float32Array(this.tint),
      indices: new Uint32Array(this.indices),
    };
  }
}
