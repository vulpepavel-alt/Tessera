// The engine owns the three basic pieces every Three.js game needs:
// the renderer (draws pictures), the scene (holds objects) and the camera
// (the eye). It also runs the game loop: about 60 times per second it updates
// everything, then draws a new picture.

import * as THREE from 'three';
import { CAMERA } from '../data/world.js';
import { PostEffects } from './PostEffects.js';

export class Engine {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, window.innerWidth / window.innerHeight, 0.1, 2000);
    // Ambient occlusion + colour grading on the finished picture (PostEffects.js).
    // A scene can set this.post = null to draw without them.
    this.post = new PostEffects(this.renderer, this.scene, this.camera);

    this.updaters = [];
    this.timer = new THREE.Timer();
    this.timer.connect(document); // pauses time while the tab is hidden

    window.addEventListener('resize', () => this.resize());
  }

  get canvas() {
    return this.renderer.domElement;
  }

  // Register a function to run every frame: fn(deltaSeconds, elapsedSeconds).
  onUpdate(fn) {
    this.updaters.push(fn);
  }

  start() {
    this.renderer.setAnimationLoop((timestamp) => {
      this.timer.update(timestamp);
      // Cap the step so a slow frame doesn't make things jump far ahead.
      const dt = Math.min(this.timer.getDelta(), 0.1);
      const elapsed = this.timer.getElapsed();
      for (const fn of this.updaters) fn(dt, elapsed);
      if (this.post) {
        this.post.setCamera(this.camera);
        this.post.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    });
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.post?.setSize(window.innerWidth, window.innerHeight, this.renderer.getPixelRatio());
  }
}
