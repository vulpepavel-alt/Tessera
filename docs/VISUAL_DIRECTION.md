# Visual direction

Goal: one look at a screenshot should say **"bright, chunky, colourful voxel
action RPG"**, in the spirit of classic voxel RPGs, with TESSERA's own
characters, world and its **golden-yellow + royal-blue** identity.
No assets, models, textures or UI are taken from any other game.

## Benchmark scenes (check these after every visual change)

| Address | What it shows |
|---|---|
| `http://localhost:5173/?benchmark` | Fixed spot, fixed time (10:00): player, grass, trees, rocks, river, stepped hills, a house, sun, shadows, fog, the real gameplay camera. Nothing is saved. Settings in `src/data/benchmark.js`. |
| `http://localhost:5173/?lineup` | Character reference sheet: base character from 6 sides, each class from START to LEGENDARY, villagers, creatures. Built in `src/game/LineupScene.js`. |

## Where each part of the look lives

| Topic | Files |
|---|---|
| Face-based lighting (each cube side its own brightness) | `src/world/faceShading.js`, used by `world/voxelMaterials.js`, `models/VoxelGrid.js`, clouds, creatures, minimap |
| Sun, sky light, warm sun / cool shadows | `src/data/world.js` (ATMOSPHERE), `src/data/sky.js`, `src/world/Atmosphere.js` |
| Block colours (grass, stone, sand, snow, wood, water) | `src/data/blocks.js` |
| Voxel variation and 2 x 2 mosaic on blocks | `src/world/voxelMaterials.js` |
| Trees (irregular three-shade crowns), plants | `src/world/Decorations.js`, `src/data/biomes.js` |
| Houses | `src/world/VillageBuilder.js` |
| Camera (field of view 55, distance 11, elevated) | `src/data/world.js` (CAMERA), `src/core/ThirdPersonCamera.js`, `src/save/Settings.js` |
| Characters (one shared body) | `src/models/humanoid.js`, `src/models/humanoid/*` |
| Equipment on the model | `src/data/items.js`, `src/models/equipment/armor.js`, `src/models/equipment/weapons.js`, `src/models/characterModel.js` |
| Logo | `src/ui/voxelLogo.js` (built from real cubes) |
| UI colours | `src/ui/styles/menu.css`, `title.css`, `stage.css`, `src/ui/hud.css` |

## Rules

- **Same cube size everywhere on characters**: bodies, armour and weapons all
  use `VOXEL` (0.058). (Creatures still use bigger cubes; they get rebuilt in
  the creature round.)
- **Everyone starts unequipped**: plain clothes, bare fists. The class decides
  abilities, never the starting look. Equipment is modular: each slot changes
  only its own part of the model (`head, chest, hands, legs, feet, back,
  mainHand, offHand`).
- **Progression shows on the body**: cloth → leather → chain → iron → steel →
  rare → legendary; later armour widens the silhouette (bigger shoulder pads,
  closed helmets with crests, capes, glowing gems).
- Saturated palette; stone leans blue-grey, snow blue-white, wood orange-brown.
- Effects are cubes (particles are already little cubes).

## Open decision: size of the terrain cubes

The world's blocks are 1 unit; a character is about 1.8 blocks tall (the same
ratio as most block games). Making terrain cubes half as big would make hills
look finer, but it means 8 times more cubes to build and draw for the same
view, a full rebuild of terrain, buildings and physics in the new scale, and a
big risk for frame rate in a browser. Until that is decided, the 2 x 2 mosaic
and the face lighting make blocks read as smaller cubes.
