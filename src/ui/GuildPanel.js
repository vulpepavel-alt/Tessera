// The Guild Hall window: shows your class's two specializations with all
// their skills, and lets you learn (or switch to) one.

import './styles/menu.css';
import './styles/screens.css';
import { el, replaceChildren } from './dom.js';
import { iconCanvas } from './icons.js';
import { SPEC_SKILLS, GUILD } from '../data/skills.js';

export class GuildPanel {
  // onChoose(specId), onClose()
  constructor({ onChoose, onClose }) {
    this.onChoose = onChoose;
    this.onClose = onClose;
    this.root = el('div', { class: 'screen dim hidden' });
    document.body.appendChild(this.root);
  }

  get visible() {
    return !this.root.classList.contains('hidden');
  }

  show(player, guildmasterName) {
    const cards = player.classInfo.specs.map((spec) => {
      const skills = SPEC_SKILLS[spec.id];
      const current = player.spec === spec.id;
      return el('div', { class: `spec-card${current ? ' current' : ''}` },
        el('h3', {}, spec.name),
        el('p', { class: 'spec-desc' }, spec.description),
        ...['s1', 's2', 'ult'].map((slot) => {
          const s = skills[slot];
          const key = slot === 's1' ? '1' : slot === 's2' ? '2' : 'R';
          return el('div', { class: 'spec-skill' },
            iconCanvas(s.icon, 4),
            el('div', {},
              el('strong', {}, `${key} · ${s.name}`),
              el('div', { class: 'spec-skill-desc' }, s.description),
              el('div', { class: 'spec-skill-meta' }, `${s.stamina ? `${s.stamina} stamina · ` : ''}${s.cooldown}s cooldown`)));
        }),
        el('button', {
          class: `btn ${current ? '' : 'primary'}`, disabled: current,
          onclick: () => this.onChoose(spec.id),
        }, current ? 'Your current path' : `Learn ${spec.name}${GUILD.switchCost ? ` (${GUILD.switchCost} gold)` : ''}`));
    });
    replaceChildren(this.root, el('div', { class: 'panel guild' },
      el('h2', {}, `${player.classInfo.name} Guild`),
      el('p', { class: 'footer-note' }, `${guildmasterName}, Guildmaster: "Choose your path. You may change it whenever you visit."`),
      el('div', { class: 'spec-row' }, cards),
      el('div', { class: 'row end' }, el('button', { class: 'btn', onclick: () => this.onClose() }, 'Leave'))));
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
  }
}
