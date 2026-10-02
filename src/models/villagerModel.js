// Builds a villager from a seed, so the same villager always looks the same
// (spec section 10). Villagers use EXACTLY the player's construction
// (models/humanoid.js): the same body, races, palettes, face grid, hair system,
// skeleton and sockets. They differ by race, colours, face preset, hairstyle,
// facial hair, clothing modules (vest, jacket, robe, apron, sash), hats,
// equipment and a small uniform height difference.
// Guards wear real iron equipment from the item list.

import { VoxelGrid } from './VoxelGrid.js';
import { buildHumanoid, resolveLook, hideHair, lighter } from './humanoid.js';
import { resolveEquipment } from '../data/items.js';
import { applyArmor, addArmorParts, HAT_W, HAT_D, HAT_PIVOT } from './equipment/armor.js';
import { buildHeld } from './equipment/weapons.js';
import { RACES, VILLAGER_RACES } from '../data/races.js';
import { HAIR_PALETTES, HAIR_STYLES, FACE_PRESETS, FACIAL_HAIR, EYE_PALETTE, CLOTH_DYES, UNDERLAYERS } from '../data/appearance.js';
import { NPC_SCALE } from '../data/characterSpec.js';
import { VILLAGER_LOOKS } from '../data/villages.js';
import { mulberry32 } from '../world/random.js';

const APRONS = { weaponsmith: 0x5a3a22, armorer: 0x6e6e78, merchant: 0xe8d8b0 };
const GUARD_GEAR = { head: 'iron-head', chest: 'iron-chest', hands: 'iron-hands', feet: 'iron-feet', mainHand: 'iron-sword', offHand: 'iron-shield' };

export function buildVillager(lookSeed, role) {
  const rng = mulberry32(Math.floor(lookSeed * 4294967296));
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const raceId = pickWeighted(VILLAGER_RACES, rng());
  const race = RACES[raceId];

  const appearance = {
    schemaVersion: 2,
    race: raceId,
    skin: pick(race.skins),
    hairStyle: pick(HAIR_STYLES),
    hairColor: pick(rng() < 0.75 ? HAIR_PALETTES.slice(0, 12) : HAIR_PALETTES).id,
    eyeColor: pick(EYE_PALETTE),
    face: pick(Object.keys(FACE_PRESETS)),
    facialHair: race.facialHair ?? (rng() < 0.25 ? pick(FACIAL_HAIR.slice(1)) : 'none'),
    overlays: [rng() < 0.5 ? 'rosy_cheeks' : null, rng() < 0.2 ? 'freckles_light' : null, raceId === 'undead' ? 'stitches' : null].filter(Boolean),
    underlayer: pick(UNDERLAYERS),
    underColor: pick(CLOTH_DYES),
    underColor2: pick(CLOTH_DYES),
    // Uniform height variation (spec: 0.9 - 1.1), on top of the race's usual size.
    scale: NPC_SCALE[0] + 0.05 + rng() * (NPC_SCALE[1] - NPC_SCALE[0] - 0.1),
  };
  const r = resolveLook(appearance);

  // Clothing modules over the underlayer.
  const shirt = pick(VILLAGER_LOOKS.shirt);
  r.clothing = {
    style: role === 'villager' ? pick(['vest', 'jacket', null, null]) : null,
    color: shirt,
    trim: pick(VILLAGER_LOOKS.shirt),
    apron: APRONS[role] ?? null,
    sash: role === 'villager' && rng() < 0.3 ? pick(VILLAGER_LOOKS.shirt) : null,
  };
  if (role === 'villager' || role in APRONS) r.under1 = lighter(shirt, 0.15);
  if (role === 'guildmaster') {
    r.clothing = { style: 'robe', color: 0x4a3f8f, trim: 0xffcc33, sash: 0xffcc33 };
    if (race.hair) r.facialHair = 'full_beard';
  }
  if (role === 'villager' && race.hair && rng() < 0.25) {
    r.hats.push({ grid: strawHatGrid(pick(VILLAGER_LOOKS.hat)), pivot: HAT_PIVOT, sink: 2 });
    hideHair(r, 'hat');
  }

  // Guards wear real equipment from the item list, exactly like the player would.
  const gear = role === 'guard' ? resolveEquipment(GUARD_GEAR) : {};
  applyArmor(r, gear);
  const model = buildHumanoid(r);
  addArmorParts(model, gear);
  buildHeld(gear, model);
  return model;
}

function pickWeighted(list, roll) {
  let total = 0;
  for (const [id, weight] of list) {
    total += weight;
    if (roll < total) return id;
  }
  return list[0][0];
}

// A wide straw hat, in the same small cubes as the body (like every hat).
function strawHatGrid(color) {
  const W = HAT_W;
  const D = HAT_D;
  const g = new VoxelGrid(W, 6, D).box(0, 0, 0, W, 1, D, color).box(1, 0, 1, W - 2, 1, D - 2, lighter(color, 0.08));
  g.box(3, 1, 3, W - 6, 4, D - 6, color).box(3, 1, 3, W - 6, 1, D - 6, 0x8a3a3a).box(4, 5, 4, W - 8, 1, D - 8, lighter(color, 0.12));
  return g;
}
