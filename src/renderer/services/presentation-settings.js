/**
 * Presentation bridge — turns the learner's stored reading/presentation
 * preferences into CSS custom properties on the document root.
 *
 * WHY THIS EXISTS: `accommodations.fontFamily`, `fontSizePx`, `lineHeight` and
 * `letterSpacingEm` have been persisted and displayed in the parent UI since
 * Phase 6, but nothing ever wrote them to the DOM — `setProperty` did not exist
 * anywhere in the renderer. The settings were inert.
 *
 * SCOPE / PRIVACY: these are PRESENTATION and ACCESSIBILITY preferences. They
 * are never derived from performance, never used to infer anything about the
 * child, and no font or value is claimed to be "best" for anyone. Whatever the
 * learner (or their parent) chose is applied verbatim, after clamping to a
 * safe, readable range.
 *
 * The module is pure about the mapping (`presentationVars`) and thin about the
 * DOM (`applyPresentationSettings`), so the mapping is unit-testable without a
 * browser.
 */

/** Clamp ranges for each presentation value. */
export const PRESENTATION_BOUNDS = Object.freeze({
  fontSizePx: Object.freeze({ min: 16, max: 40 }),
  lineHeight: Object.freeze({ min: 1.2, max: 2.6 }),
  letterSpacingEm: Object.freeze({ min: 0, max: 0.4 }),
  wordSpacingEm: Object.freeze({ min: 0, max: 0.6 }),
  audioNarrationSpeed: Object.freeze({ min: 0.5, max: 1.2 }),
  /** Max comfortable measure. Wider lines are harder to track back from. */
  readingWidthCh: Object.freeze({ min: 30, max: 95 }),
  /** Contrast ratio target for the high-contrast affordance. */
  contrast: Object.freeze({ min: 1, max: 2 })
});

const FONT_STACKS = Object.freeze({
  Lexend: "'Lexend', 'OpenDyslexic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  'OpenDyslexic': "'OpenDyslexic', 'Lexend', -apple-system, BlinkMacSystemFont, sans-serif",
  Atkinson: "'Atkinson Hyperlegible', 'Lexend', -apple-system, sans-serif",
  Verdana: "Verdana, 'Lexend', -apple-system, sans-serif",
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
});

function clamp(value, { min, max }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

/**
 * Map an accommodations block to CSS custom properties.
 *
 * Pure: returns a plain object of `{'--token': 'value'}`. Missing or invalid
 * inputs are simply omitted so the stylesheet's own defaults remain in force —
 * an unset preference never blanks out a token.
 *
 * @param {object} [accommodations] profile.accommodations
 * @returns {Record<string,string>} CSS custom property map
 */
export function presentationVars(accommodations = {}) {
  const a = accommodations && typeof accommodations === 'object' ? accommodations : {};
  const vars = {};

  const fontSizePx = clamp(a.fontSizePx, PRESENTATION_BOUNDS.fontSizePx);
  if (fontSizePx !== null) {
    // Scale the whole type ramp off the chosen base so headings stay in
    // proportion instead of only the body text changing.
    vars['--font-size-base'] = `${fontSizePx}px`;
    vars['--font-size-sm'] = `${Math.round(fontSizePx * 0.82)}px`;
    vars['--font-size-xs'] = `${Math.round(fontSizePx * 0.7)}px`;
    vars['--font-size-lg'] = `${Math.round(fontSizePx * 1.26)}px`;
    vars['--font-size-xl'] = `${Math.round(fontSizePx * 1.6)}px`;
  }

  const lineHeight = clamp(a.lineHeight, PRESENTATION_BOUNDS.lineHeight);
  if (lineHeight !== null) {
    vars['--line-height-comfortable'] = String(lineHeight);
    vars['--line-height-standard'] = String(Math.max(1.2, lineHeight - 0.2));
  }

  const letterSpacingEm = clamp(a.letterSpacingEm, PRESENTATION_BOUNDS.letterSpacingEm);
  if (letterSpacingEm !== null) {
    vars['--letter-spacing-wide'] = `${letterSpacingEm}em`;
    vars['--letter-spacing-standard'] = `${Math.max(0, letterSpacingEm - 0.04)}em`;
  }

  const wordSpacingEm = clamp(a.wordSpacingEm, PRESENTATION_BOUNDS.wordSpacingEm);
  if (wordSpacingEm !== null) {
    vars['--word-spacing-comfortable'] = `${wordSpacingEm}em`;
  }

  const stack = FONT_STACKS[a.fontFamily];
  if (stack) {
    vars['--font-family-dyslexic'] = stack;
    vars['--font-family-display'] = stack;
  }

  const readingWidthCh = clamp(a.readingWidthCh, PRESENTATION_BOUNDS.readingWidthCh);
  if (readingWidthCh !== null) {
    vars['--reading-width'] = `${readingWidthCh}ch`;
  }

  const contrast = clamp(a.contrast, PRESENTATION_BOUNDS.contrast);
  if (contrast !== null) {
    vars['--contrast-boost'] = String(contrast);
  }

  // Boolean presentation aids become data attributes so CSS can respond without
  // the renderer toggling classes by hand.
  if (typeof a.readingRulerEnabled === 'boolean') {
    vars['--reading-ruler-enabled'] = a.readingRulerEnabled ? '1' : '0';
  }
  if (typeof a.syllableColoringEnabled === 'boolean') {
    vars['--syllable-coloring-enabled'] = a.syllableColoringEnabled ? '1' : '0';
  }

  return vars;
}

/**
 * Apply an accommodations block to the document.
 *
 * Also sets the `data-reading-ruler` / `data-syllable-coloring` attributes that
 * the stylesheet keys the two accessibility aids off, and the reduced-distraction
 * flag when line focus is enabled.
 *
 * @param {object} [accommodations] profile.accommodations
 * @param {Document} [doc] injectable for testing
 * @returns {Record<string,string>} the vars that were applied
 */
export function applyPresentationSettings(accommodations, doc = document) {
  const root = doc?.documentElement;
  if (!root) return {};
  const vars = presentationVars(accommodations);
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }

  const a = accommodations && typeof accommodations === 'object' ? accommodations : {};
  if (typeof a.readingRulerEnabled === 'boolean') {
    root.setAttribute('data-reading-ruler', a.readingRulerEnabled ? 'on' : 'off');
  }
  if (typeof a.syllableColoringEnabled === 'boolean') {
    root.setAttribute('data-syllable-coloring', a.syllableColoringEnabled ? 'on' : 'off');
  }
  // "Line focus / reduced distraction" is a presentation choice, never a
  // performance judgement: it simply dims everything outside the current line.
  if (typeof a.lineFocusEnabled === 'boolean') {
    root.setAttribute('data-line-focus', a.lineFocusEnabled ? 'on' : 'off');
  }

  // Reading color theme (cream / light / dark / high-contrast) is independent
  // of the companion world theme (data-theme) — separate attribute so the two
  // never overwrite each other.
  const READING_COLOR_THEMES = ['cream', 'light', 'dark', 'high-contrast'];
  if (READING_COLOR_THEMES.includes(a.readingColorTheme)) {
    (doc.body || root).setAttribute('data-reading-color', a.readingColorTheme);
  }
  return vars;
}
