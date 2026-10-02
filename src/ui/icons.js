// Tiny pixel-art icons drawn in code (8 x 8 dots), used on the hotbar.
// Each letter in a pattern is a colour from PALETTE; '.' is see-through.

const PALETTE = {
  W: '#f4f6ff', // white / steel
  S: '#b8c2d4', // grey steel
  D: '#6c7890', // dark steel
  G: '#ffd24a', // gold
  O: '#ff9a2a', // orange
  R: '#ff4a3a', // red
  B: '#8a5a32', // brown wood
  C: '#7fe8f0', // cyan magic
  P: '#b48cff', // purple magic
  L: '#a8ff7a', // light green
  Y: '#ffe14a', // yellow
  K: '#2a2632', // dark
  M: '#8fd0ff', // ice blue
  N: '#5a7a2a', // dark green
  V: '#4fd84a', // green
  F: '#f3c9a0', // skin
  E: '#c8946a', // skin shadow
};

export const ICONS = {
  fist: ['........', '.FFFFF..', 'FFEFEFF.', 'FFFFFFFF', 'EFFFFFFF', '.FFFFFF.', '..FFFF..', '..BBBB..'],
  sword: [
    '......WW',
    '.....WSW',
    '....WSW.',
    'G..WSW..',
    '.GWSW...',
    '..BG....',
    '.B..G...',
    'B.......',
  ],
  slam: [
    '.G..G..G',
    '..G.G.G.',
    'G..OOO..',
    '.GOROROG',
    '..OOROO.',
    '.G.OOO.G',
    '..G.G.G.',
    '.G..G..G',
  ],
  arrow: [
    '......WW',
    '.....WW.',
    '....BW..',
    '...B....',
    '..B.....',
    'RB......',
    'RR......',
    '.R......',
  ],
  charged: [
    'G.....WW',
    '.G...WW.',
    '..G.BW..',
    '...B....',
    '..B.G...',
    'RB...G..',
    'RR....G.',
    '.R.....G',
  ],
  bolt: [
    '...CC...',
    '..CWWC..',
    '.CWWWWC.',
    '.CWWWWC.',
    '..CWWC..',
    '...CC...',
    '..C..C..',
    '.C....C.',
  ],
  orb: [
    '..OOOO..',
    '.ORRRRO.',
    'ORRGGRRO',
    'ORGWWGRO',
    'ORGWWGRO',
    'ORRGGRRO',
    '.ORRRRO.',
    '..OOOO..',
  ],
  dagger: [
    '.......W',
    '......WS',
    '.....WS.',
    '....WS..',
    '...GG...',
    '..BG....',
    '.B......',
    '........',
  ],
  lunge: [
    '.......W',
    '..P...WS',
    '.P...WS.',
    'P...WS..',
    '.P.GG...',
    '..BG....',
    '.B......',
    '........',
  ],
  roll: [
    '..LLLL..',
    '.L....L.',
    'L..LL..L',
    'L.L..L.L',
    'L.L...L.',
    'L..L....',
    '.L..LLL.',
    '..LL....',
  ],
  taunt: ['..RRRR..', '.R....R.', 'R..RR..R', 'R.R..R.R', 'R.R..R.R', 'R..RR..R', '.R....R.', '..RRRR..'],
  bash: ['.SSSSSS.', 'SDDDDDDS', 'SDGGGGDS', 'SDGYYGDS', 'SDGYYGDS', 'SDGGGGDS', '.SDDDDS.', '..SSSS..'],
  fortress: ['S.S..S.S', 'SSSSSSSS', 'SDDDDDDS', 'SDGDDGDS', 'SDDDDDDS', 'SDD..DDS', 'SDD..DDS', 'SSSSSSSS'],
  whirl: ['..WWW...', '.W...W..', 'W..S..W.', 'W.SSS.WW', 'WW.S..W.', '.W...W..', '..WWW...', '........'],
  leap: ['.....WW.', '....W..W', '...W....', '..W.....', '.W......', 'GGGGGGGG', '.G.GG.G.', '........'],
  rage: ['R..RR..R', '.R.RR.R.', '..RRRR..', 'RRROORRR', 'RRROORRR', '..RRRR..', '.R.RR.R.', 'R..RR..R'],
  volley: ['W...W...', '.W...W..', '..W...W.', 'B..W...W', '.B..B...', '..B..B..', '...B..B.', 'R...R..R'],
  stunshot: ['Y.....WW', '.Y...WW.', '..Y.BW..', '...B....', '..B.Y...', 'RB...Y..', 'RR......', '.R......'],
  rain: ['.W.W.W.W', 'W.W.W.W.', '.W.W.W.W', '........', 'B..B..B.', 'B..B..B.', '........', 'NNNNNNNN'],
  trap: ['........', 'N.N..N.N', '.NVNNVN.', 'NV.NN.VN', '.NVNNVN.', 'N.NNNN.N', '..N..N..', 'NNNNNNNN'],
  dash: ['......L.', '.....LL.', 'LLLLLLLL', '.....LL.', '....L.L.', '.LLLLLLL', '....LL..', '.....L..'],
  storm: ['W.W.W.W.', '.W.W.W.W', 'W.W.W.W.', 'BBBBBBBB', '.Y.Y.Y.Y', 'Y.Y.Y.Y.', '.Y.Y.Y.Y', '........'],
  fireball: ['...OO...', '..ORRO..', '.ORYYRO.', 'ORYWWYRO', 'ORYWWYRO', '.ORYYRO.', '..ORRO..', '...OO...'],
  ring: ['.OO..OO.', 'O..RR..O', 'O.R..R.O', '.R....R.', '.R....R.', 'O.R..R.O', 'O..RR..O', '.OO..OO.'],
  meteor: ['O.......', '.O......', '..OR....', '...RRO..', '...ORYR.', '....RYYR', '.....RYR', '......RR'],
  heal: ['...VV...', '...VV...', '.VVLLVV.', 'VVLLLLVV', 'VVLLLLVV', '.VVLLVV.', '...VV...', '...VV...'],
  frost: ['M..M..M.', '.M.M.M..', '..MMM...', 'MMMWMMM.', '..MMM...', '.M.M.M..', 'M..M..M.', '........'],
  wave: ['........', '..MMM...', '.M...M..', 'M.....MM', '.......M', '.MMM....', 'M...MMMM', 'MMMMMMMM'],
  step: ['.P....P.', 'P.P..P.P', '.P....P.', '...KK...', '..KKKK..', '...KK...', '..K..K..', '.K....K.'],
  poison: ['...VV...', '..V..V..', '..V..V..', '.VVVVVV.', 'VVKVVKVV', 'VVVVVVVV', '.VKKKKV.', '..VVVV..'],
  flurry: ['W.....W.', '.W...W..', '..W.W...', '...W....', '..W.W...', '.W...W..', 'W.....W.', '........'],
  smoke: ['..SSS...', '.SDDSS..', 'SDDDDSS.', 'SDDSDDSS', '.SSDDDDS', '..SDDDS.', '...SSS..', '........'],
  rush: ['........', 'PP......', '.PPP..WW', '..PPPWWW', '..PPPWWW', '.PPP..WW', 'PP......', '........'],
  phantom: ['..PPPP..', '.PWPPWP.', 'PPWPPWPP', 'PPPPPPPP', 'PPPPPPPP', 'PP.PP.PP', 'P..P..P.', '........'],
  locked: [
    '..DDDD..',
    '.D....D.',
    '.D....D.',
    'DDDDDDDD',
    'DSSSSSSD',
    'DSSDDSSD',
    'DSSSSSSD',
    'DDDDDDDD',
  ],
};

// The icons for the two attacks of each weapon kind (data/combat.js).
export const WEAPON_ICONS = {
  fists: ['fist', 'slam'],
  blade: ['sword', 'slam'],
  great: ['sword', 'slam'],
  dagger: ['dagger', 'lunge'],
  bow: ['arrow', 'charged'],
  crossbow: ['arrow', 'charged'],
  wand: ['bolt', 'orb'],
  staff: ['bolt', 'orb'],
};

// Draw an icon into a new canvas, scaled up with sharp pixels.
export function iconCanvas(name, scale = 3) {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  canvas.style.width = `${8 * scale}px`;
  canvas.style.height = `${8 * scale}px`;
  canvas.style.imageRendering = 'pixelated';
  const ctx = canvas.getContext('2d');
  ICONS[name].forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = PALETTE[ch];
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return canvas;
}
