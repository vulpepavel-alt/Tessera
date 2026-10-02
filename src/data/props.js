// The list of small decorative models ("props"). The chunk workers place them
// by number (the position in this list), the game draws them by name
// (models/props.js). Add new props at the end.

export const PROP_TYPES = [
  'flowerPot', 'vase', 'table', 'chair', 'bench', 'barrel', 'crate', 'weaponRack', 'armorStand',
  'fruitBasket', 'sack', 'rock', 'mushroom', 'log', 'signpost', 'door', 'shutter', 'bed', 'pumpkin',
  'berryBush', 'bigRock', 'planter',
];

export const PROP = Object.fromEntries(PROP_TYPES.map((name, i) => [name, i]));
