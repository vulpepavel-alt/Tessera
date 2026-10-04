// Weather: every few minutes the sky changes - clear, cloudy, rain, or snow
// in the cold lands. The kind depends on where you are (no rain in the
// desert, more rain over the marsh, snow in the frozen forest and up in the
// peaks). While it rains or snows, drops fall around you, the light dims,
// the sky and fog turn grey and the view shortens a little. Weather fades in
// and out over several seconds; it stops under ground (in crypts).

import * as THREE from 'three';

// Chances per land: [clear, cloudy, wet] - "wet" is rain, or snow where cold.
const CLIMATE = {
  amberMeadows: { odds: [0.55, 0.25, 0.2], wet: 'rain' },
  crystalfrostForest: { odds: [0.4, 0.25, 0.35], wet: 'snow' },
  copperDunes: { odds: [0.9, 0.1, 0], wet: 'rain' },
  lanternMarsh: { odds: [0.25, 0.35, 0.4], wet: 'rain' },
  stormspirePeaks: { odds: [0.3, 0.35, 0.35], wet: 'snow' },
};
const CHANGE_EVERY = [150, 330]; // seconds between changes
const DROPS = 2400;
const BOX = { w: 44, h: 30 };   // the space around the camera that holds drops
const GREY = new THREE.Color(0x8a94a4);

export class Weather {
  constructor(scene) {
    this.kind = 'clear';      // what the sky is doing (or heading for)
    this.amount = 0;          // 0..1, how strong right now (fades)
    this.cloud = 0;           // 0..1, how overcast
    this.timer = 20;          // first change soon after you arrive
    this.land = null;

    // Rain: short falling streaks. Snow: soft flakes. One buffer, two looks.
    const positions = new Float32Array(DROPS * 6);
    this.speeds = new Float32Array(DROPS);
    for (let i = 0; i < DROPS; i++) {
      const x = (Math.random() - 0.5) * BOX.w; // local to the box around the camera
      const y = Math.random() * BOX.h;
      const z = (Math.random() - 0.5) * BOX.w;
      positions.set([x, y, z, x, y + 0.5, z], i * 6);
      this.speeds[i] = 0.8 + Math.random() * 0.4;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rain = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0, depthWrite: false }));
    this.snow = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false }));
    for (const o of [this.rain, this.snow]) {
      o.frustumCulled = false;
      o.visible = false;
      scene.add(o);
    }
    this.positions = positions;
  }

  // The label for the HUD ("RAIN", "SNOW", "CLOUDY", or "" when clear).
  get label() {
    if (this.amount > 0.3) return this.kind === 'snow' ? 'SNOW' : 'RAIN';
    return this.cloud > 0.5 ? 'CLOUDY' : '';
  }

  // where: { land (biome id), underground }. Changes atmosphere in place:
  // call after Atmosphere.update.
  update(dt, where, camera, atmosphere, music, post) {
    post?.setOvercast(Math.max(this.cloud * 0.3, this.amount * 0.8));
    if (dt <= 0) {
      this.tintSky(atmosphere); // paused: keep the sky as it is
      return;
    }
    const climate = CLIMATE[where.land] ?? CLIMATE.amberMeadows;
    this.timer -= dt;
    if (this.timer <= 0 || (where.land !== this.land && this.kind !== 'clear' && climate.odds[2] === 0)) this.choose(climate);
    this.land = where.land;
    // Wet weather that doesn't fit this land (rain over the desert) dries up.
    const wetHere = (this.kind === 'rain' || this.kind === 'snow') && climate.odds[2] > 0;
    const kind = wetHere ? climate.wet : this.kind;
    const wantAmount = wetHere && !where.underground ? 1 : 0;
    const wantCloud = this.kind === 'clear' ? 0 : 1;
    this.amount += (wantAmount - this.amount) * Math.min(1, dt * 0.25);
    this.cloud += (wantCloud - this.cloud) * Math.min(1, dt * 0.2);
    this.current = kind;

    this.moveDrops(dt, camera.position, kind);
    this.tintSky(atmosphere);
    music?.setRain?.(kind === 'rain' ? this.amount : 0);
  }

  choose(climate) {
    const r = Math.random();
    const [clear, cloudy] = climate.odds;
    this.kind = r < clear ? 'clear' : r < clear + cloudy ? 'cloudy' : climate.wet;
    this.timer = CHANGE_EVERY[0] + Math.random() * (CHANGE_EVERY[1] - CHANGE_EVERY[0]);
  }

  moveDrops(dt, p, kind) {
    const show = this.amount > 0.02;
    const rainy = kind === 'rain';
    this.rain.visible = show && rainy;
    this.snow.visible = show && !rainy;
    if (!show) return;
    // The drops live in a box around the camera (local coordinates); when
    // one leaves it, it wraps round to the other side.
    this.rain.position.set(p.x, p.y - 12, p.z);
    this.snow.position.copy(this.rain.position);
    this.rain.material.opacity = 0.75 * this.amount;
    this.snow.material.opacity = 0.9 * this.amount;
    const fall = rainy ? 26 : 3;
    const pos = this.positions;
    const half = BOX.w / 2;
    for (let i = 0; i < DROPS; i++) {
      const k = i * 6;
      let x = pos[k] + (rainy ? 2 : Math.sin(i + pos[k + 1] * 0.3) * 1.2) * dt;
      let y = pos[k + 1] - fall * this.speeds[i] * dt;
      if (y < 0) y += BOX.h;
      if (x < -half) x += BOX.w; else if (x > half) x -= BOX.w;
      pos[k] = x; pos[k + 1] = y;
      pos[k + 3] = x - (rainy ? 0.05 : 0); pos[k + 4] = y + (rainy ? 0.6 : 0); pos[k + 5] = pos[k + 2];
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  }

  // Grey sky and fog, dimmer light, shorter view (fog is set from its normal
  // distances every frame, so it comes back when the weather clears).
  tintSky(atmosphere) {
    const fog = atmosphere.fog;
    // Re-read the normal distances only if something else changed the fog
    // (the view distance setting); otherwise build on the saved ones.
    if (!atmosphere.baseFog || fog.far !== atmosphere.viewFar) {
      atmosphere.baseFog = { near: fog.near, far: fog.far };
      atmosphere.viewFar = fog.far;
    }
    fog.near = atmosphere.baseFog.near * (1 - this.amount * 0.5);
    fog.far = atmosphere.baseFog.far * (1 - this.amount * 0.3);
    atmosphere.viewFar = fog.far;
    const grey = Math.max(this.cloud * 0.4, this.amount * 0.8);
    if (grey < 0.005) return;
    // Keep night dark: the grey is scaled by how bright the sky already is.
    const bg = atmosphere.scene.background;
    const lum = Math.min(1, (bg.r + bg.g + bg.b) / 1.6);
    const tone = GREY.clone().multiplyScalar(0.25 + 0.75 * lum);
    bg.lerp(tone, grey * 0.85);
    atmosphere.sky.material.uniforms.top.value.lerp(tone, grey * 0.85);
    atmosphere.sky.material.uniforms.horizon.value.lerp(tone, grey * 0.85);
    atmosphere.light.intensity *= 1 - grey * 0.55;
    atmosphere.fill.intensity *= 1 - grey * 0.25;
  }
}
