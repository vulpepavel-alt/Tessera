// Voxel models for creatures and enemies, built the same way as people: a few
// big, chunky blocks (body, head, stubby legs that float a little apart),
// rounded edges, a lighter back and a darker belly, and big readable eyes.
// They use the SAME cube size as characters (MV = 0.0625), so a boar stands
// as tall as your chest and a wolf looks you in the eye.
//
// Each enemy gets its own material, so it can flash white when hit or glow
// red while winding up an attack. buildCreature(type) also returns how the
// creature moves (model.animate: four legs, or a hopping blob).

import * as THREE from 'three';
import { addFaceShading } from '../world/faceShading.js';
import { VoxelGrid } from './VoxelGrid.js';
import { MV } from '../data/characterSpec.js';
import { lighter, darker } from './humanoid/colors.js';
import { animateQuadruped, animateBlob } from './creatureMotion.js';

const EYE = 0x161018;
const SHINE = 0xffffff;

// Returns { root, body, parts, material, animate }. Parts are groups that rotate at a joint.
export function buildCreature(type) {
  const material = addFaceShading(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x000000 }));
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const { parts, animate } = BUILDERS[type](body, material);
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { root, body, parts, material, animate };
}

// Adds a part: grid, its joint (in grid cubes), its place (in MV from the parent's joint).
function part(parent, grid, pivot, at, material) {
  const group = new THREE.Group();
  group.position.set(at[0] * MV, at[1] * MV, at[2] * MV);
  group.add(new THREE.Mesh(grid.toGeometry(MV, pivot), material));
  parent.add(group);
  return group;
}

// A chunky block: base colour, lighter top, darker underside, rounded top edges.
function block(g, x0, y0, z0, w, h, d, base, { belly = darker(base, 0.22), round = true } = {}) {
  g.box(x0, y0, z0, w, h, d, base).box(x0, y0 + h - 1, z0, w, 1, d, lighter(base, 0.1)).box(x0, y0, z0, w, 1, d, belly);
  if (round) {
    const x1 = x0 + w - 1;
    const z1 = z0 + d - 1;
    const yt = y0 + h - 1;
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) g.box(x, y0, z, 1, h, 1, null); // vertical edges
    g.box(x0, yt, z0, w, 1, 1, null).box(x0, yt, z1, w, 1, 1, null).box(x0, yt, z0, 1, 1, d, null).box(x1, yt, z0, 1, 1, d, null);
  }
  return g;
}

// Two big eyes on the front face (z = face): dark, with a white glint at the top outside.
function eyes(g, cx, y, face, gap, size = 2) {
  for (const s of [-1, 1]) {
    const x = Math.round(s < 0 ? cx - gap / 2 - size : cx + gap / 2);
    g.box(x, y, face, size, size + 1, 1, EYE);
    g.set(s < 0 ? x : x + size - 1, y + size, face, SHINE);
  }
}

// Four stubby legs, floating a little apart from the body like the hands and feet of people.
function legs(body, material, { w, h, d, x, zFront, zBack, top }, color, hoof) {
  const leg = () => new VoxelGrid(w, h, d).box(0, 0, 0, w, h, d, color).box(0, 0, 0, w, 2, d, hoof).box(0, h - 1, 0, w, 1, d, darker(color, 0.15));
  const parts = {};
  for (const [name, sx, z] of [['legFL', -1, zFront], ['legFR', 1, zFront], ['legBL', -1, zBack], ['legBR', 1, zBack]]) {
    parts[name] = part(body, leg(), [w / 2, h, d / 2], [sx * x, top, z], material);
  }
  return parts;
}

