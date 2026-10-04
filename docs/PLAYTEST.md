# Full play-test (automatic), October 2026

Run with the dev tool `src/dev/playtest.js` (it drives the real game: keys,
aiming, dodging, potions). A Warrior was played from a new character to level
60 through every land; Ranger, Mage and Rogue were played to levels 10-30.

## Route

| Level | Land | What was done |
|---|---|---|
| 1 | Amber Meadows | new game (spawn in village), slime, boar, wolf, goblin; shop (buy treat + potion, sell); tame a wolf; ride it |
| 5-10 | Amber Meadows | monsters; Thornback Matriarch (boss); meadow crypt (3+3 guards, Warden) |
| 15-20 | Crystalfrost Forest | monsters; Frostfang Alpha; frost crypt |
| 25-30 | Copper Dunes | monsters; Dune Tyrant; sandstone crypt |
| 35-40 | Lantern Marsh | monsters; Mire Ancient; marsh crypt |
| 45-50 | Stormspire Peaks | monsters; Storm Colossus (won the first time: hard, as meant); peak crypt |
| 55-60 | Stormspire Peaks | monsters; level cap |
| 60 | everywhere | weaponsmith stock, glider, swimming, boat, death and respawn, save, world map, inventory |

## Bugs found and fixed

- About 1 world in 6 had no starting village (the bigger villages failed the
  flatness test): new games started in the wild. The start village now
  searches a wide ring and takes the evenest spot if none is perfect (40/40).
- New heroes faced away from the village (camera on top of the well) and the
  guards stood on the spawn point.
- Crypt monsters walked into walls (no way round): they now follow the
  crypt's middle line through the doorways (`cryptWaypoint`).
- Dying put you back where you fell, next to what killed you: you now wake
  in the nearest village.
- At level 60 XP kept piling up; it now stops and the bar shows MAX.
- Weaponsmith / Armorer shelves were nearly empty at high levels (2 items);
  they now reach down a tier until they hold 8.
- A boss killed by something without a lair was saved as "undefined".

## Balance changes

- Normal monsters grow faster per level (health +40%, damage +32% of
  level 1 per level): same-level fights take a few seconds and hurt.
- Armour is gentler (100 / (100 + 1.2 x armour)): high-level heroes are no
  longer untouchable.
- Bosses: 5x health, 2x damage, quicker attacks (about 30 s fights, deadly
  if you never dodge). Crypt Warden 760 base health.
