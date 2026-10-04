// The player's attacks, the classic way:
//   left click   the weapon's normal attack: a short repeating combo (2 swings
//                one-handed, 3 two-handed, very fast stabs with daggers,
//                quick shots with bows and magic). Hold to keep attacking.
//   right click  the special attack: hold to charge it with MP (shown pink on
//                the MP bar), let go to strike. More MP = more damage and a
//                knock-down. Rogues strike at once with all their MP.
// Melee classes fill MP with normal hits; mages refill it all the time.
// You keep moving while you attack; a dodge roll cancels any attack.
// Ranged attacks fly toward the crosshair, or at the enemy locked with Tab.

import * as THREE from 'three';
import { COMBAT, SPECIAL, CLASS_COMBAT, WEAPON_COMBAT } from '../data/combat.js';
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
    this.current = null;      // the attack in progress: { attack, special, index, time, duration, struck, aimYaw, power }
    this.charge = null;       // a special attack being charged: { mp }
    this.comboIndex = 0;
    this.comboTimer = 0;      // time left to continue the combo
    this.sinceCombat = 99;    // seconds since the last hit given or taken
    this.sinceAttack = 99;
    this.haste = 1;           // attack speed multiplier (skills can raise it)
    this.skillPose = null;    // a short arm pose after using a skill
    this.lockTarget = null;   // the enemy locked on with Tab (or null)
  }

  // The attacks come from the weapon in the main hand (bare fists when there
  // is none); stronger weapons multiply the damage.
  setWeapon(itemId) {
    const item = ITEMS[itemId];
    const profile = WEAPON_COMBAT[item?.kind] ?? WEAPON_COMBAT.fists;
    this.power = item?.power ?? 1;
    this.attacks = profile;
    this.current = null;
    this.charge = null;
  }

  // MP committed to a special attack right now (for the HUD's pink bar).
  get chargedMp() {
    return this.charge?.mp ?? 0;
  }

  // Raise the arms briefly when a skill is used (cast, swing...).
  showSkillPose() {
    const kind = this.attacks.basic.kind === 'swing' || this.attacks.basic.kind === 'thrust' ? 'heavy' : 'cast';
    this.skillPose = { kind, time: 0, duration: 0.4 };
  }

  canAttack() {
    const p = this.player;
    return p.alive && p.mode === 'walk' && p.roll.time < 0;
  }

  update(dt, input) {
    const p = this.player;
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    this.sinceCombat += dt;
    this.sinceAttack += dt;

    // Dodging always wins: a roll cancels whatever attack was in progress.
    if ((this.current || this.charge) && p.roll.time >= 0) this.cancel();
    if (this.current) this.advance(dt * this.haste);
    if (this.charge) this.updateCharge(dt, input);
    if (this.skillPose) {
      this.skillPose.time += dt;
      if (this.skillPose.time >= this.skillPose.duration) this.skillPose = null;
    }
    if (!this.current && !this.charge && this.canAttack()) {
      if (input.wasPressed('Mouse2')) this.startSpecial();
      else if (input.isDown('Mouse0')) this.startBasic(); // hold to keep attacking
    }

    const c = this.current;
    if (c) {
      p.attackPose = { kind: c.attack.kind, t: c.time / c.duration, index: c.index, strikeAt: c.attack.strikeAt, finisher: c.finisher, heavy: c.special };
    } else if (this.charge) {
      // Hold the wind-up of the special attack while charging.
      const s = this.attacks.special;
      p.attackPose = { kind: s.kind, t: s.strikeAt * 0.9, index: 0, strikeAt: s.strikeAt, heavy: true };
    } else {
      p.attackPose = this.skillPose ? { kind: this.skillPose.kind, t: this.skillPose.time / this.skillPose.duration, index: 0 } : null;
    }
    p.faceOverride = c || this.charge ? this.aimYaw() : null;
    // You keep moving while attacking, a little slower while the blow lands.
    p.attackMove = this.charge ? COMBAT.moveWhileCharging : !c ? 1 : c.struck ? COMBAT.moveWhileRecovering : COMBAT.moveWhileStriking;
    this.updateResources(dt);
  }

  startBasic() {
    const basic = this.attacks.basic;
    const hits = basic.damage.length;
    if (this.comboTimer === 0) this.comboIndex = 0;
    const index = this.comboIndex % hits;
    // The last swing of a longer combo is a finisher (two-handed uppercut).
    const finisher = hits >= 3 && index === hits - 1;
    this.begin({ attack: basic, special: false, index, finisher, duration: basic.duration[index], power: 0 });
    this.comboIndex = (index + 1) % hits;
  }

  // Right click: rogues strike at once with all their MP; everyone else
  // starts charging (released in updateCharge).
  startSpecial() {
    const p = this.player;
    if (p.resource < SPECIAL.minMp) {
      p.emit('message', 'Not enough MP');
      return;
    }
    if (this.data.instantSpecial) {
      const mp = p.resource;
      p.resource = 0;
      this.releaseSpecial(mp);
    } else {
      this.charge = { mp: 0 };
    }
  }

  updateCharge(dt, input) {
    const p = this.player;
    const c = this.charge;
    c.mp = Math.min(p.resource, c.mp + SPECIAL.chargeRate * dt);
    const full = c.mp >= Math.min(p.resource, 100) - 0.01;
    if (!input.isDown('Mouse2') || full) {
      p.resource -= c.mp;
      this.charge = null;
      this.releaseSpecial(c.mp);
    }
  }

  releaseSpecial(mp) {
    const special = this.attacks.special;
    this.comboIndex = 0;
    this.begin({ attack: special, special: true, index: 0, finisher: false, duration: special.duration, power: Math.min(1, mp / 100) });
  }

  begin(attack) {
    this.sinceAttack = 0;
    this.current = { ...attack, time: 0, struck: false, aimYaw: this.aimYaw() };
    const kind = attack.attack.kind;
    if (kind === 'swing' || kind === 'thrust' || kind === 'heavy') Sfx.swing(attack.special || attack.finisher);
  }

  // Stop the current attack (and any charge) at once. The combo resets.
  cancel() {
    this.current = null;
    this.charge = null;
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
    if (c.special && c.attack.dash && !c.struck) {
      // Rogue lunge: dash forward during the wind-up.
      const v = this.player.velocity;
      v.x = Math.sin(c.aimYaw) * c.attack.dash;
      v.z = Math.cos(c.aimYaw) * c.attack.dash;
    }
    if (c.time >= c.duration) {
      this.current = null;
      if (!c.special) this.comboTimer = COMBAT.comboWindow;
    }
  }

  strike(c) {
    const p = this.player;
    const a = c.attack;
    const base = c.special ? a.damage * (1 + SPECIAL.powerBonus * c.power) : a.damage[c.index];
    const damage = Math.round(base * this.power);
    const knockback = c.special ? a.knockback * (0.6 + c.power * 0.6) : a.knockback[c.index];
    const knockdown = c.special
      ? (c.power >= SPECIAL.knockdownAt ? SPECIAL.knockdown * c.power : 0)
      : a.knockdown?.[c.index] ?? 0;
    const effects = knockdown ? { stun: knockdown } : null;
    const critChance = this.data.critChance;

    // Melee blows carry you forward a little: they feel solid and connect.
    if (!a.projectile && !a.dash) {
      const step = c.special || c.finisher ? COMBAT.lungeHeavy : COMBAT.lunge;
      p.velocity.x += Math.sin(c.aimYaw) * step;
      p.velocity.z += Math.cos(c.aimYaw) * step;
    }
    const opts = { damage, knockback, critChance, heavy: c.special, finisher: c.finisher, basic: !c.special, effects };
    if (a.projectile) {
      if (a.kind === 'cast') Sfx.cast();
      else Sfx.shoot();
      const origin = p.position.clone().add(new THREE.Vector3(Math.sin(c.aimYaw) * 0.5, 1.25, Math.cos(c.aimYaw) * 0.5));
      this.combat.shoot({ ...a.projectile, ...opts, origin, direction: this.aimDirection(origin), team: 'player', owner: p });
    } else {
      this.combat.melee({ ...opts, attacker: p, facing: c.aimYaw, range: a.range, arc: a.arc });
    }
    p.emit('attack', { heavy: c.special, kind: a.kind });
  }

  // Which way to face: toward the locked enemy, or where the camera looks.
  aimYaw() {
    const t = this.lockTarget;
    if (t?.alive) return Math.atan2(t.position.x - this.player.position.x, t.position.z - this.player.position.z);
    const dir = this.camera.getWorldDirection(new THREE.Vector3());
    return Math.atan2(dir.x, dir.z);
  }

  // A 3D direction from `origin` toward the locked enemy or the crosshair.
  aimDirection(origin) {
    const t = this.lockTarget;
    if (t?.alive) return t.position.clone().setY(t.position.y + t.height * 0.5).sub(origin);
    raycaster.setFromCamera(AIM_NDC, this.camera);
    const aimPoint = raycaster.ray.at(this.camera.position.distanceTo(origin) + 30, new THREE.Vector3());
    return aimPoint.sub(origin);
  }

  // Called by the battle for every hit you land; `basic` hits fill MP.
  onHitDealt(basic) {
    this.sinceCombat = 0;
    if (!basic) return;
    const p = this.player;
    p.resource = Math.min(p.resourceMax, p.resource + this.data.resource.onHitDealt);
  }

  onHitTaken() {
    this.sinceCombat = 0;
  }

  updateResources(dt) {
    const p = this.player;
    const r = this.data.resource;
    if (r.regen) p.resource = Math.min(p.resourceMax, p.resource + r.regen * dt);
    // Melee MP fades when you stop attacking for a few seconds.
    if (r.decay && !this.charge && this.sinceAttack > 3) p.resource = Math.max(0, p.resource - r.decay * dt);
    if (this.sinceCombat > COMBAT.outOfCombatTime && p.health > 0) {
      p.health = Math.min(p.maxHealth, p.health + p.maxHealth * COMBAT.healthRegen * dt);
    }
  }
}
