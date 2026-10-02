# Character, creator and combat audit

Goal: get TESSERA much closer to the *feel* of the classic voxel RPG reference
(proportions, voxel density, readability, animation rhythm, combat feel) while
every model, face, hairstyle, effect, animation and UI stays original.

Legend: **[S]** confirmed by a source (linked) · **[E]** my estimate from the
reference screenshot (not an official number; validated by eye in game) ·
**[T]** TESSERA today (read in the code / seen in the running game).

## 1. What TESSERA has today [T]

| Area | System |
|---|---|
| Engine | Three.js + Vite, plain ES modules (`src/core/Engine.js`), post effects (`core/PostEffects.js`) |
| Models | voxel grids built in code (`models/VoxelGrid.js`, per-corner AO, face shading) |
| Rig | rigid parts (pelvis, torso, head, arms + hands, legs + feet) and named sockets (`models/humanoid.js`, `data/characterSpec.js`) |
| Animation | procedural poses from state, no keyframe files (`entities/CharacterAnimator.js`) |
| Creator | pedestal in the world (`game/MenuScene.js`), tabs Body/Face/Hair/Clothes/Identity (`ui/CharacterCreator.js`) |
| Races | 9: Human, Elf, Dwarf, Orc, Goblin, Undead, Lizardfolk, Frogfolk, Foxkin (`data/races.js`) |
| Equipment | 8 slots, items in `data/items.js`, armour per region (`models/equipment/armor.js`), held items on hand sockets |
| Combat | weapon-based basic 3-hit combo + heavy (`combat/PlayerCombat.js`, `data/combat.js`), crits, knockback, hit-stop, screen shake, damage numbers, combo counter, class skills 1/2/R, lock-on (Tab) |
| Dodge | Q roll, 0.42 s, 0.35 s invulnerable, 20 stamina, 0.35 s cooldown (`data/player.js`) |
| Enemies | state machine patrol/chase/windup (glows red)/attack/retreat, stun/slow/root/poison (`entities/Enemy.js`) |
| Camera | third person, fov 58, distance 8, wall pull-in, damping, lock-on swing |
| Saves | localStorage slots; appearance record (schema 2) kept apart from class; old saves migrated |
| Audio | none yet |

Observed problems in the current build (screenshot of the creator):

1. Frogfolk reads as a big, almost flat yellow block on a small body: the eye domes are tiny, the mouth is a thin line low on the face, there are no cheeks, no throat, and the head sits on the shirt with no transition.
2. Heads in general: one flat front plane; corners barely cut, so the head reads as a crate.
3. The character covers only ~25% of the screen height in the creator; the background (red roofs, trees, rock wall) competes with it.
4. Dodging does not cancel an attack in progress, so a strike can still land mid-roll and the roll feels sluggish.
5. You move at full speed while attacking; attacks have one timing number (`strikeAt`) instead of readable anticipation / impact / recovery phases.
6. Every combo step except the first swing variant uses nearly the same pose; the third hit is not a real finisher.
7. Enemies flash white when hit but don't flinch or stagger; there is no sound at all.
8. Arrows and spells have no trail, so their path is hard to read.

## 2. What the references show

### Official (Picroma)

