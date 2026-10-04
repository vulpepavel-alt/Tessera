// Shops, the classic way: the Weaponsmith sells weapons, the Armorer armour
// and the Merchant potions and odds and ends. They stock things for YOUR
// class at about the quality of the land around you, and buy anything you
// bring back for a part of its price. Stock changes every day.

import { ITEMS, canUse } from './items.js';
import { LOOT } from './progression.js';

// What an item costs in a shop (gold). Better tiers cost a lot more.
export function priceOf(item) {
  const base = 12 * 1.85 ** ((item.tier ?? 1) - 1);
  return Math.round(base * (item.kind ? 1.25 : 1));
}

// What a shopkeeper pays you for it.
export function sellPriceOf(item) {
  return Math.max(1, Math.floor(priceOf(item) * 0.4));
}

export const POTION = {
  name: 'Health Potion',
  heal: 0.4,        // fraction of max health, at once
  cooldown: 8,      // seconds before the next one
  price: 15,
  max: 20,          // how many you can carry
  dropChance: 0.1,  // chance a monster drops one
};

export const SHOPKEEPERS = ['weaponsmith', 'armorer', 'merchant'];

const STOCK_SIZE = 8;

// Today's stock of one shop. Same village + same day = same stock.
// Returns a list of { id } (items) or { potion: n } (a pack of n potions).
export function stockFor(role, classId, level, seedText) {
  const rand = random(seedText);
  const tier = LOOT.baseTier(level);
  const tiers = [tier, Math.min(7, tier + 1)];
  if (role === 'merchant') {
    const extras = Object.values(ITEMS).filter((it) => !it.classes && (it.tier ?? 1) <= tiers[1]);
    return [{ potion: 1 }, { potion: 5 }, { treat: 1 }, ...pick(extras, STOCK_SIZE - 3, rand).map((it) => ({ id: it.id }))];
  }
  const weapon = role === 'weaponsmith';
  const pool = Object.values(ITEMS).filter((it) => it.classes && canUse(it, classId)
    && Boolean(it.kind) === weapon && tiers.includes(it.tier));
  return pick(pool, STOCK_SIZE, rand).map((it) => ({ id: it.id }));
}

function pick(list, n, rand) {
  const copy = [...list];
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
}

// A small seeded random number generator (0..1).
function random(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
