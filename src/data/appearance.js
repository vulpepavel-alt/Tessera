// Every appearance option of the character creator, as data (spec section 7).
// Nothing here changes combat; it is only how a character looks.
//
// Colours come in small "ramps": a skin tone has 4 shades (highlight, base,
// shadow, deep shadow), a hair colour 3 (highlight, base, shadow). Shadows
// lean towards a warm/cool tint instead of towards black, so skin never
// looks dirty in shade.

// Makes a ramp from a base colour: lighter towards `light`, darker towards `dark`.
function ramp(id, displayName, base, { light = 0xffffff, dark = 0x4a2030, deep = 0.48 } = {}) {
  return {
    id, displayName,
    highlight: mix(base, light, 0.22),
    base,
    shadow: mix(base, dark, 0.22),
    deepShadow: mix(base, dark, deep),
  };
}

// ---- Skin (18 human tones, plus fantasy tones used by some races) --------
export const SKIN_PALETTES = [
  ramp('porcelain_rosy', 'Porcelain, rosy', 0xfde2d4),
  ramp('fair_neutral', 'Fair, neutral', 0xf6d6bc),
  ramp('fair_golden', 'Fair, golden', 0xf5d2a6),
  ramp('light_warm', 'Light, warm', 0xeec29a),
  ramp('light_olive', 'Light, olive', 0xe0be92, { dark: 0x3e3420 }),
  ramp('light_cool', 'Light, cool', 0xecc8b4, { dark: 0x3a2a40 }),
  ramp('medium_golden', 'Medium, golden', 0xd9a670),
  ramp('medium_warm', 'Medium, warm', 0xcf9a72),
  ramp('medium_olive', 'Medium, olive', 0xc59d6e, { dark: 0x34301a }),
  ramp('medium_rosy', 'Medium, rosy', 0xd29a86),
  ramp('tan_warm', 'Tan, warm', 0xb98256),
  ramp('tan_neutral', 'Tan, neutral', 0xab7b58),
  ramp('brown_golden', 'Brown, golden', 0x9a6a3e),
  ramp('brown_warm', 'Brown, warm', 0x8e5c3c),
  ramp('brown_cool', 'Brown, cool', 0x7f5640, { dark: 0x24182a }),
  ramp('deep_warm', 'Deep, warm', 0x6a4028, { light: 0xffd8b8, dark: 0x2a1018 }),
  ramp('deep_neutral', 'Deep, neutral', 0x5a3a2a, { light: 0xf0d0b8, dark: 0x201418 }),
  ramp('deep_cool', 'Deep, cool', 0x4a3028, { light: 0xe8c8c0, dark: 0x1a1020 }),
  // Fantasy tones (orcs, goblins, the undead, lizardfolk, frogfolk, foxkin fur).
  ramp('orc_moss', 'Moss green', 0x7a9a4a, { dark: 0x1e3018 }),
  ramp('orc_jade', 'Jade', 0x5f9a6a, { dark: 0x15302a }),
  ramp('orc_olive', 'Olive', 0x8a8a4a, { dark: 0x2a2a12 }),
  ramp('orc_slate', 'Slate green', 0x6a7f6a, { dark: 0x1c2420 }),
  ramp('orc_umber', 'Umber', 0x8a6a4a, { dark: 0x2a1a10 }),
  ramp('goblin_lime', 'Lime', 0x9ac04a, { dark: 0x2a4010 }),
  ramp('goblin_ochre', 'Ochre', 0xc0a040, { dark: 0x403010 }),
  ramp('goblin_teal', 'Pond teal', 0x5aa890, { dark: 0x103a30 }),
  ramp('undead_ash', 'Ash grey', 0xb0b4b0, { dark: 0x2a2a3a }),
  ramp('undead_frost', 'Frost blue', 0x9ab0c8, { dark: 0x1a2440 }),
  ramp('undead_moss', 'Grave green', 0x9aaa8a, { dark: 0x1e2a1e }),
  ramp('undead_bone', 'Bone', 0xd8d0b8, { dark: 0x3a3428 }),
  ramp('lizard_green', 'Leaf scales', 0x4aa04a, { dark: 0x103010 }),
  ramp('lizard_teal', 'Teal scales', 0x2f9a8a, { dark: 0x0a2a30 }),
  ramp('lizard_red', 'Rust scales', 0xb0563a, { dark: 0x3a1010 }),
  ramp('lizard_sand', 'Sand scales', 0xc8a868, { dark: 0x3a2a10 }),
  ramp('lizard_blue', 'Sky scales', 0x4a7ad0, { dark: 0x101a40 }),
  ramp('frog_green', 'Frog green', 0x6ac83a, { dark: 0x1a400a }),
  ramp('frog_teal', 'Lily teal', 0x3ab8a0, { dark: 0x0a3a30 }),
  ramp('frog_orange', 'Ember orange', 0xf08a2a, { dark: 0x4a1a08 }),
  ramp('frog_blue', 'Dart blue', 0x3a8af0, { dark: 0x0a1a50 }),
  ramp('frog_yellow', 'Sun yellow', 0xf0d03a, { dark: 0x4a3a08 }),
  ramp('fur_orange', 'Fox orange', 0xe0782a, { dark: 0x4a1a08 }),
  ramp('fur_red', 'Fox red', 0xc04a28, { dark: 0x3a0a08 }),
  ramp('fur_silver', 'Silver fur', 0xa8aab0, { dark: 0x24243a }),
  ramp('fur_snow', 'Snow fur', 0xf0eeea, { dark: 0x4a4a5a, deep: 0.35 }),
  ramp('fur_brown', 'Bark fur', 0x7a5236, { dark: 0x24140a }),
  ramp('fur_gold', 'Golden fur', 0xd8a84a, { dark: 0x4a2a08 }),
];
export const SKIN = Object.fromEntries(SKIN_PALETTES.map((p) => [p.id, p]));
export const HUMAN_SKINS = SKIN_PALETTES.slice(0, 18).map((p) => p.id);

