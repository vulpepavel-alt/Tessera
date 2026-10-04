// Dev tool: an automatic play-tester. Not loaded by the game; import it from
// the browser console while a world is open:
//   const PT = await import('/src/dev/playtest.js'); await PT.boot();
// It drives the real game (keys, mouse, frames) and collects problems.

import * as THREE from 'three';
import { Enemy } from '../entities/Enemy.js';
import { ENEMIES } from '../data/enemies.js';
import { BIOMES } from '../data/biomes.js';
import { xpToNext } from '../data/progression.js';
import { cryptWaypoint as cryptWaypointOf } from '../world/Dungeons.js';

export const problems = [];
let t = 1000;

const g = () => window.tessera;
const note = (what, data = {}) => problems.push({ what, ...data, level: g()?.player?.level });

// Catch errors from anything the game does.
if (!window.__ptHooked) {
  window.__ptHooked = true;
  window.addEventListener('error', (e) => note('error', { message: e.message, at: `${e.filename}:${e.lineno}` }));
  window.addEventListener('unhandledrejection', (e) => note('promise', { message: String(e.reason) }));
  const ce = console.error;
  console.error = (...a) => { note('console', { message: a.map(String).join(' ').slice(0, 200) }); ce(...a); };
}

export async function boot() {
  const game = g();
  let n = 0;
  while (game.state === 'loading' && n++ < 2000) {
    game.update(0.016, (t += 0.016));
    await sleep(4);
  }
  game.pause?.hide();
  game.state = 'playing';
  game.world.dayNight.hour = 12;
  await frames(120);
  return game;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Run the game for n frames (yielding now and then so chunks can load).
export async function frames(n, every = null) {
  const game = g();
  for (let i = 0; i < n; i++) {
    if (game.state !== 'playing' && !game.battle.dead) game.state = 'playing';
    game.update(1 / 60, (t += 1 / 60));
    every?.(i);
    sanity();
    if (i % 30 === 29) await sleep(8);
  }
}

// Things that should never happen.
function sanity() {
  const p = g().player;
  const pos = p.position;
  if (!Number.isFinite(pos.x + pos.y + pos.z)) note('player NaN position');
  if (!Number.isFinite(p.health)) note('player NaN health');
  if (p.health > p.maxHealth + 0.01) note('health above max', { health: p.health, max: p.maxHealth });
  const cam = g().engine.camera.position;
  if (!Number.isFinite(cam.x + cam.y + cam.z)) note('camera NaN');
}

const keys = () => g().input.keysDown;
export async function hold(key, n) {
  keys().add(key);
  await frames(n);
  keys().delete(key);
}
export async function tap(key) {
  const input = g().input;
  input.pressedThisFrame?.add?.(key);
  for (const fn of input.pressHandlers.get(key) ?? []) fn();
  await frames(2);
}

// Teleport to (x, z), let the land load, stand on the ground.
export async function goTo(x, z) {
  const game = g();
  const p = game.player;
  p.placeAt(x + 0.5, 90, z + 0.5);
  p.velocity.set(0, 0, 0);
  for (let i = 0; i < 200 && !game.world.chunks.isAreaReady(x, z, 2); i++) {
    p.placeAt(x + 0.5, 90, z + 0.5);
    p.velocity.set(0, 0, 0);
    await frames(2);
    await sleep(60); // the chunk workers need real time
  }
  const ground = game.world.groundHeight(x + 0.5, z + 0.5);
  if (ground < 2) note('goTo: ground not loaded', { x, z });
  p.placeAt(x + 0.5, ground + 0.05, z + 0.5);
  p.velocity.set(0, 0, 0);
  await frames(20);
}

// A dry, open spot in a biome (searching outwards from here).
export function findBiomeSpot(biomeId) {
  const gen = g().world.generator;
  const p = g().player.position;
  for (let r = 0; r < 3000; r += 40) {
    for (let k = 0; k < 24; k++) {
      const x = Math.round(p.x + Math.cos(k / 24 * Math.PI * 2) * r);
      const z = Math.round(p.z + Math.sin(k / 24 * Math.PI * 2) * r);
      if (gen.regions.sample(x, z).site.biomeId !== biomeId) continue;
      const c = gen.column(x, z);
      if (!c.village && gen.isGoodSpawn(x, z)) return { x, z };
    }
  }
  return null;
}

export function clearEnemies() {
  const game = g();
  for (const e of [...game.battle.combat.enemies]) game.battle.spawner.despawn(e);
  game.battle.combat.enemies = game.battle.combat.enemies.filter((e) => !e.removed);
}

export function spawn(typeId, level, dx = 6, dz = 0) {
  const game = g();
  const p = game.player.position;
  const x = p.x + dx;
  const z = p.z + dz;
  const e = new Enemy(game.engine.scene, game.world.collision, game.battle.combat, typeId, level,
    new THREE.Vector3(x, game.world.groundHeight(x, z) + 0.05, z), false);
  game.battle.combat.enemies.push(e);
  game.battle.labels.addBar(e);
  return e;
}

// Fight one enemy the way a player would: face it, close in (melee) or keep
// range (ranged), attack, use the special when MP is full, skills when
// ready, dodge its wind-ups, drink a potion when low. Returns the result.
export async function fight(enemy, maxSeconds = 60) {
  const game = g();
  const p = game.player;
  const ranged = !!game.battle.playerCombat.attacks.basic.projectile;
  let potions = 0;
  let dodges = 0;
  let deaths = 0;
  const start = performance.now();
  let i = 0;
  for (; i < maxSeconds * 60 && enemy.alive; i++) {
    if (game.battle.dead) {
      deaths++;
      await frames(60 * 4); // wait for the respawn
      return { won: false, deaths, potions, dodges, seconds: i / 60 };
    }
    const dist = Math.hypot(enemy.position.x - p.position.x, enemy.position.z - p.position.z);
    // Like a player: in a crypt, walk round by the doorways.
    const goal = enemy.crypt ? cryptWaypointOf(enemy.crypt, p.position, enemy.position) : enemy.position;
    const dx = goal.x - p.position.x;
    const dz = goal.z - p.position.z;
    game.cameraRig.yaw = Math.atan2(-dx, -dz);
    game.cameraRig.pitch = ranged ? 0.02 + Math.min(0.1, dist * 0.004) : 0.1;
    const k = keys();
    // Move: melee closes in, ranged keeps 7-12 blocks away.
    k.delete('KeyW'); k.delete('KeyS');
    if (!ranged && dist > 2.2) k.add('KeyW');
    if (ranged && dist > 13) k.add('KeyW');
    if (ranged && dist < 5) k.add('KeyS');
    // Attack.
    if (ranged ? dist < 18 : dist < 3.5) k.add('Mouse0'); else k.delete('Mouse0');
    // Dodge a wind-up sometimes (like a decent player).
    if (enemy.state === 'windup' && enemy.stateTime > enemy.type.attack.windup * 0.6 && dist < 5 && Math.random() < 0.08 && p.stamina > 30) {
      await tap('KeyF');
      dodges++;
    }
    if (p.health < p.maxHealth * 0.35 && p.potions > 0 && p.potionCooldown === 0) {
      await tap('KeyQ');
      potions++;
    }
    if (p.resource >= p.resourceMax * 0.95 && i % 40 === 0) { k.add('Mouse2'); await frames(30); k.delete('Mouse2'); }
    if (i % 90 === 0) { await tap('Digit1'); await tap('Digit2'); await tap('KeyR'); }
    await frames(1);
  }
  for (const key of ['KeyW', 'KeyS', 'Mouse0', 'Mouse2']) keys().delete(key);
  await frames(20);
  const res = { won: !enemy.alive, deaths, potions, dodges, seconds: +(i / 60).toFixed(1), realMs: Math.round(performance.now() - start) };
  if (enemy.alive && !game.battle.dead) note('fight timed out', { enemy: enemy.typeId, level: enemy.level, hp: `${Math.round(enemy.health)}/${enemy.maxHealth}` });
  return res;
}

// Give XP until a level is reached (stands in for hours of play).
export function levelTo(level) {
  const p = g().player;
  while (p.level < level) p.gainXp(xpToNext(p.level) - p.xp);
  p.health = p.maxHealth;
}

export const biomeFor = (level) => Object.entries(BIOMES).find(([, b]) => level >= b.levels[0] && level <= b.levels[1])?.[0] ?? 'stormspirePeaks';
export const monstersOf = (biomeId) => Object.keys(ENEMIES).filter((id) => ENEMIES[id].biomes.includes(biomeId));

// ---- Whole-game routines -----------------------------------------------------

// Put on anything in the bag better than what is worn.
export async function upgrade() {
  const { ITEMS, canUse, slotFor } = await import('../data/items.js');
  const game = g();
  const p = game.player;
  for (let i = p.bag.length - 1; i >= 0; i--) {
    const it = ITEMS[p.bag[i]];
    if (!it || !canUse(it, p.classId)) continue;
    const cur = ITEMS[p.equipment[slotFor(it, p.equipment)]];
    if (!cur || (it.tier ?? 0) > (cur.tier ?? 0)) game.inventory.equipFromBag(i);
  }
}

// One stage of the journey: reach `level`, find gear like drops would give,
// travel to the matching land, fight `n` of its monsters.
export async function stage(level, n = 3) {
  const { pickItem } = await import('../game/Loot.js');
  const game = g();
  const p = game.player;
  levelTo(level);
  for (let k = 0; k < 4; k++) {
    const id = pickItem(p.classId, level);
    if (id) game.inventory.add(id);
  }
  await upgrade();
  const biome = biomeFor(Math.min(level, 50));
  const spot = findBiomeSpot(biome);
  await goTo(spot.x, spot.z);
  clearEnemies();
  const types = monstersOf(biome);
  const res = [];
  for (let k = 0; k < n; k++) {
    const type = types[k % types.length];
    const lvl = Math.min(level, 50);
    const e = spawn(type, lvl, 7, k - 1);
    const r = await fight(e, 60);
    res.push(`${type} L${lvl}: ${r.won ? 'won' : 'LOST'} ${r.seconds}s potions ${r.potions} hp ${Math.round(p.health)}/${p.maxHealth}`);
    if (game.battle.dead) await frames(300);
    p.health = p.maxHealth;
  }
  return { level, biome, weapon: p.equipment.mainHand, armor: p.armor, res };
}

// Find and fight a land's boss.
export async function boss(biome) {
  const game = g();
  const p = game.player;
  const gen = game.world.generator;
  const c = findBiomeSpot(biome);
  let lair = null;
  for (let r = 0; r <= 6 && !lair; r++) {
    for (let i = -r; i <= r && !lair; i++) {
      for (let j = -r; j <= r && !lair; j++) {
        const l = game.bosses.lairOf(gen.regions.site(Math.round(c.x / 320) + i, Math.round(c.z / 320) + j));
        if (l?.biomeId === biome) lair = l;
      }
    }
  }
  if (!lair) return 'no lair found';
  delete game.bosses.defeated[lair.id];
  clearEnemies();
  await goTo(Math.round(lair.x) + 12, Math.round(lair.z));
  const live = () => { const b = game.bosses.active.get(lair.id); return b?.alive && !b.removed; };
  for (let i = 0; i < 10 && !live(); i++) await frames(30);
  const b = game.bosses.active.get(lair.id);
  if (!b) return 'boss did not appear';
  const hp0 = p.health;
  const r = await fight(b, 180);
  return { boss: b.typeId, level: b.level, health: b.maxHealth, ...r, heroHealthLost: Math.round(hp0 - p.health), defeated: !!game.bosses.defeated[lair.id] };
}

// Find, enter and clear a land's crypt.
export async function crypt(biome) {
  const game = g();
  const p = game.player;
  const L = game.world.generator.dungeons;
  const c = findBiomeSpot(biome);
  let best = null;
  for (let i = -8; i <= 8; i++) {
    for (let j = -8; j <= 8; j++) {
      const d = L.dungeonInCell(Math.round(c.x / 240) + i, Math.round(c.z / 240) + j);
      if (d && d.biomeId === biome && (!best || Math.hypot(d.x - c.x, d.z - c.z) < Math.hypot(best.x - c.x, best.z - c.z))) best = d;
    }
  }
  if (!best) return 'no crypt';
  delete game.dungeonLife.cleared[best.id];
  clearEnemies();
  game.dungeonLife.awake.delete(best.id);
  const first = best.pieces[0];
  const ix = best.x + best.dx * (first.u0 + 1);
  const iz = best.z + best.dz * (first.u0 + 1);
  await goTo(ix, iz); // loads the land over the crypt
  p.placeAt(ix + 0.5, best.floor + 0.1, iz + 0.5);
  p.velocity.set(0, 0, 0);
  for (let i = 0; i < 10 && !game.dungeonLife.awake.get(best.id); i++) await frames(30);
  const list = game.dungeonLife.awake.get(best.id);
  if (!list) return 'crypt did not wake';
  const results = [];
  for (const e of list) {
    if (!e.alive) continue;
    const r = await fight(e, 90);
    results.push(`${e.typeId} L${e.level}: ${r.won ? 'won' : 'LOST'}${r.deaths ? ' (died)' : ''} ${r.seconds}s`);
    p.health = p.maxHealth;
  }
  return { crypt: best.id, cleared: !!game.dungeonLife.cleared[best.id], results };
}
