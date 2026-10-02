// The playable races (also used by villagers and humanoid enemies). They all
// share ONE body (data/characterSpec.js); a race only changes:
//   - which skin tones it can have
//   - features on the head (ears, snout, muzzle, tusks, eyes on top...)
//   - an optional tail
//   - its usual size (uniform scale, 0.9 - 1.1) and body frame
//   - whether it grows hair, and its usual facial hair
// Races never change combat numbers. Designs and names are TESSERA's own.

import { HUMAN_SKINS } from './appearance.js';

export const RACES = {
  human: {
    name: 'Human',
    description: 'Found in every corner of the land. Stubborn, curious, endlessly varied.',
    skins: HUMAN_SKINS,
    features: { ears: 'round' },
    scale: 1, hair: true,
  },
  elf: {
    name: 'Elf',
    description: 'Long-eared wanderers of the old forests, light on their feet.',
    skins: [...HUMAN_SKINS, 'undead_frost'],
    features: { ears: 'elf' },
    scale: 1.04, frame: 'soft', hair: true,
  },
  dwarf: {
    name: 'Dwarf',
    description: 'Short, broad and proud. Masters of stone, steel and long beards.',
    skins: HUMAN_SKINS,
    features: { ears: 'round', nose: 'big' },
    scale: 0.9, frame: 'broad', hair: true, facialHair: 'full_beard',
  },
  orc: {
    name: 'Orc',
    description: 'Big-hearted brawlers with tusks and a heavy brow.',
    skins: ['orc_moss', 'orc_jade', 'orc_olive', 'orc_slate', 'orc_umber'],
    features: { ears: 'pointed', tusks: true, heavyBrow: true },
    scale: 1.08, frame: 'broad', hair: true,
  },
  goblin: {
    name: 'Goblin',
    description: 'Small, quick and clever, with huge ears that hear everything.',
    skins: ['goblin_lime', 'goblin_ochre', 'goblin_teal', 'orc_moss'],
    features: { ears: 'goblin' },
    scale: 0.9, hair: true,
  },
  undead: {
    name: 'Undead',
    description: 'Woken from long sleep by the rifts. Pale, stitched, and oddly cheerful.',
    skins: ['undead_ash', 'undead_frost', 'undead_moss', 'undead_bone'],
    features: { ears: 'small', sunken: true, glowEyes: true },
    scale: 1, hair: true,
  },
  lizardfolk: {
    name: 'Lizardfolk',
    description: 'Sun-loving folk of the dunes and marshes, with a long snout and tail.',
    skins: ['lizard_green', 'lizard_teal', 'lizard_red', 'lizard_sand', 'lizard_blue'],
    features: { ears: 'none', snout: true, crest: true, tail: 'lizard' },
    scale: 1.04, hair: false,
  },
  frogfolk: {
    name: 'Frogfolk',
    description: 'Cheerful pond-dwellers with eyes on top of their heads and a wide grin.',
    skins: ['frog_green', 'frog_teal', 'frog_orange', 'frog_blue', 'frog_yellow'],
    features: { ears: 'none', frogEyes: true, wideMouth: true, webbed: true },
    variants: ['dome', 'side', 'ridge'], // eye designs (the first is the default)
    scale: 0.94, frame: 'soft', hair: false,
  },
  foxkin: {
    name: 'Foxkin',
    description: 'Fox folk with tall ears, a pale muzzle and a bushy, white-tipped tail.',
    skins: ['fur_orange', 'fur_red', 'fur_silver', 'fur_snow', 'fur_brown', 'fur_gold'],
    features: { ears: 'fox', muzzle: true, tail: 'fox' },
    scale: 0.98, hair: true,
  },
};

export const RACE_ORDER = ['human', 'elf', 'dwarf', 'orc', 'goblin', 'undead', 'lizardfolk', 'frogfolk', 'foxkin'];

// How common each race is among villagers (they live together everywhere).
export const VILLAGER_RACES = [
  ['human', 0.34], ['elf', 0.12], ['dwarf', 0.12], ['foxkin', 0.12], ['goblin', 0.1],
  ['orc', 0.08], ['frogfolk', 0.05], ['lizardfolk', 0.05], ['undead', 0.02],
];
