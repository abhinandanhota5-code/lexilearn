/**
 * Accessibility & Personalization Settings Screen
 * Parent configures font size, spacing, visual preferences, and audio settings.
 */

import { AVAILABLE_THEMES, AVAILABLE_AVATARS } from '../../../shared/profile-schema.js';

export function renderAccessibilitySettingsScreen(container, {
  profile,
  onSave,
  onBack
}) {
  const currentAccommodations = profile?.accommodations || {};
  const currentTheme = profile?.theme || 'warm-parchment';

  const fontSizes = [16, 18, 20, 24, 28, 32, 36];
  const lineHeights = [1.5, 1.6, 1.7, 1.8, 1.9, 2.0];
  const letterSpacings = [0.08, 0.12, 0.16, 0.20, 0.24];
  const speeds = [0.75, 0.80, 0.85, 0.90, 1.0];

  container.innerHTML = `
    <div class="parent-container">
      <div class="parent-header">
        <span class="parent-badge">Settings</span>
        <h1 class="parent-title">Accessibility & Personalization</h1>
        <p class="parent-subtitle">
          Configure reading support for ${profile?.name}
        </p>
      </div>

      <div class="parent-card">
        <form id="accessibility-form" novalidate>

          <!-- Visual Theme -->
          <div class="form-group">
            <label class="form-label">Visual Theme</label>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: var(--space-md);">
              ${AVAILABLE_THEMES.map(theme => `
                <button type="button"
                  class="theme-option ${currentTheme === theme.id ? 'selected' : ''}"
                  data-theme="${theme.id}"
                  style="
                    padding: var(--space-md);
                    border-radius: 8px;
                    border: 2px solid ${currentTheme === theme.id ? 'var(--color-accent)' : 'var(--color-border)'};
                    background: ${theme.bg || '#FDFBF7'};
                    color: ${theme.textColor || '#1a1a1a'};
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 200ms ease;
                  "
                >
                  ${theme.name}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Font Size -->
          <div class="form-group">
            <label class="form-label">Font Size</label>
            <div style="display: flex; align-items: center; gap: var(--space-md);">
              <input
                type="range"
                id="font-size"
                min="16"
                max="36"
                step="2"
                value="${currentAccommodations.fontSizePx || 24}"
                style="flex: 1; cursor: pointer;"
              />
              <span id="font-size-display" style="min-width: 50px; font-weight: 700;">
                ${currentAccommodations.fontSizePx || 24}px
              </span>
            </div>
            <div id="font-size-preview" style="margin-top: var(--space-md); padding: var(--space-md); background: var(--color-bg-secondary); border-radius: 8px; font-size: ${currentAccommodations.fontSizePx || 24}px;">
              Preview text
            </div>
          </div>

          <!-- Line Height -->
          <div class="form-group">
            <label class="form-label">Line Spacing</label>
            <div style="display: flex; align-items: center; gap: var(--space-md);">
              <input
                type="range"
                id="line-height"
                min="1.5"
                max="2.0"
                step="0.1"
                value="${currentAccommodations.lineHeight || 1.8}"
                style="flex: 1; cursor: pointer;"
              />
              <span id="line-height-display" style="min-width: 50px; font-weight: 700;">
                ${(currentAccommodations.lineHeight || 1.8).toFixed(1)}x
              </span>
            </div>
          </div>

          <!-- Letter Spacing -->
          <div class="form-group">
            <label class="form-label">Letter Spacing</label>
            <div style="display: flex; align-items: center; gap: var(--space-md);">
              <input
                type="range"
                id="letter-spacing"
                min="0.08"
                max="0.24"
                step="0.04"
                value="${currentAccommodations.letterSpacingEm || 0.16}"
                style="flex: 1; cursor: pointer;"
              />
              <span id="letter-spacing-display" style="min-width: 50px; font-weight: 700;">
                ${(currentAccommodations.letterSpacingEm || 0.16).toFixed(2)}em
              </span>
            </div>
          </div>

          <!-- Syllable Highlighting -->
          <div class="form-group">
            <label class="form-label">
              <input
                type="checkbox"
                id="syllable-coloring"
                ${currentAccommodations.syllableColoringEnabled ? 'checked' : ''}
                style="margin-right: 8px;"
              />
              Syllable Highlighting (color-code word syllables)
            </label>
            <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: 4px;">
              Helps children see syllable boundaries visually.
            </p>
          </div>

          <!-- Reading Ruler -->
          <div class="form-group">
            <label class="form-label">
              <input
                type="checkbox"
                id="reading-ruler"
                ${currentAccommodations.readingRulerEnabled ? 'checked' : ''}
                style="margin-right: 8px;"
              />
              Reading Focus Ruler (horizontal line to track position)
            </label>
            <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: 4px;">
              A visual aid to maintain focus on the current line of text.
            </p>
          </div>

          <!-- Questions Read Aloud -->
          <div class="form-group">
            <label class="form-label">
              <input
                type="checkbox"
                id="questions-read-aloud"
                ${currentAccommodations.questionsReadAloud ? 'checked' : ''}
                style="margin-right: 8px;"
              />
              Read Questions Aloud
            </label>
            <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: 4px;">
              Questions are automatically spoken aloud using text-to-speech.
            </p>
          </div>

          <!-- Audio Speed -->
          <div class="form-group">
            <label class="form-label">Audio Narration Speed</label>
            <div style="display: flex; align-items: center; gap: var(--space-md);">
              <input
                type="range"
                id="audio-speed"
                min="0.75"
                max="1.0"
                step="0.05"
                value="${currentAccommodations.audioNarrationSpeed || 0.85}"
                style="flex: 1; cursor: pointer;"
              />
              <span id="audio-speed-display" style="min-width: 50px; font-weight: 700;">
                ${((currentAccommodations.audioNarrationSpeed || 0.85) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; gap: var(--space-md); margin-top: var(--space-lg);">
            <button type="submit" class="btn-primary" style="flex: 1;">
              ✅ Save Settings
            </button>
            <button type="button" class="btn-secondary" id="back-btn">
              ← Back
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Live preview updates
  const fontSizeInput = container.querySelector('#font-size');
  const fontSizeDisplay = container.querySelector('#font-size-display');
  const fontSizePreview = container.querySelector('#font-size-preview');

  if (fontSizeInput) {
    fontSizeInput.addEventListener('input', (e) => {
      const size = e.target.value;
      fontSizeDisplay.textContent = size + 'px';
      fontSizePreview.style.fontSize = size + 'px';
    });
  }

  const lineHeightInput = container.querySelector('#line-height');
  const lineHeightDisplay = container.querySelector('#line-height-display');

  if (lineHeightInput) {
    lineHeightInput.addEventListener('input', (e) => {
      lineHeightDisplay.textContent = parseFloat(e.target.value).toFixed(1) + 'x';
    });
  }

  const letterSpacingInput = container.querySelector('#letter-spacing');
  const letterSpacingDisplay = container.querySelector('#letter-spacing-display');

  if (letterSpacingInput) {
    letterSpacingInput.addEventListener('input', (e) => {
      letterSpacingDisplay.textContent = parseFloat(e.target.value).toFixed(2) + 'em';
    });
  }

  const audioSpeedInput = container.querySelector('#audio-speed');
  const audioSpeedDisplay = container.querySelector('#audio-speed-display');

  if (audioSpeedInput) {
    audioSpeedInput.addEventListener('input', (e) => {
      audioSpeedDisplay.textContent = Math.round(parseFloat(e.target.value) * 100) + '%';
    });
  }

  // Theme selection
  container.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      container.querySelectorAll('.theme-option').forEach(b => {
        b.style.borderColor = 'var(--color-border)';
      });
      btn.style.borderColor = 'var(--color-accent)';
    });
  });

  // Form submission
  container.querySelector('#accessibility-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const updatedProfile = {
      ...profile,
      theme: container.querySelector('.theme-option[style*="color-accent"]')?.getAttribute('data-theme') || currentTheme,
      accommodations: {
        ...currentAccommodations,
        fontSizePx: parseInt(container.querySelector('#font-size').value),
        lineHeight: parseFloat(container.querySelector('#line-height').value),
        letterSpacingEm: parseFloat(container.querySelector('#letter-spacing').value),
        syllableColoringEnabled: container.querySelector('#syllable-coloring').checked,
        readingRulerEnabled: container.querySelector('#reading-ruler').checked,
        questionsReadAloud: container.querySelector('#questions-read-aloud').checked,
        audioNarrationSpeed: parseFloat(container.querySelector('#audio-speed').value)
      }
    };

    if (onSave) onSave(updatedProfile);
  });

  // Back button
  container.querySelector('#back-btn').addEventListener('click', () => {
    if (onBack) onBack();
  });
}
