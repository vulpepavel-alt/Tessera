# Tessera

A 3D voxel open-world action-RPG in the browser. You are a **Cartographer** exploring a vast,
colourful land broken by deep **rifts** full of clouds. Recover **Light Cores** from dungeon and
castle bosses to repair the crystal bridges that span the rifts.

Built with Three.js, simplex-noise and Vite. Every model, sound and piece of text is made in code.

## How to run

1. Open Terminal and go to the project folder:
   `cd /Users/sandrabalu/pavelvulpe/tessera`
2. First time only, install the libraries: `npm install`
3. Start the game: `npm run dev`
4. Open the address it prints (usually http://localhost:5173) in your browser.
5. To stop it, press `Ctrl + C` in Terminal.

## Playing

The title screen shows the TESSERA logo over the world. **Start Game** opens character
creation: your hero stands on a stone pedestal in a meadow while you change their look in the
panel at the bottom left (◀ ▶ arrows and a colour grid); drag the background to turn them.
**Next** opens the class screen (same view): pick a class and read what it does, then choose
the save slot and the world seed (the same seed always builds the same world) and press
**Start Adventure**. **Continue** loads a saved adventure.
The game saves automatically every 60 seconds, when you close the tab, and with
**Save & Quit to Menu** in the pause menu.

### Controls

| Key          | Action                                                  |
|--------------|---------------------------------------------------------|
| W A S D      | Move                                                    |
| Mouse        | Look around (click the game first)                      |
| Left click   | Attack (hold for a 3-hit combo)                         |
| Right click  | Heavy attack (uses rage / energy / mana for some classes) |
| Tab          | Lock on to the enemy in front of you (again: switch / release) |
| E            | Talk to the villager in front of you                    |
| Scroll       | Zoom the camera in / out                                |
| Space        | Jump · in the air: open / close the glider · swim up    |
| Shift        | Sprint · swim fast (uses stamina)                       |
| Q            | Dodge roll (uses stamina, brief invincibility)          |
| C            | Dive (while swimming)                                   |
| B            | Place your boat (next to water) / step out              |
| Esc          | Pause menu                                              |
| F3           | Show / hide FPS and debug info                          |
| F4           | Debug: free-fly camera (W A S D, Space up, C down, Shift fast) |
| ]            | Debug: skip one hour                                    |

### Getting around

- **Climbing**: walk into a wall 2 or more blocks high and you climb it (W up, S down,
  A / D sideways, Space to kick off). Uses stamina; with none left you let go.
- **Swimming**: deep water makes you swim. It slowly uses stamina; when it runs out
  you start losing health, so head for the shore.
- **Glider**: jump off something high and press Space in the air. You fly where the
  camera looks; W speeds up, S slows down. Space again closes it.
- **Boat**: stand next to water and press B. W / S row, A / D turn. B again steps out.

### Day and night

A full day lasts 20 real minutes (clock at the top of the screen). At night
(20:00 - 05:30) more enemies roam, and they are stronger ("Fierce").

### Villages

Every adventure starts in a village. More villages are scattered across the land, each built
in its biome's style: a paved square with a well and lamps, houses, market stalls (weaponsmith,
armorer, merchant), crop fields and flower beds. Villagers stroll around, chat, stop to face you,
and go home at night (guards stay out). Press **E** near one to talk; conversations appear in the
log at the bottom right. Monsters never spawn inside a village.

### The screen

- Top left: your portrait, name, level, small health and XP bars, gold.
- Top right: day, time and temperature, a compass, the region and village, and the **3D minimap**
  (a little relief model of the land; it turns with the camera and fills in as you explore;
  villages are little houses, enemies red cubes).
- Bottom: the **E** prompt, stamina, health and resource bars, and the hotbar
  (M1 basic attack, M2 heavy attack, 1 / 2 / R skills coming soon, Q dodge roll).
- Bottom left: the message log.

Villages are furnished: doors with knobs, window shutters, flower boxes and pots, barrels and
crates, a pavilion on the square, tables, chairs and beds inside, goods on the market stalls
(weapon racks, armour stands, fruit baskets), and smoke from the chimneys. The wild has rocks,
boulders, mushrooms, fallen logs and berry bushes.

Characters are detailed voxel figures: a big 16 x 14 head with a full face, floating fists,
boots with soles, clothes with collars, belts and buttons. In character creation you design your look:
skin (including fantasy colours), 6 eye styles and colours, eyebrows, 6 mouths, ears, rosy
cheeks, freckles, 14 hair styles, facial hair, 4 outfit styles, and any colour from an 84-colour
grid for skin, hair, eyes, clothes, trim, trousers and boots, or press "Random look". You start in those clothes with a basic weapon. Villagers
come from four original peoples: humans, elves, the green Mossfolk and the fox-like Brindlefolk.

