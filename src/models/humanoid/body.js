// The body parts below the head, sized exactly as data/characterSpec.js says:
// torso 10x8x6 (three frames), pelvis 8x3x6, arms 3x7x3, hands 4x4x4,
// legs 4x7x4, feet 5x2x7. Each part is a separate rigid piece.
//
// Layers (spec 9.5): skin -> starter underlayer -> body overlays -> leg /
// chest armour -> boots / gloves. All of it is painted onto the part's own
// cubes (never more than 1 MV outside the body), so parts stay aligned.
//
// r = the resolved look (models/humanoid.js resolveLook): skin ramp,
// underlayer, NPC clothing modules and worn armour.

import { VoxelGrid } from '../VoxelGrid.js';
import { lighter, darker } from './colors.js';

const GOLD = 0xffcc33;

// ---- Torso -----------------------------------------------------------------
export function torsoGrid(r) {
  const broad = r.frame === 'broad' ? 1 : 0;
  const W = 10 + broad * 2;
  const H = 8;
  const D = 6;
  const g = new VoxelGrid(W, H, D);
  const x0 = broad;
  g.box(x0, 0, 0, 10, H, D, r.skin.base);
  if (broad) g.box(0, H - 3, 0, W, 3, D, r.skin.base); // wider shoulders
  if (r.frame === 'soft') for (const [x, z] of [[0, 0], [9, 0], [0, 5], [9, 5]]) g.box(x, 0, z, 1, H, 1, null);

  const front = D - 1;
  const paint = (color) => {
    for (let y = 0; y < H; y++) for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (g.get(x, y, z) !== null) g.set(x, y, z, color);
  };
  const under = r.under1;
  paint(under);
  // Neckline: a little V of skin at the top front.
  g.set(x0 + 4, H - 1, front, r.skin.base).set(x0 + 5, H - 1, front, r.skin.base);
  if (r.underlayer === 'tunic') g.set(x0 + 4, H - 2, front, r.skin.shadow).set(x0 + 5, H - 2, front, r.skin.shadow);
  g.box(0, 0, 0, W, 1, D, darker(under, 0.18)); // hem
  if (r.underlayer === 'tunic' && broad) for (const x of [0, W - 1]) g.box(x, H - 3, 0, 1, 3, D, r.skin.base); // sleeveless

  // Villager clothing modules over the underlayer.
  const c = r.clothing;
  if (c?.style === 'vest') {
    g.box(0, 1, front, x0 + 3, 7, 1, c.color).box(x0 + 7, 1, front, W - x0 - 7, 7, 1, c.color);
    g.box(0, 1, 0, W, 7, 1, c.color);
    for (const y of [2, 4, 6]) g.set(x0 + 3, y, front, GOLD);
  } else if (c?.style === 'jacket') {
    paint(c.color);
    g.box(x0 + 4, 1, front, 2, 7, 1, 0xf4f1ea).box(x0 + 4, 2, front, 1, 5, 1, c.trim);
  } else if (c?.style === 'robe') {
    paint(c.color);
    g.box(x0 + 4, 0, front, 2, H, 1, c.trim).box(x0 + 2, H - 1, front, 6, 1, 1, c.trim);
  }
  if (c?.apron) g.box(x0 + 2, 0, front, 6, 6, 1, c.apron).box(x0 + 2, 5, front, 6, 1, 1, darker(c.apron, 0.15));
  if (c?.sash) for (let i = 0; i < 7; i++) g.set(x0 + 1 + i, 1 + i, front, c.sash).set(x0 + 8 - i, 1 + i, 0, c.sash);

  // Chest armour.
  const a = r.chest;
  if (a) {
    paint(a.style === 'plate' ? darker(a.base, 0.2) : a.base);
    if (a.style === 'plate') {
      g.box(x0 + 1, 1, front, 8, 6, 1, a.base).box(x0 + 2, 2, front, 6, 4, 1, lighter(a.base, 0.18));
      for (const [x, y] of [[1, 2], [8, 2], [1, 6], [8, 6]]) g.set(x0 + x, y, front, a.trim);
      g.box(x0 + 3, H - 1, front, 4, 1, 1, a.trim);
      if (a.glow) g.box(x0 + 4, 4, front, 2, 1, 1, a.glow);
    } else if (a.style === 'mail') {
      checker(g, a.base);
      g.box(0, H - 1, 0, W, 1, D, a.trim);
    } else if (a.style === 'leather') {
      g.box(x0 + 4, 1, front, 2, 6, 1, lighter(a.base, 0.22));
      for (let i = 0; i < 6; i++) g.set(x0 + 1 + i, 1 + i, front, a.trim).set(x0 + 8 - i, 1 + i, 0, a.trim); // strap
      if (a.studs) for (let x = 1; x < 10; x += 3) for (const y of [2, 5]) g.set(x0 + x, y, front, a.studs);
    } else if (a.style === 'light') {
      for (let i = 0; i < 7; i++) g.set(x0 + 1 + i, i, front, a.trim).set(x0 + 8 - i, i, 0, a.trim);
    } else if (a.style === 'robe') {
      g.box(x0 + 4, 0, front, 2, H, 1, a.trim).box(x0 + 2, H - 1, front, 6, 1, 1, a.trim);
      if (a.glow) g.set(x0 + 3, 4, front, a.glow).set(x0 + 6, 3, front, a.glow);
    } else {
      g.box(x0 + 3, H - 1, front, 4, 1, 1, a.trim); // cloth: a collar
    }
    g.box(0, 0, 0, W, 1, D, darker(a.base, 0.25));
  }
  return g;
}

