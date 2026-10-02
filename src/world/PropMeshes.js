// Turns a chunk's list of props (x, y, z, turn, type — 5 numbers each) into a
// single shape: every prop model is copied into place and all are glued
// together, so a whole chunk of props is drawn in one go.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PROP_TYPES } from '../data/props.js';
import { PROP_BUILDERS, PROP_VOXEL } from '../models/props.js';
import { voxelModelMaterial } from '../models/VoxelGrid.js';

const cache = new Map();

function propGeometry(type) {
  if (!cache.has(type)) {
    const [grid, pivot] = PROP_BUILDERS[PROP_TYPES[type]]();
    cache.set(type, grid.toGeometry(PROP_VOXEL, pivot));
  }
  return cache.get(type);
}

export function buildPropMesh(data) {
  if (!data || data.length === 0) return null;
  const parts = [];
  const m = new THREE.Matrix4();
  for (let i = 0; i < data.length; i += 5) {
    const g = propGeometry(data[i + 4]).clone();
    m.makeRotationY(data[i + 3] * (Math.PI / 2)).setPosition(data[i], data[i + 1], data[i + 2]);
    g.applyMatrix4(m);
    parts.push(g);
  }
  const merged = mergeGeometries(parts);
  for (const g of parts) g.dispose();
  const mesh = new THREE.Mesh(merged, voxelModelMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
