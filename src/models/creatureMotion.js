// How creatures move (see models/creatureModels.js). Each function gets the
// model, what the creature is doing and the time, and poses the parts.
//   state = { speed, windup (about to attack), charging (attacking), dead }

// Four legs: a trot (diagonal legs together), the head bobbing, the tail
// wagging; a shiver with the head down before charging; tipping over when dead.
export function animateQuadruped(model, state, time, dt) {
  const { parts, body } = model;
  const k = Math.min(dt * 14, 1);
  const stride = Math.min(state.speed / 4, 1.4);
  const s = Math.sin(time * (6 + state.speed * 1.2)) * 0.7 * stride;
  parts.legFL.rotation.x += (s - parts.legFL.rotation.x) * k;
  parts.legBR.rotation.x += (s - parts.legBR.rotation.x) * k;
  parts.legFR.rotation.x += (-s - parts.legFR.rotation.x) * k;
  parts.legBL.rotation.x += (-s - parts.legBL.rotation.x) * k;
  parts.head.rotation.x = Math.sin(time * 3) * 0.05 + (state.windup ? 0.35 : 0);
  if (parts.tail) parts.tail.rotation.z = Math.sin(time * (state.speed > 1 ? 14 : 4)) * 0.35;

  let lean = 0;
  let y = Math.abs(Math.sin(time * (6 + state.speed))) * 0.03 * stride;
  if (state.windup) {
    lean = 0.15; // head down, ready to charge
    body.position.x = Math.sin(time * 60) * 0.03; // shiver
  } else {
    body.position.x = 0;
  }
  if (state.charging) lean = 0.25;
  if (state.dead) {
    body.rotation.z += (Math.PI / 2 - body.rotation.z) * Math.min(dt * 6, 1);
    y = 0;
  }
  body.rotation.x += (lean - body.rotation.x) * k;
  body.position.y = y;
}

// A jelly blob: little hops while it moves, a squashed wobble at rest, a deep
// squash before it leaps at you, stretched tall in the air, flat when dead.
export function animateBlob(model, state, time, dt) {
  const { body } = model;
  const k = Math.min(dt * 12, 1);
  let sy = 1 + Math.sin(time * 5) * 0.04; // breathing wobble
  let y = 0;
  if (state.speed > 0.5) {
    const hop = Math.abs(Math.sin(time * 7));
    y = hop * 0.25;
    sy = 0.88 + hop * 0.24;
  }
  if (state.windup) sy = 0.7 + Math.sin(time * 40) * 0.03; // squash down, trembling
  if (state.charging) sy = 1.25;
  if (state.dead) {
    sy = 0.25;
    y = 0;
  }
  const s = body.scale.y + (sy - body.scale.y) * k;
  body.scale.set(1 + (1 - s) * 0.5, s, 1 + (1 - s) * 0.5); // what it loses in height it gains in width
  body.position.y = y;
}
