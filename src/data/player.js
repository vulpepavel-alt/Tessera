// How the player character moves. Units: voxels and seconds.

export const PLAYER = {
  width: 0.7,          // collision box width (and depth)
  height: 1.7,         // collision box height

  walkSpeed: 6,
  sprintSpeed: 10,
  groundAcceleration: 60, // how quickly you reach full speed on the ground
  airAcceleration: 14,    // how much you can steer while in the air
  jumpVelocity: 9.5,
  gravity: 30,
  maxFallSpeed: 50,
  stepHeight: 1,       // walk up 1-block steps without jumping
  turnSpeed: 12,       // how fast the character turns to face where it walks

  // Dodge roll (Q)
  rollSpeed: 13,
  rollDuration: 0.42,
  rollInvincible: 0.35, // seconds of invincibility at the start of a roll
  rollCost: 20,         // stamina
  rollCooldown: 0.35,

  // Stamina
  staminaMax: 100,
  staminaRegen: 30,     // per second
  staminaRegenDelay: 0.7, // seconds after using stamina before it refills
  sprintCost: 18,       // per second

  // Shallow water (wading)
  waterSpeedFactor: 0.6,

  // Swimming (deep water)
  swimSpeed: 4.5,
  swimFastSpeed: 7.5,   // holding Shift
  swimUpSpeed: 4,
  swimCost: 3,          // stamina per second while swimming
  swimFastCost: 14,     // stamina per second while swimming fast
  exhaustedDamage: 6,   // health lost per second when swimming with no stamina left

  // Climbing (walk into a wall 2+ blocks high)
  climbSpeed: 3.2,
  climbCost: 12,        // stamina per second
  mantleBoost: 6.5,     // upward push when reaching the top of a wall

  // Glider (press Space in the air)
  glideSpeed: 13,
  glideFastSpeed: 18,   // holding W
  glideSlowSpeed: 7,    // holding S
  glideSink: 2.6,       // how fast you sink while gliding
  glideMinHeight: 2.5,  // must be at least this high above the ground to open it

  // Boat (press B next to water)
  boatSpeed: 12,
  boatReverseSpeed: 4,
  boatAcceleration: 7,
  boatTurnSpeed: 1.9,   // radians per second

  // Falling into a rift's clouds
  fallLimitY: -6,         // below this height you are "in the clouds"
  fallPenalty: 0.1,       // lose this fraction of max health
  safePointInterval: 1,   // seconds between remembering a safe spot
};
