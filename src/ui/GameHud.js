// The in-game HUD, laid out and coloured like the classic alpha:
//   top-left      big "LVL n", a lavender XP bar, a red HP bar (white frames)
//   top-right     "TIME / TEMP / HUM", the place name, the minimap
//   bottom        stamina (tan) and MP (teal) bars without numbers, and the
//                 skill slots: bright colour squares with black icons
//   bottom-right  what you are looking at (a monster's level and health, or
//                 the gear at your feet)
//   bottom-left   message log (ChatLog.js)
// All labels use the pixel font from pixelFont.js (white with a dark outline).

import { POTION } from '../data/shop.js';
import './hud.css';
import { ITEMS } from '../data/items.js';
import { el } from './dom.js';
import { pixelLabel } from './pixelFont.js';
import { iconCanvas, WEAPON_ICONS } from './icons.js';
import { PLAYER } from '../data/player.js';
import { xpToNext, LEVEL } from '../data/progression.js';
import { SPEC_SKILLS } from '../data/skills.js';

const TOAST_SECONDS = 3.5;

export class GameHud {
  constructor(player, minimap, portraitUrl) {
    // Bigger HUD on bigger screens (720 px tall -> 1.15x, capped at 1.55x):
    // readable, but the world stays the star.
    const fit = () => document.documentElement.style.setProperty('--hud-scale',
      String(Math.min(1.55, Math.max(1.05, (window.innerHeight / 720) * 1.15)).toFixed(2)));
    fit();
    window.addEventListener('resize', fit);
    this.player = player;
    const info = player.classInfo;

    // Top-left: level, XP, HP.
    this.xp = bar('cw-xp', 'XP');
    this.miniHealth = bar('cw-hp', 'HP');
    this.topLeft = el('div', { class: 'hud-topleft' },
      this.levelLabel = pixelLabel(`LVL ${player.level ?? 1}`, { scale: 3, color: '#d9ccff' }),
      this.xp.root, this.miniHealth.root,
      this.petLabel = pixelLabel('', { scale: 1, color: '#ffd27a' }));

    // Top-right: the time line, the place you are in, the minimap.
    this.info = pixelLabel('', { scale: 1.5, color: '#ffffff' });
    this.placeLabel = pixelLabel('', { scale: 2.5, color: '#ffffff' });
    const topRight = el('div', { class: 'hud-topright' },
      el('div', { class: 'hud-inforow' }, this.info),
      el('div', { class: 'hud-names' }, this.placeLabel),
      minimap.root);

    // Bottom: stamina and MP bars, then the skill slots.
    this.staminaBar = bar('cw-stamina', null);
    this.resource = bar('cw-mp', null);
    this.slots = {
      m1: slot('M1', 'fist', 'orange'),
      m2: slot('M2', 'slam', 'red'),
      s1: slot('1', 'locked', 'pink'),
      s2: slot('2', 'locked', 'purple'),
      r: slot('R', 'locked', 'blue'),
      q: slot('F', 'roll', 'teal'),
      potion: slot('Q', 'potion', 'grey', true),
    };
    this.comboLabel = pixelLabel('', { scale: 2, color: '#ffe27a' });
    this.combo = el('div', { class: 'hud-combo' }, this.comboLabel);
    this.promptText = pixelLabel('', { scale: 1.5 });
    this.prompt = el('div', { class: 'hud-prompt hidden' }, el('span', { class: 'hud-key' }, 'E'), this.promptText);
    const bottom = el('div', { class: 'hud-bottom' },
      this.combo,
      this.prompt,
      el('div', { class: 'hud-barrow' }, this.staminaBar.root, this.resource.root),
      el('div', { class: 'hud-hotbar' }, ...Object.values(this.slots).map((s) => s.root)));

    this.toasts = el('div', { class: 'hud-toasts' });
    this.levelBanner = el('div', { class: 'hud-levelup' }, pixelLabel('LEVEL UP!', { scale: 5, color: '#ffe27a' }));
    this.vignette = el('div', { class: 'hud-vignette' });
    this.death = el('div', { class: 'hud-death hidden' },
      pixelLabel('YOU HAVE FALLEN', { scale: 4, color: '#ffffff' }),
      pixelLabel('WAKING UP AT THE LAST SAFE SPOT', { scale: 1.5, color: '#e8d0d0' }));

    // A boss fight: its name and a long health bar across the top.
    this.bossName = pixelLabel('', { scale: 2, color: '#ff8a7a' });
    this.bossFill = el('div', { class: 'boss-fill' });
    this.bossBar = el('div', { class: 'hud-boss hidden' }, this.bossName, el('div', { class: 'boss-track' }, this.bossFill));
    // Bottom-right: what you are looking at.
    this.targetTitle = pixelLabel('', { scale: 1.5, color: '#ffffff' });
    this.targetLine = pixelLabel('', { scale: 1.5, color: '#7ce05a' });
    this.targetIcon = el('img', { class: 'cw-target-icon', alt: '' });
    this.target = el('div', { class: 'cw-target hidden' }, el('div', { class: 'cw-target-text' }, this.targetTitle, this.targetLine), this.targetIcon);
    this.root = el('div', { class: 'hud' }, this.vignette, this.death, this.topLeft, topRight, this.bossBar, this.toasts, this.levelBanner, bottom, this.target);
    document.body.appendChild(this.root);
    this.last = {};
  }