// ---- Hair (12 natural + 12 fantasy, 3 shades each) ------------------------
const hair = (id, displayName, base) => {
  const r = ramp(id, displayName, base, { dark: 0x101020, light: 0xffffff });
  return { id, displayName, highlight: r.highlight, base, shadow: r.shadow };
};
export const HAIR_PALETTES = [
  hair('black', 'Black', 0x1e1a20), hair('soft_black', 'Soft black', 0x2e2626), hair('espresso', 'Espresso', 0x3e2a1e),
  hair('dark_brown', 'Dark brown', 0x5a3a22), hair('chestnut', 'Chestnut', 0x7a4a26), hair('auburn', 'Auburn', 0x8e3a22),
  hair('copper', 'Copper', 0xc0622a), hair('dark_blond', 'Dark blond', 0xa8844a), hair('golden_blond', 'Golden blond', 0xf0c848),
  hair('ash_blond', 'Ash blond', 0xd0c4a0), hair('silver', 'Silver', 0xb8bcc8), hair('white', 'White', 0xf2f2f0),
  hair('crimson', 'Crimson', 0xc8203a), hair('orange', 'Orange', 0xf07a1a), hair('yellow', 'Yellow', 0xf8e030),
  hair('lime', 'Lime', 0x9ae03a), hair('emerald', 'Emerald', 0x1aa05a), hair('teal', 'Teal', 0x1a9a9a),
  hair('cyan', 'Cyan', 0x3ad8f0), hair('sky', 'Sky', 0x7ab8f8), hair('royal_blue', 'Royal blue', 0x2448b8),
  hair('violet', 'Violet', 0x8a4ae0), hair('magenta', 'Magenta', 0xe03ab0), hair('rose', 'Rose', 0xf490b8),
];
export const HAIR_COLORS_BY_ID = Object.fromEntries(HAIR_PALETTES.map((p) => [p.id, p]));

// ---- Eyes (16) -----------------------------------------------------------
export const EYE_PALETTE = [
  0x2a62e0, 0x4aa8f0, 0x1aa0a0, 0x2fa04a, 0x7aa83a, 0x8a5a2b, 0x5a3a20, 0x3a2a24,
  0x9a7a3a, 0x8a4ae0, 0xd04ab0, 0xe0303a, 0xf0a020, 0x9aa4b8, 0x40e8d8, 0xf0e050,
];

