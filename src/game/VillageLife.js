// Brings villages to life: creates the villagers of every village you come
// near, lets you talk to them (E), makes them chat on their own, and tells
// the HUD which village you are in.

import * as THREE from 'three';
import { Villager } from '../entities/Villager.js';
import { VILLAGE } from '../data/villages.js';
import { DIALOGUE, DIRECTIONS } from '../data/dialogue.js';

const TALK_DISTANCE = 3.2;
const CHATTER_EVERY = [6, 14]; // seconds between random remarks

export class VillageLife {
  constructor({ scene, worldView, labels, chat, hud, particles, onGuild }) {
    this.onGuild = onGuild;
    this.particles = particles;
    this.smokeTimer = 0;
    this.scene = scene;
    this.worldView = worldView;
    this.labels = labels;
    this.chat = chat;
    this.hud = hud;
    this.active = new Map(); // village id -> list of villagers
    this.chatterTimer = 5;
    this.currentVillage = null;
  }

  get villagers() {
    return [...this.active.values()].flat();
  }

  update(dt, player, isNight) {
    this.spawnAndDespawn(player);
    for (const v of this.villagers) v.update(dt, player, isNight);

    // Which villager can you talk to right now?
    this.talkTarget = this.nearestListener(player);
    this.hud.setPrompt(this.talkTarget ? `Talk to ${this.talkTarget.name}` : null);

    this.puffSmoke(dt);
    this.chatterTimer -= dt;
    if (this.chatterTimer <= 0) {
      this.chatterTimer = CHATTER_EVERY[0] + Math.random() * (CHATTER_EVERY[1] - CHATTER_EVERY[0]);
      this.randomChatter(player, isNight);
    }

    // Entering / leaving a village.
    const here = this.worldView.generator.villages.villageAt(player.position.x, player.position.z);
    if (here !== this.currentVillage) {
      this.currentVillage = here;
      if (here) this.hud.toast(`Welcome to ${here.name}`);
    }
    this.hud.setPlace(here ? here.name : null);
  }

  // Chimneys of nearby villages puff a little smoke.
  puffSmoke(dt) {
    this.smokeTimer += dt;
    if (this.smokeTimer < 0.45) return;
    this.smokeTimer = 0;
    for (const people of this.active.values()) {
      const village = people[0]?.village;
      if (!village) continue;
      for (const h of village.houses) {
        if (!h.chimney) continue;
        const top = new THREE.Vector3(h.x1 - 0.5, village.baseY + 11.2, h.z0 + 1.5);
        this.particles.burst('smoke', top);
      }
    }
  }

  // Create villagers for villages you approach (once their ground has loaded),
  // and remove them when you leave.
  spawnAndDespawn(player) {
    const { generator, chunks } = this.worldView;
    const near = generator.villages.villagesNear(player.position.x, player.position.z);
    for (const village of near) {
      const d = Math.hypot(village.center.x - player.position.x, village.center.z - player.position.z);
      const live = this.active.has(village.id);
      if (!live && d < VILLAGE.lifeRange && chunks.isAreaReady(village.center.x, village.center.z, 1)) {
        const people = village.residents.map((r) => new Villager(this.scene, this.worldView.collision, r, village));
        for (const p of people) this.labels.addTag(p, p.displayName);
        this.active.set(village.id, people);
      }
    }
    for (const [id, people] of this.active) {
      const village = people[0]?.village;
      const d = village ? Math.hypot(village.center.x - player.position.x, village.center.z - player.position.z) : Infinity;
      if (d > VILLAGE.lifeRange + 40) {
        for (const p of people) {
          this.labels.removeTag(p);
          p.remove();
        }
        this.active.delete(id);
      }
    }
  }

  nearestListener(player) {
    let best = null;
    let bestD = TALK_DISTANCE;
    for (const v of this.villagers) {
      if (v.inside) continue;
      const d = v.position.distanceTo(player.position);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  // E pressed: the nearest villager says their next line.
  interact(isNight) {
    const v = this.talkTarget;
    if (!v) return false;
    if (v.role === 'guildmaster') {
      this.labels.say(v, DIALOGUE.guildmaster[0], 4);
      this.chat.add(v.name, DIALOGUE.guildmaster[0]);
      this.onGuild?.(v);
      return true;
    }
    const pool = this.linesFor(v, isNight);
    const text = this.fill(pool[v.lineIndex % pool.length], v.village);
    v.lineIndex++;
    this.labels.say(v, text, 5);
    this.chat.add(v.name, text);
    return true;
  }

  linesFor(v, isNight) {
    if (v.lineIndex === 0 && v.role === 'villager') return DIALOGUE.greeting;
    if (isNight && v.role === 'villager') return DIALOGUE.night;
    return DIALOGUE[v.role] ?? DIALOGUE.villager;
  }

  // Someone nearby says something on their own.
  randomChatter(player, isNight) {
    const nearby = this.villagers.filter((v) => !v.inside && !v.attending && v.position.distanceTo(player.position) < 18);
    if (nearby.length === 0) return;
    const v = nearby[Math.floor(Math.random() * nearby.length)];
    const pool = isNight ? DIALOGUE.night : DIALOGUE.chatter;
    const text = this.fill(pool[Math.floor(Math.random() * pool.length)], v.village);
    this.labels.say(v, text, 4);
    this.chat.add(v.name, text);
  }

  fill(text, village) {
    return text
      .replaceAll('{village}', village.name)
      .replaceAll('{dir}', DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]);
  }
}
