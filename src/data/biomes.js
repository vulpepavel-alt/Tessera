// The five biomes of Tessera. The land is split into large regions, one biome each.
//
// Terrain numbers:
//   baseOffset     - raises or lowers the whole region (negative = more water)
//   hillHeight     - rolling hills
//   mountainHeight - ridged mountain ranges
//   duneHeight     - small sharp ridges (dunes)
//   snowLine       - ground higher than this becomes the "peak" block
//
// Flora: what grows on the ground. "chance" is per column (0.01 = 1 in 100).
// "on" lists the ground blocks it may grow on. Types are built in world/Decorations.js.

import { BLOCK } from './blocks.js';

export const BIOMES = {
  amberMeadows: {
    name: 'Amber Meadows',
    temperature: 18, // °C at midday; nights are colder
    levels: [1, 10],
    surface: BLOCK.GRASS,
    altSurface: BLOCK.GOLDEN_GRASS,
    altAmount: 0.05, // 0 = never the alternative surface, 1 = always (lime meadow, rare golden patches)
    soil: BLOCK.DIRT,
    stone: BLOCK.STONE,
    beach: BLOCK.SAND,
    peak: BLOCK.SNOW,
    water: BLOCK.WATER,
    baseOffset: 1, hillHeight: 9, mountainHeight: 20, duneHeight: 0, snowLine: 66,
    flora: [
      { type: 'prop', prop: 'berryBush', chance: 0.003, on: [BLOCK.GRASS, BLOCK.GOLDEN_GRASS] },
      { type: 'prop', prop: 'rock', chance: 0.002, on: [BLOCK.GRASS, BLOCK.GOLDEN_GRASS] },
      { type: 'prop', prop: 'bigRock', chance: 0.0006, on: [BLOCK.GRASS, BLOCK.GOLDEN_GRASS, BLOCK.STONE] },
      { type: 'prop', prop: 'mushroom', chance: 0.0015, on: [BLOCK.GRASS, BLOCK.GOLDEN_GRASS] },
      { type: 'prop', prop: 'log', chance: 0.0007, on: [BLOCK.GRASS, BLOCK.GOLDEN_GRASS] },
      { type: 'oakTree', chance: 0.008, on: [BLOCK.GOLDEN_GRASS], trunk: BLOCK.WOOD, leaves: BLOCK.AMBER_LEAVES, leavesDark: BLOCK.AMBER_LEAVES_DARK, leavesLight: BLOCK.AMBER_LEAVES_LIGHT },
      // Groves of leafy trees and layered pines around open meadows.
      { type: 'oakTree', chance: 0.008, on: [BLOCK.GRASS], trunk: BLOCK.WOOD, leaves: BLOCK.LEAVES, leavesDark: BLOCK.LEAVES_DARK, leavesLight: BLOCK.LEAVES_LIGHT },
      { type: 'pineTree', chance: 0.004, on: [BLOCK.GRASS], trunk: BLOCK.WOOD, leaves: BLOCK.LEAVES, leavesDark: BLOCK.LEAVES_DARK, leavesLight: BLOCK.LEAVES_LIGHT },
      { type: 'tallTree', chance: 0.003, on: [BLOCK.GRASS], trunk: BLOCK.WOOD, leaves: BLOCK.LEAVES, leavesDark: BLOCK.LEAVES_DARK, leavesLight: BLOCK.LEAVES_LIGHT },
      { type: 'blossomTree', chance: 0.0025, on: [BLOCK.GRASS], trunk: BLOCK.DARK_PLANKS, leaves: BLOCK.BLOSSOM, leavesDark: BLOCK.BLOSSOM_DARK, leavesLight: BLOCK.BLOSSOM_LIGHT, petals: BLOCK.FLOWER_PINK },
      { type: 'bush', chance: 0.008, on: [BLOCK.GRASS, BLOCK.GOLDEN_GRASS], leaves: BLOCK.LEAVES },
    ],
  },

  crystalfrostForest: {
    name: 'Crystalfrost Forest',
    temperature: -6, // °C at midday; nights are colder
    levels: [10, 20],
    surface: BLOCK.FROST_GRASS,
    altSurface: BLOCK.SNOW,
    altAmount: 0.4,
    soil: BLOCK.DIRT,
    stone: BLOCK.STONE,
    beach: BLOCK.SNOW,
    peak: BLOCK.SNOW,
    water: BLOCK.ICE,
    baseOffset: 3, hillHeight: 9, mountainHeight: 26, duneHeight: 0, snowLine: 58,
    flora: [
      { type: 'prop', prop: 'rock', chance: 0.002, on: [BLOCK.FROST_GRASS, BLOCK.SNOW] },
      { type: 'prop', prop: 'bigRock', chance: 0.001, on: [BLOCK.FROST_GRASS, BLOCK.SNOW] },
      { type: 'pineTree', chance: 0.02, on: [BLOCK.FROST_GRASS, BLOCK.SNOW], trunk: BLOCK.WOOD, leaves: BLOCK.PINE_LEAVES, leavesDark: BLOCK.PINE_LEAVES_DARK },
      { type: 'crystalCluster', chance: 0.003, on: [BLOCK.FROST_GRASS, BLOCK.SNOW], block: BLOCK.FROST_CRYSTAL },
    ],
  },

  copperDunes: {
    name: 'Copper Dunes',
    temperature: 34, // °C at midday; nights are colder
    levels: [20, 30],
    surface: BLOCK.COPPER_SAND,
    altSurface: BLOCK.DUNE_SAND,
    altAmount: 0.5,
    soil: BLOCK.COPPER_SAND,
    stone: BLOCK.SANDSTONE,
    beach: BLOCK.DUNE_SAND,
    peak: BLOCK.SANDSTONE,
    water: BLOCK.WATER,
    baseOffset: 2, hillHeight: 6, mountainHeight: 12, duneHeight: 6, snowLine: 999,
    flora: [
      { type: 'prop', prop: 'rock', chance: 0.002, on: [BLOCK.COPPER_SAND, BLOCK.DUNE_SAND] },
      { type: 'prop', prop: 'bigRock', chance: 0.0012, on: [BLOCK.COPPER_SAND, BLOCK.DUNE_SAND] },
      { type: 'cactus', chance: 0.006, on: [BLOCK.COPPER_SAND, BLOCK.DUNE_SAND], block: BLOCK.CACTUS },
      { type: 'deadTree', chance: 0.0015, on: [BLOCK.COPPER_SAND], trunk: BLOCK.DEAD_WOOD },
      { type: 'boulder', chance: 0.002, on: [BLOCK.COPPER_SAND, BLOCK.DUNE_SAND], block: BLOCK.SANDSTONE },
    ],
  },

  lanternMarsh: {
    name: 'Lantern Marsh',
    temperature: 24, // °C at midday; nights are colder
    levels: [30, 40],
    surface: BLOCK.MARSH_GRASS,
    altSurface: BLOCK.MUD,
    altAmount: 0.3,
    soil: BLOCK.MUD,
    stone: BLOCK.DEEP_STONE,
    beach: BLOCK.MUD,
    peak: BLOCK.MARSH_GRASS,
    water: BLOCK.MARSH_WATER,
    baseOffset: -1, hillHeight: 5, mountainHeight: 4, duneHeight: 0, snowLine: 999,
    flora: [
      { type: 'prop', prop: 'mushroom', chance: 0.004, on: [BLOCK.MARSH_GRASS, BLOCK.MUD] },
      { type: 'prop', prop: 'log', chance: 0.002, on: [BLOCK.MARSH_GRASS, BLOCK.MUD] },
      { type: 'roundTree', chance: 0.012, on: [BLOCK.MARSH_GRASS], trunk: BLOCK.WOOD, leaves: BLOCK.MARSH_LEAVES, tall: true },
      { type: 'lanternMushroom', chance: 0.008, on: [BLOCK.MARSH_GRASS, BLOCK.MUD], stem: BLOCK.MUSHROOM_STEM, cap: BLOCK.LANTERN_CAP },
      { type: 'bush', chance: 0.01, on: [BLOCK.MARSH_GRASS], leaves: BLOCK.MARSH_LEAVES },
    ],
  },

  stormspirePeaks: {
    name: 'Stormspire Peaks',
    temperature: 1, // °C at midday; nights are colder
    levels: [40, 50],
    surface: BLOCK.STORM_GRASS,
    altSurface: BLOCK.DARK_ROCK,
    altAmount: 0.4,
    soil: BLOCK.DARK_ROCK,
    stone: BLOCK.DARK_ROCK,
    beach: BLOCK.DARK_ROCK,
    peak: BLOCK.SNOW,
    water: BLOCK.WATER,
    baseOffset: 5, hillHeight: 11, mountainHeight: 34, duneHeight: 0, snowLine: 62,
    flora: [
      { type: 'prop', prop: 'rock', chance: 0.004, on: [BLOCK.STORM_GRASS, BLOCK.DARK_ROCK] },
      { type: 'prop', prop: 'bigRock', chance: 0.002, on: [BLOCK.STORM_GRASS, BLOCK.DARK_ROCK] },
      { type: 'pineTree', chance: 0.006, on: [BLOCK.STORM_GRASS], trunk: BLOCK.DEAD_WOOD, leaves: BLOCK.PINE_LEAVES, leavesDark: BLOCK.PINE_LEAVES_DARK },
      { type: 'deadTree', chance: 0.004, on: [BLOCK.STORM_GRASS, BLOCK.DARK_ROCK], trunk: BLOCK.DEAD_WOOD },
      { type: 'crystalCluster', chance: 0.002, on: [BLOCK.DARK_ROCK], block: BLOCK.STORM_CRYSTAL },
    ],
  },
};

// Where biomes appear, by distance from the world centre (in regions).
export const BIOME_LAYOUT = {
  start: 'amberMeadows',     // the centre and nearby regions
  startDistance: 1.5,        // regions closer than this are always the starter biome
  endgame: 'stormspirePeaks',
  endgameDistance: 5,        // regions farther than this are endgame
  middle: ['crystalfrostForest', 'copperDunes', 'lanternMarsh'],
};
