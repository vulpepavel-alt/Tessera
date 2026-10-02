// Turns a village plan (VillagePlanner.js) into blocks inside one chunk.
// Every write goes through volume.set, which ignores blocks outside the chunk,
// so each chunk simply builds its own slice of the village.

import { BLOCK } from '../data/blocks.js';
import { PROP } from '../data/props.js';
import { steepRoof, windowHoods, chimney, backExtension } from './houseShapes.js';

export function stampVillage(volume, plan) {
  const y = plan.baseY;
  const s = plan.style;

  // The paved square.
  const p = plan.plaza;
  fill(volume, p.x0, y, p.z0, p.x1, y, p.z1, s.path);

  // Paths from every door to the square (built first, so houses sit on top).
  for (const h of plan.houses) path(volume, plan, h.door, s.path);

  for (const h of plan.houses) house(volume, h, y, s);
  for (const st of plan.stalls) stall(volume, st, y);
  well(volume, plan.center.x, y, plan.center.z);
  for (const [lx, lz] of plan.lamps) lamp(volume, lx, y, lz);
  for (const f of plan.fields) field(volume, f, y);
  pavilion(volume, plan, y);
  squareProps(volume, plan, y);
}

// Which quarter-turn makes a prop (built facing +Z) face direction (dx, dz).
function turnFor(dx, dz) {
  if (dz > 0) return 0;
  if (dx > 0) return 1;
  if (dz < 0) return 2;
  return 3;
}

// A little roofed pavilion with a table, in the south-west of the square.
function pavilion(volume, plan, y) {
  const x0 = plan.center.x - 6;
  const z0 = plan.center.z + 2;
  for (const [dx, dz] of [[0, 0], [4, 0], [0, 4], [4, 4]]) fill(volume, x0 + dx, y + 1, z0 + dz, x0 + dx, y + 3, z0 + dz, BLOCK.DARK_PLANKS);
  fill(volume, x0 - 1, y + 4, z0 - 1, x0 + 5, y + 4, z0 + 5, BLOCK.DARK_PLANKS);
  fill(volume, x0, y + 4, z0, x0 + 4, y + 4, z0 + 4, BLOCK.ROOF_RED);
  fill(volume, x0 + 1, y + 5, z0 + 1, x0 + 3, y + 5, z0 + 3, BLOCK.ROOF_RED);
  volume.set(x0 + 2, y + 6, z0 + 2, BLOCK.ROOF_RED);
  const cx = x0 + 2.5;
  const cz = z0 + 2.5;
  volume.addProp(PROP.table, cx, y + 1, cz, 0);
  volume.addProp(PROP.vase, cx - 0.3, y + 1.75, cz, 0);
  volume.addProp(PROP.flowerPot, cx + 0.4, y + 1.75, cz + 0.2, 0);
  volume.addProp(PROP.chair, cx, y + 1, cz - 1, 0);
  volume.addProp(PROP.chair, cx, y + 1, cz + 1, 2);
}

// Benches, a signpost, flower pots around the well, crates by the stalls.
function squareProps(volume, plan, y) {
  const { x, z } = plan.center;
  const p = plan.plaza;
  volume.addProp(PROP.bench, x + 4.5, y + 1, z + 4.5, 2);
  volume.addProp(PROP.bench, x + 4.5, y + 1, z + 1.5, 0);
  volume.addProp(PROP.signpost, x + 3.5, y + 1, p.z1 + 1.5, 0);
  for (const [dx, dz] of [[-1.6, -1.6], [2.6, -1.6], [-1.6, 2.6], [2.6, 2.6]]) volume.addProp(PROP.flowerPot, x + dx, y + 1, z + dz, 0);
  volume.addProp(PROP.crate, p.x0 + 1.5, y + 1, p.z0 + 1.5, 0);
  volume.addProp(PROP.barrel, p.x0 + 2.5, y + 1, p.z0 + 1.5, 0);
  volume.addProp(PROP.barrel, p.x1 - 0.5, y + 1, p.z0 + 1.5, 0);
}

function fill(volume, x0, y0, z0, x1, y1, z1, block) {
  for (let y = y0; y <= y1; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) volume.set(x, y, z, block);
    }
  }
}

