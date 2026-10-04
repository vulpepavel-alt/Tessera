// Combat numbers, built around the classic voxel-RPG rhythm: short wind-ups,
// short recoveries, you keep moving while you fight, and monsters fall in a
// few hits.
//
// Normal attack (left click): a short repeating combo that depends on the
//   weapon - one-handed weapons alternate 2 swings, two-handed weapons swing
//   3 times (the last one knocks down), daggers and fists strike very fast,
//   bows and magic shoot quickly.
// Special attack (right click): hold to charge it with MP (the MP bar turns
//   pink), let go to strike. The more MP you put in, the harder it hits and
//   the likelier it knocks the enemy down. Rogues strike instantly with all
//   the MP they have.
//
// kind      - which animation and hit type: swing / thrust (melee), shoot / cast (projectiles), heavy
// damage    - one number per combo hit (the combo repeats)
// duration  - seconds each combo hit takes
// strikeAt  - when the hit lands, as a fraction of the duration (short wind-up)
// range/arc - melee reach (voxels) and width (degrees)
// knockback - how hard targets are pushed back
// knockdown - seconds the target is knocked down (stunned) by that hit

export const COMBAT = {
  critMultiplier: 1.75,
  comboWindow: 0.5,         // seconds after a hit in which the next click continues the combo
  hitStop: 0.045,           // tiny freeze when you land a hit (makes it feel punchy)
  heavyHitStop: 0.1,
  finisherHitStop: 0.08,
  lockRange: 28,            // Tab lock-on reach
  outOfCombatTime: 5,       // seconds without fighting before health regenerates
  healthRegen: 0.04,        // fraction of max health per second, out of combat
  deathRespawnDelay: 3,     // seconds
  moveWhileStriking: 0.7,   // movement speed while winding up / striking (x normal): you stay mobile
  moveWhileRecovering: 0.9, // ... and while recovering
  moveWhileCharging: 0.55,  // ... while holding a special attack
  lunge: 1.6,               // small forward step on each melee hit (voxels / second)
  lungeHeavy: 4,            // ... on special attacks and finishers
  staggerHit: 0.14,         // seconds an enemy flinches when hit
  staggerFinisher: 0.5,     // ... when hit by a finisher or special attack (interrupts its wind-up)
};

// The special attack (right click).
export const SPECIAL = {
  minMp: 10,          // you need at least this much MP to start one
  chargeRate: 110,    // MP put in per second while holding the button
  powerBonus: 2.2,    // a full charge (100 MP) deals (1 + powerBonus) x the base damage
  knockdownAt: 0.35,  // charges of at least this share of the bar knock the enemy down ...
  knockdown: 1.2,     // ... for up to this many seconds (scaled by the charge)
};

// What the CLASS brings: crit chance, and how its MP fills and drains.
// Warriors, rangers and rogues fill MP with normal hits (it drains when they
// stop fighting); mages refill it all the time.
export const CLASS_COMBAT = {
  bulwark: { critChance: 0.08, resource: { regen: 0, onHitDealt: 9, decay: 6 }, instantSpecial: false },
  windstrider: { critChance: 0.12, resource: { regen: 0, onHitDealt: 8, decay: 6 }, instantSpecial: false },
  starweaver: { critChance: 0.1, resource: { regen: 16, onHitDealt: 0, decay: 0 }, instantSpecial: false },
  shade: { critChance: 0.2, resource: { regen: 0, onHitDealt: 11, decay: 6 }, instantSpecial: true },
};

// What the WEAPON brings: the normal attack and the special attack. A
// weapon's damage is multiplied by its item power (data/items.js).
export const WEAPON_COMBAT = {
  fists: {
    basic: { kind: 'thrust', damage: [6, 7], duration: [0.22, 0.22], strikeAt: 0.35,
      range: 2.1, arc: 110, knockback: [1.5, 2] },
    special: { kind: 'heavy', damage: 14, duration: 0.45, strikeAt: 0.45, range: 2.5, arc: 160, knockback: 8 },
  },
  blade: { // one-handed swords, axes, maces, sabers, longswords: 2 alternating swings
    basic: { kind: 'swing', damage: [10, 12], duration: [0.32, 0.32], strikeAt: 0.35,
      range: 2.7, arc: 140, knockback: [2.5, 3.5] },
    special: { kind: 'heavy', damage: 18, duration: 0.5, strikeAt: 0.45, range: 3.1, arc: 220, knockback: 10 },
  },
  great: { // two-handed: 3 slower, harder swings; the last is an uppercut that knocks down
    basic: { kind: 'swing', damage: [15, 15, 22], duration: [0.42, 0.42, 0.55], strikeAt: 0.4,
      range: 3.2, arc: 160, knockback: [3.5, 3.5, 7], knockdown: [0, 0, 0.8] },
    special: { kind: 'heavy', damage: 26, duration: 0.6, strikeAt: 0.45, range: 3.6, arc: 240, knockback: 13 },
  },
  dagger: { // very fast alternating stabs; the special is an instant lunge
    basic: { kind: 'thrust', damage: [7, 7], duration: [0.2, 0.2], strikeAt: 0.35,
      range: 2.3, arc: 110, knockback: [1.2, 1.5] },
    special: { kind: 'thrust', damage: 16, duration: 0.32, strikeAt: 0.4, range: 2.6, arc: 130, knockback: 7, dash: 16 },
  },
  bow: { // quick shots; the special is a charged piercing power shot
    basic: { kind: 'shoot', damage: [10], duration: [0.32], strikeAt: 0.55,
      projectile: { model: 'arrow', speed: 55, gravity: 5, radius: 0.4 }, knockback: [2] },
    special: { kind: 'shoot', damage: 16, duration: 0.35, strikeAt: 0.5, knockback: 7,
      projectile: { model: 'arrow', speed: 75, gravity: 1.5, radius: 0.45, pierce: true } },
  },
  crossbow: { // slower, harder bolts
    basic: { kind: 'shoot', damage: [15], duration: [0.45], strikeAt: 0.5,
      projectile: { model: 'arrow', speed: 65, gravity: 3, radius: 0.4 }, knockback: [3] },
    special: { kind: 'shoot', damage: 22, duration: 0.4, strikeAt: 0.5, knockback: 9,
      projectile: { model: 'arrow', speed: 85, gravity: 1, radius: 0.45, pierce: true } },
  },
  wand: { // fast bolts (wands and bracelets)
    basic: { kind: 'cast', damage: [9], duration: [0.28], strikeAt: 0.45,
      projectile: { model: 'bolt', speed: 34, gravity: 0, radius: 0.45 }, knockback: [2] },
    special: { kind: 'cast', damage: 16, duration: 0.4, strikeAt: 0.45, knockback: 9,
      projectile: { model: 'orb', speed: 26, gravity: 0, radius: 0.6, explodeRadius: 3.5 } },
  },
  staff: { // slower, bigger bolts
    basic: { kind: 'cast', damage: [12], duration: [0.36], strikeAt: 0.45,
      projectile: { model: 'bolt', speed: 30, gravity: 0, radius: 0.55 }, knockback: [2.5] },
    special: { kind: 'cast', damage: 20, duration: 0.45, strikeAt: 0.45, knockback: 10,
      projectile: { model: 'orb', speed: 22, gravity: 0, radius: 0.7, explodeRadius: 4.5 } },
  },
};
