// Moves a voxel character's arms, legs and body so it looks alive.
// Everything is calculated from the character's state; there are no
// pre-made animation files.
//
// Poses: running / walking, standing (breathing), in the air, dodge roll,
// swimming, climbing, gliding, sitting in a boat, and attacks.

const lerp = (a, b, t) => a + (b - a) * t;
// 0 -> 1 -> 0 over t = 0..1, peaking at `peak`.
const hump = (t, peak) => (t < peak ? t / peak : Math.max(0, 1 - (t - peak) / (1 - peak)));

export class CharacterAnimator {
  constructor(model) {
    this.model = model;
    this.walkPhase = 0;
    this.time = 0;
    this.swing = 0; // how strongly limbs swing right now (0..1), smoothed
    this.torsoY = model.parts.torso.position.y; // resting height of the body
    this.center = model.bodyCenter ?? 0.85;    // height of the body's tilt/roll point
  }

  // state: { mode, speed, verticalSpeed, walking, grounded, inWater, rolling, attack }
  update(dt, state) {
    const { parts, body } = this.model;
    this.time += dt;
    const mode = state.mode ?? 'walk';

    // Walk cycle: the phase advances with the distance covered.
    const moving = state.grounded && state.speed > 0.5;
    this.walkPhase += state.speed * dt * (state.walking ? 1.9 : 1.6);
    this.swing = lerp(this.swing, moving ? Math.min(state.speed / 6, 1.3) : 0, Math.min(dt * 10, 1));
    const s = Math.sin(this.walkPhase);
    const amount = this.swing * (state.walking ? 0.5 : 0.85);

    const pose = {
      legL: s * amount,
      legR: -s * amount,
      armL: -s * amount * 0.8,
      armR: s * amount * 0.8,
      armLz: 0,
      armRz: 0,
      lean: !state.walking && moving && state.speed > 5 ? 0.14 : 0,
      twist: 0,
      bodyY: this.center,
      bob: moving ? Math.abs(Math.cos(this.walkPhase)) * 0.05 * this.swing : Math.sin(this.time * 2) * 0.012,
    };

    if (mode === 'walk' && !state.grounded && !state.inWater) Object.assign(pose, airPose());
    if (mode === 'swim' || (mode === 'walk' && state.inWater && !state.grounded)) Object.assign(pose, this.swimPose(state));
    if (mode === 'climb') Object.assign(pose, this.climbPose(state));
    if (mode === 'glide') Object.assign(pose, { legL: 0.35, legR: 0.25, armL: -2.9, armR: -2.9, lean: 0.45, bob: 0 });
    if (mode === 'boat') Object.assign(pose, this.boatPose(state));
    if (state.attack) Object.assign(pose, attackPose(state.attack));

    const k = Math.min(dt * 18, 1); // smoothing, so poses blend instead of snapping
    parts.legL.rotation.x = lerp(parts.legL.rotation.x, pose.legL, k);
    parts.legR.rotation.x = lerp(parts.legR.rotation.x, pose.legR, k);
    parts.armL.rotation.x = lerp(parts.armL.rotation.x, pose.armL, k);
    parts.armR.rotation.x = lerp(parts.armR.rotation.x, pose.armR, k);
    parts.armL.rotation.z = lerp(parts.armL.rotation.z, pose.armLz, k);
    parts.armR.rotation.z = lerp(parts.armR.rotation.z, pose.armRz, k);
    parts.torso.rotation.y = lerp(parts.torso.rotation.y, pose.twist, k);
    // A bow in hand stays upright whatever the arm does (raised to aim, swinging while walking).
    for (const h of this.model.held ?? []) {
      if (h.hold.turn && this.model.weaponsDrawn) h.holder.rotation.x = -parts.armL.rotation.x;
    }
    parts.torso.position.y = this.torsoY + pose.bob;

    if (state.rolling >= 0) {
      // A full forward flip over the roll, tucked into a ball.
      body.rotation.x = state.rolling * Math.PI * 2;
      body.position.y = this.center * 0.7;
      parts.legL.rotation.x = parts.legR.rotation.x = -1.4;
      parts.armL.rotation.x = parts.armR.rotation.x = -1.6;
    } else {
      body.rotation.x = lerp(body.rotation.x % (Math.PI * 2), pose.lean, k);
      body.position.y = lerp(body.position.y, pose.bodyY, k);
    }
  }

