// An enemy creature with a simple "brain" (AI) that switches between states:
//
//   patrol  -> wanders near home until it notices you
//   chase   -> runs at you
//   windup  -> stops and glows red: the warning that lets you dodge
//   attack  -> the attack itself (for the Bramblehog: a straight charge)
//   retreat -> runs away when badly hurt
//   return  -> goes home (and heals) if pulled too far away
//
// The numbers for each enemy type live in data/enemies.js.

import * as THREE from 'three';
import { ENEMIES } from '../data/enemies.js';
import { buildCreature, animateQuadruped } from '../models/creatureModels.js';
import { moveBody, isLiquidBlock } from './physics.js';

const GRAVITY = 30;
const RED = new THREE.Color(0xff2a1a);
const WHITE = new THREE.Color(0xffffff);
const tmp = new THREE.Vector3();

export class Enemy {
  constructor(scene, world, combat, typeId, level, position, night) {
    const type = ENEMIES[typeId];
    this.type = type;
    this.typeId = typeId;
    this.name = night ? `Fierce ${type.name}` : type.name;
    this.level = level;
    this.night = night;
    this.scene = scene;
    this.world = world;
    this.combat = combat;
    this.team = 'enemy';
    this.alive = true;

    this.position = position.clone();
    this.home = position.clone();
    this.velocity = new THREE.Vector3();
    this.halfWidth = type.halfWidth;
    this.height = type.height;
    this.grounded = false;

    const nightBoost = night ? 1.25 : 1;
    this.maxHealth = Math.round((type.health + type.healthPerLevel * (level - 1)) * nightBoost);
    this.health = this.maxHealth;
    this.damage = Math.round((type.damage + type.damagePerLevel * (level - 1)) * nightBoost);

    this.state = 'patrol';
    this.stateTime = 0;
    this.wanderTarget = null;
    this.attackCooldown = 0;
    this.attackDir = new THREE.Vector3();
    this.hasHit = false;
    this.facing = Math.random() * Math.PI * 2;
    this.flash = 0;
    this.time = Math.random() * 10;
    this.deadTime = 0;
    // Status effects from skills: seconds left for each.
    this.status = { stun: 0, root: 0, slow: 0, slowFactor: 1, poison: 0, poisonDps: 0, poisonTick: 0, taunt: 0 };
    this.stars = null;

    this.model = buildCreature(type.model);
    scene.add(this.model.root);
    this.syncModel(0);
  }

  get isAngry() {
    return this.state === 'chase' || this.state === 'windup' || this.state === 'attack';
  }

  setState(state) {
    this.state = state;
    this.stateTime = 0;
  }

  // Called by the combat system when this enemy is hit.
  receiveHit({ push }) {
    this.flash = 0.12;
    this.velocity.x += push.x;
    this.velocity.z += push.z;
    this.velocity.y = Math.max(this.velocity.y, 3.5);
    if (this.state === 'patrol' || this.state === 'return') this.setState('chase');
    if (this.health <= this.maxHealth * this.type.retreatAt && this.state !== 'retreat' && this.health > 0) {
      this.setState('retreat');
    }
  }

  // Called by the combat system with effects from skills.
  applyStatus({ stun, slow, poison, root, taunt }) {
    const st = this.status;
    if (stun) {
      st.stun = Math.max(st.stun, stun);
      if (this.state === 'windup' || this.state === 'attack') this.setState('chase'); // interrupted!
    }
    if (root) st.root = Math.max(st.root, root);
    if (slow) {
      st.slow = Math.max(st.slow, slow.duration);
      st.slowFactor = slow.factor;
    }
    if (poison) {
      st.poison = Math.max(st.poison, poison.duration);
      st.poisonDps = Math.max(st.poisonDps, poison.dps);
    }
    if (taunt) {
      st.taunt = Math.max(st.taunt, taunt);
      if (this.alive && this.state !== 'windup' && this.state !== 'attack') this.setState('chase');
    }
  }

