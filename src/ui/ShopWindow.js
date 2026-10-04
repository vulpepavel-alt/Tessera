// A shop window (talk to a Weaponsmith, Armorer or Merchant), in the same
// see-through boxes as the inventory:
//   middle   BUY / SELL tabs, a grid of squares, the price under each, your gold
//   right    the item under the mouse: name, rarity stars, price, what it does
// Click an item to buy it (BUY) or to sell it from your bag (SELL).

import './styles/inventory.css';
import './styles/shop.css';
import { el, replaceChildren } from './dom.js';
import { ptext, pparagraph, pbutton } from './menuKit.js';
import { itemIcon } from './itemIcons.js';
import { bonusLines } from './InventoryWindow.js';
import { iconCanvas } from './icons.js';
import { ITEMS, RARITY, SLOT_NAMES, canUse } from '../data/items.js';
import { RARITY_STARS } from '../data/progression.js';
import { CLASSES } from '../data/classes.js';
import { POTION, priceOf, sellPriceOf } from '../data/shop.js';
import { PET } from '../entities/Pet.js';

const TITLES = { weaponsmith: 'WEAPONSMITH', armorer: 'ARMORER', merchant: 'MERCHANT' };

export class ShopWindow {
  // inventory: game/Inventory.js. onClose(). onMessage(text) (message log). onSound().
  constructor({ inventory, onClose, onMessage, onSound }) {
    Object.assign(this, { inventory, onClose, onMessage, onSound });
    this.tab = 'BUY';
    this.hover = null; // { id } or { potion: n }
    this.stock = [];
    this.box = el('div', { class: 'ibox shop-box' });
    this.tip = el('div', { class: 'ibox inv-tip shop-tip hidden' });
    this.root = el('div', { class: 'inv shop hidden' }, this.box, this.tip,
      el('div', { class: 'inv-close' },
        pbutton('CLOSE', () => this.onClose(), { scale: 2, boxed: true }),
        ptext('E OR ESC TO CLOSE', { scale: 1, color: '#d8dde8' })));
    document.body.appendChild(this.root);
  }

  get visible() {
    return !this.root.classList.contains('hidden');
  }

  // keeper: the villager (name, role). stock: data/shop.js stockFor().
  show(keeper, stock) {
    this.keeper = keeper;
    this.stock = stock;
    this.tab = 'BUY';
    this.hover = null;
    this.render();
    this.root.classList.remove('hidden');
    document.body.classList.add('shop-open');
  }

  hide() {
    this.root.classList.add('hidden');
    document.body.classList.remove('shop-open');
    this.hover = null;
  }

  get player() {
    return this.inventory.player;
  }

  render() {
    const tabs = el('div', { class: 'inv-tabs' }, ['BUY', 'SELL'].map((t) => el('button', {
      class: `inv-tab${t === this.tab ? ' selected' : ''}`, 'aria-label': `${t} tab`,
      onclick: () => { this.tab = t; this.hover = null; this.render(); },
    }, ptext(t, { scale: 1.5 }))));
    const entries = this.tab === 'BUY'
      ? this.stock.map((s) => ({ ...s, src: s, price: s.potion ? POTION.price * s.potion : s.treat ? PET.treatPrice * s.treat : priceOf(ITEMS[s.id]) }))
      : this.inventory.bag.map((id, index) => ({ id, index, price: sellPriceOf(ITEMS[id]) }));
    const grid = entries.length
      ? el('div', { class: 'shop-grid' }, entries.map((e) => this.square(e)))
      : el('div', { class: 'inv-empty' }, ptext(this.tab === 'BUY' ? 'SOLD OUT' : 'YOUR BAG IS EMPTY', { scale: 1.5, color: '#b8c0d0' }));
    replaceChildren(this.box,
      ptext(`${this.keeper.name.toUpperCase()} - ${TITLES[this.keeper.role] ?? 'SHOP'}`, { scale: 2, color: '#ffe27a' }),
      tabs, grid,
      el('div', { class: 'inv-gold' }, el('span', { class: 'coin' }),
        ptext(`${this.player.gold} GOLD`, { scale: 1.5, color: '#ffe27a' }),
        ptext(`${this.player.potions} POTIONS`, { scale: 1.5, color: '#ff8a9a' })));
    this.renderTip();
  }

