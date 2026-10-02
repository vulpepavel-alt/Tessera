// The meadow grass palette. Instead of one lime green everywhere, every grass
// cube picks one of six greens from:
//   - moisture  (a slow, wide noise: damp hollows are deeper green)
//   - height    (higher ground turns olive / yellow-green)
//   - slope     (the side faces of steps are darker)
//   - local noise per cube (small patches, so it never looks smooth)
// The same maths runs in the shader (GLSL, for the ground) and in JavaScript
// (for grass tufts standing on it), so plants match the ground under them.

export const GRASS_SHADES = [
  0x48c41c, // deep lime
  0x58d01e, // mid lime
  0x68da20, // bright lime
  0x78e222, // light lime
  0x8ce626, // yellow-lime
  0x76c824, // olive-lime
];

const LOW = 23;   // around this height the grass is at its greenest
const SPAN = 26;  // height range over which it turns olive

// --- GLSL version ---------------------------------------------------------
export const GRASS_GLSL = `
  uniform vec3 grassShades[6];
  float gHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float gNoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), f.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  vec3 grassShade(vec3 cell) {
    float moist = gNoise(cell.xz / 38.0);
    float spot = gNoise(cell.xz / 7.0 + 13.0);
    float high = clamp((cell.y - ${LOW.toFixed(1)}) / ${SPAN.toFixed(1)}, 0.0, 1.0);
    float t = 0.1 + (1.0 - moist) * 0.5 + spot * 0.15 + high * 0.5 + (gHash(cell.xz) - 0.5) * 0.12;
    float k = clamp(t * 4.0, 0.0, 5.0);
    int i = int(floor(k + 0.5));
    return grassShades[i];
  }
`;

// --- JavaScript version (same maths) -----------------------------------------
const fract = (v) => v - Math.floor(v);
const hash = (x, z) => fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453);
function noise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  let fx = x - ix;
  let fz = z - iz;
  fx = fx * fx * (3 - 2 * fx);
  fz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz) + (hash(ix + 1, iz) - hash(ix, iz)) * fx;
  const b = hash(ix, iz + 1) + (hash(ix + 1, iz + 1) - hash(ix, iz + 1)) * fx;
  return a + (b - a) * fz;
}

// Which of the six shades the grass cube at (x, y, z) has (y = the cube's height).
export function grassShadeIndex(x, y, z) {
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  const moist = noise(cx / 38, cz / 38);
  const patch = noise(cx / 7 + 13, cz / 7 + 13);
  const high = Math.min(1, Math.max(0, (y - LOW) / SPAN));
  const t = 0.1 + (1 - moist) * 0.5 + patch * 0.15 + high * 0.5 + (hash(cx, cz) - 0.5) * 0.12;
  return Math.min(5, Math.max(0, Math.round(t * 4)));
}
