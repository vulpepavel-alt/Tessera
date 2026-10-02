// Draws a chunk's ground details (see groundDetails.js): grass tufts, flowers,
// flower clusters, clover, pebbles and reeds, each as an "instanced mesh" (one
// small shape copied hundreds of times in a single draw). Plants sway in the wind.

import * as THREE from 'three';
import { addFaceShading } from './faceShading.js';
import { BLOCK_INFO } from '../data/blocks.js';
import { windTime } from './voxelMaterials.js';
import { GRASS_SHADES, grassShadeIndex } from './grassPalette.js';

const GRASS_BLOCKS = [1, 2, 13, 20, 26]; // must match groundDetails.js
const FLOWER_COLORS = [0xf2f2f2, 0xffd84a, 0xff6b8a, 0x8fa8ff];

// A tuft: three chunky blades of different heights (thick enough to read as cubes).
const tuftGeometry = (() => {
  const blades = [[-0.16, 0.5, 0.06], [0.14, 0.38, -0.1], [0.0, 0.66, 0.14]].map(([x, h, z]) => {
    const g = new THREE.BoxGeometry(0.17, h, 0.17);
    g.translate(x, h / 2, z);
    return g;
  });
  return mergeBoxes(blades);
})();
const flowerGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.3).translate(0, 0.68, 0);

let materials = null;
function getMaterials() {
  if (materials) return materials;
  const make = () => {
    const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.windTime = windTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float windTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          // Bend more at the top than at the root.
          vec2 base = instanceMatrix[3].xz;
          float gust = sin(windTime * 2.2 + base.x * 0.5 + base.y * 0.35);
          transformed.x += gust * 0.12 * position.y;
          transformed.z += gust * 0.06 * position.y;`);
    };
    return m;
  };
  materials = { tuft: make(), flower: make() };
  return materials;
}

// Small shapes made of little boxes (see mergeBoxes).
const blades = (list) => mergeBoxes(list.map(([x, h, z, w = 0.09]) => new THREE.BoxGeometry(w, h, w).translate(x, h / 2, z)));
const clusterStems = blades([[-0.14, 0.32, 0.06, 0.05], [0.12, 0.38, -0.08, 0.05], [0.02, 0.28, 0.16, 0.05]]);
const clusterHeads = mergeBoxes([[-0.14, 0.34, 0.06], [0.12, 0.4, -0.08], [0.02, 0.3, 0.16]]
  .map(([x, y, z]) => new THREE.BoxGeometry(0.12, 0.08, 0.12).translate(x, y, z)));
const cloverGeometry = mergeBoxes([[-0.12, 0.0, -0.1], [0.1, 0.02, -0.06], [0.0, 0.01, 0.12], [-0.02, 0.04, 0.0]]
  .map(([x, y, z]) => new THREE.BoxGeometry(0.18, 0.06, 0.18).translate(x, y + 0.03, z)));
const pebbleGeometry = mergeBoxes([[0, 0.06, 0, 0.18, 0.12, 0.15], [0.2, 0.04, 0.1, 0.12, 0.08, 0.12], [-0.12, 0.035, 0.16, 0.1, 0.07, 0.09]]
  .map(([x, y, z, w, h, d]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z)));
const reedStems = blades([[-0.1, 1.1, 0.0, 0.06], [0.1, 0.9, 0.08, 0.06], [0.02, 1.25, -0.1, 0.06]]);
const reedHeads = mergeBoxes([[-0.1, 1.0], [0.02, 1.15]].map(([x, y], i) => new THREE.BoxGeometry(0.1, 0.22, 0.1).translate(x, y, i ? -0.1 : 0)));

const CLUSTER_COLORS = [0xffffff, 0xffe14a, 0xff7ab0, 0xa8b8ff];

let stoneMaterial = null;

export function buildDetailMeshes(data) {
  if (data.length === 0) return null;
  const groups = {};
  for (let i = 0; i < data.length; i += 4) {
    const k = data[i + 3];
    const cat = k < 100 ? 'tuft' : k < 200 ? 'flower' : k < 300 ? 'pebbles' : k < 400 ? 'clover' : k < 500 ? 'cluster' : 'reeds';
    (groups[cat] ??= []).push(i);
  }

  const group = new THREE.Group();
  const matrix = new THREE.Matrix4();
  const rot = new THREE.Matrix4();
  const color = new THREE.Color();
  const add = (list, geometry, material, colorOf) => {
    if (!list || list.length === 0) return;
    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    list.forEach((i, n) => {
      const seed = (data[i] * 7.3 + data[i + 2] * 3.1) % 1;
      const scale = 0.8 + seed * 0.5;
      rot.makeRotationY(seed * Math.PI * 2);
      matrix.makeScale(scale, scale, scale).premultiply(rot).setPosition(data[i], data[i + 1], data[i + 2]);
      mesh.setMatrixAt(n, matrix);
      mesh.setColorAt(n, colorOf(data[i + 3], color, i));
    });
    mesh.computeBoundingSphere();
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  const { tuft, flower } = getMaterials();
  stoneMaterial ??= addFaceShading(new THREE.MeshLambertMaterial({ color: 0xffffff }));
  // Meadow grass plants take the palette shade of the cube they stand on.
  const grassColor = (k, c, i) => (GRASS_BLOCKS[k % 100] === 1 && i !== undefined
    ? c.setHex(GRASS_SHADES[grassShadeIndex(data[i], data[i + 1] - 1, data[i + 2])])
    : c.setHex(BLOCK_INFO[GRASS_BLOCKS[k % 100]].color));

  add(groups.tuft, tuftGeometry, tuft, (k, c, i) => grassColor(k, c, i).multiplyScalar(1.15));
  add(groups.flower, tuftGeometry, tuft, (k, c, i) => grassColor(0, c, i).multiplyScalar(1.1));
  add(groups.flower, flowerGeometry, flower, (k, c) => c.setHex(FLOWER_COLORS[k - 100]));
  add(groups.cluster, clusterStems, tuft, (k, c) => c.setHex(0x5fae3a));
  add(groups.cluster, clusterHeads, flower, (k, c) => c.setHex(CLUSTER_COLORS[k - 400]));
  add(groups.clover, cloverGeometry, stoneMaterial, (k, c, i) => grassColor(k % 100, c, i).multiplyScalar(0.85));
  add(groups.pebbles, pebbleGeometry, stoneMaterial, (k, c) => c.setHex(0xb8b4ae));
  add(groups.reeds, reedStems, tuft, (k, c) => c.setHex(0x5f9a3e));
  add(groups.reeds, reedHeads, flower, (k, c) => c.setHex(0x7a4e2a));
  return group;
}

// Joins a few box shapes into one shape.
function mergeBoxes(boxes) {
  const positions = [];
  const normals = [];
  const indices = [];
  let offset = 0;
  for (const g of boxes) {
    positions.push(...g.attributes.position.array);
    normals.push(...g.attributes.normal.array);
    indices.push(...Array.from(g.index.array, (i) => i + offset));
    offset += g.attributes.position.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setIndex(indices);
  return merged;
}
