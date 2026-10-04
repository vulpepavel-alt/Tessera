// A villager going about their day.
//
//   - by day: stroll between the square, their home and the fields, pausing now and then
//   - vendors stay at their market stall; guards walk around the square, day and night
//   - at night: walk home and go inside (they disappear until morning)
//   - when you come close: stop, turn to face you, and listen

import * as THREE from 'three';
import { buildVillager } from '../models/villagerModel.js';
import { CharacterAnimator } from './CharacterAnimator.js';
import { moveBody } from './physics.js';

const GRAVITY = 30;
const ATTEND_DISTANCE = 3.2; // stop and face you within this distance

const WELL_CLEARANCE = 2.4; // villagers keep this far from the middle of the well

export class Villager {
  constructor(scene, world, resident, village) {
    this.scene = scene;
    this.world = world;
    this.village = village;
    this.name = resident.name;
    this.role = resident.role;
    this.title = resident.title ?? null;
    this.home = resident.home;
    this.post = resident.post ?? null;

    this.halfWidth = 0.3;
    this.height = 1.7;
    const start = this.post ?? this.randomSpot(Math.random);
    this.position = new THREE.Vector3(start.x, village.baseY + 1, start.z);
    this.velocity = new THREE.Vector3();
    this.facing = Math.random() * Math.PI * 2;
    this.grounded = false;
    this.target = null;
    this.wait = Math.random() * 3;
    this.stuck = 0;
    this.inside = false;
    this.attending = false;
    this.lineIndex = 0;

    this.model = buildVillager(resident.look, this.role);
    this.animator = new CharacterAnimator(this.model);
    scene.add(this.model.root);
  }

  get displayName() {
    return this.title ? `${this.name} · ${this.title}` : this.name;
  }

  // A place to stroll to: somewhere on the square, near home, or by a field.
  randomSpot(rand = Math.random) {
    const v = this.village;
    const r = rand();
    if (r < 0.55) {
      const p = v.plaza;
      // Anywhere on the square except right by the well.
      for (let tries = 0; tries < 8; tries++) {
        const spot = { x: p.x0 + 1 + rand() * (p.x1 - p.x0 - 2), z: p.z0 + 4 + rand() * (p.z1 - p.z0 - 5) };
        if (this.wellDistance(spot) > WELL_CLEARANCE + 0.5) return spot;
      }
      return { x: this.home.x, z: this.home.z };
    }
    if (r < 0.8 || v.fields.length === 0) return { x: this.home.x + (rand() - 0.5) * 3, z: this.home.z + (rand() - 0.5) * 3 };
    const f = v.fields[Math.floor(rand() * v.fields.length)];
    return { x: f.x1 + 2.5, z: (f.z0 + f.z1) / 2 + 0.5 };
  }

  update(dt, player, isNight) {
    const goesHome = isNight && this.role !== 'guard';
    if (this.inside) {
      if (!goesHome) this.leaveHome();
      return;
    }

    const toPlayer = new THREE.Vector3(player.position.x - this.position.x, 0, player.position.z - this.position.z);
    this.attending = toPlayer.length() < ATTEND_DISTANCE && player.alive;
    let wish = null;

    if (this.attending) {
      this.facing = turnToward(this.facing, Math.atan2(toPlayer.x, toPlayer.z), dt * 6);
    } else if (goesHome) {
      // Walk home; anyone held up for too long slips inside anyway.
      this.homeward = (this.homeward ?? 0) + dt;
      wish = this.steer(this.home, 0.6);
      if (!wish || this.homeward > 30) this.enterHome();
    } else if (this.post) {
      wish = this.steer(this.post, 0.4);
      if (!wish) this.facing = turnToward(this.facing, 0, dt * 4); // face the customers (+Z)
    } else {
      this.wait -= dt;
      if (!this.target && this.wait <= 0) this.target = this.randomSpot();
      if (this.target) {
        wish = this.steer(this.target, 0.6);
        if (!wish) {
          this.target = null;
          this.wait = 2 + Math.random() * 5;
        }
      }
    }

    this.move(dt, wish);
    this.sync(dt);
  }

