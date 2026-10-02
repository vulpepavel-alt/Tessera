// The Settings panel (used from the main menu and from the pause menu).
// Every slider applies immediately and is remembered for next time.

import { el } from './dom.js';
import { settings, SETTING_RANGES } from '../save/Settings.js';

export function createSettingsPanel(onBack) {
  const rows = Object.entries(SETTING_RANGES).map(([name, range]) => {
    const output = el('output', {}, range.format(settings.get(name)));
    const slider = el('input', {
      type: 'range',
      id: `setting-${name}`,
      min: range.min,
      max: range.max,
      step: range.step,
      value: settings.get(name),
      oninput: (e) => {
        const value = Number(e.target.value);
        output.textContent = range.format(value);
        settings.set(name, value);
      },
    });
    return el('div', { class: 'setting' }, el('label', { for: `setting-${name}` }, range.label), slider, output);
  });

  return el('div', { class: 'panel settings' },
    el('h2', {}, 'Settings'),
    rows,
    el('div', { class: 'row end' }, el('button', { class: 'btn', onclick: onBack }, 'Back')));
}
