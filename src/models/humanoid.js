// The character assembler: builds every humanoid (the player, villagers,
// guards, humanoid enemies) from ONE set of parts and rules
// (data/characterSpec.js, docs: TESSERA_Character_Creator_Specification.md).
//
//   resolveLook(appearance)  -> r: the appearance turned into concrete colours
//                               and shapes (race, skin ramp, hair, face...)
//   buildHumanoid(r)         -> { root, body, parts, sockets, bodyCenter }
//
// Equipment and NPC clothing are added to `r` between the two steps
// (models/equipment/armor.js, models/villagerModel.js).
//
// The skeleton (all rigid parts, no bending):
//   root -> body (tilts/rolls) -> pelvis -> torso -> head (+ hair tails)
//                                        |        -> armL -> handL, armR -> handR
//                                        |           (arms are invisible joints)
//                                        -> legL -> footL, legR -> footR
// Named sockets (socket_head_top, socket_hand_R, ...) hang off these parts.

import * as THREE from 'three';
import { VoxelGrid, voxelModelMaterial } from './VoxelGrid.js';
import { MV, BODY, SOCKETS, HEAD_GRID } from '../data/characterSpec.js';
import { RACES } from '../data/races.js';
import { SKIN, HAIR_COLORS_BY_ID, FACE_PRESETS, FACE_ALIASES, DEFAULT_APPEARANCE } from '../data/appearance.js';
import { headGrid, X0, Y0, Z0 } from './humanoid/head.js';
import { drawHair } from './humanoid/hair.js';
import { drawHeadgear, HIDES_HAIR } from './humanoid/headgear.js';
import { torsoGrid, pelvisGrid, handGrid, legGrid, footGrid, padGrid } from './humanoid/body.js';
import { lighter, darker } from './humanoid/colors.js';

export { lighter, darker };
export const VOXEL = MV; // size of one model cube in world units

// ---- Step 1: appearance -> concrete look ------------------------------------
export function resolveLook(appearance) {
  const a = { ...DEFAULT_APPEARANCE, ...appearance };
  const race = RACES[a.race] ?? RACES.human;
  const skin = race.skins.includes(a.skin) ? SKIN[a.skin] : SKIN[race.skins[0]];
  const hair = race.hair ? HAIR_COLORS_BY_ID[a.hairColor] ?? HAIR_COLORS_BY_ID.chestnut : null;
  return {
    race: race === RACES[a.race] ? a.race : 'human',
    gender: a.gender === 'female' ? 'female' : 'male',
    frame: a.frame ?? race.frame ?? 'straight',
    scale: race.scale * (a.scale ?? 1),
    skin,
    hair,
    hairStyle: race.hair ? a.hairStyle : 'bald',
    eyeColor: a.eyeColor,
    face: FACE_PRESETS[a.face] ?? FACE_PRESETS[FACE_ALIASES[a.face]] ?? FACE_PRESETS.face_01,
    browColor: !hair ? skin.shadow : a.browColor === 'link_hair' || a.browColor == null ? hair.shadow : a.browColor,
    facialHair: a.facialHair ?? race.facialHair ?? 'none',
    overlays: a.overlays ?? [],
    features: { ...race.features },
    raceVariant: a.raceVariant ?? race.variants?.[0] ?? null,
    underlayer: a.underlayer,
    under1: a.underColor,
    under2: a.underColor2,
    // Filled in later by equipment / NPC clothing:
    clothing: null, chest: null, legs: null, feet: null, hands: null,
    headgear: null, hats: [], pads: null, belt: null, mask: null, hiddenHairZones: new Set(), compressHair: false,
  };
}

// Hide hair zones under worn headgear.
export function hideHair(r, kind) {
  for (const z of HIDES_HAIR[kind] ?? []) r.hiddenHairZones.add(z);
}

