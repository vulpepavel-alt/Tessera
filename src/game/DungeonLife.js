// What lives in the dungeons (world/Dungeons.js builds them): when you go
// down into one, its rooms fill with Crypt Guards and the hall holds a
// Crypt Warden, the mini-boss. Beat the Warden for gold and a guaranteed
// piece of better gear; the crypt is quiet until the next day (saved).
// Monsters are as strong as the land above (the area's level range).

import * as THREE from 'three';
import { Enemy } from '../entities/Enemy.js';
import { pickItem } from './Loot.js';

export const CRYPT = {
  guardsPerRoom: 3,
  wakeDistance: 70,    // go below ground within this distance of a dungeon...
  belowSurface: 3,     // ...this deep, and it wakes up
  goldBase: 30,        // + 3 per Warden level
  itemBonusLevels: 10, // the Warden's gear is as good as a monster 10 levels higher
  showRange: 220,      // entrances this close appear on the minimap
};

export class DungeonLife {
  constructor({ scene, world, battle, loot, player, onMessage, cleared = {} }) {
    Object.assign(this, { scene, world, battle, loot, player, onMessage });
    this.cleared = { ...cleared };   // dungeon id -> day the Warden fell
    this.awake = new Map();          // dungeon id -> its monsters
    this.timer = 0;
  }

  dungeonsNear(x, z) {
    return this.world.generator.dungeons.dungeonsNear(x, z);
  }

  isCleared(d) {
    const day = this.cleared[d.id];
    return day !== undefined && day >= this.world.dayNight.day;
  }

  // Minimap: entrances nearby.
  markers(focus) {
    return this.dungeonsNear(focus.x, focus.z)
      .filter((d) => Math.hypot(d.x - focus.x, d.z - focus.z) < CRYPT.showRange)
      .map((d) => ({ x: d.x, y: d.top, z: d.z, cleared: this.isCleared(d) }));
  }

  // The Warden you are fighting (for the big health bar), or null.
  get current() {
    const p = this.player.position;
    for (const list of this.awake.values()) {
      const w = list.find((e) => e.type.miniBoss);
      if (w?.alive && (w.isAngry || w.position.distanceTo(p) < 14)) return w;
    }
    return null;
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.5;
    const p = this.player.position;
    // Forget crypts whose monsters are all gone (despawned when you left).
    for (const [id, list] of this.awake) if (list.every((e) => e.removed || !e.alive)) this.awake.delete(id);
    for (const d of this.dungeonsNear(p.x, p.z)) {
      if (this.awake.has(d.id) || this.isCleared(d)) continue;
      const near = Math.hypot(p.x - d.hallCentre.x, p.z - d.hallCentre.z) < CRYPT.wakeDistance;
      if (near && p.y < d.top - CRYPT.belowSurface && p.y > d.floor - 2) this.wake(d);
    }
  }

  wake(d) {
    const biome = this.world.generator.regions.sample(d.x, d.z).biome;
    const [low, high] = biome.levels;
    const list = [];
    const add = (typeId, x, z, level) => {
      const e = new Enemy(this.scene, this.world.collision, this.battle.combat, typeId, level,
        new THREE.Vector3(x + 0.5, d.floor + 0.05, z + 0.5), false);
      e.dungeonId = d.id;
      e.crypt = d; // finds its way round by the doorways
      this.battle.combat.enemies.push(e);
      this.battle.labels.addBar(e);
      list.push(e);
    };
    d.rooms.forEach((room, r) => {
      for (let k = 0; k < CRYPT.guardsPerRoom; k++) {
        const a = (k / CRYPT.guardsPerRoom) * Math.PI * 2 + r;
        add('cryptGuard', Math.round(room.x + Math.cos(a) * 2.5), Math.round(room.z + Math.sin(a) * 2.5), low + 1 + r + Math.floor(Math.random() * 2));
      }
    });
    add('cryptWarden', Math.round(d.hallCentre.x), Math.round(d.hallCentre.z), Math.min(high, low + 5));
    this.awake.set(d.id, list);
    this.onMessage('The dead stir in the crypt...');
  }

  // Any monster died: the Warden's reward.
  onKilled(enemy) {
    if (!enemy.type.miniBoss || !enemy.dungeonId) return;
    this.cleared[enemy.dungeonId] = this.world.dayNight.day;
    const gold = CRYPT.goldBase + enemy.level * 3;
    this.loot.add({ kind: 'gold', amount: gold }, enemy.position.clone().add(new THREE.Vector3(0.6, 0, 0)));
    const id = pickItem(this.player.classId, enemy.level + CRYPT.itemBonusLevels);
    if (id) this.loot.add({ kind: 'item', id }, enemy.position.clone().add(new THREE.Vector3(-0.6, 0, 0.4)));
    this.onMessage('The Crypt Warden falls. The crypt grows quiet.');
  }
}