const BUILDERS = {
  // A stocky boar with a mossy, thorny back and big pale tusks. Faces +Z.
  bramblehog(body, material) {
    const FUR = 0x8a5634;
    const MOSS = 0x6a9a3a;
    const THORN = 0xe0c88a;
    const SNOUT = 0xe0a08a;
    const TUSK = 0xfff4dc;
    const HOOF = 0x3a2a20;
    const torso = block(new VoxelGrid(18, 15, 24), 0, 0, 0, 18, 14, 24, FUR);
    torso.box(2, 13, 2, 14, 1, 20, MOSS).box(3, 14, 3, 12, 1, 18, lighter(MOSS, 0.15));
    for (let z = 4; z < 22; z += 4) torso.box(5, 14, z, 2, 1, 2, THORN).box(11, 14, z + 2, 2, 1, 2, THORN); // thorns poke out of the moss
    torso.box(7, 8, 0, 4, 3, 1, darker(FUR, 0.2)); // a stubby tail
    const parts = { torso: part(body, torso, [9, 0, 12], [0, 8, 0], material) };

    const head = block(new VoxelGrid(16, 14, 16), 0, 0, 0, 16, 13, 12, FUR);
    head.box(4, 1, 12, 8, 6, 3, SNOUT).box(5, 3, 15, 6, 3, 1, lighter(SNOUT, 0.1));      // snout
    head.box(5, 4, 15, 2, 1, 1, darker(SNOUT, 0.5)).box(9, 4, 15, 2, 1, 1, darker(SNOUT, 0.5)); // nostrils
    head.box(2, 1, 12, 2, 5, 2, TUSK).box(12, 1, 12, 2, 5, 2, TUSK).box(2, 5, 13, 2, 2, 1, TUSK).box(12, 5, 13, 2, 2, 1, TUSK); // tusks curve up
    eyes(head, 8, 8, 11, 6);
    head.box(0, 11, 2, 3, 3, 4, darker(FUR, 0.1)).box(13, 11, 2, 3, 3, 4, darker(FUR, 0.1)); // ears
    parts.head = part(parts.torso, head, [8, 3, 0], [0, 6, 11], material);
    Object.assign(parts, legs(body, material, { w: 6, h: 9, d: 6, x: 6, zFront: 7, zBack: -7, top: 9 }, FUR, HOOF));
    return { parts, animate: animateQuadruped };
  },

  // A grey wolf: long body, pointed ears, a long snout and a bushy tail.
  duskwolf(body, material) {
    const FUR = 0x8a909c;
    const PALE = 0xd8dce4;
    const DARK = 0x4e5460;
    const torso = block(new VoxelGrid(14, 13, 24), 0, 0, 0, 14, 13, 24, FUR, { belly: PALE });
    torso.box(3, 12, 2, 8, 1, 20, DARK); // a dark stripe down the back
    torso.box(2, 2, 18, 10, 9, 6, lighter(FUR, 0.12)).box(3, 0, 19, 8, 3, 5, PALE); // shaggy chest
    const parts = { torso: part(body, torso, [7, 0, 12], [0, 11, 0], material) };

    const head = block(new VoxelGrid(13, 16, 19), 0, 0, 0, 13, 11, 11, FUR, { belly: PALE });
    head.box(3, 0, 11, 7, 6, 7, FUR).box(3, 0, 11, 7, 2, 7, PALE).box(4, 5, 11, 5, 1, 7, lighter(FUR, 0.1)); // snout
    head.box(5, 4, 18, 3, 2, 1, EYE);                                                        // nose
    head.box(4, 0, 17, 5, 1, 1, darker(PALE, 0.35));                                         // mouth line
    eyes(head, 6.5, 6, 10, 5);
    for (const x of [1, 9]) head.box(x, 11, 3, 3, 3, 3, FUR).box(x, 14, 4, 3, 2, 2, DARK).box(x + 1, 11, 6, 1, 2, 1, 0xd89a9a); // pointed ears
    parts.head = part(parts.torso, head, [6.5, 2, 2], [0, 9, 12], material); // out in front, held high

    const tail = new VoxelGrid(5, 5, 12);
    [3, 4, 5, 5, 5, 5, 4, 4, 3, 3, 2, 2].forEach((w, z) => {
      const o = Math.floor((5 - w) / 2);
      tail.box(o, o, z, w, w, 1, z >= 9 ? PALE : FUR);
    });
    parts.tail = part(parts.torso, tail, [2.5, 2.5, 0], [0, 9, -12], material);
    parts.tail.rotation.set(0.55, Math.PI, 0); // pointing back and up
    Object.assign(parts, legs(body, material, { w: 5, h: 11, d: 5, x: 4.5, zFront: 8, zBack: -8, top: 11 }, FUR, DARK));
    return { parts, animate: animateQuadruped };
  },

  // A jelly cube: one big wobbly block with a darker bottom ring, a happy face and a shine.
  meadowSlime(body, material) {
    const JELLY = 0x6ee05a;
    const g = block(new VoxelGrid(18, 16, 18), 0, 0, 0, 18, 15, 18, JELLY, { belly: darker(JELLY, 0.3) });
    g.box(3, 14, 3, 12, 2, 12, lighter(JELLY, 0.2)).box(4, 15, 4, 3, 1, 2, 0xe8ffe0);    // domed top with a shine
    g.box(1, 1, 1, 16, 1, 16, darker(JELLY, 0.18));
    eyes(g, 9, 8, 17, 5, 3);
    const mouth = darker(JELLY, 0.55);
    g.box(7, 4, 17, 4, 1, 1, mouth).set(6, 5, 17, mouth).set(11, 5, 17, mouth);         // smile
    g.box(3, 6, 17, 2, 1, 1, 0xffa8b4).box(13, 6, 17, 2, 1, 1, 0xffa8b4);                // blush
    const parts = { torso: part(body, g, [9, 0, 9], [0, 0, 0], material) };
    return { parts, animate: animateBlob };
  },
};
