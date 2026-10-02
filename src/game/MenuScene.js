// The menus' 3D background. Two camera "modes":
// - title: a slow drift low over the land, with plenty of sky and clouds
//   behind the big logo;
// - stage: the camera faces a stone pedestal standing in a meadow, where the
//   character being created stands (character and class screens).

import * as THREE from 'three';
import { addFaceShading } from '../world/faceShading.js';
import { DEFAULT_SEED } from '../data/world.js';
import { WorldView } from '../world/WorldView.js';
import { MainMenu } from '../ui/MainMenu.js';
import { buildCharacter } from '../models/characterModel.js';

const ORBIT_RADIUS = 64;
const ORBIT_HEIGHT = 30;   // camera height above the ground (above the tallest trees)
const ORBIT_SPEED = 0.025; // radians per second
const STAGE_VIEW = new THREE.Vector3(0, 2.05, 4.6); // camera offset in front of the pedestal (whole body)
const FACE_VIEW = new THREE.Vector3(0, 2.4, 2.3); // camera offset when zoomed in on the face
const PEDESTAL = { width: 3.2, height: 0.9, depth: 2.4 };

export class MenuScene {
  constructor(engine) {
    this.engine = engine;
    this.world = new WorldView(engine, DEFAULT_SEED, { day: 1, hour: 10 });
    this.world.dayNight.frozen = true; // always a sunny morning behind the menu
    const spawn = this.world.generator.findSpawn();
    this.center = new THREE.Vector3(spawn.x, spawn.y + 4, spawn.z);
    this.angle = 0.8;
    this.mode = 'title';
    this.buildStage(spawn);

    this.menu = new MainMenu({
      stage: this,
      // Reload the page into the chosen save slot (a clean start for the new world).
      onPlay: (slot) => {
        window.location.search = `?slot=${slot}`;
      },
    });

    engine.onUpdate((dt, elapsed) => this.update(dt, elapsed));
  }

  // The pedestal stands on a grassy spot a little outside the start village,
  // turned so the village is in the background.
  buildStage(spawn) {
    const gen = this.world.generator;
    let spot = null;
    for (let r = 62; r < 160 && !spot; r += 4) {
      for (let k = 0; k < 16 && !spot; k++) {
        const a = (k / 16) * Math.PI * 2 + 0.3;
        const x = Math.round(spawn.x + Math.cos(a) * r);
        const z = Math.round(spawn.z + Math.sin(a) * r);
        if (flatTop(gen, x, z) !== null && gen.isGoodSpawn(x, z) && !gen.column(x, z).village) spot = { x, z };
      }
    }
    spot ??= { x: Math.round(spawn.x), z: Math.round(spawn.z) };
    const ground = (flatTop(gen, spot.x, spot.z) ?? gen.column(spot.x, spot.z).top) + 1;
    this.stagePos = new THREE.Vector3(spot.x + 0.5, ground, spot.z + 0.5);
    // Face away from the village, so the camera (in front) looks back at it.
    this.stageYaw = Math.atan2(this.stagePos.x - spawn.x, this.stagePos.z - spawn.z);

    this.stage = new THREE.Group();
    this.stage.position.copy(this.stagePos);
    this.stage.rotation.y = this.stageYaw;
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(PEDESTAL.width, PEDESTAL.height, PEDESTAL.depth),
      addFaceShading(new THREE.MeshLambertMaterial({ color: 0xe8e2d2 }))
    );
    slab.position.y = PEDESTAL.height / 2 - 0.05;
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(PEDESTAL.width + 0.6, 2.25, PEDESTAL.depth + 0.6),
      addFaceShading(new THREE.MeshLambertMaterial({ color: 0xc9c2b0 }))
    );
    step.position.y = -0.95; // a wide base that reaches down into lower ground
    for (const mesh of [slab, step]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.stage.add(mesh);
    }
    this.turner = new THREE.Group(); // spins when the player drags the character
    this.turner.position.y = PEDESTAL.height - 0.05;
    this.stage.add(this.turner);
    this.stage.visible = false;
    this.engine.scene.add(this.stage);
    this.model = null;
    this.spin = 0;
  }

  // 'title' or 'stage'.
  setMode(mode) {
    this.mode = mode;
    this.stage.visible = mode === 'stage';
  }

  setCharacter(classId, look) {
    if (this.model) {
      this.turner.remove(this.model.root);
      this.model.root.traverse((o) => o.geometry?.dispose());
    }
    this.model = buildCharacter(classId, look);
    this.model.root.visible = true;
    this.model.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.turner.add(this.model.root);
  }

  // Zoom between the whole body (0) and the face (1).
  zoom(amount) {
    this.zoomT = Math.min(1, Math.max(0, (this.zoomT ?? 0) + amount));
  }

  // Turn the character on the pedestal (radians).
  turn(amount) {
    this.spin += amount;
  }

  update(dt, elapsed) {
    const camera = this.engine.camera;
    if (this.mode === 'stage') {
      this.turner.rotation.y = this.spin;
      const z = this.zoomT ?? 0;
      const view = STAGE_VIEW.clone().lerp(FACE_VIEW, z);
      const offset = view.applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.stageYaw);
      camera.position.copy(this.stagePos).add(offset);
      // Look at the middle of the body, or at the face when zoomed in.
      camera.lookAt(this.stagePos.x, this.stagePos.y + 1.8 + z * 0.5, this.stagePos.z);
      this.world.update(dt, elapsed, this.stagePos);
      return;
    }
    this.angle += dt * ORBIT_SPEED;
    const x = this.center.x + Math.cos(this.angle) * ORBIT_RADIUS;
    const z = this.center.z + Math.sin(this.angle) * ORBIT_RADIUS;
    // Glide over hills: follow the ground below, smoothly.
    const ground = Math.max(this.world.generator.column(Math.round(x), Math.round(z)).top, this.center.y);
    this.height = this.height === undefined ? ground : this.height + (ground - this.height) * Math.min(1, dt * 0.8);
    camera.position.set(x, this.height + ORBIT_HEIGHT, z);
    // Look across the land towards the horizon, so the sky fills the top half.
    camera.lookAt(this.center.x, this.height + ORBIT_HEIGHT * 0.6, this.center.z);
    this.world.update(dt, elapsed, this.center);
  }
}

// The highest ground under the pedestal, or null when the ground there is
// too bumpy (more than one block of difference).
function flatTop(gen, x, z) {
  let min = Infinity;
  let max = -Infinity;
  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      const top = gen.column(x + dx, z + dz).top;
      min = Math.min(min, top);
      max = Math.max(max, top);
    }
  }
  return max - min <= 1 ? max : null;
}
