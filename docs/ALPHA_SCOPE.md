# Matching the classic alpha's scope

Sandra wants TESSERA to have as much as the classic voxel RPG alpha: as many
races, looks, weapons, armour and creatures. This file records the SCOPE
(counts and categories) read from the list of contents of her local copy of
the alpha, and how far TESSERA has got.

Rule: only the scope is matched. Every model, picture, sound and name in
TESSERA is our own, built in code. Nothing from the alpha's files is copied,
converted or shipped. Generic things (a wolf, a cow, a sword) are fine;
the alpha's invented creature and place names are not used.

## 1. Playable characters

| | Alpha | TESSERA now |
|---|---|---|
| Races | 8 (human, elf, dwarf, orc, goblin, undead, frog people, lizard people) | 9 (the same 8 kinds + Foxkin) |
| Gender choice | yes (male / female) | yes, from this round (affects which faces and hairstyles are offered first) |
| Faces per race | about 6 per gender (12 per race) | 14 shared face presets + race features |
| Hairstyles per race | about 10-23 per race (human: 15 + 7) | 17 shared styles (+ race rules) |
| Hair colours | a rainbow grid | 20+ palettes |
| Classes | 4 | 4 |

## 2. Equipment

| | Alpha | TESSERA now |
|---|---|---|
| Slots | 2 weapons, 2 rings, neck, chest, shoulders, hands, feet, pet (+ helmets) | 11 (head, face, chest, shoulders, hands, waist, legs, feet, back, 2 weapons) |
| Cloth/armour materials | linen, wool, silk, satin, iron, silver, gold, obsidian, bone | cloth, leather, chain, iron, steel, runed, sunforged, hunter, shadow, silk, arcane... |
| Weapon kinds | ~17: sword, longsword, greatsword, saber, axe, greataxe, mace, greatmace, dagger, fist, shield, bow, crossbow, boomerang, staff, wand, bracelet | 13 before this round; the missing kinds are added this round |
| Shape variants | 5 random shapes per weapon kind and material | 1 per kind before this round; 5 variants per kind from this round |
| Jewellery | rings and amulets | not yet |
| Pets | yes | not yet |

## 3. Creatures and NPCs (about 95 kinds in the alpha)

Animals (farm and wild), beetles and insects, slimes, undead, giants and
trolls, golems, desert and snow creatures, sea creatures, dragons, and
village people (shepherds, wizards, witches...).

| Group | Alpha (approx.) | TESSERA now |
|---|---|---|
| Wild animals | ~25 (wolf, panther, bunny, squirrel, crow, owl, ...) | wolf, boar |
| Farm animals | ~8 (cow, sheep, pig, chicken, alpaca, pony, ...) | none (planned) |
| Slimes and blobs | yes | Meadow Slime |
| Beetles and insects | ~10 | none (planned) |
| Undead | ~6 (skeleton, zombie, ghost, lich, vampire...) | none (planned) |
| Big humanoids | ~10 (troll, ogre, cyclops, minotaur, yeti...) | none (planned) |
| Golems and elementals | ~4 | none (planned) |
| Sea / desert / snow creatures | ~15 | none (planned) |
| Dragons and bosses | a few | none (planned) |
| Village people | shepherds, wizards, witches, nomads... | villagers, guards, merchants, guildmaster |

Creatures are added biome by biome, at least three per biome, built with the
creature kit (models/creatureModels.js) at the character cube size.
