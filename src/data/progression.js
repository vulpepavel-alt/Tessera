// Levels, XP and loot, the classic way: monsters give XP and gold, levels go
// up on their own and make you tougher and stronger, and some monsters drop
// gear for your class. Better areas (higher monster levels) drop better gear.

// XP needed to go from `level` to the next one.
// About 10 kills per level at the start, 15-25 deeper in the world.
export function xpToNext(level) {
  return Math.round(30 * level ** 1.1);
}

// Armour softens every hit you take: 20 armour = 4/5 of the damage, 60 = 3/5.
// (Gentle on purpose: monsters must stay dangerous at every level.)
export function armorFactor(armor) {
  return 100 / (100 + armor * 1.2);
}

export const LEVEL = {
  healthPerLevel: 0.12, // +12% of the class's base health per level
  damagePerLevel: 0.09, // +9% damage per level
  maxLevel: 60,
};

// XP a monster gives: its base XP, more for higher levels.
export function xpFor(enemyType, level) {
  return Math.round(enemyType.xp * (1 + (level - 1) * 0.15));
}

export const LOOT = {
  itemChance: 0.22,     // chance that a monster drops a piece of gear
  ownClassChance: 0.8,  // ... which is usually something your class can use
  coins: (level) => 2 + Math.round(level * 1.5 + Math.random() * (2 + level)),
  // Rarity rolls: how much better than the area's usual gear the drop is.
  rarityRolls: [
    { bonus: 0, weight: 60 }, // the area's usual quality
    { bonus: 1, weight: 25 },
    { bonus: 2, weight: 10 },
    { bonus: 3, weight: 4 },
    { bonus: 4, weight: 1 },
  ],
  // The usual item tier for a monster level (1 = first finds ... 7 = legendary).
  baseTier: (level) => Math.min(7, 1 + Math.floor(level / 10)),
  pickupRange: 1.8,     // E picks up gear this close
  coinRange: 1.4,       // gold is collected by walking over it
  lifetime: 180,        // seconds before an untouched drop disappears
};

// Rarity colours (white, green, blue, purple, yellow) and star counts.
export const RARITY_STARS = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };

// The level gap, the classic way: monsters above your level are much tougher
// than their numbers suggest. Each level they have over you cuts your damage
// to them by 14% and adds 15% to theirs; a level-20 monster against a level-1
// hero takes about a tenth of the damage and hits almost four times as hard.
// Monsters below your level go down a little faster and hurt a little less.
export function levelGapFactor(attacker, target) {
  const a = attacker?.level;
  const t = target?.level;
  if (!a || !t) return 1;
  const gap = t - a; // > 0: the target is stronger than the attacker
  if (attacker.team === 'player') return gap > 0 ? Math.max(0.08, 0.86 ** gap) : Math.min(1.4, 1 - gap * 0.04);
  return gap < 0 ? 1 + -gap * 0.15 : Math.max(0.5, 1 - gap * 0.05);
}
