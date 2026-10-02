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

export const SPAWNING = {
  maxDay: 6,          // enemies alive around you by day
  maxNight: 10,       // ... and at night
  nightLevelBonus: 2, // night enemies are this many levels stronger
  minDistance: 28,    // spawn this far from you ...
  maxDistance: 55,    // ... up to this far
  despawnDistance: 95,
  interval: 1.2,      // seconds between spawn attempts
};
