// Character creation (spec section 13): your hero stands on the stone
// pedestal in the world (game/MenuScene.js) while you change their look in
// the panel at the bottom left, one tab at a time:
//   BODY      race, body frame, skin tone
//   FACE      face preset, eye colour, marks (freckles, scars, paint...)
//   HAIR      hairstyle, hair colour, facial hair
//   CLOTHES   the neutral starting underlayer and its two dye colours
//   IDENTITY  name and pronouns
// Drag the background to turn the hero, scroll to zoom from full body to face.
// Every option comes from data files (data/appearance.js, data/races.js).
// No armour or weapons here: everyone starts unequipped.

import { el, replaceChildren } from './dom.js';
import { ptext, pparagraph, pbutton, pbox, chooser, dragToTurn } from './menuKit.js';
import { NAME_IDEAS } from '../data/classes.js';
import { RACES, RACE_ORDER } from '../data/races.js';
import { FRAMES } from '../data/characterSpec.js';
import {
  SKIN, HAIR_PALETTES, EYE_PALETTE, FACE_PRESETS, HAIR_STYLES, FACIAL_HAIR, OVERLAYS,
  UNDERLAYERS, CLOTH_DYES, DEFAULT_APPEARANCE,
} from '../data/appearance.js';
import { mulberry32 } from '../world/random.js';

const TABS = ['BODY', 'FACE', 'HAIR', 'CLOTHES', 'IDENTITY'];
const PRONOUNS = ['they/them', 'she/her', 'he/him', 'she/they', 'he/they'];
const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
const words = (id) => id.replace(/_/g, ' ');

export class CharacterCreator {
  // stage: the MenuScene (pedestal). onBack(), onNext().
  constructor({ stage, onBack, onNext }) {
    this.stage = stage;
    this.classId = 'bulwark';
    this.name = pickFrom(NAME_IDEAS, Math.random);
    this.look = fresh();
    this.tab = 'BODY';
    this.seed = 1;

    this.nameInput = el('input', {
      type: 'text', class: 'pinput', maxlength: 16, value: this.name, 'aria-label': 'Character name',
      oninput: (e) => { this.name = e.target.value; },
    });
    this.panel = pbox('creator-panel');
    const back = pbutton('BACK', onBack, { scale: 2, boxed: true });
    back.classList.add('back');
    this.root = el('div', { class: 'stage-screen' },
      back,
      el('div', { class: 'stage-title' }, ptext('CREATE YOUR HERO', { scale: 3 })),
      this.panel,
      el('div', { class: 'stage-bottom' },
        ptext('DRAG TO TURN - SCROLL TO ZOOM', { scale: 2, color: '#cfd8e8' }),
        pbutton('NEXT', onNext, { scale: 3, boxed: true })));
    dragToTurn(this.root, stage);
    this.root.addEventListener('wheel', (e) => {
      e.preventDefault();
      stage.zoom?.(e.deltaY > 0 ? -0.12 : 0.12);
    }, { passive: false });
  }

  // Called when the screen is shown (also after coming back from the class screen).
  render() {
    const a = this.look;
    const race = RACES[a.race];
    const tabs = el('div', { class: 'colour-tabs' }, TABS.map((t) => el('button', {
      class: `tab${t === this.tab ? ' selected' : ''}`, 'aria-label': `${t} tab`,
      onclick: () => { this.tab = t; this.render(); },
    }, ptext(t))));

    let rows = [];
    if (this.tab === 'BODY') {
      rows = [
        chooser('RACE', RACE_ORDER, a.race, (v) => this.setRace(v), (v) => RACES[v].name),
        pparagraph(race.description, { chars: 27, color: '#cfd8e8' }),
        chooser('FRAME', Object.keys(FRAMES), a.frame, (v) => this.set('frame', v), (v) => FRAMES[v].label),
        chooser('SKIN', race.skins, a.skin, (v) => this.set('skin', v), (v) => SKIN[v].displayName),
        swatches(race.skins.map((id) => [id, SKIN[id].base, SKIN[id].displayName]), a.skin, (v) => this.set('skin', v)),
      ];
    } else if (this.tab === 'FACE') {
      rows = [
        chooser('FACE', Object.keys(FACE_PRESETS), a.face, (v) => this.set('face', v), (v) => words(v)),
        el('div', { class: 'panel-sub' }, ptext('EYE COLOUR')),
        swatches(EYE_PALETTE.map((c, i) => [c, c, `Eye colour ${i + 1}`]), a.eyeColor, (v) => this.set('eyeColor', v)),
        el('div', { class: 'panel-sub' }, ptext('MARKS')),
        el('div', { class: 'chips-grid' }, OVERLAYS.map((o) => el('button', {
          class: `tab${a.overlays.includes(o) ? ' selected' : ''}`, 'aria-label': words(o),
          onclick: () => this.toggleOverlay(o),
        }, ptext(words(o))))),
      ];
    } else if (this.tab === 'HAIR') {
      rows = race.hair ? [
        chooser('STYLE', HAIR_STYLES, a.hairStyle, (v) => this.set('hairStyle', v), (v) => words(v)),
        chooser('BEARD', FACIAL_HAIR, a.facialHair, (v) => this.set('facialHair', v), (v) => words(v)),
        el('div', { class: 'panel-sub' }, ptext('HAIR COLOUR')),
        swatches(HAIR_PALETTES.map((p) => [p.id, p.base, p.displayName]), a.hairColor, (v) => this.set('hairColor', v)),
      ] : [ptext(`${race.name.toUpperCase()} GROW NO HAIR`, { color: '#cfd8e8' })];
    } else if (this.tab === 'CLOTHES') {
      rows = [
        chooser('STYLE', UNDERLAYERS, a.underlayer, (v) => this.set('underlayer', v), (v) => ({ tunic: 'TUNIC', shirt: 'SHIRT', undertunic: 'UNDERTUNIC' }[v])),
        el('div', { class: 'panel-sub' }, ptext('TOP')),
        swatches(CLOTH_DYES.map((c, i) => [c, c, `Dye ${i + 1}`]), a.underColor, (v) => this.set('underColor', v)),
        el('div', { class: 'panel-sub' }, ptext('BOTTOM')),
        swatches(CLOTH_DYES.map((c, i) => [c, c, `Dye ${i + 1}`]), a.underColor2, (v) => this.set('underColor2', v)),
      ];
    } else {
      rows = [
        el('div', { class: 'chooser' }, ptext('NAME'), this.nameInput,
          el('button', { class: 'pbutton mini', onclick: () => this.randomName(), 'aria-label': 'Random name' }, ptext('?'))),
        chooser('PRONOUNS', PRONOUNS, a.pronouns, (v) => this.set('pronouns', v), (v) => v),
      ];
    }

    replaceChildren(this.panel, tabs, rows,
      el('div', { class: 'panel-actions' },
        pbutton('RANDOM', () => this.randomLook(), { scale: 2, boxed: true }),
        pbutton('RESET TAB', () => this.resetTab(), { scale: 2, boxed: true })));
    this.stage.setCharacter(this.classId, this.look);
  }

