// Builds an expressive, detailed voxel person from a "spec" (a description of
// how they look). Used for the four classes and for every villager.
//
// Proportions (in model cubes): boots + legs 7, body 9 (and 9 deep), head 14
// tall - a very large head with a simple face, short thick arms ending in big
// fists, big boots, almost no neck. Built to look right from every side.
// The parts live in models/humanoid/:
//   face.js  eyes, brows, mouth, nose, cheeks, freckles, facial hair, ears
//   hair.js  14 hair styles
//   body.js  legs and boots, torso with 4 outfit styles, sleeves and fists
//
// spec = { skin, eyes, eyeStyle, brows, mouth, blush, freckles, facialHair,
//   hair, hairStyle, ears, muzzle, shirt, shirt2, trim, pants, boots, bootAccent,
//   outfitStyle, hands, armor, pads, sash, apron, robe,
//   headgear: null|'helmet'|'hood', headgearColor, headgearTrim, mask, accent }
// Returns { root, body, parts } with the parts the animator expects.

import * as THREE from 'three';
import { VoxelGrid, voxelModelMaterial } from './VoxelGrid.js';
import { drawFace, drawEars } from './humanoid/face.js';
import { drawHair } from './humanoid/hair.js';
import { legGrid, torsoGrid, sleeveGrid, fistGrid, padGrid } from './humanoid/body.js';
import { lighter, darker } from './humanoid/colors.js';

export { lighter, darker };
export const VOXEL = 0.058;
// Every person (player and villagers) is drawn this much bigger than the
// cube size above, so characters stand out more against the landscape.
export const CHARACTER_SCALE = 1.12;
export const HEAD_TOP = 14 * VOXEL; // top of the head, measured from the head's base
const BODY_CENTER = 0.85;
const HEAD = { x0: 3, z0: 3 };
const COVERS_HAIR = ['helmet', 'hood', 'coif', 'greathelm']; // where the 16 x 14 x 14 head sits inside its 22 x 19 x 20 grid

export function buildHumanoid(spec) {
  const s = { eyeStyle: 'round', brows: 'thin', mouth: 'smile', blush: true, ...spec };
  const root = new THREE.Group();
  root.scale.setScalar(CHARACTER_SCALE);
  const body = new THREE.Group();
  body.position.y = BODY_CENTER;
  root.add(body);
  const frame = new THREE.Group();
  frame.position.y = -BODY_CENTER;
  body.add(frame);

  const v = VOXEL;
  const parts = {
    legL: attach(frame, legGrid(s), [3, 7, 4], [-3.1 * v, 7 * v, 0]),
    legR: attach(frame, legGrid(s), [3, 7, 4], [3.1 * v, 7 * v, 0]),
    torso: attach(frame, torsoGrid(s), [6, 0, 4.5], [0, 7 * v, 0]),
    armL: arm(frame, s, -1),
    armR: arm(frame, s, 1),
  };
  parts.head = attach(parts.torso, headGrid(s), [11, 0, 9.5], [0, 9 * v, 0]);
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { root, body, parts };
}

// An arm group: pivot at the shoulder, a puffy sleeve, and a fist floating below.
function arm(frame, s, side) {
  const v = VOXEL;
  const group = new THREE.Group();
  group.position.set(side * 8.6 * v, 15.5 * v, 0);
  frame.add(group);
  group.add(mesh(sleeveGrid(s), [2.5, 4, 2.5]));
  const fist = mesh(fistGrid(s, side), [3.5, 6, 3]);
  fist.position.set(side * 0.3 * v, -4.3 * v, 0.3 * v);
  group.add(fist);
  if (s.pads) {
    const big = s.bigPads;
    attach(group, padGrid(s.pads, s.padTrim ?? s.trim, big), big ? [4, 0, 4] : [3, 0, 3], [side * (big ? 0.6 : 0) * v, -0.6 * v, 0]);
  }
  return group;
}

function mesh(grid, pivot) {
  return new THREE.Mesh(grid.toGeometry(VOXEL, pivot), voxelModelMaterial());
}

// Adds a voxel part to `parent`; returns its group (rotate the group to animate).
export function attach(parent, grid, pivot, position, voxel = VOXEL) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  group.add(new THREE.Mesh(grid.toGeometry(voxel, pivot), voxelModelMaterial()));
  parent.add(group);
  return group;
}

