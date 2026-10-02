// World settings. Change these numbers to reshape the world and the sky.
// 1 unit = 1 voxel (one small cube).

// The seed used when nothing else is chosen (also the main menu background).
export const DEFAULT_SEED = 'tessera';

// The world is cut into "chunks": columns of 32 x 32 voxels, 96 voxels tall.
export const CHUNK = {
  size: 32,
  height: 96,
};

export const WORLD = {
  renderDistance: 8,   // default view distance in chunks (changeable in Settings)
  unloadMargin: 2,     // chunks this far beyond the view are thrown away

  // Land shape
  baseHeight: 27,      // average ground height
  seaLevel: 22,        // water fills everything below this height
  continentHeight: 7,  // big, slow rises and dips (low areas become lakes)
  softCap: 58,         // above this height mountains grow more slowly
  maxTop: 88,          // highest allowed ground
  valleyDepth: 9,      // how deep the long valleys cut in
  mountainScale: 1.7,  // makes every biome's mountains taller (big horizon silhouettes)

  // Biome regions: the land is split into large regions, one biome each.
  regionSize: 320,     // average size of a region, in voxels
  borderWarp: 45,      // how wiggly the borders between regions are
  blendWidth: 35,      // how gradually the ground shape changes at a border

  // Rivers: winding lines of water
  riverFrequency: 0.0017,
  riverWidth: 0.028,

  // Rifts: deep cracks in the land, filled with clouds
  riftFrequency: 0.0013,
  riftWidth: 0.075,    // bigger = wider rifts
  riftAmount: 0.45,    // 0 = no rifts, 1 = rift lines everywhere
  riftSafeRadius: 260, // no rifts this close to the world centre (the start area)
  spireChance: 0.0025, // crystal spires along rift edges (future bridge anchors)
};

export const ATMOSPHERE = {
  skyTop: 0x0a5cff,      // colour straight up (a deep, saturated blue)
  skyHorizon: 0x3a8cff,  // colour at the horizon (also the fog colour): far land fades to strong blue, never white
  fogStart: 0.38,        // fog starts at this fraction of the view distance (subtle haze)
  sunColor: 0xffe6bc,      // slightly warm sunlight
  sunIntensity: 2.2,
  skyLight: 0xcfe2ff,    // soft, cool light coming from the sky
  groundLight: 0x6f8a68, // green bounce light from the grass: soft, friendly shadows
  skyLightIntensity: 1.15, // a little less fill light, so shaded sides read darker (more contrast)
  cloudY: 0,             // height of the cloud layer that fills the rifts
  cloudColor: 0xf4f7fb,
};

export const CAMERA = {
  fov: 58,                 // field of view in degrees
  flySpeed: 24,            // debug fly mode (F4) speed, voxels per second
  fastMultiplier: 4,       // speed multiplier while holding Shift in fly mode
  mouseSensitivity: 0.0022,
  distance: 11,            // how far behind the player the camera sits (wide view, hero small in the middle)
  minDistance: 3,
  maxDistance: 18,
  height: 2.1,             // the camera looks at this point above the player's feet (keeps
                           // the character in the lower centre of the screen)
  follow: 14,              // how quickly the camera catches up with the player (damping)
  combatPullBack: 2.2,     // extra distance while enemies are fighting you
};
