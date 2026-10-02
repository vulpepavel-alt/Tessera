// Takes a little "photo" of a character's head for the HUD portrait.
// A tiny separate renderer draws the head once, then is thrown away.

import * as THREE from 'three';

export function renderPortrait(model, size = 128) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(size, size, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 2.2));
  const light = new THREE.DirectionalLight(0xffffff, 1.6);
  light.position.set(1, 2, 3);
  scene.add(light);

  // Pose the model facing the camera, then frame its head.
  model.parts.head.name = 'portrait-head';
  const root = model.root.clone(true);
  root.visible = true; // the player is still hidden while the world loads
  root.position.set(0, 0, 0);
  root.rotation.set(0, -0.35, 0);
  scene.add(root);
  root.updateMatrixWorld(true);
  const head = root.getObjectByName('portrait-head');
  const box = new THREE.Box3().setFromObject(head);
  const centre = box.getCenter(new THREE.Vector3());
  const span = box.getSize(new THREE.Vector3()).length();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
  camera.position.set(centre.x, centre.y + span * 0.02, centre.z + span * 1.45);
  camera.lookAt(centre.x, centre.y - span * 0.05, centre.z);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL();
  renderer.dispose();
  renderer.forceContextLoss();
  return url;
}
