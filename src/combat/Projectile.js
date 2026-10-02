// Things that fly: arrows, magic bolts and exploding orbs.

import * as THREE from 'three';
import { VoxelGrid, voxelModelMaterial } from '../models/VoxelGrid.js';
import { isSolidBlock } from '../entities/physics.js';

const LIFETIME = 3; // seconds before a projectile disappears on its own

const MODELS = {
  // Same cube size as characters and weapons (0.0625).
  arrow: () => {
    const g = new VoxelGrid(3, 3, 13).box(1, 1, 2, 1, 1, 9, 0x8a5a32).box(1, 1, 11, 1, 1, 2, 0xd5dbe3);
    g.box(0, 1, 0, 3, 1, 3, 0xf2eee2).box(1, 0, 0, 1, 3, 3, 0xdc4b4b); // fletching
    return new THREE.Mesh(g.toGeometry(0.0625, [1.5, 1.5, 6.5]), voxelModelMaterial());
  },
  bolt: () => glowCube(0.35, 0x8fe8ff),
  orb: () => glowCube(0.6, 0xff9a4a),
};

function glowCube(size, color) {
  return new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshBasicMaterial({ color }));
}

export class Projectile {
  // opts: { origin, direction, speed, gravity, radius, model, damage, team, knockback, pierce, explodeRadius, crit, owner }
  constructor(scene, opts) {
    Object.assign(this, opts);
    this.scene = scene;
    this.position = opts.origin.clone();
    this.velocity = opts.direction.clone().normalize().multiplyScalar(opts.speed);
    this.age = 0;
    this.alive = true;
    this.hitTargets = new Set(); // piercing arrows hit each target only once
    this.mesh = MODELS[opts.model]();
    scene.add(this.mesh);
    this.sync();
  }

  // Moves the projectile; calls onHit(target) for each target it touches.
  update(dt, world, targets, onHit, onExplode) {
    this.age += dt;
    this.velocity.y -= this.gravity * dt;
    const step = this.velocity.clone().multiplyScalar(dt);
    // Move in small steps so fast arrows can't skip through thin walls or enemies.
    const steps = Math.max(1, Math.ceil(step.length() / 0.4));
    step.divideScalar(steps);
    for (let i = 0; i < steps && this.alive; i++) {
      this.position.add(step);
      for (const target of targets) {
        if (!target.alive || this.hitTargets.has(target) || !touches(this, target)) continue;
        this.hitTargets.add(target);
        if (this.explodeRadius) {
          onExplode(this);
          return this.destroy();
        }
        onHit(this, target);
        if (!this.pierce) return this.destroy();
      }
      if (isSolidBlock(world.getBlock(this.position.x, this.position.y, this.position.z))) {
        if (this.explodeRadius) onExplode(this);
        return this.destroy();
      }
    }
    if (this.age > LIFETIME) this.destroy();
    else this.sync();
  }

  sync() {
    this.mesh.position.copy(this.position);
    // Point along the flight direction.
    this.mesh.lookAt(this.position.clone().add(this.velocity));
    if (this.model !== 'arrow') this.mesh.rotation.z += this.age * 8; // magic spins
  }

  destroy() {
    this.alive = false;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    if (this.model !== 'arrow') this.mesh.material.dispose(); // arrows share one material
  }
}

// Does the projectile overlap the target's body?
function touches(projectile, target) {
  const p = projectile.position;
  const t = target.position;
  if (p.y < t.y - projectile.radius || p.y > t.y + target.height + projectile.radius) return false;
  return Math.hypot(p.x - t.x, p.z - t.z) < target.halfWidth + projectile.radius;
}
