// The world map (key M): everything you have explored, seen from above, in
// the land's own colours (lighter on high ground, blue water), with marks
// for villages, boss lairs, crypts and you. Scroll to zoom, drag to look
// around, hover to see the land's name and level. M or Esc closes it.
//
// The colours come straight from the world generator (same seed, same
// land), so the map needs nothing but the list of explored chunks.

import './styles/worldmap.css';
import { el } from './dom.js';
import { ptext } from './menuKit.js';
import { CHUNK } from '../data/world.js';
import { BLOCK_INFO } from '../data/blocks.js';
import { WORLD } from '../data/world.js';

const S = CHUNK.size;
const STEP = 4;            // one map dot per 4 x 4 blocks
const DOTS = S / STEP;     // dots across one chunk
const TILES_PER_FRAME = 30;

export class WorldMap {
  // generator: WorldGenerator. explored: Set of "cx,cz". markers(): { villages, lairs, dungeons }.
  constructor({ generator, explored, onClose, markers }) {
    Object.assign(this, { generator, explored, onClose, markers });
    this.tiles = new Map(); // "cx,cz" -> 8 x 8 canvas
    this.canvas = el('canvas', { class: 'wmap-canvas' });
    this.hoverLabel = el('div', { class: 'wmap-hover hidden' });
    this.root = el('div', { class: 'wmap hidden' },
      this.canvas, this.hoverLabel,
      el('div', { class: 'wmap-title' }, ptext('WORLD MAP', { scale: 3, color: '#ffe27a' })),
      el('div', { class: 'wmap-legend' },
        legend('#ffe27a', 'YOU'), legend('#faf3e2', 'VILLAGE'), legend('#d02a4a', 'BOSS LAIR'), legend('#9aa2b8', 'CRYPT'), legend('#6ad05a', 'CRYPT CLEARED')),
      el('div', { class: 'wmap-help' }, ptext('SCROLL TO ZOOM - DRAG TO MOVE - M OR ESC TO CLOSE', { scale: 1.5, color: '#d8dde8' })));
    document.body.appendChild(this.root);
    this.zoom = 1.5; // screen pixels per block
    this.center = { x: 0, z: 0 };
    this.bindMouse();
  }

  get visible() {
    return !this.root.classList.contains('hidden');
  }

  show(player) {
    this.player = player;
    this.center = { x: player.position.x, z: player.position.z };
    this.root.classList.remove('hidden');
    this.resize();
    this.loop();
  }

  hide() {
    this.root.classList.add('hidden');
    cancelAnimationFrame(this.frame);
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  bindMouse() {
    let drag = null;
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom = Math.min(8, Math.max(0.2, this.zoom * (e.deltaY > 0 ? 1 / 1.2 : 1.2)));
    }, { passive: false });
    this.canvas.addEventListener('mousedown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: this.center.x, cz: this.center.z }; });
    window.addEventListener('mouseup', () => { drag = null; });
    this.canvas.addEventListener('mousemove', (e) => {
      if (drag) {
        this.center.x = drag.cx - (e.clientX - drag.x) / this.zoom;
        this.center.z = drag.cz - (e.clientY - drag.y) / this.zoom;
      }
      this.mouse = { x: e.clientX, y: e.clientY };
    });
    this.canvas.addEventListener('mouseleave', () => { this.mouse = null; });
    window.addEventListener('resize', () => { if (this.visible) this.resize(); });
  }

  // World position -> screen position (north up: -z at the top).
  toScreen(x, z) {
    return { x: (x - this.center.x) * this.zoom + this.canvas.width / 2, y: (z - this.center.z) * this.zoom + this.canvas.height / 2 };
  }

  toWorld(sx, sy) {
    return { x: (sx - this.canvas.width / 2) / this.zoom + this.center.x, z: (sy - this.canvas.height / 2) / this.zoom + this.center.z };
  }

  loop() {
    this.draw();
    this.frame = requestAnimationFrame(() => this.loop());
  }

  draw() {
    const c = this.canvas.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#0d1426';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // The explored land, chunk by chunk (tiles are made a few per frame).
    let made = 0;
    const size = S * this.zoom;
    for (const key of this.explored) {
      const [cx, cz] = key.split(',').map(Number);
      const p = this.toScreen(cx * S, cz * S);
      if (p.x > this.canvas.width || p.y > this.canvas.height || p.x + size < 0 || p.y + size < 0) continue;
      let tile = this.tiles.get(key);
      if (!tile && made < TILES_PER_FRAME) {
        tile = this.makeTile(cx, cz);
        this.tiles.set(key, tile);
        made++;
      }
      if (tile) c.drawImage(tile, Math.floor(p.x), Math.floor(p.y), Math.ceil(size) + 1, Math.ceil(size) + 1);
    }

    // Marks.
    const m = this.markers();
    for (const v of m.villages) this.mark(c, v, '#faf3e2', 'house');
    for (const d of m.dungeons) this.mark(c, d, d.cleared ? '#6ad05a' : '#9aa2b8', 'square');
    for (const l of m.lairs) this.mark(c, l, '#d02a4a', 'diamond');
    this.drawPlayer(c);
    this.drawHover();
  }

