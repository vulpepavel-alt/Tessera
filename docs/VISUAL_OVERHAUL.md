# Visual overhaul: inspection report

Target: the visual principles of classic voxel RPGs (chunky characters, small
visible cubes, dramatic stepped landscapes, clean bright graphics), with every
TESSERA asset original. Gameplay systems stay as they are.

## A. Systems responsible for each visual component

| Component | System (files) |
|---|---|
| Camera | `core/ThirdPersonCamera.js` (orbit, zoom, wall pull-in), numbers in `data/world.js` CAMERA, field of view in `save/Settings.js` |
| Character scale and shape | `models/humanoid.js` (body assembly), `models/humanoid/body.js` (legs, torso, sleeves, fists), `hair.js`, `face.js`; animation in `entities/CharacterAnimator.js` |
| Equipment on the body | `data/items.js`, `models/equipment/armor.js`, `models/equipment/weapons.js`, `models/characterModel.js` |
| NPCs | `models/villagerModel.js` (uses the same humanoid builder) |
| Lighting | `world/Atmosphere.js` (sun, sky light, shadows), `data/world.js` ATMOSPHERE, `data/sky.js` |
| Face shading | `world/faceShading.js` |
| Ambient occlusion | Terrain: corner AO in `world/GreedyMesher.js`. Models: none yet |
| Terrain colours | `data/blocks.js` (one colour per block), shader variation in `world/voxelMaterials.js` |
| Terrain shape | `world/WorldGenerator.js` (continent, hills, ridged mountains, rivers, rifts), `world/RegionLayout.js` + `data/biomes.js` (per-biome heights), `data/world.js` WORLD + CHUNK (height limit 64) |
| Small plants | `world/groundDetails.js` (where), `world/DetailMeshes.js` (shapes) |
| Trees and plants | `world/Decorations.js`, flora lists in `data/biomes.js` |
| Buildings | `world/VillageBuilder.js`, `world/VillagePlanner.js` |
| Colour grading / output | `core/Engine.js` (renderer, no post-processing yet) |
| HUD | `ui/GameHud.js`, `ui/hud.css`, `ui/pixelFont.js`, `ui/icons.js` |
| Menus (pause, settings, continue) | `ui/GameScreens.js`, `ui/SettingsPanel.js`, `ui/MainMenu.js`, `ui/styles/menu.css`, `screens.css` |
| World map | `ui/Minimap.js` + `hud.css` |
| Benchmarks | `data/benchmark.js` (`?benchmark`), `game/LineupScene.js` (`?lineup`) |

## B. Files that need changing

- Camera: `ThirdPersonCamera.js`, `data/world.js`, `save/Settings.js`
- Character scale/proportions: `humanoid.js`, `humanoid/body.js`, `hair.js`, `face.js`, `villagerModel.js`, `equipment/weapons.js`
- AO and lighting: `models/VoxelGrid.js` (AO for models), `GreedyMesher.js` (stronger terrain AO), `Atmosphere.js`, `data/world.js`, `data/sky.js`, `core/Engine.js` (colour grading pass)
- Terrain palette: `GreedyMesher.js` (mark grass faces), `voxelMaterials.js` (grass palette by height, moisture, slope, noise), `DetailMeshes.js`
- Terrain generation: `WorldGenerator.js`, `data/world.js` (taller chunks), `data/biomes.js`
- Vegetation and trees: `groundDetails.js`, `DetailMeshes.js`, `Decorations.js`, `data/biomes.js`
- Buildings: `VillageBuilder.js`
- UI: `menu.css`, `screens.css`, `GameScreens.js`, `hud.css`
- New benchmark: `world/BenchmarkGenerator.js`, `data/benchmark.js`, `chunkWorker.js`, `main.js`, `Game.js`

## C. What stays untouched

Combat, skills, enemy AI, spawning rules, physics and player movement, saves,
the day/night timing, villager routines and dialogue, the guild, the equipment
data model and slots, the chunk loading/worker system, menus' logic.

