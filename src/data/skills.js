// Class skills: two skills (keys 1 and 2) and an ultimate (R) for each of the
// eight specializations. The ultimate charges as you deal damage.
//
// Every skill is a list of "effects" (see combat/skillEffects.js):
//   aoe        damage everything around a point          { radius, damage, knockback, stun, at: 'self' | 'front' | 'aim' }
//   projectile shoot one or more projectiles              { count, spread (deg), model, speed, gravity, damage, pierce, explodeRadius, stun, slow, poison }
//   buff       a temporary bonus on yourself             { stat, value, duration }
//                stats: damage (x), damageTaken (x), lifesteal (0..1), speed (x), invulnerable, stealth, critNext, poisonHits
//   taunt      nearby enemies attack only you             { radius, duration }
//   heal       restore a share of max health              { percent }
//   dash       rush forward (or back)                     { distance, back, damage, stun }
//   leap       jump forward and land with a crash          { distance, radius, damage, stun }
//   blink      appear behind the target                   {}
//   trap       a snare on the ground                      { radius, damage, root, lifetime }
//   rain       arrows/fire falling on an area over time    { radius, duration, tick, damage }
//   flurry     many fast hits in front of you              { hits, interval, damage, range }
//   meteor     a big blow at the aim point after a delay  { delay, radius, damage, stun }