- Combat is "about aiming, dodging, managing mana and stamina"; **aim with a crosshair, there is no target-locking**; **stun** enemies with strong special attacks; **roll to dodge attacks and interrupt combos of your enemies**; **subsequent attacks increase a combo counter** that ignores more armour and deals more damage. [S] [picroma.com, Features > Combat](https://picroma.com/)
- Four classes with three weapon families each: warrior (swords, axes, maces, shields, two-handers), ranger (bows, crossbows, boomerangs), mage (bracelets, staves, wands), rogue (daggers, fists, longswords). [S] [picroma.com, Features > Classes](https://picroma.com/)
- *Note:* the official site describes the 2019 release, not the 2013 alpha. [S] [Wikipedia: alpha July 2013, release September 2019](https://en.wikipedia.org/wiki/Cube_World)

### Community wiki (secondary source, mostly the 2019 version)

- Dodge: middle mouse while moving; roll gives temporary immunity to most damage; costs 1/4 of max stamina; does nothing standing still. [S] [Cube World Wiki: Dodging](https://cubeworld.fandom.com/wiki/Dodging)
- Alpha vs release differ: abilities were skill-point based in the alpha and artifact based on Steam; climbing used Ctrl in the alpha and Shift on Steam; the R special only exists on Steam. [S] [Cube World Wiki: Abilities](https://cubeworld.fandom.com/wiki/Abilities)
- Warrior: basic hits build the resource that the special attack spends; one-handed weapons have a quick 2-hit combo, two-handers a slower 3-hit combo whose third hit is an uppercut that can knock down. (Release version.) [S] [Cube World Wiki: Warrior](https://cubeworld.fandom.com/wiki/Warrior)
- Character creation picks face, hairstyle and hair colour; the eight races include frog and lizard people, who have different eyes / scales instead of hair. [S] [Cube World Wiki (search summary)](https://cubeworld.fandom.com/wiki/How_to_play_guide_for_Cube_World)

### The alpha creator screenshot you attached [E]

- Head about **45-50%** of the standing height; head width about **1.4x** the torso width.
- Big blond hair: one mass over the top, a stepped fringe across the forehead, side locks down to the cheeks; clearly made of large steps, not flat.
- Eyes: tall, dark blue with a light glint, far apart, sitting slightly **below** the middle of the head; mouth and nose almost invisible at that distance; pink cheek/ear.
- Hands: large pink fists held out at the sides of the belly (bigger than the visible arm), boots dark and slightly wider than the legs.
- Framing: the character fills about **30-35%** of the screen height, centred; the background is bright, flat and simple.

### Gameplay video studied earlier (YouTube eEkQxN9LjuM) [E]

- Gameplay camera sits behind and a little above, the character in the lower-middle of the screen; enemies stay in view during fights.
- Attacks are short and snappy, with visible white/coloured particle bursts on hit and numbers popping up.

## 3. Concrete differences and what I change

| # | Difference | Change | Can I do it in code? |
|---|---|---|---|
| 1 | Flat crate-like heads | bevelled head silhouette (stepped corners on all edges), slightly fuller cheeks, chin step | yes |
| 2 | Eyes too small / too high for this camera | bigger eyes (2x4 tall preset), set a bit lower, stronger glint, darker brows | yes |
| 3 | Frogfolk flat | new frog head: big bulging eye domes with white, pupil and lid; wide mouth with an upper lip ledge and darker inside; puffy cheeks; pale throat and belly running from chin to chest; webbed wide hands and flipper feet; 3 variants compared, one chosen | yes |
| 4 | Head-body transition | a short neck/collar step (1 MV) in underlayer colour, chin shadow | yes |
| 5 | Creator framing | character ~40% of screen height, studio key light, background melted into soft haze, view buttons (front/profile/back), preview modes idle/walk/combat | yes |
| 6 | Dodge doesn't cancel attacks | roll cancels the current attack (recovery can always be cancelled), clear stamina rule | yes |
| 7 | One timing per attack | anticipation -> impact -> recovery phases per weapon kind, poses per phase, slowed movement while attacking | yes |
| 8 | Same-looking combo hits | distinct pose per step, real finisher on the last hit (bigger hit-stop, knockback, stagger) | yes |
| 9 | Enemies don't react | flinch + short stagger on hit, longer on finishers; a short "opening" after their attack | yes |
| 10 | No sound | small procedural sounds (Web Audio, no files): swing, hit, crit, dodge, hurt, finisher | yes |
| 11 | Projectile paths hard to read | voxel trails behind arrows and spells | yes |
| 12 | Lock-on vs free aim | keep free crosshair aiming as the default (like the reference); Tab lock-on stays as TESSERA's own option; camera widens a bit in combat | yes |
| 13 | Weapons always in hand | weapons hang on the back/hip sockets out of combat and come to the hand when you attack | yes |

## 4. What needs manual art or decisions

- Hand-made hairstyles, faces and armour sets drawn by an artist would beat
  code-built ones; the infrastructure (zones, sockets, palettes) is ready
  for them. All current assets are placeholders built in code.
- Sound: the procedural sounds are placeholders; real recorded/designed
  sounds are needed for a finished game.
- Male/female body variants (the reference has them) need a design decision:
  TESSERA uses frames (straight/soft/broad) without gender locks.
- Exact combat numbers are tuned by playing; values here are first passes.
