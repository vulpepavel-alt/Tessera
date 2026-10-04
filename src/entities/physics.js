// Collisions between a moving box (a character) and the voxel world.
//
// A body is an upright box: `position` is the centre of its feet, with
// `halfWidth` and `height`. To move it, we move along one axis at a time
// (up/down first, then sideways). If the move would push the box into a solid
// block, we stop it right at the block's surface instead. Doing the axes
// separately is what lets you slide along walls instead of sticking to them.

import { BLOCK_INFO } from '../data/blocks.js';

const EPS = 1e-4;
// Blocks you bump into. Crops and flowers are drawn but you walk through them.
const SOLID = BLOCK_INFO.map((info) => info.opaque && !info.walkThrough);
const LIQUID = BLOCK_INFO.map((info) => !!info.liquid);

export function isSolidBlock(id) {
  return SOLID[id];
}

export function isLiquidBlock(id) {
  return LIQUID[id];
}

// Move `body` by `delta` (an object with x, y, z). Returns which sides were hit.
// world.getBlock(x, y, z) must return a block id.
export function moveBody(body, delta, world, stepHeight = 0) {
  const hit = { x: false, y: false, z: false, ground: false };

  if (sweep(body, 1, delta.y, world)) {
    hit.y = true;
    if (delta.y < 0) hit.ground = true;
  }
  for (const axis of [0, 2]) {
    const d = axis === 0 ? delta.x : delta.z;
    if (d === 0) continue;
    const before = body.position.clone();
    if (!sweep(body, axis, d, world)) continue;

    // Blocked. If standing on the ground (or swimming), try stepping up onto the block.
    if (stepHeight > 0 && (body.grounded || body.canStep) && tryStep(body, axis, d, world, stepHeight, before)) continue;
    hit[axis === 0 ? 'x' : 'z'] = true;
  }
  return hit;
}

// Lift the body by stepHeight, try the sideways move again, then settle down.
function tryStep(body, axis, d, world, stepHeight, before) {
  const blockedAt = body.position.clone();
  body.position.copy(before);
  if (sweep(body, 1, stepHeight, world) || sweep(body, axis, d, world)) {
    body.position.copy(blockedAt); // not enough room: undo
    return false;
  }
  sweep(body, 1, -stepHeight, world);
  body.stepped = true; // lets the model smooth out the jump in height
  return true;
}

// Move along one axis (0 = x, 1 = y, 2 = z). Returns true if a block was hit.
function sweep(body, axis, d, world) {
  if (d === 0) return false;
  const p = body.position;
  const lo = [p.x - body.halfWidth, p.y, p.z - body.halfWidth];
  const hi = [p.x + body.halfWidth, p.y + body.height, p.z + body.halfWidth];
  const [a1, a2] = axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1];
  const range1 = [Math.floor(lo[a1] + EPS), Math.floor(hi[a1] - EPS)];
  const range2 = [Math.floor(lo[a2] + EPS), Math.floor(hi[a2] - EPS)];

  // Is any block in this layer (at coordinate `layer` along the axis) solid?
  const layerSolid = (layer) => {
    const c = [0, 0, 0];
    c[axis] = layer;
    for (let i = range1[0]; i <= range1[1]; i++) {
      for (let j = range2[0]; j <= range2[1]; j++) {
        c[a1] = i;
        c[a2] = j;
        if (SOLID[world.getBlock(c[0], c[1], c[2])]) return true;
      }
    }
    return false;
  };

  let move = d;
  let collided = false;
  if (d > 0) {
    const from = Math.floor(hi[axis] - EPS) + 1;
    const to = Math.floor(hi[axis] + d - EPS);
    for (let layer = from; layer <= to; layer++) {
      if (layerSolid(layer)) {
        move = layer - hi[axis] - EPS;
        collided = true;
        break;
      }
    }
  } else {
    const from = Math.floor(lo[axis] + EPS) - 1;
    const to = Math.floor(lo[axis] + d + EPS);
    for (let layer = from; layer >= to; layer--) {
      if (layerSolid(layer)) {
        move = layer + 1 - lo[axis] + EPS;
        collided = true;
        break;
      }
    }
  }
  if (axis === 0) p.x += move;
  else if (axis === 1) p.y += move;
  else p.z += move;
  return collided;
}

// True if the body's box overlaps any solid block (e.g. after spawning).
export function isStuck(body, world) {
  const p = body.position;
  for (let y = Math.floor(p.y + EPS); y <= Math.floor(p.y + body.height - EPS); y++) {
    for (let x = Math.floor(p.x - body.halfWidth + EPS); x <= Math.floor(p.x + body.halfWidth - EPS); x++) {
      for (let z = Math.floor(p.z - body.halfWidth + EPS); z <= Math.floor(p.z + body.halfWidth - EPS); z++) {
        if (SOLID[world.getBlock(x, y, z)]) return true;
      }
    }
  }
  return false;
}

// Characters don't walk through each other: if two bodies overlap, each is
// nudged half the overlap away from the other (through moveBody, so nobody is
// ever pushed into a wall). `fixed` bodies (e.g. the player vs a villager)
// don't move; the other one takes the whole push.
export function pushApart(a, b, world, { aFixed = false, bFixed = false } = {}) {
  const dx = b.position.x - a.position.x;
  const dz = b.position.z - a.position.z;
  if (Math.abs(b.position.y - a.position.y) > Math.max(a.height ?? 1.8, b.height ?? 1.8)) return;
  const d = Math.hypot(dx, dz);
  const min = a.halfWidth + b.halfWidth;
  if (d < 0.001 || d >= min || (aFixed && bFixed)) return;
  const overlap = min - d;
  const share = aFixed || bFixed ? 1 : 0.5;
  const nx = dx / d;
  const nz = dz / d;
  if (!aFixed) moveBody(a, { x: -nx * overlap * share, y: 0, z: -nz * overlap * share }, world);
  if (!bFixed) moveBody(b, { x: nx * overlap * share, y: 0, z: nz * overlap * share }, world);
}
