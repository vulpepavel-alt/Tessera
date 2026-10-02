// The MASTER VISUAL BENCHMARK world: a small hand-designed piece of land that
// always looks the same, so every visual change can be judged on it.
// Open it with  http://localhost:5173/?benchmark
//
// Around the start point (0, 0), looking north:
//   - a meadow with small natural steps (micro shape)
//   - a pond to the north-west
//   - a terraced hill to the north-east whose south face is a cliff
//   - a rock formation to the west, a house straight ahead
//   - three kinds of trees (round, blossom, pine), bushes, rocks, flowers
//   - mountain ridges far to the north, on the horizon
// Further out it turns into ordinary Amber Meadows land (no villages).
// It is a WorldGenerator with a few parts replaced, so the real chunk
// pipeline (meshing, details, props, minimap) draws it.

import { WorldGenerator } from './WorldGenerator.js';
import { WORLD } from '../data/world.js';
import { BLOCK } from '../data/blocks.js';
import { BIOMES } from '../data/biomes.js';
import { VILLAGE_STYLES } from '../data/villages.js';
import { FLORA_BUILDERS } from './Decorations.js';
import { buildHouse } from './VillageBuilder.js';
import { fbm2, hash3, lerp, smoothstep } from './random.js';

export const BENCHMARK_SEED = '__benchmark__';

// The worker and the main thread both call this to get the right generator.
export function createGenerator(seed) {
  return seed === BENCHMARK_SEED ? new BenchmarkGenerator() : new WorldGenerator(seed);
}

const GROUND = 24;     // meadow height (top block)
const DESIGN = 64;     // designed area radius; beyond it, normal land
const HOUSE = { x0: -6, x1: 1, z0: -34, z1: -28, door: { x: -3, z: -28, dx: 0, dz: 1 }, roof: BLOCK.ROOF_RED, chimney: true };

// Hand-placed plants and props: [type or prop name, x, z].
const PLACED = [
  ['oakTree', -12, -22], ['oakTree', -36, -10], ['oakTree', 30, -6], ['oakTree', -20, -44],
  ['tallTree', -30, -36], ['tallTree', 36, -18], ['tallTree', -40, 4],
  ['blossomTree', -22, 2], ['blossomTree', 10, -40], ['blossomTree', 22, 10],
  ['pineTree', 18, -30], ['pineTree', 25, -25], ['pineTree', 13, -36], ['pineTree', 30, -38],
  ['bush', -8, -6], ['bush', 7, -14], ['bush', -16, -30], ['bush', 12, -2],
  ['rock', 4, -6], ['rock', -5, -12], ['bigRock', -28, -24], ['bigRock', -24, -30],
  ['mushroom', -10, -18], ['log', -14, -6], ['berryBush', 6, -20],
];

const NO_VILLAGES = {
  influence: () => null, villagesNear: () => [], villageAt: () => null, villageInCell: () => null,
};

class BenchmarkGenerator extends WorldGenerator {
  constructor() {
    super(BENCHMARK_SEED);
    const biome = BIOMES.amberMeadows;
    const site = { x: 0, z: 0, biome };
    this.regions = { sample: () => ({ biome, terrain: biome, site }) };
    this.villages = NO_VILLAGES;
    this.placed = new Map(PLACED.map(([type, x, z]) => [`${x},${z}`, type]));
  }

  findSpawn() {
    return { x: 0.5, y: GROUND + 1, z: 6.5 };
  }

  column(x, z) {
    return this.rawColumn(x, z);
  }

  rawColumn(x, z) {
    const biome = this.regions.sample().biome;
    const d = Math.hypot(x, z);
    let top = designedHeight(x, z, this.noise);
    let surface = biome.surface;
    const rocks = rockFormation(x, z);
    if (rocks) {
      top = rocks;
      surface = biome.stone;
    }
    if (d > DESIGN) {
      // Blend into ordinary land further out.
      const natural = super.rawColumn(x, z, true);
      const t = smoothstep(DESIGN, DESIGN + 40, d);
      top = Math.round(lerp(top, natural.top, t));
      if (t > 0.5) surface = natural.surface;
    }
    const waterTop = top < WORLD.seaLevel ? WORLD.seaLevel : -1;
    if (waterTop >= 0 && surface === biome.surface) surface = biome.beach;
    return { biome, site: this.regions.sample().site, top, surface, waterTop, mountain: 0, village: null };
  }

  // Called by ChunkGenerator instead of random plants inside the designed area.
  fixedFlora(volume, x, z, col, rng) {
    if (Math.hypot(x, z) > DESIGN) return false;
    const type = this.placed.get(`${x},${z}`);
    if (!type || col.waterTop >= 0) return true;
    const flora = col.biome.flora.find((f) => f.type === type || f.prop === type);
    if (flora) FLORA_BUILDERS[flora.type](volume, x, col.top + 1, z, flora, rng);
    else if (type === 'pineTree') {
      FLORA_BUILDERS.pineTree(volume, x, col.top + 1, z, BIOMES.crystalfrostForest.flora.find((f) => f.type === 'pineTree'), rng);
    }
    return true;
  }

  // Called by ChunkGenerator after the terrain: the benchmark house.
  stampStructures(volume) {
    buildHouse(volume, HOUSE, GROUND, VILLAGE_STYLES.amberMeadows);
  }
}

function designedHeight(x, z, noise) {
  let top = GROUND;
  // Micro shape: small raised patches and dips, one block high.
  const n = fbm2(noise.hills, x, z, 2, 0.07);
  const nearHouse = x > HOUSE.x0 - 4 && x < HOUSE.x1 + 4 && z > HOUSE.z0 - 4 && z < HOUSE.z1 + 6;
  if (!nearHouse) {
    if (n > 0.32) top += 1;
    if (n > 0.55) top += 1;
    if (n < -0.45 && z < 0) top -= 1;
  }

  // Pond to the north-west, with a one-step bank.
  const pond = Math.hypot((x + 17) / 9, (z + 10) / 6);
  if (pond < 1) top = 19 + Math.round(pond * 2);
  else if (pond < 1.3) top = Math.min(top, GROUND - 1);

  // Terraced hill to the north-east; its south face is a sheer cliff.
  const hill = 1 - Math.hypot((x - 19) / 20, (z + 30) / 18);
  if (hill > 0 && z < -15) {
    const rise = Math.round((hill * 16) / 2) * 2; // terraces two blocks tall
    const jag = hash3(x >> 1, 5, z >> 1, 77) < 0.25 ? 1 : 0; // irregular edges
    top = Math.max(top, GROUND + rise + jag);
  }

  // Mountain ridges far to the north (horizon silhouettes).
  if (z < -90) {
    const ridge = Math.min(1, (-z - 90) / 60) * (0.6 + 0.4 * Math.sin(x * 0.045) + 0.25 * Math.sin(x * 0.13));
    top = Math.max(top, GROUND + Math.round((ridge * 30) / 3) * 3);
  }
  return Math.min(top, WORLD.maxTop);
}

// Rock formation to the west: uneven stone pillars.
function rockFormation(x, z) {
  const d = Math.hypot(x + 27, z + 18);
  if (d > 5) return 0;
  const pillar = hash3(x >> 1, 9, z >> 1, 31);
  return GROUND + 2 + Math.round((1 - d / 5) * 6 + pillar * 3);
}
