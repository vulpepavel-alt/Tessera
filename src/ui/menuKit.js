// Building blocks for the menus, all in the game's pixel style: the big
// TESSERA logo, pixel-text buttons, dark boxes with a light border,
// "◀ value ▶" choosers and the colour grid.

import { el } from './dom.js';
import { pixelLabel } from './pixelFont.js';
import { logoImage } from './voxelLogo.js';

// The big TESSERA logo: yellow voxel letters on a blue body (ui/voxelLogo.js).
export function logo(small = false) {
  return el('div', { class: `logo${small ? ' small' : ''}`, role: 'heading', 'aria-level': '1' },
    el('img', { class: 'logo-image', src: logoImage(), alt: 'TESSERA' }));
}

// A line of pixel text.
export function ptext(text, { scale = 2, color = '#ffffff' } = {}) {
  return pixelLabel(text, { scale, color });
}

// Text that wraps onto several pixel lines, about `chars` letters wide.
export function pparagraph(text, { chars = 40, scale = 2, color = '#e8eef8' } = {}) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    if (line && (line + ' ' + word).length > chars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return el('div', { class: 'pixel-paragraph' }, lines.map((l) => ptext(l, { scale, color })));
}

// A plain text button, like the title screen's "START GAME".
export function pbutton(text, onclick, { scale = 3, disabled = false, boxed = false } = {}) {
  return el('button', {
    class: `pbutton${boxed ? ' boxed' : ''}`, onclick, disabled, 'aria-label': text,
  }, ptext(text, { scale }));
}

// A dark box with a light border.
export function pbox(className, ...children) {
  return el('div', { class: `pbox ${className}` }, ...children);
}

// A "LABEL  ◀ value ▶" row. choices: list of values; format(value) gives the text.
export function chooser(label, choices, value, onPick, format = (v) => String(v)) {
  const i = Math.max(0, choices.indexOf(value));
  const go = (step) => onPick(choices[(i + step + choices.length) % choices.length]);
  return el('div', { class: 'chooser' },
    ptext(label),
    el('button', { class: 'arrow left', 'aria-label': `Previous ${label}`, onclick: () => go(-1) }),
    el('div', { class: 'chooser-value' }, ptext(format(choices[i]), { color: '#ffe9a8' })),
    el('button', { class: 'arrow right', 'aria-label': `Next ${label}`, onclick: () => go(1) }));
}

// Every colour you can pick: a rainbow grid (dark to light) plus greys.
export const PALETTE = (() => {
  const colours = [];
  const hues = 14;
  for (const [s, l] of [[0.75, 0.22], [0.8, 0.35], [0.85, 0.5], [0.8, 0.64], [0.75, 0.78]]) {
    for (let h = 0; h < hues; h++) colours.push(hsl(h / hues, s, l));
  }
  for (let k = 0; k < hues; k++) colours.push(hsl(0, 0, 0.06 + (k / (hues - 1)) * 0.9));
  return colours;
})();

// A grid of colour squares. `suggested` (optional) is shown first as its own row.
export function colourGrid(value, onPick, suggested = []) {
  const swatch = (c) => el('button', {
    class: `cell${c === value ? ' selected' : ''}`,
    style: { background: `#${c.toString(16).padStart(6, '0')}` },
    'aria-label': `Colour #${c.toString(16).padStart(6, '0')}`,
    onclick: () => onPick(c),
  });
  return el('div', { class: 'colour-grid' },
    suggested.length ? el('div', { class: 'grid-row suggested' }, suggested.map(swatch)) : null,
    el('div', { class: 'grid' }, PALETTE.map(swatch)));
}

// Drag on an element to turn the character on the pedestal.
export function dragToTurn(element, stage) {
  let last = null;
  element.addEventListener('pointerdown', (e) => {
    if (e.target !== element) return; // not when clicking buttons on top
    last = e.clientX;
    element.setPointerCapture(e.pointerId);
  });
  element.addEventListener('pointermove', (e) => {
    if (last === null) return;
    stage.turn((e.clientX - last) * 0.012);
    last = e.clientX;
  });
  const stop = () => { last = null; };
  element.addEventListener('pointerup', stop);
  element.addEventListener('pointercancel', stop);
}

function hsl(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}
