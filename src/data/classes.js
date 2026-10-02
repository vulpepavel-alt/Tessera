// The four playable classes: names, descriptions, health and the class
// resource (rage / energy / mana). The class sets abilities and progression,
// not looks: everyone starts in plain clothes, with no armour or weapon.
// (The internal ids - bulwark, windstrider, starweaver, shade - stay the same
// so old saves keep working.) "look" colours are only used by the glider and
// small effects.

export const CLASSES = {
  bulwark: {
    name: 'Warrior',
    role: 'Heavy melee',
    description: 'A wall of steel. Shrugs off blows, holds the line and hits back hard.',
    health: 140,
    resource: { name: 'Rage', max: 100, color: '#e2553f', startsFull: false },
    specs: [
      { id: 'ironwall', name: 'Ironwall', description: 'Defense and taunts. Keeps enemies on you, not your friends.' },
      { id: 'ravager', name: 'Ravager', description: 'Builds rage to unleash crushing damage.' },
    ],
    look: { armor: 0x8f98a6, trim: 0xd8b25a, cloth: 0x4b5f86, boots: 0x4a3a2c, weapon: 'greatsword' },
  },

  windstrider: {
    name: 'Ranger',
    role: 'Ranged',
    description: 'A swift archer of the open plains. Strikes from afar and never stands still.',
    health: 100,
    resource: { name: 'Energy', max: 100, color: '#f2c94c', startsFull: true },
    specs: [
      { id: 'longshot', name: 'Longshot', description: 'Charged, precise shots that hit from great distance.' },
      { id: 'pathfinder', name: 'Pathfinder', description: 'Mobility and traps. Controls the battlefield.' },
    ],
    look: { armor: 0x7a5a3a, trim: 0xc9a46a, cloth: 0x3f8f4f, boots: 0x5a4030, weapon: 'bow' },
  },

  starweaver: {
    name: 'Mage',
    role: 'Magic',
    description: 'Shapes starlight into fire and water. Fragile, but devastating.',
    health: 90,
    resource: { name: 'Mana', max: 120, color: '#4d8ff0', startsFull: true },
    specs: [
      { id: 'emberheart', name: 'Emberheart', description: 'Fire magic. Burns everything in sight.' },
      { id: 'tidecaller', name: 'Tidecaller', description: 'Water magic. Heals and protects.' },
    ],
    look: { armor: 0x4a3f8f, trim: 0xe8d27a, cloth: 0x6c5ad1, boots: 0x3a2f5a, weapon: 'staff' },
  },

  shade: {
    name: 'Rogue',
    role: 'Fast melee',
    description: 'A blur of blades from the shadows. Hits fast, hits first, then vanishes.',
    health: 105,
    resource: { name: 'Energy', max: 100, color: '#f2c94c', startsFull: true },
    specs: [
      { id: 'nightblade', name: 'Nightblade', description: 'Critical hits and deadly bursts of damage.' },
      { id: 'mistdancer', name: 'Mistdancer', description: 'Evasion and stealth. Untouchable.' },
    ],
    look: { armor: 0x2f2a3a, trim: 0xb03a48, cloth: 0x473a5c, boots: 0x231f2a, weapon: 'daggers' },
  },
};

// The plain clothes everyone starts in (the colours can be changed at
// character creation). No class starts with armour or a weapon: those are
// found, earned and bought on the journey.
export const STARTER_CLOTHES = { outfitColor: 0xe8dcc0, accentColor: 0x8a6a3a, pantsColor: 0x6e5a3a, bootsColor: 0x5a3e28 };

// What each class can use, shown on the class screen.
export const CLASS_GEAR_TEXT = {
  bulwark: { weapons: 'Clubs, swords, axes, hammers, greatswords and shields', armour: 'Cloth, leather, chain, iron, steel and rare plate' },
  windstrider: { weapons: 'Shortbows, longbows, recurve bows and crossbows', armour: 'Cloth, leather, hunter gear and reinforced leather' },
  starweaver: { weapons: 'Wands, staffs, spell tomes and orbs', armour: 'Cloth and robes' },
  shade: { weapons: 'Daggers, shortswords, two at once', armour: 'Cloth, leather, hoods and light armour' },
};

export const CLASS_ORDER = ['bulwark', 'windstrider', 'starweaver', 'shade'];

// Choices on the character creation screen.
export const SKIN_TONES = [0xffe0c8, 0xf3d2b3, 0xe0b48e, 0xc8946a, 0xa06a42, 0x6e4630, 0x8fd06a, 0x8ab8f0, 0xc8a0f0];
export const HAIR_COLORS = [0x2a1e16, 0x6a3e1e, 0xb8702a, 0xf2d040, 0xe8401a, 0xe8ecf4, 0x2f6ae8, 0xe050b0, 0x2fc0a0, 0x8a4ae0];
export const EYE_COLORS = [0x2f7fff, 0x2fbf4a, 0x8a5a2b, 0x9a4cff, 0xff3a3a, 0x1fc8d0, 0xffb020];
export const EAR_TYPES = ['round', 'pointy', 'long'];
export const OUTFIT_COLORS = [0xe8dcc0, 0xe0402a, 0x2f7fe8, 0x3fb84a, 0xf2c230, 0x9a4ad8, 0xf07a2a, 0x1fb8b0, 0xe8508a, 0x3a3a48, 0xf4f1ea];
export const ACCENT_COLORS = [0x8a6a3a, 0xffcc33, 0xf4f1ea, 0xe0402a, 0x2f7fe8, 0x3fb84a, 0x1a1622];
export const PANTS_COLORS = [0x6e5a3a, 0x2f4a8a, 0x3a3a48, 0xf4f1ea, 0x2f5a2f, 0x8a3a3a];
export const BOOT_COLORS = [0x5a3e28, 0x2a2632, 0x8a5a2b, 0x9a2a2a, 0x2a4a8a];

// Suggested names (all original) for the "random name" button.
export const NAME_IDEAS = [
  'Arlen', 'Brisa', 'Corvin', 'Dalia', 'Eskel', 'Fenna', 'Galen', 'Hesper', 'Ilwyn', 'Joryn',
  'Kestrel', 'Liora', 'Maren', 'Nyx', 'Oren', 'Pell', 'Quill', 'Rhosyn', 'Sable', 'Tamsin',
];
