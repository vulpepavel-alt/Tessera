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

## 5. What was implemented (and verified in the running game)

Comparison images: `docs/comparisons/` (00/01 before, 02-14 after).

| Change | Files | Verified how |
|---|---|---|
| Bevelled heads, bigger lower eyes, deeper torso/pelvis, collar step | `models/humanoid/head.js`, `body.js`, `data/characterSpec.js` | `?lineup&focus=human,frogfolk` front/side/back/3-4 + perspective close-ups |
| Frogfolk rebuilt: 3 eye designs tested (dome chosen, side + ridge selectable), lip, nostrils, cheeks, pale throat, webbed hands, flipper feet | `head.js`, `body.js`, `data/races.js` | `?lineup&focus=frogfolk:dome,frogfolk:side,frogfolk:ridge` |
| Chunky 2x2 hair tufts | `models/humanoid/hair.js` | close-up |
| Creator: bigger hero, studio lights, hazed background, FRONT/SIDE/BACK, IDLE/WALK/COMBAT previews, frog eye chooser | `game/MenuScene.js`, `ui/CharacterCreator.js` | screenshots 08-09; all options saved and reloaded (checked the save JSON and the loaded player) |
| Face / shoulders / waist slots; weapons sheathed on back or hip out of combat | `data/items.js`, `models/equipment/*.js`, `entities/Player.js`, `game/Battle.js` | lineup 10, sheathed/drawn 11-12 |
| Attack phases, distinct combo poses, finisher, slow movement while attacking, lunge | `entities/CharacterAnimator.js`, `combat/PlayerCombat.js`, `data/combat.js` | live fight: finisher logged ("26 FIN"), screenshot 13 |
| Dodge cancels attacks | `combat/PlayerCombat.js` | attacking before roll = true, after = false |
| Enemy flinch, stagger (breaks wind-up), winded recovery window | `entities/Enemy.js`, `data/enemies.js` | states seen: windup*, attack*, recover |
| Sounds (Web Audio) | `audio/Sfx.js`, `game/Game.js` | code paths run without errors; **not heard** (the test browser has no audio output) |
| Projectile trails, arrows at character cube size | `effects/Particles.js`, `combat/Projectile.js` | arrow fired; trail is small at gameplay distance |
| Combat camera pull-back | `core/ThirdPersonCamera.js` | `inCombat` true next to an angry enemy |

Spec changes (documented in `data/characterSpec.js`): torso 8 deep (spec 6),
pelvis 7 deep (spec 6), every head edge bevelled (spec: corners only), hands 4,
feet 5x2x7 (frog flippers 6x2x8, webbed hands 5x3x5).

## 6. Not verified / remaining work

- **Sound** was not listened to; volumes and timbres need a human ear.
- **Combat numbers** (phases, lunge, stagger, recovery) are first passes,
  tested against one enemy type; they need play-testing per class.
- **Creatures**: the Bramblehog still uses 0.1 cubes; it and all future
  creatures should be re-authored at the character cube size (0.0625).
- **Art to make by hand** (the systems are ready for it): more hairstyles
  and faces, armour sets per material, weapon families from the reference
  (boomerangs, bracelets, fist weapons, greataxes, greatmaces), creature
  models, real sound effects.
- Only one enemy type exists, so "enemy reactions" are tested on it alone.

## 7. Proportions pass (from a dev-only reference model)

A fan-made model of the classic look (a `.blend` file, used **only as a
visual / proportion reference**: it lives in the git-ignored `reference/`
folder, is never shipped, and nothing from it is copied into the game) was
measured with a small script and shown beside our characters in
`?lineup&reference&focus=human,frogfolk` (dev only).

What it showed [measured, then scaled to our 32 MV height]:

| Part | Reference (its units) | TESSERA before | TESSERA now (MV) |
|---|---|---|---|
| Head | 10 x 8 x 8, as wide as the body | 14 x 14 x 12, 1.4x wider than the torso | 16 x 13 x 13 |
| Body | one block 10 x 9 x 7-8 | torso 10 x 8 x 8 + pelvis 8 x 3 x 7 | torso 14 x 9 x 11 + belt band 14 x 2 x 11 |
| Arms | none: hands float beside the belly | 3 x 7 x 3 arms | none (an invisible shoulder joint swings the hand) |
| Hands | 5 x 4 x 6, sticking out in front | 4 x 4 x 4 | 7 x 6 x 8, 3 MV forward |
| Legs | hidden under the robe | 4 x 7 x 4 | 6 x 5 x 7 (short) |
| Feet | 5 x 3 x 8, big | 5 x 2 x 7 | 7 x 4 x 12, higher at the ankle |
| Eyes | just below the middle of the head | middle | just below the middle (face grid margins 2 / 1) |

Everything that depended on the old sizes now reads them from
`data/characterSpec.js` (head, hair, headgear, body, armour, hats, goggles,
robe skirt, shoulder pads, capes, backpacks). The head grid is 4 cubes wider
each side so big goblin ears fit. The creator camera was pulled back a little.

Checked in: the reference lineup, the full `?lineup` (all classes start to
legendary, all races, villagers), the creator (front/side, combat preview:
the fists punch forward without arms) and the running game.
Not changed: hairstyles keep their designs (the reference's big hair mass is
one style choice, not a rule); starter characters still have bare feet.
