// Every piece of equipment in the game: armour, weapons and things worn on the
// back. Nobody starts with any of it: equipment is found, earned or bought on
// the journey, and every worn piece shows on the character model.
//
// An item is looked up by its id (saves store only ids):
//   ITEMS['iron-chest'] -> { id, name, slot, tier, rarity, ... }
//
// tier: 1 (first finds) ... 7 (legendary). It sets the item's strength.

export const SLOTS = ['head', 'face', 'chest', 'shoulders', 'hands', 'waist', 'legs', 'feet', 'back', 'mainHand', 'offHand'];
export const SLOT_NAMES = {
  head: 'Head', face: 'Face', chest: 'Chest', shoulders: 'Shoulders', hands: 'Hands', waist: 'Waist',
  legs: 'Legs', feet: 'Feet', back: 'Back', mainHand: 'Main hand', offHand: 'Off hand',
};

export const RARITY = {
  common: { name: 'Common', color: '#e8ecf4' },
  uncommon: { name: 'Uncommon', color: '#6fdc5a' },
  rare: { name: 'Rare', color: '#4d8ff0' },
  epic: { name: 'Epic', color: '#b46cff' },
  legendary: { name: 'Legendary', color: '#ffc83a' },
};

// Rarity by tier, unless a material says otherwise.
const TIER_RARITY = [null, 'common', 'common', 'uncommon', 'uncommon', 'rare', 'epic', 'legendary'];

// ---- Armour -----------------------------------------------------------
// style decides how the pieces look on the model (models/equipment/armor.js):
//   cloth   soft clothes and a cap
//   leather leather with straps and stitches (hunters wear hoods)
//   mail    chain mail: a checked pattern, a coif on the head
//   plate   metal plates with rivets, shoulder pads that widen the body, helmets
//   light   dark close-fitting clothes, a hood and a face mask (rogues)
//   robe    long robes with a skirt and a pointed hat (mages)
// base / trim: the two main colours. glow: a shining gem colour (rare pieces).
export const MATERIALS = {
  cloth: { name: 'Cloth', tier: 1, style: 'cloth', base: 0xc9a46a, trim: 0x7a5a32 },
  leather: { name: 'Leather', tier: 2, style: 'leather', base: 0x93592f, trim: 0x5e3a1f },
  chain: { name: 'Chain', tier: 3, style: 'mail', base: 0xaab3c2, trim: 0x6b7384 },
  iron: { name: 'Iron', tier: 4, style: 'plate', base: 0x8d97a8, trim: 0x5b6474 },
  steel: { name: 'Steel', tier: 5, style: 'plate', base: 0xd2dbe8, trim: 0x2f5fd0 },
  runed: { name: 'Runed', tier: 6, style: 'plate', base: 0x2f58cc, trim: 0xffc83a, glow: 0x8ff4ff },
  sunforged: { name: 'Sunforged', tier: 7, style: 'plate', base: 0xffc83a, trim: 0x2448b8, glow: 0xfff6b0, big: true },
  hunter: { name: 'Hunter', tier: 3, style: 'leather', base: 0x4f8a3a, trim: 0x6e4a2a, hood: true },
  reinforced: { name: 'Reinforced', tier: 4, style: 'leather', base: 0x6f4a2a, trim: 0xb8c0cc, studs: true, hood: true },
  windrunner: { name: 'Windrunner', tier: 6, style: 'leather', base: 0x22a878, trim: 0xffc83a, glow: 0xb8fff0, hood: true },
  shadow: { name: 'Shadow', tier: 3, style: 'light', base: 0x3c3654, trim: 0x9a2c40 },
  nightsilk: { name: 'Nightsilk', tier: 6, style: 'light', base: 0x1d1a40, trim: 0x2f5fd0, glow: 0x9ab8ff },
  silk: { name: 'Silk', tier: 3, style: 'robe', base: 0x4a6ad8, trim: 0xf2e6c0 },
  arcane: { name: 'Arcane', tier: 5, style: 'robe', base: 0x6a3ad0, trim: 0xffc83a },
  starwoven: { name: 'Starwoven', tier: 7, style: 'robe', base: 0x1c3aa8, trim: 0xffd84a, glow: 0xfff2a0, big: true },
};

// Which armour each class can wear, from first finds to the best.
export const ARMOR_LINES = {
  bulwark: ['cloth', 'leather', 'chain', 'iron', 'steel', 'runed', 'sunforged'],
  windstrider: ['cloth', 'leather', 'hunter', 'reinforced', 'windrunner'],
  shade: ['cloth', 'leather', 'shadow', 'nightsilk'],
  starweaver: ['cloth', 'silk', 'arcane', 'starwoven'],
};