## D. Differences between the current game and the target

| Area | Now | Target |
|---|---|---|
| Camera | 11 units away, looking down, character small | ~8 units, lower and flatter, character prominent in the lower centre |
| Character | thin torso, one-cube-thick hair, slightly flat | thicker body, deep layered hair, good from every side, ~12% bigger |
| Face | lashes, whites, iris, nose, 4-wide mouth | a few cubes: dark eyes with a glint, tiny mouth |
| NPCs | same body but straw hats / spears at bigger cube sizes, random scaling | exactly the same cube size and body; guards wear real equipment |
| AO | terrain corners only; models none | strong contact shading on models and terrain steps |
| Lighting | bright, fairly flat | warm sun, cooler shade, visible soft shadows, subtle grading |
| Grass | one lime green everywhere | 6 shades varying by height, moisture, slope, noise |
| Terrain | gentle hills, big flat areas, height limit 64 | macro (mountains, valleys), meso (terraces, cliffs), micro (small steps), taller world |
| Small plants | dense, thin blades everywhere | 40-60% fewer, in clusters, chunkier |
| Trees | lumps of leaves, straight trunks | thicker trunks with roots and branches, layered crowns, variations |
| Buildings | clean boxes | big overhangs, uneven roofs, deep windows, beams, chimneys, extensions |
| Pause/settings UI | rounded, gradients, mobile-like | pixel font, square corners, thin borders, blue + yellow |
| Minimap | large, heavy shadow | slightly smaller, light border, clearer terrain |

## E. Implementation order

0. A controlled master benchmark scene (`?benchmark`): a hand-designed patch of
   land with player, NPC, grass, hill, cliff, 3 tree types, flowers, house,
   water, rock formation, enemy, a weapon and an armour set.
1. Camera + character scale
2. Lighting + ambient occlusion (+ subtle colour grading)
3. Terrain palette
4. Terrain generation
5. Vegetation + trees
6. Character proportions (+ simpler faces, NPCs on the same rules)
7. Buildings
8. HUD / UI (pause menu, settings, minimap)

After each phase: build, open the benchmark and the normal game, check that
movement, combat and menus still work.

## Result (all 8 phases done)

Benchmark screenshots after each phase are in `docs/benchmark/`
(`phase0-before.jpg` ... `phase7-village.jpg`).

| Phase | What changed | Main files |
|---|---|---|
| 0 | Hand-designed master benchmark (`?benchmark`, `?benchmark&bare`) | `world/BenchmarkGenerator.js`, `data/benchmark.js` |
| 1 | Camera fov 58, distance 8, flatter, damping; characters 12% bigger | `ThirdPersonCamera.js`, `data/world.js`, `humanoid.js` |
| 2 | AO on models + stronger terrain AO + GTAO pass; colour grading; warmer sun | `VoxelGrid.js`, `GreedyMesher.js`, `core/PostEffects.js`, `data/sky.js` |
| 3 | Six-shade grass palette (moisture, height, slope, noise) | `world/grassPalette.js`, `voxelMaterials.js`, `DetailMeshes.js` |
| 4 | Macro / meso / micro terrain, taller world (96) | `WorldGenerator.js`, `data/world.js` |
| 5 | New trees (oak, tall, blossom, pine), groves, clustered chunkier plants | `world/trees.js`, `groundDetails.js` |
| 6 | Chunkier bodies, layered hair, simple faces, NPCs on the same rules | `humanoid/body.js`, `hair.js`, `face.js`, `villagerModel.js` |
| 7 | Steep overhanging roofs, hoods, chimneys, back sheds | `world/houseShapes.js` |
| 8 | Pixel-style pause/settings, square UI, smaller minimap | `GameScreens.js`, `menu.css`, `title.css`, `hud.css` |

Performance at 1280 x 800: chunk build about 13 + 14 ms (in workers),
drawing with effects about 10-16 ms per frame. The effects' cost can be lowered
in `core/PostEffects.js` (`aoResolution`, `maxPixelRatio`).
