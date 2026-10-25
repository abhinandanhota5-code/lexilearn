/**
 * Reading comfort panel — a compact, child-friendly overlay for the reading
 * preferences that make text easy: text size, letter/line spacing, font,
 * colors. Changes apply live and persist to the local profile.
 */

import { DEFAULT_ACCOMMODATIONS } from '../../../shared/profile-schema.js';
import { applyPresentationSettings, PRESENTATION_BOUNDS } from '../../services/presentation-settings.js';

const FONTS = ['Lexend', 'OpenDyslexic', 'Atkinson', 'Verdana', 'system'];
const FONT_LABELS = { Lexend: 'Lexend', OpenDyslexic: 'Dyslexic', Atkinson: 'Clear', Verdana: 'Verdana', system: 'Default' };

const COLOR_THEMES = [
  { id: 'cream', label: 'Warm', bg: '#FFF8E7', fg: '#3D2E1C' },
  { id: 'light', label: 'Light', bg: '#FFFFFF', fg: '#1F2933' },
  { id: 'dark', label: 'Dark', bg: '#1E2430', fg: '#EAF0F6' },
  { id: 'high-contrast', label: 'Bold', bg: '#000000', fg: '#FFFFFF' }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Mount the reading comfort overlay.
 *
 * @param {object} opts
 * @param {object} opts.accommodations current profile.accommodations (copied)
 * @param {(next: object) => Promise<void>|void} [opts.onPersist] called with the
 *   merged accommodations block; the caller owns saving it to the profile.
 * @param {() => void} [opts.onClose]
 * @param {HTMLElement} [mountEl] container (defaults to document.body)
 * @returns {{ element: HTMLElement, destroy: () => void, accommodations: object }}
 */
export function mountReadingComfortPanel({ accommodations, onPersist, onClose } = {}, mountEl = document.body) {
  const state = { ...DEFAULT_ACCOMMODATIONS, ...(accommodations || {}) };
  let saveTimer = null;

  const overlay = document.createElement('div');
  overlay.className = 'reading-comfort-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Reading comfort settings');

  const panel = document.createElement('div');
  panel.className = 'reading-comfort-panel';
  overlay.appendChild(panel);

  function applyAndSave() {
    applyPresentationSettings(state);
    if (!onPersist) return;
    clearTimeout(saveTimer);
    saveState.textContent = 'Saving…';
    saveTimer = setTimeout(async () => {
      try {
        await onPersist({ ...state });
        saveState.textContent = 'Saved ✓';
        setTimeout(() => { if (saveState.textContent === 'Saved ✓') saveState.textContent = ''; }, 1800);
      } catch {
        saveState.textContent = 'Could not save — try again';
      }
    }, 400);
  }

  const refreshers = [];

  function stepper(labelText, key, { step, format, bounds }) {
    const section = document.createElement('div');
    section.className = 'reading-comfort-section';
    const label = document.createElement('div');
    label.className = 'reading-comfort-label';
    label.textContent = labelText;
    const row = document.createElement('div');
    row.className = 'reading-comfort-row';
    const ctrl = document.createElement('div');
    ctrl.className = 'rc-stepper';
    const minus = document.createElement('button');
    minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', `Make ${labelText} smaller`);
    const out = document.createElement('output');
    const plus = document.createElement('button');
    plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', `Make ${labelText} bigger`);
    ctrl.append(minus, out, plus);
    row.appendChild(ctrl);
    section.append(label, row);
    const render = () => { out.textContent = format(state[key]); };
    refreshers.push(render);
    minus.addEventListener('click', () => { state[key] = clamp(round(state[key] - step), bounds.min, bounds.max); render(); applyAndSave(); });
    plus.addEventListener('click', () => { state[key] = clamp(round(state[key] + step), bounds.min, bounds.max); render(); applyAndSave(); });
    render();
    return section;
  }

  function round(v) { return Math.round(v * 100) / 100; }

  // Title
  const title = document.createElement('h2');
  title.className = 'reading-comfort-title';
  title.textContent = 'Make reading comfy';
  panel.appendChild(title);

  // Text size
  panel.appendChild(stepper('Text size', 'fontSizePx', {
    step: 2, format: (v) => `${Math.round(v)}px`, bounds: PRESENTATION_BOUNDS.fontSizePx
  }));

  // Line spacing
  panel.appendChild(stepper('Space between lines', 'lineHeight', {
    step: 0.1, format: (v) => v.toFixed(1), bounds: PRESENTATION_BOUNDS.lineHeight
  }));

  // Letter spacing
  panel.appendChild(stepper('Space between letters', 'letterSpacingEm', {
    step: 0.02, format: (v) => (v === 0 ? 'Normal' : `+${v.toFixed(2)}`), bounds: PRESENTATION_BOUNDS.letterSpacingEm
  }));

  // Word spacing
  panel.appendChild(stepper('Space between words', 'wordSpacingEm', {
    step: 0.05, format: (v) => (v === 0 ? 'Normal' : `+${v.toFixed(2)}`), bounds: PRESENTATION_BOUNDS.wordSpacingEm
  }));

  // Font chips
  const fontSection = document.createElement('div');
  fontSection.className = 'reading-comfort-section';
  const fontLabel = document.createElement('div');
  fontLabel.className = 'reading-comfort-label';
  fontLabel.textContent = 'Letter style';
  const fontRow = document.createElement('div');
  fontRow.className = 'reading-comfort-row';
  const fontChips = FONTS.map((f) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'rc-chip';
    chip.textContent = FONT_LABELS[f];
    chip.addEventListener('click', () => { state.fontFamily = f; syncFontChips(); applyAndSave(); });
    fontRow.appendChild(chip);
    return chip;
  });
  function syncFontChips() {
    FONTS.forEach((f, i) => fontChips[i].classList.toggle('is-selected', state.fontFamily === f));
  }
  fontSection.append(fontLabel, fontRow);
  panel.appendChild(fontSection);
  syncFontChips();

  // Color theme swatches
  const colorSection = document.createElement('div');
  colorSection.className = 'reading-comfort-section';
  const colorLabel = document.createElement('div');
  colorLabel.className = 'reading-comfort-label';
  colorLabel.textContent = 'Colors';
  const colorRow = document.createElement('div');
  colorRow.className = 'reading-comfort-row';
  const swatches = COLOR_THEMES.map((t) => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'rc-swatch';
    sw.style.backgroundColor = t.bg;
    sw.style.color = t.fg;
    sw.textContent = 'Aa';
    sw.setAttribute('aria-label', `${t.label} colors`);
    sw.addEventListener('click', () => { state.readingColorTheme = t.id; syncSwatches(); applyAndSave(); });
    colorRow.appendChild(sw);
    return sw;
  });
  function syncSwatches() {
    COLOR_THEMES.forEach((t, i) => swatches[i].classList.toggle('is-selected', state.readingColorTheme === t.id));
  }
  colorSection.append(colorLabel, colorRow);
  panel.appendChild(colorSection);
  syncSwatches();

  // Footer
  const footer = document.createElement('div');
  footer.className = 'reading-comfort-footer';
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'rc-reset-btn';
  resetBtn.textContent = 'Start over';
  resetBtn.addEventListener('click', () => {
    Object.assign(state, DEFAULT_ACCOMMODATIONS);
    renderAll();
    applyAndSave();
  });
  const doneBtn = document.createElement('button');
  doneBtn.type = 'button';
  doneBtn.className = 'rc-done-btn';
  doneBtn.textContent = 'Done';
  doneBtn.addEventListener('click', () => destroy());
  footer.append(resetBtn, doneBtn);
  panel.appendChild(footer);

  const saveState = document.createElement('div');
  saveState.className = 'rc-save-state';
  saveState.setAttribute('aria-live', 'polite');
  panel.appendChild(saveState);

  function renderAll() {
    syncFontChips();
    syncSwatches();
    refreshers.forEach((r) => r());
  }

  function destroy() {
    clearTimeout(saveTimer);
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') destroy();
  }
  document.addEventListener('keydown', onKey);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) destroy();
  });

  mountEl.appendChild(overlay);
  doneBtn.focus();

  return { element: overlay, destroy, get accommodations() { return { ...state }; } };
}
