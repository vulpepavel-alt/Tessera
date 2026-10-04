// The building blocks every creature is made from (see creatureModels.js):
// chunky blocks with rounded edges, a lighter top and a darker belly, big
// eyes with a glint, and stubby legs that float a little apart from the body
// like the hands and feet of people. All at the character cube size (MV).

import * as THREE from 'three';
import { VoxelGrid } from './VoxelGrid.js';
import { MV } from '../data/characterSpec.js';
import { lighter, darker } from './humanoid/colors.js';

export { VoxelGrid, lighter, darker };

export const EYE = 0x161018;
const SHINE = 0xffffff;

// Adds a part: grid, its joint (in grid cubes), its place (in MV from the parent's joint).
export function part(parent, grid, pivot, at, material) {
  const group = new THREE.Group();
  group.position.set(at[0] * MV, at[1] * MV, at[2] * MV);
  group.add(new THREE.Mesh(grid.toGeometry(MV, pivot), material));
  parent.add(group);
  return group;
}

// A chunky block: base colour, lighter top, darker underside, rounded top edges.
export function block(g, x0, y0, z0, w, h, d, base, { belly = darker(base, 0.22), round = true } = {}) {
  g.box(x0, y0, z0, w, h, d, base).box(x0, y0 + h - 1, z0, w, 1, d, lighter(base, 0.1)).box(x0, y0, z0, w, 1, d, belly);
  if (round) {
    const x1 = x0 + w - 1;
    const z1 = z0 + d - 1;
    const yt = y0 + h - 1;
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) g.box(x, y0, z, 1, h, 1, null); // vertical edges
    g.box(x0, yt, z0, w, 1, 1, null).box(x0, yt, z1, w, 1, 1, null).box(x0, yt, z0, 1, 1, d, null).box(x1, yt, z0, 1, 1, d, null);
  }
  return g;
}

// Two big eyes on the front face (z = face): dark, with a white glint at the top outside.
export function eyes(g, cx, y, face, gap, size = 2, color = EYE) {
  for (const s of [-1, 1]) {
    const x = Math.round(s < 0 ? cx - gap / 2 - size : cx + gap / 2);
    g.box(x, y, face, size, size + 1, 1, color);
    g.set(s < 0 ? x : x + size - 1, y + size, face, SHINE);
  }
}

// Four stubby legs. top: where the leg's top joint sits (MV); x: half the
// distance between left and right legs; zFront / zBack: their z.
export function legs(body, material, { w, h, d, x, zFront, zBack, top }, color, foot) {
  const leg = () => new VoxelGrid(w, h, d).box(0, 0, 0, w, h, d, color).box(0, 0, 0, w, 2, d, foot).box(0, h - 1, 0, w, 1, d, darker(color, 0.15));
  const parts = {};
  for (const [name, sx, z] of [['legFL', -1, zFront], ['legFR', 1, zFront], ['legBL', -1, zBack], ['legBR', 1, zBack]]) {
    parts[name] = part(body, leg(), [w / 2, h, d / 2], [sx * x, top, z], material);
  }
  return parts;
}

// A tail made of shrinking square slices (widths from the root to the tip),
// pointing backwards from `at` on `parent`. tip: colour of the last slices.
export function tail(parent, material, widths, color, tipColor, at, lift = 0.5) {
  const n = widths.length;
  const size = Math.max(...widths);
  const g = new VoxelGrid(size, size, n);
  widths.forEach((w, z) => {
    const o = Math.floor((size - w) / 2);
    g.box(o, o, z, w, w, 1, tipColor && z >= n - 3 ? tipColor : color);
  });
  const t = part(parent, g, [size / 2, size / 2, 0], at, material);
  t.rotation.set(lift, Math.PI, 0); // turned to point backwards
  return t;
}
