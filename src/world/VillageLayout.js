// Decides WHERE villages are. The world is split into big cells; the cell at
// the centre always gets the starting village, the others maybe one each.
// A village needs dry, fairly flat land. Everything comes from
// the seed, so workers and the main thread agree on every village.

import { VILLAGE } from '../data/villages.js';
import { WORLD } from '../data/world.js';
import { hash3, hashString, smoothstep } from './random.js';
import { planVillage } from './VillagePlanner.js';

const CELL = VILLAGE.cellSize;

export class VillageLayout {
  // generator: the WorldGenerator (used for the land *before* villages flatten it).
  constructor(seed, generator) {
    this.seed = seed;
    this.gen = generator;
    this.salt = hashString(`${seed}:villages`);
    this.cells = new Map();
  }

  static cellOf(v) {
    return Math.floor((v + CELL / 2) / CELL);
  }

  villageInCell(i, j) {
    const key = `${i},${j}`;
    if (!this.cells.has(key)) this.cells.set(key, this.createVillage(i, j));
    return this.cells.get(key);
  }

  createVillage(i, j) {
    const isStart = i === 0 && j === 0;
    const r = (n) => hash3(i, 300 + n, j, this.salt);
    if (!isStart && r(0) > VILLAGE.chance) return null;

    // Try a few spots and keep the first one that suits a village. The start
    // village looks much harder (a wide ring of spots) and, if nothing is
    // perfect, takes the evenest dry spot it saw: a new game always begins
    // in a village.
    let best = null;
    const tries = isStart ? 48 : 14;
    for (let k = 0; k < tries; k++) {
      let x;
      let z;
      if (isStart) {
        const angle = r(1) * Math.PI * 2 + k * 0.9;
        const dist = VILLAGE.startOffset + Math.floor(k / 7) * 30;
        x = Math.round(Math.cos(angle) * dist);
        z = Math.round(Math.sin(angle) * dist);
        const rough = this.roughness(x, z);
        if (rough !== null && (!best || rough < best.rough)) best = { x, z, rough };
      } else {
        x = Math.round(i * CELL + (r(2 + k * 2) - 0.5) * CELL * 0.6);
        z = Math.round(j * CELL + (r(3 + k * 2) - 0.5) * CELL * 0.6);
      }
      const baseY = this.siteHeight(x, z);
      if (baseY === null) continue;
      const { biomeId } = this.biomeAt(x, z);
      return planVillage(this.seed, `${i},${j}`, { x, z }, baseY, biomeId);
    }
    if (best) {
      const { biomeId } = this.biomeAt(best.x, best.z);
      return planVillage(this.seed, `${i},${j}`, { x: best.x, z: best.z }, this.gen.rawColumn(best.x, best.z).top, biomeId);
    }
    return null;
  }

  // How uneven the land is around a dry spot (biggest height difference on a
  // ring), or null for water / mountains.
  roughness(x, z) {
    const centre = this.gen.rawColumn(x, z);
    if (centre.waterTop >= 0 || centre.mountain > 3 || centre.top < WORLD.seaLevel + 1) return null;
    let worst = 0;
    const R = VILLAGE.radius;
    for (let a = 0; a < 8; a++) {
      const c = this.gen.rawColumn(x + Math.cos((a / 8) * Math.PI * 2) * R, z + Math.sin((a / 8) * Math.PI * 2) * R);
      worst = Math.max(worst, Math.abs(c.top - centre.top));
    }
    return worst;
  }

  biomeAt(x, z) {
    const { site } = this.gen.regions.sample(x, z);
    return { biomeId: site.biomeId };
  }

  // The ground height for a village here, or null if the spot is unsuitable.
  siteHeight(x, z) {
    const centre = this.gen.rawColumn(x, z);
    if (centre.waterTop >= 0 || centre.mountain > 3) return null;
    if (centre.top < WORLD.seaLevel + 2 || centre.top > 40) return null;
    // The land around must be fairly even and dry.
    const R = VILLAGE.radius;
    for (let a = 0; a < 8; a++) {
      const px = x + Math.cos((a / 8) * Math.PI * 2) * R;
      const pz = z + Math.sin((a / 8) * Math.PI * 2) * R;
      const c = this.gen.rawColumn(px, pz);
      if (Math.abs(c.top - centre.top) > 9) return null;
    }
    return centre.top;
  }

  villagesNear(x, z) {
    const ci = VillageLayout.cellOf(x);
    const cj = VillageLayout.cellOf(z);
    const list = [];
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const v = this.villageInCell(ci + di, cj + dj);
        if (v) list.push(v);
      }
    }
    return list;
  }

  // How much a village flattens the land at (x, z): 1 inside, fading to 0 outside.
  influence(x, z) {
    let best = null;
    for (const v of this.villagesNear(x, z)) {
      const d = Math.hypot(x - v.center.x, z - v.center.z);
      const weight = 1 - smoothstep(VILLAGE.radius, VILLAGE.radius + VILLAGE.blend, d);
      if (weight > 0 && (!best || weight > best.weight)) best = { village: v, weight };
    }
    return best;
  }

  // The village whose area contains (x, z), if any.
  villageAt(x, z) {
    const hit = this.influence(x, z);
    return hit && hit.weight > 0.5 ? hit.village : null;
  }
}