  setVisible(visible) {
    this.root.classList.toggle('hidden', !visible);
  }

  setRegion(biome) {
    if (this.last.region === biome.name) return;
    if (this.last.region) this.toast(`Entering ${biome.name} (Lv ${biome.levels[0]}-${biome.levels[1]})`);
    this.last.region = biome.name;
    this.showPlace();
  }

  // The village you are in (or null): shown instead of the land's name.
  setPlace(name) {
    this.last.place = name ?? null;
    this.showPlace();
  }

  showPlace() {
    const text = (this.last.place ?? this.last.region ?? '').toUpperCase();
    if (this.last.placeText !== text) {
      this.last.placeText = text;
      this.placeLabel.setText(text);
    }
  }

  // "TIME 10:05   TEMP 18 °C   HUM 50%   RAIN"
  setInfo({ clock, temperature, humidity, weather }) {
    const text = `${clock}   TEMP ${temperature} °C   HUM ${humidity ?? 50}%${weather ? `   ${weather}` : ''}`;
    if (this.last.info !== text) {
      this.last.info = text;
      this.info.setText(text);
    }
  }

  // Bottom-right panel: { title, line, lineColor, icon } or null.
  setTarget(t) {
    const key = t ? `${t.title}|${t.line}|${t.icon ?? ''}` : '';
    if (key === this.last.target) return;
    this.last.target = key;
    this.target.classList.toggle('hidden', !t);
    if (!t) return;
    this.targetTitle.setText(t.title);
    this.targetLine.setText(t.line, { scale: 1.5, color: t.lineColor ?? '#7ce05a' });
    this.targetIcon.style.display = t.icon ? '' : 'none';
    if (t.icon) this.targetIcon.src = t.icon;
  }

  // LEVEL UP: the level label changes and big pixel text shows for a moment.
  levelUp(level) {
    this.levelLabel.setText(`LVL ${level}`);
    this.levelBanner.classList.remove('show');
    void this.levelBanner.offsetWidth; // restart the animation
    this.levelBanner.classList.add('show');
  }

  setPrompt(text) {
    this.prompt.classList.toggle('hidden', !text);
    if (text) this.promptText.setText(text);
  }

  // The attack icons follow the weapon in the main hand (fists when empty).
  setWeapon(itemId) {
    const [basic, heavy] = WEAPON_ICONS[ITEMS[itemId]?.kind] ?? WEAPON_ICONS.fists;
    this.slots.m1.setIcon(basic);
    this.slots.m2.setIcon(heavy);
  }

  // Show the icons of the chosen specialization's skills on the hotbar.
  setSkills(specId) {
    const spec = SPEC_SKILLS[specId];
    this.slots.s1.setIcon(spec.s1.icon);
    this.slots.s2.setIcon(spec.s2.icon);
    this.slots.r.setIcon(spec.ult.icon);
  }

  // Called every frame; only touches the page when a number changed.
  // cooldowns: { special, specialReady, chargedMp, roll: 0..1, skills: SkillSystem.hotbarState() }
  update(cooldowns = {}) {
    const p = this.player;
    const hp = `${Math.ceil(p.health)}/${p.maxHealth}`;
    this.miniHealth.set(p.health / p.maxHealth, hp);
    this.resource.set(p.resource / p.resourceMax, '');
    this.resource.setCharge(p.resource / p.resourceMax, (cooldowns.chargedMp ?? 0) / p.resourceMax);
    const need = xpToNext(p.level);
    if (p.level >= LEVEL.maxLevel) this.xp.set(1, 'MAX');
    else this.xp.set(p.xp / need, `${Math.floor(p.xp)}/${need}`);
    this.staminaBar.set(p.stamina / PLAYER.staminaMax, '');
    this.slots.m2.cooldown(0, cooldowns.specialReady !== false);
    this.slots.q.cooldown(cooldowns.roll ?? 0, p.stamina >= PLAYER.rollCost);
    this.slots.potion.cooldown(p.potionCooldown / POTION.cooldown, p.potions > 0);
    this.slots.potion.setCount(p.potions);
    const sk = cooldowns.skills;
    if (sk) {
      this.slots.s1.cooldown(sk.s1.cooldown, sk.s1.usable);
      this.slots.s2.cooldown(sk.s2.cooldown, sk.s2.usable);
      this.slots.r.cooldown(sk.ult.cooldown, sk.ult.usable);
      const text = sk.combo >= 2 ? `${sk.combo} HITS` : '';
      if (this.last.combo !== text) {
        this.last.combo = text;
        this.comboLabel.setText(text);
        this.combo.classList.toggle('show', !!text);
      }
    }
  }