const PIECE_NAMES = {
  cloth: { head: 'Cap', chest: 'Shirt', hands: 'Gloves', legs: 'Trousers', feet: 'Shoes' },
  leather: { head: 'Cap', chest: 'Jerkin', hands: 'Gloves', legs: 'Leggings', feet: 'Boots' },
  mail: { head: 'Coif', chest: 'Hauberk', hands: 'Mittens', legs: 'Chausses', feet: 'Boots' },
  plate: { head: 'Helm', chest: 'Breastplate', hands: 'Gauntlets', legs: 'Greaves', feet: 'Sabatons' },
  light: { head: 'Hood', chest: 'Vest', hands: 'Wraps', legs: 'Leggings', feet: 'Boots' },
  robe: { head: 'Hat', chest: 'Robe', hands: 'Gloves', legs: 'Leggings', feet: 'Slippers' },
};
const ARMOR_SLOTS = ['head', 'chest', 'hands', 'legs', 'feet'];
// Pauldrons exist for the sturdier armour styles only.
const SHOULDER_NAMES = { leather: 'Pauldrons', mail: 'Mantle', plate: 'Pauldrons' };

// ---- Weapons ------------------------------------------------------------
// kind: how it attacks (data/combat.js WEAPON_COMBAT). model: how it looks
// (models/equipment/weapons.js). metal: blade / head colour.
const WEAPON_LIST = [
  // Warrior
  { id: 'club', name: 'Wooden Club', slot: 'mainHand', kind: 'blade', model: 'club', tier: 1, classes: ['bulwark'] },
  { id: 'sword', name: 'Plain Sword', slot: 'mainHand', kind: 'blade', model: 'sword', tier: 2, metal: 0xc8ced8, classes: ['bulwark'] },
  { id: 'iron-sword', name: 'Iron Sword', slot: 'mainHand', kind: 'blade', model: 'sword', tier: 3, metal: 0x9aa4b4, classes: ['bulwark'] },
  { id: 'axe', name: 'Battle Axe', slot: 'mainHand', kind: 'blade', model: 'axe', tier: 3, metal: 0xb4bcc8, classes: ['bulwark'] },
  { id: 'hammer', name: 'War Hammer', slot: 'mainHand', kind: 'great', model: 'hammer', tier: 4, metal: 0x8d97a8, classes: ['bulwark'] },
  { id: 'greatsword', name: 'Steel Greatsword', slot: 'mainHand', kind: 'great', model: 'greatsword', tier: 5, metal: 0xe2e8f2, classes: ['bulwark'] },
  { id: 'sunblade', name: 'Sunforged Blade', slot: 'mainHand', kind: 'great', model: 'greatsword', tier: 7, metal: 0xffd84a, glow: 0xfff6b0, classes: ['bulwark'] },
  { id: 'wood-shield', name: 'Wooden Shield', slot: 'offHand', kind: 'shield', model: 'roundShield', tier: 1, metal: 0x9a6a3a, classes: ['bulwark'] },
  { id: 'iron-shield', name: 'Iron Shield', slot: 'offHand', kind: 'shield', model: 'roundShield', tier: 3, metal: 0x8d97a8, classes: ['bulwark'] },
  { id: 'kite-shield', name: 'Steel Kite Shield', slot: 'offHand', kind: 'shield', model: 'kiteShield', tier: 5, metal: 0x2f5fd0, classes: ['bulwark'] },
  { id: 'sun-shield', name: 'Sunforged Aegis', slot: 'offHand', kind: 'shield', model: 'kiteShield', tier: 7, metal: 0xffc83a, glow: 0xfff6b0, classes: ['bulwark'] },
  // Ranger
  { id: 'shortbow', name: 'Shortbow', slot: 'mainHand', kind: 'bow', model: 'shortbow', tier: 1, classes: ['windstrider'] },
  { id: 'longbow', name: 'Longbow', slot: 'mainHand', kind: 'bow', model: 'longbow', tier: 3, classes: ['windstrider'] },
  { id: 'recurve', name: 'Recurve Bow', slot: 'mainHand', kind: 'bow', model: 'recurve', tier: 4, metal: 0x2f5fd0, classes: ['windstrider'] },
  { id: 'crossbow', name: 'Crossbow', slot: 'mainHand', kind: 'crossbow', model: 'crossbow', tier: 5, metal: 0xb4bcc8, classes: ['windstrider'] },
  { id: 'galebow', name: 'Galecaller Bow', slot: 'mainHand', kind: 'bow', model: 'recurve', tier: 7, metal: 0xffc83a, glow: 0xb8fff0, classes: ['windstrider'] },
  // Rogue
  { id: 'dagger', name: 'Dagger', slot: 'mainHand', kind: 'dagger', model: 'dagger', tier: 1, metal: 0xc8ced8, classes: ['shade'] },
  { id: 'parry-dagger', name: 'Parrying Dagger', slot: 'offHand', kind: 'dagger', model: 'dagger', tier: 2, metal: 0xc8ced8, classes: ['shade'] },
  { id: 'shortsword', name: 'Shortsword', slot: 'mainHand', kind: 'dagger', model: 'shortsword', tier: 3, metal: 0xd2dbe8, classes: ['shade'] },
  { id: 'off-shortsword', name: 'Offhand Shortsword', slot: 'offHand', kind: 'dagger', model: 'shortsword', tier: 4, metal: 0xd2dbe8, classes: ['shade'] },
  { id: 'nightfang', name: 'Nightfang', slot: 'mainHand', kind: 'dagger', model: 'shortsword', tier: 7, metal: 0x2f5fd0, glow: 0x9ab8ff, classes: ['shade'] },
  // Mage
  { id: 'wand', name: 'Wand', slot: 'mainHand', kind: 'wand', model: 'wand', tier: 1, glow: 0x8ff4ff, classes: ['starweaver'] },
  { id: 'staff', name: 'Oak Staff', slot: 'mainHand', kind: 'staff', model: 'staff', tier: 2, glow: 0x8ff4ff, classes: ['starweaver'] },
  { id: 'crystal-staff', name: 'Crystal Staff', slot: 'mainHand', kind: 'staff', model: 'staff', tier: 4, glow: 0xc08aff, classes: ['starweaver'] },
  { id: 'star-staff', name: 'Staff of the First Star', slot: 'mainHand', kind: 'staff', model: 'staff', tier: 7, glow: 0xffe066, metal: 0xffc83a, classes: ['starweaver'] },
  { id: 'tome', name: 'Spell Tome', slot: 'offHand', kind: 'focus', model: 'tome', tier: 2, metal: 0x2f5fd0, classes: ['starweaver'] },
  { id: 'orb', name: 'Seeing Orb', slot: 'offHand', kind: 'focus', model: 'orb', tier: 4, glow: 0x8ff4ff, classes: ['starweaver'] },
];

