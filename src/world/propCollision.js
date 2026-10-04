// Props (barrels, crates, tables, benches, signposts...) are drawn as models,
// not blocks, so on their own nothing would stop you walking through them.
// When a chunk arrives we mark the cells they stand in as solid in the
// chunk's collision copy of its blocks (the drawn world is unchanged). Small
// things you would step over or around (flower pots, mushrooms) and doors
// stay walk-through.

import { PROP } from '../data/props.js';
import { CHUNK } from '../data/world.js';

const S = CHUNK.size;
const PADDED = S + 2;

// [cells along its length (when turned 0 / 2 it runs along x), height in cells].
// Everything is at least 2 high: characters climb 1-block steps on their own,
// so a 1-high barrier would just be walked over.
const SOLID_PROPS = {
  table: [1, 2], bench: [2, 2], barrel: [1, 2], crate: [1, 2], weaponRack: [1, 2], armorStand: [1, 2],
  signpost: [1, 2], bed: [2, 2], bigRock: [1, 2], log: [2, 2], planter: [1, 2], berryBush: [1, 2],
  pumpkin: [1, 2], sack: [1, 2],
};
const BY_ID = new Map(Object.entries(SOLID_PROPS).map(([name, size]) => [PROP[name], size]));
// Beds run along z in their own model, the rest along x.
const ALONG_Z = new Set([PROP.bed]);

// props: the chunk worker's flat list (x, y, z, turn, type per prop).
export function addPropCollision(voxels, props, cx, cz, solidId) {
  if (!props) return;
  for (let i = 0; i < props.length; i += 5) {
    const size = BY_ID.get(props[i + 4]);
    if (!size) continue;
    const [length, height] = size;
    const turn = props[i + 3];
    const alongX = ALONG_Z.has(props[i + 4]) ? turn % 2 === 1 : turn % 2 === 0;
    const bx = Math.floor(props[i]);
    const by = Math.floor(props[i + 1]);
    const bz = Math.floor(props[i + 2]);
    // A two-cell prop is centred on its spot: it covers the cell and the one before it.
    for (let k = 0; k < length; k++) {
      const off = length === 2 ? k - 1 : 0;
      const x = bx + (alongX ? off : 0) - cx * S + 1;
      const z = bz + (alongX ? 0 : off) - cz * S + 1;
      if (x < 1 || z < 1 || x > S || z > S) continue;
      for (let y = by; y < by + height && y < CHUNK.height; y++) {
        const index = x + PADDED * (z + PADDED * y);
        if (voxels[index] === 0) voxels[index] = solidId;
      }
    }
  }
}
