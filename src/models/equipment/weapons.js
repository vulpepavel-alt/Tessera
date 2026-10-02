// Voxel weapons, shields and magic focuses, held in the character's fists.
// They use the SAME cube size as bodies (VOXEL), so everything looks made
// by the same hand. Each item in data/items.js names its `model` here.
//
//   buildHeld(gear, model)   attaches the main-hand and off-hand items to the
//                            hand sockets (socket_hand_R / socket_hand_L)
//   placeHeld(model, drawn)  moves them to the hands (drawn) or to the back /
//                            hip sockets (sheathed, out of combat)

import { Object3D } from 'three';
import { VoxelGrid } from '../VoxelGrid.js';
import { attach, lighter, darker, VOXEL } from '../humanoid.js';

const WOOD = 0x9a5a2c;
const DARK_WOOD = 0x5a341c;
const STRING = 0xf2eee2;
const BRASS = 0xc8963c;
const GOLD = 0xffc83a;

// Where each model is held: which arm, and how it's tilted.
// arm: 'main' (right fist) or 'off' (left fist); tilt: forward rotation.
const HOLD = {
  club: { tilt: 0.32 }, sword: { tilt: 0.32 }, axe: { tilt: 0.32 }, hammer: { tilt: 0.3 },
  greatsword: { tilt: 0.3 }, dagger: { tilt: 0.45 }, shortsword: { tilt: 0.4 },
  wand: { tilt: 0.3 }, staff: { tilt: 0.04 }, crossbow: { tilt: 0 },
  shortbow: { arm: 'off', tilt: 0.05 }, longbow: { arm: 'off', tilt: 0.05 }, recurve: { arm: 'off', tilt: 0.05 },
};

// Where each item rests when not in use: big things on the back, one-handed
// weapons on the hip (main hand on the left hip, so it's drawn across).
const SHEATH = {
  great: 'socket_back', bow: 'socket_back', crossbow: 'socket_back', staff: 'socket_back', shield: 'socket_back',
  blade: 'socket_hip_L', dagger: 'socket_hip_L', wand: 'socket_hip_L', focus: 'socket_hip_R',
};

// Builds the held items and puts them in the hands (drawn). Returns the
// records placeHeld() uses to move them between hands and sheaths.
export function buildHeld(gear, model) {
  const main = gear.mainHand;
  const off = gear.offHand;
  const held = [];
  if (main) held.push(holdable(main, HOLD[main.model]?.arm === 'off' ? 'socket_hand_L' : 'socket_hand_R', 'main'));
  if (off && !(main && main.kind === 'great')) { // two-handed weapons leave no room for an off-hand item
    held.push(holdable(off, 'socket_hand_L', 'off'));
  }
  model.held = held;
  placeHeld(model, true);
  return held;
}

// drawn = true: items in the hands; false: on the back or the hip.
export function placeHeld(model, drawn) {
  for (const h of model.held ?? []) {
    const shield = h.item.kind === 'shield';
    const socket = model.sockets[drawn ? h.hand : SHEATH[h.item.kind] ?? 'socket_back'];
    socket.add(h.holder);
    h.holder.position.set(0, 0, 0);
    h.holder.rotation.set(0, 0, 0);
    h.inner.rotation.set(0, 0, 0);
    h.inner.position.set(0, 0, 0);
    if (drawn) {
      if (shield) {
        // Strapped to the forearm, facing forward.
        h.inner.rotation.y = -Math.PI / 2;
        h.inner.position.set(-2.5 * VOXEL, 1.5 * VOXEL, 1 * VOXEL);
      } else {
        h.inner.rotation.x = Math.PI * h.tilt;
      }
    } else if (socket.name === 'socket_back') {
      // Across the back, tilted, a little behind the body (and behind a cape).
      h.holder.position.set(0, 1 * VOXEL, -1.5 * VOXEL);
      if (shield) h.holder.rotation.y = Math.PI / 2;
      else h.holder.rotation.set(0, 0, h.side === 'main' ? 0.75 : -0.75);
    } else {
      // Hanging at the hip, point down and slightly back.
      h.holder.rotation.set(Math.PI - 0.35, 0, h.side === 'main' ? -0.15 : 0.15);
    }
  }
  model.weaponsDrawn = drawn;
}

function holdable(item, hand, side) {
  const grid = MODELS[item.model](item);
  // Bows are held in the middle, staffs a third of the way up, the rest by the grip.
  const gripY = { shortbow: grid.sizeY / 2, longbow: grid.sizeY / 2, recurve: grid.sizeY / 2, staff: 11, crossbow: 1 };
  const shield = item.kind === 'shield';
  const pivot = shield ? [1, 6, 6] : [grid.sizeX / 2, gripY[item.model] ?? 2, grid.sizeZ / 2];
  const holder = new Object3D();
  const inner = attach(holder, grid, pivot, [0, 0, 0]);
  return { item, hand, side, holder, inner, tilt: HOLD[item.model]?.tilt ?? 0.3 };
}

