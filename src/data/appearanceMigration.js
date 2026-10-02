// Turns any saved look into the current appearance record (schema 2).
// Saves made before the character-creator update stored loose fields
// (skinTone, hairColor, hairStyle, eyeStyle...); they are mapped to the
// closest new options, so old characters keep looking like themselves.
// The appearance record is separate from class and gameplay data (spec 12).

import { DEFAULT_APPEARANCE, SKIN, HUMAN_SKINS, HAIR_PALETTES, HAIR_STYLES } from './appearance.js';
import { RACES } from './races.js';
import { SCHEMA_VERSION } from './characterSpec.js';

const OLD_HAIR = {
  short: 'cropped_block', spiky: 'short_spikes', long: 'layered_bob', ponytail: 'low_ponytail', bob: 'blunt_bob',
  bun: 'high_ponytail', mohawk: 'tall_crest', curly: 'rounded_curls', swept: 'side_sweep', braids: 'long_braid',
  afro: 'rounded_curls', pigtails: 'twin_tails', fringe: 'center_fringe', bald: 'bald',
};
const OLD_BEARD = { none: 'none', mustache: 'mustache', beard: 'full_beard', goatee: 'goatee' };

export function appearanceOf(look = {}) {
  if (look.appearance?.schemaVersion === SCHEMA_VERSION) return look.appearance;
  if (look.schemaVersion === SCHEMA_VERSION) return look; // already an appearance record
  const a = { ...DEFAULT_APPEARANCE, overlays: [] };
  a.race = look.ears === 'pointy' ? 'elf' : 'human';
  if (look.skinTone != null) a.skin = nearest(HUMAN_SKINS, (id) => SKIN[id].base, look.skinTone);
  if (look.hairColor != null) a.hairColor = nearest(HAIR_PALETTES.map((p) => p.id), (id) => HAIR_PALETTES.find((p) => p.id === id).base, look.hairColor);
  a.hairStyle = HAIR_STYLES.includes(look.hairStyle) ? look.hairStyle : OLD_HAIR[look.hairStyle] ?? a.hairStyle;
  if (look.eyeColor != null) a.eyeColor = look.eyeColor;
  a.face = { round: 'face_01', big: 'face_04', narrow: 'face_02', sleepy: 'face_05', happy: 'face_03', fierce: 'face_06' }[look.eyeStyle] ?? 'face_01';
  a.facialHair = OLD_BEARD[look.facialHair] ?? 'none';
  if (look.blush !== false) a.overlays.push('rosy_cheeks');
  if (look.freckles) a.overlays.push('freckles_light');
  if (look.outfitColor != null) a.underColor = look.outfitColor;
  if (look.pantsColor != null) a.underColor2 = look.pantsColor;
  if (!RACES[a.race].skins.includes(a.skin)) a.skin = RACES[a.race].skins[0];
  return a;
}

// The option in `ids` whose colour is closest to `target`.
function nearest(ids, colourOf, target) {
  let best = ids[0];
  let bestD = Infinity;
  for (const id of ids) {
    const c = colourOf(id);
    const d = ((c >> 16) - (target >> 16)) ** 2 + (((c >> 8) & 255) - ((target >> 8) & 255)) ** 2 + ((c & 255) - (target & 255)) ** 2;
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}
