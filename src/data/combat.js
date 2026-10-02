// Combat numbers: the basic attack (left click, 3-hit combo) and the heavy
// attack (right click) of every class, plus general rules.
//
// kind      - which animation and hit type: swing / thrust (melee), shoot / cast (projectiles), heavy
// damage    - one number per combo hit
// duration  - seconds each combo hit takes
// strikeAt  - when the hit lands, as a fraction of the duration (0.5 = halfway)
// range/arc - melee reach (voxels) and width (degrees)
// knockback - how hard targets are pushed back

export const COMBAT = {
  critMultiplier: 1.75,
  comboWindow: 0.55,        // seconds after a hit in which the next click continues the combo
  hitStop: 0.06,            // tiny freeze when you land a hit (makes it feel punchy)
  heavyHitStop: 0.12,
  outOfCombatTime: 5,       // seconds without fighting before health regenerates
  healthRegen: 0.03,        // fraction of max health per second, out of combat
  lockRange: 28,            // Tab lock-on reach
  deathRespawnDelay: 3,     // seconds
  finisherHitStop: 0.1,     // the last hit of a combo freezes a little longer
  moveWhileStriking: 0.4,   // movement speed while winding up / striking (x normal)
  moveWhileRecovering: 0.75,// ... and while recovering
  lunge: 2.6,               // forward step on each melee hit (voxels / second)
  lungeHeavy: 5,            // ... on heavy attacks and finishers
  staggerHit: 0.16,         // seconds an enemy flinches when hit
  staggerFinisher: 0.55,    // ... when hit by a finisher or heavy attack (interrupts its wind-up)
};

// What the CLASS brings: crit chance, the cost of a heavy attack (in rage,
// energy or mana) and how the class resource fills and drains.
export const CLASS_COMBAT = {
  bulwark: { critChance: 0.08, heavyCost: 0, resource: { regen: 0, decay: 4, onHitDealt: 6, onHitTaken: 4 } }, // Rage builds in battle
  windstrider: { critChance: 0.12, heavyCost: 20, resource: { regen: 18, decay: 0, onHitDealt: 0, onHitTaken: 0 } },
  starweaver: { critChance: 0.1, heavyCost: 18, resource: { regen: 7, decay: 0, onHitDealt: 0, onHitTaken: 0 } },
  shade: { critChance: 0.2, heavyCost: 25, resource: { regen: 18, decay: 0, onHitDealt: 0, onHitTaken: 0 } },
};

// What the WEAPON brings: the basic attack and the heavy attack. Every class
// starts with bare fists; a weapon's damage is multiplied by its item power
// (data/items.js), so better weapons hit harder.
export const WEAPON_COMBAT = {
  fists: {
    basic: { kind: 'thrust', damage: [5, 5, 8], duration: [0.3, 0.3, 0.42], strikeAt: 0.45,
      range: 2.1, arc: 100, knockback: [1.5, 1.5, 5] },
    heavy: { kind: 'heavy', damage: 13, duration: 0.7, strikeAt: 0.6, range: 2.4, arc: 160,
      knockback: 8, cooldown: 1.3 },
  },
  blade: { // clubs, swords, axes
    basic: { kind: 'swing', damage: [9, 10, 15], duration: [0.4, 0.4, 0.56], strikeAt: 0.45,
      range: 2.8, arc: 130, knockback: [3, 3, 7] },
    heavy: { kind: 'heavy', damage: 24, duration: 0.85, strikeAt: 0.62, range: 3.2, arc: 220,
      knockback: 10, cooldown: 1.4 },
  },
  great: { // two-handed hammers and greatswords: slow and strong
    basic: { kind: 'swing', damage: [12, 13, 20], duration: [0.5, 0.5, 0.7], strikeAt: 0.48,
      range: 3.2, arc: 150, knockback: [4, 4, 10] },
    heavy: { kind: 'heavy', damage: 32, duration: 1.0, strikeAt: 0.64, range: 3.6, arc: 240,
      knockback: 13, cooldown: 1.6 },
  },
  dagger: { // quick stabs; the heavy attack lunges forward
    basic: { kind: 'thrust', damage: [6, 7, 11], duration: [0.24, 0.24, 0.38], strikeAt: 0.4,
      range: 2.4, arc: 100, knockback: [1.5, 1.5, 5] },
    heavy: { kind: 'thrust', damage: 24, duration: 0.45, strikeAt: 0.45, range: 2.6, arc: 120,
      knockback: 7, cooldown: 1.1, dash: 15 },
  },
  bow: {
    basic: { kind: 'shoot', damage: [8, 8, 12], duration: [0.45, 0.45, 0.55], strikeAt: 0.6,
      projectile: { model: 'arrow', speed: 48, gravity: 6, radius: 0.35 }, knockback: [1.5, 1.5, 4] },
    heavy: { kind: 'shoot', damage: 30, duration: 0.85, strikeAt: 0.75, cooldown: 1.2, knockback: 7,
      projectile: { model: 'arrow', speed: 70, gravity: 2, radius: 0.4, pierce: true } },
  },
  crossbow: { // slower, harder bolts
    basic: { kind: 'shoot', damage: [12, 12, 16], duration: [0.6, 0.6, 0.7], strikeAt: 0.55,
      projectile: { model: 'arrow', speed: 62, gravity: 3, radius: 0.35 }, knockback: [2.5, 2.5, 5] },
    heavy: { kind: 'shoot', damage: 36, duration: 1.0, strikeAt: 0.75, cooldown: 1.5, knockback: 9,
      projectile: { model: 'arrow', speed: 80, gravity: 1, radius: 0.4, pierce: true } },
  },
  wand: {
    basic: { kind: 'cast', damage: [9, 9, 14], duration: [0.5, 0.5, 0.6], strikeAt: 0.45,
      projectile: { model: 'bolt', speed: 30, gravity: 0, radius: 0.45 }, knockback: [2, 2, 5] },
    heavy: { kind: 'cast', damage: 22, duration: 0.75, strikeAt: 0.5, cooldown: 1.4, knockback: 9,
      projectile: { model: 'orb', speed: 22, gravity: 0, radius: 0.6, explodeRadius: 3.5 } },
  },
  staff: { // bigger, slower spells
    basic: { kind: 'cast', damage: [11, 11, 17], duration: [0.58, 0.58, 0.7], strikeAt: 0.45,
      projectile: { model: 'bolt', speed: 28, gravity: 0, radius: 0.55 }, knockback: [2.5, 2.5, 6] },
    heavy: { kind: 'cast', damage: 28, duration: 0.85, strikeAt: 0.5, cooldown: 1.5, knockback: 10,
      projectile: { model: 'orb', speed: 20, gravity: 0, radius: 0.7, explodeRadius: 4.5 } },
  },
};
