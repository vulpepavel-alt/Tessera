// One play session: the world, your character, the camera, the HUD, the
// pause menu, fighting (Battle.js) and saving. Created when you press Play / Start Adventure.
//
// The session goes through these states:
//   loading  - chunks around the start point are being built
//   paused   - the pause menu is open (also right after loading: "Begin")
//   playing  - mouse locked, you control the character

import * as THREE from 'three';
import { WorldView } from '../world/WorldView.js';
import { Input } from '../core/Input.js';
import { ThirdPersonCamera } from '../core/ThirdPersonCamera.js';
import { FreeCamera } from '../core/FreeCamera.js';
import { Player } from '../entities/Player.js';
import { Battle } from './Battle.js';
import { GuildPanel } from '../ui/GuildPanel.js';
import { InventoryWindow } from '../ui/InventoryWindow.js';
import { ShopWindow } from '../ui/ShopWindow.js';
import { stockFor, POTION } from '../data/shop.js';
import { Inventory } from './Inventory.js';
import { LootSystem } from './Loot.js';
import { ITEMS } from '../data/items.js';
import { xpFor } from '../data/progression.js';
import { VillageLife } from './VillageLife.js';
import { Minimap } from '../ui/Minimap.js';
import { ChatLog } from '../ui/ChatLog.js';
import { renderPortrait } from '../ui/portrait.js';
import { buildCharacter } from '../models/characterModel.js';
import { buildVillager } from '../models/villagerModel.js';
import { buildCreature } from '../models/creatureModels.js';
import { PLAYER } from '../data/player.js';
import { SPECIAL } from '../data/combat.js';
import { Particles } from '../effects/Particles.js';
import { Sfx } from '../audio/Sfx.js';
import { AmbientLife } from '../effects/AmbientLife.js';
import { GameHud } from '../ui/GameHud.js';
import { DebugOverlay } from '../ui/DebugOverlay.js';
import { LoadingScreen, PauseMenu } from '../ui/GameScreens.js';
import { SaveManager } from '../save/SaveManager.js';
import { settings } from '../save/Settings.js';

const AUTOSAVE_SECONDS = 60;
const SPAWN_AREA = 2; // chunks around the start that must be ready before playing

export class Game {
  // options.benchmark: the fixed visual benchmark scene (data/benchmark.js).
  constructor(engine, slot, save, options = {}) {
    this.engine = engine;
    this.slot = slot; // 0 = never saved (benchmark)
    this.save = save;
    this.state = 'loading';
    this.playTime = save.playTime ?? 0;
    this.autosaveTimer = 0;
    this.flying = false;

    this.world = new WorldView(engine, save.seed, save.time);
    this.wasNight = this.world.dayNight.isNight;
    this.input = new Input(engine.canvas);
    this.player = new Player(engine.scene, this.world.collision, save);
    this.player.model.root.visible = false;
    this.cameraRig = new ThirdPersonCamera(engine.camera, this.input, this.world.collision);
    this.cameraRig.sensitivity = settings.get('mouseSensitivity');
    this.cameraRig.yaw = (save.player?.facing ?? 0) + Math.PI;
    this.flyCamera = new FreeCamera(engine.camera, this.input);

    // Where to start: the saved position, or a fresh spot near the world centre.
    // (A saved spot below the world can't be trusted; start fresh in that case.)
    const p = save.player;
    const valid = p && Number.isFinite(p.y) && p.y >= 1;
    this.spawn = valid ? new THREE.Vector3(p.x, p.y, p.z) : vec(this.world.generator.findSpawn());

    this.minimap = new Minimap(this.world.chunks, save.explored ?? []);
    engine.onAfterRender((renderer) => this.minimap.draw(renderer));
    // The portrait shows just your face: no helmet or hood.
    const portraitModel = buildCharacter(save.classId, save, { bareHead: true });
    this.hud = new GameHud(this.player, this.minimap, renderPortrait(portraitModel));
    this.hud.setVisible(false);
    this.chat = new ChatLog();
    this.chat.setVisible(false);
    this.particles = new Particles(engine.scene);
    this.battle = new Battle({
      engine, worldView: this.world, player: this.player, hud: this.hud, cameraRig: this.cameraRig, particles: this.particles,
    });
    this.hud.setSkills(this.player.spec);
    this.hud.setWeapon(this.player.equipment.mainHand);
    this.ambient = new AmbientLife(engine.scene);
    this.villageLife = new VillageLife({
      scene: engine.scene, worldView: this.world, labels: this.battle.labels, chat: this.chat, hud: this.hud,
      particles: this.particles,
      onGuild: (guildmaster) => this.openGuild(guildmaster),
      onShop: (keeper) => this.openShop(keeper),
    });
    this.guild = new GuildPanel({
      onChoose: (specId) => this.chooseSpec(specId),
      onClose: () => this.closeGuild(),
    });
    this.debug = new DebugOverlay(engine.renderer);
    this.loading = new LoadingScreen();
    this.inventory = new Inventory(this.player);
    this.inventoryWindow = new InventoryWindow({
      inventory: this.inventory,
      onClose: () => this.closeInventory(),
      onMessage: (text) => this.hud.toast(text),
    });
    this.shop = new ShopWindow({
      inventory: this.inventory,
      onClose: () => this.closeShop(),
      onMessage: (text) => this.chat.add(null, text),
      onSound: () => Sfx.coin(),
    });
    this.shopStock = new Map(); // "village|role|day" -> what is left in that shop today
    this.loot = new LootSystem({
      scene: engine.scene, player: this.player, inventory: this.inventory,
      onMessage: (text) => this.chat.add(null, text),
      onGold: (amount) => { this.player.gold += amount; },
    });
    this.pause = new PauseMenu({
      onResume: () => this.input.lock(),
      onInventory: () => this.openInventory(),
      onSaveAndQuit: () => this.quitToMenu(),
    });

    if (options.benchmark) this.setupBenchmark(options.benchmark);
    this.bindEvents();
    engine.onUpdate((dt, elapsed) => this.update(dt, elapsed));
  }