  // Only places you have explored are marked.
  known(p) {
    return this.explored.has(`${Math.floor(p.x / S)},${Math.floor(p.z / S)}`);
  }

  mark(c, p, color, shape) {
    if (!this.known(p)) return;
    const s = this.toScreen(p.x, p.z);
    const r = Math.max(5, Math.min(12, 4 * this.zoom));
    c.fillStyle = color;
    c.strokeStyle = '#000';
    c.lineWidth = 2;
    c.beginPath();
    if (shape === 'diamond') {
      c.moveTo(s.x, s.y - r); c.lineTo(s.x + r, s.y); c.lineTo(s.x, s.y + r); c.lineTo(s.x - r, s.y);
    } else if (shape === 'house') {
      c.moveTo(s.x, s.y - r); c.lineTo(s.x + r, s.y - r * 0.2); c.lineTo(s.x + r * 0.75, s.y + r * 0.8);
      c.lineTo(s.x - r * 0.75, s.y + r * 0.8); c.lineTo(s.x - r, s.y - r * 0.2);
    } else c.rect(s.x - r * 0.8, s.y - r * 0.8, r * 1.6, r * 1.6);
    c.closePath();
    c.fill();
    c.stroke();
  }

  drawPlayer(c) {
    const p = this.player.position;
    const s = this.toScreen(p.x, p.z);
    const a = this.player.facing ?? 0;
    const r = 11;
    // An arrow pointing the way you face (+z faces down the map).
    const pt = (ang, len) => ({ x: s.x + Math.sin(ang) * len, y: s.y + Math.cos(ang) * len });
    const tip = pt(a, r);
    const left = pt(a + 2.5, r * 0.8);
    const right = pt(a - 2.5, r * 0.8);
    c.fillStyle = '#ffe27a';
    c.strokeStyle = '#000';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(tip.x, tip.y); c.lineTo(left.x, left.y); c.lineTo(s.x, s.y); c.lineTo(right.x, right.y);
    c.closePath();
    c.fill();
    c.stroke();
  }

  // The land's name and level under the mouse.
  drawHover() {
    const label = this.hoverLabel;
    if (!this.mouse) {
      label.classList.add('hidden');
      return;
    }
    const w = this.toWorld(this.mouse.x, this.mouse.y);
    if (!this.known(w)) {
      label.classList.add('hidden');
      return;
    }
    const biome = this.generator.regions.sample(w.x, w.z).biome;
    const text = `${biome.name.toUpperCase()}  LV ${biome.levels[0]}-${biome.levels[1]}`;
    if (label.dataset.text !== text) {
      label.dataset.text = text;
      label.replaceChildren(ptext(text, { scale: 1.5, color: '#ffffff' }));
    }
    label.classList.remove('hidden');
    label.style.transform = `translate(${this.mouse.x + 14}px, ${this.mouse.y + 14}px)`;
  }

  // One chunk as an 8 x 8 picture: the colour of the ground (or water) at
  // every 4th column, lighter on higher ground.
  makeTile(cx, cz) {
    const tile = document.createElement('canvas');
    tile.width = DOTS;
    tile.height = DOTS;
    const ctx = tile.getContext('2d');
    const img = ctx.createImageData(DOTS, DOTS);
    for (let j = 0; j < DOTS; j++) {
      for (let i = 0; i < DOTS; i++) {
        const col = this.generator.column(cx * S + i * STEP + 2, cz * S + j * STEP + 2);
        let rgb;
        if (col.waterTop >= 0) rgb = shade(0x2f8ef0, 0.9 + Math.max(-0.25, (col.top - WORLD.seaLevel) * 0.05));
        else rgb = shade(BLOCK_INFO[col.surface]?.color ?? 0x7ad832, 0.8 + Math.min(0.45, (col.top - WORLD.seaLevel) * 0.012));
        if (col.village) rgb = shade(0xd8c9a8, 1);
        const k = (j * DOTS + i) * 4;
        img.data[k] = rgb[0];
        img.data[k + 1] = rgb[1];
        img.data[k + 2] = rgb[2];
        img.data[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return tile;
  }
}

function shade(hex, f) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
}

function legend(color, name) {
  return el('div', { class: 'wmap-key' }, el('span', { class: 'wmap-swatch', style: { background: color } }), ptext(name, { scale: 1.5, color: '#d8dde8' }));
}
