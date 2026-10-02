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
import { loadReference } from './referenceModel.js';
import { placeHeld, heldGrid } from '../models/equipment/weapons.js';
import { attach } from '../models/humanoid.js';
import { ITEMS } from '../data/items.js';
import { WEAPON_KINDS } from '../data/weaponCatalog.js';
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
    { ...set('chain'), head: 'leather-head', face: 'goggles', waist: 'leather-belt', mainHand: 'iron-sword', offHand: 'wood-shield' },
    { ...set('steel'), shoulders: 'steel-shoulders', waist: 'sword-belt', mainHand: 'greatsword', back: 'travel-cape' },
    { ...set('sunforged'), shoulders: 'sunforged-shoulders', waist: 'gold-sash', mainHand: 'sunblade', offHand: 'sun-shield', back: 'royal-cape' },
  ],
  windstrider: [
    {},
    { mainHand: 'shortbow', chest: 'leather-chest', back: 'quiver' },
    { ...set('hunter'), mainHand: 'longbow', back: 'quiver' },
    { ...set('reinforced'), shoulders: 'reinforced-shoulders', mainHand: 'crossbow', back: 'quiver' },
    { ...set('windrunner'), mainHand: 'galebow', back: 'quiver' },
  ],
  shade: [
    {},
    { mainHand: 'dagger', chest: 'cloth-chest', feet: 'cloth-feet' },
    { ...set('leather'), head: 'shadow-head', mainHand: 'dagger', offHand: 'parry-dagger' },
    { ...set('shadow'), face: 'scarf', mainHand: 'shortsword', offHand: 'off-shortsword' },
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
    const params = new URLSearchParams(window.location.search);
    const focus = params.get('focus');
    if (params.has('arsenal')) {
      this.buildArsenal();
      return;
    }
    if (params.has('creatures')) {
      this.buildCreatures(views);
      return;
    }
    if (params.has('weapons')) {
      this.buildWeapons();
      return;
    }
    if (focus || params.has('reference')) {
      this.buildFocus((focus ?? 'human').split(','), views, params.has('reference'));
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
    ['bramblehog', 'duskwolf', 'meadowSlime'].forEach((id, i) => this.place(buildCreature(id).root, roles.length + i, row, 0.9, id.toUpperCase()));
    this.rows = row + 1;
    this.finishSetup();
  }

  // ?lineup&focus=human,frogfolk:side : chosen races from every side.
  // With &reference, the dev-only reference model gets the first row.
  async buildFocus(tokens, views, withReference) {
    let r = 0;
    if (withReference) {
      const make = await loadReference();
      this.heading(make ? 'REFERENCE (DEV ONLY, NOT IN THE GAME)' : 'REFERENCE FILE MISSING (reference/)', r);
      if (make) views.forEach(([name, yaw], i) => this.place(make().root, i, r, yaw, name));
      r++;
    }
    tokens.forEach((token) => {
      const [id, variant] = token.split(':'); // e.g. frogfolk:side
      const look = { ...DEFAULT_APPEARANCE, race: id, skin: RACES[id]?.skins[0], frame: RACES[id]?.frame ?? 'straight', facialHair: RACES[id]?.facialHair ?? 'none', raceVariant: variant };
      this.heading(`${RACES[id]?.name.toUpperCase() ?? id}${variant ? ` - ${variant.toUpperCase()}` : ''}`, r);
      views.forEach(([name, yaw], i) => this.place(buildCharacter('bulwark', look).root, i, r, yaw, name));
      r++;
    });
    this.rows = r;
    this.cols = 6;
    this.finishSetup();
  }

  // ?lineup&arsenal : every weapon kind, its five iron shapes, then gold and obsidian.
  buildArsenal() {
    const kinds = Object.keys(WEAPON_KINDS);
    kinds.forEach((kind, r) => {
      this.heading(kind.toUpperCase(), r);
      const ids = [1, 2, 3, 4, 5].map((v) => `iron-${kind}-${v}`).concat([`gold-${kind}-1`, `obsidian-${kind}-1`]);
      ids.forEach((id, i) => {
        const grid = heldGrid(ITEMS[id]);
        const holder = new THREE.Group();
        attach(holder, grid, [grid.sizeX / 2, 0, grid.sizeZ / 2], [0, 0, 0]);
        holder.scale.setScalar(Math.min(1.6, 2.2 / (grid.sizeY * 0.0625))); // tall ones shrink to fit the row
        holder.children[0].rotation.y = 0.9;
        this.place(holder, i, r, 0, i < 5 ? `SHAPE ${i + 1}` : id.split('-')[0].toUpperCase());
      });
    });
    this.rows = kinds.length;
    this.cols = 7;
    this.finishSetup();
  }

  // ?lineup&creatures : every creature from every side, a person first for scale.
  buildCreatures(views) {
    const ids = ['bramblehog', 'duskwolf', 'meadowSlime'];
    ids.forEach((id, r) => {
      this.heading(`${id.toUpperCase()} (WITH A PERSON FOR SCALE)`, r);
      this.place(buildCharacter('bulwark', LOOK).root, 0, r, 0.5, 'PERSON');
      views.slice(0, 5).forEach(([name, yaw], i) => this.place(buildCreature(id).root, i + 1, r, yaw, name));
    });
    this.rows = ids.length;
    this.cols = 6;
    this.finishSetup();
  }

  // ?lineup&weapons : every class with its weapons, in the hands (drawn)
  // and put away (sheathed), from the sides that show how they sit.
  buildWeapons() {
    const SHOTS = {
      bulwark: [['sword', {}, 0, 1], ['sword', {}, Math.PI / 2, 1], ['iron-sword', { offHand: 'wood-shield' }, 0.6, 1],
        ['greatsword', {}, 0.6, 1], ['sword', {}, Math.PI - 0.5, 0], ['greatsword', { offHand: 'iron-shield' }, Math.PI - 0.5, 0]],
      windstrider: [['shortbow', { back: 'quiver' }, 0, 1], ['shortbow', { back: 'quiver' }, Math.PI / 2, 1], ['longbow', {}, 0.6, 1],
        ['crossbow', {}, 0.6, 1], ['shortbow', { back: 'quiver' }, Math.PI - 0.5, 0], ['longbow', { back: 'quiver' }, -Math.PI / 2, 0]],
      starweaver: [['wand', {}, 0, 1], ['wand', {}, Math.PI / 2, 1], ['staff', { offHand: 'tome' }, 0.6, 1],
        ['crystal-staff', { offHand: 'orb' }, 0.6, 1], ['wand', {}, Math.PI - 0.5, 0], ['staff', { offHand: 'tome' }, Math.PI - 0.5, 0]],
      shade: [['dagger', {}, 0, 1], ['dagger', {}, Math.PI / 2, 1], ['dagger', { offHand: 'parry-dagger' }, 0.6, 1],
        ['shortsword', { offHand: 'off-shortsword' }, 0.6, 1], ['dagger', {}, Math.PI - 0.5, 0], ['shortsword', { offHand: 'off-shortsword' }, -Math.PI / 2, 0]],
    };
    // The newer weapon kinds, each with the class that uses it.
    SHOTS.more = [['iron-greataxe-1', {}, 0.6, 1, 'bulwark'], ['gold-greatmace-1', {}, 0.6, 1, 'bulwark'], ['iron-fist-1', {}, 0.6, 1, 'shade'],
      ['silver-longsword-2', {}, 0.6, 1, 'shade'], ['wood-boomerang-1', {}, 0.6, 1, 'windstrider'], ['gold-bracelet-3', {}, 0.6, 1, 'starweaver']];
    let r = 0;
    for (const [group, shots] of Object.entries(SHOTS)) {
      const classId = CLASSES[group] ? group : null;
      this.heading(classId ? `${CLASSES[classId].name} - WEAPONS IN HAND, THEN PUT AWAY` : 'NEW WEAPON KINDS', r);
      shots.forEach(([main, extra, yaw, drawn, who], i) => {
        const model = buildCharacter(who ?? classId, LOOK, { equipment: { mainHand: main, ...extra } });
        placeHeld(model, !!drawn);
        this.place(model.root, i, r, yaw, `${main.toUpperCase()}${drawn ? '' : ' (AWAY)'}`);
      });
      r++;
    }
    this.rows = r;
    this.cols = 6;
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
