// The body parts below the head, sized from data/characterSpec.js BODY:
// a chunky torso (14 x 9 x 11, three frames), a thin pelvis/belt band
// (14 x 2 x 11), short legs (6 x 5 x 7), big boots (7 x 4 x 12) and big block
// hands (7 x 6 x 8). There are no visible arms: the hands float beside the
// belly and swing on an invisible shoulder joint. Each part is a separate
// rigid piece.
//
// Layers (spec 9.5): skin -> starter underlayer -> body overlays -> leg /
// chest armour -> boots / gloves. All of it is painted onto the part's own
// cubes (never more than 1 MV outside the body), so parts stay aligned.
//
// r = the resolved look (models/humanoid.js resolveLook): skin ramp,
// underlayer, NPC clothing modules and worn armour.

import { VoxelGrid } from '../VoxelGrid.js';
import { BODY } from '../../data/characterSpec.js';
import { lighter, darker } from './colors.js';

const GOLD = 0xffcc33;
const [TW, TH, TD] = BODY.torso.size;
const [PW, PH, PD] = BODY.pelvis.size;
const [HAW, HAH, HAD] = BODY.hand.size;
const [LW, LH, LD] = BODY.leg.size;
const [FW, FH, FD] = BODY.foot.size;

// ---- Torso -----------------------------------------------------------------
export function torsoGrid(r) {
  const broad = r.frame === 'broad' ? 1 : 0;
  const W = TW + broad * 2;
  const H = TH;
  const D = TD;
  const g = new VoxelGrid(W, H, D);
  const x0 = broad;
  const mid = x0 + TW / 2; // the column just right of the middle
  g.box(x0, 0, 0, TW, H, D, r.skin.base);
  if (broad) g.box(0, H - 3, 0, W, 3, D, r.skin.base); // wider shoulders
  // Every frame gets slightly rounded back corners; "soft" rounds all four.
  for (const x of [x0, x0 + TW - 1]) g.box(x, 0, 0, 1, H, 1, null);
  if (r.frame === 'soft') for (const x of [x0, x0 + TW - 1]) g.box(x, 0, D - 1, 1, H, 1, null);

  const front = D - 1;
  const paint = (color) => {
    for (let y = 0; y < H; y++) for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (g.get(x, y, z) !== null) g.set(x, y, z, color);
  };
  const under = r.under1;
  paint(under);
  // Neckline: a little V of skin at the top front (pale belly skin for frogs and lizards),
  // and a collar ring that makes a clean step between head and body.
  const chest = r.features.webbed || r.features.snout ? mix(r.skin.base, 0xfff2cc, 0.6) : r.skin.base;
  g.box(mid - 2, H - 1, 1, 4, 1, D - 2, chest); // the neck seen from above
  g.set(mid - 1, H - 1, front, chest).set(mid, H - 1, front, chest);
  if (r.underlayer === 'tunic') g.set(mid - 1, H - 2, front, chest).set(mid, H - 2, front, chest);
  g.box(mid - 3, H - 1, 0, 1, 1, D, darker(under, 0.2)).box(mid + 2, H - 1, 0, 1, 1, D, darker(under, 0.2)); // collar
  g.box(0, 0, 0, W, 1, D, darker(under, 0.18)); // hem
  if (r.underlayer === 'tunic' && broad) for (const x of [0, W - 1]) g.box(x, H - 3, 0, 1, 3, D, r.skin.base); // sleeveless

  // Villager clothing modules over the underlayer.
  const c = r.clothing;
  if (c?.style === 'vest') {
    g.box(0, 1, front, mid - 2, H - 1, 1, c.color).box(mid + 2, 1, front, W - mid - 2, H - 1, 1, c.color);
    g.box(0, 1, 0, W, H - 1, 1, c.color);
    for (const y of [2, 4, 6]) g.set(mid - 2, y, front, GOLD);
  } else if (c?.style === 'jacket') {
    paint(c.color);
    g.box(mid - 1, 1, front, 2, H - 1, 1, 0xf4f1ea).box(mid - 1, 2, front, 1, H - 3, 1, c.trim);
  } else if (c?.style === 'robe') {
    paint(c.color);
    g.box(mid - 1, 0, front, 2, H, 1, c.trim).box(mid - 3, H - 1, front, 6, 1, 1, c.trim);
  }
  if (c?.apron) g.box(mid - 4, 0, front, 8, H - 2, 1, c.apron).box(mid - 4, H - 3, front, 8, 1, 1, darker(c.apron, 0.15));
  if (c?.sash) diagonal(g, mid, H, c.sash);

  // Chest armour.
  const a = r.chest;
  if (a) {
    paint(a.style === 'plate' ? darker(a.base, 0.2) : a.base);
    if (a.style === 'plate') {
      g.box(x0 + 1, 1, front, TW - 2, H - 2, 1, a.base).box(x0 + 2, 2, front, TW - 4, H - 4, 1, lighter(a.base, 0.18));
      for (const [x, y] of [[1, 2], [TW - 2, 2], [1, H - 2], [TW - 2, H - 2]]) g.set(x0 + x, y, front, a.trim);
      g.box(mid - 2, H - 1, front, 4, 1, 1, a.trim);
      if (a.glow) g.box(mid - 1, 4, front, 2, 1, 1, a.glow);
    } else if (a.style === 'mail') {
      checker(g, a.base);
      g.box(0, H - 1, 0, W, 1, D, a.trim);
    } else if (a.style === 'leather') {
      g.box(mid - 1, 1, front, 2, H - 2, 1, lighter(a.base, 0.22));
      diagonal(g, mid, H - 1, a.trim); // strap
      if (a.studs) for (let x = 1; x < TW; x += 3) for (const y of [2, 6]) g.set(x0 + x, y, front, a.studs);
    } else if (a.style === 'light') {
      diagonal(g, mid, H, a.trim);
    } else if (a.style === 'robe') {
      g.box(mid - 1, 0, front, 2, H, 1, a.trim).box(mid - 3, H - 1, front, 6, 1, 1, a.trim);
      if (a.glow) g.set(mid - 2, 4, front, a.glow).set(mid + 1, 3, front, a.glow);
    } else {
      g.box(mid - 2, H - 1, front, 4, 1, 1, a.trim); // cloth: a collar
    }
    g.box(0, 0, 0, W, 1, D, darker(a.base, 0.25));
  }
  return g;
}