const trimOf = (item) => (item.tier >= 5 ? GOLD : BRASS);

const MODELS = {
  // A knobbly wooden club, thicker at the top.
  club() {
    const g = new VoxelGrid(4, 15, 4).box(1, 0, 1, 2, 7, 2, DARK_WOOD).box(0, 7, 0, 4, 8, 4, WOOD);
    g.box(1, 14, 1, 2, 1, 2, lighter(WOOD, 0.15)).set(0, 9, 0, DARK_WOOD).set(3, 12, 3, DARK_WOOD).set(3, 8, 0, DARK_WOOD);
    return g;
  },

  sword(item) {
    const m = item.metal;
    const g = new VoxelGrid(2, 22, 6).box(0, 0, 2, 2, 5, 2, DARK_WOOD).box(0, 0, 2, 2, 1, 2, trimOf(item));
    g.box(0, 5, 0, 2, 1, 6, trimOf(item));
    g.box(0, 6, 2, 1, 15, 2, m).box(0, 6, 2, 1, 15, 1, lighter(m, 0.2)).set(0, 21, 2, lighter(m, 0.3));
    return g;
  },

  axe(item) {
    const m = item.metal;
    const g = new VoxelGrid(2, 22, 9).box(0, 0, 2, 2, 22, 2, WOOD).box(0, 0, 2, 2, 2, 2, DARK_WOOD);
    g.box(0, 14, 4, 1, 7, 3, m).box(0, 13, 6, 1, 9, 2, m).box(0, 12, 8, 1, 11, 1, lighter(m, 0.3)); // the blade, edge shining
    g.box(0, 16, 0, 1, 3, 2, darker(m, 0.15)); // back spike
    return g;
  },

  hammer(item) {
    const m = item.metal;
    const g = new VoxelGrid(6, 28, 8).box(2, 0, 3, 2, 22, 2, WOOD).box(2, 0, 3, 2, 3, 2, DARK_WOOD);
    g.box(0, 20, 0, 6, 7, 8, m).box(0, 20, 0, 6, 1, 8, trimOf(item)).box(0, 26, 0, 6, 1, 8, trimOf(item));
    g.box(1, 21, 0, 4, 5, 1, lighter(m, 0.2)).box(1, 21, 7, 4, 5, 1, lighter(m, 0.2));
    return g;
  },

  greatsword(item) {
    const m = item.metal;
    const t = trimOf(item);
    const g = new VoxelGrid(2, 34, 10).box(0, 0, 4, 2, 7, 2, DARK_WOOD).box(0, 0, 3, 2, 1, 4, t);
    g.box(0, 7, 0, 2, 2, 10, t).box(0, 9, 3, 2, 23, 4, m);
    g.box(0, 9, 3, 2, 23, 1, lighter(m, 0.25)).box(0, 10, 5, 2, 20, 1, darker(m, 0.12)); // edge and fuller
    g.box(0, 32, 4, 2, 1, 2, m).set(0, 33, 4, lighter(m, 0.3));
    if (item.glow) g.box(0, 7, 4, 2, 2, 2, item.glow);
    return g;
  },

  roundShield(item) {
    const m = item.metal;
    const g = new VoxelGrid(2, 12, 12);
    for (let y = 0; y < 12; y++) {
      for (let z = 0; z < 12; z++) {
        const d = Math.hypot(y - 5.5, z - 5.5);
        if (d > 6) continue;
        const rim = d > 4.7;
        const plank = item.tier === 1 && z % 3 === 0;
        g.set(1, y, z, rim ? trimOf(item) : plank ? darker(m, 0.15) : m);
        if (rim || d < 1.6) g.set(0, y, z, d < 1.6 ? lighter(trimOf(item), 0.2) : trimOf(item));
      }
    }
    return g;
  },

  kiteShield(item) {
    const m = item.metal;
    const t = trimOf(item);
    const g = new VoxelGrid(2, 16, 12);
    for (let y = 0; y < 16; y++) {
      const half = y > 5 ? 6 : Math.max(1, Math.round(y)); // pointed at the bottom
      for (let z = 6 - half; z < 6 + half; z++) {
        const edge = z === 6 - half || z === 5 + half || y === 15 || y === 0;
        g.set(1, y, z, edge ? t : m);
      }
    }
    g.box(0, 6, 5, 1, 7, 2, t).box(0, 9, 3, 1, 2, 6, t); // a cross on the front
    if (item.glow) g.box(0, 9, 5, 1, 2, 2, item.glow);
    return g;
  },

  shortbow: (item) => bow(item, 24, [4, 3, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0]),
  longbow: (item) => bow(item, 34, [5, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]),
  recurve: (item) => bow(item, 30, [3, 5, 5, 4, 3, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0]),

  crossbow(item) {
    const m = item.metal;
    const g = new VoxelGrid(16, 4, 18).box(7, 0, 0, 2, 3, 18, WOOD).box(7, 0, 0, 2, 1, 5, DARK_WOOD);
    g.box(0, 2, 14, 16, 1, 2, m).box(0, 2, 14, 1, 2, 2, darker(m, 0.2)).box(15, 2, 14, 1, 2, 2, darker(m, 0.2));
    g.box(1, 3, 12, 14, 1, 1, STRING).box(7, 3, 6, 2, 1, 9, lighter(WOOD, 0.2));
    return g;
  },

  dagger(item) {
    const m = item.metal;
    const g = new VoxelGrid(1, 12, 4).box(0, 0, 1, 1, 4, 2, DARK_WOOD).box(0, 4, 0, 1, 1, 4, trimOf(item));
    g.box(0, 5, 1, 1, 6, 2, m).box(0, 5, 1, 1, 6, 1, lighter(m, 0.25)).set(0, 11, 1, lighter(m, 0.3));
    return g;
  },

  shortsword(item) {
    const m = item.metal;
    const g = new VoxelGrid(1, 17, 5).box(0, 0, 1, 1, 4, 2, DARK_WOOD).box(0, 4, 0, 1, 1, 5, trimOf(item));
    g.box(0, 5, 1, 1, 11, 2, m).box(0, 5, 1, 1, 11, 1, lighter(m, 0.25)).set(0, 16, 1, lighter(m, 0.3));
    if (item.glow) g.set(0, 4, 2, item.glow).box(0, 7, 2, 1, 7, 1, item.glow);
    return g;
  },

  wand(item) {
    return new VoxelGrid(2, 14, 2).box(0, 0, 0, 2, 11, 2, WOOD).box(0, 0, 0, 2, 2, 2, DARK_WOOD).box(0, 11, 0, 2, 3, 2, item.glow);
  },

  staff(item) {
    const top = item.metal ?? DARK_WOOD;
    const g = new VoxelGrid(4, 36, 4).box(1, 0, 1, 2, 29, 2, WOOD).box(1, 0, 1, 2, 2, 2, DARK_WOOD);
    g.box(0, 28, 0, 4, 2, 4, top).box(0, 30, 0, 1, 3, 1, top).box(3, 30, 3, 1, 3, 1, top).box(3, 30, 0, 1, 3, 1, top).box(0, 30, 3, 1, 3, 1, top);
    g.box(1, 30, 1, 2, 4, 2, item.glow).set(1, 34, 1, lighter(item.glow, 0.3));
    if (item.tier >= 4) g.box(1, 14, 1, 2, 1, 2, GOLD).box(1, 20, 1, 2, 1, 2, GOLD);
    return g;
  },

  tome(item) {
    const g = new VoxelGrid(3, 8, 7).box(0, 0, 0, 3, 8, 7, item.metal).box(1, 1, 1, 1, 6, 6, 0xf4ecd6);
    g.box(0, 3, 6, 3, 2, 1, GOLD).set(0, 4, 3, GOLD);
    return g;
  },

  orb(item) {
    const g = new VoxelGrid(5, 7, 5).box(1, 0, 1, 3, 2, 3, BRASS);
    g.box(1, 2, 0, 3, 5, 5, item.glow).box(0, 3, 1, 5, 3, 3, item.glow).set(2, 6, 2, lighter(item.glow, 0.35));
    return g;
  },
};

// A bow: the limb follows `curve` (how far back each cube sits, from the tip
// to the middle), mirrored; the string runs straight; a grip in the middle.
function bow(item, length, curve) {
  const g = new VoxelGrid(1, length, 7);
  const half = Math.floor(length / 2);
  for (let y = 0; y < length; y++) {
    const i = Math.min(y, length - 1 - y);
    const z = curve[Math.min(i, curve.length - 1)];
    g.set(0, y, z, WOOD).set(0, y, z + 1, darker(WOOD, 0.15));
  }
  for (let y = 1; y < length - 1; y++) g.set(0, y, 6, STRING);
  g.box(0, half - 2, 0, 1, 4, 2, DARK_WOOD);
  if (item.metal) g.set(0, 1, curve[1], item.metal).set(0, length - 2, curve[1], item.metal);
  if (item.glow) g.set(0, half, 0, item.glow);
  return g;
}
