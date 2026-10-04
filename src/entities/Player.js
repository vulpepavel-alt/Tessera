// The player character: health, resource, stamina, the voxel model, and
// the link between the keyboard and the movement "motor" (PlayerMotor.js).
// Also brings you back to safety if you ever fall out of the world.

import * as THREE from 'three';
import { PLAYER } from '../data/player.js';
import { CLASSES, STARTER_KIT, STARTER_BAG } from '../data/classes.js';
import { buildCharacter } from '../models/characterModel.js';
import { placeHeld } from '../models/equipment/weapons.js';
import { buildGlider } from '../models/travelModels.js';
import { CharacterAnimator } from './CharacterAnimator.js';
import { PlayerMotor } from './PlayerMotor.js';
import { isStuck } from './physics.js';

export class Player {
  constructor(scene, world, save) {
    this.world = world; // anything with getBlock(x, y, z)
    this.classId = save.classId;
    this.classInfo = CLASSES[save.classId];
    this.name = save.name;

    // Collision box.
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.halfWidth = PLAYER.width / 2;
    this.height = PLAYER.height;
    this.grounded = false;
    this.inWater = false;
    this.team = 'player';
    this.alive = true;
    // Chosen specialization (switched at the Guild Hall); the first one by default.
    this.spec = save.spec ?? this.classInfo.specs[0].id;
    this.speedBonus = 1;
    this.stealthed = false;
    this.skillInvulnerable = false;
    this.submerged = false;
    this.headUnderwater = false;

    // Stats.
    this.maxHealth = this.classInfo.health;
    this.health = save.player?.health ?? this.maxHealth;
    this.resourceMax = this.classInfo.resource.max;
    this.resource = save.player?.resource ?? (this.classInfo.resource.startsFull ? this.resourceMax : 0);
    this.stamina = PLAYER.staminaMax;
    this.staminaDelay = 0;
    // Travel speed multipliers. Artifacts will raise these later.
    this.bonus = { glide: 1, boat: 1, climb: 1, swim: 1 };

    this.walking = false; // holding Shift: slow walk
    this.roll = { time: -1, cooldown: 0, dir: new THREE.Vector3() };
    this.facing = save.player?.facing ?? 0; // model direction (radians)
    this.faceOverride = null; // set by combat to face the attack direction
    this.safePoint = null;
    this.safeTimer = 0;
    this.listeners = {};

    this.scene = scene;
    this.look = save;
    // A brand-new adventure (or a save from before the bag existed) gets the
    // class's starter weapon and the travel kit (data/classes.js STARTER_KIT).
    const fresh = !Array.isArray(save.bag);
    this.equipment = fresh ? { ...STARTER_KIT[save.classId], ...(save.equipment ?? {}) } : { ...(save.equipment ?? {}) }; // { slot: itemId }
    this.bag = fresh ? [...STARTER_BAG] : [...save.bag]; // item ids in the bag (game/Inventory.js)
    // The glider wears TESSERA's own colours: golden yellow with royal blue stripes.
    this.glider = buildGlider({ cloth: 0xffc83a, trim: 0x2448b8 });
    this.glider.position.set(0, 1.25, 0);
    this.glider.visible = false;
    this.visualY = 0; // smoothed height, so stepping up a block looks soft
    this.buildModel();

    this.motor = new PlayerMotor(this, scene);
  }

  // (Re)build the voxel model from the look and the equipment worn right now.
  buildModel() {
    const old = this.model;
    this.model = buildCharacter(this.classId, this.look, { equipment: this.equipment });
    placeHeld(this.model, this.weaponsDrawn ?? false); // keep weapons where they were
    this.model.body.add(this.glider);
    this.animator = new CharacterAnimator(this.model);
    if (old) {
      this.model.root.position.copy(old.root.position);
      this.model.root.rotation.copy(old.root.rotation);
      this.model.root.visible = old.root.visible;
      this.scene.remove(old.root);
      old.root.traverse((o) => o.geometry?.dispose());
    }
    this.scene.add(this.model.root);
  }

  // Weapons in the hands (fighting) or on the back / hip (exploring).
  setWeaponsDrawn(drawn) {
    this.weaponsDrawn = drawn;
    if (this.model.weaponsDrawn !== drawn) placeHeld(this.model, drawn);
  }

  // Put on / take off equipment: { slot: itemId or null }. The model changes at once.
  setEquipment(changes) {
    for (const [slot, id] of Object.entries(changes)) {
      if (id) this.equipment[slot] = id;
      else delete this.equipment[slot];
    }
    this.buildModel();
    this.emit('equipment', this.equipment);
  }

  // Simple event system: on('fell', fn) is told when something happens.
  on(event, fn) {
    (this.listeners[event] ??= []).push(fn);
  }

  emit(event, data) {
    for (const fn of this.listeners[event] ?? []) fn(data);
  }

  get mode() {
    return this.motor.mode;
  }

