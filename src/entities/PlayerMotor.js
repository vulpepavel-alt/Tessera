// How the player moves, in five "modes" (controls like the classic game):
//
//   walk  - on the ground or in the air: you always run, Shift walks; jump, dodge roll
//   swim  - in deep water (free); Space swims up, C dives
//   climb - walk into a wall to climb it, automatically (uses stamina)
//   glide - press G in the air to open the glider; G again (or landing) closes it
//   boat  - press G next to water to place your boat; G again to step out
//
// Each frame the motor picks the right mode, changes the velocity, and moves
// the body through the world with collisions.

import * as THREE from 'three';
import { PLAYER } from '../data/player.js';
import { moveBody, isLiquidBlock, isSolidBlock } from './physics.js';
import { Boat } from './Boat.js';

const tmp = new THREE.Vector3();

const CLIMB_AFTER_FRAMES = 8; // about 0.13 s pushing against a wall starts a climb

export class PlayerMotor {
  constructor(player, scene) {
    this.p = player;
    this.scene = scene;
    this.mode = 'walk';
    this.climbDir = new THREE.Vector3();
    this.boat = null;
    this.hit = { x: false, y: false, z: false, ground: false };
  }

  update(dt, input, cameraYaw, wish) {
    const p = this.p;
    // G: the special item - the glider in the air, the boat at the water.
    if (input.wasPressed('KeyG')) this.useSpecialItem();
    if (this.mode === 'boat') return this.updateBoat(dt, input);

    if (this.mode === 'walk') this.walk(dt, input, wish);
    else if (this.mode === 'swim') this.swim(dt, input, wish);
    else if (this.mode === 'climb') this.climb(dt, input, cameraYaw);
    else if (this.mode === 'glide') this.glide(dt, input, cameraYaw);

    // Move with collisions. Swimmers may step out onto a 1-block bank.
    p.canStep = this.mode === 'swim';
    p.stepped = false;
    const fallSpeed = -p.velocity.y;
    const wasGrounded = p.grounded;
    const wasInWater = p.inWater;
    const hit = moveBody(p, tmp.copy(p.velocity).multiplyScalar(dt), p.world, PLAYER.stepHeight);
    if (hit.y) p.velocity.y = 0;
    if (hit.x) p.velocity.x = 0;
    if (hit.z) p.velocity.z = 0;
    p.grounded = hit.ground;
    this.hit = hit;

    this.updateWater();
    if (hit.ground && !wasGrounded && fallSpeed > 9 && !p.inWater) p.emit('land', { speed: fallSpeed });
    if (p.inWater && !wasInWater && fallSpeed > 4) p.emit('splash');
    this.chooseMode(input, wish);
  }

  // Switch modes based on what just happened.
  chooseMode(input, wish) {
    const p = this.p;
    if (p.submerged && this.mode !== 'swim') {
      this.mode = 'swim';
      return;
    }
    if (this.mode === 'swim' && !p.submerged) this.mode = 'walk';
    if (this.mode === 'glide' && (p.grounded || p.inWater)) this.mode = 'walk';

    // Walking into a wall (taller than a step) for a moment starts climbing,
    // the classic way: no button needed (Ctrl starts it at once).
    const blocked = (this.hit.x || this.hit.z) && wish.lengthSq() > 0;
    this.pushing = blocked ? (this.pushing ?? 0) + 1 : 0;
    const ctrl = input.isDown('ControlLeft') || input.isDown('ControlRight');
    const wantsClimb = ctrl || this.pushing >= CLIMB_AFTER_FRAMES;
    if (wantsClimb && blocked && (this.mode === 'walk' || this.mode === 'glide') && p.roll.time < 0 && p.stamina > 5) {
      const dir = axisToward(wish);
      if (this.wallAt(dir, 1.2)) {
        this.climbDir.copy(dir);
        this.mode = 'climb';
        p.velocity.set(0, 0, 0);
      }
    }
  }

