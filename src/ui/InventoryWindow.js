// The inventory window (key I), laid out like classic voxel adventures:
//   middle top     the bag: tabs, a grid of squares with item pictures, gold
//   middle bottom  what you wear: labelled squares in two columns, your hero
//                  standing between them in the world behind
//   left           your stats
//   right          the item under the mouse: name in its rarity colour, what
//                  it does, and who can use it
// Click an item in the bag to put it on; click a worn item to take it off.
// The rules live in game/Inventory.js; this file only draws and listens.

import './styles/inventory.css';
import { el, replaceChildren } from './dom.js';
import { ptext, pparagraph, pbutton } from './menuKit.js';
import { itemIcon } from './itemIcons.js';
import { BAG_SIZE } from '../game/Inventory.js';
import { ITEMS, RARITY, SLOT_NAMES, canUse } from '../data/items.js';
import { CLASSES } from '../data/classes.js';

const LEFT_SLOTS = ['mainHand', 'head', 'chest', 'legs', 'feet', 'face'];
const RIGHT_SLOTS = ['offHand', 'shoulders', 'hands', 'waist', 'back'];
const TABS = ['EQUIPMENT', 'ITEMS'];

export class InventoryWindow {
  // inventory: game/Inventory.js. onClose(). onMessage(text).
  constructor({ inventory, onClose, onMessage }) {
    this.inventory = inventory;
    this.onClose = onClose;
    this.onMessage = onMessage;
    this.tab = 'EQUIPMENT';
    this.hover = null; // { id, worn }

    this.stats = el('div', { class: 'ibox inv-stats' });
    this.bag = el('div', { class: 'ibox inv-bag' });
    this.worn = el('div', { class: 'inv-worn' });
    this.tip = el('div', { class: 'ibox inv-tip hidden' });
    this.root = el('div', { class: 'inv hidden' },
      this.stats, this.bag, this.worn, this.tip,
      el('div', { class: 'inv-close' },
        pbutton('CLOSE', () => this.onClose(), { scale: 2, boxed: true }),
        ptext('I OR ESC TO CLOSE', { scale: 1, color: '#d8dde8' })));
    document.body.appendChild(this.root);
  }

  get visible() {
    return !this.root.classList.contains('hidden');
  }

  show() {
    this.render();
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
    this.hover = null;
  }

  render() {
    this.renderStats();
    this.renderBag();
    this.renderWorn();
    this.renderTip();
  }

  renderStats() {
    const p = this.inventory.player;
    const s = this.inventory.stats();
    const spec = p.classInfo.specs.find((x) => x.id === p.spec);
    const line = (label, value, color = '#ffffff') => el('div', { class: 'stat-row' },
      ptext(label, { scale: 1.5, color: '#d8dde8' }), ptext(String(value), { scale: 1.5, color }));
    replaceChildren(this.stats,
      ptext(p.name, { scale: 2, color: '#ffe27a' }),
      ptext(`LVL 1 ${p.classInfo.name}${spec ? ` - ${spec.name}` : ''}`, { scale: 1.5, color: '#7fe8f0' }),
      el('div', { class: 'stat-list' },
        line('HEALTH', s.health, '#ff8a7a'),
        line('ARMOR', s.armor),
        line('POWER', s.power),
        line('CRIT', `${s.crit}%`),
        line(s.resource.split(' ')[0].toUpperCase(), s.resource.split(' ')[1], p.classInfo.resource.color)));
  }

