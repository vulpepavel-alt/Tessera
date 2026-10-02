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
    halfWidth: 0.55,
    height: 1.1,
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