The world moves: leaves, crops, grass and flowers sway in the wind, clouds drift overhead,
butterflies flutter by day and fireflies glow at night. Hits throw sparks, landing kicks up dust,
jumping into water splashes.

### Combat

Enemies **glow red** before they attack: that's your cue to dodge roll (Q).
Hits show floating damage numbers (yellow with "!" = critical hit). Landing a hit
freezes the action for a split second, for impact. Out of combat your health slowly
regenerates. If you fall in battle you wake up at the last safe spot after 3 seconds.

The first enemy is the **Bramblehog** (Amber Meadows): it charges at you in a straight
line after a short warning, and runs away when badly hurt.

### Characters and races

Every person in the game (you, villagers, guards) is built by one system that follows
`docs` spec *TESSERA Character Creator Specification*: a 32-voxel-tall body with a big
14 x 14 x 12 head, a simple face on a 12 x 10 grid, hair in zones, and named attachment
points (sockets) for equipment. Measurements live in `src/data/characterSpec.js`, every
option in `src/data/appearance.js` and the races in `src/data/races.js`.

Races: Human, Elf, Dwarf, Orc, Goblin, Undead, Lizardfolk, Frogfolk and Foxkin. A race
changes looks only (skin tones, ears, snout/muzzle, tusks, tail, size), never combat.
Character creation has tabs: Body (race, frame, skin), Face (12 presets, eye colour, 12
marks), Hair (16 styles, 24 colours, 8 beards), Clothes (3 neutral underlayers, dyes) and
Identity (name, pronouns); drag to turn, scroll to zoom to the face.

### Combat feel

Attacks have an anticipation, a sharp impact and a recovery; the last hit of a combo is a
finisher (bigger hit-stop, knockback and stagger). You move slowly while attacking, a dodge
roll (Q) cancels any attack, enemies flinch when hit, stagger on finishers and are winded
right after they charge. Small procedural sounds and voxel trails give feedback. See
`docs/character_combat_visual_audit.md`.

### Equipment

Every class starts the same way: plain clothes and bare fists. Weapons and armour
are found, earned and bought on the journey (loot, chests and shops come next), and
every piece shows on your character: head, face, chest, shoulders, hands, waist, legs,
feet, back, main hand and off hand are all separate. Out of combat, weapons rest on your
back or hip. The weapon in your hand decides your basic and heavy
attack (fists, blades, greatswords, daggers, bows, crossbows, wands, staffs); better
weapons hit harder. Armour goes from cloth to legendary, and later pieces make the
silhouette bigger. The full list is in `src/data/items.js`.

### Classes

| Class       | Role         | Resource | Specializations (chosen later at a trainer) |
|-------------|--------------|----------|---------------------------------------------|
| Warrior     | Heavy melee  | Rage     | Ironwall (defense) · Ravager (damage)       |
| Ranger      | Ranged       | Energy   | Longshot (charged shots) · Pathfinder (mobility, traps) |
| Mage        | Magic        | Mana     | Emberheart (fire) · Tidecaller (water, healing) |
| Rogue       | Fast melee   | Energy   | Nightblade (crits) · Mistdancer (evasion)   |

## The world

One endless, connected land, split into large biome regions:

| Biome               | Levels | Look |
|---------------------|--------|------|
| Amber Meadows       | 1-10   | Lime and golden grass, giant amber and green trees, pink blossom trees (the starting region) |
| Crystalfrost Forest | 10-20  | Frosty grass, snow, giant layered spruces, frozen lakes, ice crystals |
| Copper Dunes        | 20-30  | Copper sand dunes, cacti, dead trees, sandstone |
| Lantern Marsh       | 30-40  | Murky water, purple trees, glowing lantern mushrooms |
| Stormspire Peaks    | 40-50  | Dark rock, tall snowy peaks, violet crystals (far from the centre) |

Rivers and lakes cross the land. Away from the start, **rifts** cut through it: deep cracks
filled with clouds, lined with crystal spires. Fall in and the clouds carry you back to the last
safe ground, at the cost of 10% of your health.

The world is cut into **chunks** (32 x 32 voxels, 64 tall) that load around you and unload
behind you. Background **workers** build them, so the game never pauses.

## Tweaking

All numbers live in `src/data/` — save a file and the page reloads by itself.

