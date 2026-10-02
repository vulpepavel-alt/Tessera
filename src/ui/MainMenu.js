// The main menu and its screens: the title (big logo over the world),
// character creation (race, class, looks, seed and name on one screen),
// Continue, How to Play and Settings.
// Only one screen is visible at a time.

import './styles/menu.css';
import './styles/screens.css';
import './styles/title.css';
import './styles/stage.css';
import { el, replaceChildren } from './dom.js';
import { logo, pbutton } from './menuKit.js';
import { CharacterCreator } from './CharacterCreator.js';
import { createSettingsPanel } from './SettingsPanel.js';
import { howToPlayPanel } from './GameScreens.js';
import { SaveManager, formatPlayTime } from '../save/SaveManager.js';
import { CLASSES } from '../data/classes.js';

export class MainMenu {
  // stage: the MenuScene behind the menu. onPlay(slot): load a save slot.
  constructor({ stage, onPlay }) {
    this.stage = stage;
    this.onPlay = onPlay;
    this.root = el('div', { class: 'screen' });
    document.body.appendChild(this.root);

    this.creator = new CharacterCreator({
      stage,
      onBack: () => this.showMain(),
      onStart: (slot) => this.onPlay(slot),
    });
    this.showMain();
  }

  setScreen(content, { dim = false, mode = 'title', bare = false } = {}) {
    this.stage.setMode(mode);
    this.root.classList.toggle('dim', dim);
    this.root.classList.toggle('bare', bare);
    replaceChildren(this.root, content);
  }

  showMain() {
    const hasSave = SaveManager.hasAnySave();
    this.setScreen(el('div', { class: 'title-screen' },
      logo(),
      el('div', { class: 'title-buttons' },
        pbutton('START GAME', () => this.showCreator()),
        hasSave ? pbutton('CONTINUE', () => this.showContinue()) : null,
        pbutton('HOW TO PLAY', () => this.showHowTo()),
        pbutton('OPTIONS', () => this.showSettings())),
      el('div', { class: 'title-note' }, 'An original voxel adventure · work in progress')),
    { bare: true });
  }

  showCreator() {
    this.stage.spin = 0; // face the camera
    this.creator.render();
    this.setScreen(this.creator.root, { mode: 'stage', bare: true });
  }

  showHowTo() {
    this.setScreen(howToPlayPanel(() => this.showMain()), { dim: true });
  }

  showSettings() {
    this.setScreen(createSettingsPanel(() => this.showMain()), { dim: true });
  }

  showContinue() {
    const cards = SaveManager.list().map(({ slot, data }) => {
      if (!data) return el('div', { class: 'save-card empty' }, `Slot ${slot} · Empty`);
      const info = CLASSES[data.classId];
      const when = data.updatedAt ? new Date(data.updatedAt).toLocaleString() : '';
      const deleteBtn = el('button', { class: 'btn small danger' }, 'Delete');
      // Two-step delete: the first click asks, the second click deletes.
      deleteBtn.addEventListener('click', () => {
        if (deleteBtn.dataset.confirm) {
          SaveManager.remove(slot);
          if (SaveManager.hasAnySave()) this.showContinue();
          else this.showMain();
        } else {
          deleteBtn.dataset.confirm = '1';
          deleteBtn.textContent = 'Really delete?';
        }
      });
      return el('div', { class: 'save-card' },
        el('div', {},
          el('strong', {}, `${data.name} · Lv ${data.level} ${info.name}`),
          el('div', { class: 'meta' }, `Slot ${slot} · Seed "${data.seed}" · Played ${formatPlayTime(data.playTime)}`),
          el('div', { class: 'meta' }, when)),
        el('div', { class: 'row' },
          deleteBtn,
          el('button', { class: 'btn small primary', onclick: () => this.onPlay(slot) }, 'Play')));
    });
    this.setScreen(el('div', { class: 'panel' },
      el('h2', {}, 'Continue'),
      el('div', { class: 'save-list' }, cards),
      el('div', { class: 'row end' }, el('button', { class: 'btn', onclick: () => this.showMain() }, 'Back'))),
    { dim: true });
  }
}
