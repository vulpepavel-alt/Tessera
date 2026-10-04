// Villages: where they appear, how they are built in each biome, and the
// ingredients for village names and villager looks. All names are original.

import { BLOCK } from './blocks.js';

export const VILLAGE = {
  cellSize: 560,       // the world is split into cells; each may hold one village
  chance: 0.55,        // chance a cell (other than the start) has a village
  radius: 46,          // flattened area around the village centre (roomy, the classic way)
  blend: 18,           // how gently the land slopes back to normal outside it
  plazaHalf: 10,       // the central square is (2 * plazaHalf + 1) blocks wide
  houseRing: [25, 31], // houses stand this far from the centre
  houses: [6, 8],      // how many houses
  fieldDistance: 40,
  startOffset: 60,     // the first village sits this far from the world centre
  lifeRange: 140,      // villagers live while you are this close
};

// Building blocks per biome.
export const VILLAGE_STYLES = {
  amberMeadows: {
    wall: BLOCK.PLASTER, frame: BLOCK.DARK_PLANKS, floor: BLOCK.PLANKS, path: BLOCK.COBBLE,
    roofs: [BLOCK.ROOF_RED, BLOCK.ROOF_BLUE, BLOCK.ROOF_BROWN], crops: true,
  },
  crystalfrostForest: {
    wall: BLOCK.PLANKS, frame: BLOCK.DARK_PLANKS, floor: BLOCK.DARK_PLANKS, path: BLOCK.COBBLE,
    roofs: [BLOCK.SNOW, BLOCK.ROOF_BLUE], crops: false,
  },
  copperDunes: {
    wall: BLOCK.ADOBE, frame: BLOCK.SANDSTONE, floor: BLOCK.SANDSTONE, path: BLOCK.SANDSTONE,
    roofs: [BLOCK.ADOBE, BLOCK.ROOF_BROWN], crops: false,
  },
  lanternMarsh: {
    wall: BLOCK.DARK_PLANKS, frame: BLOCK.PLANKS, floor: BLOCK.PLANKS, path: BLOCK.PLANKS,
    roofs: [BLOCK.ROOF_GREEN, BLOCK.ROOF_BROWN], crops: true,
  },
  stormspirePeaks: {
    wall: BLOCK.STONE_BRICK, frame: BLOCK.DARK_PLANKS, floor: BLOCK.COBBLE, path: BLOCK.COBBLE,
    roofs: [BLOCK.ROOF_BLUE, BLOCK.ROOF_BROWN], crops: false,
  },
};

// Market stalls around the square (vendors stand behind them).
export const STALLS = [
  { role: 'weaponsmith', title: 'Weaponsmith', awning: BLOCK.AWNING_RED },
  { role: 'armorer', title: 'Armorer', awning: BLOCK.AWNING_BLUE },
  { role: 'merchant', title: 'Merchant', awning: BLOCK.AWNING_GREEN },
];

export const VILLAGE_NAME_PARTS = {
  first: ['Amber', 'Thistle', 'Willow', 'Copper', 'Lantern', 'Frost', 'Hollow', 'Bright', 'Mossy',
    'Hearth', 'Wren', 'Clover', 'Briar', 'Ember', 'Fennel', 'Pebble', 'Larch', 'Juniper', 'Sorrel', 'Tansy'],
  second: ['wick', 'dale', 'ford', 'mere', 'stead', 'brook', 'haven', 'field', 'holm', 'cross',
    'vale', 'combe', 'hollow', 'well', 'thorpe'],
};

export const VILLAGER_NAME_PARTS = {
  first: ['Ma', 'Ri', 'Tho', 'El', 'Bra', 'Ka', 'Lo', 'Fen', 'Dar', 'Ira', 'Pel', 'Sa', 'Ven', 'Ul', 'Zo',
    'Mi', 'Ha', 'Ro', 'Ber', 'Ysa', 'Co', 'Ne', 'Gil', 'Tam'],
  second: ['ren', 'na', 'lin', 'dor', 'wyn', 'ra', 'mo', 'th', 'sa', 'rik', 'va', 'den', 'ley', 'bo', 'mira', 'ric'],
};

// Colours villagers are made from (mixed at random for each one).
export const VILLAGER_LOOKS = {
  skin: [0xf3d2b3, 0xe8bf9a, 0xd8a47c, 0xb07d56, 0x8a5c3c, 0x6e4630],
  hair: [0x2a1e16, 0x5a3a22, 0x8a5a2b, 0xd8902a, 0xf2d040, 0xe0402a, 0xe8ecf4, 0x3a6ad8, 0xd85ab8, 0x2fb8a0],
  shirt: [0xe0402a, 0x2f7fe8, 0x3fb84a, 0xf2c230, 0x9a4ad8, 0xf07a2a, 0xf4f1ea, 0x1fb8b0, 0xe8508a],
  pants: [0x5a4632, 0x2f4a8a, 0x6e5a3a, 0x3a3a48, 0x2f5a2f, 0x8a3a3a],
  hat: [0xc9a46a, 0x6e4a2c, 0x8a3a3a, 0x3f4a5f],
};
