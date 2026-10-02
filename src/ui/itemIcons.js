// Little 3D pictures of items for the inventory squares and tooltips: each
// item's voxel model (models/equipment/itemModels.js), turned three-quarters
// and lit, drawn once by one small shared renderer and remembered.

import * as THREE from 'three';
import { ITEMS } from '../data/items.js';
import { itemGrid } from '../models/equipment/itemModels.js';
import { voxelModelMaterial } from '../models/VoxelGrid.js';

const SIZE = 96; // pixels; shown smaller, so edges stay crisp
const cache = new Map();
let kit = null;

function setup() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x5a6478, 2.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(2, 3, 4);
  scene.add(sun);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  camera.position.set(0, 0, 60); // looking straight ahead; the model turns, not the camera
  return { renderer, scene, camera };
}

// A data URL (an image in text form) for the item with this id.
export function itemIcon(id) {
  if (cache.has(id)) return cache.get(id);
  const item = ITEMS[id];
  if (!item) return '';
  kit ??= setup();
  const { renderer, scene, camera } = kit;

  const grid = itemGrid(item);
  const mesh = new THREE.Mesh(grid.toGeometry(1, [grid.sizeX / 2, grid.sizeY / 2, grid.sizeZ / 2]), voxelModelMaterial());
  const holder = new THREE.Group();
  holder.add(mesh);
  // Long things (weapons, staffs, quivers) lie diagonally across the square.
  const long = grid.sizeY > Math.max(grid.sizeX, grid.sizeZ) * 1.6;
  holder.rotation.set(0.45, -0.7, long ? -0.78 : 0);
  if (item.kind === 'shield' || item.kind === 'focus') holder.rotation.set(0.25, -2.2, 0);
  scene.add(holder);

  // Fit the model's outline into the square, with a small margin.
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder);
  const centre = box.getCenter(new THREE.Vector3());
  const half = Math.max(box.max.x - box.min.x, box.max.y - box.min.y) / 2 * 1.12;
  Object.assign(camera, { left: centre.x - half, right: centre.x + half, top: centre.y + half, bottom: centre.y - half });
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL();

  scene.remove(holder);
  mesh.geometry.dispose();
  cache.set(id, url);
  return url;
}
