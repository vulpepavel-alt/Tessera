// A small voxel model of any item, on its own (not worn): what the inventory
// shows in its squares (ui/itemIcons.js renders these into little pictures).
// Weapons, shields and focuses reuse their held models; armour, capes, belts
// and goggles get a compact "lying in the bag" shape in their own colours.

import { VoxelGrid } from '../VoxelGrid.js';
import { MATERIALS } from '../../data/items.js';
import { heldGrid } from './weapons.js';
import { lighter, darker } from '../humanoid/colors.js';

export function itemGrid(item) {
  const held = item.model ? heldGrid(item) : null;
  if (held) return held;
  const m = MATERIALS[item.material] ?? { base: item.base ?? 0xb0a080, trim: item.trim ?? 0x6a5030, style: 'cloth' };
  const make = SHAPES[item.slot === 'back' || item.slot === 'face' || item.slot === 'waist' ? item.model : item.slot];
  return make ? make(m, item) : new VoxelGrid(4, 4, 4).box(0, 0, 0, 4, 4, 4, m.base);
}

const SHAPES = {
  // A helmet / hood / cap: a rounded dome with a band; robes give a pointed hat.
  head(m) {
    if (m.style === 'robe') {
      const g = new VoxelGrid(10, 9, 10).box(0, 0, 0, 10, 1, 10, m.base).box(2, 1, 2, 6, 2, 6, m.trim);
      return g.box(3, 3, 3, 4, 2, 4, m.base).box(4, 5, 4, 2, 2, 2, m.base).set(4, 7, 3, m.base).set(4, 8, 2, m.base);
    }
    const g = new VoxelGrid(9, 7, 9).box(0, 0, 0, 9, 5, 9, m.base).box(1, 5, 1, 7, 1, 7, m.base).box(2, 6, 2, 5, 1, 5, lighter(m.base, 0.12));
    g.box(0, 1, 0, 9, 1, 9, m.trim).box(2, 0, 2, 5, 5, 5, null); // band; hollow inside
    if (m.style === 'plate') g.box(4, 5, 0, 1, 2, 9, m.trim); // crest
    if (m.glow) g.set(4, 3, 8, m.glow);
    return g;
  },
  // A tunic / breastplate seen from the front.
  chest(m) {
    const g = new VoxelGrid(10, 9, 4).box(1, 0, 0, 8, 8, 4, m.base).box(0, 5, 0, 10, 3, 4, m.base);
    g.box(3, 7, 3, 4, 1, 1, m.trim).box(1, 0, 0, 8, 1, 4, darker(m.base, 0.2));
    if (m.style === 'plate') g.box(3, 2, 3, 4, 4, 1, lighter(m.base, 0.18));
    else g.box(4, 1, 3, 2, 6, 1, m.trim);
    if (m.style === 'mail') checker(g, m.base);
    if (m.glow) g.set(4, 4, 3, m.glow).set(5, 4, 3, m.glow);
    return g;
  },
  shoulders(m) {
    const g = new VoxelGrid(12, 3, 5);
    for (const x of [0, 7]) g.box(x, 0, 0, 5, 2, 5, m.base).box(x, 0, 0, 5, 1, 5, m.trim).box(x + 1, 2, 1, 3, 1, 3, lighter(m.base, 0.2));
    return g;
  },
  hands(m) {
    const g = new VoxelGrid(9, 5, 4);
    for (const x of [0, 5]) g.box(x, 0, 0, 4, 4, 4, m.base).box(x, 4, 0, 4, 1, 4, m.trim);
    return g;
  },
  legs(m) {
    const g = new VoxelGrid(8, 8, 4).box(0, 6, 0, 8, 2, 4, m.trim);
    for (const x of [0, 5]) g.box(x, 0, 0, 3, 6, 4, m.base);
    if (m.style === 'mail') checker(g, m.base);
    return g;
  },
  feet(m) {
    const g = new VoxelGrid(10, 5, 7);
    for (const x of [0, 6]) g.box(x, 0, 0, 4, 2, 7, m.base).box(x, 2, 0, 4, 3, 3, m.base).box(x, 0, 0, 4, 1, 7, darker(m.base, 0.4)).box(x, 4, 0, 4, 1, 3, m.trim);
    return g;
  },
  cape(m) {
    const g = new VoxelGrid(9, 11, 2).box(0, 0, 0, 9, 10, 1, m.base).box(0, 10, 0, 9, 1, 2, m.trim);
    for (let y = 1; y < 10; y += 3) g.set(2, y, 0, darker(m.base, 0.15)).set(6, y, 0, darker(m.base, 0.15));
    return g;
  },
  backpack(m) {
    return new VoxelGrid(8, 8, 5).box(0, 0, 0, 8, 8, 5, m.base).box(0, 7, 0, 8, 1, 5, m.trim)
      .box(1, 2, 4, 6, 3, 1, lighter(m.base, 0.15)).box(0, 0, 0, 8, 2, 5, 0xdcc9a0);
  },
  quiver(m) {
    const g = new VoxelGrid(4, 13, 4).box(0, 0, 0, 4, 10, 4, m.base).box(0, 9, 0, 4, 1, 4, darker(m.base, 0.3));
    for (const [x, z] of [[0, 1], [2, 0], [1, 2], [3, 3]]) g.box(x, 10, z, 1, 2, 1, m.trim).set(x, 12, z, 0xdc4b4b);
    return g;
  },
  goggles(m) {
    const g = new VoxelGrid(12, 4, 2).box(0, 1, 0, 12, 2, 1, darker(m.base, 0.35));
    for (const x of [1, 7]) g.box(x, 0, 0, 4, 4, 2, m.base).box(x + 1, 1, 1, 2, 2, 1, m.trim);
    return g;
  },
  scarf(m) {
    return new VoxelGrid(9, 4, 4).box(0, 1, 0, 9, 3, 4, m.base).box(2, 2, 1, 5, 2, 2, null).box(6, 0, 3, 2, 3, 1, m.trim);
  },
  belt(m, item) {
    const g = new VoxelGrid(10, 2, 8).box(0, 0, 0, 10, 2, 8, m.base).box(1, 0, 1, 8, 2, 6, null).box(4, 0, 7, 2, 2, 1, m.trim);
    if (item.pouch) g.box(7, 0, 6, 3, 2, 2, darker(m.base, 0.2));
    return g;
  },
  sash(m) {
    return new VoxelGrid(10, 3, 8).box(0, 0, 0, 10, 2, 8, m.base).box(1, 0, 1, 8, 2, 6, null).box(6, 0, 7, 2, 3, 1, m.trim);
  },
};

function checker(g, color) {
  const dark = darker(color, 0.22);
  for (let y = 0; y < g.sizeY; y++) for (let z = 0; z < g.sizeZ; z++) for (let x = 0; x < g.sizeX; x++) {
    if ((x + y + z) % 2 === 0 && g.get(x, y, z) === color) g.set(x, y, z, dark);
  }
}
