// Boss lairs: every area of the world has one, a fixed spot (from the world
// seed) partway between its centre and its edge, marked on the minimap.
// Come within LAIR.wakeRange and the area's boss is there, waiting (data/
// enemies.js BOSS_FOR_BIOME): a giant beast at the area's top level.
// Beat it for lots of XP and gold and a guaranteed piece of better gear.
// It returns the next day (beaten lairs are saved with the game).

import * as THREE from 'three';
import { Enemy } from '../entities/Enemy.js';
import { ENEMIES, BOSS_FOR_BIOME } from '../data/enemies.js';
import { pickItem } from './Loot.js';
import { WORLD } from '../data/world.js';

export const LAIR = {
  wakeRange: 60,     // the boss appears when you come this close
  showRange: 220,    // lairs this close are listed for the minimap
  goldBase: 60,      // + 6 per boss level
  itemBonusLevels: 20, // its gear drop is as good as a monster 20 levels higher
};

export class Bosses {
  // world: WorldView. battle: Battle. loot: LootSystem. defeated: { lairId: day }.
  constructor({ scene, world, battle, loot, player, onMessage, defeated = {} }) {
    Object.assign(this, { scene, world, battle, loot, player, onMessage });
    this.defeated = { ...defeated };
    this.lairs = new Map();  // site id -> lair (or null when no spot was found)
    this.active = new Map(); // lair id -> Enemy
    this.timer = 0;
  }

  // The lair of a region site: the first good spot on a ring around its centre.
  lairOf(site) {
    if (this.lairs.has(site.id)) return this.lairs.get(site.id);
    const gen = this.world.generator;
    let lair = null;
    const start = (site.x * 0.37 + site.z * 0.71) % (Math.PI * 2);
    for (let r = 70; r <= 130 && !lair; r += 15) {
      for (let k = 0; k < 12 && !lair; k++) {
        const a = start + (k / 12) * Math.PI * 2;
        const x = Math.round(site.x + Math.cos(a) * r);
        const z = Math.round(site.z + Math.sin(a) * r);
        if (gen.regions.sample(x, z).site.id !== site.id) continue;
        if (gen.villages.influence(x, z)) continue;
        if (!gen.isGoodSpawn(x, z)) continue;
        lair = { id: site.id, x: x + 0.5, z: z + 0.5, y: gen.column(x, z).top + 1, biomeId: site.biomeId, bossId: BOSS_FOR_BIOME[site.biomeId] };
      }
    }
    this.lairs.set(site.id, lair);
    return lair;
  }

  // Lairs around (x, z): the region squares around it.
  lairsNear(x, z, range) {
    const size = WORLD.regionSize;
    const ci = Math.round(x / size);
    const cj = Math.round(z / size);
    const out = [];
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const lair = this.lairOf(this.world.generator.regions.site(ci + di, cj + dj));
        if (lair?.bossId && Math.hypot(lair.x - x, lair.z - z) < range) out.push(lair);
      }
    }
    return out;
  }

  isDefeated(lair) {
    const day = this.defeated[lair.id];
    return day !== undefined && day >= this.world.dayNight.day; // back the next day
  }

  // For the minimap: lairs nearby whose boss is waiting.
  markers(focus) {
    return this.lairsNear(focus.x, focus.z, LAIR.showRange).filter((l) => !this.isDefeated(l)).map((l) => ({ x: l.x, y: l.y, z: l.z }));
  }

  // The boss you are fighting (for the big health bar), or null.
  get current() {
    const p = this.player.position;
    for (const boss of this.active.values()) {
      if (boss.alive && (boss.isAngry || boss.position.distanceTo(p) < 22)) return boss;
    }
    return null;
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 1;
    const p = this.player.position;
    // Forget bosses that were removed (despawned far away, or defeated).
    for (const [id, boss] of this.active) if (boss.removed || !boss.alive) this.active.delete(id);
    for (const lair of this.lairsNear(p.x, p.z, LAIR.wakeRange)) {
      if (this.active.has(lair.id) || this.isDefeated(lair)) continue;
      if (!this.world.chunks.isAreaReady(lair.x, lair.z, 0)) continue;
      const type = ENEMIES[lair.bossId];
      const level = this.world.generator.regions.sample(lair.x, lair.z).biome.levels[1];
      const y = this.world.groundHeight(lair.x, lair.z);
      const boss = new Enemy(this.scene, this.world.collision, this.battle.combat, lair.bossId, level,
        new THREE.Vector3(lair.x, y + 0.05, lair.z), false);
      boss.lairId = lair.id;
      this.battle.combat.enemies.push(boss);
      this.battle.labels.addBar(boss);
      this.active.set(lair.id, boss);
      this.onMessage(`You sense something huge nearby... the ${type.name}.`);
    }
  }

  // Called when any monster dies: rewards for bosses.
  onKilled(enemy) {
    if (!enemy.type.boss || !enemy.lairId) return;
    this.defeated[enemy.lairId] = this.world.dayNight.day;
    this.active.delete(enemy.lairId);
    const gold = LAIR.goldBase + enemy.level * 6;
    this.loot.add({ kind: 'gold', amount: gold }, enemy.position.clone().add(new THREE.Vector3(0.6, 0, 0)));
    const id = pickItem(this.player.classId, enemy.level + LAIR.itemBonusLevels);
    if (id) this.loot.add({ kind: 'item', id }, enemy.position.clone().add(new THREE.Vector3(-0.6, 0, 0.4)));
    this.onMessage(`You defeated the ${enemy.type.name}!`);
  }
}
