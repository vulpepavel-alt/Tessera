// Every creature, built like people from a few chunky blocks (creatureKit.js)
// at the character cube size. A handful of SHAPES (boar, wolf, slime, horned
// beast, lizard, scorpion, toad, turtle, rockling) are dressed in different
// colours for each biome. All designs are TESSERA's own. Faces +Z.
//
// Each enemy gets its own material, so it can flash white when hit or glow
// red while winding up an attack. buildCreature(type) also returns how the
// creature moves (model.animate: four legs, or a hopping blob).

import * as THREE from 'three';
import { addFaceShading } from '../world/faceShading.js';
import { VoxelGrid, lighter, darker, EYE, part, block, eyes, legs, tail } from './creatureKit.js';
import { animateQuadruped, animateBlob } from './creatureMotion.js';

// Returns { root, body, parts, material, animate }. Parts are groups that rotate at a joint.
export function buildCreature(type) {
  const material = addFaceShading(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x000000 }));
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const { shape, palette } = CREATURES[type];
  const { parts, animate } = SHAPES[shape](body, material, palette);
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { root, body, parts, material, animate };
}

// Which shape and colours each creature uses.
export const CREATURES = {
  // Amber Meadows
  bramblehog: { shape: 'boar', palette: { fur: 0x8a5634, back: 0x6a9a3a, spikes: 0xe0c88a, snout: 0xe0a08a, tusk: 0xfff4dc, hoof: 0x3a2a20 } },
  duskwolf: { shape: 'wolf', palette: { fur: 0x8a909c, pale: 0xd8dce4, dark: 0x4e5460 } },
  meadowSlime: { shape: 'slime', palette: { jelly: 0x6ee05a } },
  // Crystalfrost Forest
  frostWolf: { shape: 'wolf', palette: { fur: 0xdfe8f2, pale: 0xffffff, dark: 0x8fa6c8 } },
  frostSlime: { shape: 'slime', palette: { jelly: 0x8fd8ff } },
  snowhorn: { shape: 'horned', palette: { wool: 0xf2f0ea, skin: 0x8a8a96, horn: 0xc8b07a, hoof: 0x3a3a44 } },
  // Copper Dunes
  duneSlime: { shape: 'slime', palette: { jelly: 0xf0a040 } },
  sandScorpion: { shape: 'scorpion', palette: { shell: 0xc8743a, dark: 0x7a3a1e, sting: 0x3a1a10 } },
  sunLizard: { shape: 'lizard', palette: { scales: 0xd8b04a, belly: 0xf2e0a0, dark: 0x8a6a2a, frill: 0xe05a3a } },
  // Lantern Marsh
  bogSlime: { shape: 'slime', palette: { jelly: 0xb06ae0 } },
  marshToad: { shape: 'toad', palette: { skin: 0x5a9a4a, belly: 0xd8e0a0, spots: 0x3a6a2a } },
  mireSnapper: { shape: 'turtle', palette: { shell: 0x4a6a3a, rim: 0xc8b06a, skin: 0x7a8a5a } },
  // Stormspire Peaks
  stormWolf: { shape: 'wolf', palette: { fur: 0x4a4e6a, pale: 0x9aa4c8, dark: 0x22243a } },
  cragHorn: { shape: 'horned', palette: { wool: 0x8a8a8a, skin: 0x5a5a64, horn: 0xe8e0c8, hoof: 0x2a2a30 } },
  rockling: { shape: 'rockling', palette: { stone: 0x7a7a86, crack: 0x4a4a56, glow: 0x8fe8ff } },
};

