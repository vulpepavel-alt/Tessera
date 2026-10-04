// A tamed animal that follows you around and helps in fights.
//   - walks after you, and runs to catch up when it falls behind
//   - when a monster is after you, it runs over and bites it (its damage
//     grows with YOUR level, so an old friend keeps up)
//   - it can't be hurt, and if it gets lost (stuck, far behind, fell) it
//     simply appears next to you again
// Tame one with a Pet Treat (key T next to an animal; see Game.tryTame).

import * as THREE from 'three';
import { buildCreature } from '../models/creatureModels.js';
import { moveBody } from './physics.js';
import { ENEMIES } from '../data/enemies.js';
import { CREATURES } from '../models/creatureModels.js';

// Animals big and sturdy enough to carry you (key X).
const RIDEABLE = new Set(['boar', 'wolf', 'horned', 'lizard', 'toad']);
const RIDE_SCALE = 1.35; // a ridden pet stands a bit taller, so you fit on it

const GRAVITY = 30;
export const PET = {
  followDistance: 2.6,  // stays about this far behind you
  catchUpDistance: 7,   // further than this: runs
  teleportDistance: 30, // further than this: appears next to you
  guardRange: 12,       // defends you against monsters this close to you
  biteRange: 1.3,
  biteCooldown: 1.1,
  baseDamage: 5,        // + 1.2 per player level
  treatPrice: 25,
};

export class Pet {
  constructor({ scene, world, combat, player, typeId, name }) {
    Object.assign(this, { scene, world, combat, player, typeId });
    const type = ENEMIES[typeId];
    this.name = name ?? type.name;
    this.team = 'player';
    this.alive = true;
    this.halfWidth = type.halfWidth;
    this.height = type.height;
    this.walkSpeed = type.walkSpeed * 1.3;
    this.runSpeed = Math.max(type.runSpeed, 8);
    this.position = player.position.clone().add(new THREE.Vector3(1.5, 0.2, 0));
    this.velocity = new THREE.Vector3();
    this.facing = player.facing ?? 0;
    this.grounded = false;
    this.biteTimer = 0;
    this.target = null;
    this.time = 0;
    this.stuck = 0;
    this.model = buildCreature(type.model);
    scene.add(this.model.root);
  }

  get rideable() {
    return RIDEABLE.has(CREATURES[ENEMIES[this.typeId].model]?.shape);
  }

  // How high you sit on its back.
  get saddleHeight() {
    return this.height * RIDE_SCALE * 0.62;
  }

  // Start / stop carrying the player.
  setRiding(on) {
    this.riding = on;
    this.model.root.scale.setScalar(on ? RIDE_SCALE : 1);
    if (!on) this.comeBack();
  }

  get level() {
    return this.player.level;
  }

  update(dt) {
    if (dt <= 0) return;
    this.time += dt;
    if (this.riding) {
      // Carrying you: it goes wherever you go.
      const p = this.player;
      this.position.copy(p.position);
      this.velocity.copy(p.velocity);
      this.facing = p.facing;
      this.syncModel(dt);
      return;
    }
    this.biteTimer = Math.max(0, this.biteTimer - dt);
    const p = this.player;
    const toPlayer = new THREE.Vector3(p.position.x - this.position.x, 0, p.position.z - this.position.z);
    const playerDist = toPlayer.length();

    // Lost? Pop back beside you.
    if (playerDist > PET.teleportDistance || this.position.y < p.position.y - 12 || this.stuck > 3) this.comeBack();

    // Defend: the nearest angry monster close to you.
    if (!this.target?.alive || this.target.position.distanceTo(p.position) > PET.guardRange + 4) {
      this.target = this.combat.enemies
        .filter((e) => e.alive && e.isAngry && e.position.distanceTo(p.position) < PET.guardRange)
        .sort((a, b) => a.position.distanceTo(this.position) - b.position.distanceTo(this.position))[0] ?? null;
    }

    let wish = null;
    let speed = 0;
    if (this.target) {
      const toFoe = new THREE.Vector3(this.target.position.x - this.position.x, 0, this.target.position.z - this.position.z);
      const reach = toFoe.length() - this.target.halfWidth - this.halfWidth;
      if (reach > PET.biteRange * 0.6) {
        wish = toFoe.normalize();
        speed = this.runSpeed;
      } else {
        this.facing = Math.atan2(toFoe.x, toFoe.z);
        if (this.biteTimer === 0) this.bite();
      }
    } else if (playerDist > PET.followDistance) {
      wish = toPlayer.normalize();
      speed = playerDist > PET.catchUpDistance ? this.runSpeed : this.walkSpeed;
    }
    this.move(dt, wish, speed);
    this.syncModel(dt);
  }

  bite() {
    this.biteTimer = PET.biteCooldown;
    this.lunge = 0.25;
    this.combat.melee({
      attacker: this, facing: this.facing, range: PET.biteRange + 0.4, arc: 120,
      damage: PET.baseDamage + this.player.level * 1.2, knockback: 4,
    });
  }

  move(dt, wish, speed) {
    const v = this.velocity;
    const k = Math.min(dt * 8, 1);
    v.x += ((wish ? wish.x * speed : 0) - v.x) * k;
    v.z += ((wish ? wish.z * speed : 0) - v.z) * k;
    v.y = Math.max(v.y - GRAVITY * dt, -30);
    const before = this.position.clone();
    const hit = moveBody(this, v.clone().multiplyScalar(dt), this.world, 1);
    if (hit.y) v.y = 0;
    this.grounded = hit.ground;
    if (wish) {
      this.facing = Math.atan2(wish.x, wish.z);
      if ((hit.x || hit.z) && this.grounded) v.y = 8; // hop over things
      this.stuck = before.distanceTo(this.position) < speed * dt * 0.15 ? this.stuck + dt : 0;
    } else this.stuck = 0;
  }

  comeBack() {
    const p = this.player;
    const side = new THREE.Vector3(Math.cos(p.facing ?? 0), 0, -Math.sin(p.facing ?? 0)).multiplyScalar(1.5);
    this.position.copy(p.position).add(side).setY(p.position.y + 0.3);
    this.velocity.set(0, 0, 0);
    this.stuck = 0;
  }

  syncModel(dt) {
    const { root } = this.model;
    root.position.copy(this.position);
    root.rotation.y = this.facing;
    this.lunge = Math.max(0, (this.lunge ?? 0) - dt);
    this.model.animate(this.model, {
      speed: Math.hypot(this.velocity.x, this.velocity.z),
      windup: false,
      charging: this.lunge > 0,
      dead: false,
    }, this.time, dt);
  }

  remove() {
    this.scene.remove(this.model.root);
    this.model.root.traverse((o) => o.geometry?.dispose());
    this.model.material.dispose();
  }
}
