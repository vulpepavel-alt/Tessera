// The player's attacks: left click = basic attack (a 3-hit combo),
// right click = heavy attack. Melee classes strike in front of them, ranged
// classes fire projectiles toward the crosshair (or the locked-on target).
// Also handles the class resource (rage / energy / mana) and health regen.

import * as THREE from 'three';
import { COMBAT, CLASS_COMBAT, WEAPON_COMBAT } from '../data/combat.js';
import { ITEMS } from '../data/items.js';
import { Sfx } from '../audio/Sfx.js';

const AIM_NDC = new THREE.Vector2(0, 0.16); // the crosshair sits a bit above screen centre
const raycaster = new THREE.Raycaster();

export class PlayerCombat {
  constructor(player, combat, camera) {
    this.player = player;
    this.combat = combat;
    this.camera = camera;
    this.data = CLASS_COMBAT[player.classId];
    this.setWeapon(player.equipment?.mainHand);
    this.current = null;      // the attack in progress: { heavy, index, time, duration, struck, aim }
    this.comboIndex = 0;
    this.comboTimer = 0;      // time left to continue the combo
    this.heavyCooldown = 0;
    this.sinceCombat = 99;    // seconds since the last hit given or taken
    this.haste = 1;        // attack speed multiplier (skills can raise it)
    this.skillPose = null; // a short arm pose after using a skill
  }

  // The basic and heavy attacks come from the weapon in the main hand
  // (bare fists when there is none); stronger weapons multiply the damage.
  setWeapon(itemId) {
    const item = ITEMS[itemId];
    const profile = WEAPON_COMBAT[item?.kind] ?? WEAPON_COMBAT.fists;
    this.power = item?.power ?? 1;
    this.attacks = { basic: profile.basic, heavy: { ...profile.heavy, cost: this.data.heavyCost } };
    this.current = null;
  }

  // Raise the arms briefly when a skill is used (cast, swing...).
  showSkillPose(skill) {
    const kind = this.attacks.basic.kind === 'swing' || this.attacks.basic.kind === 'thrust' ? 'heavy' : 'cast';
    this.skillPose = { kind, time: 0, duration: 0.45 };
  }

  canAttack() {
    const p = this.player;
    return p.alive && p.mode === 'walk' && p.roll.time < 0;
  }

  update(dt, input) {
    const p = this.player;
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    this.heavyCooldown = Math.max(0, this.heavyCooldown - dt);
    this.sinceCombat += dt;
    this.sinceAttack = (this.sinceAttack ?? 99) + dt;

    // Dodging always wins: a roll cancels whatever attack was in progress.
    if (this.current && p.roll.time >= 0) this.cancel();
    if (this.current) this.advance(dt * this.haste);
    if (this.skillPose) {
      this.skillPose.time += dt;
      if (this.skillPose.time >= this.skillPose.duration) this.skillPose = null;
    }
    if (!this.current && this.canAttack()) {
      if (input.wasPressed('Mouse2')) this.startHeavy();
      else if (input.isDown('Mouse0')) this.startBasic(); // hold to keep attacking
    }

    const c = this.current;
    p.attackPose = c
      ? { kind: c.attack.kind, t: c.time / c.duration, index: c.index, strikeAt: c.attack.strikeAt, finisher: c.finisher, heavy: c.heavy }
      : this.skillPose ? { kind: this.skillPose.kind, t: this.skillPose.time / this.skillPose.duration, index: 0 } : null;
    p.faceOverride = c ? c.aimYaw : null;
    // You can move while attacking, but slowly while winding up and striking
    // (the blow has weight), a little faster while recovering.
    p.attackMove = !c ? 1 : c.struck ? COMBAT.moveWhileRecovering : COMBAT.moveWhileStriking;
    this.updateResources(dt);
  }

  startBasic() {
    if (this.comboTimer === 0) this.comboIndex = 0;
    const basic = this.attacks.basic;
    const index = this.comboIndex;
    // The last hit of the combo is a finisher: harder, with more knockback and stagger.
    const finisher = index === basic.damage.length - 1;
    this.begin({ attack: basic, heavy: false, index, finisher, duration: basic.duration[index] });
    this.comboIndex = (index + 1) % basic.damage.length;
  }

  startHeavy() {
    const heavy = this.attacks.heavy;
    const p = this.player;
    if (this.heavyCooldown > 0) return;
    if (p.resource < heavy.cost) {
      p.emit('message', `Not enough ${p.classInfo.resource.name.toLowerCase()}`);
      return;
    }
    p.resource -= heavy.cost;
    this.heavyCooldown = heavy.cooldown;
    this.comboIndex = 0;
    this.begin({ attack: heavy, heavy: true, index: 0, duration: heavy.duration });
  }

