// Builds the player's voxel character with the shared assembler
// (models/humanoid.js). The class does NOT change how you look: everyone
// starts in the neutral underlayer chosen at character creation, with every
// equipment slot empty. Each equipped item (data/items.js) then shows on the
// model, piece by piece:
//   models/equipment/armor.js    head, chest, hands, legs, feet, back
//   models/equipment/weapons.js  main hand and off hand (hand sockets)

import { buildHumanoid, resolveLook, VOXEL } from './humanoid.js';
import { resolveEquipment } from '../data/items.js';
import { appearanceOf } from '../data/appearanceMigration.js';
import { applyArmor, addArmorParts } from './equipment/armor.js';
import { buildHeld } from './equipment/weapons.js';

export { VOXEL };

// look: a save (old or new) or an appearance record.
// options.equipment: { slot: itemId } of everything worn and held.
// options.bareHead: no headgear, nothing held, nothing on the back (HUD portrait).
export function buildCharacter(classId, look, { equipment = {}, bareHead = false } = {}) {
  const gear = resolveEquipment(equipment);
  const r = resolveLook(appearanceOf(look));
  applyArmor(r, bareHead ? { ...gear, head: null, back: null } : gear, bareHead);
  const model = buildHumanoid(r);
  if (!bareHead) {
    addArmorParts(model, gear);
    buildHeld(gear, model);
  }
  return model;
}
