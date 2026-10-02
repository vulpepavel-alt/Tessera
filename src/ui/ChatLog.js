// The small conversation log in the bottom-right corner. Keeps the last few
// lines; older lines fade out after a while.

import { el } from './dom.js';

const MAX_LINES = 7;
const FADE_AFTER = 20; // seconds

const NAME_COLORS = ['#7fe8f0', '#ffd27a', '#b48cff', '#8fe38f', '#ff9a8a', '#9fc3ff'];

export class ChatLog {
  constructor() {
    this.root = el('div', { class: 'chat-log' });
    document.body.appendChild(this.root);
  }

  setVisible(visible) {
    this.root.style.display = visible ? '' : 'none';
  }

  // name: who speaks (or null for a plain event line).
  add(name, text) {
    const color = name ? NAME_COLORS[hashName(name) % NAME_COLORS.length] : null;
    const line = el('div', { class: 'chat-line' },
      name ? el('span', { style: { color } }, `${name}: `) : null,
      text);
    this.root.append(line);
    while (this.root.children.length > MAX_LINES) this.root.firstChild.remove();
    setTimeout(() => line.classList.add('old'), FADE_AFTER * 1000);
  }
}

function hashName(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}
