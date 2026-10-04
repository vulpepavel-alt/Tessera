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
import { CharacterAnimator } from '../entities/CharacterAnimator.js';
import { ITEMS } from '../data/items.js';
import { placeHeld } from '../models/equipment/weapons.js';
import { settings } from '../save/Settings.js';

const ORBIT_RADIUS = 64;
const ORBIT_HEIGHT = 30;   // camera height above the ground (above the tallest trees)
const ORBIT_SPEED = 0.025; // radians per second
const STAGE_VIEW = new THREE.Vector3(0, 1.9, 4.3);  // camera offset in front of the pedestal (whole body)
const FACE_VIEW = new THREE.Vector3(0, 2.45, 1.9); // camera offset when zoomed in on the face
const PEDESTAL = { width: 6.4, height: 1.0, depth: 4.4 }; // a wide, low slab (tall enough to cover grass tufts)

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
  // turned so the countryside is in the background.
  buildStage(spawn) {
    const gen = this.world.generator;
    // Best: wide flat ground out to where the camera stands; else any small
    // flat spot (still outside the village, whose houses would block the view).
    let spot = null;
    for (const reach of [6, 4, 2]) {
      for (let r = 62; r < 220 && !spot; r += 4) {
        for (let k = 0; k < 24 && !spot; k++) {
          const a = (k / 24) * Math.PI * 2 + 0.3;
          const x = Math.round(spawn.x + Math.cos(a) * r);
          const z = Math.round(spawn.z + Math.sin(a) * r);
          if (flatTop(gen, x, z, reach) !== null && gen.isGoodSpawn(x, z) && !gen.column(x, z).village) spot = { x, z, reach };
        }
      }
      if (spot) break;
    }
    spot ??= { x: Math.round(spawn.x), z: Math.round(spawn.z), reach: 2 };
    const ground = (flatTop(gen, spot.x, spot.z, spot.reach) ?? gen.column(spot.x, spot.z).top) + 1;
    this.stagePos = new THREE.Vector3(spot.x + 0.5, ground, spot.z + 0.5);
    // Face the village, so the camera (in front of the hero) looks out over
    // the open countryside and its trees, like the classic creator screen.
    this.stageYaw = Math.atan2(spawn.x - this.stagePos.x, spawn.z - this.stagePos.z);

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
    this.spinGoal = null;     // set by the FRONT / SIDE / BACK buttons
    this.preview = 'idle';    // idle | walk | combat
    this.previewTime = 0;

    // Studio lights for the creator: a warm key light from the front-left and
    // a cool rim light from behind, so the face and silhouette read clearly.
    this.keyLight = new THREE.DirectionalLight(0xfff0dc, 1.9); // the hero is always brightly lit
    this.rimLight = new THREE.DirectionalLight(0xbcd8ff, 1.4);
    for (const l of [this.keyLight, this.rimLight]) {
      l.visible = false;
      l.target = this.turner;
      this.engine.scene.add(l);
    }
  }

  // 'title' or 'stage'.
  setMode(mode) {
    this.mode = mode;
    this.stage.visible = mode === 'stage';
    this.keyLight.visible = this.rimLight.visible = mode === 'stage';
    if (mode !== 'stage') this.world.atmosphere.setViewDistance(settings.get('renderDistance')); // undo the creator haze
  }

  // Creator preview: 'idle', 'walk' or 'combat' (a short attack combo, looped).
  setPreview(kind) {
    this.preview = kind;
    this.previewTime = 0;
    if (this.model) placeHeld(this.model, kind === 'combat');
  }

  // Turn to a fixed view: 'front', 'side' or 'back'.
  setView(view) {
    const target = { front: 0, side: Math.PI / 2, back: Math.PI }[view] ?? 0;
    const turns = Math.round((this.spin - target) / (Math.PI * 2));
    this.spinGoal = target + turns * Math.PI * 2;
  }

  setCharacter(classId, look) {
    if (this.model) {
      this.turner.remove(this.model.root);
      this.model.root.traverse((o) => o.geometry?.dispose());
    }
    this.model = buildCharacter(classId, look, { equipment: this.equipment });
    placeHeld(this.model, this.preview === 'combat'); // weapons on the back unless fighting
    this.animator = new CharacterAnimator(this.model);
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
    this.spinGoal = null;
  }

  // Animate the preview: standing, walking on the spot, or a looping combo.
  animatePreview(dt) {
    if (!this.animator) return;
    this.previewTime += dt;
    const state = { mode: 'walk', speed: 0, grounded: true, walking: false, inWater: false, rolling: -1, attack: null };
    if (this.preview === 'walk') state.speed = 3.6;
    if (this.preview === 'combat') {
      const kind = ITEMS[this.equipment?.mainHand]?.kind;
      const pose = { blade: 'swing', great: 'swing', dagger: 'thrust', bow: 'shoot', crossbow: 'shoot', wand: 'cast', staff: 'cast' }[kind] ?? 'thrust';
      const step = 0.45;
      const loop = this.previewTime % (step * 3 + 0.7); // three hits, then a breath
      const index = Math.floor(loop / step);
      if (loop < step * 3) state.attack = { kind: pose, t: (loop % step) / step, index, finisher: index === 2 };
    }
    this.animator.update(dt, state);
  }

  update(dt, elapsed) {
    const camera = this.engine.camera;
    if (this.mode === 'stage') {
      if (this.spinGoal !== null) this.spin += (this.spinGoal - this.spin) * Math.min(1, dt * 8);
      this.turner.rotation.y = this.spin;
      this.animatePreview(dt);
      const z = this.zoomT ?? 0;
      const view = STAGE_VIEW.clone().lerp(FACE_VIEW, z);
      const offset = view.applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.stageYaw);
      camera.position.copy(this.stagePos).add(offset);
      // Look at the middle of the body, or at the face when zoomed in.
      camera.lookAt(this.stagePos.x, this.stagePos.y + 1.55 + z * 0.75, this.stagePos.z);
      // Lights follow the camera: key from the front-left above, rim from behind.
      const key = new THREE.Vector3(-2, 3, 3).applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.stageYaw);
      this.keyLight.position.copy(this.stagePos).add(key);
      this.rimLight.position.copy(this.stagePos).add(key.set(1.5, 2.5, -3).applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.stageYaw));
      this.world.update(dt, elapsed, this.stagePos);
      // The world behind stays crisp and colourful nearby and fades to blue
      // further away, like the classic creator screen.
      const fog = this.engine.scene.fog;
      if (fog) {
        fog.near = 55;
        fog.far = 150;
      }
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
// too bumpy (more than one block of difference). The check reaches out to
// where the camera stands, so no hill blocks the view of the hero.
function flatTop(gen, x, z, reach = 6) {
  let min = Infinity;
  let max = -Infinity;
  for (let dz = -reach; dz <= reach; dz++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const top = gen.column(x + dx, z + dz).top;
      min = Math.min(min, top);
      max = Math.max(max, top);
    }
  }
  return max - min <= 1 ? max : null;
}
