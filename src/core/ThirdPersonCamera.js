// The camera behind the player. The mouse orbits it around the character,
// the scroll wheel zooms in and out. If a hill or a wall gets between the
// camera and the player, the camera slides closer so you never lose sight
// of your character.

import * as THREE from 'three';
import { CAMERA } from '../data/world.js';
import { isSolidBlock } from '../entities/physics.js';

const MIN_PITCH = -0.6;  // looking up from below
const MAX_PITCH = 1.35;  // looking down from above
const WALL_GAP = 0.3;    // keep this far from walls

export class ThirdPersonCamera {
  constructor(camera, input, world) {
    this.camera = camera;
    this.input = input;
    this.world = world;
    this.yaw = 0;
    this.pitch = 0.2; // only a little from above: the world feels big around you
    this.distance = CAMERA.distance;      // wanted distance (zoom)
    this.actualDistance = CAMERA.distance; // after pulling in for walls
    this.sensitivity = 1;
    this.target = new THREE.Vector3();
    this.offset = new THREE.Vector3();
    this.lockTarget = null; // an enemy to keep in view (Tab lock-on)
    this.shake = 0;         // screen shake strength, fades by itself
    this.inCombat = false;  // set by the battle: pulls the camera back so foes stay in view
    this.combatExtra = 0;
  }

  update(dt, playerPosition) {
    const mouse = this.input.takeMouseMovement();
    if (this.input.locked) {
      const k = CAMERA.mouseSensitivity * this.sensitivity;
      this.yaw -= mouse.x * k;
      this.pitch = THREE.MathUtils.clamp(this.pitch + mouse.y * k, MIN_PITCH, MAX_PITCH);
    }
    // Locked on: swing the camera round so the enemy is in front of the player.
    const t = this.lockTarget;
    if (t?.alive) {
      const want = Math.atan2(-(t.position.x - playerPosition.x), -(t.position.z - playerPosition.z));
      let diff = want - this.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.yaw += diff * Math.min(dt * 6, 1);
    }

    const wheel = this.input.takeWheel();
    if (wheel) {
      this.distance = THREE.MathUtils.clamp(this.distance * (1 + wheel * 0.12), CAMERA.minDistance, CAMERA.maxDistance);
    }

    // Follow the player smoothly (a little damping, never far behind).
    this.goal ??= new THREE.Vector3().copy(playerPosition);
    this.goal.set(playerPosition.x, playerPosition.y + CAMERA.height, playerPosition.z);
    if (this.target.lengthSq() === 0 || this.target.distanceTo(this.goal) > 6) this.target.copy(this.goal);
    else this.target.lerp(this.goal, Math.min(1, dt * CAMERA.follow));
    const cosP = Math.cos(this.pitch);
    this.offset.set(Math.sin(this.yaw) * cosP, Math.sin(this.pitch), Math.cos(this.yaw) * cosP);

    // Pull in instantly when blocked, ease back out when free again.
    // In a fight, ease back a little so you and the enemies both fit in the frame.
    this.combatExtra += ((this.inCombat ? CAMERA.combatPullBack : 0) - this.combatExtra) * Math.min(1, dt * 2);
    const free = this.freeDistance(this.distance + this.combatExtra);
    if (free < this.actualDistance) this.actualDistance = free;
    else this.actualDistance += (free - this.actualDistance) * Math.min(dt * 4, 1);

    this.camera.position.copy(this.target).addScaledVector(this.offset, this.actualDistance);
    this.camera.lookAt(this.target);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * 0.15;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
    }
  }

  // How far the camera can go back along its line before touching a block.
  freeDistance(wanted) {
    const step = 0.2;
    const p = new THREE.Vector3();
    for (let d = step; d <= wanted; d += step) {
      p.copy(this.target).addScaledVector(this.offset, d);
      if (isSolidBlock(this.world.getBlock(p.x, p.y, p.z))) return Math.max(0.6, d - WALL_GAP);
    }
    return wanted;
  }
}
