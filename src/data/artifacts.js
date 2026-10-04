// Artifacts: rare treasures guarded by crypt Wardens and bosses. Each one
// makes a way of travelling a little better, forever (they stack). Kept in
// the save as counts: { glide: 2, boat: 0, ... }. Names are our own.

export const ARTIFACTS = {
  glide: { name: 'Wind Feather', what: 'gliding speed', icon: 'feather' },
  boat: { name: 'Seastone', what: 'sailing speed', icon: 'seastone' },
  climb: { name: "Climber's Grip", what: 'climbing speed', icon: 'grip' },
  swim: { name: 'Tidal Scale', what: 'swimming speed', icon: 'scale' },
  ride: { name: 'Saddle Charm', what: 'riding speed', icon: 'charm' },
};

export const ARTIFACT_BONUS = 0.05; // +5% per artifact of a kind

// A random kind (bosses and Wardens give one each).
export function randomArtifact(rand = Math.random) {
  const kinds = Object.keys(ARTIFACTS);
  return kinds[Math.floor(rand() * kinds.length)];
}

// The travel multipliers from a set of counts.
export function artifactBonus(counts = {}) {
  return Object.fromEntries(Object.keys(ARTIFACTS).map((k) => [k, 1 + (counts[k] ?? 0) * ARTIFACT_BONUS]));
}

// Bosses and Wardens guard an artifact: straight into your collection.
export function giveArtifact(player, onMessage) {
  const kind = randomArtifact();
  player.addArtifact(kind);
  const a = ARTIFACTS[kind];
  onMessage(`You found a ${a.name}! Your ${a.what} is now +${Math.round((player.bonus[kind] - 1) * 100)}%.`);
}