  placeAt(x, y, z) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    // Spawned inside a block (e.g. a tree trunk)? Try the spots around first,
    // and only if none is free, move up until free.
    if (isStuck(this, this.world)) {
      const around = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]];
      for (const [dx, dz] of around) {
        this.position.set(x + dx, y, z + dz);
        if (!isStuck(this, this.world)) break;
      }
    }
    for (let i = 0; i < 40 && isStuck(this, this.world); i++) this.position.y += 1;
    this.visualY = this.position.y;
    this.model.root.position.copy(this.position); // the model jumps along right away
    this.safePoint = this.position.clone();
  }

  // Called by the combat system when something hits you.
  receiveHit({ amount, push }) {
    if (this.mode === 'walk') {
      this.velocity.x += push.x;
      this.velocity.z += push.z;
      this.velocity.y = Math.max(this.velocity.y, 3);
    }
    this.emit('hurt', { amount });
  }

  get invincible() {
    return this.skillInvulnerable || (this.roll.time >= 0 && this.roll.time < PLAYER.rollInvincible);
  }

  // input: the Input object. cameraYaw: which way the camera looks (radians).
  update(dt, input, cameraYaw) {
    const wish = this.readMoveInput(input, cameraYaw);
    const mode = this.motor.mode;
    this.walking = this.wantsWalk(input);

    this.motor.update(dt, input, cameraYaw, wish);
    this.regenerateStamina(dt);
    this.updateSafety(dt);
    this.updateModel(dt, wish, cameraYaw);
  }

  // Which way the player wants to go, turned to match the camera.
  readMoveInput(input, cameraYaw) {
    const forward = (input.isDown('KeyW') ? 1 : 0) - (input.isDown('KeyS') ? 1 : 0);
    const right = (input.isDown('KeyD') ? 1 : 0) - (input.isDown('KeyA') ? 1 : 0);
    const wish = new THREE.Vector3();
    if (forward === 0 && right === 0) return wish;
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);
    // Camera forward is (-sin, -cos); camera right is (cos, -sin).
    wish.set(-sin * forward + cos * right, 0, -cos * forward - sin * right).normalize();
    return wish;
  }

  // Holding Shift slows you to a walk (there is no sprint: you always run).
  wantsWalk(input) {
    return input.isDown('ShiftLeft') || input.isDown('ShiftRight');
  }

  // Dodge roll: middle mouse button, or Q (handy on a trackpad). Called by the motor.
  updateRoll(dt, input, wish) {
    const roll = this.roll;
    roll.cooldown = Math.max(0, roll.cooldown - dt);
    if (roll.time >= 0) {
      roll.time += dt;
      if (roll.time >= PLAYER.rollDuration) {
        roll.time = -1;
        roll.cooldown = PLAYER.rollCooldown;
      }
      return;
    }
    const canRoll = this.grounded && roll.cooldown === 0 && this.stamina >= PLAYER.rollCost;
    if ((input.wasPressed('Mouse1') || input.wasPressed('KeyQ')) && canRoll) {
      roll.time = 0;
      // Roll where you're moving, or straight ahead if standing still.
      if (wish.lengthSq() > 0) roll.dir.copy(wish);
      else roll.dir.set(Math.sin(this.facing), 0, Math.cos(this.facing));
      this.drainStamina(PLAYER.rollCost);
      this.emit('roll');
    }
  }

  drainStamina(amount) {
    this.stamina = Math.max(0, this.stamina - amount);
    this.staminaDelay = PLAYER.staminaRegenDelay;
  }

  // Stamina refills everywhere except while climbing.
  regenerateStamina(dt) {
    this.staminaDelay = Math.max(0, this.staminaDelay - dt);
    if (this.mode !== 'climb' && this.staminaDelay === 0) {
      this.stamina = Math.min(PLAYER.staminaMax, this.stamina + PLAYER.staminaRegen * dt);
    }
  }

  // Remember safe ground regularly; if we ever fall out of the world, go back there.
  updateSafety(dt) {
    if (!this.safePoint || this.safePoint.y < 1) this.safePoint = this.world.spawnPoint?.() ?? this.position.clone();
    this.safeTimer += dt;
    if (this.grounded && this.mode === 'walk' && !this.inWater && this.safeTimer >= PLAYER.safePointInterval) {
      this.safeTimer = 0;
      this.safePoint = this.position.clone();
    }
    if (this.position.y < PLAYER.fallLimitY) {
      const lost = Math.min(this.health - 1, Math.round(this.maxHealth * PLAYER.fallPenalty));
      this.health -= lost;
      this.motor.mode = 'walk';
      this.placeAt(this.safePoint.x, this.safePoint.y + 0.5, this.safePoint.z);
      this.emit('fell', { lost });
    }
  }

  updateModel(dt, wish, cameraYaw) {
    const root = this.model.root;
    const mode = this.mode;
    // After stepping up a block, the model glides up instead of popping.
    // Otherwise (jumping, falling) it follows the body exactly.
    const gap = this.position.y - this.visualY;
    const easing = this.stepped || (this.grounded && gap > 0 && gap <= PLAYER.stepHeight + 0.1);
    if (easing) this.visualY += gap * Math.min(dt * 15, 1);
    else this.visualY = this.position.y;
    root.position.set(this.position.x, this.visualY, this.position.z);

    // Which way to face: the attack, the wall, the flight, or the walk direction.
    let dir = wish;
    if (this.roll.time >= 0) dir = this.roll.dir;
    else if (mode === 'climb') dir = this.motor.climbDir;
    else if (mode === 'glide') dir = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    let target = dir.lengthSq() > 0 ? Math.atan2(dir.x, dir.z) : null;
    if (this.faceOverride !== null && mode === 'walk') target = this.faceOverride;
    if (target !== null && mode !== 'boat') {
      let diff = target - this.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // shortest way around
      this.facing += diff * Math.min(dt * PLAYER.turnSpeed, 1);
    }
    root.rotation.y = this.facing;
    this.glider.visible = mode === 'glide';

    this.animator.update(dt, {
      mode,
      speed: Math.hypot(this.velocity.x, this.velocity.z),
      verticalSpeed: this.velocity.y,
      walking: this.walking,
      grounded: this.grounded,
      inWater: this.inWater,
      rolling: this.roll.time >= 0 ? this.roll.time / PLAYER.rollDuration : -1,
      attack: this.attackPose ?? null,
    });
  }

  // What goes into the save file.
  toSave() {
    const p = this.position;
    return {
      x: p.x, y: p.y, z: p.z,
      facing: this.facing,
      health: this.health,
      resource: this.resource,
    };
  }
}
