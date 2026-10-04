// Enemy types. Each biome will get at least three, plus a boss.
//
// AI behaviour (see entities/Enemy.js):
//   patrol  - wander around its home spot
//   chase   - run at you once you come within aggroRange
//   windup  - stop and glow red: a warning that an attack is coming (dodge now!)
//   attack  - the attack itself
//   retreat - flee when its health drops below retreatAt
//   return  - go home if pulled too far (leashRange), healing on the way

export const ENEMIES = {
  bramblehog: {
    name: 'Bramblehog',
    biomes: ['amberMeadows'],
    model: 'bramblehog',
    halfWidth: 0.6,
    height: 1.5,
    health: 34,
    healthPerLevel: 9,
    damage: 8,
    damagePerLevel: 1.6,
    walkSpeed: 2.5,
    runSpeed: 7,
    aggroRange: 13,
    leashRange: 38,
    retreatAt: 0.25,     // flee below 25% health ...
    retreatTime: 3.5,    // ... for this many seconds
    // Charge: a short warning, then a fast straight rush.
    attack: { kind: 'charge', range: 4, windup: 0.7, duration: 0.45, speed: 14, cooldown: 1.8, knockback: 9, recover: 0.7 },
    xp: 12,
  },

  duskwolf: {
    name: 'Duskwolf',
    biomes: ['amberMeadows'],
    model: 'duskwolf',
    halfWidth: 0.45,
    height: 1.4,
    health: 26,
    healthPerLevel: 7,
    damage: 7,
    damagePerLevel: 1.4,
    walkSpeed: 3,
    runSpeed: 8.5,
    aggroRange: 16,
    leashRange: 40,
    retreatAt: 0.15,
    retreatTime: 2.5,
    // Lunge: a quick crouch, then a short, fast bite.
    attack: { kind: 'lunge', range: 3, windup: 0.45, duration: 0.25, speed: 13, cooldown: 1.2, knockback: 6, recover: 0.45 },
    xp: 11,
  },

  meadowSlime: {
    name: 'Meadow Slime',
    biomes: ['amberMeadows'],
    model: 'meadowSlime',
    halfWidth: 0.55,
    height: 1.0,
    health: 20,
    healthPerLevel: 6,
    damage: 6,
    damagePerLevel: 1.2,
    walkSpeed: 1.8,
    runSpeed: 4.2,
    aggroRange: 10,
    leashRange: 30,
    retreatAt: 0, // never runs away
    retreatTime: 0,
    // Hop: squashes down, then leaps at you.
    attack: { kind: 'hop', range: 3.5, windup: 0.6, duration: 0.55, speed: 7, hop: 8, cooldown: 1.6, knockback: 7, recover: 0.8 },
    xp: 8,
  },
};

// The other biomes' creatures share the three attack styles above:
//   charge - a short warning, then a fast straight rush (boars, horned beasts, turtles)
//   lunge  - a quick crouch, then a short fast bite or sting (wolves, lizards, scorpions)
//   hop    - squash down, then leap at you (slimes, toads, rocklings)
const CHARGE = { kind: 'charge', range: 4, windup: 0.7, duration: 0.45, speed: 14, cooldown: 1.8, knockback: 9, recover: 0.7 };
const LUNGE = { kind: 'lunge', range: 3, windup: 0.45, duration: 0.25, speed: 13, cooldown: 1.2, knockback: 6, recover: 0.45 };
const HOP = { kind: 'hop', range: 3.5, windup: 0.6, duration: 0.55, speed: 7, hop: 8, cooldown: 1.6, knockback: 7, recover: 0.8 };

// name, biome, size (halfWidth, height), health, damage, speeds, attack, xp.
// Health and damage grow per level from these level-1 values.
function creature(name, biome, model, { halfWidth, height, health, damage, walk, run, attack, retreatAt = 0.15, xp = 12 }) {
  return {
    name, biomes: [biome], model, halfWidth, height,
    health, healthPerLevel: Math.round(health * 0.25), damage, damagePerLevel: damage * 0.2,
    walkSpeed: walk, runSpeed: run, aggroRange: 14, leashRange: 38, retreatAt, retreatTime: 2.5,
    attack, xp,
  };
}

Object.assign(ENEMIES, {
  frostWolf: creature('Frost Wolf', 'crystalfrostForest', 'frostWolf', { halfWidth: 0.45, height: 1.4, health: 26, damage: 7, walk: 3, run: 8.5, attack: LUNGE }),
  frostSlime: creature('Frost Slime', 'crystalfrostForest', 'frostSlime', { halfWidth: 0.55, height: 1.0, health: 20, damage: 6, walk: 1.8, run: 4.2, attack: HOP, retreatAt: 0, xp: 8 }),
  snowhorn: creature('Snowhorn', 'crystalfrostForest', 'snowhorn', { halfWidth: 0.55, height: 1.5, health: 36, damage: 8, walk: 2.5, run: 7.5, attack: CHARGE, xp: 14 }),
  duneSlime: creature('Dune Slime', 'copperDunes', 'duneSlime', { halfWidth: 0.55, height: 1.0, health: 20, damage: 6, walk: 1.8, run: 4.2, attack: HOP, retreatAt: 0, xp: 8 }),
  sandScorpion: creature('Sand Scorpion', 'copperDunes', 'sandScorpion', { halfWidth: 0.6, height: 1.0, health: 30, damage: 8, walk: 2.6, run: 7, attack: LUNGE, xp: 13 }),
  sunLizard: creature('Sun Lizard', 'copperDunes', 'sunLizard', { halfWidth: 0.45, height: 0.9, health: 24, damage: 7, walk: 3.2, run: 9, attack: LUNGE }),
  bogSlime: creature('Bog Slime', 'lanternMarsh', 'bogSlime', { halfWidth: 0.55, height: 1.0, health: 20, damage: 6, walk: 1.8, run: 4.2, attack: HOP, retreatAt: 0, xp: 8 }),
  marshToad: creature('Marsh Toad', 'lanternMarsh', 'marshToad', { halfWidth: 0.7, height: 1.1, health: 32, damage: 7, walk: 2, run: 5, attack: HOP, retreatAt: 0, xp: 12 }),
  mireSnapper: creature('Mire Snapper', 'lanternMarsh', 'mireSnapper', { halfWidth: 0.65, height: 1.0, health: 40, damage: 9, walk: 1.8, run: 5.5, attack: CHARGE, xp: 15 }),
  stormWolf: creature('Storm Wolf', 'stormspirePeaks', 'stormWolf', { halfWidth: 0.45, height: 1.4, health: 26, damage: 7, walk: 3, run: 9, attack: LUNGE }),
  cragHorn: creature('Craghorn', 'stormspirePeaks', 'cragHorn', { halfWidth: 0.55, height: 1.5, health: 36, damage: 8, walk: 2.5, run: 7.5, attack: CHARGE, xp: 14 }),
  rockling: creature('Rockling', 'stormspirePeaks', 'rockling', { halfWidth: 0.6, height: 1.1, health: 44, damage: 10, walk: 1.5, run: 3.8, attack: HOP, retreatAt: 0, xp: 16 }),
});

export const SPAWNING = {
  maxDay: 6,          // enemies alive around you by day
  maxNight: 10,       // ... and at night
  nightLevelBonus: 2, // night enemies are this many levels stronger
  minDistance: 28,    // spawn this far from you ...
  maxDistance: 55,    // ... up to this far
  despawnDistance: 95,
  interval: 1.2,      // seconds between spawn attempts
};
