// The character reference sheet: every model side by side, so we can check
// they all look made by the same voxel art system. Open it with
//   http://localhost:5173/?lineup
//
// Rows: the base character from every side; each class growing from
// "start" (nothing equipped) to "legendary"; villagers; creatures.

import * as THREE from 'three';
import { buildCharacter } from '../models/characterModel.js';
import { buildVillager } from '../models/villagerModel.js';
import { buildCreature } from '../models/creatureModels.js';
import { CLASSES } from '../data/classes.js';
import { RACES, RACE_ORDER } from '../data/races.js';
import { DEFAULT_APPEARANCE } from '../data/appearance.js';
import { el } from '../ui/dom.js';
import { ptext, logo } from '../ui/menuKit.js';
import '../ui/styles/menu.css';
import '../ui/styles/title.css';

const LOOK = {
  skinTone: 0xf3d2b3, eyeStyle: 'round', eyeColor: 0x2f7fff, brows: 'thin', mouth: 'smile', ears: 'round',
  blush: true, hairStyle: 'spiky', hairColor: 0xf2d040, facialHair: 'none',
  outfitStyle: 'tunic', outfitColor: 0xe8dcc0, accentColor: 0x8a6a3a, pantsColor: 0x6e5a3a, bootsColor: 0x5a3e28,
};

// A full armour set of one material.
const set = (m) => ({ head: `${m}-head`, chest: `${m}-chest`, hands: `${m}-hands`, legs: `${m}-legs`, feet: `${m}-feet` });

// How each class looks as it finds better equipment.
export const PROGRESSION = {
  bulwark: [
    {},
    { mainHand: 'club', chest: 'cloth-chest', feet: 'leather-feet' },
    { ...set('chain'), head: 'leather-head', mainHand: 'iron-sword', offHand: 'wood-shield' },
    { ...set('steel'), mainHand: 'greatsword', back: 'travel-cape' },
    { ...set('sunforged'), mainHand: 'sunblade', offHand: 'sun-shield', back: 'royal-cape' },
  ],
  windstrider: [
    {},
    { mainHand: 'shortbow', chest: 'leather-chest', back: 'quiver' },
    { ...set('hunter'), mainHand: 'longbow', back: 'quiver' },
    { ...set('reinforced'), mainHand: 'crossbow', back: 'quiver' },
    { ...set('windrunner'), mainHand: 'galebow', back: 'quiver' },
  ],
  shade: [
    {},
    { mainHand: 'dagger', chest: 'cloth-chest', feet: 'cloth-feet' },
    { ...set('leather'), head: 'shadow-head', mainHand: 'dagger', offHand: 'parry-dagger' },
    { ...set('shadow'), mainHand: 'shortsword', offHand: 'off-shortsword' },
    { ...set('nightsilk'), mainHand: 'nightfang', offHand: 'off-shortsword', back: 'royal-cape' },
  ],
  starweaver: [
    {},
    { mainHand: 'wand', chest: 'cloth-chest' },
    { ...set('silk'), mainHand: 'staff', offHand: 'tome' },
    { ...set('arcane'), mainHand: 'crystal-staff', offHand: 'orb' },
    { ...set('starwoven'), mainHand: 'star-staff', offHand: 'orb', back: 'royal-cape' },
  ],
};
const STAGES = ['START', 'EARLY', 'MID', 'LATE', 'LEGENDARY'];
const COLUMN = 2.6;
const ROW = 3.3;