// An L-shaped path from just outside the door to the square.
function path(volume, plan, door, block) {
  const y = plan.baseY;
  let x = door.x + door.dx;
  let z = door.z + door.dz;
  const p = plan.plaza;
  const inPlaza = () => x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1;
  for (let i = 0; i < 60 && !inPlaza(); i++) {
    volume.set(x, y, z, block);
    if (x < p.x0) x++;
    else if (x > p.x1) x--;
    else if (z < p.z0) z++;
    else z--;
  }
}

// Also used on its own by the benchmark scene (world/BenchmarkGenerator.js).
export function buildHouse(volume, h, y, s) {
  house(volume, h, y, s);
}

function house(volume, h, y, s) {
  const { x0, x1, z0, z1, door } = h;
  const top = y + 4; // walls are 4 blocks tall
  fill(volume, x0, y, z0, x1, y, z1, s.floor);
  // Clear the inside (in case terrain blending left something).
  fill(volume, x0 + 1, y + 1, z0 + 1, x1 - 1, top + 6, z1 - 1, BLOCK.AIR);

  for (let wy = y + 1; wy <= top; wy++) {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const edgeX = x === x0 || x === x1;
        const edgeZ = z === z0 || z === z1;
        if (!edgeX && !edgeZ) continue;
        const corner = edgeX && edgeZ;
        // Half-timbered walls: dark beams on the corners, along the top and one
        // upright post in the middle of each wall; white plaster in between.
        const along = edgeX ? z - z0 : x - x0;
        const middle = Math.floor((edgeX ? z1 - z0 : x1 - x0) / 2);
        const beam = corner || along === middle || wy === top;
        volume.set(x, wy, z, beam ? s.frame : s.wall);
      }
    }
  }
  // Windows: two per wall, at eye height (each gets a wooden hood above it).
  const lenX = x1 - x0;
  const lenZ = z1 - z0;
  const windows = [];
  for (const off of [2, lenX - 2]) windows.push({ x: x0 + off, z: z0, dx: 0, dz: -1 }, { x: x0 + off, z: z1, dx: 0, dz: 1 });
  for (const off of [2, lenZ - 2]) windows.push({ x: x0, z: z0 + off, dx: -1, dz: 0 }, { x: x1, z: z0 + off, dx: 1, dz: 0 });
  for (const wy of [y + 2, y + 3]) for (const w of windows) volume.set(w.x, wy, w.z, BLOCK.WINDOW);
  // The doorway (2 blocks high) and flowers along the front wall.
  volume.set(door.x, y + 1, door.z, BLOCK.AIR);
  volume.set(door.x, y + 2, door.z, BLOCK.AIR);
  frontFlowers(volume, h, y);
  windowHoods(volume, windows, y, s.frame);
  const ridge = steepRoof(volume, h, top, s.frame, s.wall);
  if (h.chimney) chimney(volume, h, top, ridge);
  if (!h.guild) backExtension(volume, h, y, s);
  houseProps(volume, h, y);
  if (h.guild) guildDetails(volume, h, y, top);
}

// The Guild Hall: stone walls, banners beside the door and a flag on the roof.
function guildDetails(volume, h, y, top) {
  const { door } = h;
  for (let x = h.x0; x <= h.x1; x++) {
    for (let z = h.z0; z <= h.z1; z++) {
      const edge = x === h.x0 || x === h.x1 || z === h.z0 || z === h.z1;
      if (!edge) continue;
      for (let wy = y + 1; wy <= top; wy++) {
        const b = volume.get?.(x, wy, z);
        if (b === BLOCK.WINDOW || b === BLOCK.AIR) continue;
        volume.set(x, wy, z, wy === top || ((x === h.x0 || x === h.x1) && (z === h.z0 || z === h.z1)) ? BLOCK.DARK_PLANKS : BLOCK.STONE_BRICK);
      }
    }
  }
  // Banners: tall blue-and-gold strips either side of the door.
  for (const side of [-2, 2]) {
    const bx = door.x + (door.dz !== 0 ? side : 0);
    const bz = door.z + (door.dx !== 0 ? side : 0);
    for (let wy = y + 1; wy <= y + 3; wy++) volume.set(bx, wy, bz, BLOCK.AWNING_BLUE);
    volume.set(bx, y + 4, bz, BLOCK.AWNING_WHITE);
  }
  // A flag pole on the roof.
  const px = h.x0 + 1;
  const pz = h.z0 + 1;
  for (let py = top + 1; py <= top + 10; py++) volume.set(px, py, pz, BLOCK.DARK_PLANKS);
  fill(volume, px + 1, top + 8, pz, px + 3, top + 9, pz, BLOCK.AWNING_RED);
  volume.set(px + 2, top + 8, pz, BLOCK.AWNING_WHITE);
}

