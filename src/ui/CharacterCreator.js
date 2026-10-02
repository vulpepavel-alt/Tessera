// Character creation: your hero stands on the stone pedestal in the world
// (see game/MenuScene.js) while you change their look in the panel at the
// bottom left. Drag anywhere on the background to turn them around.
// "Next" leads to the class screen.

import { el, replaceChildren } from './dom.js';
import { ptext, pbutton, pbox, chooser, colourGrid, dragToTurn } from './menuKit.js';
import {
  STARTER_CLOTHES, SKIN_TONES, HAIR_COLORS, EYE_COLORS, EAR_TYPES, NAME_IDEAS,
  OUTFIT_COLORS, ACCENT_COLORS, PANTS_COLORS, BOOT_COLORS,
} from '../data/classes.js';
import { HAIR_STYLES } from '../models/humanoid/hair.js';
import { EYE_STYLES, MOUTH_STYLES, BROW_STYLES, FACIAL_HAIR } from '../models/humanoid/face.js';
import { OUTFIT_STYLES } from '../models/humanoid/body.js';

// Shape choices: [field, label, choices].
const SHAPES = [
  ['eyeStyle', 'EYES', Object.keys(EYE_STYLES)],
  ['brows', 'BROWS', BROW_STYLES],
  ['mouth', 'MOUTH', Object.keys(MOUTH_STYLES)],
  ['ears', 'EARS', EAR_TYPES],
  ['hairStyle', 'HAIRCUT', HAIR_STYLES],
  ['facialHair', 'BEARD', FACIAL_HAIR],
  ['outfitStyle', 'CLOTHES', OUTFIT_STYLES],
  ['blush', 'CHEEKS', [true, false], (v) => (v ? 'ROSY' : 'PLAIN')],
  ['freckles', 'FRECKLES', [false, true], (v) => (v ? 'YES' : 'NO')],
];

// Colour choices: [field, label, suggested colours shown above the full grid].
const COLOURS = [
  ['skinTone', 'SKIN', SKIN_TONES],
  ['hairColor', 'HAIR', HAIR_COLORS],
  ['eyeColor', 'EYES', EYE_COLORS],
  ['outfitColor', 'CLOTHES', OUTFIT_COLORS],
  ['accentColor', 'TRIM', ACCENT_COLORS],
  ['pantsColor', 'TROUSERS', PANTS_COLORS],
  ['bootsColor', 'BOOTS', BOOT_COLORS],
];

export class CharacterCreator {
  // stage: the MenuScene (pedestal). onBack(), onNext().
  constructor({ stage, onBack, onNext }) {
    this.stage = stage;
    this.classId = 'bulwark';
    this.name = randomItem(NAME_IDEAS);
    this.look = defaultLook();
    this.colourField = 'hairColor';

    this.nameInput = el('input', {
      type: 'text', class: 'pinput', maxlength: 16, value: this.name, 'aria-label': 'Character name',
      oninput: (e) => { this.name = e.target.value; },
    });
    this.panel = pbox('creator-panel');
    this.root = el('div', { class: 'stage-screen' },
      pbutton('BACK', onBack, { scale: 2, boxed: true }),
      el('div', { class: 'stage-title' }, ptext('CREATE YOUR HERO', { scale: 3 })),
      this.panel,
      el('div', { class: 'stage-bottom' },
        ptext('DRAG TO TURN', { scale: 2, color: '#cfd8e8' }),
        pbutton('NEXT', onNext, { scale: 3, boxed: true })));
    this.root.firstChild.classList.add('back');
    dragToTurn(this.root, stage);
  }

  // Called when the screen is shown (also after coming back from the class screen).
  render() {
    const shapeRows = SHAPES.map(([field, label, choices, format]) =>
      chooser(label, choices, this.look[field], (v) => this.set(field, v), format));
    const tabs = el('div', { class: 'colour-tabs' }, COLOURS.map(([field, label]) => el('button', {
      class: `tab${field === this.colourField ? ' selected' : ''}`,
      'aria-label': `${label} colour`,
      onclick: () => { this.colourField = field; this.render(); },
    }, ptext(label))));
    const [, , suggested] = COLOURS.find(([f]) => f === this.colourField);

    replaceChildren(this.panel,
      el('div', { class: 'chooser' }, ptext('NAME'), this.nameInput,
        el('button', { class: 'pbutton mini', onclick: () => this.randomName(), 'aria-label': 'Random name' }, ptext('?'))),
      shapeRows,
      el('div', { class: 'panel-sub' }, ptext('COLOUR')),
      tabs,
      colourGrid(this.look[this.colourField], (c) => this.set(this.colourField, c), suggested),
      el('div', { class: 'panel-actions' }, pbutton('RANDOM LOOK', () => this.randomLook(), { scale: 2, boxed: true })));
    this.stage.setCharacter(this.classId, this.look);
  }

  set(field, value) {
    this.look[field] = value;
    this.render();
  }

  // The class screen changes the class. It never changes the look: every
  // class starts in the same plain clothes, with nothing equipped.
  setClass(classId) {
    this.classId = classId;
  }

  randomName() {
    this.name = randomItem(NAME_IDEAS);
    this.nameInput.value = this.name;
  }

  randomLook() {
    for (const [field, , choices] of SHAPES) this.look[field] = randomItem(choices);
    for (const [field, , suggested] of COLOURS) this.look[field] = randomItem(suggested);
    if (Math.random() < 0.7) this.look.facialHair = 'none';
    this.render();
  }

  finalName() {
    return this.name.trim() || randomItem(NAME_IDEAS);
  }
}

function defaultLook() {
  return {
    skinTone: SKIN_TONES[1], eyeStyle: 'round', eyeColor: EYE_COLORS[0], brows: 'thin', mouth: 'smile',
    ears: 'round', blush: true, freckles: false,
    hairStyle: 'spiky', hairColor: HAIR_COLORS[3], facialHair: 'none',
    outfitStyle: 'tunic', ...STARTER_CLOTHES,
  };
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}
