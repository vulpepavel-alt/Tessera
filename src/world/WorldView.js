// Everything needed to show a world: sky, fog, sun, clouds, the chunks and
// the time of day.
// Used both behind the main menu and while playing.

import { Atmosphere } from './Atmosphere.js';
import { CloudSea } from './CloudSea.js';
import { SkyClouds } from './SkyClouds.js';
import { ChunkManager } from './ChunkManager.js';
import { createGenerator } from './BenchmarkGenerator.js';
import { DayNight } from './DayNight.js';
import { windTime } from './voxelMaterials.js';
import { settings } from '../save/Settings.js';
import { CHUNK } from '../data/world.js';

export class WorldView {
  constructor(engine, seed, time = null) {
    this.engine = engine;
    this.seed = seed;
    this.dayNight = new DayNight(time?.day, time?.hour);
    const distance = settings.get('renderDistance');
    this.atmosphere = new Atmosphere(engine.scene, distance);
    this.clouds = new CloudSea(engine.scene, seed);
    this.skyClouds = new SkyClouds(engine.scene);
    this.chunks = new ChunkManager(engine.scene, seed, distance);
    // A copy of the generator on the main thread, for quick questions like
    // "which biome is this?" or "where should the player start?".
    this.generator = createGenerator(seed);

    settings.subscribe((name, value) => {
      if (name === 'renderDistance') {
        this.chunks.setRenderDistance(value);
        this.atmosphere.setViewDistance(value);
      }
      if (name === 'fov') {
        engine.camera.fov = value;
        engine.camera.updateProjectionMatrix();
      }
    });
    engine.camera.fov = settings.get('fov');
    engine.camera.updateProjectionMatrix();
  }

  // `focus`: the point the world loads around (the player or the camera).
  update(dt, elapsed, focus) {
    this.dayNight.update(dt);
    windTime.value = elapsed;
    const look = this.dayNight.look;
    this.chunks.update(focus);
    this.atmosphere.update(this.engine.camera, look);
    const brightness = 0.35 + 0.65 * Math.min(look.ambient / 1.1, 1);
    this.clouds.update(this.engine.camera, elapsed, brightness);
    this.skyClouds.update(dt || 1 / 60, this.engine.camera, brightness);
  }

  // The physics view of the world, used by characters and the camera.
  get collision() {
    return {
      getBlock: (x, y, z) => this.chunks.getBlock(x, y, z),
      spawnPoint: () => {
        const s = this.generator.findSpawn();
        return { x: s.x, y: s.y + 0.5, z: s.z, clone() { return { ...this }; } };
      },
      isNearRift: (x, z) => {
        const col = this.generator.column(Math.floor(x), Math.floor(z));
        return col.rift || col.nearRift;
      },
    };
  }

  // Standing height on the ground at (x, z) (top of the highest solid block).
  groundHeight(x, z) {
    for (let y = CHUNK.height - 2; y > 0; y--) if (this.chunks.getBlock(x, y, z) !== 0) return y + 1;
    return 0;
  }

  regionAt(x, z) {
    return this.generator.regions.sample(x, z).biome;
  }
}