- `world.js`: land shape, rivers, rifts, region size, sky, fog, camera.
- `biomes.js`: each biome's blocks, hills, mountains and plants.
- `blocks.js`: block colours.
- `classes.js`: class names, health, resources, what each class can use, name ideas.
- `items.js`: every weapon, armour piece and back item (with tiers and colours).
- `benchmark.js`: the master visual benchmark scene (`?benchmark`, `?benchmark&bare`).
- `player.js`: walking, sprinting, jumping, rolling, swimming, climbing, glider, boat, stamina.
- `sky.js`: day length and the sky colours for every hour.
- `combat.js`: basic and heavy attack of every weapon kind (and bare fists), class crits and resources.
- `enemies.js`: enemy health, damage, speed, attacks; how many spawn by day and night.
- `villages.js`: how often villages appear, their size, building styles per biome, names, villager looks.
- `dialogue.js`: everything villagers say.
- `props.js` + `models/props.js`: the small decorative models (pots, barrels, rocks...).
- `skills.js`: every skill's damage, cost, cooldown and effects; combo and ultimate settings.

Settings (in the menu): mouse sensitivity, render distance, field of view, volume.

## Folder structure

| Folder          | What lives there                                   |
|-----------------|----------------------------------------------------|
| `src/core`      | Engine, game loop, input, cameras, worker pool     |
| `src/game`      | The play session (`Game.js`) and the menu scene    |
| `src/world`     | Terrain, regions, chunks, meshing, sky, clouds     |
| `src/entities`  | Player, movement modes, boat, enemies, spawning, physics, animation |
| `src/combat`    | Combat referee, player attacks, projectiles, lock-on |
| `src/items`     | Loot, inventory, equipment, crafting (coming)      |
| `src/ui`        | Menus, HUD (pixel font), minimap, chat log, floating labels |
| `src/effects`   | Particles, butterflies and fireflies               |
| `src/models`    | Voxel models built in code (characters, weapons)   |
| `src/data`      | Config files: world, biomes, blocks, classes, player |
| `src/audio`     | Procedural sound and music (coming)                |
| `src/save`      | Save slots and settings                            |

## Progress

The build order follows the player's journey (menu → character → world → combat → ...).

- [x] Setup (Node, Vite, Three.js, git)
- [x] Procedural voxel terrain, lighting, fog, sky
- [x] Endless chunks, 5 biomes, greedy meshing, FPS counter (F3)
- [x] Connected land with rivers, lakes and cloud-filled rifts
- [x] Main menu, new game (slot, name, class, look, seed), continue, settings, pause menu
- [x] Title screen with logo, character creation on a pedestal in the world, class screen,
      pixel-style loading screen
- [x] Save slots with autosave
- [x] Voxel characters for all 4 classes, movement, jump, sprint, dodge roll, collisions
- [x] Third-person camera with zoom and wall avoidance; rift fall → safe point
- [x] Glider, swimming, climbing, boat, day/night cycle
- [x] Combat (combos, heavy attacks, crits, knockback, hit-stop, lock-on, dodging), first enemy with AI
- [x] Villages with houses, stalls, fields; villagers with routines, dialogue, speech bubbles, chat log
- [x] Pixel-font HUD, 3D minimap, swaying plants, drifting clouds, particles, butterflies and fireflies
- [x] Detail pass: brighter colours, terraced terrain, big two-tone trees, expressive characters,
      furnished villages and wild props, clean HUD with portrait and hotbar, 3D minimap
- [x] Class skills (1, 2, R) for all 8 specializations, combo counter, stuns and other effects,
      Guild Hall with a Guildmaster to choose your specialization
- [x] Visual direction: face-based lighting, warm sun / cool shadows, new palette, irregular
      three-shade tree crowns, elevated diorama camera, yellow + blue identity, voxel logo,
      benchmark scene (`?benchmark`) and character reference sheet (`?lineup`), see
      `docs/VISUAL_DIRECTION.md`
- [x] Modular equipment on the model (8 slots, armour lines per class, weapons per class),
      everyone starts unequipped, attacks come from the held weapon
- [x] Visual overhaul in 8 phases (camera, AO + grading, grass palette, hierarchical
      terrain, trees + groves, chunkier characters, whimsical houses, pixel UI), see
      `docs/VISUAL_OVERHAUL.md`; master benchmark `?benchmark`
- [x] Visual pass from gameplay footage: giant trees (spruces, blossom trees), huge clouds,
      half-timbered houses, lime grass
- [x] Detailed, fully customisable characters
- [ ] Loot, inventory, equipment, rarity, XP and levels
- [ ] Villages, NPCs, merchants, class trainers, quests
- [ ] Crafting stations and recipes
- [ ] All enemies, bosses, dungeons, castles, Light Cores, crystal bridges
- [ ] Pets, artifacts, talents, world map, teleports
- [ ] Procedural audio
- [ ] Polish, balancing, bug fixing
