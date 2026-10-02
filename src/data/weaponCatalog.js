// The big weapon catalogue: every weapon kind in five materials and five
// shape variants (like classic voxel RPGs, where two iron swords can look
// different). Ids look like "iron-longsword-3". The hand-made named weapons
// in data/items.js stay as they are.
//
//   kind     how it fights (data/combat.js WEAPON_COMBAT)
//   model    how it looks (models/equipment/weaponModels.js)
//   classes  who can use it

export const WEAPON_MATERIALS = {
  wood: { name: 'Wooden', tier: 1, metal: 0x9a6a3a },
  iron: { name: 'Iron', tier: 3, metal: 0x9aa4b4 },
  silver: { name: 'Silver', tier: 4, metal: 0xe2e8f2 },
  gold: { name: 'Golden', tier: 5, metal: 0xffcc3a },
  obsidian: { name: 'Obsidian', tier: 6, metal: 0x3e3456, glow: 0xa87aff },
};

export const WEAPON_KINDS = {
  // Warrior
  sword: { name: 'Sword', kind: 'blade', model: 'sword', slot: 'mainHand', classes: ['bulwark'] },
  saber: { name: 'Saber', kind: 'blade', model: 'saber', slot: 'mainHand', classes: ['bulwark'] },
  axe: { name: 'Axe', kind: 'blade', model: 'axe', slot: 'mainHand', classes: ['bulwark'] },
  mace: { name: 'Mace', kind: 'blade', model: 'mace', slot: 'mainHand', classes: ['bulwark'] },
  greatsword: { name: 'Greatsword', kind: 'great', model: 'greatsword', slot: 'mainHand', classes: ['bulwark'] },
  greataxe: { name: 'Greataxe', kind: 'great', model: 'greataxe', slot: 'mainHand', classes: ['bulwark'] },
  greatmace: { name: 'Greatmace', kind: 'great', model: 'greatmace', slot: 'mainHand', classes: ['bulwark'] },
  shield: { name: 'Shield', kind: 'shield', model: 'roundShield', slot: 'offHand', classes: ['bulwark'] },
  // Ranger
  bow: { name: 'Bow', kind: 'bow', model: 'longbow', slot: 'mainHand', classes: ['windstrider'] },
  crossbow: { name: 'Crossbow', kind: 'crossbow', model: 'crossbow', slot: 'mainHand', classes: ['windstrider'] },
  boomerang: { name: 'Boomerang', kind: 'bow', model: 'boomerang', slot: 'mainHand', classes: ['windstrider'] },
  // Rogue
  dagger: { name: 'Dagger', kind: 'dagger', model: 'dagger', slot: 'mainHand', classes: ['shade'] },
  longsword: { name: 'Longsword', kind: 'blade', model: 'longsword', slot: 'mainHand', classes: ['shade'] },
  fist: { name: 'Fist', kind: 'fists', model: 'fist', slot: 'mainHand', classes: ['shade'] },
  // Mage
  staff: { name: 'Staff', kind: 'staff', model: 'staff', slot: 'mainHand', classes: ['starweaver'] },
  wand: { name: 'Wand', kind: 'wand', model: 'wand', slot: 'mainHand', classes: ['starweaver'] },
  bracelet: { name: 'Bracelet', kind: 'wand', model: 'bracelet', slot: 'mainHand', classes: ['starweaver'] },
};

export const VARIANTS = 5;

// Every generated weapon, as item records for data/items.js.
export function catalogueWeapons() {
  const list = [];
  for (const [kindId, k] of Object.entries(WEAPON_KINDS)) {
    for (const [matId, m] of Object.entries(WEAPON_MATERIALS)) {
      for (let v = 0; v < VARIANTS; v++) {
        list.push({
          id: `${matId}-${kindId}-${v + 1}`, name: `${m.name} ${k.name}`,
          slot: k.slot, kind: k.kind, model: k.model, classes: k.classes,
          tier: m.tier, metal: m.metal, glow: m.glow, variant: v,
        });
      }
    }
  }
  return list;
}
