// The player's skills (1, 2) and ultimate (R) for the chosen specialization,
// plus the combo counter, buffs (stronger, tougher, faster...), traps and
// effects that last a while (arrow rain, flurries).

import * as THREE from 'three';
import { SPEC_SKILLS, ULTIMATE, COMBO } from '../data/skills.js';
import { CLASS_COMBAT } from '../data/combat.js';
import { EFFECTS } from './skillEffects.js';
import { isSolidBlock } from '../entities/physics.js';

export class SkillSystem {
  constructor({ player, combat, playerCombat, particles, labels, camera, cameraRig, world }) {
    Object.assign(this, { player, combat, playerCombat, particles, labels, camera, cameraRig, world });
    this.cooldowns = { s1: 0, s2: 0 };
    this.buffs = [];       // { stat, value, time }
    this.traps = [];
    this.repeating = [];   // timed actions (rain, flurry, meteor)
    this.motion = null;    // a dash or leap in progress
    this.combo = 0;
    this.comboTimer = 0;
    this.lastAimYaw = 0;
    player.ultCharge ??= 0;
    this.installModifiers();
  }

  get spec() {
    return SPEC_SKILLS[this.player.spec];
  }

  skill(slot) {
    return this.spec[slot];
  }

  // Teach the combat referee about combos and buffs.
  installModifiers() {
    const m = this.combat.modifiers;
    m.outgoing = (attacker) => (attacker === this.player ? this.damageMultiplier() : 1);
    m.incoming = (target) => (target === this.player ? this.buffValue('damageTaken', 1, 'min') : 1);
    m.critBonus = (attacker) => {
      if (attacker !== this.player || !this.hasBuff('critNext')) return 0;
      this.removeBuff('critNext'); // used up by this hit
      return 1;
    };
    m.extraEffects = (attacker) => (attacker === this.player && this.hasBuff('poisonHits')
      ? { poison: { dps: this.buffValue('poisonHits', 0, 'max'), duration: 4 } } : null);
  }

  damageMultiplier() {
    const combo = 1 + Math.min(this.combo * COMBO.bonusPerHit, COMBO.maxBonus);
    return combo * this.buffValue('damage', 1, 'max');
  }

  // Called for every hit you land.
  onHitDealt(amount) {
    this.combo++;
    this.comboTimer = COMBO.window;
    this.player.ultCharge = Math.min(ULTIMATE.chargeNeeded, this.player.ultCharge + amount * ULTIMATE.chargePerDamage);
    const steal = this.buffValue('lifesteal', 0, 'max');
    if (steal > 0) this.player.health = Math.min(this.player.maxHealth, this.player.health + amount * steal);
  }

  // --- buffs ----------------------------------------------------------
  addBuff(stat, value, duration) {
    this.removeBuff(stat);
    this.buffs.push({ stat, value, time: duration });
  }

  removeBuff(stat) {
    this.buffs = this.buffs.filter((b) => b.stat !== stat);
  }

  hasBuff(stat) {
    return this.buffs.some((b) => b.stat === stat);
  }

  buffValue(stat, fallback, pick) {
    const list = this.buffs.filter((b) => b.stat === stat).map((b) => b.value);
    if (list.length === 0) return fallback;
    return pick === 'min' ? Math.min(...list) : Math.max(...list);
  }

  // --- using skills ---------------------------------------------------
  update(dt, input, canAct) {
    for (const k of Object.keys(this.cooldowns)) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;
    for (const b of this.buffs) b.time -= dt;
    this.buffs = this.buffs.filter((b) => b.time > 0);

    // Buffs that change the player directly.
    const p = this.player;
    p.stealthed = this.hasBuff('stealth');
    p.skillInvulnerable = this.hasBuff('invulnerable');
    p.speedBonus = this.buffValue('speed', 1, 'max');
    this.playerCombat.haste = this.buffValue('haste', 1, 'max');
    if (p.stealthed !== this.wasStealthed) {
      this.wasStealthed = p.stealthed;
      setOpacityLook(p.model.root, p.stealthed);
    }

    if (canAct) {
      if (input.wasPressed('Digit1')) this.use('s1');
      if (input.wasPressed('Digit2')) this.use('s2');
      if (input.wasPressed('KeyR')) this.use('ult');
    }
    this.updateMotion(dt);
    this.updateRepeating(dt);
    this.updateTraps(dt);
  }

  // Can this slot be used right now? Returns a reason string if not.
  blocked(slot) {
    const s = this.skill(slot);
    if (slot === 'ult') return this.player.ultCharge < ULTIMATE.chargeNeeded ? 'Ultimate not charged yet' : null;
    if (this.cooldowns[slot] > 0) return 'Not ready yet';
    if (this.player.resource < s.cost) return `Not enough ${this.player.classInfo.resource.name.toLowerCase()}`;
    return null;
  }

  use(slot) {
    const why = this.blocked(slot);
    if (why) {
      this.player.emit('message', why);
      return;
    }
    const s = this.skill(slot);
    if (slot === 'ult') this.player.ultCharge = 0;
    else {
      this.player.resource -= s.cost;
      this.cooldowns[slot] = s.cooldown;
    }
    const ctx = this.context();
    for (const e of s.effects) EFFECTS[e.kind](e, ctx);
    this.player.attackPose = null;
    this.playerCombat.showSkillPose(s);
    this.player.emit('skill', { name: s.name });
  }

