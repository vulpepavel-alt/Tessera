// Everything about fighting during a play session, gathered in one place:
// the combat referee, the player's attacks, Tab lock-on, enemy spawning,
// floating labels, hit-stop, and what happens when you fall in battle.

import { CombatSystem } from '../combat/CombatSystem.js';
import { PlayerCombat } from '../combat/PlayerCombat.js';
import { TargetLock } from '../combat/TargetLock.js';
import { EnemySpawner } from '../entities/EnemySpawner.js';
import { WorldLabels } from '../ui/WorldLabels.js';
import { COMBAT } from '../data/combat.js';
import { SkillSystem } from '../combat/SkillSystem.js';

export class Battle {
  constructor({ engine, worldView, player, hud, cameraRig, particles }) {
    this.player = player;
    this.hud = hud;
    this.cameraRig = cameraRig;
    this.labels = new WorldLabels(engine.camera);
    this.labels.setVisible(false);
    this.combat = new CombatSystem(engine.scene, worldView.collision, this.labels);
    this.combat.player = player;
    this.playerCombat = new PlayerCombat(player, this.combat, engine.camera);
    this.lock = new TargetLock(engine.camera);
    this.spawner = new EnemySpawner(engine.scene, worldView, this.combat, this.labels);
    this.skills = new SkillSystem({
      player, combat: this.combat, playerCombat: this.playerCombat, particles, labels: this.labels,
      camera: engine.camera, cameraRig, world: worldView.collision,
    });
    this.deathTimer = -1;
    this.bindEvents();
  }

  bindEvents() {
    this.combat.on('hit', ({ target, attacker, amount, crit }) => {
      if (attacker === this.player) {
        this.playerCombat.onHitDealt();
        this.skills.onHitDealt(amount);
        if (crit) this.cameraRig.shake = Math.max(this.cameraRig.shake, 0.6);
      }
      if (target === this.player) {
        this.playerCombat.onHitTaken();
        this.cameraRig.shake = Math.max(this.cameraRig.shake, Math.min(1, amount / 15));
        this.hud.flashDamage();
      }
    });
    this.combat.on('killed', ({ target }) => {
      if (target !== this.player) this.hud.toast(`${target.name} defeated`);
    });
  }

  get dead() {
    return this.deathTimer >= 0;
  }

  // Tab pressed: lock on, switch target or release.
  toggleLock() {
    const t = this.lock.toggle(this.player, this.combat.enemies);
    if (!t) this.hud.toast('No target in range');
  }

  // dt: game time (0 while paused). Returns how much time the world should
  // advance this frame (0 during hit-stop).
  update(dt, input, isNight, playing) {
    if (!playing) return dt;
    // Hit-stop: a tiny freeze for impact. Everything holds still briefly.
    if (this.combat.hitStop > 0) {
      this.combat.hitStop = Math.max(0, this.combat.hitStop - dt);
      return 0;
    }
    if (!this.dead) this.playerCombat.update(dt, input);
    const p = this.player;
    this.skills.update(dt, input, !this.dead && p.mode === 'walk' && p.roll.time < 0);
    this.lock.update(this.player);
    // The camera widens while angry enemies are near.
    this.cameraRig.inCombat = this.combat.enemies.some((e) => e.alive && e.isAngry && e.position.distanceTo(p.position) < 18);
    // Weapons in hand while fighting; back on the back / hip a few seconds after.
    const pc = this.playerCombat;
    p.setWeaponsDrawn(Boolean(pc.current || pc.skillPose || pc.sinceAttack < 4 || pc.sinceCombat < 4));
    this.playerCombat.lockTarget = this.lock.target;
    this.cameraRig.lockTarget = this.lock.target;
    this.labels.lockTarget = this.lock.target;

    this.combat.update(dt);
    this.spawner.update(dt, this.player, isNight);
    this.updateDeath(dt);
    return dt;
  }

  updateDeath(dt) {
    const p = this.player;
    if (!this.dead && p.health <= 0) {
      this.deathTimer = 0;
      this.lock.target = null;
      this.skills.combo = 0;
      this.hud.showDeath(true);
      p.model.root.rotation.z = Math.PI / 2; // fall over
    }
    if (!this.dead) return;
    this.deathTimer += dt;
    if (this.deathTimer >= COMBAT.deathRespawnDelay) {
      // Wake up at the last safe spot with full health; enemies calm down.
      this.deathTimer = -1;
      p.health = p.maxHealth;
      p.model.root.rotation.z = 0;
      p.motor.mode = 'walk';
      p.placeAt(p.safePoint.x, p.safePoint.y + 0.2, p.safePoint.z);
      this.spawner.calmAll();
      this.hud.showDeath(false);
    }
  }
}