  swimPose(state) {
    const p = Math.sin(this.time * (state.speed > 1 ? 7 : 4));
    return {
      legL: p * 0.5, legR: -p * 0.5,
      armL: -2.2 + p * 0.6, armR: -2.2 - p * 0.6,
      lean: state.speed > 1 ? 0.9 : 0.2, bob: 0,
    };
  }

  climbPose(state) {
    const p = Math.sin(this.time * 6) * (Math.abs(state.verticalSpeed) > 0.1 ? 1 : 0.15);
    return { legL: -0.6 + p * 0.5, legR: -0.6 - p * 0.5, armL: -2.6 + p * 0.5, armR: -2.6 - p * 0.5, lean: -0.1, bob: 0 };
  }

  boatPose(state) {
    // Sitting, rowing while the boat moves.
    const row = state.speed > 0.5 ? Math.sin(this.time * 5) * 0.5 : 0;
    return { legL: -1.45, legR: -1.45, armL: -1.1 + row, armR: -1.1 + row, lean: 0, bob: 0, bodyY: this.center * 0.7 };
  }
}

function airPose() {
  return { legL: -0.5, legR: 0.3, armL: -0.6, armR: -0.6, bob: 0 };
}

// Attack poses in three phases (spec'd per weapon by `strikeAt`):
//   anticipation  0 .. strikeAt   wind up into the `ready` pose (eased)
//   impact        at strikeAt     snap to the `hit` pose in a few frames
//   recovery      strikeAt .. 1   ease back towards neutral
// Every combo step has its own pair of poses; the last step is a finisher.
const POSES = {
  swing: [
    { ready: { armR: -2.6, armRz: 0.5, twist: -0.6, lean: -0.08 }, hit: { armR: 0.4, armRz: -0.5, twist: 0.7, lean: 0.12 } },   // forehand
    { ready: { armR: -1.5, armRz: -0.9, twist: 0.6 }, hit: { armR: -0.6, armRz: 0.9, twist: -0.75, lean: 0.1 } },                 // backhand
  ],
  swingFinisher: { ready: { armR: -3.0, armL: -2.4, lean: -0.22, bob: -0.05 }, hit: { armR: 0.5, armL: 0.3, lean: 0.38, bob: 0.03 } }, // overhead
  thrust: [
    { ready: { armR: 0.45, twist: -0.35 }, hit: { armR: -1.75, twist: 0.45, lean: 0.1 } }, // right jab
    { ready: { armL: 0.45, twist: 0.35 }, hit: { armL: -1.75, twist: -0.45, lean: 0.1 } }, // left jab
  ],
  thrustFinisher: { ready: { armR: 0.6, armL: 0.6, lean: -0.15 }, hit: { armR: -1.8, armL: -1.8, lean: 0.3 } }, // double strike
  shoot: [{ ready: { armL: -1.55, armLz: 0.1, armR: -1.5, armRz: -0.3, twist: -0.5 }, hit: { armL: -1.55, armLz: 0.1, armR: -1.05, armRz: -0.1, twist: -0.45 } }],
  cast: [{ ready: { armR: -2.8, armL: -0.4, twist: -0.2 }, hit: { armR: -1.4, armL: -1.0, twist: 0.25, lean: 0.08 } }],
  castFinisher: { ready: { armR: -3.0, armL: -2.8, lean: -0.12 }, hit: { armR: -1.3, armL: -1.3, lean: 0.2 } },
  heavy: [{ ready: { armR: -3.0, armL: -2.6, lean: -0.15 }, hit: { armR: 0.3, armL: 0.2, lean: 0.35 } }],
};

const ease = (x) => 1 - (1 - x) * (1 - x);

// attack: { kind, t (0..1), index (combo step), strikeAt, finisher }
function attackPose({ kind, t, index = 0, strikeAt = 0.45, finisher = false }) {
  const set = POSES[kind];
  if (!set) return {};
  const pair = (finisher && POSES[`${kind}Finisher`]) || set[index % set.length];
  const keys = new Set([...Object.keys(pair.ready), ...Object.keys(pair.hit)]);
  const out = {};
  for (const k of keys) {
    const ready = pair.ready[k] ?? 0;
    const hit = pair.hit[k] ?? 0;
    let v;
    if (t < strikeAt) {
      v = ready * ease(t / strikeAt);                                 // anticipation
    } else {
      const snap = Math.min(1, (t - strikeAt) / 0.07);                // impact
      const rec = (t - strikeAt) / Math.max(0.001, 1 - strikeAt);     // recovery
      v = (ready + (hit - ready) * snap) * (1 - Math.max(0, (rec - 0.35) / 0.65) ** 2);
    }
    out[k] = v;
  }
  return out;
}
