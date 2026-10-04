# Classic-feel overhaul: audit (phase 1)

Reference: classic Cube World (alpha first, release where the alpha is unknown).
Rule: match the experience; every model, texture, UI asset and line of code
is TESSERA's own (nothing from the game's files is imported or extracted).

## What the classic game does (research notes)

Sources: the community wiki (Controls, Stamina, Mana, Warrior, Ranger,
Rogue, Mage, Rarity, Inventory, Experience pages), picroma.com (Features >
Combat / Classes), alpha gameplay screenshots and video thumbnails.

- **Controls**: WASD (strafe, never turn), Space jump, LMB normal attack, RMB
  special attack, MMB dodge, scroll zoom, Shift *walk* (no sprint button),
  Ctrl *hold to climb*, G use the glider / boat, E pick up, R interact,
  B / I inventory, M map, 1-4 skills, Q quick item (potion), V toggle all HP
  bars (off by default), F1 help. No target lock: you aim with a crosshair.
- **Stamina**: only for dodging (25% per dodge), climbing and the glider.
  The bar is hidden while full.
- **Mana (MP)**: one bar for every class. Warriors, rangers and rogues fill it
  with normal hits; mages refill it constantly. The special attack (RMB) is
  *charged* by holding (the bar turns pink as MP is committed) and spends the
  MP for a strong hit (warriors can knock down). Rogue specials are instant.
- **Combos**: one-handed weapons a quick 2-hit combo; two-handed weapons a
  slower 3-hit combo ending in an uppercut that can knock down. Daggers and
  fists are very fast. Bows shoot quickly; mages throw fast bolts.
- **Skills**: a few per class; most cost stamina instead of mana and have no
  cooldown; the specialization skill (R) has a cooldown (20-30 s).
- **Progression**: XP from kills, automatic level ups, items dropped by
  monsters (E to pick up), rarity colours white / green / blue / purple /
  yellow, gold coins.
- **HUD**: small portrait with name, level and class top-left; HP and XP bars;
  HP and MP bars and a small hotbar (M1, M2, 1-4, Q) bottom centre; time,
  temperature, region name and the tilted 3D minimap top-right; item and
  loot messages bottom-left; "N HITS" combo counter; damage numbers; a
  crosshair; enemy name + level + bar only when relevant.

## Decisions per system

| System | Files | Decision | Why |
|---|---|---|---|
| Engine, renderer, effects | core/Engine.js, core/PostEffects.js | KEEP | Just optimised; all effects kept |
| Voxel models | models/VoxelGrid.js | KEEP | Shared by everything |
| Character assembler, head, hair, body | models/humanoid*, data/characterSpec.js | MODIFY | Proportions mostly right; feet too long, faces/hair to check |
| Races | data/races.js | KEEP | Already the classic 8 + Foxkin |
| Appearance data | data/appearance.js | MODIFY | Creator shows only classic options; extras stay under "more" |
| Character creator | ui/CharacterCreator.js | MODIFY | Main panel = RACE, GENDER, CLASS, FACE, HAIRCUT, HAIR COLOR |
| Classes | data/classes.js | MODIFY | Unified MP resource |
| Movement | entities/Player.js, PlayerMotor.js, data/player.js | MODIFY | No sprint (Shift walks), hold Ctrl to climb, G glider/boat, free swimming, MMB/F dodge (Q = quick item: potion) |
| Camera | core/ThirdPersonCamera.js | MODIFY | Remove lock-on swing; tune framing |
| Lock-on | combat/TargetLock.js | REMOVE | The classic game has no target lock |
| Player attacks | combat/PlayerCombat.js, data/combat.js | REWRITE | 2-hit / 3-hit combos, MP gain on hit, held RMB charge special |
| Skills | combat/SkillSystem.js, data/skills.js | MODIFY | 1/2 cost stamina, R = spec skill with cooldown; no ultimate charge |
| Combat referee | combat/CombatSystem.js | MODIFY | Hit position for numbers, knockdown |
| Damage numbers, enemy bars | ui/WorldLabels.js | MODIFY | Numbers at impact; bars only when relevant, V toggles all |
| HUD | ui/GameHud.js, hud.css | MODIFY | Classic layout; stamina bar hidden while full; real XP |
| Inventory | game/Inventory.js, ui/InventoryWindow.js | MODIFY | B / I opens it; levels and stats on items |
| Progression (XP, levels) | (fake numbers in the HUD) | REWRITE | Real XP from kills, level ups |
| Loot | (none) | ADD (required) | Items and coins dropped by enemies, picked up with E |
| Enemies | entities/Enemy.js, data/enemies.js, models/creature* | MODIFY | Same voxel kit for all; rebalance health |
| Villagers, villages | entities/Villager.js, game/VillageLife.js, world/Village* | KEEP / MODIFY | Same body system as the player; check scale |
| Guild Hall (spec switching) | ui/GuildPanel.js | KEEP | Classic: class trainers switch specialization |
| World shape, biomes | world/WorldGenerator.js, data/biomes.js | MODIFY | Readable biomes |
| Rifts, cloud sea, crystal spires | world/CloudSea.js + parts of the generator | REMOVE | TESSERA's own idea, not part of the classic world |
| Trees, ground details | world/trees.js, groundDetails.js, DetailMeshes.js | MODIFY | Classic chunky crowns; restrained grass |
| Glider, boat | models/travelModels.js, entities/Boat.js | KEEP (rebind to G) | Classic special items |
| Minimap, chat log, particles, sounds | ui/Minimap.js, ui/ChatLog.js, effects/*, audio/Sfx.js | KEEP | |
| Saves, settings | save/* | KEEP | Old saves keep loading |
| Dev pages (?lineup, ?benchmark) | game/LineupScene.js, world/BenchmarkGenerator.js | KEEP | Comparison tools |

## Outcome (phases 2-10)

| Phase | Result |
|---|---|
| 2 Proportions | Big head, short body, floating hands and feet; 6 faces, hair and colour picker |
| 3 Camera / movement | Always run (Shift walks), MMB/F dodge (Q = quick item: potion), hold Ctrl to climb, G glider/boat |
| 4 Combat | No target lock; MP for every class, hold right click to charge the special, 2/3-hit combos |
| 5 HUD | Pixel damage numbers, health bars only when it matters (V shows all) |
| 6 Messages | Kills, XP, loot and saves go to the message log; pixel defeat screen |
| 7 Enemies | 15 rebuilt creatures, 3+ per biome with charge/lunge/hop attacks |
| 8 World scale | Lower terraces, sparser forests, giant oaks |
| 9 Progression | XP and levels (+12% health, +9% damage per level), gold, gear drops by area level with rarity rolls |
| 10 Balance | Armour now softens hits (100 / (100 + 2.5 x armour)); about 10-25 kills per level; NaN-proof camera and player rescue; creator pedestal needs flat ground out to the camera |

Balance check (same-level player and monsters, area-tier gear): 2-5 hits to
kill a monster, 7-15 hits for monsters to kill you (12-19 with armour).
