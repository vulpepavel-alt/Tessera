// A small rowing boat. Press B next to water to put it in and climb aboard,
// press B again to step out. W/S row forward and back, A/D turn.
// The boat only moves over water: it bumps to a stop at the shore.

import * as THREE from 'three';
import { PLAYER } from '../data/player.js';
import { buildBoat } from '../models/travelModels.js';
import { isLiquidBlock, isSolidBlock } from './physics.js';

const HULL_FRONT = 1.2; // how far the bow reaches ahead of the centre
const HULL_SIDE = 0.55;

export class Boat {
  constructor(scene, world, x, surfaceY, z, heading) {
    this.scene = scene;
    this.world = world;
    this.position = new THREE.Vector3(x, surfaceY, z);
    this.heading = heading; // radians, 0 = +Z
    this.speed = 0;
    this.time = 0;
    this.model = buildBoat();
    scene.add(this.model);
    this.syncModel();
  }

  // The water surface height near (x, y, z), or null if there's no open water.
  static findSurface(world, x, y, z) {
    for (let yy = Math.floor(y) + 1; yy >= Math.floor(y) - 3; yy--) {
      const here = world.getBlock(x, yy, z);
      const above = world.getBlock(x, yy + 1, z);
      if (isLiquidBlock(here) && !isLiquidBlock(above) && !isSolidBlock(above)) return yy + 1;
    }
    return null;
  }

  update(dt, input, speedBonus = 1) {
    this.time += dt;
    const turn = (input.isDown('KeyA') ? 1 : 0) - (input.isDown('KeyD') ? 1 : 0);
    // Turning works better when moving, like a real boat.
    this.heading += turn * PLAYER.boatTurnSpeed * dt * (0.4 + 0.6 * Math.min(Math.abs(this.speed) / 4, 1));

    const forward = (input.isDown('KeyW') ? 1 : 0) - (input.isDown('KeyS') ? 1 : 0);
    const target = forward > 0 ? PLAYER.boatSpeed * speedBonus : forward < 0 ? -PLAYER.boatReverseSpeed : 0;
    const accel = PLAYER.boatAcceleration * dt;
    this.speed += THREE.MathUtils.clamp(target - this.speed, -accel, accel);

    // Try to move; stop if the front of the hull would leave the water.
    const dx = Math.sin(this.heading) * this.speed * dt;
    const dz = Math.cos(this.heading) * this.speed * dt;
    const nx = this.position.x + dx;
    const nz = this.position.z + dz;
    if (this.floatsAt(nx, nz, Math.sign(this.speed) || 1)) {
      this.position.x = nx;
      this.position.z = nz;
    } else {
      this.speed *= -0.2; // a gentle bump off the shore
    }
    this.syncModel();
  }

  // If the bow points at the shore, turn to the nearest direction with open water.
  pointToOpenWater() {
    const start = this.heading;
    for (let step = 0; step <= 8; step++) {
      const angle = start + Math.ceil(step / 2) * (step % 2 ? 1 : -1) * (Math.PI / 4);
      this.heading = angle;
      const ahead = 1;
      if (this.floatsAt(this.position.x + Math.sin(angle) * ahead, this.position.z + Math.cos(angle) * ahead, 1)) {
        this.syncModel();
        return;
      }
    }
    this.heading = start;
  }

  // Is there water under the centre and under the bow (or stern when reversing)?
  floatsAt(x, z, direction) {
    const sin = Math.sin(this.heading);
    const cos = Math.cos(this.heading);
    const points = [
      [x, z],
      [x + sin * HULL_FRONT * direction + cos * HULL_SIDE, z + cos * HULL_FRONT * direction - sin * HULL_SIDE],
      [x + sin * HULL_FRONT * direction - cos * HULL_SIDE, z + cos * HULL_FRONT * direction + sin * HULL_SIDE],
    ];
    const y = this.position.y;
    return points.every(([px, pz]) =>
      isLiquidBlock(this.world.getBlock(px, y - 1, pz)) && !isSolidBlock(this.world.getBlock(px, y, pz)));
  }

  syncModel() {
    const bob = Math.sin(this.time * 2.2) * 0.04;
    this.model.position.set(this.position.x, this.position.y - 0.12 + bob, this.position.z);
    this.model.rotation.y = this.heading;
    this.model.rotation.z = Math.sin(this.time * 1.7) * 0.03;
  }

  // Where the rider sits (feet position).
  seatPosition(out) {
    return out.set(this.position.x, this.position.y - 0.05, this.position.z);
  }

  remove() {
    this.scene.remove(this.model);
    this.model.traverse((o) => o.geometry?.dispose());
  }
}