// A strap / sash across the chest at the front, coming back down the back.
function diagonal(g, mid, H, color) {
  for (let i = 0; i < H - 1; i++) g.set(mid - 4 + i, 1 + i, g.sizeZ - 1, color).set(mid + 3 - i, 1 + i, 0, color);
}

// ---- Pelvis (the belt band between torso and legs) --------------------------
export function pelvisGrid(r) {
  const cloth = r.underlayer === 'undertunic' ? r.under1 : r.under2;
  const mid = PW / 2;
  const g = new VoxelGrid(PW, PH, PD).box(0, 0, 0, PW, PH, PD, cloth);
  g.box(0, PH - 1, 0, PW, 1, PD, darker(cloth, 0.25)); // a thin cord, no big buckle
  if (r.clothing?.style === 'robe') g.box(0, 0, 0, PW, PH, PD, r.clothing.color);
  if (r.clothing?.apron) g.box(mid - 4, 0, PD - 1, 8, PH, 1, r.clothing.apron);
  if (r.legs) {
    g.box(0, 0, 0, PW, PH, PD, r.legs.base);
    g.box(0, PH - 1, 0, PW, 1, PD, r.legs.trim);
    if (r.legs.style === 'mail') checker(g, r.legs.base);
  }
  if (r.chest?.style === 'robe') g.box(0, 0, 0, PW, PH, PD, r.chest.base).box(mid - 1, 0, PD - 1, 2, PH, 1, r.chest.trim);
  if (r.belt) {
    g.box(0, 0, 0, PW, PH, PD, r.belt.color);
    if (r.belt.sash) g.box(mid + 2, 0, PD - 1, 2, PH, 1, darker(r.belt.color, 0.15)).set(mid + 3, 0, PD - 1, r.belt.trim); // knot
    else g.box(mid - 1, 0, PD - 1, 2, PH, 1, r.belt.trim);                                                                  // buckle
  }
  return g;
}

// ---- Hands (no visible arms) -------------------------------------------------
export function handGrid(r) {
  const c = r.hands ? r.hands.base : r.skin.base;
  if (r.features.webbed && !r.hands) {
    // Frogfolk: a wide, flat webbed hand with three round finger pads in front.
    const g = new VoxelGrid(HAW, HAH - 2, HAD + 1).box(0, 0, 0, HAW, HAH - 2, HAD, c).box(0, 0, 0, HAW, 1, HAD, r.skin.shadow);
    for (const x of [0, HAW >> 1, HAW - 1]) g.box(x, 0, HAD, 1, 2, 1, r.skin.highlight);
    return g;
  }
  const g = new VoxelGrid(HAW, HAH, HAD).box(0, 0, 0, HAW, HAH, HAD, c);
  g.box(0, 0, 0, HAW, 1, HAD, r.hands ? darker(c, 0.15) : r.skin.shadow); // shade underneath
  // Round off the four vertical edges so the fist isn't a perfect crate.
  for (const [x, z] of [[0, 0], [HAW - 1, 0], [0, HAD - 1], [HAW - 1, HAD - 1]]) g.box(x, 0, z, 1, HAH, 1, null);
  if (r.hands) g.box(0, HAH - 1, 0, HAW, 1, HAD, r.hands.trim); // glove cuff
  return g;
}