  begin(attack) {
    this.sinceAttack = 0;
    this.current = { ...attack, time: 0, struck: false, aimYaw: this.aimYaw() };
    const kind = attack.attack.kind;
    if (kind === 'swing' || kind === 'thrust' || kind === 'heavy') Sfx.swing(attack.heavy || attack.finisher);
  }

  // Stop the current attack at once (dodge roll, stun...). The combo resets.
  cancel() {
    this.current = null;
    this.comboTimer = 0;
    this.comboIndex = 0;
  }

  advance(dt) {
    const c = this.current;
    c.time += dt;
    c.aimYaw = this.aimYaw(); // keep turning toward the aim until the blow lands
    if (!c.struck && c.time >= c.duration * c.attack.strikeAt) {
      c.struck = true;
      this.strike(c);
    }
    if (c.heavy && c.attack.dash && !c.struck) {
      // Shade's lunge: dash forward during the wind-up.
      const v = this.player.velocity;
      v.x = Math.sin(c.aimYaw) * c.attack.dash;
      v.z = Math.cos(c.aimYaw) * c.attack.dash;
    }
    if (c.time >= c.duration) {
      this.current = null;
      if (!c.heavy) this.comboTimer = COMBAT.comboWindow;
    }
  }

  strike(c) {
    const p = this.player;
    const a = c.attack;
    const damage = Math.round((c.heavy ? a.damage : a.damage[c.index]) * this.power);
    const knockback = c.heavy ? a.knockback : a.knockback[c.index];
    const critChance = this.data.critChance;

    // Melee blows carry you forward a little: they feel heavy and connect.
    if (!a.projectile && !a.dash) {
      const step = (c.heavy || c.finisher ? COMBAT.lungeHeavy : COMBAT.lunge);
      p.velocity.x += Math.sin(c.aimYaw) * step;
      p.velocity.z += Math.cos(c.aimYaw) * step;
    }
    if (a.projectile) {
      if (a.kind === 'cast') Sfx.cast();
      else Sfx.shoot();
      const origin = p.position.clone().add(new THREE.Vector3(Math.sin(c.aimYaw) * 0.5, 1.25, Math.cos(c.aimYaw) * 0.5));
      this.combat.shoot({
        ...a.projectile,
        origin, direction: this.aimDirection(origin), damage, knockback, critChance,
        team: 'player', owner: p, heavy: c.heavy, finisher: c.finisher,
      });
    } else {
      this.combat.melee({
        attacker: p, facing: c.aimYaw, range: a.range, arc: a.arc, damage, knockback, critChance, heavy: c.heavy, finisher: c.finisher,
      });
    }
    p.emit('attack', { heavy: c.heavy, kind: a.kind });
  }

  // Which way to face: where the camera looks (there is no target lock: you aim).
  aimYaw() {
    const dir = this.camera.getWorldDirection(new THREE.Vector3());
    return Math.atan2(dir.x, dir.z);
  }

  // A 3D direction from `origin` toward the crosshair.
  aimDirection(origin) {
    raycaster.setFromCamera(AIM_NDC, this.camera);
    const aimPoint = raycaster.ray.at(this.camera.position.distanceTo(origin) + 30, new THREE.Vector3());
    return aimPoint.sub(origin);
  }

  // Rage builds when hitting and being hit; the Game calls these for every hit.
  onHitDealt() {
    this.sinceCombat = 0;
    const r = this.data.resource;
    this.player.resource = Math.min(this.player.resourceMax, this.player.resource + r.onHitDealt);
  }

  onHitTaken() {
    this.sinceCombat = 0;
    const r = this.data.resource;
    this.player.resource = Math.min(this.player.resourceMax, this.player.resource + r.onHitTaken);
  }

  updateResources(dt) {
    const p = this.player;
    const r = this.data.resource;
    if (r.regen) p.resource = Math.min(p.resourceMax, p.resource + r.regen * dt);
    if (r.decay && this.sinceCombat > COMBAT.outOfCombatTime) p.resource = Math.max(0, p.resource - r.decay * dt);
    if (this.sinceCombat > COMBAT.outOfCombatTime && p.health > 0) {
      p.health = Math.min(p.maxHealth, p.health + p.maxHealth * COMBAT.healthRegen * dt);
    }
  }
}