  bindEvents() {
    this.input.onPress('F3', () => this.debug.toggle());
    this.input.onPress('F4', () => this.toggleFlying());
    // E: pick up the gear next to you, or talk to the villager in front of you.
    this.input.onPress('KeyE', () => {
      if (this.shop.visible) {
        this.closeShop();
        return;
      }
      if (this.state !== 'playing') return;
      if (!this.loot.pickUp()) this.villageLife.interact(this.world.dayNight.isNight);
    });
    // B or I opens and closes the inventory (like the classic game); Esc also closes it.
    for (const key of ['KeyB', 'KeyI']) {
      this.input.onPress(key, () => {
        if (this.inventoryWindow.visible) this.closeInventory();
        else if (this.state === 'playing') this.openInventory();
      });
    }
    // V: show the health bars of every nearby enemy (off by default, like the classic game).
    this.input.onPress('Tab', () => {
      if (this.state === 'playing') this.battle.toggleLock();
    });
    this.input.onPress('KeyV', () => {
      if (this.state !== 'playing') return;
      this.battle.labels.showAll = !this.battle.labels.showAll;
      this.hud.toast(`All health bars ${this.battle.labels.showAll ? 'on' : 'off'}`);
    });
    // Q (the quick item, like the classic game) or 3: drink a health potion.
    for (const key of ['KeyQ', 'Digit3']) {
      this.input.onPress(key, () => {
        if (this.state !== 'playing') return;
        const problem = this.player.drinkPotion();
        if (problem) this.hud.toast(problem);
      });
    }
    this.player.on('potion', () => {
      Sfx.drink();
      this.particles.burst('heal', this.player.position.clone().setY(this.player.position.y + 1));
    });
    this.input.onPress('Escape', () => {
      if (this.shop.visible) this.closeShop();
      if (this.inventoryWindow.visible) this.closeInventory();
    });
    // Debug: "]" jumps one hour ahead (handy for testing day and night).
    this.input.onPress('BracketRight', () => {
      if (this.state === 'playing') this.world.dayNight.advance(1);
    });
    this.input.onLockChange((locked) => {
      if (this.state === 'loading') return;
      if (this.guild.visible || this.inventoryWindow.visible || this.shop.visible) {
        // The Guild window is open: no pause menu; the game waits.
        this.state = locked ? 'playing' : 'paused';
        return;
      }
      this.state = locked ? 'playing' : 'paused';
      if (locked) this.pause.hide();
      else this.pause.show();
    });
    this.player.on('message', (text) => this.hud.toast(text));
    this.player.on('levelup', (level) => {
      this.hud.levelUp(level);
      this.chat.add(null, `Level up! You are now level ${level}.`);
      this.particles.burst('heal', this.player.position.clone().setY(this.player.position.y + 1));
      Sfx.cast();
      this.saveNow();
    });
    // A new weapon changes your attacks.
    this.player.on('equipment', (eq) => {
      this.battle.playerCombat.setWeapon(eq.mainHand);
      this.hud.setWeapon(eq.mainHand);
    });
    // Little bursts of particles for impact and movement.
    const feet = () => this.player.position.clone().setY(this.player.position.y + 0.1);
    this.player.on('land', () => this.particles.burst('dust', feet()));
    this.player.on('roll', () => {
      this.particles.burst('dust', feet());
      Sfx.dodge();
    });
    this.player.on('splash', () => this.particles.burst('splash', this.player.position.clone().setY(this.player.position.y + 0.9)));
    this.battle.combat.on('hit', ({ target, crit, finisher, heavy }) => {
      const chest = target.position.clone().setY(target.position.y + target.height * 0.6);
      this.particles.burst(crit ? 'crit' : finisher || heavy ? 'finisher' : 'hit', chest);
      if (target === this.player) Sfx.hurt();
      else if (finisher || heavy) Sfx.finisher();
      else Sfx.hit(crit);
      if ((finisher || heavy) && target !== this.player) this.cameraRig.shake = Math.max(this.cameraRig.shake, 0.45);
    });
    // Trails behind arrows and spells.
    this.battle.combat.onTrail = (p) => this.particles.burst(p.model === 'arrow' ? 'trailArrow' : p.model === 'orb' ? 'trailOrb' : 'trailBolt', p.position);
    this.battle.combat.on('killed', ({ target }) => {
      if (target === this.player) return;
      this.particles.burst('poof', target.position.clone().setY(target.position.y + 0.5));
      // XP and loot, reported quietly in the message log (like the classic game).
      const xp = xpFor(target.type, target.level);
      this.chat.add(null, `${target.name} defeated. You gain ${xp} XP.`);
      this.player.gainXp(xp);
      this.loot.dropFor(target);
      // Now and then a health potion (straight into your pouch).
      if (Math.random() < POTION.dropChance && this.player.potions < POTION.max) {
        this.player.potions++;
        this.chat.add(null, `You receive 1 x ${POTION.name}.`);
      }
    });
    this.player.on('fell', ({ lost }) => {
      this.chat.add(null, `You were brought back to safe ground (-${lost} health).`);
    });
    settings.subscribe((name, value) => {
      if (name === 'mouseSensitivity') this.cameraRig.sensitivity = value;
    });
    // Save when the tab is closed or hidden.
    window.addEventListener('pagehide', () => this.saveNow());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.saveNow();
    });
  }

  update(dt, elapsed) {
    if (this.state === 'loading') this.updateLoading(elapsed);
    else this.updatePlaying(dt, elapsed);

    this.debug.update(dt, () => ({
      position: this.flying ? this.engine.camera.position : this.player.position,
      chunks: this.world.chunks.stats(),
      region: this.world.regionAt(this.player.position.x, this.player.position.z).name,
      enemies: this.battle.combat.enemies.length,
    }));
    this.input.endFrame();
  }

  updateLoading(elapsed) {
    this.world.update(0, elapsed, this.spawn);
    this.engine.camera.position.set(this.spawn.x + 26, this.spawn.y + 30, this.spawn.z + 26); // high above the trees
    this.engine.camera.lookAt(this.spawn);

    const { ready } = this.world.chunks.stats();
    const needed = (SPAWN_AREA * 2 + 1) ** 2;
    this.loading.setProgress(Math.min(ready / needed, 1), `${Math.min(ready, needed)} / ${needed} chunks`);
    if (!this.world.chunks.isAreaReady(this.spawn.x, this.spawn.z, SPAWN_AREA)) return;

    // The ground is ready: place the character and show "Begin".
    this.player.placeAt(this.spawn.x, this.spawn.y, this.spawn.z);
    this.player.model.root.visible = true;
    this.loading.remove();
    this.hud.setVisible(true);
    this.chat.setVisible(true);
    this.battle.labels.setVisible(true);
    this.hud.setRegion(this.world.regionAt(this.spawn.x, this.spawn.z));
    this.state = 'paused';
    this.input.lockOnClick = true;
    this.pause.show(true);
  }

  updatePlaying(dt, elapsed) {
    const playing = this.state === 'playing';
    // Fighting first: it decides the attack pose and may freeze time briefly (hit-stop).
    const gameDt = this.battle.update(playing ? dt : 0, this.input, this.world.dayNight.isNight, playing && !this.flying);
    if (playing) {
      this.playTime += dt;
      if (this.flying) this.flyCamera.update(dt);
      else if (!this.battle.dead) this.player.update(gameDt, this.input, this.cameraRig.yaw);
      this.villageLife.update(gameDt, this.player, this.world.dayNight.isNight);
      this.loot.update(gameDt);
      this.player.potionCooldown = Math.max(0, this.player.potionCooldown - gameDt);
      if (this.loot.nearest) this.hud.setPrompt(`Pick up ${ITEMS[this.loot.nearest.id].name}`);
    }
    if (!this.flying) this.cameraRig.update(dt, this.player.model.root.position);

    const focus = this.flying ? this.engine.camera.position : this.player.position;
    this.world.update(playing ? dt : 0, elapsed, focus);
    this.hud.update(this.cooldowns());
    this.hud.setRegion(this.world.regionAt(focus.x, focus.z));
    this.updateClock(focus);
    this.particles.update(playing ? gameDt : 0);
    const biomeId = this.world.generator.regions.sample(focus.x, focus.z).site.biomeId;
    this.ambient.update(dt, this.player, this.world.dayNight.isNight, biomeId,
      (x, z) => this.world.groundHeight(x, z), elapsed);

    // Labels last, once the camera has moved, so they sit exactly on their targets.
    this.battle.labels.update(playing ? dt : 0);
    this.minimap.update(dt, focus, this.cameraRig.yaw, this.player.facing, {
      villages: this.world.generator.villages.villagesNear(focus.x, focus.z).map((v) => ({ x: v.center.x, y: v.baseY, z: v.center.z })),
      enemies: this.battle.combat.enemies.filter((e) => e.alive).map((e) => e.position),
    });

    this.autosaveTimer += dt;
    if (playing && this.slot && this.autosaveTimer >= AUTOSAVE_SECONDS) {
      this.saveNow(); // quietly: no popup every minute
    }
  }

  // The Guildmaster opens the specialization window.
  // The inventory: the mouse is freed to click items; the world keeps going
  // behind it (your hero stays visible between the equipment columns).
  openInventory() {
    if (this.state === 'loading') return;
    this.pause.hide();
    this.inventoryWindow.show();
    this.hud.root.classList.add('inv-open'); // the hotbar makes room for the equipment
    this.input.unlock();
    this.state = 'paused';
  }

  closeInventory() {
    this.inventoryWindow.hide();
    this.hud.root.classList.remove('inv-open');
    this.saveNow();
    this.input.lock(); // back to the game (this key press / click counts as the needed user action)
  }

  // Talking to a Weaponsmith, Armorer or Merchant opens their shop. Each
  // shop's stock is the same all day (what you buy is gone until tomorrow).
  openShop(keeper) {
    const day = this.world.dayNight.day;
    const key = `${keeper.village?.center?.x},${keeper.village?.center?.z}|${keeper.role}|${day}`;
    if (!this.shopStock.has(key)) {
      this.shopStock.set(key, stockFor(keeper.role, this.player.classId, this.player.level, `${this.world.seed}|${key}`));
    }
    this.shopKey = key;
    this.shop.show(keeper, this.shopStock.get(key));
    this.input.unlock();
    this.state = 'paused';
  }

  closeShop() {
    this.shopStock.set(this.shopKey, this.shop.stock);
    this.shop.hide();
    this.saveNow();
    this.input.lock();
  }

  openGuild(guildmaster) {
    this.guild.show(this.player, guildmaster.name);
    this.input.unlock();
  }

  chooseSpec(specId) {
    const spec = this.player.classInfo.specs.find((s) => s.id === specId);
    this.player.spec = specId;
    this.battle.skills.cooldowns = { s1: 0, s2: 0 };
    this.battle.skills.buffs = [];
    this.hud.setSkills(specId);
    this.hud.toast(`You walk the path of the ${spec.name}`);
    this.chat.add(null, `You learned the ${spec.name} specialization.`);
    this.saveNow();
    this.guild.show(this.player, 'The Guildmaster');
  }

  closeGuild() {
    this.guild.hide();
    this.input.lock(); // back to the game (this click counts as the needed user action)
  }

  // How far along each hotbar cooldown is (1 = just used, 0 = ready).
  cooldowns() {
    const pc = this.battle.playerCombat;
    const roll = this.player.roll;
    return {
      special: 0,
      specialReady: this.player.resource >= SPECIAL.minMp,
      chargedMp: pc.chargedMp,
      roll: roll.time >= 0 ? 1 : roll.cooldown / PLAYER.rollCooldown,
      skills: this.battle.skills.hotbarState(),
    };
  }

  updateClock(focus) {
    const time = this.world.dayNight;
    const biome = this.world.regionAt(focus.x, focus.z);
    // Colder at night and high up.
    const temperature = Math.round(biome.temperature - (time.isNight ? 7 : 0) - Math.max(0, focus.y - 32) * 0.3);
    this.hud.setInfo({ clock: time.clockText, temperature, cameraYaw: this.cameraRig.yaw });
    if (time.isNight !== this.wasNight) {
      this.wasNight = time.isNight;
      this.hud.toast(time.isNight ? 'Night falls. Monsters grow bolder…' : 'A new day dawns.');
    }
  }

  // F4: detach the camera and fly freely (handy for looking around / testing).
  toggleFlying() {
    if (this.state === 'loading') return;
    this.flying = !this.flying;
    if (this.flying) {
      this.flyCamera.setPose(this.engine.camera.position.clone(), this.player.position.clone());
      this.hud.toast('Free-fly camera ON (F4 to return)');
    } else {
      this.hud.toast('Free-fly camera OFF');
    }
  }

  // Always the same moment: the clock stands still and no monsters appear.
  // Always the same moment: the clock stands still, no monsters spawn, and a
  // villager and an enemy stand posed in the scene (models only).
  setupBenchmark(benchmark) {
    this.world.dayNight.frozen = true;
    this.cameraRig.yaw = benchmark.camera.yaw;
    this.battle.spawner.disabled = true;
    const stand = (model, { x, z, facing }) => {
      model.root.position.set(x, this.world.generator.column(Math.floor(x), Math.floor(z)).top + 1, z);
      model.root.rotation.y = facing;
      model.root.visible = true;
      this.engine.scene.add(model.root);
    };
    stand(buildVillager(benchmark.npc.seed, benchmark.npc.role), benchmark.npc);
    stand(buildCreature(benchmark.enemy.type), benchmark.enemy);
  }

  saveNow() {
    if (this.state === 'loading' || !this.slot) return;
    this.autosaveTimer = 0;
    SaveManager.save(this.slot, {
      ...this.save,
      playTime: Math.round(this.playTime),
      // Never store a spot below the world.
      player: this.player.position.y >= 1 ? this.player.toSave() : this.save.player,
      time: { day: this.world.dayNight.day, hour: this.world.dayNight.hour },
      spec: this.player.spec,
      level: this.player.level,
      xp: this.player.xp,
      gold: this.player.gold,
      potions: this.player.potions,
      equipment: this.player.equipment,
      bag: this.player.bag,
      explored: [...this.minimap.explored],
    });
  }

  quitToMenu() {
    this.saveNow();
    // Reloading the page without "?slot" brings back the main menu with a clean slate.
    window.location.href = window.location.pathname;
  }
}

function vec({ x, y, z }) {
  return new THREE.Vector3(x, y, z);
}
