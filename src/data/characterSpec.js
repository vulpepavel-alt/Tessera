// The single source of truth for how a TESSERA person is built
// (docs: TESSERA_Character_Creator_Specification.md, sections 2-4 and 9).
//
// Units are MODEL VOXELS (MV): 1 MV = 0.0625 world units, so the standard
// adult (32 MV from sole to the top of the bare head) is 2 world units tall.
// Coordinates: +X = the character's right, +Y = up, +Z = forward; the origin
// is on the ground between the feet.
//
// Every humanoid - the player, villagers, guards, humanoid enemies - is built
// from exactly these parts by models/humanoid.js.

export const MV = 0.0625; // world units per model voxel
export const SCHEMA_VERSION = 2; // appearance data version (saves are migrated)

// Each part: size [w, h, d] in MV, and its joint ("pivot") position.
// Pivots are given in body space (MV, origin between the feet).
// TESSERA tweaks, tested in game (docs/character_combat_visual_audit.md):
// hands 4 MV (spec 3) and feet 5 x 2 x 7 (spec 4 x 2 x 6) so they read from the
// gameplay camera; torso 8 deep (spec 6) and pelvis 7 deep (spec 6) so the
// profile doesn't look like a big head on a thin stick.
export const BODY = {
  height: 32,
  head: { size: [14, 14, 12], pivot: [0, 18, 0] },        // bottom-centre (neck)
  torso: { size: [10, 8, 8], pivot: [0, 18, 0] },         // top-centre (shoulder line)
  pelvis: { size: [8, 3, 7], pivot: [0, 10, 0] },         // top-centre
  arm: { size: [3, 7, 3], pivot: [6.5, 17, 0] },          // shoulder centre (x is mirrored)
  hand: { size: [4, 4, 4], pivot: [6.5, 10, 0] },         // wrist centre
  leg: { size: [4, 7, 4], pivot: [2.25, 8.5, 0] },        // hip centre (legs go up into the pelvis)
  foot: { size: [5, 2, 7], pivot: [2.25, 2, -0.5] },      // ankle centre; the foot reaches forward
  bodyCenter: 12,                                         // where the body tilts and rolls
};

// Up to three subtle torso silhouettes. They keep every joint and socket.
export const FRAMES = {
  straight: { label: 'Straight' },
  soft: { label: 'Soft' },    // rounded corners
  broad: { label: 'Broad' },  // one extra voxel at the shoulders each side
};

// Named attachment points (sockets), relative to their parent part's joint, in MV.
export const SOCKETS = {
  socket_head_top: { parent: 'head', at: [0, 14, 0] },
  socket_face: { parent: 'head', at: [0, 7, 6] },
  socket_ear_L: { parent: 'head', at: [-7, 6, 0] },
  socket_ear_R: { parent: 'head', at: [7, 6, 0] },
  socket_neck: { parent: 'torso', at: [0, 0, 0] },
  socket_chest: { parent: 'torso', at: [0, -4, 4] },
  socket_back: { parent: 'torso', at: [0, -4, -4] },
  socket_shoulder_L: { parent: 'torso', at: [-6.5, -1, 0] },
  socket_shoulder_R: { parent: 'torso', at: [6.5, -1, 0] },
  socket_hand_L: { parent: 'handL', at: [0, -2, 0] },
  socket_hand_R: { parent: 'handR', at: [0, -2, 0] },
  socket_hip_L: { parent: 'pelvis', at: [-4, -1.5, 0] },
  socket_hip_R: { parent: 'pelvis', at: [4, -1.5, 0] },
  socket_waist_back: { parent: 'pelvis', at: [0, -1.5, -3.5] },
  socket_foot_L: { parent: 'footL', at: [0, 0, 0] },
  socket_foot_R: { parent: 'footR', at: [0, 0, 0] },
};

// Regions of the body that armour can cover, and the zones hair is made of.
export const BODY_REGIONS = ['head', 'torso', 'pelvis', 'arms', 'hands', 'legs', 'feet'];
export const HAIR_ZONES = ['cap', 'fringe', 'side_l', 'side_r', 'back', 'top', 'tail'];

// The head grid: the 14 x 14 x 12 head plus room around it - 2 each side and
// 4 behind for hair, 7 above for crests and tall ears, 3 below for beards,
// 6 in front for snouts and muzzles. The head itself fills x 2-15, y 3-16, z 4-15.
export const HEAD_GRID = { w: 18, h: 24, d: 22, x0: 2, y0: 3, z0: 4 };

// The face grid: 12 x 10 cells centred on the 14 x 14 front of the head
// (1 MV side margins, 2 MV forehead/chin margins). FG(0,0) is the lowest
// cell on the -X side; the face is symmetric, so only the order matters.
export const FACE_GRID = { w: 12, h: 10, marginX: 1, marginY: 2 };

// NPCs may vary in height, uniformly, within these limits.
export const NPC_SCALE = [0.9, 1.1];
