// A "fly mode" camera: look around with the mouse, fly with the keyboard.
// It ignores gravity and walls. In Phase 3 the player character replaces it.
//
// "Yaw" = turning left/right, "pitch" = looking up/down.

import * as THREE from 'three';
import { CAMERA } from '../data/world.js';

const MAX_PITCH = Math.PI / 2 - 0.01; // just under straight up/down

export class FreeCamera {
  constructor(camera, input) {
    this.camera = camera;
    this.input = input;
    this.yaw = 0;
    this.pitch = 0;
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.move = new THREE.Vector3();
  }

  // Place the camera at `position`, looking at `target`.
  setPose(position, target) {
    this.camera.position.copy(position);
    const dir = target.clone().sub(position);
    this.yaw = Math.atan2(-dir.x, -dir.z);
    this.pitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
    this.applyRotation();
  }

  update(dt) {
    const mouse = this.input.takeMouseMovement();
    if (!this.input.locked) return;

    this.yaw -= mouse.x * CAMERA.mouseSensitivity;
    this.pitch -= mouse.y * CAMERA.mouseSensitivity;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
    this.applyRotation();

    // Forward follows where you look (including up/down); right stays level.
    this.camera.getWorldDirection(this.forward);
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const key = (code) => (this.input.isDown(code) ? 1 : 0);
    this.move.set(0, 0, 0);
    this.move.addScaledVector(this.forward, key('KeyW') - key('KeyS'));
    this.move.addScaledVector(this.right, key('KeyD') - key('KeyA'));
    // (Not Ctrl for down: Ctrl+W would close the browser tab.)
    this.move.y += key('Space') - key('KeyC');
    if (this.move.lengthSq() === 0) return;

    const fast = this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight');
    const speed = CAMERA.flySpeed * (fast ? CAMERA.fastMultiplier : 1);
    this.move.normalize().multiplyScalar(speed * dt);
    this.camera.position.add(this.move);
  }

  applyRotation() {
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
