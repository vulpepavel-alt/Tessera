// The class screen: same world background and pedestal as character
// creation. The classes are listed on the left; on the right, text explains
// what the chosen one does. Below: the save slot and the world seed, then
// "Start Adventure".

import { el, replaceChildren } from './dom.js';
import { ptext, pparagraph, pbutton, pbox, chooser, dragToTurn } from './menuKit.js';
import { CLASSES, CLASS_ORDER, CLASS_GEAR_TEXT } from '../data/classes.js';
import { SaveManager } from '../save/SaveManager.js';

export class ClassScreen {
  // stage: the MenuScene. creator: the CharacterCreator (name + look).
  // onBack(), onStart(slot).
  constructor({ stage, creator, onBack, onStart }) {
    this.stage = stage;
    this.creator = creator;
    this.onStart = onStart;
    this.slot = firstEmptySlot();
    this.seed = randomSeed();

    this.list = pbox('class-list');
    this.info = pbox('class-detail');
    this.world = pbox('world-panel');
    this.seedInput = el('input', {
      type: 'text', class: 'pinput', maxlength: 24, value: this.seed, 'aria-label': 'World seed',
      oninput: (e) => { this.seed = e.target.value; },
    });
    const back = pbutton('BACK', onBack, { scale: 2, boxed: true });
    back.classList.add('back');
    this.root = el('div', { class: 'stage-screen' },
      back,
      el('div', { class: 'stage-title' }, ptext('CHOOSE YOUR CLASS', { scale: 3 })),
      this.list, this.info, this.world,
      el('div', { class: 'stage-bottom' },
        pbutton('START ADVENTURE', () => this.start(), { scale: 3, boxed: true })));
    dragToTurn(this.root, stage);
  }

  render() {
    const current = this.creator.classId;
    replaceChildren(this.list, CLASS_ORDER.map((id) => el('button', {
      class: `class-option${id === current ? ' selected' : ''}`,
      'aria-label': CLASSES[id].name,
      onclick: () => this.pick(id),
    },
    ptext(CLASSES[id].name, { scale: 3, color: id === current ? '#ffd24a' : '#ffffff' }),
    ptext(CLASSES[id].role, { scale: 2, color: '#9fb6d8' }))));

    const c = CLASSES[current];
    replaceChildren(this.info,
      ptext(c.name, { scale: 4, color: '#ffd24a' }),
      ptext(c.role, { color: '#9fb6d8' }),
      pparagraph(c.description, { chars: 34 }),
      el('div', { class: 'stat-line' },
        ptext(`HEALTH ${c.health}`, { color: '#ff7a6a' }),
        ptext(`${c.resource.name} ${c.resource.max}`, { color: c.resource.color })),
      el('div', { class: 'panel-sub' }, ptext('SPECIALIZATIONS', { color: '#7fe8f0' })),
      c.specs.map((s) => el('div', { class: 'spec-text' },
        ptext(s.name, { color: '#ffe9a8' }),
        pparagraph(s.description, { chars: 34, color: '#cfd8e8' }))),
      el('div', { class: 'panel-sub' }, ptext('CAN USE', { color: '#7fe8f0' })),
      pparagraph(CLASS_GEAR_TEXT[current].weapons, { chars: 34, color: '#cfd8e8' }),
      pparagraph(`Armour: ${CLASS_GEAR_TEXT[current].armour}`, { chars: 34, color: '#cfd8e8' }),
      el('div', { class: 'panel-sub' }, ptext('YOU START WITH', { color: '#7fe8f0' })),
      pparagraph('Plain clothes and bare fists, like every class. Weapons and armour are found, earned and bought on your journey.',
        { chars: 34, color: '#cfd8e8' }));

    const slots = SaveManager.list();
    const taken = slots[this.slot - 1].data;
    replaceChildren(this.world,
      chooser('SLOT', slots.map((s) => s.slot), this.slot, (v) => { this.slot = v; this.render(); },
        (v) => { const d = slots[v - 1].data; return d ? `${v} ${d.name}` : `${v} EMPTY`; }),
      taken ? ptext(`THIS WILL ERASE ${taken.name}`, { color: '#ff9a6a' }) : null,
      el('div', { class: 'chooser' }, ptext('SEED'), this.seedInput,
        el('button', { class: 'pbutton mini', onclick: () => this.randomSeed(), 'aria-label': 'Random seed' }, ptext('?'))));
    this.stage.setCharacter(current, this.creator.look);
  }

  pick(id) {
    this.creator.setClass(id);
    this.render();
  }

  randomSeed() {
    this.seed = randomSeed();
    this.seedInput.value = this.seed;
  }

  start() {
    const seed = this.seed.trim() || randomSeed();
    SaveManager.create(this.slot, {
      name: this.creator.finalName(), classId: this.creator.classId, seed,
      appearance: { ...this.creator.look, overlays: [...this.creator.look.overlays] }, // kept apart from class data
    });
    this.onStart(this.slot);
  }
}

function firstEmptySlot() {
  return SaveManager.list().find((s) => !s.data)?.slot ?? 1;
}

function randomSeed() {
  return Math.random().toString(36).slice(2, 8);
}
