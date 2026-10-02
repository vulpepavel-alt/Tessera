// Decides which biome every place in the endless world belongs to.
//
// The land is divided into a grid of large squares. Each square gets one
// "region centre" at a random spot inside it, and one biome. Every point of
// the world belongs to the closest region centre. (This pattern is called a
// Voronoi diagram; it gives natural-looking, irregular regions.)
//
// The point is shifted a little by noise before measuring, so borders wiggle
// instead of being straight lines. Near a border, the ground shape is a mix of
// both biomes, so mountains don't end in a sudden wall.

import { WORLD } from '../data/world.js';
import { BIOMES, BIOME_LAYOUT } from '../data/biomes.js';
import { makeNoise2D, fbm2, hash3, hashString, clamp } from './random.js';

const SIZE = WORLD.regionSize;
// Terrain numbers that get mixed near borders.
const BLENDED = ['baseOffset', 'hillHeight', 'mountainHeight', 'duneHeight'];

export class RegionLayout {
  constructor(seed) {
    this.salt = hashString(`${seed}:regions`);
    this.warpX = makeNoise2D(seed, 'warp-x');
    this.warpZ = makeNoise2D(seed, 'warp-z');
    this.biomeNoise = makeNoise2D(seed, 'biome-mix');
    this.biomePickNoise = makeNoise2D(seed, 'biome-pick');
    this.cells = new Map(); // remembers region centres already worked out
  }

  // The region centre of grid square (i, j). Square (0,0) is centred on the origin.
  site(i, j) {
    const key = `${i},${j}`;
    let site = this.cells.get(key);
    if (!site) {
      const isStart = i === 0 && j === 0;
      const jitter = 0.38 * SIZE;
      site = {
        id: key,
        x: i * SIZE + (isStart ? 0 : (hash3(i, 1, j, this.salt) * 2 - 1) * jitter),
        z: j * SIZE + (isStart ? 0 : (hash3(i, 2, j, this.salt) * 2 - 1) * jitter),
        biomeId: this.chooseBiome(i, j),
      };
      site.biome = BIOMES[site.biomeId];
      this.cells.set(key, site);
    }
    return site;
  }

  // Starter biome in the middle, endgame far away, the others in between.
  // Noise groups similar regions together and makes the rings irregular.
  chooseBiome(i, j) {
    const distance = Math.hypot(i, j) + this.biomeNoise(i * 0.35, j * 0.35) * 1.1;
    if ((i === 0 && j === 0) || distance < BIOME_LAYOUT.startDistance) return BIOME_LAYOUT.start;
    if (distance > BIOME_LAYOUT.endgameDistance) return BIOME_LAYOUT.endgame;
    const pick = (this.biomePickNoise(i * 0.3, j * 0.3) + 1) / 2; // 0..1
    const list = BIOME_LAYOUT.middle;
    return list[clamp(Math.floor(pick * list.length), 0, list.length - 1)];
  }

  // Which biome (x, z) belongs to, plus the mixed terrain numbers for that spot.
  sample(x, z) {
    const wx = x + fbm2(this.warpX, x, z, 2, 0.004) * WORLD.borderWarp;
    const wz = z + fbm2(this.warpZ, x, z, 2, 0.004) * WORLD.borderWarp;
    const ci = Math.floor((wx + SIZE / 2) / SIZE);
    const cj = Math.floor((wz + SIZE / 2) / SIZE);

    // Distances to the 9 nearby region centres.
    const near = [];
    let closest = null;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const site = this.site(ci + di, cj + dj);
        const d = Math.hypot(wx - site.x, wz - site.z);
        near.push({ site, d });
        if (!closest || d < closest.d) closest = { site, d };
      }
    }

    // Mix terrain numbers from every region centre that is almost as close.
    const terrain = Object.fromEntries(BLENDED.map((k) => [k, 0]));
    let total = 0;
    for (const { site, d } of near) {
      const w = Math.max(0, 1 - (d - closest.d) / WORLD.blendWidth);
      if (w === 0) continue;
      total += w;
      for (const k of BLENDED) terrain[k] += site.biome[k] * w;
    }
    for (const k of BLENDED) terrain[k] /= total;

    return { site: closest.site, biome: closest.site.biome, terrain };
  }
}
