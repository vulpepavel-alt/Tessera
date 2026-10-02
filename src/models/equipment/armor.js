// Worn armour on the character model. Every piece is separate: boots only
// change the feet, a chest piece only the body (and shoulders), and so on, so
// any mix of pieces can be worn and taking one off shows the plain clothes
// underneath again.
//
// Two steps:
//   applyArmor(spec, gear)        recolours/reshapes body parts before building
//   addArmorParts(model, gear)    adds extra shapes after building (hats,
//                                 robe skirts, capes, backpacks, quivers)
// gear = { slot: item } (see data/items.js resolveEquipment).

import { VoxelGrid } from '../VoxelGrid.js';
import { attach, VOXEL, HEAD_TOP, lighter, darker } from '../humanoid.js';
import { MATERIALS } from '../../data/items.js';

export function applyArmor(spec, gear, bareHead = false) {
  const head = gear.head && MATERIALS[gear.head.material];
  if (head && !bareHead) applyHead(spec, head);

  const chest = gear.chest && MATERIALS[gear.chest.material];
  if (chest) applyChest(spec, chest);

  const hands = gear.hands && MATERIALS[gear.hands.material];
  if (hands) spec.hands = hands.base;

  const legs = gear.legs && MATERIALS[gear.legs.material];
  if (legs) {
    spec.pants = legs.base;
    if (legs.style === 'mail') spec.legPattern = 'mail';
    if (legs.style === 'plate') spec.kneePlate = legs.glow ? legs.trim : lighter(legs.base, 0.15);
  }

  const feet = gear.feet && MATERIALS[gear.feet.material];
  if (feet) {
    spec.boots = feet.base;
    spec.bootAccent = feet.trim;
  }
}

function applyHead(spec, m) {
  const looks = {
    cloth: 'cap', leather: m.hood ? 'hood' : 'cap', mail: 'coif',
    plate: m.tier >= 6 ? 'greathelm' : 'helmet', light: 'hood', robe: null, // robes: a hat, added later
  };
  spec.headgear = looks[m.style];
  spec.hat = m.style === 'robe';
  spec.headgearColor = m.base;
  spec.headgearTrim = m.trim;
  spec.headgearGlow = m.glow;
  if (m.style === 'light') spec.mask = m.base;
}

function applyChest(spec, m) {
  spec.trim = m.trim;
  switch (m.style) {
    case 'cloth':
      Object.assign(spec, { shirt: m.base, outfitStyle: 'tunic' });
      break;
    case 'leather':
      Object.assign(spec, { shirt: m.base, outfitStyle: 'vest', shirt2: lighter(m.base, 0.25), sash: m.trim });
      if (m.studs) spec.studs = m.trim;
      break;
    case 'mail':
      Object.assign(spec, { shirt: m.base, outfitStyle: 'tunic', pattern: 'mail' });
      break;
    case 'plate':
      Object.assign(spec, { shirt: darker(m.base, 0.25), armor: m.base, pads: m.base, padTrim: m.trim, gem: m.glow });
      spec.bigPads = m.tier >= 5; // late armour: wider shoulders, a heavier silhouette
      break;
    case 'light':
      Object.assign(spec, { shirt: m.base, outfitStyle: 'tunic', sash: m.trim });
      break;
    case 'robe':
      Object.assign(spec, { shirt: m.base, outfitStyle: 'robe', robe: true });
      break;
    default:
      break;
  }
}

export function addArmorParts(model, gear, bareHead = false) {
  const { parts } = model;
  const v = VOXEL;
  const head = gear.head && MATERIALS[gear.head.material];
  if (head?.style === 'robe' && !bareHead) attach(parts.head, wizardHat(head), [9, 0, 8.5], [0, HEAD_TOP - 2 * v, 0]);
  const chest = gear.chest && MATERIALS[gear.chest.material];
  if (chest?.style === 'robe') attach(parts.torso, robeSkirt(chest), [7, 6, 5], [0, 1 * v, 0]);
  if (gear.back) addBack(parts.torso, gear.back);
}

// A pointed hat with a wide brim and a bent tip; bigger and starrier for the best robes.
function wizardHat(m) {
  const big = m.big ? 2 : 0;
  const W = 18;
  const g = new VoxelGrid(W, 16 + big, 17);
  g.box(0, 0, 0, W, 1, 17, m.base).box(0, 0, 0, W, 1, 1, darker(m.base, 0.2));
  g.box(3, 1, 3, 12, 2, 11, m.base).box(3, 1, 3, 12, 1, 11, m.trim);
  g.box(4, 3, 4, 10, 3, 9, m.base).box(5, 6, 5, 8, 3, 7, m.base).box(6, 9, 6, 6, 2, 5, m.base);
  g.box(7, 11, 7, 4, 2, 3, m.base).box(8, 13, 6, 2, 1 + big, 2, m.base).set(8, 14 + big, 5, m.base);
  g.set(12, 2, 13, m.glow ?? m.trim).set(5, 7, 11, m.glow ?? m.trim); // stars sewn on
  return g;
}

// The robe's skirt: from the belt down over the legs, with a trim at the hem.
function robeSkirt(m) {
  const g = new VoxelGrid(14, 7, 10);
  g.box(0, 0, 0, 14, 7, 10, m.base).box(0, 0, 0, 14, 1, 10, m.trim).box(6, 1, 9, 2, 6, 1, m.trim);
  if (m.glow) g.set(3, 3, 9, m.glow).set(10, 4, 9, m.glow);
  return g;
}

function addBack(torso, item) {
  const v = VOXEL;
  if (item.model === 'cape') {
    const g = new VoxelGrid(13, 16, 1).box(0, 0, 0, 13, 16, 1, item.base).box(0, 0, 0, 13, 1, 1, item.trim);
    g.box(0, 15, 0, 13, 1, 1, darker(item.base, 0.2));
    for (let y = 2; y < 15; y += 3) g.set(0, y, 0, darker(item.base, 0.15)).set(12, y, 0, darker(item.base, 0.15)); // folds
    const cape = attach(torso, g, [6.5, 16, 1], [0, 9 * v, -4.6 * v]);
    cape.rotation.x = 0.12;
  } else if (item.model === 'backpack') {
    const g = new VoxelGrid(9, 9, 4).box(0, 0, 0, 9, 9, 4, item.base).box(0, 8, 0, 9, 1, 4, item.trim)
      .box(1, 2, 0, 7, 3, 1, lighter(item.base, 0.15)).box(4, 5, 0, 1, 2, 1, 0xffcc33)
      .box(0, 0, 0, 9, 2, 4, 0xdcc9a0); // rolled blanket at the bottom
    attach(torso, g, [4.5, 0, 4], [0, 1 * v, -4.5 * v]);
  } else if (item.model === 'quiver') {
    const g = new VoxelGrid(4, 14, 3).box(0, 0, 0, 4, 11, 3, item.base).box(0, 10, 0, 4, 1, 3, darker(item.base, 0.3));
    for (let x = 0; x < 4; x += 1) g.box(x, 11, 1, 1, 3 - (x % 2), 1, item.trim).set(x, 13 - (x % 2), 1, 0xdc4b4b); // arrows
    const q = attach(torso, g, [2, 0, 1.5], [2.5 * v, 1 * v, -5.6 * v]);
    q.rotation.z = -0.35;
  }
}
