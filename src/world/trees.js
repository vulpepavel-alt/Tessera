// Trees, built from voxels with strong, readable silhouettes:
//   - trunks are thick (1 to 3 cubes), with root flares, knots and branches
//   - crowns are many overlapping rounded clusters of leaves; every leaf cube
//     is coloured by where it sits in the crown: the light shade where the sky
//     can see it (top), the dark shade underneath, the main shade in between,
//     plus a sprinkle of both so the crown reads as lots of little cubes
//   - every tree differs: height, crown width and height, branch positions,
//     colour mix and a little asymmetry (all from the seeded `rng`)
//
// Builders: oakTree (round), tallTree (narrow column), blossomTree (wide,
// flat and pink), pineTree (layered cone). Used through data/biomes.js.

const between = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

// colours = { light, main, dark } (block ids)
function leafColours(f) {
  return { light: f.leavesLight ?? f.leaves, main: f.leaves, dark: f.leavesDark ?? f.leaves };
}

// A crown: the union of rounded lumps. lumps = [[x, y, z, radius, squash]].
function crown(volume, lumps, colours, rng) {
  const cells = new Map();
  for (const [lx, ly, lz, r, squash = 0.8] of lumps) {
    const R = Math.ceil(r) + 1;
    for (let dy = -R; dy <= R; dy++) {
      for (let dz = -R; dz <= R; dz++) {
        for (let dx = -R; dx <= R; dx++) {
          const x = Math.round(lx) + dx;
          const y = Math.round(ly) + dy;
          const z = Math.round(lz) + dz;
          const d = Math.hypot((x - lx) / r, (y - ly) / (r * squash), (z - lz) / r);
          const rough = (hash(x, y, z) - 0.5) * 0.3; // ragged, cube-y outline
          if (d <= 1 + rough) cells.set(key(x, y, z), [x, y, z]);
        }
      }
    }
  }
  const sprinkle = 0.07;
  for (const [x, y, z] of cells.values()) {
    let block = colours.main;
    if (!cells.has(key(x, y + 1, z))) block = colours.light;
    else if (!cells.has(key(x, y - 1, z))) block = colours.dark;
    const n = rng();
    if (n < sprinkle) block = colours.light;
    else if (n > 1 - sprinkle) block = colours.dark;
    volume.setIfAir(x, y, z, block);
  }
}

// A trunk `thick` cubes wide (3 = a plus shape), with a root flare and knots.
function trunk(volume, x, y, z, height, thick, wood, rng) {
  const cells = thick === 1 ? [[0, 0]] : thick === 2 ? [[0, 0], [1, 0], [0, 1], [1, 1]]
    : [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  for (const [dx, dz] of cells) {
    const corner = thick === 3 && dx !== 0 && dz !== 0;
    const h = corner ? Math.floor(height * (0.35 + rng() * 0.3)) : height; // thinner higher up
    for (let dy = 0; dy < h; dy++) volume.set(x + dx, y + dy, z + dz, wood);
  }
  // Roots spreading at the base.
  const reach = thick === 1 ? 1 : thick;
  for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (rng() < 0.75) {
      const len = between(rng, 1, reach);
      for (let k = 1; k <= len; k++) volume.setIfAir(x + ox * (k + (thick > 1 && ox > 0 ? thick - 1 : 0)), y + (k === 1 && thick > 1 ? 1 : 0), z + oz * (k + (thick > 1 && oz > 0 ? thick - 1 : 0)), wood);
    }
  }
  // Knots: little bumps on the bark.
  for (let k = 0; k < thick + 1; k++) {
    const side = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rng() * 4)];
    const ky = y + between(rng, 2, Math.max(2, height - 2));
    volume.setIfAir(x + side[0] * (thick === 3 ? 2 : thick > 1 && side[0] > 0 ? 2 : 1), ky, z + side[1] * (thick === 3 ? 2 : thick > 1 && side[1] > 0 ? 2 : 1), wood);
  }
}

// A branch from the trunk out and up to (tx, ty, tz); returns the end point.
function branch(volume, x, y, z, angle, length, rise, wood) {
  let bx = x;
  let by = y;
  let bz = z;
  for (let k = 1; k <= length; k++) {
    bx = x + Math.cos(angle) * k;
    bz = z + Math.sin(angle) * k;
    by = y + Math.round((k / length) * rise);
    volume.set(Math.round(bx), by, Math.round(bz), wood);
  }
  return [bx, by, bz];
}

