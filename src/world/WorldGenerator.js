// Answers "what does the ground look like at column (x, z)?" for the whole
// endless world. Used by the chunk workers to build chunks.
//
// The land is one connected continent. Layered on top of each other:
//   - continent noise: big slow rises and dips (the dips become lakes),
//   - hills and ridged mountain ranges, shaped by the local biome,
//   - rivers: winding lines carved down to water level.

import { WORLD } from '../data/world.js';
import { BLOCK } from '../data/blocks.js';
import { RegionLayout } from './RegionLayout.js';
import { VillageLayout } from './VillageLayout.js';
import { makeNoise2D, fbm2, ridged2, clamp, smoothstep, hashString, lerp } from './random.js';

export class WorldGenerator {
  constructor(seed) {
    this.seed = seed;
    this.salt = hashString(seed);
    this.regions = new RegionLayout(seed);
    const names = ['continent', 'hills', 'mountains', 'mountainZones', 'dunes', 'river',
      'riverWobble', 'surface', 'valleys', 'rolling', 'terrace', 'micro', 'groves'];
    this.noise = Object.fromEntries(names.map((n) => [n, makeNoise2D(seed, n)]));
    this.villages = new VillageLayout(seed, this);
  }

  // Everything about one column, including villages (which flatten the land
  // around them and keep rivers and trees out).
  column(x, z) {
    const hit = this.villages.influence(x, z);
    if (!hit) return this.rawColumn(x, z);
    const { village, weight } = hit;
    const raw = this.rawColumn(x, z);
    const top = Math.round(raw.top + (village.baseY - raw.top) * weight);
    const biome = raw.biome;
    let surface = raw.surface;
    if (weight > 0.6 || surface === biome.stone || surface === biome.peak || surface === biome.beach) {
      surface = biome.surface;
    }
    return {
      ...raw, top, surface,
      waterTop: top < WORLD.seaLevel ? WORLD.seaLevel : -1,
      village: weight > 0 ? village : null,
    };
  }

  // The land as nature made it, before villages.
  rawColumn(x, z) {
    const { biome, terrain, site } = this.regions.sample(x, z);
    const n = this.noise;

    // --- Height, built in three levels ---
    // MACRO: the big readable forms - slow continent swells, long valleys,
    // wide rolling hills and ridged mountain ranges (in mountain zones only).
    const continent = fbm2(n.continent, x, z, 2, 0.0016) * WORLD.continentHeight;
    const valley = Math.pow(1 - Math.abs(fbm2(n.valleys, x, z, 2, 0.0026)), 4) * -WORLD.valleyDepth;
    const rolling = fbm2(n.rolling, x, z, 2, 0.0055) * terrain.hillHeight * 1.5;
    const zone = smoothstep(0.0, 0.4, fbm2(n.mountainZones, x, z, 2, 0.0035));
    const ridge = ridged2(n.mountains, x, z, 0.009);
    const mountain = Math.pow(ridge, 2.4) * terrain.mountainHeight * WORLD.mountainScale * zone;
    const dune = terrain.duneHeight > 0 ? Math.pow(ridged2(n.dunes, x + z * 0.4, z, 0.045), 2) * terrain.duneHeight : 0;

    // MESO: smaller hills on top.
    const hills = fbm2(n.hills, x, z, 3, 0.016) * terrain.hillHeight * 0.7;
    let raw = WORLD.baseHeight + terrain.baseOffset + continent + valley + rolling + mountain + hills + dune;

    // MESO: terraces. Heights snap to steps with flat treads and short steep
    // risers; the steps' outlines wander (noise), so edges are irregular.
    // Mountains get taller steps, which turn into cliff bands.
    const step = mountain > 6 ? 4 : 2;
    const phase = fbm2(n.terrace, x, z, 2, 0.04) * 0.8;
    const t = raw / step + phase;
    const tread = Math.floor(t);
    raw = (tread + smoothstep(0.4, 0.6, t - tread)) * step; // flat treads, steep risers

    // MICRO: one-cube bumps and dips, so there are no huge flat platforms.
    const micro = fbm2(n.micro, x, z, 2, 0.13);
    if (micro > 0.42) raw += 1;
    else if (micro < -0.5) raw -= 1;

    // Rivers: near the river line the ground is pulled down below the water.
    const riverLine = Math.abs(n.river(x * WORLD.riverFrequency, z * WORLD.riverFrequency)
      + 0.08 * n.riverWobble(x * 0.02, z * 0.02));
    const bank = smoothstep(WORLD.riverWidth * 0.4, WORLD.riverWidth * 2.2, riverLine);
    if (bank < 1 && raw > WORLD.seaLevel - 3) raw = lerp(WORLD.seaLevel - 3, raw, bank);

    // Above softCap the ground rises at half speed, so peaks stay pointed.
    if (raw > WORLD.softCap) raw = WORLD.softCap + (raw - WORLD.softCap) * 0.5;
    const top = Math.round(clamp(raw, 3, WORLD.maxTop));

    // --- Water and surface ---
    const waterTop = top < WORLD.seaLevel ? WORLD.seaLevel : -1;
    let surface;
    if (top >= biome.snowLine) surface = biome.peak;
    else if (mountain > 8) surface = biome.stone;
    else if (top <= WORLD.seaLevel) surface = biome.beach;
    else if (fbm2(n.surface, x, z, 2, 0.03) > 0.35 - biome.altAmount * 0.7) surface = biome.altSurface;
    else surface = biome.surface;

    return { biome, site, top, surface, waterTop, mountain };
  }

  // How wooded this spot is, 0..1. Trees only grow where it is high, so they
  // stand in groves with open meadows between (visual rhythm).
  groveAt(x, z) {
    return fbm2(this.noise.groves, x, z, 2, 0.011) * 0.5 + 0.5;
  }

  // Where a new adventure starts: the south side of the starting village's
  // square, or (if there is no village) a grassy spot near the world centre.
  findSpawn() {
    const start = this.villages.villageInCell(0, 0);
    if (start) {
      return { x: start.center.x + 0.5, y: start.baseY + 1, z: start.plaza.z1 + 0.5 };
    }
    for (let r = 0; r < 400; r += 4) {
      const steps = Math.max(1, Math.floor(r / 2));
      for (let s = 0; s < steps; s++) {
        const a = (s / steps) * Math.PI * 2;
        const x = Math.round(Math.cos(a) * r);
        const z = Math.round(Math.sin(a) * r);
        if (this.isGoodSpawn(x, z)) {
          return { x: x + 0.5, y: this.column(x, z).top + 1, z: z + 0.5 };
        }
      }
    }
    return { x: 0.5, y: 50, z: 0.5 };
  }

  isGoodSpawn(x, z) {
    const col = this.column(x, z);
    const grassy = col.surface === col.biome.surface || col.surface === col.biome.altSurface;
    if (!grassy || col.top < WORLD.seaLevel + 2 || col.top > 34) return false;
    // No water within a few blocks.
    for (const [dx, dz] of [[5, 0], [-5, 0], [0, 5], [0, -5]]) {
      if (this.column(x + dx, z + dz).waterTop >= 0) return false;
    }
    return true;
  }
}

// Water block for one height in a column (frozen biomes only freeze the top layer).
export function waterBlockAt(biome, y, waterTop) {
  if (biome.water === BLOCK.ICE) return y === waterTop ? BLOCK.ICE : BLOCK.WATER;
  return biome.water;
}
