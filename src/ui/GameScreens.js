// Full-screen overlays used while in the world: the loading screen and the
// pause menu (which also appears before you start, as "click to play").

import './styles/menu.css';
import './styles/screens.css';
import './styles/title.css';
import { el, replaceChildren } from './dom.js';
import { createSettingsPanel } from './SettingsPanel.js';
import { logo, ptext, pparagraph, pbutton } from './menuKit.js';

export const CONTROLS = [
  ['W A S D', 'Move'],
  ['Mouse', 'Look around'],
  ['Left click', 'Attack (hold for a 3-hit combo)'],
  ['Right click', 'Heavy attack'],
  ['1 / 2', 'Class skills'],
  ['R', 'Ultimate (charges as you deal damage)'],
  ['Q', 'Dodge roll (uses stamina)'],
  ['Space', 'Jump · in the air: open / close glider'],
  ['Shift', 'Sprint · swim fast (uses stamina)'],
  ['I', 'Inventory: put on and take off gear'],
  ['E', 'Talk to villagers'],
  ['B', 'Place / leave boat (next to water)'],
  ['C', 'Dive (while swimming)'],
  ['Scroll', 'Zoom the camera'],
  ['Esc', 'Pause'],
  ['F3', 'FPS and debug info'],
  ['F4', 'Debug: free-fly camera'],
  [']', 'Debug: skip one hour'],
];

// A few lines for new players, shown on the How to Play page.
const TIPS = [
  'You start with one weapon of your class. Better gear is found, earned and bought.',
  'Open the inventory (I) and click an item to put it on. Click worn gear to take it off.',
  'Roll (Q) out of the way when an enemy glows red: it is about to strike.',
  'Talk to villagers (E). The Guildmaster teaches your class specializations.',
  'Jump off high ground and press Space again to glide.',
];

// The How to Play page: tips, then every key. onBack() closes it.
export function howToPlayPanel(onBack) {
  return el('div', { class: 'pbox howto-panel' },
    ptext('HOW TO PLAY', { scale: 3, color: '#ffe27a' }),
    el('div', { class: 'howto-tips' }, TIPS.map((t) => pparagraph(`- ${t}`, { chars: 60, scale: 1.5 }))),
    el('div', { class: 'pause-controls' },
      CONTROLS.flatMap(([key, action]) => [ptext(key.toUpperCase(), { scale: 1.5, color: '#ffe27a' }), ptext(action.toUpperCase(), { scale: 1.5 })])),
    pbutton('BACK', onBack, { scale: 2, boxed: true }));
}

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
  // actions: { onResume, onInventory, onSaveAndQuit }
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

  // A short, plain list of choices; the controls live on the How to Play page.
  renderMain() {
    const ready = this.title === 'Ready';
    replaceChildren(this.root, el('div', { class: 'pbox pause-panel' },
      ptext(ready ? 'READY?' : 'PAUSED', { scale: 3 }),
      el('div', { class: 'pause-buttons' },
        pbutton(ready ? 'BEGIN' : 'RESUME', () => this.actions.onResume(), { scale: 2, boxed: true }),
        ready ? null : pbutton('INVENTORY', () => this.actions.onInventory(), { scale: 2, boxed: true }),
        pbutton('HOW TO PLAY', () => this.renderHowTo(), { scale: 2, boxed: true }),
        pbutton('SETTINGS', () => this.renderSettings(), { scale: 2, boxed: true }),
        pbutton('SAVE & QUIT', () => this.actions.onSaveAndQuit(), { scale: 2, boxed: true }))));
  }

  renderHowTo() {
    replaceChildren(this.root, howToPlayPanel(() => this.renderMain()));
  }

  renderSettings() {
    replaceChildren(this.root, createSettingsPanel(() => this.renderMain()));
  }
}