export const TREE_BUILDERS = {
  // Round leafy tree in three sizes; the big ones branch into side crowns.
  oakTree(volume, x, y, z, f, rng) {
    const size = rng() < 0.15 ? 2 : rng() < 0.55 ? 1 : 0; // 0 small, 1 medium, 2 giant (rare)
    const height = [between(rng, 5, 7), between(rng, 8, 11), between(rng, 12, 16)][size] + (f.tall ? 2 : 0);
    const thick = [1, 2, 3][size];
    trunk(volume, x, y, z, height + 1, thick, f.trunk, rng);
    const cx = x + (thick === 2 ? 0.5 : 0) + (rng() - 0.5) * 1.5;
    const cz = z + (thick === 2 ? 0.5 : 0) + (rng() - 0.5) * 1.5;
    const r = [3.2, 4.6, 6.2][size] + rng() * 1.2;
    const top = y + height + r * 0.4;
    const lumps = [[cx, top, cz, r, 0.72]];
    const around = 3 + size * 2;
    for (let k = 0; k < around; k++) {
      const a = (k / around) * Math.PI * 2 + rng() * 0.8;
      const d = r * (0.5 + rng() * 0.35);
      lumps.push([cx + Math.cos(a) * d, top + (rng() - 0.35) * r * 0.6, cz + Math.sin(a) * d, r * (0.45 + rng() * 0.2), 0.8]);
    }
    // Branches with their own smaller crowns, lower down.
    for (let k = 0; k < size; k++) {
      const a = rng() * Math.PI * 2;
      const by = y + Math.floor(height * (0.45 + rng() * 0.25));
      const [ex, ey, ez] = branch(volume, x, by, z, a, Math.round(r * 0.8), 2, f.trunk);
      lumps.push([ex, ey + 1.5, ez, r * 0.5, 0.75]);
    }
    crown(volume, lumps, leafColours(f), rng);
  },

  // A narrow, tall tree: a stack of rounded clusters up a straight trunk.
  tallTree(volume, x, y, z, f, rng) {
    const height = between(rng, 9, 14);
    trunk(volume, x, y, z, height, 2, f.trunk, rng);
    const lumps = [];
    const r = 2.6 + rng() * 0.8;
    for (let k = 0; k < 4; k++) {
      const t = k / 3;
      lumps.push([x + 0.5 + (rng() - 0.5), y + height * 0.45 + t * height * 0.75, z + 0.5 + (rng() - 0.5), r * (1.05 - t * 0.4), 1.1]);
    }
    crown(volume, lumps, leafColours(f), rng);
  },

  // Pink blossom tree: a crooked leaning trunk, two or three branches, and a
  // wide, flat crown of flowers; petals lie on the grass below.
  blossomTree(volume, x, y, z, f, rng) {
    const height = between(rng, 5, 8);
    const lean = rng() * Math.PI * 2;
    let tx = x;
    let tz = z;
    for (let dy = 0; dy <= height; dy++) {
      volume.set(Math.round(tx), y + dy, Math.round(tz), f.trunk);
      volume.set(Math.round(tx) + 1, y + dy, Math.round(tz), f.trunk);
      if (dy > 2) { tx += Math.cos(lean) * 0.4; tz += Math.sin(lean) * 0.4; }
    }
    const top = y + height + 1;
    const r = 4.5 + rng() * 1.5;
    const lumps = [[tx, top, tz, r, 0.5]];
    const arms = between(rng, 2, 3);
    for (let k = 0; k < arms; k++) {
      const a = lean + Math.PI * (0.5 + k * 0.7) + rng() * 0.5;
      const [ex, ey, ez] = branch(volume, Math.round(tx), y + height - 2, Math.round(tz), a, Math.round(r * 0.7), 2, f.trunk);
      lumps.push([ex, ey + 1, ez, r * 0.6, 0.55]);
    }
    crown(volume, lumps, leafColours(f), rng);
    for (let k = 0; k < 8; k++) {
      volume.setIfAir(Math.round(tx + (rng() - 0.5) * r * 2.2), y, Math.round(tz + (rng() - 0.5) * r * 2.2), f.petals);
    }
  },

  // A spruce: layered tiers of needles with ragged edges, wide at the bottom,
  // a pointed tip; giants get a thick trunk with roots.
  pineTree(volume, x, y, z, f, rng) {
    const giant = rng() < 0.5;
    const height = giant ? between(rng, 16, 22) : between(rng, 8, 12);
    const base = giant ? 6 : 3.5;
    const first = giant ? 4 : 2;
    const dark = f.leavesDark ?? f.leaves;
    const ox = (rng() - 0.5) * 0.8; // slight asymmetry
    const oz = (rng() - 0.5) * 0.8;
    const c = giant ? 0.5 : 0;
    for (let dy = first; dy <= height; dy++) {
      const t = (dy - first) / (height - first);
      const tier = (height - dy) % 3; // wide, medium, narrow
      const radius = (1 - t) * base * (1 - tier * 0.22) + 0.6;
      const R = Math.ceil(radius) + 1;
      for (let dz = -R; dz <= R; dz++) {
        for (let dx = -R; dx <= R; dx++) {
          const px = x + dx;
          const pz = z + dz;
          const d = Math.hypot(px - x - c - ox * t, pz - z - c - oz * t);
          if (d <= radius + (hash(px, y + dy, pz) - 0.5) * 0.8) volume.setIfAir(px, y + dy, pz, tier === 0 ? dark : f.leaves);
        }
      }
    }
    volume.setIfAir(x, y + height + 1, z, f.leaves);
    volume.setIfAir(x, y + height + 2, z, f.leaves);
    trunk(volume, x, y, z, height - 1, giant ? 2 : 1, f.trunk, rng);
  },
};

// Old name kept so saved biome lists keep working.
TREE_BUILDERS.roundTree = TREE_BUILDERS.oakTree;

function key(x, y, z) {
  return `${x},${y},${z}`;
}

// A quick, repeatable 0..1 number for a position (no random state used).
function hash(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
