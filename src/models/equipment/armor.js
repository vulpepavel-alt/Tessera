// Worn armour on the character. Every piece is separate (spec section 9):
// boots only change the feet, a chest piece only the torso and arms, and so
// on, so any mix can be worn, and taking a piece off shows the neutral
// underlayer again.
//
//   applyArmor(r, gear)          before building: tells the body builders
//                                which regions are covered, hides hair under
//                                headgear, adds hats and shoulder pads
//   addArmorParts(model, gear)   after building: pieces hung on sockets
//                                (robe skirt on the pelvis, back items)
// gear = { slot: item } (data/items.js resolveEquipment).

import { VoxelGrid } from '../VoxelGrid.js';
import { attach, VOXEL, lighter, darker, hideHair } from '../humanoid.js';
import { MATERIALS } from '../../data/items.js';
import { BODY } from '../../data/characterSpec.js';

const [HW, , HD] = BODY.head.size;
const [PW, PH, PD] = BODY.pelvis.size;

// Hats are a brim 2 cubes wider than the head on every side.
export const HAT_W = HW + 4;
export const HAT_D = HD + 4;
export const HAT_PIVOT = [HAT_W / 2, 0, HAT_D / 2];

const piece = (m) => ({ style: m.style, base: m.base, trim: m.trim, glow: m.glow, tier: m.tier, studs: m.studs ? m.trim : null, big: m.big });

export function applyArmor(r, gear, bareHead = false) {
  const head = gear.head && MATERIALS[gear.head.material];
  if (head && !bareHead) {
    if (head.style === 'robe') {
      r.hats.push({ grid: wizardHat(head), pivot: HAT_PIVOT, sink: 2 });
      hideHair(r, 'hat');
    } else {
      const kind = { cloth: 'cap', leather: head.hood ? 'hood' : 'cap', mail: 'coif', plate: head.tier >= 6 ? 'greathelm' : 'helmet', light: 'hood' }[head.style];
      r.headgear = { kind, color: head.base, trim: head.trim, glow: head.glow };
      hideHair(r, kind);
      if (head.style === 'light') r.mask = head.base; // rogues' hoods come with a face mask
    }
  }
  const chest = gear.chest && MATERIALS[gear.chest.material];
  if (chest) r.chest = piece(chest);
  // Shoulders are their own slot: pauldrons hang on the shoulder sockets.
  const shoulders = gear.shoulders && MATERIALS[gear.shoulders.material];
  if (shoulders) r.pads = { color: shoulders.base, trim: shoulders.trim, big: shoulders.tier >= 5 };
  // Face: a scarf covers the lower face; goggles are added after building.
  if (gear.face?.model === 'scarf' && !bareHead) r.mask = gear.face.base;
  // Waist: a belt painted on the pelvis (pouch / scabbard added after building).
  if (gear.waist) r.belt = { color: gear.waist.base, trim: gear.waist.trim, sash: gear.waist.model === 'sash' };
  const legs = gear.legs && MATERIALS[gear.legs.material];
  if (legs) r.legs = piece(legs);
  const feet = gear.feet && MATERIALS[gear.feet.material];
  if (feet) r.feet = piece(feet);
  const hands = gear.hands && MATERIALS[gear.hands.material];
  if (hands) r.hands = piece(hands);
  if (gear.back) r.compressHair = true; // long hair shortens so it doesn't clip the back item
}

export function addArmorParts(model, gear) {
  const { sockets } = model;
  if (gear.face?.model === 'goggles') attach(sockets.socket_face, goggles(gear.face), [(HW + 2) / 2, 2, 0], [0, 0, 0]);
  if (gear.waist?.pouch) attach(sockets.socket_hip_R, new VoxelGrid(2, 3, 3).box(0, 0, 0, 2, 3, 3, gear.waist.base).box(0, 2, 0, 2, 1, 3, darker(gear.waist.base, 0.25)).set(1, 1, 2, gear.waist.trim), [0, 2, 1.5], [0, 0, 0]);
  if (gear.waist?.scabbard) {
    const sc = attach(sockets.socket_hip_L, new VoxelGrid(2, 12, 3).box(0, 0, 0, 2, 12, 3, gear.waist.base).box(0, 11, 0, 2, 1, 3, gear.waist.trim).box(0, 0, 0, 2, 1, 3, gear.waist.trim), [2, 11, 1.5], [0, 0, 0]);
    sc.rotation.x = 0.35;
  }
  const chest = gear.chest && MATERIALS[gear.chest.material];
  if (chest?.style === 'robe') attach(model.parts.pelvis, robeSkirt(chest), [(PW + 1) / 2, 5, (PD - 1) / 2], [0, -PH * VOXEL, 0]);
  if (gear.back) addBack(model.sockets.socket_back, gear.back);
  if (gear.neck) {
    // The amulet's gem hangs on the upper chest, its chain over the shoulders.
    const n = gear.neck;
    const g = new VoxelGrid(8, 5, 2).box(0, 4, 0, 8, 1, 1, n.base).box(0, 3, 0, 1, 1, 1, n.base).box(7, 3, 0, 1, 1, 1, n.base);
    g.box(1, 2, 0, 1, 1, 1, n.base).box(6, 2, 0, 1, 1, 1, n.base).box(2, 0, 0, 4, 3, 2, darker(n.base, 0.1)).box(3, 1, 1, 2, 1, 1, n.trim);
    attach(sockets.socket_chest, g, [4, 0, 0], [0, 1 * VOXEL, 0.5 * VOXEL]);
  }
}

