// Fluffy voxel clouds drifting overhead with the wind. Each cloud is a pile
// of white boxes: a wide flat base with rounded bumps on top, like cotton.
// They live in a big square around the camera; a cloud that drifts out one
// side comes back on the other, so the sky never runs out.

import * as THREE from 'three';
import { addFaceShading } from './faceShading.js';
import { mulberry32 } from './random.js';

const COUNT = 26;          // clouds
const PIECES = 14;         // boxes per cloud
const AREA = 760;          // size of the square they drift in
const HEIGHT = [112, 140]; // between these heights (above the tallest mountains)
const WIND = new THREE.Vector2(3.2, 1.1); // voxels per second

export class SkyClouds {
  constructor(scene) {
    this.material = addFaceShading(new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x6a7a90, fog: false })); // crisp white, never hazed
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.material, COUNT * PIECES);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    const rng = mulberry32(1234);
    this.clouds = [];
    for (let i = 0; i < COUNT; i++) {
      // Huge, like mountains of cotton floating over the land.
      const w = 56 + rng() * 60;
      const d = 36 + rng() * 34;
      const parts = [[0, 0, 0, w, 7, d], [(rng() - 0.5) * w * 0.3, -2, (rng() - 0.5) * d * 0.3, w * 0.7, 4, d * 0.7]]; // flat base
      // Bumps on top: a big one in the middle and smaller ones around it.
      for (let k = 2; k < PIECES; k++) {
        const t = k / PIECES;
        const size = (1 - t * 0.6) * Math.min(w, d) * (0.45 + rng() * 0.3);
        parts.push([
          (rng() - 0.5) * (w - size) * 0.9, 3 + size * 0.4 * (1 - t) + rng() * 3, (rng() - 0.5) * (d - size) * 0.7,
          size * (1.1 + rng() * 0.4), size * 0.7, size,
        ]);
      }
      this.clouds.push({ x: rng() * AREA, z: rng() * AREA, y: HEIGHT[0] + rng() * (HEIGHT[1] - HEIGHT[0]), parts });
    }
    this.offset = new THREE.Vector2();
    this.matrix = new THREE.Matrix4();
  }

  // brightness: 1 by day, lower at night.
  update(dt, camera, brightness) {
    this.offset.addScaledVector(WIND, dt);
    this.material.color.setScalar(brightness);
    this.material.emissive.setRGB(0.42, 0.48, 0.56).multiplyScalar(brightness);
    const cx = camera.position.x - AREA / 2;
    const cz = camera.position.z - AREA / 2;
    let n = 0;
    for (const c of this.clouds) {
      // Position inside the square that follows the camera, wrapping around.
      const x = cx + mod(c.x + this.offset.x - cx, AREA);
      const z = cz + mod(c.z + this.offset.y - cz, AREA);
      for (const [ox, oy, oz, w, h, d] of c.parts) {
        this.matrix.makeScale(w, h, d).setPosition(x + ox, c.y + oy, z + oz);
        this.mesh.setMatrixAt(n++, this.matrix);
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

function mod(a, m) {
  return ((a % m) + m) % m;
}