function headGrid(s) {
  const g = new VoxelGrid(22, 19, 20);
  const { x0, z0 } = HEAD;
  g.box(x0, 0, z0, 16, 14, 14, s.skin);
  // Soften the head's corners a little.
  for (const [x, z] of [[x0, z0], [x0 + 15, z0], [x0, z0 + 13], [x0 + 15, z0 + 13]]) {
    g.set(x, 13, z, null).set(x, 0, z, null);
  }
  drawFace(g, s, HEAD);
  drawEars(g, s, HEAD);
  if (!COVERS_HAIR.includes(s.headgear)) drawHair(g, s, HEAD);
  if (s.hat) g.box(0, 12, 0, 22, 7, 20, null); // a hat sits on top: hair must not poke through
  if (s.headgear) headgear(g, s);
  if (s.mask) for (let x = x0; x <= x0 + 15; x++) for (let y = 0; y <= 3; y++) g.set(x, y, z0 + 14, (x + y) % 5 === 0 ? darker(s.mask, 0.2) : s.mask);
  return g;
}

// Headgear (from worn head armour, see models/equipment/armor.js):
//   cap       a soft cap with a brim; the hair still shows below it
//   hood      a hood framing the face, hiding the hair
//   coif      a chain-mail hood
//   helmet    a metal helmet with an open face and a crest
//   greathelm a closed helmet with an eye slit and a tall crest (rare armour)
function headgear(g, s) {
  const { x0, z0 } = HEAD;
  const c = s.headgearColor;
  const t = s.headgearTrim ?? c;
  const shell = (fromY, color = () => c, open = true) => {
    for (let y = fromY; y <= 15; y++) for (let z = z0 - 1; z <= z0 + 14; z++) for (let x = x0 - 1; x <= x0 + 16; x++) {
      const outer = x === x0 - 1 || x === x0 + 16 || z === z0 - 1 || y >= 14;
      const frontOpen = open && z >= z0 + 13 && y < 11 && x > x0 && x < x0 + 15;
      if (outer && !frontOpen) g.set(x, y, z, color(x, y, z));
    }
  };
  const band = () => { for (let x = x0 - 1; x <= x0 + 16; x++) g.set(x, 11, z0 + 14, t); };
  if (s.headgear === 'cap') {
    for (let y = 11; y <= 15; y++) for (let z = z0 - 1; z <= z0 + 14; z++) for (let x = x0 - 1; x <= x0 + 16; x++) {
      const outer = x === x0 - 1 || x === x0 + 16 || z === z0 - 1 || z === z0 + 14 || y >= 14;
      if (outer && !(y === 15 && (x === x0 - 1 || x === x0 + 16))) g.set(x, y, z, y === 11 ? t : c);
    }
    for (let x = x0 + 1; x <= x0 + 14; x++) g.set(x, 11, z0 + 15, t).set(x, 11, z0 + 16, darker(t, 0.15)); // brim
  } else if (s.headgear === 'hood') {
    shell(0);
    for (let z = z0; z <= z0 + 3; z++) g.set(x0 + 7, 16, z, c).set(x0 + 8, 16, z, c).set(x0 + 7, 17, z - 1, c);
    band();
  } else if (s.headgear === 'coif') {
    const dark = darker(c, 0.22);
    shell(0, (x, y, z) => ((x + y + z) % 2 ? c : dark));
    band();
  } else if (s.headgear === 'helmet') {
    shell(1);
    band();
    for (let z = z0; z <= z0 + 12; z++) g.set(x0 + 7, 16, z, t).set(x0 + 8, 16, z, t).set(x0 + 7, 17, z, t); // crest
    for (let y = 2; y <= 10; y++) g.set(x0 - 1, y, z0 + 13, lighter(c, 0.2)).set(x0 + 16, y, z0 + 13, lighter(c, 0.2));
  } else if (s.headgear === 'greathelm') {
    shell(0, () => c, false);
    for (let y = 0; y <= 15; y++) for (let x = x0 - 1; x <= x0 + 16; x++) g.set(x, y, z0 + 14, c); // closed visor
    for (let x = x0 + 2; x <= x0 + 13; x++) g.set(x, 7, z0 + 14, 0x141826).set(x, 8, z0 + 14, 0x141826); // eye slit
    for (let y = 1; y <= 13; y++) g.set(x0 + 7, y, z0 + 14, t).set(x0 + 8, y, z0 + 14, t); // nose guard
    for (let x = x0 - 1; x <= x0 + 16; x++) g.set(x, 11, z0 + 14, t);
    for (let z = z0 - 1; z <= z0 + 13; z++) for (let y = 16; y <= 18 - Math.abs(z - z0 - 6) / 4; y++) g.set(x0 + 7, y, z, t).set(x0 + 8, y, z, t);
    if (s.headgearGlow) g.set(x0 + 7, 12, z0 + 15, s.headgearGlow).set(x0 + 8, 12, z0 + 15, s.headgearGlow);
  }
}
