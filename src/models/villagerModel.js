// Builds a villager from random parts, so no two look the same. Villagers
// come from four (original) peoples:
//   humans       - round ears
//   elves        - pointy ears
//   Mossfolk     - green-skinned, big droopy ears, short and cheerful
//   Brindlefolk  - fox folk with fur, a pale muzzle and ears on top
// Every villager is built with exactly the same body rules as the player
// (models/humanoid.js); they differ only by hair, clothes, colours, hats and
// equipment. Vendors wear aprons; guards wear iron armour with sword and shield.

import { VoxelGrid } from './VoxelGrid.js';
import { buildHumanoid, attach, HEAD_TOP, VOXEL, lighter } from './humanoid.js';
import { resolveEquipment } from '../data/items.js';
import { applyArmor, addArmorParts } from './equipment/armor.js';
import { buildHeld } from './equipment/weapons.js';
import { EYE_STYLES, MOUTH_STYLES } from './humanoid/face.js';
import { VILLAGER_LOOKS } from '../data/villages.js';
import { mulberry32 } from '../world/random.js';

const APRONS = { weaponsmith: 0x5a3a22, armorer: 0x6e6e78, merchant: 0xe8d8b0 };
const GUARD_GEAR = { head: 'iron-head', chest: 'iron-chest', hands: 'iron-hands', feet: 'iron-feet', mainHand: 'iron-sword', offHand: 'iron-shield' };
const EYES = [0x3a7ff0, 0x3fae4a, 0x8a5a2b, 0x8a5cff, 0x2fb8c0];
const PEOPLES = [
  { name: 'human', weight: 0.45 },
  { name: 'elf', weight: 0.2 },
  { name: 'mossfolk', weight: 0.2, skin: [0x7fbf4a, 0x6aaa5a, 0x9ac85a] },
  { name: 'brindle', weight: 0.15, skin: [0xd8823a, 0xc06a2a, 0x8a6a5a], muzzle: 0xf4ead8 },
];

export function buildVillager(lookSeed, role) {
  const rng = mulberry32(Math.floor(lookSeed * 4294967296));
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const people = pickPeople(rng());
  const skin = people.skin ? pick(people.skin) : pick(VILLAGER_LOOKS.skin);
  const spec = {
    skin,
    hair: people.name === 'brindle' ? skin : pick(VILLAGER_LOOKS.hair),
    hairStyle: people.name === 'brindle' ? 'short' : pick(['short', 'spiky', 'long', 'ponytail', 'bob', 'bun', 'bald',
      'mohawk', 'curly', 'swept', 'braids', 'afro', 'pigtails', 'fringe']),
    eyes: pick(EYES),
    ears: { human: 'round', elf: 'pointy', mossfolk: 'long', brindle: 'fox' }[people.name],
    muzzle: people.muzzle ?? null,
    facialHair: people.name === 'human' && rng() < 0.3 ? pick(['mustache', 'beard', 'goatee']) : 'none',
    eyeStyle: pick(Object.keys(EYE_STYLES)),
    mouth: people.name === 'mossfolk' ? pick(['fangs', 'grin']) : pick(Object.keys(MOUTH_STYLES).filter((m) => m !== 'fangs')),
    brows: pick(['thin', 'thick', 'angry', 'none']),
    blush: rng() < 0.6,
    freckles: rng() < 0.25,
    outfitStyle: role === 'villager' ? pick(['tunic', 'vest', 'jacket']) : 'tunic',
    shirt2: pick([0xf4f1ea, 0xffe8b0, 0xcfe8ff]),
    shirt: pick(VILLAGER_LOOKS.shirt),
    trim: pick(VILLAGER_LOOKS.shirt),
    pants: pick(VILLAGER_LOOKS.pants),
    boots: pick([0x3a2a20, 0x5a3a22, 0x2a2632]),
    hands: null,
    apron: APRONS[role] ?? null,
    sash: role === 'villager' && rng() < 0.3 ? pick(VILLAGER_LOOKS.shirt) : null,
  };
  if (role === 'guildmaster') {
    Object.assign(spec, { shirt: 0x4a3f8f, trim: 0xffcc33, pants: 0x3a2f5a, sash: 0xffcc33, apron: null,
      outfitStyle: 'robe', facialHair: people.name === 'human' ? 'beard' : 'none' });
  }
  // Guards wear real equipment from the item list, exactly like the player would.
  const gear = role === 'guard' ? resolveEquipment(GUARD_GEAR) : {};
  const strawHat = role === 'villager' && people.name !== 'brindle' && rng() < 0.25;
  if (strawHat) spec.hat = true; // keeps the hair from poking through
  applyArmor(spec, gear);

  const model = buildHumanoid(spec);
  const { parts } = model;
  if (strawHat) attach(parts.head, strawHatGrid(pick(VILLAGER_LOOKS.hat)), [9, 0, 8.5], [0, HEAD_TOP - 2 * VOXEL, 0]);
  addArmorParts(model, gear);
  buildHeld(gear, parts);
  model.root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return model;
}

function pickPeople(r) {
  let total = 0;
  for (const p of PEOPLES) {
    total += p.weight;
    if (r < total) return p;
  }
  return PEOPLES[0];
}

// A wide straw hat, in the same small cubes as the body (like every hat).
function strawHatGrid(color) {
  const g = new VoxelGrid(18, 6, 17).box(0, 0, 0, 18, 1, 17, color).box(1, 0, 1, 16, 1, 15, lighter(color, 0.08));
  g.box(4, 1, 4, 10, 4, 9, color).box(4, 1, 4, 10, 1, 9, 0x8a3a3a).box(5, 5, 5, 8, 1, 7, lighter(color, 0.12));
  return g;
}