export class LineupScene {
  constructor(engine) {
    this.engine = engine;
    const scene = engine.scene;
    scene.background = new THREE.Color(0x1a2a5c);
    scene.add(new THREE.HemisphereLight(0xcfe2ff, 0x6c7896, 1.3));
    const sun = new THREE.DirectionalLight(0xffe6bc, 2.2);
    sun.position.set(3, 6, 8);
    scene.add(sun);

    this.labels = [];
    this.overlay = el('div', { class: 'lineup-labels' });
    document.body.append(this.overlay, el('div', { class: 'lineup-logo' }, logo(true)));
    this.items = [];

    let row = 0;
    // 1. The base character from every side (nothing equipped).
    const views = [['FRONT', 0], ['BACK', Math.PI], ['LEFT', -Math.PI / 2], ['RIGHT', Math.PI / 2], ['3/4 FRONT', 0.6], ['3/4 BACK', Math.PI - 0.6]];
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    // ?lineup&focus=human,frogfolk : only those races, from every side, for comparisons.
    const focus = new URLSearchParams(window.location.search).get('focus');
    if (focus) {
      focus.split(',').forEach((token, r) => {
        const [id, variant] = token.split(':'); // e.g. frogfolk:side
        const look = { ...DEFAULT_APPEARANCE, race: id, skin: RACES[id]?.skins[0], frame: RACES[id]?.frame ?? 'straight', facialHair: RACES[id]?.facialHair ?? 'none', raceVariant: variant };
        this.heading(`${RACES[id]?.name.toUpperCase() ?? id}${variant ? ` - ${variant.toUpperCase()}` : ''}`, r);
        views.forEach(([name, yaw], i) => this.place(buildCharacter('bulwark', look).root, i, r, yaw, name));
      });
      this.rows = focus.split(',').length;
      this.cols = 6;
      this.finishSetup();
      return;
    }
    this.heading('BASE CHARACTER - NOTHING EQUIPPED', row);
    views.forEach(([name, yaw], i) => this.place(buildCharacter('bulwark', LOOK).root, i, row, yaw, name));
    // 2. Each class, start to legendary.
    for (const classId of Object.keys(PROGRESSION)) {
      row++;
      this.heading(`${CLASSES[classId].name} - FROM START TO LEGENDARY`, row);
      PROGRESSION[classId].forEach((equipment, i) => {
        this.place(buildCharacter(classId, LOOK, { equipment }).root, i, row, 0.35, STAGES[i]);
      });
    }
    // 3. Villagers and creatures.
    // 3. Every race, in its first skin tone and the default look.
    row++;
    this.heading('RACES', row);
    RACE_ORDER.forEach((id, i) => {
      const look = { ...DEFAULT_APPEARANCE, race: id, skin: RACES[id].skins[0], frame: RACES[id].frame ?? 'straight', facialHair: RACES[id].facialHair ?? 'none', hairStyle: ['short_spikes', 'side_sweep', 'cropped_block', 'tall_crest', 'twin_tails', 'swept_back', 'bald', 'bald', 'layered_bob'][i] };
      this.place(buildCharacter('bulwark', look).root, i, row, 0.5, RACES[id].name.toUpperCase());
    });
    row++;
    this.heading('VILLAGERS AND CREATURES', row);
    const roles = [['villager', 0.11], ['villager', 0.52], ['guard', 0.3], ['merchant', 0.7], ['guildmaster', 0.9]];
    roles.forEach(([role, seed], i) => this.place(buildVillager(seed, role).root, i, row, 0.35, role.toUpperCase()));
    this.place(buildCreature('bramblehog').root, roles.length, row, 0.9, 'BRAMBLEHOG');
    this.rows = row + 1;
    this.finishSetup();
  }

  // Camera, labels and resizing (after the models are placed).
  finishSetup() {
    // Seen slightly from above, so tops of heads and shoulders show too.
    this.camera.rotation.x = -0.18;
    this.engine.camera = this.camera;
    this.engine.post = null; // a plain drawing: no screen effects on the reference sheet
    window.addEventListener('resize', () => this.fit());
    this.fit();
    this.engine.onUpdate(() => this.updateLabels());
  }

  place(object, column, row, yaw, label) {
    object.position.set(column * COLUMN, -row * ROW, 0);
    object.rotation.y = yaw;
    object.visible = true;
    this.engine.scene.add(object);
    this.labels.push({ text: ptext(label, { color: '#ffe9a8' }), at: new THREE.Vector3(column * COLUMN, -row * ROW - 0.3, 0) });
  }

  heading(text, row) {
    this.labels.push({ text: ptext(text, { color: '#7fe8f0', scale: 2 }), at: new THREE.Vector3(-0.9, -row * ROW + 2.2, 0), left: true });
  }

  // Fit all rows on screen (an "orthographic" camera: no perspective, like a drawing).
  fit() {
    const width = (this.cols ?? 9) * COLUMN; // the widest row (races: 9)
    const height = this.rows * ROW + 1.2;
    const aspect = window.innerWidth / window.innerHeight;
    const half = Math.max(height / 2, width / aspect / 2);
    Object.assign(this.camera, { top: half, bottom: -half, left: -half * aspect, right: half * aspect });
    this.camera.position.set(width / 2 - 1.3, -(this.rows - 1) * ROW / 2 + 0.6 + 5.4, 30);
    this.camera.updateProjectionMatrix();
    this.engine.renderer.setSize(window.innerWidth, window.innerHeight);
    for (const l of this.labels) this.overlay.append(l.text);
  }

  updateLabels() {
    const v = new THREE.Vector3();
    for (const l of this.labels) {
      v.copy(l.at).project(this.camera);
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
      l.text.style.transform = `translate(${l.left ? x : x - l.text.offsetWidth / 2}px, ${y}px)`;
    }
  }
}
