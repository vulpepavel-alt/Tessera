// Tessera - entry point.
//
// Opens the main menu, or (when the address ends in "?slot=1", "?slot=2" or
// "?slot=3") loads that save slot straight into the world.

import './ui/styles/cursor.css';
import { Engine } from './core/Engine.js';
import { SaveManager } from './save/SaveManager.js';
import { Game } from './game/Game.js';
import { MenuScene } from './game/MenuScene.js';
import { BENCHMARK } from './data/benchmark.js';
import { LineupScene } from './game/LineupScene.js';

const engine = new Engine(document.body);

const params = new URLSearchParams(window.location.search);
const slot = Number(params.get('slot'));
const save = slot ? SaveManager.load(slot) : null;

if (params.has('lineup')) {
  // The character reference sheet: every model and equipment stage side by side.
  window.tessera = new LineupScene(engine);
} else if (params.has('benchmark')) {
  // The fixed visual benchmark scene (see data/benchmark.js). Nothing is saved.
  const save = structuredClone(BENCHMARK.save);
  if (!params.has('bare')) save.equipment = { ...BENCHMARK.equipment };
  window.tessera = new Game(engine, 0, save, { benchmark: BENCHMARK });
} else if (save) {
  // Debug helper: lets you inspect the game from the browser console (tessera.player ...).
  window.tessera = new Game(engine, slot, save);
} else {
  // Unknown or empty slot: clean up the address and show the menu.
  if (slot) window.history.replaceState(null, '', window.location.pathname);
  window.tessera = new MenuScene(engine);
}

engine.start();
