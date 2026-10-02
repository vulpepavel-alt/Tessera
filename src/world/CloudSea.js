// The sea of clouds that fills the rifts (deep cracks in the land).
// Under solid ground it is hidden; you only see it where the land breaks open.
//
// Made of thousands of white boxes (one "instanced mesh", which lets the
// graphics card draw many copies of one shape in a single go) plus a large flat
// floor underneath. The whole layer follows the camera: when you move far
// enough, the puffs are rebuilt around you from the same noise, so the clouds
// stay in the same place in the world and never run out.

import * as THREE from 'three';
import { addFaceShading } from './faceShading.js';
import { ATMOSPHERE } from '../data/world.js';
import { makeNoise2D, fbm2, hash3 } from './random.js';

const CELL = 18;              // size of one cloud puff, in voxels
const GRID = 60;              // puffs per side (60 x 60 grid)
const REBUILD_STEP = CELL * 6; // rebuild after moving this far

export class CloudSea {
  constructor(scene, seed) {
    this.noise = makeNoise2D(seed, 'clouds');
    this.group = new THREE.Group();
    this.group.position.y = ATMOSPHERE.cloudY;
    scene.add(this.group);

    this.baseColor = new THREE.Color(ATMOSPHERE.cloudColor);
    const material = addFaceShading(new THREE.MeshLambertMaterial({ color: this.baseColor.clone() }));
    this.material = material;

    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), material);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -2;
    this.group.add(this.floor);

    this.puffs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, GRID * GRID * 2);
    this.puffs.frustumCulled = false; // it always surrounds the camera
    this.group.add(this.puffs);
    this.anchor = null;
  }

  // brightness: 1 by day, lower at night so the clouds don't glow in the dark.
  update(camera, elapsed, brightness = 1) {
    this.material.color.copy(this.baseColor).multiplyScalar(brightness);
    const ax = Math.round(camera.position.x / REBUILD_STEP) * REBUILD_STEP;
    const az = Math.round(camera.position.z / REBUILD_STEP) * REBUILD_STEP;
    if (!this.anchor || this.anchor.x !== ax || this.anchor.z !== az) {
      this.anchor = { x: ax, z: az };
      this.rebuild(ax, az);
    }
    this.floor.position.set(camera.position.x, -2, camera.position.z);
    // Gentle up-and-down "breathing" of the cloud layer.
    this.puffs.position.y = Math.sin(elapsed * 0.25) * 0.8;
  }

  // Place the puffs around world position (ax, az).
  rebuild(ax, az) {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const half = GRID / 2;
    const gx0 = Math.round(ax / CELL) - half;
    const gz0 = Math.round(az / CELL) - half;
    let count = 0;

    for (let gz = gz0; gz < gz0 + GRID; gz++) {
      for (let gx = gx0; gx < gx0 + GRID; gx++) {
        const wx = gx * CELL;
        const wz = gz * CELL;
        const density = fbm2(this.noise, wx, wz, 3, 0.006); // -1..1
        if (density < -0.15) continue; // a gap in the clouds

        const r = hash3(gx, 0, gz, 991);
        const r2 = hash3(gx, 1, gz, 991);
        const thickness = 3 + (density + 0.15) * 8 + r * 2; // kept low so clouds stay inside rifts
        position.set(wx + (r - 0.5) * 6, thickness / 2 - 1, wz + (r2 - 0.5) * 6);
        scale.set(CELL * (1 + r * 0.5), thickness, CELL * (1 + r2 * 0.5));
        matrix.compose(position, rotation, scale);
        this.puffs.setMatrixAt(count++, matrix);

        // Thick clouds get a smaller "cap" on top, which makes them look puffy.
        if (density > 0.15) {
          const cap = thickness * (0.3 + r2 * 0.3);
          position.y = thickness + cap / 2 - 2;
          scale.set(CELL * (0.55 + r2 * 0.3), cap, CELL * (0.55 + r * 0.3));
          matrix.compose(position, rotation, scale);
          this.puffs.setMatrixAt(count++, matrix);
        }
      }
    }
    this.puffs.count = count;
    this.puffs.instanceMatrix.needsUpdate = true;
  }
}
