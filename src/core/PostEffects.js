// Effects applied to the finished picture, every frame:
//
// 1. Ambient occlusion (GTAO, from Three.js's own add-ons): darkens creases
//    where surfaces meet - under hair, between arms and body, under feet,
//    between terrain steps, under tree crowns, in building corners. It is
//    tuned for readability, not realism: soft and fairly short-range.
// 2. Colour grading: a light touch of contrast and saturation, warm light
//    areas, slightly cool shade, and a very soft darkening at the edges.
//    Clean and graphic; no film grain, no heavy bloom.
//
// The picture is drawn with 4x multisampling so cube edges stay smooth.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const POST = {
  aoRadius: 0.9,       // how far (in voxels) creases reach
  aoResolution: 0.5,   // the AO is computed at this fraction of the screen size (speed)
  maxPixelRatio: 1.5,  // sharpness cap for the effects (speed on high-DPI screens)
  aoIntensity: 0.55,   // 0 = no ambient occlusion, 1 = full
  contrast: 1.15,     // punchy, like the classic look: bright lit faces, deeper shade
  saturation: 1.3,     // bright, toy-like colours
  warmth: 0.025,       // warm tint in bright areas, cool tint in dark ones
  vignette: 0.1,
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    contrast: { value: POST.contrast },
    saturation: { value: POST.saturation },
    warmth: { value: POST.warmth },
    vignette: { value: POST.vignette },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float contrast, saturation, warmth, vignette;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(luma), col, saturation);
      col = (col - 0.18) * contrast + 0.18;
      // Split toning: warm light, cool shade.
      col += warmth * (smoothstep(0.25, 0.9, luma) * vec3(1.0, 0.55, 0.0) - (1.0 - smoothstep(0.0, 0.3, luma)) * vec3(0.3, 0.1, -0.6));
      float edge = distance(vUv, vec2(0.5));
      col *= 1.0 - vignette * smoothstep(0.45, 0.85, edge);
      gl_FragColor = vec4(max(col, 0.0), c.a);
    }`,
};

export class PostEffects {
  constructor(renderer, scene, camera) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.depth = new THREE.DepthTexture(size.x, size.y);
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4, depthTexture: this.depth });
    this.composer = new EffectComposer(renderer, target);
    this.composer.setPixelRatio(Math.min(renderer.getPixelRatio(), POST.maxPixelRatio));
    this.renderPass = new RenderPass(scene, camera);
    this.ao = new GTAOPass(scene, camera, size.x, size.y);
    this.ao.blendIntensity = POST.aoIntensity;
    this.ao.updateGtaoMaterial({ radius: POST.aoRadius, distanceExponent: 1.5, thickness: 1.2, scale: 1.1, samples: 12 });
    // The AO reads the depth the main picture already drew (both of the
    // composer's buffers share one depth texture) and works out each face's
    // direction from it. It used to draw the whole world a second time just
    // for that, which made the game stutter while walking. For a world of flat
    // cube faces the result is the same.
    this.composer.renderTarget2.depthTexture = this.depth;
    this.ao.setGBuffer(this.depth);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.ao);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.camera = camera;
    this.setSize(window.innerWidth, window.innerHeight, renderer.getPixelRatio());
  }

  // The camera can be swapped (e.g. by a scene that uses its own).
  setCamera(camera) {
    if (camera === this.camera) return;
    this.camera = camera;
    this.renderPass.camera = camera;
    this.ao.camera = camera;
  }

  setSize(width, height, pixelRatio) {
    const ratio = Math.min(pixelRatio, POST.maxPixelRatio);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(width, height);
    // The AO needs much less detail than the picture: compute it smaller.
    const k = ratio * POST.aoResolution;
    this.ao.setSize(Math.round(width * k), Math.round(height * k));
  }

  render() {
    this.composer.render();
  }
}
