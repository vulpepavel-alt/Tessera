// The day/night cycle: how long a day lasts and how the sky looks at each hour.
// Between two listed hours the colours blend smoothly.

export const DAY = {
  lengthSeconds: 1200, // one full day (24 in-game hours) = 20 real minutes
  startHour: 8,        // a new adventure starts at 08:00
  nightStart: 20,      // stronger enemies roam between nightStart ...
  nightEnd: 5.5,       // ... and nightEnd
};

// hour: when this look is reached.
// top / horizon: sky colours (the horizon colour is also the fog colour).
// light / lightIntensity: the sun (by day) or moon (by night).
// ambient: the soft light from the whole sky. stars: 0 = hidden, 1 = fully visible.
export const SKY_KEYFRAMES = [
  { hour: 0, top: 0x0a1130, horizon: 0x1b2747, light: 0x8fa6d8, lightIntensity: 0.45, ambient: 0.45, stars: 1 },
  { hour: 4.8, top: 0x0a1130, horizon: 0x1b2747, light: 0x8fa6d8, lightIntensity: 0.45, ambient: 0.45, stars: 1 },
  { hour: 6, top: 0x5566aa, horizon: 0xf2a77a, light: 0xffc296, lightIntensity: 1.1, ambient: 0.75, stars: 0.25 },
  { hour: 8, top: 0x1468ff, horizon: 0x7cc4ff, light: 0xffecd0, lightIntensity: 2.35, ambient: 1.0, stars: 0 },
  { hour: 17, top: 0x1468ff, horizon: 0x7cc4ff, light: 0xffecd0, lightIntensity: 2.35, ambient: 1.0, stars: 0 },
  { hour: 18.8, top: 0x4b56a3, horizon: 0xf09466, light: 0xffaa70, lightIntensity: 1.1, ambient: 0.75, stars: 0.2 },
  { hour: 20.3, top: 0x0a1130, horizon: 0x1b2747, light: 0x8fa6d8, lightIntensity: 0.45, ambient: 0.45, stars: 1 },
  { hour: 24, top: 0x0a1130, horizon: 0x1b2747, light: 0x8fa6d8, lightIntensity: 0.45, ambient: 0.45, stars: 1 },
];
