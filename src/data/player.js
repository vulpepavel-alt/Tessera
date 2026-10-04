// How the player character moves. Units: voxels and seconds.

export const PLAYER = {
  width: 0.7,          // collision box width (and depth)
  height: 1.7,         // collision box height

  // Like the classic game you always run; holding Shift slows you to a walk.
  // There is no sprint button, so moving never costs stamina.
  runSpeed: 7.5,
  walkSpeed: 3,
  groundAcceleration: 90, // how quickly you reach full speed on the ground (light, snappy)
  airAcceleration: 28,    // how much you can steer while in the air (generous)
  jumpVelocity: 9.5,
  gravity: 30,
  maxFallSpeed: 50,
  stepHeight: 1,       // walk up 1-block steps without jumping
  turnSpeed: 16,       // how fast the character turns to face where it walks

  // Dodge roll (middle mouse button, or Q on a trackpad)
  rollSpeed: 13,
  rollDuration: 0.42,
  rollInvincible: 0.35, // seconds of invincibility at the start of a roll
  rollCost: 25,         // stamina: a quarter of the bar, like the classic game
  rollCooldown: 0.25,

  // Stamina: only for dodging, climbing and skills
  staminaMax: 100,
  staminaRegen: 30,     // per second
  staminaRegenDelay: 0.7, // seconds after using stamina before it refills

  // Shallow water (wading)
  waterSpeedFactor: 0.6,

  // Swimming (deep water; free, like the classic game)
  swimSpeed: 4.5,
  swimUpSpeed: 4,

  mountSpeed: 1.6,     // riding your pet (key X) is this much faster than running

  // Climbing (walk into a wall; it starts on its own)
  climbSpeed: 3.2,
  climbCost: 12,        // stamina per second
  mantleBoost: 6.5,     // upward push when reaching the top of a wall

  // Glider (press G in the air)
  glideSpeed: 13,
  glideFastSpeed: 18,   // holding W
  glideSlowSpeed: 7,    // holding S
  glideSink: 2.6,       // how fast you sink while gliding
  glideMinHeight: 2.5,  // must be at least this high above the ground to open it

  // Boat (press G next to water)
  boatSpeed: 12,
  boatReverseSpeed: 4,
  boatAcceleration: 7,
  boatTurnSpeed: 1.9,   // radians per second

  // Falling out of the world (should never happen; a safety net)
  fallLimitY: -6,         // below this height you are brought back
  fallPenalty: 0.1,       // lose this fraction of max health
  safePointInterval: 1,   // seconds between remembering a safe spot
};