// ---- Legs and feet ------------------------------------------------------------
export function legGrid(r) {
  const g = new VoxelGrid(LW, LH, LD).box(0, 0, 0, LW, LH, LD, r.skin.base);
  // Short trousers / the tunic's hem cover the top of the leg (which reaches up into the pelvis).
  const cover = { tunic: 3, shirt: 2, undertunic: 3 }[r.underlayer] ?? 2;
  const cloth = r.underlayer === 'undertunic' ? r.under1 : r.under2;
  g.box(0, LH - cover, 0, LW, cover, LD, cloth).box(0, LH - cover, 0, LW, 1, LD, darker(cloth, 0.15));
  if (r.clothing?.style === 'robe') g.box(0, 1, 0, LW, LH - 1, LD, r.clothing.color);
  if (r.legs) {
    g.box(0, 0, 0, LW, LH, LD, r.legs.base);
    if (r.legs.style === 'mail') checker(g, r.legs.base);
    if (r.legs.style === 'plate') g.box(0, 1, LD - 1, LW, 2, 1, r.legs.glow ? r.legs.trim : lighter(r.legs.base, 0.15)); // knee plate
  }
  if (r.feet) g.box(0, 0, 0, LW, 1, LD, r.feet.base).box(0, 1, 0, LW, 1, LD, r.feet.trim); // boot shaft
  return g;
}

// Big boots: a flat block reaching forward, with a higher ankle at the back.
export function footGrid(r) {
  if (!r.feet && r.features.webbed) {
    // Frogfolk: long, flat flipper feet with three toes.
    const g = new VoxelGrid(FW + 1, 2, FD + 1).box(0, 0, 0, FW + 1, 2, FD + 1, r.skin.base).box(0, 0, 0, FW + 1, 1, FD + 1, r.skin.shadow);
    for (const x of [1, 2, FW - 2, FW - 1]) g.set(x, 1, FD, null);
    for (const x of [0, FW >> 1, FW]) g.set(x, 1, FD, r.skin.highlight);
    return g;
  }
  const g = new VoxelGrid(FW, FH, FD);
  const ankle = Math.ceil(FD / 2); // the back half rises one cube higher
  const shoe = (base, sole) => g.box(0, 0, 0, FW, FH - 1, FD, base).box(0, FH - 1, 0, FW, 1, ankle, base).box(0, 0, 0, FW, 1, FD, sole);
  if (!r.feet) return shoe(r.skin.base, r.skin.shadow); // a bare foot: skin with a shaded sole
  const b = r.feet.base;
  shoe(b, darker(b, 0.4));
  g.box(1, FH - 2, FD - 1, FW - 2, 1, 1, lighter(b, 0.25)); // toe cap
  g.box(0, FH - 1, ankle - 1, FW, 1, 1, r.feet.trim);        // laces / buckle line
  return g;
}

// A shoulder pad (attached to the shoulder sockets); big ones widen the silhouette.
export function padGrid(color, trim, big = false) {
  if (!big) return new VoxelGrid(6, 3, 8).box(0, 0, 0, 6, 3, 8, color).box(0, 0, 0, 6, 1, 8, trim).box(1, 2, 1, 4, 1, 6, lighter(color, 0.2));
  return new VoxelGrid(8, 4, 10).box(0, 0, 0, 8, 3, 10, color).box(0, 0, 0, 8, 1, 10, trim)
    .box(1, 3, 1, 6, 1, 8, lighter(color, 0.2)).box(3, 3, 4, 2, 1, 2, trim);
}

// Chain mail: every other cube of `color` a bit darker.
function checker(g, color) {
  const dark = darker(color, 0.22);
  for (let y = 0; y < g.sizeY; y++) for (let z = 0; z < g.sizeZ; z++) for (let x = 0; x < g.sizeX; x++) {
    if ((x + y + z) % 2 === 0 && g.get(x, y, z) === color) g.set(x, y, z, dark);
  }
}

function mix(a, b, t) {
  const ch = (c, sh) => (c >> sh) & 255;
  const m = (sh) => Math.round(ch(a, sh) + (ch(b, sh) - ch(a, sh)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}
