// DEV ONLY: loads a visual reference model (reference/*.json, git-ignored,
// never part of the game) so our characters can be compared with it side by
// side in ?lineup&reference. If the file is missing nothing is shown.

import * as THREE from 'three';
import { addFaceShading } from '../world/faceShading.js';

const HEIGHT = 2.0;       // scaled to our characters' height (32 MV)
const BARE_HEAD_TOP = 19.4; // the reference's top of the head (without hair), in its own units

export async function loadReference(url = '/reference/cw_alpha_character.json') {
  let parts;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    parts = await res.json();
  } catch {
    return null;
  }
  const s = HEIGHT / BARE_HEAD_TOP;
  const positions = [];
  const colours = [];
  const colour = new THREE.Color();
  for (const part of parts) {
    // Blender is Z-up with the front towards -Y; ours is Y-up with the front towards +Z.
    const v = part.verts.map(([x, y, z]) => [x * s, z * s, -y * s]);
    for (const [idx, hex] of part.polys) {
      colour.set(hex);
      for (let k = 1; k + 1 < idx.length; k++) {
        for (const i of [idx[0], idx[k], idx[k + 1]]) {
          positions.push(...v[i]);
          colours.push(colour.r, colour.g, colour.b);
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  const material = addFaceShading(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  return () => {
    const root = new THREE.Group();
    root.add(new THREE.Mesh(geometry, material));
    return { root };
  };
}