  tickStatus(dt, player) {
    const st = this.status;
    for (const k of ['stun', 'root', 'slow', 'poison', 'taunt']) st[k] = Math.max(0, st[k] - dt);
    if (st.poison > 0) {
      st.poisonTick += dt;
      if (st.poisonTick >= 1) {
        st.poisonTick = 0;
        this.combat.hit(this, { attacker: player, damage: st.poisonDps, from: this.position });
      }
    }
    this.showStars(st.stun > 0, dt);
  }

  // Little yellow stars circling the head while stunned.
  showStars(on, dt) {
    if (!on && !this.stars) return;
    if (!this.stars) {
      this.stars = new THREE.Group();
      const m = new THREE.MeshBasicMaterial({ color: 0xffe14a });
      for (let i = 0; i < 3; i++) {
        const star = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), m);
        star.position.set(Math.cos((i / 3) * Math.PI * 2) * 0.45, 0, Math.sin((i / 3) * Math.PI * 2) * 0.45);
        this.stars.add(star);
      }
      this.scene.add(this.stars);
    }
    this.stars.visible = on;
    this.stars.position.set(this.position.x, this.position.y + this.height + 0.35, this.position.z);
    this.stars.rotation.y += dt * 5;
  }

  // Returns false once the enemy should be removed from the world.
  update(dt, player) {
    this.time += dt;
    this.stateTime += dt;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.flash = Math.max(0, this.flash - dt);

    if (!this.alive) {
      this.deadTime += dt;
      this.syncModel(dt);
      return this.deadTime < 1.2;
    }

    this.tickStatus(dt, player);
    if (!this.alive) return true;
    const toPlayer = tmp.set(player.position.x - this.position.x, 0, player.position.z - this.position.z);
    const dist = toPlayer.length();
    // A hidden (stealthed) player can't be seen; a taunting one can't be ignored.
    const playerAvailable = player.alive && player.health > 0 && (!player.stealthed || this.status.taunt > 0);
    let wish = null; // the direction to walk in (or null to stand still)
    let speed = 0;

    if (this.status.stun > 0) {
      this.move(dt, null, 0);
      this.syncModel(dt);
      return this.position.y > -6;
    }

    switch (this.state) {
      case 'patrol': {
        if (!this.wanderTarget || this.stateTime > 6) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * 8;
          this.wanderTarget = this.home.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
          this.stateTime = Math.random() * 3; // pause a little between walks
        }
        const d = new THREE.Vector3(this.wanderTarget.x - this.position.x, 0, this.wanderTarget.z - this.position.z);
        if (this.stateTime > 3 && d.length() > 0.6) {
          wish = d.normalize();
          speed = this.type.walkSpeed;
        }
        if (playerAvailable && dist < this.type.aggroRange) this.setState('chase');
        break;
      }
      case 'chase': {
        const leashed = this.position.distanceTo(this.home) > this.type.leashRange && this.status.taunt <= 0;
        if (!playerAvailable || leashed) {
          this.setState('return');
          break;
        }
        wish = toPlayer.clone().normalize();
        speed = this.type.runSpeed;
        if (dist < this.type.attack.range && this.attackCooldown === 0) this.setState('windup');
        break;
      }
      case 'windup': {
        // Keep turning toward the player for most of the warning, then commit.
        if (this.stateTime < this.type.attack.windup * 0.75 && dist > 0.01) this.attackDir.copy(toPlayer).normalize();
        this.facing = Math.atan2(this.attackDir.x, this.attackDir.z);
        if (this.stateTime >= this.type.attack.windup) {
          this.hasHit = false;
          this.setState('attack');
        }
        break;
      }
      case 'attack': {
        const a = this.type.attack;
        this.velocity.x = this.attackDir.x * a.speed;
        this.velocity.z = this.attackDir.z * a.speed;
        if (!this.hasHit && playerAvailable && this.touches(player)) {
          this.hasHit = true;
          this.combat.hit(player, { attacker: this, damage: this.damage, knockback: a.knockback, from: this.position });
        }
        if (this.stateTime >= a.duration) {
          this.attackCooldown = a.cooldown;
          this.velocity.x *= 0.2;
          this.velocity.z *= 0.2;
          this.setState('chase');
        }
        break;
      }
      case 'retreat': {
        wish = toPlayer.clone().normalize().negate();
        speed = this.type.runSpeed * 0.9;
        if (this.stateTime > this.type.retreatTime) this.setState(playerAvailable ? 'chase' : 'return');
        break;
      }
      case 'return': {
        const d = new THREE.Vector3(this.home.x - this.position.x, 0, this.home.z - this.position.z);
        this.health = Math.min(this.maxHealth, this.health + this.maxHealth * 0.15 * dt);
        if (d.length() < 2) this.setState('patrol');
        else {
          wish = d.normalize();
          speed = this.type.runSpeed * 0.8;
        }
        break;
      }
    }

    if (this.status.root > 0) wish = null;
    this.move(dt, wish, speed * (this.status.slow > 0 ? this.status.slowFactor : 1));
    this.syncModel(dt);
    // Fell into a rift: gone.
    return this.position.y > -6;
  }

  move(dt, wish, speed) {
    const v = this.velocity;
    if (this.state !== 'attack') {
      // Walk toward the wish direction; knockback fades out naturally.
      const tx = wish ? wish.x * speed : 0;
      const tz = wish ? wish.z * speed : 0;
      const k = Math.min(dt * (this.grounded ? 10 : 2), 1);
      v.x += (tx - v.x) * k;
      v.z += (tz - v.z) * k;
      if (wish) this.facing = turnToward(this.facing, Math.atan2(wish.x, wish.z), dt * 8);
    }
    const inWater = isLiquidBlock(this.world.getBlock(this.position.x, this.position.y + 0.5, this.position.z));
    v.y = inWater ? Math.min(v.y + 12 * dt, 2) : Math.max(v.y - GRAVITY * dt, -40);

    const hit = moveBody(this, v.clone().multiplyScalar(dt), this.world, 1);
    if (hit.y) v.y = 0;
    this.grounded = hit.ground;
    // Bumped into something too tall to step onto: hop.
    if ((hit.x || hit.z) && this.grounded && wish) v.y = 8;
  }

  touches(target) {
    const reach = this.halfWidth + target.halfWidth + 0.35;
    const dy = target.position.y - this.position.y;
    return Math.hypot(target.position.x - this.position.x, target.position.z - this.position.z) < reach
      && dy < this.height && dy > -target.height;
  }

  syncModel(dt) {
    const { root, material } = this.model;
    root.position.copy(this.position);
    root.rotation.y = this.facing;
    // Glow: white flash when hit, growing red during the attack warning.
    if (this.flash > 0) material.emissive.copy(WHITE).multiplyScalar(0.6);
    else if (this.state === 'windup' && this.alive) {
      const t = Math.min(this.stateTime / this.type.attack.windup, 1);
      material.emissive.copy(RED).multiplyScalar(0.25 + 0.65 * t * (0.75 + 0.25 * Math.sin(this.time * 30)));
    } else if (this.status.poison > 0) material.emissive.setRGB(0.05, 0.22, 0.02);
    else if (this.status.slow > 0) material.emissive.setRGB(0.05, 0.12, 0.3);
    else material.emissive.setRGB(0, 0, 0);

    animateQuadruped(this.model, {
      speed: Math.hypot(this.velocity.x, this.velocity.z),
      windup: this.state === 'windup' && this.alive,
      charging: this.state === 'attack',
      dead: !this.alive,
    }, this.time, dt);
  }

  remove() {
    if (this.stars) this.scene.remove(this.stars);
    this.scene.remove(this.model.root);
    this.model.root.traverse((o) => o.geometry?.dispose());
    this.model.material.dispose();
  }
}

function turnToward(current, target, maxStep) {
  let diff = target - current;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  return current + Math.max(-maxStep, Math.min(maxStep, diff));
}
