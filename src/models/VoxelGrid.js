// A small 3D "drawing" made of coloured cubes, used for characters, enemies,
// items and so on. You fill cubes with colours, then turn it into a shape
// (geometry) the graphics card can draw. Sides hidden between two cubes are
// skipped, just like in the world mesher.

import * as THREE from 'three';
import { addFaceShading } from '../world/faceShading.js';

// The 6 sides of a cube: direction and 4 corners (counter-clockwise from outside).
// Corner brightness by how open the corner is (see cornerAO).
const AO_BRIGHTNESS = [0.5, 0.68, 0.85, 1.0];
const VOXEL_GRAIN = 0.08; // +-4% brightness per cube

// A fixed pseudo-random number 0..1 for a cube position (same every time).
function voxelNoise(x, y, z) {
  let h = Math.imul(x + 374761, 668265263) ^ Math.imul(y + 9001, 2246822519) ^ Math.imul(z + 4217, 3266489917);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const FACES = [
  { dir: [-1, 0, 0], corners: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]] },
  { dir: [1, 0, 0], corners: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]] },
  { dir: [0, -1, 0], corners: [[1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0]] },
  { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]] },
  { dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [1, 1, 0], [0, 1, 0]] },
  { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]] },
];

export class VoxelGrid {
  constructor(sizeX, sizeY, sizeZ) {
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.sizeZ = sizeZ;
    this.colors = new Array(sizeX * sizeY * sizeZ).fill(null); // null = empty
  }

  index(x, y, z) {
    return x + this.sizeX * (z + this.sizeZ * y);
  }

  inside(x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < this.sizeX && y < this.sizeY && z < this.sizeZ;
  }

  get(x, y, z) {
    return this.inside(x, y, z) ? this.colors[this.index(x, y, z)] : null;
  }

  // color: a hex number like 0xff8800, or null to erase.
  set(x, y, z, color) {
    if (this.inside(x, y, z)) this.colors[this.index(x, y, z)] = color;
    return this;
  }

  // Fill a box of w x h x d cubes starting at (x, y, z).
  box(x, y, z, w, h, d, color) {
    for (let dy = 0; dy < h; dy++) {
      for (let dz = 0; dz < d; dz++) {
        for (let dx = 0; dx < w; dx++) this.set(x + dx, y + dy, z + dz, color);
      }
    }
    return this;
  }

  // Ambient occlusion for one corner of a face: how many of the 3 cubes
  // around that corner (just in front of the face) are filled. 3 = open,
  // 0 = a deep nook. Darker corners make every cube and crease easy to read.
  cornerAO(fx, fy, fz, dir, corner) {
    const axis = dir[0] !== 0 ? 0 : dir[1] !== 0 ? 1 : 2;
    const [a, b] = [0, 1, 2].filter((k) => k !== axis);
    const p = [fx, fy, fz];
    const step = (k) => (corner[k] ? 1 : -1);
    const filled = (da, db) => {
      const q = [...p];
      q[a] += da;
      q[b] += db;
      return this.get(q[0], q[1], q[2]) !== null ? 1 : 0;
    };
    const s1 = filled(step(a), 0);
    const s2 = filled(0, step(b));
    if (s1 && s2) return 0;
    return 3 - (s1 + s2 + filled(step(a), step(b)));
  }

  // Turn the drawing into geometry. `pivot` (in cubes) becomes the point (0,0,0),
  // which is where the part rotates around (a shoulder, a hip...).
  toGeometry(voxelSize, pivot = [0, 0, 0]) {
    const positions = [];
    const normals = [];
    const colors = [];
    const indices = [];
    const color = new THREE.Color();

    for (let y = 0; y < this.sizeY; y++) {
      for (let z = 0; z < this.sizeZ; z++) {
        for (let x = 0; x < this.sizeX; x++) {
          const hex = this.get(x, y, z);
          if (hex === null) continue;
          color.setHex(hex); // converts to the renderer's colour space
          // Each cube is a touch lighter or darker than its neighbours, so big
          // areas of one colour read as many little cubes (the voxel look).
          const grain = 1 + (voxelNoise(x, y, z) - 0.5) * VOXEL_GRAIN;
          for (const face of FACES) {
            const [nx, ny, nz] = face.dir;
            if (this.get(x + nx, y + ny, z + nz) !== null) continue;
            const start = positions.length / 3;
            const ao = [];
            for (const corner of face.corners) {
              const [cx, cy, cz] = corner;
              positions.push(
                (x + cx - pivot[0]) * voxelSize,
                (y + cy - pivot[1]) * voxelSize,
                (z + cz - pivot[2]) * voxelSize
              );
              normals.push(nx, ny, nz);
              const level = this.cornerAO(x + nx, y + ny, z + nz, face.dir, corner);
              ao.push(level);
              const k = AO_BRIGHTNESS[level] * grain;
              colors.push(color.r * k, color.g * k, color.b * k);
            }
            // Split the square along the diagonal that keeps the shading smooth.
            // (Same rule as the world mesher.)
            if (ao[0] + ao[3] > ao[1] + ao[2]) indices.push(start, start + 1, start + 3, start, start + 3, start + 2);
            else indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
          }
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    return geometry;
  }
}

// One shared material for all voxel models: colours come from the cubes themselves.
let sharedMaterial = null;
export function voxelModelMaterial() {
  sharedMaterial ??= addFaceShading(new THREE.MeshLambertMaterial({ vertexColors: true }));
  return sharedMaterial;
}