// Door, shutters, pots, barrels outside; table, chairs and a bed inside.
function houseProps(volume, h, y) {
  const { door } = h;
  const turn = turnFor(door.dx, door.dz);
  // The door sits in the doorway, flush with the outside of the wall.
  volume.addProp(PROP.door, door.x + 0.5 + door.dx * 0.44, y + 1, door.z + 0.5 + door.dz * 0.44, turn);
  // Flower pots on both sides of the door.
  const sx = door.dz !== 0 ? 1 : 0;
  const sz = door.dx !== 0 ? 1 : 0;
  for (const side of [-1.3, 1.3]) {
    volume.addProp(PROP.flowerPot, door.x + 0.5 + door.dx * 1.1 + sx * side, y + 1, door.z + 0.5 + door.dz * 1.1 + sz * side, turn);
  }
  // Shutters beside every window, on the outside of the wall.
  const lenX = h.x1 - h.x0;
  const lenZ = h.z1 - h.z0;
  for (const off of [2, lenX - 2]) {
    for (const [wz, dz] of [[h.z0, -1], [h.z1, 1]]) {
      const zf = wz + 0.5 + dz * 0.55;
      volume.addProp(PROP.shutter, h.x0 + off - 0.2, y + 2, zf, turnFor(0, dz));
      volume.addProp(PROP.shutter, h.x0 + off + 1.2, y + 2, zf, turnFor(0, dz));
    }
  }
  for (const off of [2, lenZ - 2]) {
    for (const [wx, dx] of [[h.x0, -1], [h.x1, 1]]) {
      const xf = wx + 0.5 + dx * 0.55;
      volume.addProp(PROP.shutter, xf, y + 2, h.z0 + off - 0.2, turnFor(dx, 0));
      volume.addProp(PROP.shutter, xf, y + 2, h.z0 + off + 1.2, turnFor(dx, 0));
    }
  }
  // A barrel and a crate by the back corner.
  const bx = door.dx > 0 ? h.x0 - 0.8 : h.x1 + 1.8;
  const bz = door.dz > 0 ? h.z0 - 0.3 : h.z1 + 0.7;
  volume.addProp(PROP.barrel, bx, y + 1, bz, 0);
  volume.addProp(PROP.crate, bx, y + 1, bz + (door.dz > 0 ? 0.9 : -0.9), 0);
  // Inside: a table with a vase, two chairs, and a bed against the far wall.
  const cx = (h.x0 + h.x1) / 2 + 0.5;
  const cz = (h.z0 + h.z1) / 2 + 0.5;
  volume.addProp(PROP.table, cx, y + 1, cz, turn);
  volume.addProp(PROP.vase, cx, y + 1.75, cz, 0);
  volume.addProp(PROP.chair, cx - (sx ? 1.1 : 0), y + 1, cz - (sz ? 1.1 : 0), turn);
  volume.addProp(PROP.chair, cx + (sx ? 1.1 : 0), y + 1, cz + (sz ? 1.1 : 0), (turn + 2) % 4);
  const back = { x: cx - door.dx * ((lenX - 2) / 2), z: cz - door.dz * ((lenZ - 2) / 2) };
  volume.addProp(PROP.bed, back.x + sx * 1.5, y + 1, back.z + sz * 1.5, turnFor(door.dz !== 0 ? 0 : -door.dx, door.dz !== 0 ? -door.dz : 0) % 4);
}

// Flower boxes along the front wall, leaving room around the door.
function frontFlowers(volume, h, y) {
  const { door } = h;
  const turn = turnFor(door.dx, door.dz);
  if (door.dz !== 0) {
    const z = door.z + 0.5 + door.dz * 0.75;
    for (let x = h.x0 + 1; x <= h.x1 - 1; x++) if (Math.abs(x - door.x) > 1) volume.addProp(PROP.planter, x + 0.5, y + 1, z, turn);
  } else {
    const x = door.x + 0.5 + door.dx * 0.75;
    for (let z = h.z0 + 1; z <= h.z1 - 1; z++) if (Math.abs(z - door.z) > 1) volume.addProp(PROP.planter, x, y + 1, z + 0.5, turn);
  }
}

