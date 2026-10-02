// Moves a voxel character's arms, legs and body so it looks alive.
// Everything is calculated from the character's state; there are no
// pre-made animation files.
//
// Poses: walking / sprinting, standing (breathing), in the air, dodge roll,
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

  // state: { mode, speed, verticalSpeed, sprinting, grounded, inWater, rolling, attack }
  update(dt, state) {
    const { parts, body } = this.model;
    this.time += dt;
    const mode = state.mode ?? 'walk';

    // Walk cycle: the phase advances with the distance covered.
    const moving = state.grounded && state.speed > 0.5;
    this.walkPhase += state.speed * dt * (state.sprinting ? 1.5 : 1.9);
    this.swing = lerp(this.swing, moving ? Math.min(state.speed / 6, 1.3) : 0, Math.min(dt * 10, 1));
    const s = Math.sin(this.walkPhase);
    const amount = this.swing * (state.sprinting ? 0.9 : 0.65);

    const pose = {
      legL: s * amount,
      legR: -s * amount,
      armL: -s * amount * 0.8,
      armR: s * amount * 0.8,
      armLz: 0,
      armRz: 0,
      lean: state.sprinting && moving ? 0.18 : 0,
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

// attack: { kind, t (0..1 progress), index (combo step) }
function attackPose({ kind, t, index = 0 }) {
  const h = hump(t, 0.35);
  switch (kind) {
    case 'swing': {
      // Wind up high, then cut down and across. Each combo step swings differently.
      const side = index === 1 ? -1 : 1;
      const raise = t < 0.35 ? -2.4 * (t / 0.35) : lerp(-2.4, 0.5, (t - 0.35) / 0.65);
      return { armR: raise, armRz: index === 2 ? 0 : side * 0.6 * h, twist: side * (t < 0.35 ? -0.5 : 0.6) * h };
    }
    case 'thrust':
      // Quick stabs, alternating hands.
      return index % 2 === 0
        ? { armR: -1.6 * h - 0.2, twist: 0.4 * h }
        : { armL: -1.6 * h - 0.2, twist: -0.4 * h };
    case 'shoot':
      // Bow arm forward, the other pulls the string back, then releases.
      return { armL: -1.55, armLz: 0.1, armR: t < 0.6 ? -1.5 : -1.2, armRz: -0.2, twist: -0.5 };
    case 'cast':
      // Staff raised forward, then pushed toward the target.
      return { armR: t < 0.4 ? -2.6 : -1.5, armL: -0.8 * h, twist: 0.2 * h };
    case 'heavy':
      // Big overhead slam with both arms.
      return {
        armR: t < 0.55 ? lerp(0, -3, t / 0.55) : lerp(-3, 0.3, (t - 0.55) / 0.45),
        armL: t < 0.55 ? lerp(0, -2.6, t / 0.55) : lerp(-2.6, 0.2, (t - 0.55) / 0.45),
        lean: t < 0.55 ? -0.15 : 0.35 * hump((t - 0.55) / 0.45, 0.3),
      };
    default:
      return {};
  }
}