  // --- walk -----------------------------------------------------------
  walk(dt, input, wish) {
    const p = this.p;
    const v = p.velocity;
    p.updateRoll(dt, input, wish);
    if (p.roll.time >= 0) {
      v.x = p.roll.dir.x * PLAYER.rollSpeed;
      v.z = p.roll.dir.z * PLAYER.rollSpeed;
    } else {
      let speed = (p.walking ? PLAYER.walkSpeed : PLAYER.runSpeed) * p.speedBonus * (p.attackMove ?? 1) * (p.mount ? PLAYER.mountSpeed * p.bonus.ride : 1);
      if (p.inWater) speed *= PLAYER.waterSpeedFactor;
      accelerate(v, wish, speed, (p.grounded ? PLAYER.groundAcceleration : PLAYER.airAcceleration) * dt);
    }
    v.y = Math.max(v.y - PLAYER.gravity * dt, -PLAYER.maxFallSpeed);

    if (input.wasPressed('Space') && p.grounded && p.roll.time < 0) v.y = PLAYER.jumpVelocity;
  }

  // --- swim -----------------------------------------------------------
  swim(dt, input, wish) {
    const p = this.p;
    const v = p.velocity;
    const speed = PLAYER.swimSpeed * p.bonus.swim;
    accelerate(v, wish, speed, 20 * dt);

    // Float at the surface; Space swims up, C dives.
    let targetVy = p.headUnderwater ? 2 : 0;
    if (input.isDown('Space')) targetVy = PLAYER.swimUpSpeed;
    if (input.isDown('KeyC')) targetVy = -PLAYER.swimUpSpeed;
    v.y += (targetVy - v.y) * Math.min(dt * 6, 1);
  }

