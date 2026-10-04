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
//
// Proportions follow the classic voxel-RPG look, measured from the alpha's
// character creator (front view, sole to hair top): head with hair ~50% of the
// height, a robe-like body ~40% reaching down to the feet, small feet ~10%,
// big block hands right under the head and no visible arms (the arm is only a
// joint). Scaled to our 32 MV height: head 16 x 13 x 13 (as wide as the
// body), torso 14 x 9 x 11, short legs, small boots 6 x 3 x 8, hands 6 x 6 x 7.
export const BODY = {
  height: 32,
  head: { size: [18, 16, 14], pivot: [0, 19, 0] },        // bottom-centre (neck); big, the classic look
  torso: { size: [14, 9, 11], pivot: [0, 19, 0] },        // top-centre (shoulder line)
  pelvis: { size: [14, 2, 11], pivot: [0, 10, 0] },       // top-centre
  arm: { size: [0, 0, 0], pivot: [8, 18, 0] },            // shoulder joint only (no visible arm)
  hand: { size: [6, 6, 7], pivot: [11, 17, 3] },          // top of the hand; floating just beside the chest (never inside it)
  leg: { size: [6, 5, 7], pivot: [4, 8, 0] },             // hip (top of the leg, under the pelvis)
  foot: { size: [6, 3, 8], pivot: [4, 3, 1] },            // ankle; z = how far the boot reaches forward of it
  bodyCenter: 14,                                         // where the body tilts and rolls
};

// Up to three subtle torso silhouettes. They keep every joint and socket.
export const FRAMES = {
  straight: { label: 'Straight' },
  soft: { label: 'Soft' },    // rounded corners
  broad: { label: 'Broad' },  // one extra voxel at the shoulders each side
};

// Named attachment points (sockets), relative to their parent part's joint, in MV.
export const SOCKETS = {
  socket_head_top: { parent: 'head', at: [0, 16, 0] },
  socket_face: { parent: 'head', at: [0, 8, 7] },
  socket_ear_L: { parent: 'head', at: [-9, 8, 0] },
  socket_ear_R: { parent: 'head', at: [9, 8, 0] },
  socket_neck: { parent: 'torso', at: [0, 0, 0] },
  socket_chest: { parent: 'torso', at: [0, -4.5, 5.5] },
  socket_back: { parent: 'torso', at: [0, -4.5, -5.5] },
  socket_shoulder_L: { parent: 'torso', at: [-7.5, -1, 0] },
  socket_shoulder_R: { parent: 'torso', at: [7.5, -1, 0] },
  socket_hand_L: { parent: 'handL', at: [0, -4, 0] },
  socket_hand_R: { parent: 'handR', at: [0, -4, 0] },
  socket_hip_L: { parent: 'pelvis', at: [-7, -1, 0] },
  socket_hip_R: { parent: 'pelvis', at: [7, -1, 0] },
  socket_waist_back: { parent: 'pelvis', at: [0, -1, -5.5] },
  socket_foot_L: { parent: 'footL', at: [0, 0, 0] },
  socket_foot_R: { parent: 'footR', at: [0, 0, 0] },
};

// Regions of the body that armour can cover, and the zones hair is made of.
export const BODY_REGIONS = ['head', 'torso', 'pelvis', 'arms', 'hands', 'legs', 'feet'];
export const HAIR_ZONES = ['cap', 'fringe', 'side_l', 'side_r', 'back', 'top', 'tail'];

// The head grid: the 16 x 13 x 13 head plus room around it - 4 each side for
// hair and big goblin ears, 4 behind for hair, 7 above for crests and tall
// ears and tall spiky hair, 3 below for beards, 6 in front for snouts and muzzles.
// The head itself fills x 4-19, y 3-15, z 4-16.
export const HEAD_GRID = { w: 26, h: 33, d: 24, x0: 4, y0: 3, z0: 4 }; // room around the head for hair, ears and snouts

// The face grid: 12 x 10 cells on the front of the head. FG(0,0) is the
// lowest cell on the -X side; the face is symmetric, so only the order matters.
// On the 16-wide, 13-tall head: 2 MV side margins, 1 MV chin margin, so the
// eyes sit just below the middle of the head (as on the reference).
export const FACE_GRID = { w: 12, h: 10, marginX: 3, marginY: 2 };

// NPCs may vary in height, uniformly, within these limits.
export const NPC_SCALE = [0.9, 1.1];