// ---- Step 2: build the model -------------------------------------------------
export function buildHumanoid(r) {
  const root = new THREE.Group();
  root.scale.setScalar(r.scale);
  const center = BODY.bodyCenter * MV;
  const body = new THREE.Group();
  body.position.y = center;
  root.add(body);
  const frame = new THREE.Group();
  frame.position.y = -center;
  body.add(frame);

  const broad = r.frame === 'broad' ? 1 : 0;
  const [PW, PH, PD] = BODY.pelvis.size;
  const [TW, TH, TD] = BODY.torso.size;
  const [HW, , HD] = BODY.head.size;
  const parts = {};
  parts.pelvis = attach(frame, pelvisGrid(r), [PW / 2, PH, PD / 2], mv(0, BODY.pelvis.pivot[1], 0));
  parts.torso = attach(parts.pelvis, torsoGrid(r), [TW / 2 + broad, TH, TD / 2], mv(0, BODY.torso.pivot[1] - BODY.pelvis.pivot[1], 0));

  // Head (with hair and headgear in the same grid, so they share shading).
  const head = headGrid(r);
  if (r.headgear) drawHeadgear(head, r.headgear);
  const tails = drawHair(head, r);
  parts.head = attach(parts.torso, head, [X0 + HW / 2, Y0, Z0 + HD / 2], [0, 0, 0]);
  for (const t of tails) attach(parts.head, t.grid, t.pivot, mv(...t.at));

  const { arm: A, hand: H, leg: L, foot: F } = BODY;
  for (const [side, s] of [['L', -1], ['R', 1]]) {
    // The arm is an invisible shoulder joint: rotating it swings the hand.
    const arm = new THREE.Group();
    arm.position.copy(mv(s * (A.pivot[0] + broad), A.pivot[1] - BODY.torso.pivot[1], A.pivot[2]));
    parts.torso.add(arm);
    parts[`arm${side}`] = arm;
    const hand = handGrid(r);
    parts[`hand${side}`] = attach(arm, hand, [hand.sizeX / 2, hand.sizeY, hand.sizeZ / 2], mv(s * (H.pivot[0] - A.pivot[0]), H.pivot[1] - A.pivot[1], H.pivot[2] - A.pivot[2]));
    const leg = attach(parts.pelvis, legGrid(r), [L.size[0] / 2, L.size[1], L.size[2] / 2], mv(s * L.pivot[0], L.pivot[1] - BODY.pelvis.pivot[1], L.pivot[2]));
    parts[`leg${side}`] = leg;
    // Feet: the ankle sits above the back part, so the boot reaches forward.
    const foot = footGrid(r);
    parts[`foot${side}`] = attach(leg, foot, [foot.sizeX / 2, F.size[1], foot.sizeZ / 2 - F.pivot[2]], mv(0, F.pivot[1] - L.pivot[1], 0));
  }

  // Sockets: empty attachment points named as in the spec.
  const sockets = {};
  for (const [name, { parent, at }] of Object.entries(SOCKETS)) {
    const p = new THREE.Group();
    p.name = name;
    const x = name.endsWith('_L') || name.endsWith('_R') ? at[0] + Math.sign(at[0]) * (parent === 'torso' ? broad : 0) : at[0];
    p.position.copy(mv(x, at[1], at[2]));
    parts[parent].add(p);
    sockets[name] = p;
  }

  // Shoulder pads (late armour), race tails, hats.
  if (r.pads) {
    for (const s of ['L', 'R']) attach(sockets[`socket_shoulder_${s}`], padGrid(r.pads.color, r.pads.trim, r.pads.big), r.pads.big ? [4, 1, 5] : [3, 1, 4], [0, 0, 0]);
  }
  if (r.features.tail) {
    const tail = attach(sockets.socket_waist_back, tailGrid(r), [2.5, 2.5, 0], [0, 0, 0]);
    tail.rotation.set(r.features.tail === 'fox' ? -0.5 : -0.25, Math.PI, 0); // turned to point backwards, drooping
  }
  for (const hat of r.hats) attach(sockets.socket_head_top, hat.grid, hat.pivot, [0, -(hat.sink ?? 2) * MV, 0]);

  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { root, body, parts, sockets, bodyCenter: center };
}

// A tail pointing backwards (its front end at z = 0 of its grid, at the socket).
function tailGrid(r) {
  const s = r.skin;
  if (r.features.tail === 'fox') {
    // Bushy, widening then narrowing, with a white tip.
    const g = new VoxelGrid(5, 5, 11);
    const widths = [2, 3, 4, 5, 5, 5, 5, 4, 4, 3, 2];
    widths.forEach((w, z) => {
      const o = Math.floor((5 - w) / 2);
      g.box(o, o, z, w, w, 1, z >= 8 ? 0xf6f2ea : z % 3 === 0 ? s.highlight : s.base);
    });
    return g;
  }
  // Lizard: long and tapering, darker underneath.
  const g = new VoxelGrid(5, 5, 12);
  for (let z = 0; z < 12; z++) {
    const w = Math.max(1, 4 - Math.floor(z / 3));
    const o = Math.floor((5 - w) / 2);
    g.box(o, o, z, w, w, 1, s.base).box(o, o, z, w, 1, 1, s.shadow);
  }
  return g;
}

function mv(x, y, z) {
  return new THREE.Vector3(x * MV, y * MV, z * MV);
}

// Adds a voxel part to `parent`; returns its group (rotate the group to animate).
// position: a Vector3 or [x, y, z] in world units.
export function attach(parent, grid, pivot, position, voxel = VOXEL) {
  const group = new THREE.Group();
  if (Array.isArray(position)) group.position.set(position[0], position[1], position[2]);
  else group.position.copy(position);
  group.add(new THREE.Mesh(grid.toGeometry(voxel, pivot), voxelModelMaterial()));
  parent.add(group);
  return group;
}

export { HEAD_GRID };