// ---- Worn on the back ------------------------------------------------------
const BACK_LIST = [
  { id: 'travel-cape', name: 'Travel Cape', slot: 'back', model: 'cape', tier: 1, base: 0x9a3a2a, trim: 0xdcc9a0 },
  { id: 'backpack', name: 'Backpack', slot: 'back', model: 'backpack', tier: 1, base: 0x93592f, trim: 0x5e3a1f },
  { id: 'quiver', name: 'Quiver', slot: 'back', model: 'quiver', tier: 1, base: 0x6b4a2e, trim: 0xf2eee2, classes: ['windstrider'] },
  { id: 'royal-cape', name: 'Royal Cape', slot: 'back', model: 'cape', tier: 6, base: 0x2448b8, trim: 0xffc83a },
];

// ---- Face and waist ---------------------------------------------------------
const FACE_WAIST_LIST = [
  { id: 'goggles', name: 'Explorer Goggles', slot: 'face', model: 'goggles', tier: 1, base: 0xb8863a, trim: 0x6ad0f0 },
  { id: 'scarf', name: 'Dust Scarf', slot: 'face', model: 'scarf', tier: 1, base: 0xb83a3a, trim: 0x7a2424 },
  { id: 'rope-belt', name: 'Rope Belt', slot: 'waist', model: 'belt', tier: 1, base: 0xc8b07a, trim: 0x8a6a3a },
  { id: 'leather-belt', name: 'Leather Belt', slot: 'waist', model: 'belt', tier: 2, base: 0x6a3e1f, trim: 0xc8963c, pouch: true },
  { id: 'sword-belt', name: 'Sword Belt', slot: 'waist', model: 'belt', tier: 3, base: 0x4a2e18, trim: 0xd2dbe8, scabbard: true },
  { id: 'gold-sash', name: 'Golden Sash', slot: 'waist', model: 'sash', tier: 6, base: 0xffc83a, trim: 0x2448b8 },
];

// ---- The catalogue -------------------------------------------------------
export const ITEMS = {};

for (const [material, m] of Object.entries(MATERIALS)) {
  const classes = Object.keys(ARMOR_LINES).filter((c) => ARMOR_LINES[c].includes(material));
  for (const slot of ARMOR_SLOTS) {
    add({
      id: `${material}-${slot}`, name: `${m.name} ${PIECE_NAMES[m.style][slot]}`, slot, material,
      tier: m.tier, classes, armor: m.tier * (slot === 'chest' ? 3 : slot === 'legs' ? 2 : 1),
    });
  }
  if (SHOULDER_NAMES[m.style]) {
    add({ id: `${material}-shoulders`, name: `${m.name} ${SHOULDER_NAMES[m.style]}`, slot: 'shoulders', material, tier: m.tier, classes, armor: m.tier });
  }
}
for (const w of WEAPON_LIST) add(w);
for (const b of BACK_LIST) add({ classes: null, ...b });
for (const f of FACE_WAIST_LIST) add({ classes: null, ...f });

function add(item) {
  ITEMS[item.id] = { rarity: TIER_RARITY[item.tier], power: 1 + (item.tier - 1) * 0.3, ...item };
}

// The items in `equipment` ({ slot: itemId }) as item objects ({ slot: item }).
export function resolveEquipment(equipment = {}) {
  const out = {};
  for (const slot of SLOTS) {
    const item = ITEMS[equipment?.[slot]];
    if (item && item.slot === slot) out[slot] = item;
  }
  return out;
}

// Can this class use the item? (null classes = everyone)
export function canUse(item, classId) {
  return !item.classes || item.classes.includes(classId);
}