const SHAPES = {
  // A stocky boar with a thorny back and big tusks.
  boar(body, material, c) {
    const torso = block(new VoxelGrid(18, 15, 24), 0, 0, 0, 18, 14, 24, c.fur);
    torso.box(2, 13, 2, 14, 1, 20, c.back).box(3, 14, 3, 12, 1, 18, lighter(c.back, 0.15));
    for (let z = 4; z < 22; z += 4) torso.box(5, 14, z, 2, 1, 2, c.spikes).box(11, 14, z + 2, 2, 1, 2, c.spikes);
    torso.box(7, 8, 0, 4, 3, 1, darker(c.fur, 0.2)); // a stubby tail
    const parts = { torso: part(body, torso, [9, 0, 12], [0, 8, 0], material) };
    const head = block(new VoxelGrid(16, 14, 16), 0, 0, 0, 16, 13, 12, c.fur);
    head.box(4, 1, 12, 8, 6, 3, c.snout).box(5, 3, 15, 6, 3, 1, lighter(c.snout, 0.1));
    head.box(5, 4, 15, 2, 1, 1, darker(c.snout, 0.5)).box(9, 4, 15, 2, 1, 1, darker(c.snout, 0.5));
    head.box(2, 1, 12, 2, 5, 2, c.tusk).box(12, 1, 12, 2, 5, 2, c.tusk).box(2, 5, 13, 2, 2, 1, c.tusk).box(12, 5, 13, 2, 2, 1, c.tusk);
    eyes(head, 8, 8, 11, 6);
    head.box(0, 11, 2, 3, 3, 4, darker(c.fur, 0.1)).box(13, 11, 2, 3, 3, 4, darker(c.fur, 0.1));
    parts.head = part(parts.torso, head, [8, 3, 0], [0, 6, 11], material);
    Object.assign(parts, legs(body, material, { w: 6, h: 9, d: 6, x: 6, zFront: 7, zBack: -7, top: 9 }, c.fur, c.hoof));
    return { parts, animate: animateQuadruped };
  },

  // A wolf: long body, pointed ears, a long snout and a bushy tail.
  wolf(body, material, c) {
    const torso = block(new VoxelGrid(14, 13, 24), 0, 0, 0, 14, 13, 24, c.fur, { belly: c.pale });
    torso.box(3, 12, 2, 8, 1, 20, c.dark);
    torso.box(2, 2, 18, 10, 9, 6, lighter(c.fur, 0.12)).box(3, 0, 19, 8, 3, 5, c.pale); // shaggy chest
    const parts = { torso: part(body, torso, [7, 0, 12], [0, 11, 0], material) };
    const head = block(new VoxelGrid(13, 16, 19), 0, 0, 0, 13, 11, 11, c.fur, { belly: c.pale });
    head.box(3, 0, 11, 7, 6, 7, c.fur).box(3, 0, 11, 7, 2, 7, c.pale).box(4, 5, 11, 5, 1, 7, lighter(c.fur, 0.1));
    head.box(5, 4, 18, 3, 2, 1, EYE).box(4, 0, 17, 5, 1, 1, darker(c.pale, 0.35));
    eyes(head, 6.5, 6, 10, 5);
    for (const x of [1, 9]) head.box(x, 11, 3, 3, 3, 3, c.fur).box(x, 14, 4, 3, 2, 2, c.dark).box(x + 1, 11, 6, 1, 2, 1, 0xd89a9a);
    parts.head = part(parts.torso, head, [6.5, 2, 2], [0, 9, 12], material);
    parts.tail = tail(parts.torso, material, [3, 4, 5, 5, 5, 5, 4, 4, 3, 3, 2, 2], c.fur, c.pale, [0, 9, -12], 0.55);
    Object.assign(parts, legs(body, material, { w: 5, h: 11, d: 5, x: 4.5, zFront: 8, zBack: -8, top: 11 }, c.fur, c.dark));
    return { parts, animate: animateQuadruped };
  },

  // A jelly cube with a happy face and a shine.
  slime(body, material, c) {
    const g = block(new VoxelGrid(18, 16, 18), 0, 0, 0, 18, 15, 18, c.jelly, { belly: darker(c.jelly, 0.3) });
    g.box(3, 14, 3, 12, 2, 12, lighter(c.jelly, 0.2)).box(4, 15, 4, 3, 1, 2, lighter(c.jelly, 0.7));
    g.box(1, 1, 1, 16, 1, 16, darker(c.jelly, 0.18));
    eyes(g, 9, 8, 17, 5, 3);
    const mouth = darker(c.jelly, 0.55);
    g.box(7, 4, 17, 4, 1, 1, mouth).set(6, 5, 17, mouth).set(11, 5, 17, mouth);
    g.box(3, 6, 17, 2, 1, 1, 0xffa8b4).box(13, 6, 17, 2, 1, 1, 0xffa8b4);
    return { parts: { torso: part(body, g, [9, 0, 9], [0, 0, 0], material) }, animate: animateBlob };
  },

  // A woolly beast with big curled horns (snow and mountains).
  horned(body, material, c) {
    const torso = block(new VoxelGrid(16, 14, 22), 0, 0, 0, 16, 14, 22, c.wool, { belly: darker(c.wool, 0.12) });
    for (let z = 2; z < 20; z += 3) torso.box(1 + (z % 2), 13, z, 3, 1, 2, lighter(c.wool, 0.1)).box(11 - (z % 2), 13, z + 1, 3, 1, 2, darker(c.wool, 0.06));
    const parts = { torso: part(body, torso, [8, 0, 11], [0, 9, 0], material) };
    const head = block(new VoxelGrid(16, 13, 14), 3, 0, 0, 10, 10, 11, c.skin);
    head.box(4, 7, 0, 8, 3, 9, c.wool); // woolly forehead
    for (const x of [0, 13]) { // horns curling back and down
      head.box(x, 8, 2, 3, 3, 5, c.horn).box(x, 4, 0, 3, 5, 3, darker(c.horn, 0.12)).box(x, 3, 3, 3, 2, 3, c.horn);
    }
    eyes(head, 8, 4, 10, 4);
    head.box(6, 0, 10, 4, 2, 1, darker(c.skin, 0.4));
    parts.head = part(parts.torso, head, [8, 2, 0], [0, 8, 10], material);
    Object.assign(parts, legs(body, material, { w: 5, h: 9, d: 5, x: 5, zFront: 7, zBack: -7, top: 9 }, c.skin, c.hoof));
    return { parts, animate: animateQuadruped };
  },

  // A long, low lizard with a frilled neck and a long tail (deserts).
  lizard(body, material, c) {
    const torso = block(new VoxelGrid(12, 8, 24), 0, 0, 0, 12, 8, 24, c.scales, { belly: c.belly });
    for (let z = 2; z < 22; z += 3) torso.box(5, 7, z, 2, 1, 2, c.dark); // back ridges
    const parts = { torso: part(body, torso, [6, 0, 12], [0, 5, 0], material) };
    const head = block(new VoxelGrid(16, 9, 14), 2, 0, 0, 12, 8, 14, c.scales, { belly: c.belly });
    head.box(0, 4, 0, 2, 5, 3, c.frill).box(14, 4, 0, 2, 5, 3, c.frill); // neck frills
    head.box(3, 1, 13, 10, 1, 1, darker(c.scales, 0.45));
    eyes(head, 8, 5, 10, 6);
    parts.head = part(parts.torso, head, [8, 1, 0], [0, 2, 11], material);
    parts.tail = tail(parts.torso, material, [6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 2, 1, 1], c.scales, null, [0, 3, -12], 0.15);
    Object.assign(parts, legs(body, material, { w: 4, h: 6, d: 5, x: 7, zFront: 7, zBack: -6, top: 6 }, c.scales, c.dark));
    return { parts, animate: animateQuadruped };
  },

  // A scorpion: flat shell, two big pincers and a stinger curled over its back.
  scorpion(body, material, c) {
    const torso = block(new VoxelGrid(16, 7, 18), 0, 0, 0, 16, 7, 18, c.shell, { belly: c.dark });
    for (let z = 3; z < 16; z += 4) torso.box(0, 6, z, 16, 1, 1, c.dark); // shell plates
    eyes(torso, 8, 3, 17, 4, 1);
    const parts = { torso: part(body, torso, [8, 0, 9], [0, 5, 0], material) };
    // The "head" part carries the pincers, so the wind-up nods them down.
    const claws = new VoxelGrid(24, 6, 10);
    for (const x of [0, 18]) {
      claws.box(x + 1, 0, 0, 4, 4, 6, c.shell).box(x, 0, 6, 6, 5, 4, c.shell).box(x + 2, 1, 9, 2, 3, 1, null);
      claws.box(x, 4, 6, 6, 1, 4, lighter(c.shell, 0.15));
    }
    parts.head = part(parts.torso, claws, [12, 2, 0], [0, 3, 8], material);
    // Tail: segments rising from the back and curling forward over the body,
    // ending in a dark stinger that points down at whatever is in front.
    const t = new VoxelGrid(6, 15, 15);
    [[0, 0], [4, 0], [7, 2], [9, 5], [10, 8]].forEach(([y, z], i) => t.box(1, y, z, 4, 4, 4, i % 2 ? c.shell : darker(c.shell, 0.1)));
    t.box(2, 9, 12, 2, 3, 2, c.sting).box(2, 8, 13, 2, 1, 2, c.sting);
    parts.tail = part(parts.torso, t, [3, 0, 0], [0, 6, -9], material);
    Object.assign(parts, legs(body, material, { w: 3, h: 6, d: 3, x: 9, zFront: 4, zBack: -5, top: 6 }, c.dark, c.dark));
    return { parts, animate: animateQuadruped };
  },

  // A big toad: a round body, eyes on top, a wide mouth; it hops like a slime.
  toad(body, material, c) {
    const g = block(new VoxelGrid(22, 16, 20), 0, 0, 0, 22, 12, 20, c.skin, { belly: c.belly });
    g.box(2, 0, 16, 18, 5, 4, c.belly); // pale throat
    for (const [x, z] of [[3, 4], [15, 6], [8, 9], [12, 3], [5, 12]]) g.box(x, 11, z, 2, 1, 2, c.spots);
    for (const x of [2, 14]) { // eye domes on top
      g.box(x, 12, 12, 6, 4, 6, c.skin);
      g.box(x + 1, 13, 17, 4, 3, 1, 0xffffff).box(x + 2, 13, 17, 2, 2, 1, EYE);
    }
    g.box(1, 5, 19, 20, 1, 1, darker(c.skin, 0.45)); // wide mouth line
    const parts = { torso: part(body, g, [11, 0, 10], [0, 0, 0], material) };
    return { parts, animate: animateBlob };
  },

  // A snapping turtle: a high shell, a stubby head and four short legs.
  turtle(body, material, c) {
    const shell = block(new VoxelGrid(20, 10, 22), 0, 0, 0, 20, 10, 22, c.shell, { belly: c.rim });
    shell.box(0, 0, 0, 20, 2, 22, c.rim);
    for (const [x, z] of [[4, 4], [11, 4], [7, 10], [4, 15], [12, 15]]) shell.box(x, 9, z, 5, 1, 5, lighter(c.shell, 0.15));
    const parts = { torso: part(body, shell, [10, 0, 11], [0, 4, 0], material) };
    const head = block(new VoxelGrid(10, 8, 10), 0, 0, 0, 10, 8, 10, c.skin);
    head.box(1, 0, 8, 8, 2, 2, lighter(c.skin, 0.25)); // beak
    eyes(head, 5, 4, 9, 4);
    parts.head = part(parts.torso, head, [5, 2, 0], [0, 2, 10], material);
    Object.assign(parts, legs(body, material, { w: 5, h: 6, d: 5, x: 8, zFront: 7, zBack: -7, top: 6 }, c.skin, darker(c.skin, 0.3)));
    return { parts, animate: animateQuadruped };
  },

  // A living boulder: a jagged rock with cracks and glowing eyes; it hops slowly.
  rockling(body, material, c) {
    const g = block(new VoxelGrid(18, 18, 18), 0, 0, 0, 18, 16, 18, c.stone, { belly: darker(c.stone, 0.3), round: false });
    for (const [x, y, z] of [[0, 14, 0], [17, 15, 0], [0, 15, 17], [17, 13, 17], [8, 15, 0]]) g.box(x, y, z, 1, 3, 1, null);
    g.box(5, 16, 5, 6, 2, 6, lighter(c.stone, 0.1)).box(10, 16, 9, 4, 1, 4, lighter(c.stone, 0.15));
    for (const [x, y] of [[3, 3], [4, 4], [13, 10], [14, 11], [12, 3]]) g.set(x, y, 17, c.crack);
    eyes(g, 9, 8, 17, 6, 2, c.glow);
    return { parts: { torso: part(body, g, [9, 0, 9], [0, 0, 0], material) }, animate: animateBlob };
  },
};
