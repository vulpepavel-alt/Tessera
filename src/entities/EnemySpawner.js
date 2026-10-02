// Brings enemies to life around the player and removes the ones left far
// behind. More (and stronger) enemies appear at night.

import * as THREE from 'three';
import { CHUNK } from '../data/world.js';
import { ENEMIES, SPAWNING } from '../data/enemies.js';
import { BLOCK_INFO } from '../data/blocks.js';
import { Enemy } from './Enemy.js';
import { isSolidBlock } from './physics.js';

export class EnemySpawner {
  constructor(scene, worldView, combat, labels) {
    this.scene = scene;
    this.worldView = worldView;
    this.combat = combat;
    this.labels = labels;
    this.timer = 0;
  }

  get enemies() {
    return this.combat.enemies;
  }

  update(dt, player, isNight) {
    // Update every enemy; drop the ones that are finished (dead and faded, or fallen).
    for (const enemy of this.enemies) {
      const keep = enemy.update(dt, player);
      const far = enemy.position.distanceTo(player.position) > SPAWNING.despawnDistance;
      if (!keep || far) this.despawn(enemy);
    }
    this.combat.enemies = this.enemies.filter((e) => !e.removed);
    this.separate();

    this.timer += dt;
    if (this.disabled || this.timer < SPAWNING.interval) return;
    this.timer = 0;
    const max = isNight ? SPAWNING.maxNight : SPAWNING.maxDay;
    if (this.enemies.filter((e) => e.alive).length < max) this.trySpawn(player, isNight);
  }

  trySpawn(player, isNight) {
    const a = Math.random() * Math.PI * 2;
    const d = SPAWNING.minDistance + Math.random() * (SPAWNING.maxDistance - SPAWNING.minDistance);
    const x = Math.floor(player.position.x + Math.cos(a) * d) + 0.5;
    const z = Math.floor(player.position.z + Math.sin(a) * d) + 0.5;
    if (!this.worldView.chunks.isAreaReady(x, z, 0)) return;
    // Villages are safe: no monsters appear in or right next to them.
    const village = this.worldView.generator.villages.influence(x, z);
    if (village && village.weight > 0) return;

    const { site, biome } = this.worldView.generator.regions.sample(x, z);
    const types = Object.keys(ENEMIES).filter((id) => ENEMIES[id].biomes.includes(site.biomeId));
    if (types.length === 0) return; // no enemies made for this biome yet

    const y = this.groundAt(x, z, biome);
    if (y === null) return;
    const typeId = types[Math.floor(Math.random() * types.length)];
    const [minLv, maxLv] = biome.levels;
    let level = minLv + Math.floor(Math.random() * Math.min(3, maxLv - minLv + 1));
    if (isNight) level += SPAWNING.nightLevelBonus;

    const enemy = new Enemy(this.scene, this.worldView.collision, this.combat, typeId, level,
      new THREE.Vector3(x, y, z), isNight);
    this.combat.enemies.push(enemy);
    this.labels.addBar(enemy);
  }

  // Standing height on natural ground (grass, sand...), or null for water,
  // treetops or rifts.
  groundAt(x, z, biome) {
    const chunks = this.worldView.chunks;
    for (let y = CHUNK.height - 2; y > 1; y--) {
      const block = chunks.getBlock(x, y, z);
      if (block === 0) continue;
      if (BLOCK_INFO[block].liquid) return null;
      const natural = [biome.surface, biome.altSurface, biome.beach].includes(block);
      if (!natural || isSolidBlock(chunks.getBlock(x, y + 1, z)) || isSolidBlock(chunks.getBlock(x, y + 2, z))) return null;
      return y + 1;
    }
    return null;
  }

  despawn(enemy) {
    enemy.removed = true;
    enemy.remove();
    this.labels.removeBar(enemy);
  }

  // Gently push enemies apart so they don't stand inside each other.
  separate() {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i].position;
        const b = list[j].position;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        const min = list[i].halfWidth + list[j].halfWidth;
        if (d > 0.001 && d < min) {
          const push = (min - d) / 2 / d;
          a.x -= dx * push;
          a.z -= dz * push;
          b.x += dx * push;
          b.z += dz * push;
        }
      }
    }
  }

  // After the player respawns, angry enemies calm down and go home.
  calmAll() {
    for (const e of this.enemies) if (e.alive) e.setState('return');
  }
}
