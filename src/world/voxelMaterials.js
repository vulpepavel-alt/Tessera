// The "materials" (how surfaces react to light) used to draw chunks.
//
// The solid material gets a small extra: every voxel is made slightly lighter
// or darker based on its position. Greedy meshing merges many blocks into one
// rectangle, so this per-voxel variation has to happen on the graphics card
// (in the "shader", the tiny program that colours each pixel).

import * as THREE from 'three';
import { FACE_SHADE_VERTEX, FACE_SHADE_FRAGMENT } from './faceShading.js';
import { GRASS_SHADES, GRASS_GLSL } from './grassPalette.js';
import { BLOCK_INFO, BLOCK } from '../data/blocks.js';

// Grass palette colours and the block's own top/side colour (to swap one for the other).
const grassUniforms = {
  grassShades: { value: GRASS_SHADES.map((c) => new THREE.Color(c)) },
  grassTop: { value: new THREE.Color(BLOCK_INFO[BLOCK.GRASS].color) },
  grassSide: { value: new THREE.Color(BLOCK_INFO[BLOCK.GRASS].side) },
};

// Shared clock for wind effects; WorldView moves it forward every frame.
export const windTime = { value: 0 };

export function createVoxelMaterials() {
  const solid = new THREE.MeshLambertMaterial({ vertexColors: true });
  addVoxelVariation(solid);

  // Glowing blocks ignore light and shadow, so they look like they shine.
  const glow = new THREE.MeshBasicMaterial({ vertexColors: true });

  const liquid = new THREE.MeshLambertMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  addWaterWaves(liquid);

  return { solid, glow, liquid };
}

function addVoxelVariation(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.windTime = windTime;
    Object.assign(shader.uniforms, grassUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vVoxelPos;\nattribute float sway;\nattribute float tint;\nvarying float vTint;\nuniform float windTime;\n${FACE_SHADE_VERTEX.common}`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        // Step half a block inward from the face so we land inside "our" voxel.
        vec3 worldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vVoxelPos = worldPos - objectNormal * 0.5;
        // Leaves and crops sway in the wind, each spot slightly out of step.
        float gust = sin(windTime * 1.6 + worldPos.x * 0.35 + worldPos.z * 0.25) * 0.5
                   + sin(windTime * 2.7 + worldPos.z * 0.6) * 0.25;
        transformed.x += gust * 0.07 * sway;
        transformed.z += gust * 0.05 * sway;
        vTint = tint;
        ${FACE_SHADE_VERTEX.main}`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        ${FACE_SHADE_FRAGMENT.common}
        varying vec3 vVoxelPos;
        varying float vTint;
        uniform vec3 grassTop;
        uniform vec3 grassSide;
        ${GRASS_GLSL}
        float voxelHash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1) * 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // Meadow grass: swap the block colour for its palette shade (keeping the corner shading).
        if (vTint > 0.5) {
          vec3 shade = grassShade(floor(vVoxelPos + 0.001));
          diffuseColor.rgb *= vTint < 1.5 ? shade / grassTop : shade * 0.78 / grassSide;
        }
        ${FACE_SHADE_FRAGMENT.color}
        diffuseColor.rgb *= 0.92 + 0.16 * voxelHash(floor(vVoxelPos + 0.001));
        // A finer mosaic: each block face looks made of 2 x 2 smaller cubes.
        diffuseColor.rgb *= 0.965 + 0.07 * voxelHash(floor(vVoxelPos * 2.0 + 0.001) + 17.0);
        // A little extra colour saturation for the bright, cheerful look.
        float grey = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = max(mix(vec3(grey), diffuseColor.rgb, 1.06), 0.0);`
      );
  };
}

// Water: the surface bobs in gentle waves and shimmers with moving highlights.
function addWaterWaves(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.windTime = windTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float windTime;\nvarying vec3 vWaterPos;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
        if (objectNormal.y > 0.5) {
          transformed.y += (sin(windTime * 1.4 + wp.x * 0.7) + cos(windTime * 1.1 + wp.z * 0.6)) * 0.035 - 0.12;
        }
        vWaterPos = wp;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float windTime;\nvarying vec3 vWaterPos;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float glint = sin(vWaterPos.x * 1.7 + windTime * 1.3) * sin(vWaterPos.z * 1.3 - windTime);
        diffuseColor.rgb += smoothstep(0.55, 0.95, glint) * 0.18;`);
  };
}