  flashDamage() {
    this.vignette.classList.remove('hit');
    void this.vignette.offsetWidth; // restart the animation
    this.vignette.classList.add('hit');
  }

  showDeath(visible) {
    this.death.classList.toggle('hidden', !visible);
  }

  // The boss you are fighting (or null): name and health across the top.
  setBoss(boss) {
    this.bossBar.classList.toggle('hidden', !boss);
    if (!boss) {
      this.bossKey = null;
      return;
    }
    const key = `${boss.level}|${boss.name}`;
    if (key !== this.bossKey) {
      this.bossKey = key;
      this.bossName.setText(`LV ${boss.level} ${boss.name}`.toUpperCase());
    }
    this.bossFill.style.transform = `scaleX(${Math.max(0, boss.health / boss.maxHealth)})`;
  }

  // The pet's name under your bars (empty: no pet).
  setPet(name) {
    this.petLabel.setText(name ? `PET: ${name}` : '');
  }

  toast(text) {
    // No duplicates, and never more than three at once.
    if ([...this.toasts.children].some((n) => n.textContent === text && !n.classList.contains('fade'))) return;
    while (this.toasts.children.length >= 3) this.toasts.firstChild.remove();
    const node = el('div', { class: 'toast' }, text);
    this.toasts.append(node);
    setTimeout(() => node.classList.add('fade'), TOAST_SECONDS * 1000);
    setTimeout(() => node.remove(), TOAST_SECONDS * 1000 + 700);
  }
}

// A bar in the classic style: a tiny name above (optional), a framed bar,
// the value written inside (optional). `kind` picks the colours (hud.css).
function bar(kind, name) {
  const fill = el('div', { class: 'bar-fill' });
  const charge = el('div', { class: 'bar-charge' }); // MP committed to a special attack (pink)
  const text = pixelLabel('', { scale: 1 });
  const root = el('div', { class: `hud-bar ${kind}` },
    name ? pixelLabel(name, { scale: 1, color: '#ffffff' }) : null,
    el('div', { class: 'bar' }, fill, charge, el('div', { class: 'bar-label' }, text)));
  let last = '';
  return {
    root,
    set(ratio, value) {
      const key = `${ratio.toFixed(3)}|${value}`;
      if (key === last) return;
      last = key;
      fill.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
      text.setText(value);
    },
    // Paint the last `part` (0..1 of the bar) of the fill pink, ending at `end`.
    setCharge(end, part) {
      charge.style.display = part > 0 ? '' : 'none';
      if (part > 0) {
        charge.style.left = `${(end - part) * 100}%`;
        charge.style.width = `${part * 100}%`;
      }
    },
  };
}

// One hotbar slot: key label, icon, and a dark cover that shrinks during cooldowns.
function slot(key, icon, colour, keepColours = false) {
  const cover = el('div', { class: 'slot-cover' });
  let picture = iconCanvas(icon, 2.5);
  const count = pixelLabel('', { scale: 1 });
  const countBox = el('span', { class: 'slot-count hidden' }, count);
  // Bright colour squares with black icons, like the classic hotbar (the
  // potion keeps its colours).
  const root = el('div', { class: `hud-slot c-${colour}${keepColours ? ' keep' : ''}${icon === 'locked' ? ' locked' : ''}` },
    picture, cover, el('span', { class: 'slot-key' }, pixelLabel(key, { scale: 1 })), countBox);
  let last = '';
  let lastCount = null;
  return {
    root,
    setIcon(name) {
      const next = iconCanvas(name, 2.5);
      picture.replaceWith(next);
      picture = next;
      root.classList.toggle('locked', name === 'locked');
    },
    // A number in the corner (how many potions are left).
    setCount(n) {
      if (n === lastCount) return;
      lastCount = n;
      count.setText(String(n));
      countBox.classList.remove('hidden');
    },
    cooldown(fraction, usable) {
      const key2 = `${fraction.toFixed(2)}|${usable}`;
      if (key2 === last) return;
      last = key2;
      cover.style.height = `${Math.round(fraction * 100)}%`;
      root.classList.toggle('unusable', !usable);
    },
  };
}
