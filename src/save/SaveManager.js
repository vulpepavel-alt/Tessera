// Save slots, stored in the browser's localStorage (a small storage area each
// website gets on your computer). There are 3 slots, each one a separate
// adventure with its own character, world seed and progress.

const SLOT_COUNT = 3;
const VERSION = 1;
const key = (slot) => `tessera.save.${slot}`;

export const SaveManager = {
  slotCount: SLOT_COUNT,

  // Returns the save in this slot, or null if it's empty (or unreadable).
  load(slot) {
    try {
      const raw = localStorage.getItem(key(slot));
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && data.version === VERSION ? data : null;
    } catch {
      return null;
    }
  },

  // All slots, in order: [{ slot: 1, data }, ...] (data is null when empty).
  list() {
    const slots = [];
    for (let s = 1; s <= SLOT_COUNT; s++) slots.push({ slot: s, data: this.load(s) });
    return slots;
  },

  hasAnySave() {
    return this.list().some((s) => s.data);
  },

  save(slot, data) {
    try {
      const now = new Date().toISOString();
      const full = { ...data, version: VERSION, slot, updatedAt: now };
      localStorage.setItem(key(slot), JSON.stringify(full));
      return true;
    } catch (error) {
      console.error('Saving failed:', error);
      return false;
    }
  },

  // A brand-new adventure.
  // look: every appearance choice from the New Game screen.
  create(slot, { name, classId, seed, ...look }) {
    const now = new Date().toISOString();
    return this.save(slot, {
      name, classId, seed, ...look,
      createdAt: now,
      playTime: 0,
      level: 1,
      player: null, // filled in on the first save inside the world
    });
  },

  remove(slot) {
    try {
      localStorage.removeItem(key(slot));
    } catch {
      // nothing to do: storage is unavailable
    }
  },
};

// "1h 05m" style text for play time in seconds.
export function formatPlayTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}
