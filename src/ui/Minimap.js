// The minimap: a tiny 3D model of the land around you, like a diorama on a
// table. It turns with the camera (what's ahead of you is always "up"), and
// only shows land you have been near. Villages, enemies and you are marked.
//
// It has its own little renderer and scene. Every explored chunk becomes a set
// of small columns (one per 2 x 2 blocks) coloured like the ground.

import * as THREE from 'three';
import { addFaceShading } from '../world/faceShading.js';
import { CHUNK, WORLD } from '../data/world.js';

const S = CHUNK.size;
const CELL = 2;               // blocks per minimap column
const VIEW = 180;             // blocks across the visible square
const REVEAL_RADIUS = 3;      // chunks around you that count as "explored"
const REDRAW_EVERY = 1 / 12;  // seconds between redraws
const FLOOR = WORLD.seaLevel - 8; // columns start here (keeps them short)
const WIDTH = 210;
const HEIGHT = 166;

export class Minimap {
  constructor(chunks, explored = []) {
    this.pending = new Map();           // "cx,cz" -> { pixels, heights } loaded but not explored
    this.tiles = new Map();             // "cx,cz" -> instanced mesh, explored
    this.explored = new Set(explored);  // keys, also stored in the save file
    chunks.onMap = (cx, cz, pixels, heights) => this.receive(cx, cz, pixels, heights);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(WIDTH, HEIGHT);
    this.renderer.localClippingEnabled = true;
    this.renderer.domElement.className = 'minimap-canvas';

    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6a6a7a, 2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(-1, 3, -2);
    this.scene.add(sun);
    this.camera = new THREE.OrthographicCamera(-VIEW * 0.62, VIEW * 0.62, VIEW * 0.5, -VIEW * 0.5, 1, 1000);

    // Only the square around you is drawn (the sides are cut cleanly).
    this.clip = [0, 1, 2, 3].map(() => new THREE.Plane());
    this.material = addFaceShading(new THREE.MeshLambertMaterial({ clippingPlanes: this.clip }));
    this.box = new THREE.BoxGeometry(CELL, 1, CELL).translate(0, 0.5, 0);

    this.markers = createMarkers(this.scene);
    this.root = document.createElement('div');
    this.root.className = 'minimap';
    this.root.append(this.renderer.domElement);
    this.timer = 0;
  }

  receive(cx, cz, pixels, heights) {
    const key = `${cx},${cz}`;
    if (this.explored.has(key)) this.makeTile(key, cx, cz, pixels, heights);
    else this.pending.set(key, { cx, cz, pixels, heights });
  }

  // One explored chunk: 16 x 16 little coloured columns.
  makeTile(key, cx, cz, pixels, heights) {
    if (this.tiles.has(key)) return;
    const n = S / CELL;
    const mesh = new THREE.InstancedMesh(this.box, this.material, n * n);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    let i = 0;
    for (let z = 0; z < S; z += CELL) {
      for (let x = 0; x < S; x += CELL) {
        const k = x + z * S;
        const h = Math.max(heights[k], FLOOR) - FLOOR + 1;
        m.makeScale(1, h, 1).setPosition(cx * S + x + CELL / 2, FLOOR, cz * S + z + CELL / 2);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, c.setRGB(pixels[k * 4] / 255, pixels[k * 4 + 1] / 255, pixels[k * 4 + 2] / 255, THREE.SRGBColorSpace));
        i++;
      }
    }
    this.scene.add(mesh);
    this.tiles.set(key, mesh);
    this.pending.delete(key);
  }

  // Mark the chunks around the player as explored.
  reveal(position) {
    const pcx = Math.floor(position.x / S);
    const pcz = Math.floor(position.z / S);
    for (let dz = -REVEAL_RADIUS; dz <= REVEAL_RADIUS; dz++) {
      for (let dx = -REVEAL_RADIUS; dx <= REVEAL_RADIUS; dx++) {
        if (dx * dx + dz * dz > REVEAL_RADIUS * REVEAL_RADIUS + 1) continue;
        const key = `${pcx + dx},${pcz + dz}`;
        this.explored.add(key);
        const p = this.pending.get(key);
        if (p) this.makeTile(key, p.cx, p.cz, p.pixels, p.heights);
      }
    }
  }

  // markers: { villages: [{x, z}], enemies: [{x, y, z}] }
  update(dt, position, cameraYaw, facing, markers) {
    this.reveal(position);
    this.timer += dt;
    if (this.timer < REDRAW_EVERY) return;
    this.timer = 0;

    // Cut planes around a square centred on you.
    const half = VIEW / 2;
    const p = position;
    this.clip[0].set(new THREE.Vector3(1, 0, 0), -(p.x - half));
    this.clip[1].set(new THREE.Vector3(-1, 0, 0), p.x + half);
    this.clip[2].set(new THREE.Vector3(0, 0, 1), -(p.z - half));
    this.clip[3].set(new THREE.Vector3(0, 0, -1), p.z + half);

    // Look down at the diorama from behind you, tilted like a table top.
    const dist = 300;
    const tilt = 0.95; // radians above the horizon
    this.camera.position.set(
      p.x + Math.sin(cameraYaw) * Math.cos(tilt) * dist,
      FLOOR + Math.sin(tilt) * dist,
      p.z + Math.cos(cameraYaw) * Math.cos(tilt) * dist
    );
    this.camera.lookAt(p.x, FLOOR + 10, p.z);

    placeMarkers(this.markers, p, facing, markers, this.clip);
    this.renderer.render(this.scene, this.camera);
  }
}

// Small shapes for you (a yellow arrow), villages (little houses) and enemies (red cubes).
function createMarkers(scene) {
  const you = new THREE.Mesh(new THREE.ConeGeometry(3, 7, 4).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe27a }));
  const house = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 6), new THREE.MeshLambertMaterial({ color: 0xfaf3e2 }));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.5, 4, 4).rotateY(Math.PI / 4), new THREE.MeshLambertMaterial({ color: 0xdc4c36 }));
  roof.position.y = 4;
  house.add(walls, roof);
  const enemyGeometry = new THREE.BoxGeometry(3, 3, 3);
  const enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
  scene.add(you);
  return { you, house, houses: [], enemyGeometry, enemyMaterial, enemies: [], scene };
}

function placeMarkers(mk, p, facing, markers, clip) {
  mk.you.position.set(p.x, p.y + 8, p.z);
  mk.you.rotation.y = facing;
  const half = VIEW / 2;
  const inside = (q) => Math.abs(q.x - p.x) < half && Math.abs(q.z - p.z) < half;

  const villages = markers.villages.filter(inside);
  while (mk.houses.length < villages.length) {
    const h = mk.house.clone();
    mk.scene.add(h);
    mk.houses.push(h);
  }
  mk.houses.forEach((h, i) => {
    h.visible = i < villages.length;
    if (h.visible) h.position.set(villages[i].x, villages[i].y + 8, villages[i].z);
  });

  const enemies = markers.enemies.filter(inside);
  while (mk.enemies.length < enemies.length) {
    const e = new THREE.Mesh(mk.enemyGeometry, mk.enemyMaterial);
    mk.scene.add(e);
    mk.enemies.push(e);
  }
  mk.enemies.forEach((e, i) => {
    e.visible = i < enemies.length;
    if (e.visible) e.position.set(enemies[i].x, enemies[i].y + 3, enemies[i].z);
  });
}
