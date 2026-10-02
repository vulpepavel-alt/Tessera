// The TESSERA logo, built from real voxel cubes: chunky golden-yellow letters
// with a deep royal-blue body underneath and little blue cubes studding their
// corners. It is rendered once with Three.js into a picture (a data URL) that
// every screen reuses.

import * as THREE from 'three';
import { VoxelGrid } from '../models/VoxelGrid.js';

// Letters on a 6-7 x 9 grid ('#' = filled), strokes two cells thick.
const GLYPHS = {
  T: ['#######', '#######', '..###..', '..###..', '..###..', '..###..', '..###..', '..###..', '..###..'],
  E: ['######', '######', '##....', '#####.', '#####.', '##....', '##....', '######', '######'],
  S: ['.#####', '######', '##....', '#####.', '.#####', '....##', '....##', '######', '#####.'],
  R: ['#####.', '######', '##..##', '##..##', '#####.', '####..', '##.##.', '##..##', '##..##'],
  A: ['.####.', '######', '##..##', '##..##', '######', '######', '##..##', '##..##', '##..##'],
};

const CELL = 3;      // every letter cell is 3 x 3 small cubes
const DEPTH = 9;     // how deep the letters are (in small cubes)
const YELLOWS = [0xffc21e, 0xffca30, 0xfcbb18, 0xffcf3c];
const BLUES = [0x2456d8, 0x1f4cc4, 0x2a62e6];
const STUD = 0x2f6cf0;

let cached = null;

// Returns a data URL of the logo (rendered on first use).
export function logoImage() {
  cached ??= render('TESSERA');
  return cached;
}

function render(text) {
  const letters = [...text].map((ch) => GLYPHS[ch]);
  const gap = 1;
  const widthCells = letters.reduce((w, g) => w + g[0].length + gap, -gap) + 2;
  const grid = new VoxelGrid(widthCells * CELL + 2, 9 * CELL + 4, DEPTH + 3);
  let x0 = 1;
  let n = 0;
  for (const glyph of letters) {
    drawLetter(grid, glyph, x0 * CELL + 1, n++);
    x0 += glyph[0].length + gap;
  }

  const scene = new THREE.Scene();
  const geometry = grid.toGeometry(1, [grid.sizeX / 2, grid.sizeY / 2, DEPTH]);
  shadeFaces(geometry);
  // No lights: every face keeps its exact colour, so the yellow stays bright.
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true }));
  scene.add(mesh);

  const W = 1400;
  const H = 420;
  const camera = new THREE.PerspectiveCamera(16, W / H, 1, 1000);
  camera.position.set(10, -64, 190); // from below and a little to the side: the blue body shows
  camera.lookAt(0, -5, 0);
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false);
  renderer.render(scene, camera);
  const url = canvas.toDataURL('image/png');
  renderer.dispose();
  renderer.forceContextLoss();
  mesh.geometry.dispose();
  return url;
}

// Fixed brightness per face direction: the front at full colour, the top a
// touch darker, the sides and the underside darker still (reads as solid cubes).
function shadeFaces(geometry) {
  const n = geometry.getAttribute('normal');
  const c = geometry.getAttribute('color');
  for (let i = 0; i < n.count; i++) {
    const [x, y, z] = [n.getX(i), n.getY(i), n.getZ(i)];
    const k = z > 0.5 ? 1 : y > 0.5 ? 0.9 : y < -0.5 ? 0.55 : x !== 0 ? 0.72 : 0.5;
    c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k);
  }
}

// One letter: the yellow face on top, the blue body behind it, studs on corners.
function drawLetter(grid, glyph, gx, seed) {
  const rows = glyph.length;
  const filled = (cx, cy) => glyph[cy]?.[cx] === '#';
  let k = seed * 7;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < glyph[cy].length; cx++) {
      if (!filled(cx, cy)) continue;
      const y0 = (rows - 1 - cy) * CELL + 2;
      k = (k * 31 + 17) % 97; // one shade per letter cell: calm, big squares
      for (let dx = 0; dx < CELL; dx++) {
        for (let dy = 0; dy < CELL; dy++) {
          for (let z = 0; z < DEPTH; z++) {
            const front = z === DEPTH - 1;
            const color = front ? YELLOWS[k % YELLOWS.length] : BLUES[(k + z) % BLUES.length];
            grid.set(gx + cx * CELL + dx, y0 + dy, z, color);
          }
        }
      }
      // A blue stud on every outer corner of the letter shape.
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (filled(cx + sx, cy) || filled(cx, cy + sy)) continue;
        const px = gx + cx * CELL + (sx < 0 ? -1 : CELL - 2);
        const py = (rows - 1 - cy) * CELL + 2 + (sy < 0 ? CELL - 2 : -1);
        for (const [ox, oy] of [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]]) {
          for (let z = DEPTH - 3; z <= DEPTH + 1; z++) grid.set(px + ox, py + oy, z, z >= DEPTH ? STUD : BLUES[0]);
        }
      }
    }
  }
}
