# Design reference: the classic voxel adventure, system by system

Studied from the official site ([picroma.com](https://picroma.com/)) and community guides
([Cube World Wiki](https://cubeworld.fandom.com/wiki/How_to_play_guide_for_Cube_World),
[Key Items](https://cubeworld.fandom.com/wiki/Key_Items)). Tessera follows the same **systems**
one-to-one, with **original names, models and text**. The right column says where each one is.

## Classes and specializations

| Original system | Tessera | Status |
|---|---|---|
| 4 classes, 2 switchable specializations each, chosen at a guild hall | 4 classes (Bulwark, Windstrider, Starweaver, Shade); specs at a class trainer / **Guild Hall** in villages, switchable for gold | specs: next round |
| Heavy-armour melee class with 7 weapon types (one-handed sword, axe, mace, shield, two-handed sword, axe, mace) | Bulwark: sword, axe, mace, shield, greatsword, greataxe, greatmace | starter sword done; other types with loot |
| Ranged class with 3 weapon types (bow, crossbow, boomerang) | Windstrider: bow, crossbow, boomerang | bow done |
| Caster with 3 implements (bracelets, staff, wand); fire or water spec | Starweaver: bracelets, staff, wand; Emberheart (fire) / Tidecaller (water) | wand done |
| Fast melee with 3 weapon types (daggers, fists, longsword); two specs | Shade: daggers, fist weapons, longsword; Nightblade / Mistdancer | daggers done |
| Light / medium / heavy armour by class | Starweaver light, Windstrider & Shade medium, Bulwark heavy | with loot |

## Combat

| Original system | Tessera | Status |
|---|---|---|
| Aim with a crosshair; dodge roll; manage mana and stamina | crosshair, Q roll with i-frames, resources, stamina | done |
| Stun attacks that immobilise enemies | stun on heavy attacks / skills | skills round |
| A combo counter: consecutive hits lower enemy armour and raise damage | combo counter on the HUD, bonus damage per hit | skills round |
| Each specialization plays differently | two skills + ultimate per spec | skills round |

## Progression and loot

| Original system | Tessera | Status |
|---|---|---|
| Start with only a weapon; gear is found, bought or crafted | start in simple clothes with a basic weapon | **done** |
| Five rarity colours (white, green, blue, purple, yellow) | Common white, Uncommon green, Rare blue, Epic purple, Legendary orange (our spec) | loot round |
| Artifacts boost travel skills (gliding, sailing, climbing, swimming, riding...) | artifacts in dungeons and castles | dungeon round |
| Gear tied to a region; "+" gear works in nearby regions | levels + biome level ranges instead (our spec), "+" bonus gear as a rarity bonus | loot round |
| Character sheet: weapon/armour level, hit points, attack power, armour, resistance, critical, haste, regeneration, mana generation, travel skill speeds | same stat list on the Character screen (C) | loot round |
| Equipment slots: two weapons, two rings, neck, shoulder, chest, hands, feet, pet | weapon (+ off-hand), helmet, shoulders, chest, gloves, boots, two rings, amulet, pet | loot round |
| Vendors buy and sell; gems/ore traded for gold | weaponsmith, armorer, merchant stalls already in villages | loot round |

## Exploration

| Original system | Tessera | Status |
|---|---|---|
| Voxel world map you can zoom and scroll, with your own markers and travel history | full-screen 3D map (M) with markers | map round |
| Minimap as a small 3D relief that turns with you | 3D diorama minimap | **done** |
| Free questing: discover shrines of life, settlements, towers, dungeons | villages done; shrines, watchtowers, ruins, dungeons, castles | world round |
| Teleport between discovered shrines; eagle flights between towns | **Waystones** (teleport) and **sky-gliders**: hire a giant bird at a village perch | map round |
| Special items unlock travel: hang glider, boat, reins (ride pets), harp (opens doors), climbing spikes, lamp | glider, boat, climbing (done as abilities); reins, lamp, harp-like key item as found items | later rounds |
| Rideable pets; pets tamed with specific food fight with you | pet taming | pets round |

## Living world and UI

| Original system | Tessera | Status |
|---|---|---|
| Villages with vendors, trainers, quest givers with speech bubbles | villages, vendors, bubbles, chat log | done (quests later) |
| Clean pixel-font HUD: portrait, small HP/XP bars, bars at the bottom, hotbar, message log | same layout | **done** |
| Crafting: equipment, potions, elixirs, food with buffs | forge, alchemy table, kitchen, loom | crafting round |
| Online co-op | not planned (single player, saves on your computer) | — |
