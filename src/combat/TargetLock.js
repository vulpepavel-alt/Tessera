// Tab: lock on to the enemy closest to where you're looking. While locked,
// the camera keeps the enemy in view and attacks aim at it. Press Tab again
// to release (or switch when another enemy is a better pick).

import * as THREE from 'three';
import { COMBAT } from '../data/combat.js';

const MAX_ANGLE = THREE.MathUtils.degToRad(75); // must be roughly in front of the camera

export class TargetLock {
  constructor(camera) {
    this.camera = camera;
    this.target = null;
  }

  // Pick a new target (or release the current one).
  toggle(player, enemies) {
    const best = this.findBest(player, enemies, this.target);
    this.target = best;
    return best;
  }

  findBest(player, enemies, exclude) {
    const forward = this.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    let best = null;
    let bestScore = Infinity;
    for (const e of enemies) {
      if (!e.alive || e === exclude) continue;
      const to = new THREE.Vector3(e.position.x - player.position.x, 0, e.position.z - player.position.z);
      const dist = to.length();
      if (dist > COMBAT.lockRange) continue;
      const angle = forward.angleTo(to.normalize());
      if (angle > MAX_ANGLE) continue;
      const score = dist * (1 + angle * 2); // close and centred wins
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  }

  // Drop the target when it dies or gets too far away.
  update(player) {
    const t = this.target;
    if (t && (!t.alive || t.position.distanceTo(player.position) > COMBAT.lockRange + 8)) this.target = null;
  }
}