  renderBag() {
    const tabs = el('div', { class: 'inv-tabs' }, TABS.map((t) => el('button', {
      class: `inv-tab${t === this.tab ? ' selected' : ''}`, 'aria-label': `${t} tab`,
      onclick: () => { this.tab = t; this.renderBag(); },
    }, ptext(t, { scale: 1.5 }))));
    let body;
    if (this.tab === 'EQUIPMENT') {
      const bag = this.inventory.bag;
      const squares = [];
      for (let i = 0; i < BAG_SIZE; i++) {
        const id = bag[i];
        squares.push(this.square(id, () => this.equip(i), { worn: false }));
      }
      body = el('div', { class: 'inv-grid' }, squares);
    } else {
      body = el('div', { class: 'inv-empty' }, ptext('NOTHING HERE YET', { scale: 1.5, color: '#b8c0d0' }),
        pparagraph('Potions, ingredients and treasures you collect will appear here.', { chars: 34, scale: 1.5, color: '#b8c0d0' }));
    }
    replaceChildren(this.bag, tabs, ptext(this.tab, { scale: 1.5, color: '#ffe27a' }), body,
      el('div', { class: 'inv-gold' }, el('span', { class: 'coin' }),
        ptext(`${this.inventory.player.gold ?? 0} GOLD`, { scale: 1.5, color: '#ffe27a' }),
        ptext(`${this.inventory.freeSquares()} FREE`, { scale: 1.5, color: '#b8c0d0' })));
  }

  renderWorn() {
    const eq = this.inventory.player.equipment;
    const column = (slots, side) => el('div', { class: `inv-col ${side}` }, slots.map((slot) => el('div', { class: 'inv-slotrow' },
      this.square(eq[slot], () => this.unequip(slot), { worn: true, slot }),
      ptext(SLOT_NAMES[slot].toUpperCase(), { scale: 1.5 }))));
    replaceChildren(this.worn, column(LEFT_SLOTS, 'left'), column(RIGHT_SLOTS, 'right'));
  }

  // One square: the item picture (or empty), hover shows the tooltip.
  square(id, onclick, { worn, slot }) {
    const item = ITEMS[id];
    const unusable = item && !worn && !canUse(item, this.inventory.player.classId);
    return el('button', {
      class: `inv-sq${item ? ` r-${item.rarity}` : ''}${unusable ? ' unusable' : ''}`,
      'aria-label': item ? item.name : `Empty ${slot ? SLOT_NAMES[slot] : 'square'}`,
      onclick: item ? onclick : null,
      onmouseenter: () => { this.hover = item ? { id, worn } : null; this.renderTip(); },
      onmouseleave: () => { this.hover = null; this.renderTip(); },
    }, item ? el('img', { src: itemIcon(id), alt: '' }) : null);
  }

  renderTip() {
    const h = this.hover;
    this.tip.classList.toggle('hidden', !h);
    if (!h) return;
    const item = ITEMS[h.id];
    const classId = this.inventory.player.classId;
    const rarity = RARITY[item.rarity];
    const usable = canUse(item, classId);
    replaceChildren(this.tip,
      el('img', { class: 'tip-icon', src: itemIcon(h.id), alt: '' }),
      pparagraph(item.name.toUpperCase(), { chars: 18, scale: 2, color: rarity.color }),
      ptext(`${rarity.name.toUpperCase()} ${SLOT_NAMES[item.slot].toUpperCase()}`, { scale: 1.5, color: '#b8c0d0' }),
      item.armor ? ptext(`ARMOR +${item.armor}`, { scale: 1.5 }) : null,
      item.kind ? ptext(`POWER ${Math.round(item.power * 10)}`, { scale: 1.5 }) : null,
      item.kind === 'great' ? ptext('TWO-HANDED', { scale: 1.5, color: '#ffe27a' }) : null,
      item.classes ? ptext(`${item.classes.map((c) => CLASSES[c].name).join(' / ').toUpperCase()} ONLY`, { scale: 1.5, color: usable ? '#9fe08a' : '#ff6a5a' }) : null,
      ptext(h.worn ? 'CLICK TO TAKE OFF' : usable ? 'CLICK TO PUT ON' : 'YOU CANNOT USE THIS', { scale: 1.5, color: '#7fe8f0' }));
  }

  equip(index) {
    const problem = this.inventory.equipFromBag(index);
    if (problem) this.onMessage(problem);
    this.hover = null;
    this.render();
  }

  unequip(slot) {
    const problem = this.inventory.unequip(slot);
    if (problem) this.onMessage(problem);
    this.hover = null;
    this.render();
  }
}
