// Builds the player's voxel character with the shared humanoid builder
// (humanoid.js). All four classes share the same body. The class does NOT
// change how you look: everyone starts in the plain clothes chosen at
// character creation, with no armour and no weapon. Every equipped item
// (data/items.js) then shows on the model, piece by piece:
//   models/equipment/armor.js    head, chest, hands, legs, feet, back
//   models/equipment/weapons.js  main hand and off hand
//
//   root  - placed at the feet, turned to face the walking direction
//   body  - pivot at the belly, tilted for leaning and spun for dodge rolls
//   parts - head, torso, armL, armR, legL, legR

import { buildHumanoid, VOXEL } from './humanoid.js';
import { resolveEquipment } from '../data/items.js';
import { applyArmor, addArmorParts } from './equipment/armor.js';
import { buildHeld } from './equipment/weapons.js';

export { VOXEL };

// look: the appearance chosen at character creation.
// options.equipment: { slot: itemId } of everything worn and held.
// options.bareHead: draw the head without headgear (for the HUD portrait);
//   it also leaves out held items and anything on the back.
export function buildCharacter(classId, look, { equipment = {}, bareHead = false } = {}) {
  const gear = resolveEquipment(equipment);
  const spec = {
    skin: look.skinTone ?? 0xf3d2b3,
    hair: look.hairColor ?? 0x6a3e1e,
    hairStyle: look.hairStyle ?? 'short',
    eyes: look.eyeColor ?? 0x2f7fff,
    eyeStyle: look.eyeStyle ?? 'round',
    brows: look.brows ?? 'thin',
    mouth: look.mouth ?? 'smile',
    blush: look.blush ?? true,
    freckles: look.freckles ?? false,
    facialHair: look.facialHair ?? 'none',
    ears: look.ears ?? 'round',
    // The plain starting clothes, in the style and colours chosen at creation.
    outfitStyle: look.outfitStyle ?? 'tunic',
    shirt: look.outfitColor ?? 0xe8dcc0,
    trim: look.accentColor ?? 0xffcc33,
    accent: look.accentColor ?? 0xffcc33,
    pants: look.pantsColor ?? 0x6e5a3a,
    boots: look.bootsColor ?? 0x5a3e28,
    hands: null,
  };
  applyArmor(spec, gear, bareHead);

  const model = buildHumanoid(spec);
  addArmorParts(model, bareHead ? { head: gear.head, chest: gear.chest } : gear, bareHead);
  if (!bareHead) buildHeld(gear, model.parts);
  model.root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return model;
}