// ---- Faces (spec 5.4) ------------------------------------------------------
// eyeShape: lashed (the classic 3 x 4 eye with a dark lash row) | sleepy (the
//   same eye with a half-closed lid)
// eyeSpacing: 'close' | 'standard' | 'wide' (2, 4 or 6 empty cells; the 12-cell
//   grid can only keep eyes symmetric with even gaps)
// pupilSize: kept for old saves (unused)   brow: none | short | flat | angled
// nose: none | dot | short    mouth: none | neutral | smile | frown | open
// earSize: none | small | standard (races may replace ears)
const face = (eyeShape, eyeSpacing, pupilSize, brow, nose, mouth, earSize) => ({ eyeShape, eyeSpacing, pupilSize, brow, nose, mouth, earSize });
// Six classic faces: the same big lashed eyes (readable from the gameplay
// camera), with only the brows, the spacing and a small mouth changing.
export const FACE_PRESETS = {
  face_01: face('lashed', 'standard', '1x1', 'none', 'none', 'none', 'standard'),   // calm: eyes only
  face_02: face('lashed', 'standard', '1x1', 'flat', 'none', 'neutral', 'standard'), // serious
  face_03: face('lashed', 'wide', '1x1', 'none', 'none', 'smile', 'standard'),     // cheerful
  face_04: face('lashed', 'close', '1x1', 'angled', 'none', 'none', 'standard'),   // fierce
  face_05: face('sleepy', 'standard', '1x1', 'flat', 'none', 'neutral', 'standard'), // sleepy
  face_06: face('lashed', 'standard', '1x1', 'short', 'none', 'open', 'standard'),  // surprised
};
// Older saves used more faces; each maps to the closest classic one.
export const FACE_ALIASES = {
  face_07: 'face_06', face_08: 'face_06', face_09: 'face_03', face_10: 'face_05',
  face_11: 'face_04', face_12: 'face_02', face_13: 'face_03', face_14: 'face_02',
};

// ---- Hair styles (spec 6.3), facial hair and overlays ---------------------
export const HAIR_STYLES = [
  'big_spikes', 'cropped_block', 'side_sweep', 'center_fringe', 'blunt_bob', 'layered_bob', 'short_spikes',
  'tall_crest', 'low_ponytail', 'high_ponytail', 'twin_tails', 'short_braid', 'long_braid',
  'rounded_curls', 'side_shave', 'swept_back', 'bald',
];
// Gender (like the classic creator): it changes the eye lashes and which
// hairstyles are offered; every style stays available to everyone.
export const GENDERS = ['male', 'female'];
export const HAIR_BY_GENDER = {
  male: ['big_spikes', 'short_spikes', 'cropped_block', 'side_sweep', 'swept_back', 'tall_crest', 'side_shave', 'rounded_curls', 'center_fringe', 'low_ponytail', 'short_braid', 'bald'],
  female: ['layered_bob', 'long_braid', 'twin_tails', 'high_ponytail', 'low_ponytail', 'blunt_bob', 'center_fringe', 'side_sweep', 'rounded_curls', 'big_spikes', 'short_braid', 'side_shave'],
};
export const FACIAL_HAIR = ['none', 'stubble', 'mustache', 'curled_mustache', 'goatee', 'chin_strap', 'short_beard', 'full_beard', 'braided_beard'];
// Stackable marks drawn on the skin (several can be chosen at once).
export const OVERLAYS = [
  'freckles_light', 'freckles_heavy', 'rosy_cheeks', 'mole', 'scar_left', 'scar_right',
  'scar_nose', 'paint_stripes', 'paint_dots', 'paint_band', 'stitches', 'tear_marks',
];

// ---- The neutral starting clothes (spec section 8) ---------------------------
// tunic: sleeveless tunic and short trousers; shirt: short-sleeved undershirt
// and shorts; undertunic: one simple piece down to the knees.
export const UNDERLAYERS = ['tunic', 'shirt', 'undertunic'];
// Muted, dyeable cloth colours.
export const CLOTH_DYES = [
  0x5a4a7a, 0x463a60, 0xe8dcc0, 0xc8b89a, 0x9a8a72, 0x6e6a62, 0x8a7a9a, 0x6a7a8a,
  0x7a8a6a, 0x9a6a5a, 0x5a6a7a, 0xb8a888, 0x8a9aa8, 0x6a5a4a,
];

export const DEFAULT_APPEARANCE = {
  schemaVersion: 2,
  race: 'human',
  gender: 'male',
  frame: 'straight',
  skin: 'fair_golden',
  hairStyle: 'big_spikes',
  hairColor: 'golden_blond',
  eyeColor: 0x2a62e0,
  face: 'face_01',
  browColor: 'link_hair',
  facialHair: 'none',
  overlays: [],
  underlayer: 'undertunic',
  underColor: 0x5a4a7a,
  underColor2: 0x463a60,
  pronouns: 'they/them',
};

function mix(a, b, t) {
  const ch = (c, s) => (c >> s) & 255;
  const m = (s) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}
