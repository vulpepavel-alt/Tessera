// Player settings (mouse sensitivity, view distance, ...), remembered in
// localStorage. Other parts of the game can "subscribe" to be told when a
// setting changes, so changes apply immediately.

const STORAGE_KEY = 'tessera.settings';
// Bumped when a default changes on purpose; older stored values for it are dropped.
const VERSION = 4;

export const SETTING_RANGES = {
  mouseSensitivity: { label: 'Mouse sensitivity', min: 0.2, max: 3, step: 0.1, format: (v) => `${v.toFixed(1)}x` },
  renderDistance: { label: 'Render distance', min: 4, max: 12, step: 1, format: (v) => `${v} chunks` },
  fov: { label: 'Field of view', min: 40, max: 100, step: 1, format: (v) => `${v}°` },
  volume: { label: 'Volume', min: 0, max: 100, step: 5, format: (v) => `${v}%` },
  music: { label: 'Music', min: 0, max: 100, step: 5, format: (v) => `${v}%` },
};

const DEFAULTS = {
  mouseSensitivity: 1,
  renderDistance: 8,
  fov: 66,
  volume: 70,
  music: 50,
};

class SettingsStore {
  constructor() {
    this.values = { ...DEFAULTS, ...readStored() };
    this.listeners = [];
  }

  get(name) {
    return this.values[name];
  }

  set(name, value) {
    this.values[name] = value;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
    } catch {
      // storage unavailable: the setting still applies until the page reloads
    }
    for (const fn of this.listeners) fn(name, value);
  }

  // fn(name, value) runs every time a setting changes.
  subscribe(fn) {
    this.listeners.push(fn);
  }
}

function readStored() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
    if (stored.version !== VERSION) delete stored.fov; // new default field of view
    stored.version = VERSION;
    return stored;
  } catch {
    return {};
  }
}

export const settings = new SettingsStore();
