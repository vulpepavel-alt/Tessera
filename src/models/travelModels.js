// Voxel models for travel gear: the glider and the boat.

import * as THREE from 'three';
import { VoxelGrid, voxelModelMaterial } from './VoxelGrid.js';

const WOOD = 0x8a5a32;
const DARK_WOOD = 0x5e3c22;

// A triangle-shaped glider wing (pointing forward, +Z), in the class colours.
export function buildGlider(colors) {
  const span = 27;
  const depth = 12;
  const g = new VoxelGrid(span, 3, depth);
  const mid = Math.floor(span / 2);
  for (let z = 0; z < depth; z++) {
    // Wide at the back, narrow at the front.
    const half = Math.round(mid * (1 - z / (depth + 1)));
    for (let x = mid - half; x <= mid + half; x++) {
      // The wing tips curve down like a kite, so it shows from behind.
      const droop = Math.min(2, Math.floor(Math.abs(x - mid) / 5));
      const stripe = Math.abs(x - mid) % 4 === 3;
      g.set(x, 2 - droop, z, stripe ? colors.trim : colors.cloth);
    }
  }
  for (let z = 0; z < depth; z++) g.set(mid, 2, z, DARK_WOOD); // the spine
  const mesh = new THREE.Mesh(g.toGeometry(0.1, [mid + 0.5, 2, depth / 2]), voxelModelMaterial());
  mesh.castShadow = true;
  return mesh;
}

// A small wooden rowing boat (front = +Z). The origin is the middle of the
// hull at water level.
export function buildBoat() {
  const w = 11;
  const h = 4;
  const len = 21;
  const g = new VoxelGrid(w, h, len);
  for (let z = 0; z < len; z++) {
    // The hull narrows toward both ends.
    const t = Math.abs(z - (len - 1) / 2) / ((len - 1) / 2);
    const half = Math.round((w / 2 - 0.5) * (1 - t * t * 0.75));
    const x0 = Math.floor(w / 2) - half;
    const x1 = Math.floor(w / 2) + half;
    for (let x = x0; x <= x1; x++) g.set(x, 0, z, DARK_WOOD); // bottom
    for (let y = 1; y < h; y++) {
      g.set(x0, y, z, WOOD);
      g.set(x1, y, z, WOOD);
    }
  }
  // Front and back walls, and a bench in the middle.
  g.box(2, 1, 0, w - 4, h - 1, 1, WOOD).box(2, 1, len - 1, w - 4, h - 1, 1, WOOD);
  g.box(1, 2, 9, w - 2, 1, 3, DARK_WOOD);

  const group = new THREE.Group();
  const mesh = new THREE.Mesh(g.toGeometry(0.125, [w / 2, 1.2, len / 2]), voxelModelMaterial());
  mesh.castShadow = true;
  group.add(mesh);
  return group;
}
