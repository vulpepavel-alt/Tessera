// The MASTER VISUAL BENCHMARK scene (world/BenchmarkGenerator.js builds its
// land). Always the same place, time and camera, so every visual change can
// be compared on it. Nothing is saved there.
//
//   http://localhost:5173/?benchmark        player with a weapon and an armour set
//   http://localhost:5173/?benchmark&bare   the same, with nothing equipped

import { BENCHMARK_SEED } from '../world/BenchmarkGenerator.js';

export const BENCHMARK = {
  save: {
    name: 'Benchmark',
    classId: 'bulwark',
    seed: BENCHMARK_SEED,
    level: 1,
    playTime: 0,
    time: { day: 1, hour: 10 },
    skinTone: 0xf3d2b3, eyeStyle: 'round', eyeColor: 0x2f7fff, brows: 'thin', mouth: 'smile',
    ears: 'round', blush: true, freckles: false,
    hairStyle: 'spiky', hairColor: 0xf2d040, facialHair: 'none',
    outfitStyle: 'tunic', outfitColor: 0xe8dcc0, accentColor: 0x8a6a3a,
    pantsColor: 0x6e5a3a, bootsColor: 0x5a3e28,
    player: { x: 0.5, y: 25, z: 6.5, facing: Math.PI }, // facing north, toward the house
  },
  // One weapon and one armour set (left out with &bare).
  equipment: {
    head: 'leather-head', chest: 'leather-chest', hands: 'leather-hands', legs: 'leather-legs', feet: 'leather-feet',
    mainHand: 'iron-sword', offHand: 'wood-shield',
  },
  camera: { yaw: 0 }, // right behind the player, normal gameplay height and distance
  // Who else stands in the scene (models only, posed, for looks).
  npc: { role: 'merchant', seed: 0.52, x: -2.5, z: -24.5, facing: 0.4 },
  enemy: { type: 'bramblehog', x: 7.5, z: -7.5, facing: -2.4 },
};
