// Voxel models for creatures and enemies. Each enemy gets its own material
// copy, so it can flash white when hit or glow red while winding up an attack.

import * as THREE from 'three';
import { addFaceShading } from '../world/faceShading.js';
import { VoxelGrid } from './VoxelGrid.js';

const V = 0.1; // one model cube = 0.1 world units

// Returns { root, body, parts, material }. Parts are groups that rotate at a joint.
export function buildCreature(type) {
  const material = addFaceShading(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x000000 }));
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const parts = BUILDERS[type](body, material);
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { root, body, parts, material };
}

function part(parent, grid, pivot, position, material) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  group.add(new THREE.Mesh(grid.toGeometry(V, pivot), material));
  parent.add(group);
  return group;
}

const BUILDERS = {
  // A stocky boar with a mossy, thorny back and pale tusks. Faces +Z.
  bramblehog(body, material) {
    const FUR = 0x7a4e32;
    const BELLY = 0x9a6a48;
    const MOSS = 0x5f7d3a;
    const THORN = 0xc9b27a;
    const SNOUT = 0xc68e72;
    const TUSK = 0xf0e6c8;
    const HOOF = 0x3a2a20;

    const torso = new VoxelGrid(10, 8, 14)
      .box(0, 0, 0, 10, 7, 14, FUR)
      .box(1, 0, 1, 8, 1, 12, BELLY)
      .box(1, 6, 1, 8, 1, 12, MOSS);
    // Thorns sticking out of the back in two rows.
    for (let z = 2; z < 13; z += 3) {
      torso.set(3, 7, z, THORN).set(6, 7, z + 1, THORN);
    }
    const parts = {};
    parts.torso = part(body, torso, [5, 0, 7], [0, 0.4, 0], material);

    const head = new VoxelGrid(8, 7, 7)
      .box(0, 0, 0, 8, 7, 6, FUR)
      .box(2, 1, 5, 4, 3, 2, SNOUT)                     // snout
      .set(3, 2, 6, HOOF).set(4, 2, 6, HOOF)          // nostrils
      .box(1, 4, 5, 1, 1, 1, 0x1a1010).box(6, 4, 5, 1, 1, 1, 0x1a1010) // eyes
      .box(0, 6, 1, 2, 1, 2, FUR).box(6, 6, 1, 2, 1, 2, FUR)           // ears
      .set(1, 0, 6, TUSK).set(1, 1, 6, TUSK).set(6, 0, 6, TUSK).set(6, 1, 6, TUSK);
    parts.head = part(parts.torso, head, [4, 2, 0], [0, 0.3, 0.65], material);

    const leg = () => new VoxelGrid(3, 4, 3).box(0, 1, 0, 3, 3, 3, FUR).box(0, 0, 0, 3, 1, 3, HOOF);
    parts.legFL = part(body, leg(), [1.5, 4, 1.5], [-0.32, 0.45, 0.45], material);
    parts.legFR = part(body, leg(), [1.5, 4, 1.5], [0.32, 0.45, 0.45], material);
    parts.legBL = part(body, leg(), [1.5, 4, 1.5], [-0.32, 0.45, -0.45], material);
    parts.legBR = part(body, leg(), [1.5, 4, 1.5], [0.32, 0.45, -0.45], material);
    return parts;
  },
};

// Simple four-legged animation: trot, wind-up shiver, charge lean, death tip-over.
export function animateQuadruped(model, state, time, dt) {
  const { parts, body } = model;
  const k = Math.min(dt * 14, 1);
  const stride = Math.min(state.speed / 4, 1.4);
  const s = Math.sin(time * (6 + state.speed * 1.2)) * 0.7 * stride;
  // Diagonal legs move together.
  parts.legFL.rotation.x += (s - parts.legFL.rotation.x) * k;
  parts.legBR.rotation.x += (s - parts.legBR.rotation.x) * k;
  parts.legFR.rotation.x += (-s - parts.legFR.rotation.x) * k;
  parts.legBL.rotation.x += (-s - parts.legBL.rotation.x) * k;
  parts.head.rotation.x = Math.sin(time * 3) * 0.05 + (state.windup ? 0.35 : 0);

  let lean = 0;
  let y = Math.abs(Math.sin(time * (6 + state.speed))) * 0.03 * stride;
  if (state.windup) {
    lean = 0.15; // head down, ready to charge
    body.position.x = Math.sin(time * 60) * 0.03; // shiver
  } else {
    body.position.x = 0;
  }
  if (state.charging) lean = 0.25;
  if (state.dead) {
    body.rotation.z += (Math.PI / 2 - body.rotation.z) * Math.min(dt * 6, 1);
    y = 0;
  }
  body.rotation.x += (lean - body.rotation.x) * k;
  body.position.y = y;
}
