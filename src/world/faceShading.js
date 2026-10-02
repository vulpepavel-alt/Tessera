// Face-based lighting: every side of a cube gets its own fixed brightness
// (top brightest, then the two side directions, the underside darkest), on top
// of the normal sun and sky light. This is what makes voxel shapes easy to
// read: neighbouring faces never melt into the same shade.
//
// Used by the world (voxelMaterials.js) and by every model (VoxelGrid.js), so
// characters and terrain are lit the same way.

export const FACE_LIGHT = { top: 1.0, sideX: 0.88, sideZ: 0.78, bottom: 0.6 };

// Shader snippets: add these with material.onBeforeCompile.
export const FACE_SHADE_VERTEX = {
  common: 'varying float vFaceShade;',
  // Uses the world-space direction of the face, so turning a model keeps the rule.
  main: `{
    vec3 wn = normalize(mat3(modelMatrix) * objectNormal);
    float up = wn.y > 0.0 ? ${FACE_LIGHT.top.toFixed(3)} : ${FACE_LIGHT.bottom.toFixed(3)};
    vFaceShade = up * abs(wn.y) + ${FACE_LIGHT.sideX.toFixed(3)} * abs(wn.x) + ${FACE_LIGHT.sideZ.toFixed(3)} * abs(wn.z);
  }`,
};

export const FACE_SHADE_FRAGMENT = {
  common: 'varying float vFaceShade;',
  color: 'diffuseColor.rgb *= vFaceShade;',
};

// For simple materials (models): just the face shading.
export function addFaceShading(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${FACE_SHADE_VERTEX.common}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${FACE_SHADE_VERTEX.main}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FACE_SHADE_FRAGMENT.common}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FACE_SHADE_FRAGMENT.color}`);
  };
  return material;
}