// Goggles: a strap round the head and two round lenses over the eyes.
function goggles(item) {
  const W = HW + 2; // the strap reaches 1 cube past each side of the head
  const g = new VoxelGrid(W, 4, 1).box(0, 1, 0, W, 2, 1, darker(item.base, 0.35));
  for (const x of [W / 2 - 6, W / 2 + 1]) g.box(x, 0, 0, 4, 4, 1, item.base).box(x + 1, 1, 0, 2, 2, 1, item.trim);
  return g;
}

// A pointed hat with a wide brim and a bent tip; taller and starrier for the best robes.
function wizardHat(m) {
  const big = m.big ? 2 : 0;
  const W = HAT_W;
  const D = HAT_D;
  const cx = W / 2; // the middle column pair is cx - 1, cx
  const g = new VoxelGrid(W, 17 + big, D);
  // Brim, then a cone of shrinking layers (inset from each side, height), bent back at the tip.
  g.box(0, 0, 0, W, 1, D, m.base).box(0, 0, 0, W, 1, 1, darker(m.base, 0.2));
  g.box(2, 1, 2, W - 4, 2, D - 4, m.base).box(2, 1, 2, W - 4, 1, D - 4, m.trim);
  let y = 3;
  for (const [inset, h] of [[4, 3], [5, 3], [6, 2], [7, 2]]) {
    g.box(inset, y, inset, W - inset * 2, h, Math.max(2, D - inset * 2), m.base);
    y += h;
  }
  const cz = Math.floor(D / 2);
  g.box(cx - 1, y, cz - 2, 2, 2 + big, 2, m.base).set(cx - 1, y + 2 + big, cz - 3, m.base);
  g.set(W - 5, 2, D - 3, m.glow ?? m.trim).set(5, 7, D - 6, m.glow ?? m.trim); // stars sewn on
  return g;
}

// The robe's skirt: from the pelvis down over the legs, with a trim at the hem.
function robeSkirt(m) {
  const W = PW + 1;
  const D = PD - 1; // a little thinner than the waist, slightly wider: it hangs over the legs
  const g = new VoxelGrid(W, 5, D);
  g.box(0, 0, 0, W, 5, D, m.base).box(0, 0, 0, W, 1, D, m.trim).box(Math.floor(W / 2) - 1, 1, D - 1, 2, 4, 1, m.trim);
  if (m.glow) g.set(3, 2, D - 1, m.glow).set(W - 4, 3, D - 1, m.glow);
  return g;
}

// Capes, backpacks and quivers hang on the back socket (middle of the back).
function addBack(socket, item) {
  const v = VOXEL;
  if (item.model === 'cape') {
    const g = new VoxelGrid(13, 16, 1).box(0, 0, 0, 13, 16, 1, item.base).box(0, 0, 0, 13, 1, 1, item.trim);
    g.box(0, 15, 0, 13, 1, 1, darker(item.base, 0.2));
    for (let y = 2; y < 15; y += 3) g.set(0, y, 0, darker(item.base, 0.15)).set(12, y, 0, darker(item.base, 0.15)); // folds
    const cape = attach(socket, g, [6.5, 16, 1], [0, 4 * v, 0]);
    cape.rotation.x = 0.14;
  } else if (item.model === 'backpack') {
    const g = new VoxelGrid(10, 9, 5).box(0, 0, 0, 10, 9, 5, item.base).box(0, 8, 0, 10, 1, 5, item.trim)
      .box(1, 3, 0, 8, 3, 1, lighter(item.base, 0.15)).box(4, 6, 0, 2, 1, 1, 0xffcc33)
      .box(0, 0, 0, 10, 2, 5, 0xdcc9a0); // rolled blanket at the bottom
    attach(socket, g, [5, 4.5, 5], [0, 0, 0]);
  } else if (item.model === 'quiver') {
    const g = new VoxelGrid(4, 14, 3).box(0, 0, 0, 4, 11, 3, item.base).box(0, 10, 0, 4, 1, 3, darker(item.base, 0.3));
    for (let x = 0; x < 4; x++) g.box(x, 11, 1, 1, 3 - (x % 2), 1, item.trim).set(x, 13 - (x % 2), 1, 0xdc4b4b); // arrows
    const q = attach(socket, g, [2, 6, 3], [1.5 * v, 0, 0]);
    q.rotation.z = -0.35;
  }
}