  context() {
    const pc = this.playerCombat;
    const aimYaw = pc.aimYaw();
    this.lastAimYaw = aimYaw;
    const aimPoint = this.aimPoint();
    return {
      player: this.player, combat: this.combat, skills: this, particles: this.particles, labels: this.labels,
      target: this.aimTarget(), aimYaw, aimPoint, aimPointFixed: aimPoint.clone(),
      aimDirection: (origin) => pc.aimDirection(origin),
      critChance: CLASS_COMBAT[this.player.classId].critChance,
    };
  }

  // The living enemy closest to the crosshair (within 25 blocks), for skills
  // that need a target (e.g. appearing behind it). There is no lock-on.
  aimTarget() {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0.16), this.camera);
    let best = null;
    let bestScore = Infinity;
    const p = new THREE.Vector3();
    for (const e of this.combat.enemies) {
      if (!e.alive) continue;
      p.copy(e.position).setY(e.position.y + e.height * 0.5);
      const dist = p.distanceTo(this.player.position);
      if (dist > 25) continue;
      const off = ray.ray.distanceToPoint(p);
      if (off > 2.5 + dist * 0.08) continue;
      if (off + dist * 0.05 < bestScore) {
        bestScore = off + dist * 0.05;
        best = e;
      }
    }
    return best;
  }

  // Where on the ground the skill lands: where the crosshair meets the ground.
  aimPoint() {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0.16), this.camera);
    const p = new THREE.Vector3();
    for (let d = this.camera.position.distanceTo(this.player.position); d < 40; d += 0.5) {
      ray.ray.at(d, p);
      if (isSolidBlock(this.world.getBlock(p.x, p.y, p.z))) return p.clone();
    }
    return this.player.position.clone().addScaledVector(new THREE.Vector3(Math.sin(this.lastAimYaw), 0, Math.cos(this.lastAimYaw)), 10);
  }

  // --- things that last a while ---------------------------------------
  startMotion(motion) {
    this.motion = { ...motion, hit: new Set() };
  }

  updateMotion(dt) {
    const m = this.motion;
    if (!m) return;
    const p = this.player;
    m.time -= dt;
    p.velocity.x = m.dir.x * m.speed;
    p.velocity.z = m.dir.z * m.speed;
    if (m.hitDamage) {
      for (const e of this.combat.enemies) {
        if (!e.alive || m.hit.has(e) || e.position.distanceTo(p.position) > 1.8) continue;
        m.hit.add(e);
        this.combat.hit(e, { attacker: p, damage: m.hitDamage, knockback: 4, from: p.position, effects: m.stun ? { stun: m.stun } : null });
      }
    }
    const landed = m.keepVertical && m.time < 0.55 && p.grounded;
    if (m.time <= 0 || landed) {
      this.motion = null;
      // Stop the rush crisply instead of sliding on.
      p.velocity.x *= 0.15;
      p.velocity.z *= 0.15;
      m.onLand?.();
    }
  }

  startRepeating({ times, every, action }) {
    this.repeating.push({ left: times, every, timer: every, action });
  }

  updateRepeating(dt) {
    for (const r of this.repeating) {
      r.timer -= dt;
      if (r.timer <= 0 && r.left > 0) {
        r.timer = r.every;
        r.left--;
        r.action();
      }
    }
    this.repeating = this.repeating.filter((r) => r.left > 0);
  }

  placeTrap(trap) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(trap.radius * 1.2, 0.15, trap.radius * 1.2),
      new THREE.MeshLambertMaterial({ color: 0x5a7a2a }));
    mesh.position.copy(trap.position).setY(trap.position.y + 0.08);
    this.particles.scene.add(mesh);
    this.traps.push({ ...trap, mesh, life: trap.lifetime });
  }

  updateTraps(dt) {
    for (const t of this.traps) {
      t.life -= dt;
      const caught = this.combat.enemies.filter((e) => e.alive && e.position.distanceTo(t.position) < t.radius);
      if (caught.length) {
        for (const e of caught) {
          this.combat.hit(e, { attacker: this.player, damage: t.damage, knockback: 0, from: t.position, effects: { root: t.root } });
        }
        this.particles.burst('dust', t.position.clone().setY(t.position.y + 0.3));
        t.life = 0;
      }
      if (t.life <= 0) {
        this.particles.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
      }
    }
    this.traps = this.traps.filter((t) => t.life > 0);
  }

  shake(amount) {
    this.cameraRig.shake = Math.max(this.cameraRig.shake, amount);
  }

  // Hotbar info: 0..1 cooldown fractions, usable flags, ultimate charge.
  hotbarState() {
    const s1 = this.skill('s1');
    const s2 = this.skill('s2');
    return {
      s1: { cooldown: s1.cooldown ? this.cooldowns.s1 / s1.cooldown : 0, usable: this.player.resource >= s1.cost },
      s2: { cooldown: s2.cooldown ? this.cooldowns.s2 / s2.cooldown : 0, usable: this.player.resource >= s2.cost },
      ult: { charge: this.player.ultCharge / ULTIMATE.chargeNeeded },
      combo: this.combo,
    };
  }
}

// A stealthed player turns see-through.
function setOpacityLook(root, ghost) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (ghost && !o.userData.ghost) {
      o.userData.ghost = o.material;
      o.material = o.material.clone();
      o.material.transparent = true;
      o.material.opacity = 0.35;
    } else if (!ghost && o.userData.ghost) {
      o.material.dispose();
      o.material = o.userData.ghost;
      delete o.userData.ghost;
    }
  });
}
