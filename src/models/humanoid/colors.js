// Small colour helpers for voxel models.

import * as THREE from 'three';

// A lighter version of a colour (hair highlights, shine).
export function lighter(hex, amount = 0.25) {
  return new THREE.Color(hex).lerp(new THREE.Color(0xffffff), amount).getHex();
}

// A darker version of a colour (shadows, soles, seams).
export function darker(hex, amount = 0.3) {
  return new THREE.Color(hex).multiplyScalar(1 - amount).getHex();
}
