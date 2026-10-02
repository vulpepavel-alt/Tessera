// Text and bars that float over things in the 3D world: damage numbers,
// enemy health bars, speech bubbles and name tags. Each frame we work out where a
// 3D point lands on the screen ("projecting" it) and move the label there.

import * as THREE from 'three';
import './labels.css';
import { el } from './dom.js';

const NUMBER_LIFE = 0.9; // seconds a damage number stays visible
const BAR_RANGE = 40;    // health bars are hidden beyond this distance
const tmp = new THREE.Vector3();

export class WorldLabels {
  constructor(camera) {
    this.camera = camera;
    this.root = el('div', { class: 'world-labels' });
    this.crosshair = el('div', { class: 'crosshair' });
    this.root.append(this.crosshair);
    document.body.appendChild(this.root);
    this.numbers = [];
    this.bars = new Map(); // enemy -> { root, fill }
    this.bubbles = new Map(); // speaker -> { node, time }
    this.tags = new Map();    // villager -> name tag node
  }

  setVisible(visible) {
    this.root.style.display = visible ? '' : 'none';
  }

  // style: 'damage' | 'crit' | 'player' | 'heal' | 'info'
  number(position, text, style = 'damage') {
    const node = el('div', { class: `float-number ${style}` }, text);
    this.root.append(node);
    this.numbers.push({
      node, age: 0,
      pos: position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6)),
    });
  }

  addBar(enemy) {
    const fill = el('div', { class: 'enemy-bar-fill' });
    const name = el('div', { class: 'enemy-bar-name' }, `${enemy.name} · Lv ${enemy.level}`);
    const root = el('div', { class: `enemy-bar${enemy.night ? ' night' : ''}` }, name, el('div', { class: 'enemy-bar-track' }, fill));
    this.root.append(root);
    this.bars.set(enemy, { root, fill });
  }

  removeBar(enemy) {
    this.bars.get(enemy)?.root.remove();
    this.bars.delete(enemy);
  }

  // A speech bubble above `speaker` for a few seconds (replaces any older one).
  say(speaker, text, seconds = 4) {
    this.bubbles.get(speaker)?.node.remove();
    const node = el('div', { class: 'speech-bubble' }, text);
    this.root.append(node);
    this.bubbles.set(speaker, { node, time: seconds });
  }

  // A small name tag above a villager, shown when you are close.
  addTag(entity, text) {
    const node = el('div', { class: 'name-tag' }, text);
    this.root.append(node);
    this.tags.set(entity, node);
  }

  removeTag(entity) {
    this.tags.get(entity)?.remove();
    this.tags.delete(entity);
    this.bubbles.get(entity)?.node.remove();
    this.bubbles.delete(entity);
  }

  update(dt) {
    this.camera.updateMatrixWorld();
    for (const [speaker, b] of this.bubbles) {
      b.time -= dt;
      const gone = b.time <= 0 || speaker.inside;
      if (gone) {
        b.node.remove();
        this.bubbles.delete(speaker);
        continue;
      }
      this.place(b.node, tmp.copy(speaker.position).setY(speaker.position.y + speaker.height + 0.9));
    }
    for (const [entity, node] of this.tags) {
      const near = this.camera.position.distanceTo(entity.position) < 16 && !entity.inside && !this.bubbles.has(entity);
      node.style.display = near ? '' : 'none';
      if (near) this.place(node, tmp.copy(entity.position).setY(entity.position.y + entity.height + 0.45));
    }

    // Damage numbers rise and fade.
    this.numbers = this.numbers.filter((n) => {
      n.age += dt;
      if (n.age >= NUMBER_LIFE) {
        n.node.remove();
        return false;
      }
      n.pos.y += dt * 1.6;
      this.place(n.node, n.pos);
      n.node.style.opacity = String(1 - Math.max(0, (n.age - NUMBER_LIFE * 0.5) / (NUMBER_LIFE * 0.5)));
      return true;
    });

    // Health bars above enemies (only when hurt, targeted or nearby and angry).
    for (const [enemy, bar] of this.bars) {
      const near = this.camera.position.distanceTo(enemy.position) < BAR_RANGE;
      const show = near && enemy.alive && (enemy.health < enemy.maxHealth || enemy.isAngry);
      bar.root.style.display = show ? '' : 'none';
      if (!show) continue;
      bar.fill.style.transform = `scaleX(${Math.max(0, enemy.health / enemy.maxHealth)})`;
      this.place(bar.root, tmp.copy(enemy.position).setY(enemy.position.y + enemy.height + 0.6));
    }
  }

  // Move a label to where a 3D point appears on screen (hidden if behind the camera).
  place(node, position) {
    tmp.copy(position).project(this.camera);
    if (tmp.z > 1) {
      node.style.visibility = 'hidden';
      return;
    }
    node.style.visibility = '';
    const x = (tmp.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-tmp.y * 0.5 + 0.5) * window.innerHeight;
    node.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  }
}
