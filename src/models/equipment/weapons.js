// Voxel weapons, shields and magic focuses, held in the character's fists.
// They use the SAME cube size as bodies (VOXEL), so everything looks made
// by the same hand. Each item in data/items.js names its `model` here.
//
//   buildHeld(gear, model)   attaches the main-hand and off-hand items to the
//                            hand sockets (socket_hand_R / socket_hand_L)
//   placeHeld(model, drawn)  moves them to the hands (drawn) or to the back /
//                            hip sockets (sheathed, out of combat)

import { Object3D } from 'three';
import { attach, VOXEL } from '../humanoid.js';
import { MODELS } from './weaponModels.js';

// How each model is held: arm 'off' = the left fist (bows); tilt = how far
// it leans forward (fraction of a half turn); out = how far it leans away
// from the body, so it reads from the front; turn = a half turn around (bows:
// the string faces you).
const HOLD = {
  club: { tilt: 0.28, out: 0.12 }, sword: { tilt: 0.28, out: 0.12 }, axe: { tilt: 0.28, out: 0.1 },
  hammer: { tilt: 0.22, out: 0.1 }, greatsword: { tilt: 0.25, out: 0.12 },
  dagger: { tilt: 0.38, out: 0.15 }, shortsword: { tilt: 0.33, out: 0.14 },
  wand: { tilt: 0.25, out: 0.1 }, staff: { tilt: 0.03, out: 0.06 }, crossbow: { tilt: 0 },
  shortbow: { arm: 'off', tilt: 0.03, turn: true }, longbow: { arm: 'off', tilt: 0.03, turn: true }, recurve: { arm: 'off', tilt: 0.03, turn: true },
  tome: { tilt: 0.05 }, orb: { tilt: 0 },
  longsword: { tilt: 0.27, out: 0.12 }, saber: { tilt: 0.28, out: 0.12 }, mace: { tilt: 0.28, out: 0.1 },
  greatmace: { tilt: 0.22, out: 0.1 }, greataxe: { tilt: 0.22, out: 0.1 }, boomerang: { tilt: 0.1, out: 0.1 },
  fist: { tilt: 0 }, bracelet: { tilt: 0 }, // worn around the fist
};

// Where each item rests when not in use. Long things go diagonally across
// the back (the legs are too short for a sword at the hip); daggers, wands
// and focuses hang at the belt, main hand on the left, off hand on the right.
const SHEATH = {
  great: 'back', blade: 'back', bow: 'back', crossbow: 'back', staff: 'back', shield: 'back',
  dagger: 'hip', wand: 'hip', focus: 'hip',
};

const WORN_ON_FIST = new Set(['fist', 'bracelet']);

// Weapons are drawn bigger than life, the classic way: a sword reaches the
// hero's head, a greatsword towers over it. (Fist weapons stay fist-sized.)
const HELD_SIZE = 1.3;

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
    if (!drawn && WORN_ON_FIST.has(h.item.model)) continue; // fist weapons and bracelets stay on
    const rest = SHEATH[h.item.kind] ?? 'back';
    const socketName = drawn ? h.hand : rest === 'back' ? 'socket_back' : h.side === 'main' ? 'socket_hip_L' : 'socket_hip_R';
    model.sockets[socketName].add(h.holder);
    h.holder.position.set(0, 0, 0);
    h.holder.rotation.set(0, 0, 0);
    h.inner.rotation.set(0, 0, 0);
    h.inner.position.set(0, 0, 0);
    const side = h.hand === 'socket_hand_L' ? -1 : 1; // which side of the body the fist is on
    if (drawn) {
      if (h.item.model === 'tome') {
        // Open towards the enemy, held just in front of the fist.
        h.holder.position.set(0, 0, 5 * VOXEL);
        h.holder.rotation.y = Math.PI / 2;
      } else if (h.item.model === 'orb') {
        h.holder.position.set(0, 2.5 * VOXEL, 2 * VOXEL); // resting on top of the fist
      } else if (shield) {
        // Held up in front of the fist, its face (and boss) towards the enemy.
        h.holder.position.set(0, 0, 5.5 * VOXEL);
        h.holder.rotation.y = Math.PI / 2;
      } else {
        h.holder.rotation.z = -side * Math.PI * (h.hold.out ?? 0);
        h.inner.rotation.x = Math.PI * (h.hold.tilt ?? 0.3);
        if (h.hold.turn) h.inner.rotation.y = Math.PI;
      }
    } else if (rest === 'back') {
      // Diagonally across the back, lying flat, centred on the back; the
      // off-hand item (a shield) a little further out.
      h.holder.position.set(0, 0.5 * VOXEL, -(h.side === 'main' ? 1.5 : 3) * VOXEL);
      h.holder.rotation.z = shield ? 0 : h.side === 'main' ? 0.7 : -0.7;
      h.inner.rotation.y = shield ? -Math.PI / 2 : Math.PI / 2; // shields face outwards
      h.inner.position.y = -h.centre * VOXEL * h.inner.scale.y;
    } else {
      // At the belt, pointing down and back, so it never reaches the ground.
      const s = h.side === 'main' ? -1 : 1;
      h.holder.position.set(s * 0.5 * VOXEL, 0, 0);
      h.holder.rotation.set(Math.PI - 1.0, 0, s * 0.12);
    }
  }
  model.weaponsDrawn = drawn;
}

function holdable(item, hand, side) {
  const grid = MODELS[item.model](item);
  const pivot = [grid.sizeX / 2, grid.grip ?? 2, grid.gripZ ?? grid.sizeZ / 2];
  const holder = new Object3D();
  const inner = attach(holder, grid, pivot, [0, 0, 0]);
  if (!WORN_ON_FIST.has(item.model)) inner.scale.setScalar(HELD_SIZE);
  return {
    item, hand, side, holder, inner,
    hold: HOLD[item.model] ?? { tilt: 0.3 },
    centre: grid.sizeY / 2 - pivot[1], // from the grip to the middle of the item
  };
}

// Just the voxel grid of a held item (used for inventory icons).
export function heldGrid(item) {
  return MODELS[item.model]?.(item) ?? null;
}
