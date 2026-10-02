// Headgear drawn into the head grid around the 14 x 14 x 12 head (from worn
// head armour, see models/equipment/armor.js), and which hair zones each kind
// hides (spec 9.4 hidesHairZones):
//   cap        soft cap with a brim - hides the cap and top of the hair
//   hood       frames the face - hides all hair except the fringe
//   coif       chain-mail hood - hides all hair
//   helmet     metal, open face, crest - hides all hair except tails
//   greathelm  closed visor with an eye slit and a tall crest - hides all hair

import { X0, X1, Y0, Y1, Z0, ZF } from './head.js';
import { lighter, darker } from './colors.js';

export const HIDES_HAIR = {
  cap: ['cap', 'top'],
  hood: ['cap', 'top', 'side_l', 'side_r', 'back', 'tail'],
  coif: ['cap', 'top', 'side_l', 'side_r', 'back', 'tail', 'fringe'],
  helmet: ['cap', 'top', 'side_l', 'side_r', 'back', 'fringe'],
  greathelm: ['cap', 'top', 'side_l', 'side_r', 'back', 'fringe', 'tail'],
  hat: ['cap', 'top'], // hats added as separate pieces (wizard hat, straw hat)
};

export function drawHeadgear(g, hg) {
  const c = hg.color;
  const t = hg.trim ?? c;
  // A one-cube shell around the head, from row `fromY` up; the face stays open
  // unless `closed`.
  const shell = (fromY, color = () => c, closed = false) => {
    for (let y = Y0 + fromY; y <= Y1 + 1; y++) for (let z = Z0 - 1; z <= ZF + 1; z++) for (let x = X0 - 1; x <= X1 + 1; x++) {
      const outer = x === X0 - 1 || x === X1 + 1 || z === Z0 - 1 || y === Y1 + 1 || z === ZF + 1;
      const faceOpen = !closed && z >= ZF + 1 && y < Y1 - 2 && x > X0 && x < X1;
      if (outer && !faceOpen) g.set(x, y, z, color(x, y, z));
    }
  };
  const band = () => { for (let x = X0 - 1; x <= X1 + 1; x++) g.set(x, Y1 - 2, ZF + 1, t); };

  if (hg.kind === 'cap') {
    for (let y = Y1 - 2; y <= Y1 + 2; y++) for (let z = Z0 - 1; z <= ZF + 1; z++) for (let x = X0 - 1; x <= X1 + 1; x++) {
      const outer = x === X0 - 1 || x === X1 + 1 || z === Z0 - 1 || z === ZF + 1 || y >= Y1 + 1;
      if (outer && !(y === Y1 + 2 && (x === X0 - 1 || x === X1 + 1 || z === Z0 - 1 || z === ZF + 1))) g.set(x, y, z, y === Y1 - 2 ? t : c);
    }
    for (let x = X0 + 1; x <= X1 - 1; x++) g.set(x, Y1 - 2, ZF + 2, t).set(x, Y1 - 2, ZF + 3, darker(t, 0.15)); // brim
  } else if (hg.kind === 'hood') {
    shell(0);
    band();
    for (let z = Z0; z <= Z0 + 3; z++) g.set(X0 + 6, Y1 + 2, z, c).set(X0 + 7, Y1 + 2, z, c);
  } else if (hg.kind === 'coif') {
    const dark = darker(c, 0.22);
    shell(0, (x, y, z) => ((x + y + z) % 2 ? c : dark));
    band();
  } else if (hg.kind === 'helmet') {
    shell(2);
    band();
    for (let z = Z0; z <= ZF - 1; z++) g.set(X0 + 6, Y1 + 2, z, t).set(X0 + 7, Y1 + 2, z, t).set(X0 + 6, Y1 + 3, z, t); // crest
    for (let y = Y0 + 3; y <= Y1 - 3; y++) g.set(X0 - 1, y, ZF, lighter(c, 0.2)).set(X1 + 1, y, ZF, lighter(c, 0.2)); // cheek guards
  } else if (hg.kind === 'greathelm') {
    shell(0, () => c, true);
    for (let x = X0 + 1; x <= X1 - 1; x++) g.set(x, Y0 + 8, ZF + 1, 0x141826).set(x, Y0 + 9, ZF + 1, 0x141826); // eye slit
    for (let y = Y0 + 1; y <= Y1; y++) g.set(X0 + 6, y, ZF + 1, t).set(X0 + 7, y, ZF + 1, t); // nose guard
    for (let z = Z0 - 1; z <= ZF; z++) {
      const h = 2 + Math.round(2 - Math.abs(z - (Z0 + 5)) / 3);
      for (let y = Y1 + 2; y <= Y1 + 1 + h; y++) g.set(X0 + 6, y, z, t).set(X0 + 7, y, z, t);
    }
    if (hg.glow) g.set(X0 + 6, Y1 - 1, ZF + 2, hg.glow).set(X0 + 7, Y1 - 1, ZF + 2, hg.glow);
  }
}
