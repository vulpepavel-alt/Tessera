// Little flying cubes for effects: sparks when you hit something, dust when
// you land or roll, splashes in water, and a puff when an enemy is defeated.
// One pool of cubes drawn in a single go, reused over and over.

import * as THREE from 'three';

const POOL = 600;

export const EFFECTS = {
  hit: { count: 8, colors: [0xffffff, 0xfff0a0], speed: 5, up: 2, gravity: 14, life: 0.35, size: 0.12 },
  crit: { count: 16, colors: [0xffd84a, 0xffa53a, 0xffffff], speed: 7, up: 3, gravity: 14, life: 0.5, size: 0.15 },
  dust: { count: 10, colors: [0xcbb894, 0xa8957a], speed: 2.2, up: 1.2, gravity: 3, life: 0.6, size: 0.18 },
  splash: { count: 18, colors: [0xbfe6ff, 0xffffff, 0x6fb6f0], speed: 3, up: 5, gravity: 16, life: 0.7, size: 0.14 },
  heal: { count: 18, colors: [0x8fff8a, 0xd8ffd0, 0x4fd84a], speed: 1.2, up: 3, gravity: -2, life: 1, size: 0.16 },
  meteor: { count: 40, colors: [0xff7a2a, 0xffd84a, 0xff4a2a, 0x8a5a3a], speed: 9, up: 7, gravity: 14, life: 1, size: 0.3 },
  smoke: { count: 1, colors: [0xd8d8d8, 0xc4c4c4, 0xeeeeee], speed: 0.25, up: 0.9, gravity: -0.15, life: 3.2, size: 0.55 },
  finisher: { count: 26, colors: [0xffffff, 0xffc83a, 0x2f6cf0], speed: 8, up: 4, gravity: 14, life: 0.55, size: 0.16 },
  trailArrow: { count: 2, colors: [0xffffff, 0xe8e2d2], speed: 0.15, up: 0, gravity: 0, life: 0.3, size: 0.1 },
  trailBolt: { count: 2, colors: [0x8fe8ff, 0xffffff, 0x4ac8ff], speed: 0.5, up: 0.2, gravity: -0.5, life: 0.35, size: 0.1 },
  trailOrb: { count: 2, colors: [0xff9a4a, 0xffd84a, 0xff5a2a], speed: 0.6, up: 0.4, gravity: -0.8, life: 0.45, size: 0.14 },
  poof: { count: 22, colors: [0xdedede, 0xbababa, 0x8a6a4a], speed: 3, up: 2.5, gravity: -1, life: 0.9, size: 0.25 },
};

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      POOL
    );
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.items = [];
    this.matrix = new THREE.Matrix4();
    this.color = new THREE.Color();
    this.mesh.setColorAt(0, this.color); // creates the colour list
  }

  // Throw a burst of particles from `position`.
  burst(kind, position) {
    const e = EFFECTS[kind];
    for (let i = 0; i < e.count && this.items.length < POOL; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = e.speed * (0.4 + Math.random() * 0.8);
      this.items.push({
        p: position.clone(),
        v: new THREE.Vector3(Math.cos(a) * s, e.up * (0.5 + Math.random()), Math.sin(a) * s),
        g: e.gravity,
        life: e.life * (0.7 + Math.random() * 0.6),
        age: 0,
        size: e.size * (0.7 + Math.random() * 0.6),
        color: e.colors[Math.floor(Math.random() * e.colors.length)],
      });
    }
  }

  // A flat ring of sparks on the ground, showing the reach of an area skill.
  ring(center, radius, color) {
    const count = Math.min(48, Math.round(radius * 8));
    for (let i = 0; i < count && this.items.length < POOL; i++) {
      const a = (i / count) * Math.PI * 2;
      this.items.push({
        p: new THREE.Vector3(center.x + Math.cos(a) * radius, center.y, center.z + Math.sin(a) * radius),
        v: new THREE.Vector3(Math.cos(a) * 1.5, 1.5, Math.sin(a) * 1.5),
        g: 2, life: 0.55, age: 0, size: 0.2, color,
      });
    }
  }

  update(dt) {
    this.items = this.items.filter((it) => (it.age += dt) < it.life);
    let n = 0;
    for (const it of this.items) {
      it.v.y -= it.g * dt;
      it.p.addScaledVector(it.v, dt);
      const s = it.size * (1 - it.age / it.life); // shrink away
      this.matrix.makeScale(s, s, s).setPosition(it.p);
      this.mesh.setMatrixAt(n, this.matrix);
      this.mesh.setColorAt(n, this.color.setHex(it.color));
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
