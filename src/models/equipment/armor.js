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

const piece = (m) => ({ style: m.style, base: m.base, trim: m.trim, glow: m.glow, tier: m.tier, studs: m.studs ? m.trim : null, big: m.big });

export function applyArmor(r, gear, bareHead = false) {
  const head = gear.head && MATERIALS[gear.head.material];
  if (head && !bareHead) {
    if (head.style === 'robe') {
      r.hats.push({ grid: wizardHat(head), pivot: [9, 0, 8], sink: 2 });
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
  if (gear.face?.model === 'goggles') attach(sockets.socket_face, goggles(gear.face), [8, 2, 0], [0, 0, 0]);
  if (gear.waist?.pouch) attach(sockets.socket_hip_R, new VoxelGrid(2, 3, 3).box(0, 0, 0, 2, 3, 3, gear.waist.base).box(0, 2, 0, 2, 1, 3, darker(gear.waist.base, 0.25)).set(1, 1, 2, gear.waist.trim), [0, 2, 1.5], [0, 0, 0]);
  if (gear.waist?.scabbard) {
    const sc = attach(sockets.socket_hip_L, new VoxelGrid(2, 12, 3).box(0, 0, 0, 2, 12, 3, gear.waist.base).box(0, 11, 0, 2, 1, 3, gear.waist.trim).box(0, 0, 0, 2, 1, 3, gear.waist.trim), [2, 11, 1.5], [0, 0, 0]);
    sc.rotation.x = 0.35;
  }
  const chest = gear.chest && MATERIALS[gear.chest.material];
  if (chest?.style === 'robe') attach(model.parts.pelvis, robeSkirt(chest), [5, 6, 4], [0, -2 * VOXEL, 0]);
  if (gear.back) addBack(model.sockets.socket_back, gear.back);
}

// Goggles: a strap round the head and two round lenses over the eyes.
function goggles(item) {
  const g = new VoxelGrid(16, 4, 1).box(0, 1, 0, 16, 2, 1, darker(item.base, 0.35));
  for (const x of [3, 9]) g.box(x, 0, 0, 4, 4, 1, item.base).box(x + 1, 1, 0, 2, 2, 1, item.trim);
  return g;
}

// A pointed hat with a wide brim and a bent tip; taller and starrier for the best robes.
function wizardHat(m) {
  const big = m.big ? 2 : 0;
  const g = new VoxelGrid(18, 16 + big, 16);
  g.box(0, 0, 0, 18, 1, 16, m.base).box(0, 0, 0, 18, 1, 1, darker(m.base, 0.2));
  g.box(2, 1, 2, 14, 2, 12, m.base).box(2, 1, 2, 14, 1, 12, m.trim);
  g.box(4, 3, 4, 10, 3, 8, m.base).box(5, 6, 5, 8, 3, 6, m.base).box(6, 9, 6, 6, 2, 4, m.base);
  g.box(7, 11, 6, 4, 2, 3, m.base).box(8, 13, 5, 2, 1 + big, 2, m.base).set(8, 14 + big, 4, m.base);
  g.set(12, 2, 13, m.glow ?? m.trim).set(5, 7, 11, m.glow ?? m.trim); // stars sewn on
  return g;
}

// The robe's skirt: from the pelvis down over the legs, with a trim at the hem.
function robeSkirt(m) {
  const g = new VoxelGrid(10, 6, 8);
  g.box(0, 0, 0, 10, 6, 8, m.base).box(0, 0, 0, 10, 1, 8, m.trim).box(4, 1, 7, 2, 5, 1, m.trim);
  if (m.glow) g.set(2, 3, 7, m.glow).set(7, 4, 7, m.glow);
  return g;
}

// Capes, backpacks and quivers hang on the back socket (middle of the back).
function addBack(socket, item) {
  const v = VOXEL;
  if (item.model === 'cape') {
    const g = new VoxelGrid(11, 15, 1).box(0, 0, 0, 11, 15, 1, item.base).box(0, 0, 0, 11, 1, 1, item.trim);
    g.box(0, 14, 0, 11, 1, 1, darker(item.base, 0.2));
    for (let y = 2; y < 14; y += 3) g.set(0, y, 0, darker(item.base, 0.15)).set(10, y, 0, darker(item.base, 0.15)); // folds
    const cape = attach(socket, g, [5.5, 15, 1], [0, 4 * v, 0]);
    cape.rotation.x = 0.14;
  } else if (item.model === 'backpack') {
    const g = new VoxelGrid(8, 8, 4).box(0, 0, 0, 8, 8, 4, item.base).box(0, 7, 0, 8, 1, 4, item.trim)
      .box(1, 2, 0, 6, 3, 1, lighter(item.base, 0.15)).box(3, 5, 0, 2, 1, 1, 0xffcc33)
      .box(0, 0, 0, 8, 2, 4, 0xdcc9a0); // rolled blanket at the bottom
    attach(socket, g, [4, 4, 4], [0, 0, 0]);
  } else if (item.model === 'quiver') {
    const g = new VoxelGrid(4, 14, 3).box(0, 0, 0, 4, 11, 3, item.base).box(0, 10, 0, 4, 1, 3, darker(item.base, 0.3));
    for (let x = 0; x < 4; x++) g.box(x, 11, 1, 1, 3 - (x % 2), 1, item.trim).set(x, 13 - (x % 2), 1, 0xdc4b4b); // arrows
    const q = attach(socket, g, [2, 6, 3], [1.5 * v, 0, 0]);
    q.rotation.z = -0.35;
  }
}