  set(field, value) {
    this.look[field] = value;
    this.render();
  }

  // A new race keeps every choice it can; the skin moves into the race's range.
  setRace(id) {
    const race = RACES[id];
    this.look.race = id;
    if (!race.skins.includes(this.look.skin)) this.look.skin = race.skins[0];
    this.look.frame = race.frame ?? 'straight';
    if (race.facialHair) this.look.facialHair = race.facialHair;
    this.render();
  }

  toggleOverlay(o) {
    const list = this.look.overlays;
    this.look.overlays = list.includes(o) ? list.filter((x) => x !== o) : [...list, o];
    this.render();
  }

  // The class screen changes the class. It never changes the look.
  setClass(classId) {
    this.classId = classId;
  }

  randomName() {
    this.name = pickFrom(NAME_IDEAS, Math.random);
    this.nameInput.value = this.name;
  }

  // Reproducible random looks: each press uses the next seed.
  randomLook() {
    const rng = mulberry32(this.seed++ * 7919);
    const race = RACES[pickFrom(RACE_ORDER, rng)];
    const raceId = RACE_ORDER.find((id) => RACES[id] === race);
    Object.assign(this.look, {
      race: raceId,
      frame: race.frame ?? pickFrom(Object.keys(FRAMES), rng),
      skin: pickFrom(race.skins, rng),
      face: pickFrom(Object.keys(FACE_PRESETS), rng),
      eyeColor: pickFrom(EYE_PALETTE, rng),
      hairStyle: pickFrom(HAIR_STYLES, rng),
      hairColor: pickFrom(HAIR_PALETTES, rng).id,
      facialHair: race.facialHair ?? (rng() < 0.25 ? pickFrom(FACIAL_HAIR, rng) : 'none'),
      overlays: OVERLAYS.filter(() => rng() < 0.12),
      underlayer: pickFrom(UNDERLAYERS, rng),
      underColor: pickFrom(CLOTH_DYES, rng),
      underColor2: pickFrom(CLOTH_DYES, rng),
    });
    this.render();
  }

  resetTab() {
    const d = fresh();
    const fields = {
      BODY: ['race', 'frame', 'skin'], FACE: ['face', 'eyeColor', 'overlays'],
      HAIR: ['hairStyle', 'hairColor', 'facialHair'], CLOTHES: ['underlayer', 'underColor', 'underColor2'], IDENTITY: ['pronouns'],
    }[this.tab];
    for (const f of fields) this.look[f] = d[f];
    if (this.tab === 'BODY' && !RACES[this.look.race].skins.includes(this.look.skin)) this.look.skin = RACES[this.look.race].skins[0];
    this.render();
  }

  finalName() {
    return this.name.trim() || pickFrom(NAME_IDEAS, Math.random);
  }
}

// A row of colour squares. options: [[value, colour, accessible name]].
function swatches(options, value, onPick) {
  return el('div', { class: 'grid-row suggested' }, options.map(([v, colour, label]) => el('button', {
    class: `cell${v === value ? ' selected' : ''}`, style: { background: hex(colour) }, 'aria-label': label, title: label,
    onclick: () => onPick(v),
  })));
}

function fresh() {
  return { ...DEFAULT_APPEARANCE, overlays: [...DEFAULT_APPEARANCE.overlays] };
}

function pickFrom(list, rng) {
  return list[Math.floor(rng() * list.length)];
}