// A market stall: four posts, a counter and a striped awning.
function stall(volume, st, y) {
  const { x, z } = st;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    fill(volume, x + dx, y + 1, z + dz, x + dx, y + 2, z + dz, BLOCK.DARK_PLANKS);
  }
  fill(volume, x - 1, y + 1, z + 1, x + 1, y + 1, z + 1, BLOCK.PLANKS); // counter (front)
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) volume.set(x + dx, y + 3, z + dz, (dx + 1) % 2 === 0 ? st.awning : BLOCK.AWNING_WHITE);
  }
  // Goods: what each vendor sells, on the counter and behind it.
  if (st.role === 'weaponsmith') {
    volume.addProp(PROP.weaponRack, x + 0.5, y + 1, z - 0.6, 0);
    volume.addProp(PROP.crate, x + 2.6, y + 1, z + 0.5, 0);
  } else if (st.role === 'armorer') {
    volume.addProp(PROP.armorStand, x - 0.2, y + 1, z - 0.6, 0);
    volume.addProp(PROP.armorStand, x + 1.2, y + 1, z - 0.6, 0);
  } else {
    volume.addProp(PROP.fruitBasket, x + 0.5, y + 2, z + 1.5, 0);
    volume.addProp(PROP.fruitBasket, x - 0.3, y + 2, z + 1.5, 1);
    volume.addProp(PROP.sack, x + 2.5, y + 1, z + 0.3, 0);
    volume.addProp(PROP.sack, x + 2.6, y + 1, z + 1.1, 1);
  }
}

function well(volume, x, y, z) {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) continue;
      volume.set(x + dx, y + 1, z + dz, BLOCK.COBBLE);
    }
  }
  volume.set(x, y, z, BLOCK.WATER);
  volume.set(x, y - 1, z, BLOCK.WATER);
  fill(volume, x - 1, y + 2, z, x - 1, y + 3, z, BLOCK.DARK_PLANKS);
  fill(volume, x + 1, y + 2, z, x + 1, y + 3, z, BLOCK.DARK_PLANKS);
  fill(volume, x - 1, y + 4, z - 1, x + 1, y + 4, z + 1, BLOCK.ROOF_RED);
}

function lamp(volume, x, y, z) {
  fill(volume, x, y + 1, z, x, y + 2, z, BLOCK.DARK_PLANKS);
  volume.set(x, y + 3, z, BLOCK.LAMP);
}

// Tilled soil with rows of crops, a fence around it and some hay.
function field(volume, f, y) {
  fill(volume, f.x0, y, f.z0, f.x1, y, f.z1, BLOCK.FARMLAND);
  for (let x = f.x0; x <= f.x1; x++) {
    for (let z = f.z0; z <= f.z1; z++) {
      if (f.crop === 'wheat') volume.set(x, y + 1, z, BLOCK.WHEAT);
      else if ((x + z) % 2 === 0) {
        volume.set(x, y + 1, z, BLOCK.SUNFLOWER_STEM);
        volume.set(x, y + 2, z, BLOCK.SUNFLOWER_STEM);
        volume.set(x, y + 3, z, BLOCK.SUNFLOWER);
      }
    }
  }
  // Fence with an opening in the middle of one side.
  const midX = Math.round((f.x0 + f.x1) / 2);
  for (let x = f.x0 - 1; x <= f.x1 + 1; x++) {
    volume.set(x, y + 1, f.z0 - 1, BLOCK.DARK_PLANKS);
    if (x !== midX) volume.set(x, y + 1, f.z1 + 1, BLOCK.DARK_PLANKS);
  }
  for (let z = f.z0; z <= f.z1; z++) {
    volume.set(f.x0 - 1, y + 1, z, BLOCK.DARK_PLANKS);
    volume.set(f.x1 + 1, y + 1, z, BLOCK.DARK_PLANKS);
  }
  volume.addProp(PROP.pumpkin, f.x0 - 1.5, y + 1, f.z0 + 0.5, 0);
  volume.addProp(PROP.pumpkin, f.x0 - 1.5, y + 1, f.z0 + 1.7, 1);
  volume.set(f.x1 + 2, y + 1, f.z1, BLOCK.HAY);
  volume.set(f.x1 + 2, y + 1, f.z1 - 1, BLOCK.HAY);
  volume.set(f.x1 + 2, y + 2, f.z1, BLOCK.HAY);
}
