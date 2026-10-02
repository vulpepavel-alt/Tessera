// Keeps track of the time of day and works out what the sky should look like.

import * as THREE from 'three';
import { DAY, SKY_KEYFRAMES } from '../data/sky.js';

const KEYS = SKY_KEYFRAMES.map((k) => ({
  ...k,
  top: new THREE.Color(k.top),
  horizon: new THREE.Color(k.horizon),
  light: new THREE.Color(k.light),
}));

export class DayNight {
  constructor(day = 1, hour = DAY.startHour) {
    this.day = day;
    this.hour = hour;
    this.frozen = false; // the menu background keeps a fixed time
    this.look = {
      top: new THREE.Color(), horizon: new THREE.Color(), light: new THREE.Color(),
      lightIntensity: 1, ambient: 1, stars: 0,
      sunDirection: new THREE.Vector3(), lightDirection: new THREE.Vector3(),
    };
    this.computeLook();
  }

  update(dt) {
    if (this.frozen) return;
    this.advance((dt / DAY.lengthSeconds) * 24);
  }

  advance(hours) {
    this.hour += hours;
    while (this.hour >= 24) {
      this.hour -= 24;
      this.day += 1;
    }
    this.computeLook();
  }

  get isNight() {
    return this.hour >= DAY.nightStart || this.hour < DAY.nightEnd;
  }

  // "DAY 3  TIME 14:05"
  get clockText() {
    const h = Math.floor(this.hour);
    const m = Math.floor((this.hour - h) * 60);
    return `DAY ${this.day}  TIME ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  computeLook() {
    // Find the two keyframes around the current hour and blend them.
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].hour <= this.hour) i++;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const t = (this.hour - a.hour) / (b.hour - a.hour);
    const look = this.look;
    look.top.copy(a.top).lerp(b.top, t);
    look.horizon.copy(a.horizon).lerp(b.horizon, t);
    look.light.copy(a.light).lerp(b.light, t);
    look.ambient = a.ambient + (b.ambient - a.ambient) * t;
    look.stars = a.stars + (b.stars - a.stars) * t;

    // The sun rises in the east (+X) at 06:00, is highest at 12:00 and sets at 18:00.
    const angle = ((this.hour - 6) / 12) * Math.PI;
    look.sunDirection.set(Math.cos(angle), Math.sin(angle), 0.35).normalize();
    // The light comes from the sun by day and from the moon (opposite side) by night.
    const sunUp = look.sunDirection.y > 0;
    look.lightDirection.copy(look.sunDirection).multiplyScalar(sunUp ? 1 : -1);
    // Fade the light out near sunrise/sunset, when it switches between sun and moon.
    const height = Math.abs(look.sunDirection.y);
    look.lightIntensity = (a.lightIntensity + (b.lightIntensity - a.lightIntensity) * t) * Math.min(1, height / 0.15);
  }
}
