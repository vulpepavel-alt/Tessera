// Small creatures that make the world feel alive: butterflies flutter around
// you by day in warm places, fireflies glow at night. They don't interact
// with anything; they just drift around nearby.

import * as THREE from 'three';

const COUNT = 12;
const RANGE = 16;           // they stay within this distance of you
const WARM = ['amberMeadows', 'lanternMarsh', 'copperDunes'];
const WING_COLORS = [0xffffff, 0xffd84a, 0xff8ac8, 0x8fc8ff, 0xffa04a];

export class AmbientLife {
  constructor(scene) {
    this.scene = scene;
    this.creatures = [];
    const wingGeometry = new THREE.BoxGeometry(0.16, 0.02, 0.12);
    const glowGeometry = new THREE.BoxGeometry(0.09, 0.09, 0.09);
    for (let i = 0; i < COUNT; i++) {
      // Butterfly: two wings that flap. Firefly: a glowing dot.
      const butterfly = new THREE.Group();
      const color = WING_COLORS[i % WING_COLORS.length];
      const material = new THREE.MeshLambertMaterial({ color });
      const left = new THREE.Mesh(wingGeometry, material);
      const right = new THREE.Mesh(wingGeometry, material);
      left.position.x = -0.08;
      right.position.x = 0.08;
      butterfly.add(left, right);
      const firefly = new THREE.Mesh(glowGeometry, new THREE.MeshBasicMaterial({ color: 0xd8ff6a }));
      scene.add(butterfly, firefly);
      this.creatures.push({ butterfly, left, right, firefly, pos: new THREE.Vector3(), phase: Math.random() * 10, home: null });
    }
  }

  // ground(x, z): the standing height there. biomeId: where the player is.
  update(dt, player, isNight, biomeId, ground, time) {
    const showButterflies = !isNight && WARM.includes(biomeId);
    const showFireflies = isNight && biomeId !== 'crystalfrostForest';
    for (const c of this.creatures) {
      c.butterfly.visible = showButterflies;
      c.firefly.visible = showFireflies;
      if (!showButterflies && !showFireflies) continue;
      // Pick a new spot near the player when it wanders too far.
      if (!c.home || c.home.distanceTo(player.position) > RANGE) {
        const a = Math.random() * Math.PI * 2;
        const r = 4 + Math.random() * (RANGE - 4);
        const x = player.position.x + Math.cos(a) * r;
        const z = player.position.z + Math.sin(a) * r;
        c.home = new THREE.Vector3(x, ground(x, z), z);
      }
      // Lazy looping flight around its spot.
      const t = time + c.phase;
      c.pos.set(
        c.home.x + Math.sin(t * 0.7) * 1.6 + Math.sin(t * 1.9) * 0.4,
        c.home.y + 0.8 + Math.sin(t * 1.3) * 0.4 + (isNight ? 0.6 : 0),
        c.home.z + Math.cos(t * 0.6) * 1.6
      );
      if (showButterflies) {
        c.butterfly.position.copy(c.pos);
        c.butterfly.rotation.y = t * 0.7;
        const flap = Math.sin(t * 18) * 0.9;
        c.left.rotation.z = flap;
        c.right.rotation.z = -flap;
      } else {
        c.firefly.position.copy(c.pos);
        c.firefly.scale.setScalar(0.6 + 0.4 * (Math.sin(t * 3) * 0.5 + 0.5)); // twinkle
      }
    }
  }
}