  // --- climb ----------------------------------------------------------
  climb(dt, input, cameraYaw) {
    const p = this.p;
    const v = p.velocity;
    const dir = this.climbDir;
    if (input.wasPressed('Space')) {
      // Kick off the wall.
      v.set(-dir.x * 5, 7, -dir.z * 5);
      this.mode = 'walk';
      return;
    }
    if (p.stamina <= 0) {
      v.set(-dir.x * 2, 0, -dir.z * 2);
      this.mode = 'walk';
      p.emit('message', 'Too tired to hold on!');
      return;
    }
    // Reaching the top: once the chest is above the edge, pull up until the
    // feet clear it too, then step forward onto the top.
    if (!this.wallAt(dir, 1.2)) {
      if (this.wallAt(dir, 0.05)) {
        v.set(dir.x * 0.5, PLAYER.mantleBoost * 0.6, dir.z * 0.5);
      } else {
        v.set(dir.x * 3.5, 2, dir.z * 3.5);
        this.mode = 'walk';
      }
      return;
    }
    const up = (input.isDown('KeyW') ? 1 : 0) - (input.isDown('KeyS') ? 1 : 0);
    // Sideways along the wall, relative to the camera.
    const side = (input.isDown('KeyD') ? 1 : 0) - (input.isDown('KeyA') ? 1 : 0);
    const camRight = tmp.set(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    const lateral = new THREE.Vector3(-dir.z, 0, dir.x);
    const sideSign = Math.sign(lateral.dot(camRight)) || 1;
    const speed = PLAYER.climbSpeed * p.bonus.climb;
    v.set(dir.x * 1.5 + lateral.x * side * sideSign * speed * 0.7, up * speed,
      dir.z * 1.5 + lateral.z * side * sideSign * speed * 0.7);
    if (up !== 0 || side !== 0) p.drainStamina(PLAYER.climbCost * dt);
    else p.drainStamina(PLAYER.climbCost * 0.3 * dt); // hanging still is tiring too
    if (p.grounded && up < 0) this.mode = 'walk';
  }

  // --- glide ----------------------------------------------------------
  glide(dt, input, cameraYaw) {
    const p = this.p;
    const v = p.velocity;
    let speed = PLAYER.glideSpeed;
    if (input.isDown('KeyW')) speed = PLAYER.glideFastSpeed;
    if (input.isDown('KeyS')) speed = PLAYER.glideSlowSpeed;
    speed *= p.bonus.glide;
    // Fly where the camera looks.
    const hx = -Math.sin(cameraYaw) * speed;
    const hz = -Math.cos(cameraYaw) * speed;
    const k = Math.min(dt * 1.6, 1);
    v.x += (hx - v.x) * k;
    v.z += (hz - v.z) * k;
    // Sink slowly; if falling fast when opening, the glider brakes the fall.
    if (v.y < -PLAYER.glideSink) v.y += (-PLAYER.glideSink - v.y) * Math.min(dt * 3, 1);
    else v.y = Math.max(v.y - PLAYER.gravity * 0.25 * dt, -PLAYER.glideSink);
  }

  // --- G: glider or boat ---------------------------------------------
  useSpecialItem() {
    const p = this.p;
    if (this.mode === 'glide') {
      this.mode = 'walk';
      return;
    }
    if (this.mode === 'walk' && !p.grounded && !p.inWater) {
      if (this.heightAboveGround() >= PLAYER.glideMinHeight) this.mode = 'glide';
      return;
    }
    this.toggleBoat();
  }

  // --- boat -----------------------------------------------------------
  toggleBoat() {
    const p = this.p;
    if (this.mode === 'boat') return this.leaveBoat();
    if (this.mode === 'climb' || this.mode === 'glide') return;
    // Look for open water under you or up to 3 blocks ahead.
    const fx = Math.sin(p.facing);
    const fz = Math.cos(p.facing);
    for (let d = 0; d <= 3; d++) {
      const x = p.position.x + fx * d;
      const z = p.position.z + fz * d;
      const surface = Boat.findSurface(p.world, x, p.position.y, z);
      if (surface !== null) {
        this.boat = new Boat(this.scene, p.world, x, surface, z, p.facing);
        this.boat.pointToOpenWater();
        this.mode = 'boat';
        p.velocity.set(0, 0, 0);
        return;
      }
    }
    p.emit('message', 'You need open water to place your boat.');
  }

  leaveBoat() {
    const p = this.p;
    const b = this.boat;
    // Step onto land next to the boat if there is any, otherwise into the water.
    let spot = null;
    for (let a = 0; a < 8 && !spot; a++) {
      const angle = b.heading + (a / 8) * Math.PI * 2;
      for (const d of [1.5, 2.5]) {
        const x = b.position.x + Math.sin(angle) * d;
        const z = b.position.z + Math.cos(angle) * d;
        for (let y = b.position.y; y <= b.position.y + 1; y++) {
          if (isSolidBlock(p.world.getBlock(x, y - 1, z)) && !isSolidBlock(p.world.getBlock(x, y, z))
            && !isSolidBlock(p.world.getBlock(x, y + 1, z))) {
            spot = { x, y, z };
            break;
          }
        }
        if (spot) break;
      }
    }
    if (spot) p.placeAt(spot.x, spot.y, spot.z);
    else p.position.set(b.position.x, b.position.y - 0.5, b.position.z);
    p.velocity.set(0, 0, 0);
    b.remove();
    this.boat = null;
    this.mode = 'walk';
  }

  updateBoat(dt, input) {
    const p = this.p;
    this.boat.update(dt, input, p.bonus.boat);
    this.boat.seatPosition(p.position);
    p.facing = this.boat.heading;
    p.grounded = true;
    p.velocity.set(Math.sin(p.facing) * this.boat.speed, 0, Math.cos(p.facing) * this.boat.speed);
  }

  // --- helpers --------------------------------------------------------
  updateWater() {
    const p = this.p;
    const at = (h) => isLiquidBlock(p.world.getBlock(p.position.x, p.position.y + h, p.position.z));
    p.inWater = at(0.3);
    p.submerged = at(0.9);       // deep enough to swim
    p.headUnderwater = at(1.35);
  }

  // Is there a solid block right in front (direction dir) at this height above the feet?
  wallAt(dir, height) {
    const p = this.p;
    const reach = p.halfWidth + 0.2;
    return isSolidBlock(p.world.getBlock(p.position.x + dir.x * reach, p.position.y + height, p.position.z + dir.z * reach));
  }

  heightAboveGround() {
    const p = this.p;
    for (let d = 0; d < 6; d++) {
      if (isSolidBlock(p.world.getBlock(p.position.x, p.position.y - d - 0.01, p.position.z))) return d;
    }
    return 6;
  }
}

// Change velocity v toward wish * speed, by at most maxChange.
function accelerate(v, wish, speed, maxChange) {
  const dx = wish.x * speed - v.x;
  const dz = wish.z * speed - v.z;
  const len = Math.hypot(dx, dz);
  const f = len > maxChange ? maxChange / len : 1;
  v.x += dx * f;
  v.z += dz * f;
}

// The main axis (x or z) of a direction, e.g. (0.8, 0, 0.3) -> (1, 0, 0).
function axisToward(wish) {
  return Math.abs(wish.x) > Math.abs(wish.z)
    ? new THREE.Vector3(Math.sign(wish.x), 0, 0)
    : new THREE.Vector3(0, 0, Math.sign(wish.z));
}
