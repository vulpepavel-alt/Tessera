// Draws up the plan of one village: the square, houses, market stalls, well,
// lamps, fields and the people who live there. Only positions and choices —
// VillageBuilder.js turns the plan into blocks, and the game turns the
// residents into walking villagers.

import { VILLAGE, VILLAGE_STYLES, STALLS, VILLAGE_NAME_PARTS, VILLAGER_NAME_PARTS } from '../data/villages.js';
import { BLOCK } from '../data/blocks.js';
import { createRng } from './random.js';

const FLOWERS = [BLOCK.FLOWER_RED, BLOCK.FLOWER_PINK, BLOCK.FLOWER_BLUE];

export function planVillage(seed, id, centre, baseY, biomeId) {
  const rng = createRng(seed, `village:${id}`);
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const between = (min, max) => min + Math.floor(rng() * (max - min + 1));
  const style = VILLAGE_STYLES[biomeId];
  const cx = centre.x;
  const cz = centre.z;
  const ph = VILLAGE.plazaHalf;

  const plan = {
    id, biomeId, style, baseY,
    name: pick(VILLAGE_NAME_PARTS.first) + pick(VILLAGE_NAME_PARTS.second),
    center: { x: cx, z: cz },
    radius: VILLAGE.radius,
    plaza: { x0: cx - ph, x1: cx + ph, z0: cz - ph, z1: cz + ph },
    houses: [], stalls: [], fields: [], residents: [],
    lamps: [[cx - ph, cz - ph], [cx + ph, cz - ph], [cx - ph, cz + ph], [cx + ph, cz + ph]],
  };
  const taken = [expand(plan.plaza, 2)];

  // Houses on a ring around the square, doors facing the middle.
  const count = between(VILLAGE.houses[0], VILLAGE.houses[1]);
  const start = rng() * Math.PI * 2;
  for (let k = 0; k < count; k++) {
    const angle = start + (k / count) * Math.PI * 2 + (rng() - 0.5) * 0.3;
    const dist = between(VILLAGE.houseRing[0], VILLAGE.houseRing[1]);
    const w = rng() < 0.5 ? 7 : 9;
    const d = rng() < 0.5 ? 7 : 9;
    const hx = Math.round(cx + Math.cos(angle) * dist);
    const hz = Math.round(cz + Math.sin(angle) * dist);
    const box = { x0: hx - (w - 1) / 2, x1: hx + (w - 1) / 2, z0: hz - (d - 1) / 2, z1: hz + (d - 1) / 2 };
    if (taken.some((t) => overlaps(t, expand(box, 4)))) continue; // a good gap between houses
    taken.push(box);
    plan.houses.push({ ...box, door: doorFacing(box, hx, hz, cx, cz), roof: pick(style.roofs),
      chimney: rng() < 0.5, flowers: pick(FLOWERS) });
  }

  // The first house is the Guild Hall, where the Guildmaster teaches specializations.
  if (plan.houses.length) plan.houses[0].guild = true;

  // Market stalls along the north side of the square.
  STALLS.forEach((stall, k) => {
    const sx = cx - 7 + k * 7;
    const sz = cz - ph + 2;
    plan.stalls.push({ ...stall, x: sx, z: sz, vendorSpot: { x: sx + 0.5, z: sz - 0.5 } });
  });

  // Crop fields outside the ring of houses.
  if (style.crops) {
    for (let k = 0; k < 8 && plan.fields.length < 2; k++) {
      const angle = rng() * Math.PI * 2;
      const fx = Math.round(cx + Math.cos(angle) * VILLAGE.fieldDistance);
      const fz = Math.round(cz + Math.sin(angle) * VILLAGE.fieldDistance);
      const box = { x0: fx - 3, x1: fx + 3, z0: fz - 2, z1: fz + 2 };
      if (taken.some((t) => overlaps(t, expand(box, 2)))) continue;
      taken.push(box);
      plan.fields.push({ ...box, crop: rng() < 0.6 ? 'wheat' : 'sunflower' });
    }
  }

  // The people: one or two per house, a vendor per stall, and a guard or two.
  const name = () => pick(VILLAGER_NAME_PARTS.first) + pick(VILLAGER_NAME_PARTS.second);
  for (const house of plan.houses) {
    const n = rng() < 0.5 ? 1 : 2;
    for (let k = 0; k < n; k++) plan.residents.push({ name: name(), role: 'villager', home: house.door.outside, look: rng() });
  }
  plan.stalls.forEach((stall, k) => {
    const home = plan.houses[k % Math.max(plan.houses.length, 1)]?.door.outside ?? stall.vendorSpot;
    plan.residents.push({ name: name(), role: stall.role, title: stall.title, post: stall.vendorSpot, home, look: rng() });
  });
  const hall = plan.houses.find((h) => h.guild);
  if (hall) {
    plan.residents.push({ name: name(), role: 'guildmaster', title: 'Guildmaster', post: hall.door.outside, home: hall.door.outside, look: rng() });
  }
  const guards = rng() < 0.5 ? 1 : 2;
  for (let k = 0; k < guards; k++) {
    plan.residents.push({ name: name(), role: 'guard', title: 'Guard', home: { x: cx + 0.5, z: cz + ph }, look: rng() });
  }
  return plan;
}

// The door goes in the wall that faces the village centre.
function doorFacing(box, hx, hz, cx, cz) {
  const vx = cx - hx;
  const vz = cz - hz;
  let x = hx;
  let z = hz;
  let dx = 0;
  let dz = 0;
  if (Math.abs(vx) > Math.abs(vz)) {
    dx = Math.sign(vx);
    x = dx > 0 ? box.x1 : box.x0;
  } else {
    dz = Math.sign(vz) || 1;
    z = dz > 0 ? box.z1 : box.z0;
  }
  return { x, z, dx, dz, outside: { x: x + dx * 1.5 + 0.5, z: z + dz * 1.5 + 0.5 } };
}

function expand(box, m) {
  return { x0: box.x0 - m, x1: box.x1 + m, z0: box.z0 - m, z1: box.z1 + m };
}

function overlaps(a, b) {
  return a.x0 <= b.x1 && a.x1 >= b.x0 && a.z0 <= b.z1 && a.z1 >= b.z0;
}
