// Humanoid enemies (goblin raiders, bandits...): built from the same parts as
// the hero and the villagers (models/characterModel.js), with their own gear,
// and moved by the same animator. They look like the creatures to Enemy.js:
//   { root, body, parts, material, animate(model, state, time, dt) }

import * as THREE from 'three';
import { buildCharacter } from './characterModel.js';
import { CharacterAnimator } from '../entities/CharacterAnimator.js';
import { DEFAULT_APPEARANCE } from '../data/appearance.js';
import { RACES } from '../data/races.js';

// How each kind of foe looks. `pick` lists are chosen from at random, so a
// band of bandits isn't a row of twins.
export const FOES = {
  goblinRaider: {
    race: 'goblin',
    hair: ['short_spikes', 'cropped_block', 'side_shave'],
    hairColor: ['black', 'dark_brown', 'crimson'],
    gear: [
      { mainHand: 'club', chest: 'cloth-chest', head: 'leather-head' },
      { mainHand: 'dagger', chest: 'leather-chest' },
      { mainHand: 'wood-mace-1', chest: 'cloth-chest', legs: 'cloth-legs' },
    ],
  },
  // Dungeon dwellers: the restless dead in old armour.
  cryptGuard: {
    race: 'undead',
    hair: ['bald', 'cropped_block', 'swept_back'],
    hairColor: ['silver', 'ash_blond', 'black'],
    gear: [
      { mainHand: 'iron-sword-1', chest: 'chain-chest', head: 'chain-head' },
      { mainHand: 'iron-axe-1', chest: 'chain-chest', legs: 'chain-legs' },
      { mainHand: 'iron-sword-2', offHand: 'wood-shield', chest: 'chain-chest' },
    ],
  },
  cryptWarden: {
    race: 'undead',
    hair: ['bald'],
    hairColor: ['silver'],
    gear: [{ mainHand: 'iron-greatsword-1', chest: 'iron-chest', head: 'iron-head', shoulders: 'iron-shoulders', legs: 'iron-legs' }],
  },
  banditThug: {
    race: 'human',
    hair: ['cropped_block', 'swept_back', 'short_spikes', 'low_ponytail'],
    hairColor: ['black', 'dark_brown', 'chestnut', 'copper'],
    gear: [
      { mainHand: 'iron-saber-1', chest: 'leather-chest', face: 'scarf' },
      { mainHand: 'iron-sword-1', chest: 'shadow-chest', face: 'scarf', legs: 'leather-legs' },
      { mainHand: 'iron-axe-1', chest: 'leather-chest', head: 'cloth-head', face: 'scarf' },
    ],
  },
};

export function buildFoe(foeId, rand = Math.random) {
  const foe = FOES[foeId];
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const race = RACES[foe.race];
  const look = {
    ...DEFAULT_APPEARANCE,
    race: foe.race,
    gender: rand() < 0.7 ? 'male' : 'female',
    skin: pick(race.skins),
    hairStyle: pick(foe.hair),
    hairColor: pick(foe.hairColor),
    face: pick(['face_02', 'face_04', 'face_05']), // cross-looking faces
    eyeColor: 0x8a2a1a,
  };
  const model = buildCharacter('bulwark', look, { equipment: pick(foe.gear) });

  // Each foe gets its own copies of the materials, all sharing one emissive
  // colour, so Enemy.js can make just this one glow red or flash white.
  const emissive = new THREE.Color(0, 0, 0);
  const copies = new Map();
  model.root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    if (!copies.has(o.material)) {
      const m = o.material.clone();
      if (m.emissive) m.emissive = emissive;
      copies.set(o.material, m);
    }
    o.material = copies.get(o.material);
  });
  const material = { emissive, dispose: () => copies.forEach((m) => m.dispose()) };

  const root = new THREE.Group();
  root.add(model.root);
  const animator = new CharacterAnimator(model);
  return {
    root,
    body: model.root,
    parts: model.parts,
    material,
    animate(m, state, time, dt) {
      // The warning glow raises the weapon; the attack swings it.
      let attack = null;
      if (state.windup) attack = { kind: 'swing', t: 0.15, index: 0 };
      else if (state.charging) attack = { kind: 'swing', t: 0.55, index: 0, finisher: true };
      animator.update(dt, {
        mode: 'walk', speed: state.dead ? 0 : state.speed, grounded: true, walking: state.speed < 3.5,
        inWater: false, rolling: -1, attack,
      });
      model.root.rotation.z = state.dead ? Math.PI / 2 : 0; // fallen over
    },
  };
}
