// Sky, sun, moon, stars, light and fog. Follows the day/night cycle.
//
// - The sky is a huge ball around the camera, coloured from the horizon up.
// - Fog uses the horizon colour, so faraway things melt into the sky.
// - One "directional light" (parallel rays) is the sun by day and the moon by
//   night; it casts shadows. A soft "hemisphere light" fills in the shade.

import * as THREE from 'three';
import { ATMOSPHERE, WORLD, CHUNK } from '../data/world.js';

const SKY_RADIUS = 1500;
const LIGHT_DISTANCE = 170;  // how far the light sits from the area it lights
const SHADOW_SNAP = 4;       // move the shadow area in steps, so shadow edges don't shimmer
const STAR_COUNT = 900;

export class Atmosphere {
  constructor(scene, renderDistance = WORLD.renderDistance) {
    scene.background = new THREE.Color(ATMOSPHERE.skyHorizon);
    scene.fog = new THREE.Fog(scene.background, 1, 2);
    this.scene = scene;
    this.fog = scene.fog;
    this.setViewDistance(renderDistance);

    this.sky = createSkyDome();
    this.stars = createStars();
    this.sunDisc = createDisc(110, 0xfff4c8);
    this.moonDisc = createDisc(70, 0xe6ecff);
    this.sky.add(this.stars, this.sunDisc, this.moonDisc);
    scene.add(this.sky);

    this.fill = new THREE.HemisphereLight(ATMOSPHERE.skyLight, ATMOSPHERE.groundLight, ATMOSPHERE.skyLightIntensity);
    scene.add(this.fill);

    this.light = createLight();
    scene.add(this.light, this.light.target);
  }

  // The fog ends just before the edge of the loaded chunks, hiding where the world stops.
  setViewDistance(chunks) {
    const far = chunks * CHUNK.size * 0.95;
    this.fog.near = far * ATMOSPHERE.fogStart;
    this.fog.far = far;
  }

  // camera: the view camera. look: DayNight.look (colours and directions for now).
  update(camera, look) {
    const p = camera.position;
    this.sky.position.copy(p);

    // Colours.
    this.sky.material.uniforms.top.value.copy(look.top);
    this.sky.material.uniforms.horizon.value.copy(look.horizon);
    this.scene.background.copy(look.horizon); // also the fog colour
    this.stars.material.opacity = look.stars;
    this.stars.visible = look.stars > 0.01;
    this.fill.intensity = ATMOSPHERE.skyLightIntensity * look.ambient;

    // Sun and moon discs in the sky.
    placeDisc(this.sunDisc, look.sunDirection, 1);
    placeDisc(this.moonDisc, look.sunDirection, -1);

    // The light (and its shadow area) follows the camera.
    const snap = (v) => Math.round(v / SHADOW_SNAP) * SHADOW_SNAP;
    this.light.target.position.set(snap(p.x), 30, snap(p.z));
    this.light.position.copy(this.light.target.position).addScaledVector(look.lightDirection, LIGHT_DISTANCE);
    this.light.color.copy(look.light);
    this.light.intensity = look.lightIntensity;
  }
}

function createSkyDome() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      top: { value: new THREE.Color(ATMOSPHERE.skyTop) },
      horizon: { value: new THREE.Color(ATMOSPHERE.skyHorizon) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 top;
      uniform vec3 horizon;
      varying vec3 vDir;
      void main() {
        float t = pow(max(vDir.y, 0.0), 0.6);
        gl_FragColor = vec4(mix(horizon, top, t), 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, // we look at the inside of the ball
    depthWrite: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 32, 16), material);
  dome.renderOrder = -2; // draw it first, behind everything
  dome.frustumCulled = false;
  return dome;
}

// Little white dots spread over the upper half of the sky.
function createStars() {
  const positions = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const u = Math.random() * Math.PI * 2;
    const y = 0.05 + Math.random() * 0.95;
    const r = Math.sqrt(1 - y * y);
    positions.push(Math.cos(u) * r * 1400, y * 1400, Math.sin(u) * r * 1400);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false,
  });
  const stars = new THREE.Points(geometry, material);
  stars.renderOrder = -1;
  stars.frustumCulled = false;
  return stars;
}

// A flat square (voxel-style sun or moon).
function createDisc(size, color) {
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ color, fog: false, depthWrite: false })
  );
  disc.renderOrder = -1;
  disc.frustumCulled = false;
  return disc;
}

// Put a disc far away in direction `dir` (or the opposite one), facing the viewer.
function placeDisc(disc, dir, sign) {
  disc.position.copy(dir).multiplyScalar(1300 * sign);
  disc.lookAt(0, 0, 0);
  disc.visible = disc.position.y > -60;
}

function createLight() {
  const light = new THREE.DirectionalLight(ATMOSPHERE.sunColor, ATMOSPHERE.sunIntensity);
  // Shadows: the light renders the area around you from above into a "shadow map".
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  const area = 110; // half-width of the shadowed area around you, in voxels
  Object.assign(light.shadow.camera, { left: -area, right: area, top: area, bottom: -area, near: 1, far: 450 });
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.08;
  light.shadow.intensity = 0.72; // visible but soft-coloured shadows, never black
  light.shadow.radius = 2;
  return light;
}