export const SPEC_SKILLS = {
  // ---------- Bulwark ----------
  ironwall: {
    s1: { name: 'Rallying Taunt', icon: 'taunt', cost: 0, cooldown: 10,
      description: 'Enemies nearby focus on you; you take 40% less damage for 5s.',
      effects: [{ kind: 'taunt', radius: 12, duration: 5 }, { kind: 'buff', stat: 'damageTaken', value: 0.6, duration: 5 }] },
    s2: { name: 'Shield Bash', icon: 'bash', cost: 15, cooldown: 7,
      description: 'Slam your shield forward, stunning foes for 1.8s.',
      effects: [{ kind: 'aoe', at: 'front', radius: 2.6, damage: 16, knockback: 6, stun: 1.8 }] },
    ult: { name: 'Iron Fortress', icon: 'fortress', cooldown: 1,
      description: 'For 6s you take 75% less damage and heal 30% of your health.',
      effects: [{ kind: 'buff', stat: 'damageTaken', value: 0.25, duration: 6 }, { kind: 'heal', percent: 0.3 }] },
  },
  ravager: {
    s1: { name: 'Whirlwind', icon: 'whirl', cost: 0, cooldown: 6,
      description: 'Spin with your blade, hitting everything around you.',
      effects: [{ kind: 'aoe', at: 'self', radius: 3.4, damage: 22, knockback: 7 }] },
    s2: { name: 'Leap Slam', icon: 'leap', cost: 20, cooldown: 9,
      description: 'Leap forward and crash down, stunning nearby foes.',
      effects: [{ kind: 'leap', distance: 9, radius: 3.5, damage: 26, stun: 1.2 }] },
    ult: { name: 'Bloodrage', icon: 'rage', cooldown: 1,
      description: 'For 8s deal 60% more damage and heal 20% of the damage you deal.',
      effects: [{ kind: 'buff', stat: 'damage', value: 1.6, duration: 8 }, { kind: 'buff', stat: 'lifesteal', value: 0.2, duration: 8 }] },
  },

  // ---------- Windstrider ----------
  longshot: {
    s1: { name: 'Piercing Volley', icon: 'volley', cost: 20, cooldown: 5,
      description: 'Fire three arrows in a fan that pass through enemies.',
      effects: [{ kind: 'projectile', count: 3, spread: 14, model: 'arrow', speed: 55, gravity: 4, damage: 14, pierce: true }] },
    s2: { name: 'Stunning Shot', icon: 'stunshot', cost: 25, cooldown: 8,
      description: 'A heavy arrow that stuns its target for 2s.',
      effects: [{ kind: 'projectile', count: 1, model: 'arrow', speed: 65, gravity: 2, damage: 18, stun: 2 }] },
    ult: { name: 'Skyfall Barrage', icon: 'rain', cooldown: 1,
      description: 'Rain arrows on the target area for 3s.',
      effects: [{ kind: 'rain', radius: 4.5, duration: 3, tick: 0.25, damage: 9 }] },
  },
  pathfinder: {
    s1: { name: 'Bramble Snare', icon: 'trap', cost: 20, cooldown: 8,
      description: 'Drop a thorny snare that roots and hurts the first enemies to step in.',
      effects: [{ kind: 'trap', radius: 2.2, damage: 20, root: 3, lifetime: 20 }] },
    s2: { name: 'Wind Dash', icon: 'dash', cost: 15, cooldown: 5,
      description: 'Leap backwards out of danger and run 40% faster for 3s.',
      effects: [{ kind: 'dash', distance: 7, back: true }, { kind: 'buff', stat: 'speed', value: 1.4, duration: 3 }] },
    ult: { name: 'Gale of Arrows', icon: 'storm', cooldown: 1,
      description: 'For 5s your attacks are twice as fast and deal 30% more damage.',
      effects: [{ kind: 'buff', stat: 'haste', value: 2, duration: 5 }, { kind: 'buff', stat: 'damage', value: 1.3, duration: 5 }] },
  },

  // ---------- Starweaver ----------
  emberheart: {
    s1: { name: 'Fireball', icon: 'fireball', cost: 20, cooldown: 4,
      description: 'A ball of fire that explodes and sets enemies burning.',
      effects: [{ kind: 'projectile', count: 1, model: 'orb', speed: 26, gravity: 0, damage: 20, explodeRadius: 3, poison: { dps: 4, duration: 4 } }] },
    s2: { name: 'Flame Ring', icon: 'ring', cost: 30, cooldown: 9,
      description: 'Erupt in flames, pushing back everything around you.',
      effects: [{ kind: 'aoe', at: 'self', radius: 4.5, damage: 24, knockback: 12 }] },
    ult: { name: 'Falling Star', icon: 'meteor', cooldown: 1,
      description: 'Call down a star on the target area: huge damage and a 2s stun.',
      effects: [{ kind: 'meteor', delay: 1, radius: 6, damage: 70, stun: 2 }] },
  },
  tidecaller: {
    s1: { name: 'Healing Wave', icon: 'heal', cost: 30, cooldown: 8,
      description: 'Restore 30% of your health.',
      effects: [{ kind: 'heal', percent: 0.3 }] },
    s2: { name: 'Frost Bolt', icon: 'frost', cost: 15, cooldown: 3,
      description: 'An icy bolt that slows its target by 50% for 4s.',
      effects: [{ kind: 'projectile', count: 1, model: 'bolt', speed: 34, gravity: 0, damage: 16, slow: { factor: 0.5, duration: 4 } }] },
    ult: { name: 'Tidal Surge', icon: 'wave', cooldown: 1,
      description: 'A great wave crashes around you, hurling enemies away, and heals you 40%.',
      effects: [{ kind: 'aoe', at: 'self', radius: 6, damage: 30, knockback: 16, stun: 1 }, { kind: 'heal', percent: 0.4 }] },
  },

  // ---------- Shade ----------
  nightblade: {
    s1: { name: 'Shadowstep', icon: 'step', cost: 20, cooldown: 7,
      description: 'Vanish and reappear behind your target; your next hit is critical.',
      effects: [{ kind: 'blink' }, { kind: 'buff', stat: 'critNext', value: 1, duration: 4 }] },
    s2: { name: 'Venom Edge', icon: 'poison', cost: 25, cooldown: 10,
      description: 'For 6s your hits poison enemies.',
      effects: [{ kind: 'buff', stat: 'poisonHits', value: 5, duration: 6 }] },
    ult: { name: 'Thousand Cuts', icon: 'flurry', cooldown: 1,
      description: 'A storm of twelve lightning-fast strikes.',
      effects: [{ kind: 'flurry', hits: 12, interval: 0.08, damage: 8, range: 2.8 }] },
  },
  mistdancer: {
    s1: { name: 'Smoke Veil', icon: 'smoke', cost: 25, cooldown: 12,
      description: 'Disappear in smoke for 4s: enemies lose track of you.',
      effects: [{ kind: 'buff', stat: 'stealth', value: 1, duration: 4 }] },
    s2: { name: 'Shadow Rush', icon: 'rush', cost: 20, cooldown: 6,
      description: 'Dash forward through enemies, stunning them for 1s.',
      effects: [{ kind: 'dash', distance: 8, damage: 14, stun: 1 }] },
    ult: { name: 'Phantom Dance', icon: 'phantom', cooldown: 1,
      description: 'For 5s nothing can hurt you and your strikes deal 40% more damage.',
      effects: [{ kind: 'buff', stat: 'invulnerable', value: 1, duration: 5 }, { kind: 'buff', stat: 'damage', value: 1.4, duration: 5 }] },
  },
};

export const ULTIMATE = {
  chargeNeeded: 100,
  chargePerDamage: 0.8, // damage dealt x this = ultimate charge
};

export const COMBO = {
  window: 2.5,          // seconds between hits before the combo resets
  bonusPerHit: 0.03,    // +3% damage per hit in the combo...
  maxBonus: 0.6,        // ...up to +60%
};

// Switching specialization at the Guild Hall (free for now; gold comes with loot).
export const GUILD = {
  switchCost: 0,
};
