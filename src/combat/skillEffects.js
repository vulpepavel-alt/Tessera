// What each kind of skill effect actually does (see data/skills.js).
// Every function gets a context `ctx`:
//   { player, combat, skills (the SkillSystem), aimPoint, aimYaw, aimDirection, particles }

import * as THREE from 'three';

const forwardOf = (yaw) => new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));

export const EFFECTS = {
  aoe(e, ctx) {
    const { player } = ctx;
    let center;
    if (e.at === 'front') center = player.position.clone().addScaledVector(forwardOf(ctx.aimYaw), 1.6);
    else if (e.at === 'aim') center = ctx.aimPoint.clone();
    else center = player.position.clone();
    center.y += 0.9;
    ctx.combat.area({ attacker: player, center, radius: e.radius, damage: e.damage, knockback: e.knockback ?? 0,
      critChance: ctx.critChance, effects: e.stun ? { stun: e.stun } : null });
    ctx.particles.ring(center, e.radius, e.color ?? 0xfff0a0);
  },

  projectile(e, ctx) {
    const origin = ctx.player.position.clone().add(new THREE.Vector3(0, 1.25, 0)).addScaledVector(forwardOf(ctx.aimYaw), 0.5);
    const base = ctx.aimDirection(origin);
    const count = e.count ?? 1;
    for (let i = 0; i < count; i++) {
      const angle = count > 1 ? THREE.MathUtils.degToRad(e.spread) * (i / (count - 1) - 0.5) : 0;
      const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      const effects = {};
      if (e.stun) effects.stun = e.stun;
      if (e.slow) effects.slow = e.slow;
      if (e.poison) effects.poison = e.poison;
      ctx.combat.shoot({
        model: e.model, speed: e.speed, gravity: e.gravity ?? 0, radius: 0.45, pierce: e.pierce,
        explodeRadius: e.explodeRadius, origin: origin.clone(), direction: dir, damage: e.damage,
        knockback: e.knockback ?? 4, critChance: ctx.critChance, team: 'player', owner: ctx.player, heavy: true,
        effects: Object.keys(effects).length ? effects : null,
      });
    }
  },

  buff(e, ctx) {
    ctx.skills.addBuff(e.stat, e.value, e.duration);
  },

  taunt(e, ctx) {
    for (const enemy of ctx.combat.enemies) {
      if (enemy.alive && enemy.position.distanceTo(ctx.player.position) < e.radius) enemy.applyStatus({ taunt: e.duration });
    }
    ctx.particles.ring(ctx.player.position.clone().setY(ctx.player.position.y + 0.3), e.radius, 0xff6a4a);
  },

  heal(e, ctx) {
    const p = ctx.player;
    const amount = Math.round(p.maxHealth * e.percent);
    p.health = Math.min(p.maxHealth, p.health + amount);
    ctx.labels.number(p.position.clone().setY(p.position.y + 2.2), `+${amount}`, 'heal');
    ctx.particles.burst('heal', p.position.clone().setY(p.position.y + 1));
  },

  // A quick rush along the ground (forward or backward), hitting what it passes.
  dash(e, ctx) {
    const dir = forwardOf(ctx.aimYaw).multiplyScalar(e.back ? -1 : 1);
    ctx.skills.startMotion({ dir, speed: e.distance / 0.25, time: 0.25, hitDamage: e.damage, stun: e.stun });
  },

  // A jump forward; on landing, an area blow.
  leap(e, ctx) {
    const p = ctx.player;
    p.velocity.y = 11;
    ctx.skills.startMotion({
      dir: forwardOf(ctx.aimYaw), speed: e.distance / 0.7, time: 0.7, keepVertical: true,
      onLand: () => EFFECTS.aoe({ at: 'self', radius: e.radius, damage: e.damage, knockback: 8, stun: e.stun }, ctx),
    });
  },

  // Appear right behind the target (or a few steps ahead if there is none).
  blink(e, ctx) {
    const p = ctx.player;
    const t = ctx.target;
    ctx.particles.burst('poof', p.position.clone().setY(p.position.y + 0.8));
    if (t?.alive) {
      const behind = forwardOf(Math.atan2(t.position.x - p.position.x, t.position.z - p.position.z)).multiplyScalar(1.4);
      p.position.set(t.position.x + behind.x, Math.max(p.position.y, t.position.y) + 0.2, t.position.z + behind.z);
    } else {
      p.position.addScaledVector(forwardOf(ctx.aimYaw), 5).y += 0.2;
    }
    ctx.particles.burst('poof', p.position.clone().setY(p.position.y + 0.8));
  },

  trap(e, ctx) {
    ctx.skills.placeTrap({ position: ctx.player.position.clone(), ...e });
  },

  rain(e, ctx) {
    ctx.skills.startRepeating({
      times: Math.round(e.duration / e.tick), every: e.tick,
      action: () => {
        const c = ctx.aimPointFixed ?? ctx.aimPoint;
        const spot = c.clone().add(new THREE.Vector3((Math.random() - 0.5) * e.radius, 0.5, (Math.random() - 0.5) * e.radius));
        ctx.combat.area({ attacker: ctx.player, center: spot, radius: 1.6, damage: e.damage, knockback: 1, critChance: ctx.critChance });
        ctx.particles.burst('hit', spot);
      },
    });
  },

  flurry(e, ctx) {
    ctx.skills.startRepeating({
      times: e.hits, every: e.interval,
      action: () => {
        ctx.combat.melee({ attacker: ctx.player, facing: ctx.skills.lastAimYaw, range: e.range, arc: 140,
          damage: e.damage, knockback: 0.6, critChance: ctx.critChance });
      },
    });
  },

  meteor(e, ctx) {
    const spot = ctx.aimPoint.clone();
    ctx.particles.ring(spot.clone().setY(spot.y + 0.2), e.radius, 0xff7a2a);
    ctx.skills.startRepeating({
      times: 1, every: e.delay,
      action: () => {
        ctx.combat.area({ attacker: ctx.player, center: spot.clone().setY(spot.y + 1), radius: e.radius,
          damage: e.damage, knockback: 14, critChance: ctx.critChance, effects: { stun: e.stun } });
        ctx.particles.burst('meteor', spot.clone().setY(spot.y + 1));
        ctx.skills.shake(1);
      },
    });
  },
};
