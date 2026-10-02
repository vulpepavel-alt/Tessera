// What villagers say. {village} is replaced with the village name and {dir}
// with a direction (north, south-east...). All text is original.

export const DIALOGUE = {
  greeting: [
    'Good day, traveller!',
    'Welcome to {village}!',
    'Ah, a new face. Welcome, welcome!',
    'Lovely weather for wandering, isn\'t it?',
    'A Cartographer? In {village}? How exciting!',
  ],
  villager: [
    'They say the crystals by the rifts hum at night.',
    'My grandmother swore she saw a Light Core glowing in the hills once.',
    'Bramblehogs keep digging up our fields. Nasty, thorny things.',
    'An old cartographer passed through here years ago. Never came back.',
    'Fall into a rift and the clouds carry you home. Mostly in one piece.',
    'Long ago, bridges of pure light crossed every rift. Then they faded.',
    'Travellers speak of old ruins somewhere to the {dir}.',
    'The Kingdom of Velmora ruled these meadows, before the land cracked.',
    'If you see a boar glowing red, jump aside. Trust me.',
    'The well water is the sweetest in the whole region.',
    'My cousin lives to the {dir}. Says the snow there never melts.',
    'Nobody remembers who built the crystal spires. Not even the elders.',
  ],
  night: [
    'It\'s late. Monsters grow bold after dark.',
    'You should find a warm bed, traveller.',
    'Hear that? Something is prowling beyond the fields.',
  ],
  weaponsmith: [
    'Fine blades, fresh from the forge! Trading opens soon.',
    'A dull blade is a dangerous friend.',
    'Bring me ore from the hills and I\'ll make you something special. One day.',
  ],
  armorer: [
    'Good armour is a traveller\'s best friend.',
    'I\'ll have plates and helmets for you soon, I promise.',
    'That gear of yours has seen better days.',
  ],
  merchant: [
    'Potions, pet food, maps... well, soon!',
    'Everything a Cartographer needs. Almost everything.',
    'Gold talks, friend. Come back with some.',
  ],
  guildmaster: [
    'Welcome to the Guild Hall. Let me show you the paths of your craft.',
  ],
  guard: [
    'All quiet here. Let\'s keep it that way.',
    'Stay out of trouble in {village}.',
    'The night watch never sleeps. Well. Rarely.',
  ],
  // Lines villagers say to nobody in particular while you walk by.
  chatter: [
    'Has anyone seen my goat?',
    'The wheat is coming in nicely this year.',
    'Rain soon. I can smell it.',
    'Did you hear about the Fierce boars at night?',
    'My back aches from the fields...',
    'Hmm, hmm, hmmm...',
    'Fresh bread! Well, tomorrow.',
    'Lovely day for it.',
  ],
};

export const DIRECTIONS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
