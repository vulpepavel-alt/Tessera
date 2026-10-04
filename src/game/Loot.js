// Things monsters drop, the classic way: a little pile of gold, and sometimes
// a piece of gear lying on the ground, turning slowly over a small square in
// its rarity colour. Walk over gold to collect it; press E next to gear to
// pick it up ("You receive 1 x Iron Sword." in the message log).

import * as THREE from 'three';
import { ITEMS, RARITY, canUse } from '../data/items.js';
import { LOOT } from '../data/progression.js';
import { itemGrid } from '../models/equipment/itemModels.js';
import { VoxelGrid, voxelModelMaterial } from '../models/VoxelGrid.js';
import { MV } from '../data/characterSpec.js';

const DROP_SCALE = 0.75; // gear lies on the ground a little smaller than in the hand

export class LootSystem {
  // inventory: game/Inventory.js. onMessage(text) writes to the message log.
  constructor({ scene, player, inventory, onMessage, onGold }) {
    Object.assign(this, { scene, player, inventory, onMessage, onGold });
    this.drops = []; // { kind: 'gold' | 'item', id, amount, root, time, y }
    this.nearest = null;
    this.coinGrid = new VoxelGrid(5, 3, 5).box(0, 0, 0, 5, 1, 5, 0xc8962a).box(1, 1, 1, 3, 1, 3, 0xffcc3a).box(2, 2, 2, 1, 1, 1, 0xfff0a0);
  }

  // A monster died at `position`: gold always, sometimes a piece of gear.
  dropFor(enemy) {
    const at = enemy.position.clone();
    this.add({ kind: 'gold', amount: LOOT.coins(enemy.level) }, at.clone().add(new THREE.Vector3(0.4, 0, 0.2)));
    if (Math.random() < LOOT.itemChance) {
      const id = pickItem(this.player.classId, enemy.level);
      if (id) this.add({ kind: 'item', id }, at.clone().add(new THREE.Vector3(-0.4, 0, -0.2)));
    }
  }

  add(drop, position) {
    const root = new THREE.Group();
    root.position.copy(position);
    if (drop.kind === 'gold') {
      root.add(new THREE.Mesh(this.coinGrid.toGeometry(MV * 1.4, [2.5, 0, 2.5]), voxelModelMaterial()));
    } else {
      const grid = itemGrid(ITEMS[drop.id]);
      const mesh = new THREE.Mesh(grid.toGeometry(MV * DROP_SCALE, [grid.sizeX / 2, grid.sizeY / 2, grid.sizeZ / 2]), voxelModelMaterial());
      // Long things lie down; everything floats a little and turns slowly.
      if (grid.sizeY > grid.sizeX * 2) mesh.rotation.z = Math.PI / 2;
      mesh.position.y = 0.45;
      root.add(mesh);
      // A small square in the rarity colour under it, so drops are easy to spot.
      const color = new THREE.Color(RARITY[ITEMS[drop.id].rarity].color);
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false }));
      mark.rotation.x = -Math.PI / 2;
      mark.position.y = 0.04;
      root.add(mark);
    }
    root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.scene.add(root);
    this.drops.push({ ...drop, root, time: 0, y: position.y });
  }

  update(dt) {
    const p = this.player.position;
    this.nearest = null;
    let best = LOOT.pickupRange;
    for (const d of this.drops) {
      d.time += dt;
      d.root.rotation.y += dt * 1.5;
      d.root.position.y = d.y + (d.kind === 'item' ? Math.sin(d.time * 2.5) * 0.06 : 0);
      const dist = Math.hypot(d.root.position.x - p.x, d.root.position.z - p.z);
      const close = Math.abs(d.root.position.y - p.y) < 2;
      if (d.kind === 'gold' && close && dist < LOOT.coinRange) {
        this.onGold(d.amount);
        this.onMessage(`You receive ${d.amount} gold.`);
        d.done = true;
      } else if (d.kind === 'item' && close && dist < best) {
        best = dist;
        this.nearest = d;
      }
      if (d.time > LOOT.lifetime) d.done = true;
    }
    for (const d of this.drops) if (d.done) this.remove(d);
    this.drops = this.drops.filter((d) => !d.done);
  }

  // E next to a piece of gear: into the bag (if there is room).
  pickUp() {
    const d = this.nearest;
    if (!d) return false;
    if (!this.inventory.add(d.id)) {
      this.onMessage('Your bag is full.');
      return true;
    }
    this.onMessage(`You receive 1 x ${ITEMS[d.id].name}.`);
    d.done = true;
    this.remove(d);
    this.drops = this.drops.filter((x) => x !== d);
    this.nearest = null;
    return true;
  }

  remove(d) {
    this.scene.remove(d.root);
    d.root.traverse((o) => {
      o.geometry?.dispose();
      if (o.material?.isMeshBasicMaterial) o.material.dispose();
    });
  }
}

// A random piece of gear for a monster of this level: usually usable by your
// class, of the area's usual tier or (rarely) better.
export function pickItem(classId, level) {
  const roll = Math.random() * LOOT.rarityRolls.reduce((s, r) => s + r.weight, 0);
  let acc = 0;
  let bonus = 0;
  for (const r of LOOT.rarityRolls) {
    acc += r.weight;
    if (roll < acc) {
      bonus = r.bonus;
      break;
    }
  }
  const tier = Math.min(7, LOOT.baseTier(level) + bonus);
  const ownClass = Math.random() < LOOT.ownClassChance;
  // Weapons and armour come up about equally often (there are many more weapons).
  const weapon = Math.random() < 0.45;
  const fits = (it) => (ownClass ? canUse(it, classId) : true) && Boolean(it.kind) === weapon;
  // The closest tier that has something, looking down first.
  for (let t = tier; t >= 1; t--) {
    const pool = Object.values(ITEMS).filter((it) => it.tier === t && fits(it));
    if (pool.length) return pool[Math.floor(Math.random() * pool.length)].id;
  }
  return null;
}
