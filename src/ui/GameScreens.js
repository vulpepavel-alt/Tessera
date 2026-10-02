// Full-screen overlays used while in the world: the loading screen and the
// pause menu (which also appears before you start, as "click to play").

import './styles/menu.css';
import './styles/screens.css';
import './styles/title.css';
import { el, replaceChildren } from './dom.js';
import { createSettingsPanel } from './SettingsPanel.js';
import { logo, ptext, pbutton } from './menuKit.js';

export const CONTROLS = [
  ['W A S D', 'Move'],
  ['Left click', 'Attack (hold for a 3-hit combo)'],
  ['Right click', 'Heavy attack'],
  ['1 / 2', 'Class skills'],
  ['R', 'Ultimate (charges as you deal damage)'],
  ['Tab', 'Lock on to an enemy'],
  ['E', 'Talk to villagers'],
  ['Mouse', 'Look around'],
  ['Scroll', 'Zoom the camera'],
  ['Space', 'Jump · in the air: open / close glider'],
  ['Shift', 'Sprint · swim fast (uses stamina)'],
  ['Q', 'Dodge roll (uses stamina)'],
  ['B', 'Place / leave boat (next to water)'],
  ['C', 'Dive (while swimming)'],
  ['Esc', 'Pause'],
  ['F3', 'FPS and debug info'],
  ['F4', 'Debug: free-fly camera'],
  [']', 'Debug: skip one hour'],
];

export class LoadingScreen {
  constructor() {
    this.fill = el('div');
    this.text = ptext('PREPARING THE WORLD...', { color: '#cfd8e8' });
    this.root = el('div', { class: 'screen bare loading-bg' },
      el('div', { class: 'loading-screen' },
        logo(true),
        ptext('CHARTING THE LAND', { scale: 3 }),
        el('div', { class: 'pbar' }, this.fill),
        this.text));
    document.body.appendChild(this.root);
  }

  setProgress(ratio, text) {
    this.fill.style.width = `${Math.round(ratio * 100)}%`;
    if (text) this.text.setText(text.toUpperCase());
  }

  remove() {
    this.root.remove();
  }
}

export class PauseMenu {
  // actions: { onResume, onSaveAndQuit }
  constructor(actions) {
    this.actions = actions;
    this.root = el('div', { class: 'screen dim hidden' });
    document.body.appendChild(this.root);
    this.title = 'Paused';
  }

  // first = true shows "Click to play" (before the adventure starts).
  show(first = false) {
    this.title = first ? 'Ready' : 'Paused';
    this.renderMain();
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
  }

  get visible() {
    return !this.root.classList.contains('hidden');
  }

  // Pixel style: pixel text, square boxes, blue panel with a yellow frame.
  renderMain() {
    const controls = el('div', { class: 'pause-controls' },
      CONTROLS.flatMap(([key, action]) => [ptext(key, { color: '#ffc83a' }), ptext(action, { color: '#e8eef8' })]));
    replaceChildren(this.root, el('div', { class: 'pbox pause-panel' },
      ptext(this.title, { scale: 4, color: '#ffc83a' }),
      el('div', { class: 'pause-buttons' },
        pbutton(this.title === 'Ready' ? 'BEGIN' : 'RESUME', () => this.actions.onResume(), { scale: 2, boxed: true }),
        pbutton('SETTINGS', () => this.renderSettings(), { scale: 2, boxed: true }),
        pbutton('SAVE & QUIT TO MENU', () => this.actions.onSaveAndQuit(), { scale: 2, boxed: true })),
      controls));
  }

  renderSettings() {
    replaceChildren(this.root, createSettingsPanel(() => this.renderMain()));
  }
}