  // Direction toward `spot`, or null once there.
  steer(spot, reach) {
    const d = new THREE.Vector3(spot.x - this.position.x, 0, spot.z - this.position.z);
    return d.length() < reach ? null : d.normalize();
  }

  // Horizontal distance from a point to the middle of the well (the village centre).
  wellDistance(p) {
    const c = this.village.center;
    return Math.hypot(p.x - (c.x + 0.5), p.z - (c.z + 0.5));
  }

  move(dt, wish) {
    const c = this.village.center;
    const toWell = { x: this.position.x - (c.x + 0.5), z: this.position.z - (c.z + 0.5) };
    const near = Math.hypot(toWell.x, toWell.z);
    // Walk around the well instead of hopping over its rim into the water.
    if (wish && near < WELL_CLEARANCE) {
      const push = (WELL_CLEARANCE - near) / WELL_CLEARANCE;
      wish = new THREE.Vector3(wish.x + (toWell.x / near) * push * 2, 0, wish.z + (toWell.z / near) * push * 2).normalize();
    }
    // Somehow fell in anyway? Climb back out onto the square.
    if (near < 1.2 && this.position.y < this.village.baseY + 1.5) {
      const out = near > 0.01 ? { x: toWell.x / near, z: toWell.z / near } : { x: 0, z: 1 };
      this.position.set(c.x + 0.5 + out.x * WELL_CLEARANCE, this.village.baseY + 1.05, c.z + 0.5 + out.z * WELL_CLEARANCE);
      this.velocity.set(0, 0, 0);
    }
    const v = this.velocity;
    const speed = this.role === 'guard' ? 2.6 : 2.2;
    const k = Math.min(dt * 8, 1);
    v.x += ((wish ? wish.x * speed : 0) - v.x) * k;
    v.z += ((wish ? wish.z * speed : 0) - v.z) * k;
    v.y = Math.max(v.y - GRAVITY * dt, -30);
    const before = this.position.clone();
    const hit = moveBody(this, v.clone().multiplyScalar(dt), this.world, 1);
    if (hit.y) v.y = 0;
    this.grounded = hit.ground;
    if (wish) {
      this.facing = turnToward(this.facing, Math.atan2(wish.x, wish.z), dt * 8);
      if ((hit.x || hit.z) && this.grounded) v.y = 7; // hop over small things
      // Not getting anywhere? Pick somewhere else to go.
      this.stuck = before.distanceTo(this.position) < 0.4 * dt ? this.stuck + dt : 0;
      if (this.stuck > 2) {
        this.stuck = 0;
        this.target = null;
        this.wait = 1;
      }
    }
    if (this.position.y < -6) this.position.set(this.home.x, this.village.baseY + 1, this.home.z);
  }

  enterHome() {
    this.inside = true;
    this.model.root.visible = false;
  }

  leaveHome() {
    this.inside = false;
    this.homeward = 0;
    this.model.root.visible = true;
    this.position.set(this.home.x, this.village.baseY + 1, this.home.z);
    this.wait = Math.random() * 4;
  }

  sync(dt) {
    const root = this.model.root;
    root.position.copy(this.position);
    root.rotation.y = this.facing;
    this.animator.update(dt, {
      mode: 'walk',
      speed: Math.hypot(this.velocity.x, this.velocity.z),
      grounded: this.grounded,
      rolling: -1,
    });
  }

  remove() {
    this.scene.remove(this.model.root);
    this.model.root.traverse((o) => o.geometry?.dispose());
  }
}

function turnToward(current, target, maxStep) {
  let diff = target - current;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  return current + Math.max(-maxStep, Math.min(maxStep, diff));
}
