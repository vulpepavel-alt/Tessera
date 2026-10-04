// The referee of every fight: works out who gets hit, how hard, critical
// hits, knockback, dodges, floating damage numbers and the tiny "hit-stop"
// freeze that makes blows feel heavy.
//
// Anything that can be hit ("a combatant") has: position (feet), height,
// halfWidth, health, alive, team ('player' or 'enemy'), and optionally
// invincible and receiveHit(info).

import { levelGapFactor } from '../data/progression.js';
import * as THREE from 'three';
import { COMBAT } from '../data/combat.js';
import { Projectile } from './Projectile.js';

const tmp = new THREE.Vector3();

export class CombatSystem {
  constructor(scene, world, labels) {
    this.scene = scene;
    this.world = world;
    this.labels = labels;
    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.hitStop = 0;
    this.listeners = {};
    // Hooks set by the skill system: damage multipliers and extra effects.
    this.modifiers = {
      outgoing: () => 1,          // (attacker, target) -> damage multiplier
      incoming: () => 1,          // (target) -> damage multiplier
      critBonus: () => 0,         // (attacker) -> extra crit chance (may be used up)
      extraEffects: () => null,   // (attacker) -> effects added to every hit (e.g. poison)
    };
  }

  on(event, fn) {
    (this.listeners[event] ??= []).push(fn);
  }

  emit(event, data) {
    for (const fn of this.listeners[event] ?? []) fn(data);
  }

  // Everyone the given team can hurt.
  targetsOf(team) {
    return team === 'player' ? this.enemies : this.player ? [this.player] : [];
  }

  // A melee blow: hits every opposing target in front of `attacker` within
  // `range` and inside an `arc` (degrees) around `facing` (radians).
  melee({ attacker, facing, range, arc, damage, knockback, critChance = 0, heavy = false, finisher = false, basic = false, effects = null }) {
    const half = THREE.MathUtils.degToRad(arc) / 2;
    const hits = [];
    for (const target of this.targetsOf(attacker.team)) {
      if (!target.alive) continue;
      const dx = target.position.x - attacker.position.x;
      const dz = target.position.z - attacker.position.z;
      const reach = Math.hypot(dx, dz) - target.halfWidth;
      const dy = target.position.y - attacker.position.y;
      if (reach > range || dy > attacker.height + 0.5 || dy < -target.height - 0.5) continue;
      let angle = Math.atan2(dx, dz) - facing;
      angle = Math.atan2(Math.sin(angle), Math.cos(angle));
      if (Math.abs(angle) > half && reach > 0.6) continue; // very close targets always get hit
      // The number pops up where the blade meets the target (its side facing you).
      const at = new THREE.Vector3(-dx, 0, -dz).normalize().multiplyScalar(target.halfWidth)
        .add(target.position).setY(target.position.y + target.height * 0.65);
      this.hit(target, { attacker, damage, knockback, critChance, heavy, finisher, basic, effects, at, from: attacker.position });
      hits.push(target);
    }
    return hits;
  }

  shoot(opts) {
    this.projectiles.push(new Projectile(this.scene, opts));
  }

  // Apply one hit. Returns the damage dealt (0 if dodged).
  // effects: { stun: seconds, slow: { factor, duration }, poison: { dps, duration } }
  // at: where the blow landed (damage numbers appear there); defaults to above the target.
  hit(target, { attacker, damage, knockback = 0, critChance = 0, heavy = false, finisher = false, basic = false, from, at = null, effects = null }) {
    if (!target.alive) return 0;
    const top = at ? tmp.copy(at) : tmp.copy(target.position).setY(target.position.y + target.height * 0.8);
    if (target.invincible) {
      this.labels.number(top, target.team === 'player' ? 'Dodged!' : 'Immune', 'info');
      return 0;
    }
    const m = this.modifiers;
    const crit = Math.random() < critChance + m.critBonus(attacker);
    const scaled = damage * m.outgoing(attacker, target) * m.incoming(target) * levelGapFactor(attacker, target);
    const amount = Math.max(1, Math.round(scaled * (crit ? COMBAT.critMultiplier : 1)));
    target.health = Math.max(0, target.health - amount);

    // Push the target away from where the hit came from.
    const push = new THREE.Vector3(target.position.x - from.x, 0, target.position.z - from.z);
    if (push.lengthSq() < 0.0001) push.set(0, 0, 1);
    push.normalize().multiplyScalar(knockback * (crit ? 1.3 : 1));
    target.receiveHit?.({ amount, crit, push, attacker, heavy, finisher });
    const extra = m.extraEffects(attacker);
    if (effects || extra) target.applyStatus?.({ ...extra, ...effects });

    const style = target.team === 'player' ? 'player' : crit ? 'crit' : 'damage';
    this.labels.number(top, crit ? `${amount}!` : String(amount), style);
    if (attacker?.team === 'player') this.hitStop = Math.max(this.hitStop, heavy ? COMBAT.heavyHitStop : finisher ? COMBAT.finisherHitStop : COMBAT.hitStop);
    this.emit('hit', { target, attacker, amount, crit, heavy, finisher, basic });
    if (target.health <= 0) {
      target.alive = target.team === 'player'; // the player is handled by the Game (respawn)
      this.emit('killed', { target, attacker });
    }
    return amount;
  }

  // Damage every opposing target within `radius` of `center` (skills use this).
  area({ attacker, center, radius, damage, knockback = 0, critChance = 0, effects = null }) {
    let hits = 0;
    for (const target of this.targetsOf(attacker.team)) {
      if (!target.alive) continue;
      const d = tmp.copy(target.position).setY(target.position.y + target.height / 2).distanceTo(center);
      if (d > radius + target.halfWidth) continue;
      this.hit(target, { attacker, damage, knockback, critChance, heavy: true, from: center, effects });
      hits++;
    }
    return hits;
  }

  // Area damage around a point (exploding orbs).
  explode(projectile) {
    const r = projectile.explodeRadius;
    for (const target of this.targetsOf(projectile.team)) {
      if (!target.alive) continue;
      const d = tmp.copy(target.position).setY(target.position.y + target.height / 2).distanceTo(projectile.position);
      if (d > r) continue;
      this.hit(target, { attacker: projectile.owner, damage: projectile.damage, knockback: projectile.knockback,
        critChance: projectile.critChance, heavy: true, from: projectile.position, effects: projectile.effects });
    }
  }

  update(dt) {
    for (const p of this.projectiles) {
      p.update(dt, this.world, this.targetsOf(p.team),
        (proj, target) => this.hit(target, { attacker: proj.owner, damage: proj.damage, knockback: proj.knockback,
          critChance: proj.critChance, heavy: proj.heavy, finisher: proj.finisher, basic: proj.basic, at: proj.position.clone(),
          from: proj.position.clone().sub(proj.velocity), effects: proj.effects }),
        (proj) => this.explode(proj));
    }
    // Voxel trails make the path of arrows and spells easy to read.
    for (const p of this.projectiles) if (p.alive) this.onTrail?.(p);
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }
}