  square(entry) {
    const item = ITEMS[entry.id];
    const affordable = this.tab === 'SELL' || this.player.gold >= entry.price;
    const picture = entry.potion ? iconCanvas('potion', 4.5) : entry.treat ? iconCanvas('treat', 4.5) : el('img', { src: itemIcon(entry.id), alt: '' });
    const unusable = item && !canUse(item, this.player.classId);
    return el('div', { class: 'shop-cell' },
      el('button', {
        class: `inv-sq${item ? ` r-${item.rarity}` : ' r-common'}${unusable ? ' unusable' : ''}${affordable ? '' : ' too-dear'}`,
        'aria-label': entry.potion ? `${entry.potion} ${POTION.name}` : entry.treat ? 'Pet Treat' : item.name,
        onclick: () => (this.tab === 'BUY' ? this.buy(entry) : this.sell(entry)),
        onmouseenter: () => { this.hover = entry; this.renderTip(); },
        onmouseleave: () => { this.hover = null; this.renderTip(); },
      }, picture, entry.potion > 1 ? el('span', { class: 'shop-count' }, ptext(`X${entry.potion}`, { scale: 1 })) : null),
      ptext(`${entry.price}G`, { scale: 1.5, color: affordable ? '#ffe27a' : '#ff6a5a' }));
  }

  renderTip() {
    const h = this.hover;
    this.tip.classList.toggle('hidden', !h);
    if (!h) return;
    const selling = this.tab === 'SELL';
    const action = selling ? `CLICK TO SELL FOR ${h.price} GOLD` : `CLICK TO BUY FOR ${h.price} GOLD`;
    if (h.treat) {
      replaceChildren(this.tip,
        pparagraph('PET TREAT', { chars: 18, scale: 2, color: '#ffe27a' }),
        pparagraph('Stand next to an animal of your level or lower and press T: it becomes your pet and fights beside you.', { chars: 26, scale: 1.5, color: '#d8dde8' }),
        ptext(`YOU HAVE ${this.player.treats}`, { scale: 1.5, color: '#b8c0d0' }),
        ptext(action, { scale: 1.5, color: '#7fe8f0' }));
      return;
    }
    if (h.potion) {
      replaceChildren(this.tip,
        pparagraph(`${h.potion} X ${POTION.name.toUpperCase()}`, { chars: 18, scale: 2, color: '#ff8a9a' }),
        pparagraph(`Press Q to drink one: heals ${Math.round(POTION.heal * 100)}% of your health.`, { chars: 26, scale: 1.5, color: '#d8dde8' }),
        ptext(action, { scale: 1.5, color: '#7fe8f0' }));
      return;
    }
    const item = ITEMS[h.id];
    const rarity = RARITY[item.rarity];
    const usable = canUse(item, this.player.classId);
    replaceChildren(this.tip,
      el('img', { class: 'tip-icon', src: itemIcon(h.id), alt: '' }),
      pparagraph(item.name.toUpperCase(), { chars: 18, scale: 2, color: rarity.color }),
      el('div', { class: 'tip-stars' }, Array.from({ length: 5 }, (_, i) => el('span', { class: i < RARITY_STARS[item.rarity] ? 'on' : '', style: `--star:${rarity.color}` }))),
      ptext(`${rarity.name.toUpperCase()} ${SLOT_NAMES[item.slot].toUpperCase()}`, { scale: 1.5, color: '#b8c0d0' }),
      item.armor ? ptext(`ARMOR +${item.armor}`, { scale: 1.5 }) : null,
      item.kind ? ptext(`POWER ${Math.round(item.power * 10)}`, { scale: 1.5 }) : null,
      ...bonusLines(item),
      item.classes ? ptext(`${item.classes.map((c) => CLASSES[c].name).join(' / ').toUpperCase()} ONLY`, { scale: 1.5, color: usable ? '#9fe08a' : '#ff6a5a' }) : null,
      ptext(action, { scale: 1.5, color: '#7fe8f0' }));
  }

  buy(entry) {
    const p = this.player;
    if (p.gold < entry.price) {
      this.onMessage('You do not have enough gold.');
      return;
    }
    if (entry.treat) {
      p.treats += entry.treat;
      p.gold -= entry.price;
      this.onMessage(`You buy a Pet Treat for ${entry.price} gold.`);
    } else if (entry.potion) {
      if (p.potions + entry.potion > POTION.max) {
        this.onMessage(`You can carry at most ${POTION.max} potions.`);
        return;
      }
      p.potions += entry.potion;
      p.gold -= entry.price;
      this.onMessage(`You buy ${entry.potion} x ${POTION.name} for ${entry.price} gold.`);
    } else {
      if (!this.inventory.add(entry.id)) {
        this.onMessage('Your bag is full.');
        return;
      }
      p.gold -= entry.price;
      this.stock = this.stock.filter((s) => s !== entry.src); // sold out until tomorrow
      this.onMessage(`You buy ${ITEMS[entry.id].name} for ${entry.price} gold.`);
    }
    this.onSound?.();
    this.hover = null;
    this.render();
  }

  sell(entry) {
    const p = this.player;
    this.inventory.bag.splice(entry.index, 1);
    p.gold += entry.price;
    this.onMessage(`You sell ${ITEMS[entry.id].name} for ${entry.price} gold.`);
    this.onSound?.();
    this.hover = null;
    this.render();
  }
}
