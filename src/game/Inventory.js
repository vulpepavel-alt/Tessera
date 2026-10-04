// The bag and the worn equipment, and the rules for moving items between
// them (the inventory window, ui/InventoryWindow.js, only calls these):
//   - clicking an item in the bag puts it on (what was worn goes back into
//     the bag, in the same square)
//   - clicking a worn item takes it off into the first free square
//   - only items your class can use can be put on
//   - a two-handed weapon needs both hands: the off-hand item goes to the bag
//
// The bag is a list of item ids (data/items.js), saved with the game.

import { ITEMS, canUse, slotFor } from '../data/items.js';
import { CLASSES } from '../data/classes.js';
import { CLASS_COMBAT } from '../data/combat.js';

export const BAG_SIZE = 40; // 8 x 5 squares

export class Inventory {
  constructor(player) {
    this.player = player;
  }

  get bag() {
    return this.player.bag;
  }

  freeSquares() {
    return BAG_SIZE - this.bag.length;
  }

  // Put a found / bought item in the bag. Returns false when the bag is full.
  add(id) {
    if (!ITEMS[id] || this.freeSquares() <= 0) return false;
    this.bag.push(id);
    return true;
  }

  // Wear the item in bag square `index`. Returns a message when it can't.
  equipFromBag(index) {
    const id = this.bag[index];
    const item = ITEMS[id];
    if (!item) return null;
    const p = this.player;
    if (!canUse(item, p.classId)) {
      const who = item.classes.map((c) => CLASSES[c].name).join(' / ');
      return `Only a ${who} can use this`;
    }
    const slot = slotFor(item, p.equipment);
    const changes = { [slot]: id };
    const removed = [];
    if (p.equipment[slot]) removed.push(p.equipment[slot]);
    // Two hands for a two-handed weapon; and no off-hand item next to one.
    if (item.kind === 'great' && p.equipment.offHand) {
      removed.push(p.equipment.offHand);
      changes.offHand = null;
    }
    if (item.slot === 'offHand' && ITEMS[p.equipment.mainHand]?.kind === 'great') {
      return 'Your two-handed weapon needs both hands';
    }
    if (removed.length - 1 > this.freeSquares()) return 'Your bag is full';
    this.bag.splice(index, 1, ...removed.slice(0, 1)); // the old item takes its square (or the gap closes)
    for (const extra of removed.slice(1)) this.bag.push(extra);
    p.setEquipment(changes);
    return null;
  }

  // Take off the item worn in `slot`.
  unequip(slot) {
    const p = this.player;
    const id = p.equipment[slot];
    if (!id) return null;
    if (!this.add(id)) return 'Your bag is full';
    p.setEquipment({ [slot]: null });
    return null;
  }

  // The numbers shown in the stats panel.
  stats() {
    const p = this.player;
    const weapon = ITEMS[p.equipment.mainHand];
    return {
      health: p.maxHealth,
      armor: p.armor,
      power: Math.round((weapon?.power ?? 1) * 10),
      crit: Math.round((CLASS_COMBAT[p.classId]?.critChance ?? 0) * 100),
      damageBonus: Math.round(p.gearBonus('damage') * 100),
      resource: `${p.classInfo.resource.name} ${p.resourceMax}`,
    };
  }
}
