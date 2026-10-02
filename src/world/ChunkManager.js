// Keeps the right chunks loaded around the camera.
//
// Every frame it checks which chunk the camera is in. Chunks within the view
// distance are requested from the background workers (closest first); chunks
// that are now too far away are removed to free memory.

import * as THREE from 'three';
import { CHUNK, WORLD } from '../data/world.js';
import { WorkerPool } from '../core/WorkerPool.js';
import { createVoxelMaterials } from './voxelMaterials.js';
import { PADDED } from './ChunkVolume.js';
import { buildDetailMeshes } from './DetailMeshes.js';
import { buildPropMesh } from './PropMeshes.js';
import { BLOCK } from '../data/blocks.js';

const S = CHUNK.size;
const UNLOADED = BLOCK.DEEP_STONE;
const DETAIL_RADIUS = 3; // grass tufts and flowers only show this many chunks around you

export class ChunkManager {
  constructor(scene, seed, renderDistance = WORLD.renderDistance) {
    this.scene = scene;
    this.seed = seed;
    this.materials = createVoxelMaterials();
    this.renderDistance = renderDistance;
    this.chunks = new Map(); // "cx,cz" -> { state, token, meshes, voxels }
    this.wanted = [];        // chunks still to request, closest first
    this.center = null;
    this.nextToken = 1;
    this.onMap = null; // called with (cx, cz, pixels, heights) when a chunk's minimap data is ready

    const workers = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
    this.pool = new WorkerPool(
      () => new Worker(new URL('./chunkWorker.js', import.meta.url), { type: 'module' }),
      workers
    );
    this.maxInFlight = workers * 2;
  }

  update(position) {
    const cx = Math.floor(position.x / S);
    const cz = Math.floor(position.z / S);
    if (!this.center || this.center.cx !== cx || this.center.cz !== cz) {
      this.center = { cx, cz };
      this.planAround(cx, cz);
      this.unloadFar(cx, cz);
      for (const chunk of this.chunks.values()) {
        if (chunk.details) chunk.details.visible = this.isNearCenter(chunk.cx, chunk.cz, DETAIL_RADIUS);
      }
    }
    // Hand out new jobs while the workers have room.
    while (this.wanted.length > 0 && this.pool.busy < this.maxInFlight) {
      const { cx: x, cz: z } = this.wanted.shift();
      if (!this.chunks.has(key(x, z))) this.load(x, z);
    }
  }

  // List every chunk inside the view circle, sorted from near to far.
  planAround(cx, cz) {
    const r = this.renderDistance;
    const list = [];
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const d2 = dx * dx + dz * dz;
        if (d2 <= r * r && !this.chunks.has(key(cx + dx, cz + dz))) list.push({ cx: cx + dx, cz: cz + dz, d2 });
      }
    }
    list.sort((a, b) => a.d2 - b.d2);
    this.wanted = list;
  }

  unloadFar(cx, cz) {
    const limit = this.renderDistance + WORLD.unloadMargin;
    for (const [k, chunk] of this.chunks) {
      if (Math.abs(chunk.cx - cx) > limit || Math.abs(chunk.cz - cz) > limit) this.unload(k);
    }
  }

  load(cx, cz) {
    const token = this.nextToken++;
    this.chunks.set(key(cx, cz), { cx, cz, state: 'loading', token, meshes: [], voxels: null });
    this.pool.run({ seed: this.seed, cx, cz }).then((result) => this.onLoaded(cx, cz, token, result));
  }

  onLoaded(cx, cz, token, result) {
    const chunk = this.chunks.get(key(cx, cz));
    // Ignore results for chunks that were unloaded (or re-requested) meanwhile.
    if (!chunk || chunk.token !== token) return;
    chunk.state = 'ready';
    chunk.voxels = result.voxels; // kept for collisions
    this.onMap?.(cx, cz, result.map.pixels, result.map.heights);
    if (result.empty) return;

    const props = buildPropMesh(result.props);
    if (props) {
      this.scene.add(props);
      chunk.meshes.push(props);
    }

    const details = buildDetailMeshes(result.details);
    if (details) {
      details.visible = this.isNearCenter(cx, cz, DETAIL_RADIUS);
      this.scene.add(details);
      chunk.meshes.push(details);
      chunk.details = details;
    }

    for (const part of ['solid', 'glow', 'liquid']) {
      const data = result.mesh[part];
      if (!data) continue;
      const mesh = new THREE.Mesh(toGeometry(data), this.materials[part]);
      mesh.position.set(cx * S, 0, cz * S);
      mesh.castShadow = part === 'solid';
      mesh.receiveShadow = part !== 'glow';
      this.scene.add(mesh);
      chunk.meshes.push(mesh);
    }
  }

  isNearCenter(cx, cz, radius) {
    return !!this.center && Math.abs(cx - this.center.cx) <= radius && Math.abs(cz - this.center.cz) <= radius;
  }

  unload(k) {
    const chunk = this.chunks.get(k);
    for (const mesh of chunk.meshes) {
      this.scene.remove(mesh);
      if (mesh.isInstancedMesh || mesh.isGroup) mesh.traverse((o) => o.isInstancedMesh && o.dispose());
      else mesh.geometry.dispose(); // instanced detail shapes are shared, so only chunk meshes are freed
    }
    this.chunks.delete(k);
  }

  // Change how many chunks are visible; takes effect on the next update.
  setRenderDistance(chunks) {
    this.renderDistance = chunks;
    this.center = null; // forces a new plan around the camera
  }

  // Remove everything (when leaving this world).
  dispose() {
    for (const k of [...this.chunks.keys()]) this.unload(k);
    this.pool.terminate();
  }

  // The block at a world position. Chunks that aren't loaded yet count as
  // solid, so nothing can fall through ground that hasn't appeared yet.
  getBlock(x, y, z) {
    if (y < 0) return 0; // below the world: open sky (the rift clouds)
    if (y >= CHUNK.height) return 0;
    const bx = Math.floor(x);
    const bz = Math.floor(z);
    const cx = Math.floor(bx / S);
    const cz = Math.floor(bz / S);
    const chunk = this.chunks.get(key(cx, cz));
    if (!chunk || !chunk.voxels) return UNLOADED;
    const lx = bx - cx * S + 1;
    const lz = bz - cz * S + 1;
    return chunk.voxels[lx + PADDED * (lz + PADDED * Math.floor(y))];
  }

  // True when every chunk within `radius` chunks of (x, z) has arrived.
  isAreaReady(x, z, radius = 1) {
    const cx = Math.floor(x / S);
    const cz = Math.floor(z / S);
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (this.chunks.get(key(cx + dx, cz + dz))?.state !== 'ready') return false;
      }
    }
    return true;
  }

  // Numbers for the F3 debug screen.
  stats() {
    let ready = 0;
    let loading = 0;
    for (const chunk of this.chunks.values()) chunk.state === 'ready' ? ready++ : loading++;
    return { ready, loading, workers: this.pool.size };
  }
}

function key(cx, cz) {
  return `${cx},${cz}`;
}

function toGeometry(data) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
  geometry.setAttribute('sway', new THREE.BufferAttribute(data.sway, 1));
  geometry.setAttribute('tint', new THREE.BufferAttribute(data.tint, 1));
  geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}