// ---- Pelvis ----------------------------------------------------------------
export function pelvisGrid(r) {
  const cloth = r.underlayer === 'undertunic' ? r.under1 : r.under2;
  const g = new VoxelGrid(8, 3, 6).box(0, 0, 0, 8, 3, 6, cloth);
  g.box(0, 2, 0, 8, 1, 6, darker(cloth, 0.25)); // a thin cord, no big buckle
  if (r.clothing?.style === 'robe') g.box(0, 0, 0, 8, 3, 6, r.clothing.color);
  if (r.clothing?.apron) g.box(1, 0, 5, 6, 3, 1, r.clothing.apron);
  if (r.legs) {
    g.box(0, 0, 0, 8, 3, 6, r.legs.base);
    g.box(0, 2, 0, 8, 1, 6, r.legs.trim);
    if (r.legs.style === 'mail') checker(g, r.legs.base);
  }
  if (r.chest?.style === 'robe') g.box(0, 0, 0, 8, 3, 6, r.chest.base).box(3, 0, 5, 2, 3, 1, r.chest.trim);
  return g;
}

// ---- Arms and hands ----------------------------------------------------------
export function armGrid(r) {
  const g = new VoxelGrid(3, 7, 3).box(0, 0, 0, 3, 7, 3, r.skin.base);
  const sleeve = { tunic: 0, shirt: 3, undertunic: 1 }[r.underlayer] ?? 0;
  if (sleeve) g.box(0, 7 - sleeve, 0, 3, sleeve, 3, r.under1).box(0, 7 - sleeve, 0, 3, 1, 3, darker(r.under1, 0.15));
  if (r.clothing?.style === 'jacket' || r.clothing?.style === 'robe') {
    g.box(0, 0, 0, 3, 7, 3, r.clothing.color).box(0, 0, 0, 3, 1, 3, r.clothing.trim);
  }
  const a = r.chest;
  if (a && a.style !== 'light') {
    const length = a.style === 'plate' || a.style === 'mail' || a.style === 'robe' ? 7 : 4;
    g.box(0, 7 - length, 0, 3, length, 3, a.style === 'plate' ? lighter(a.base, 0.08) : a.base);
    if (a.style === 'mail') checker(g, a.base);
    g.box(0, 7 - length, 0, 3, 1, 3, a.trim);
  }
  return g;
}

export function handGrid(r) {
  const c = r.hands ? r.hands.base : r.skin.base;
  const g = new VoxelGrid(4, 4, 4).box(0, 0, 0, 4, 4, 4, c);
  g.box(0, 0, 0, 4, 1, 4, r.hands ? darker(c, 0.15) : r.skin.shadow); // shade underneath
  if (r.hands) g.box(0, 3, 0, 4, 1, 4, r.hands.trim); // glove cuff
  return g;
}

// ---- Legs and feet ------------------------------------------------------------
export function legGrid(r) {
  const g = new VoxelGrid(4, 7, 4).box(0, 0, 0, 4, 7, 4, r.skin.base);
  // Short trousers / the tunic's hem cover the top of the leg (which reaches up into the pelvis).
  const cover = { tunic: 4, shirt: 3, undertunic: 4 }[r.underlayer] ?? 3;
  const cloth = r.underlayer === 'undertunic' ? r.under1 : r.under2;
  g.box(0, 7 - cover, 0, 4, cover, 4, cloth).box(0, 7 - cover, 0, 4, 1, 4, darker(cloth, 0.15));
  if (r.clothing?.style === 'robe') g.box(0, 2, 0, 4, 5, 4, r.clothing.color);
  if (r.legs) {
    g.box(0, 0, 0, 4, 7, 4, r.legs.base);
    if (r.legs.style === 'mail') checker(g, r.legs.base);
    if (r.legs.style === 'plate') g.box(0, 2, 3, 4, 2, 1, r.legs.glow ? r.legs.trim : lighter(r.legs.base, 0.15)); // knee plate
  }
  if (r.feet) g.box(0, 0, 0, 4, 2, 4, r.feet.base).box(0, 2, 0, 4, 1, 4, r.feet.trim); // boot shaft
  return g;
}

export function footGrid(r) {
  if (!r.feet) {
    // A bare foot: skin with a shaded sole.
    return new VoxelGrid(5, 2, 7).box(0, 0, 0, 5, 2, 7, r.skin.base).box(0, 0, 0, 5, 1, 7, r.skin.shadow);
  }
  const b = r.feet.base;
  const g = new VoxelGrid(5, 2, 7).box(0, 0, 0, 5, 2, 7, b);
  g.box(0, 0, 0, 5, 1, 7, darker(b, 0.4)); // sole
  g.box(1, 1, 6, 3, 1, 1, lighter(b, 0.25)); // toe cap
  return g;
}

// A shoulder pad (attached to the shoulder sockets); big ones widen the silhouette.
export function padGrid(color, trim, big = false) {
  if (!big) return new VoxelGrid(5, 3, 5).box(0, 0, 0, 5, 3, 5, color).box(0, 0, 0, 5, 1, 5, trim).box(1, 2, 1, 3, 1, 3, lighter(color, 0.2));
  return new VoxelGrid(7, 4, 7).box(0, 0, 0, 7, 3, 7, color).box(0, 0, 0, 7, 1, 7, trim)
    .box(1, 3, 1, 5, 1, 5, lighter(color, 0.2)).box(3, 3, 3, 1, 1, 1, trim);
}

// Chain mail: every other cube of `color` a bit darker.
function checker(g, color) {
  const dark = darker(color, 0.22);
  for (let y = 0; y < g.sizeY; y++) for (let z = 0; z < g.sizeZ; z++) for (let x = 0; x < g.sizeX; x++) {
    if ((x + y + z) % 2 === 0 && g.get(x, y, z) === color) g.set(x, y, z, dark);
  }
}
