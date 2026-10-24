/**
 * Learner Accessibility Settings Screen
 * Child-friendly controls for font size, reading support, and audio
 * Accessible from My Day screen
 */

import { DEFAULT_ACCOMMODATIONS } from '../../../shared/profile-schema.js';

export function renderAccessibilitySettingsScreen(container, {
  profile,
  onSaved,
  onBack
}) {
  let currentAccommodations = { ...profile?.accommodations || DEFAULT_ACCOMMODATIONS };

  const fontSizeOptions = [
    { value: 18, label: 'Small 📝' },
    { value: 22, label: 'Default 📖' },
    { value: 26, label: 'Large 📚' },
    { value: 30, label: 'Extra Large 🔤' }
  ];

  const lineHeightOptions = [
    { value: 1.6, label: 'Cozy' },
    { value: 1.9, label: 'Comfortable (default)' },
    { value: 2.2, label: 'Spacious' }
  ];

  container.innerHTML = `
    <div class="parent-container">
      <div class="parent-header">
        <span class="parent-badge">Accessibility Settings</span>
        <h1 class="parent-title">Make Reading Easier 👀</h1>
        <p class="parent-subtitle">Adjust these settings to help you read comfortably.</p>
      </div>

      <div class="parent-card">
        <form id="accessibility-form">
          <!-- Font Size Section -->
          <div class="form-group">
            <label class="form-label">Text Size</label>
            <div class="settings-options" id="font-size-options">
              ${fontSizeOptions.map(opt => `
                <button
                  type="button"
                  class="settings-option ${currentAccommodations.fontSizePx === opt.value ? 'is-selected' : ''}"
                  data-font-size="${opt.value}"
                  style="font-size: ${opt.value}px;"
                >
                  ${opt.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Line Height Section -->
          <div class="form-group">
            <label class="form-label">Line Spacing</label>
            <div class="settings-options">
              ${lineHeightOptions.map(opt => `
                <button
                  type="button"
                  class="settings-option ${currentAccommodations.lineHeight === opt.value ? 'is-selected' : ''}"
                  data-line-height="${opt.value}"
                >
                  ${opt.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Reading Ruler -->
          <div class="form-group">
            <label class="form-label">Reading Tools</label>
            <div class="settings-checkbox-group">
              <div class="disclaimer-box">
                <input
                  type="checkbox"
                  id="ruler-toggle"
                  class="disclaimer-checkbox"
                  ${currentAccommodations.readingRulerEnabled ? 'checked' : ''}
                />
                <label for="ruler-toggle" class="disclaimer-text">
                  <strong>Reading Ruler:</strong> A line overlay that helps keep your place while reading.
                </label>
              </div>

              <div class="disclaimer-box">
                <input
                  type="checkbox"
                  id="syllable-toggle"
                  class="disclaimer-checkbox"
                  ${currentAccommodations.syllableColoringEnabled ? 'checked' : ''}
                />
                <label for="syllable-toggle" class="disclaimer-text">
                  <strong>Syllable Coloring:</strong> Subtle colors on word parts to help with reading.
                </label>
              </div>
            </div>
          </div>

          <!-- Audio Settings -->
          <div class="form-group">
            <label class="form-label">Listening Settings</label>
            <div class="settings-checkbox-group">
              <div class="disclaimer-box">
                <input
                  type="checkbox"
                  id="read-aloud-toggle"
                  class="disclaimer-checkbox"
                  ${currentAccommodations.questionsReadAloud ? 'checked' : ''}
                />
                <label for="read-aloud-toggle" class="disclaimer-text">
                  <strong>Read Questions Aloud:</strong> Questions are read to you automatically.
                </label>
              </div>

              <div class="form-group">
                <label class="form-label" for="audio-speed">Narration Speed</label>
                <input
                  type="range"
                  id="audio-speed"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value="${currentAccommodations.audioNarrationSpeed}"
                  class="settings-slider"
                />
                <div class="slider-labels">
                  <span>Slower</span>
                  <span>Faster</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="button-row" style="justify-content: space-between; margin-top: var(--space-xl);">
            <button type="button" class="btn-secondary" id="settings-back-btn">← Back</button>
            <button type="submit" class="btn-primary" id="settings-save-btn">
              Save Settings ✨
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Event handlers
  const form = container.querySelector('#accessibility-form');
  const backBtn = container.querySelector('#settings-back-btn');
  const rulerToggle = container.querySelector('#ruler-toggle');
  const syllableToggle = container.querySelector('#syllable-toggle');
  const readAloudToggle = container.querySelector('#read-aloud-toggle');
  const audioSpeedSlider = container.querySelector('#audio-speed');

  // Font size buttons
  container.querySelectorAll('[data-font-size]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      container.querySelectorAll('[data-font-size]').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      currentAccommodations.fontSizePx = parseInt(btn.getAttribute('data-font-size'));
      // Apply immediately
      applyAccessibilitySettings(currentAccommodations);
    });
  });

  // Line height buttons
  container.querySelectorAll('[data-line-height]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      container.querySelectorAll('[data-line-height]').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      currentAccommodations.lineHeight = parseFloat(btn.getAttribute('data-line-height'));
      applyAccessibilitySettings(currentAccommodations);
    });
  });

  // Checkboxes
  rulerToggle?.addEventListener('change', () => {
    currentAccommodations.readingRulerEnabled = rulerToggle.checked;
    applyAccessibilitySettings(currentAccommodations);
  });

  syllableToggle?.addEventListener('change', () => {
    currentAccommodations.syllableColoringEnabled = syllableToggle.checked;
    applyAccessibilitySettings(currentAccommodations);
  });

  readAloudToggle?.addEventListener('change', () => {
    currentAccommodations.questionsReadAloud = readAloudToggle.checked;
  });

  audioSpeedSlider?.addEventListener('input', () => {
    currentAccommodations.audioNarrationSpeed = parseFloat(audioSpeedSlider.value);
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const updatedProfile = {
        ...profile,
        accommodations: currentAccommodations,
        updatedAt: new Date().toISOString()
      };
      const result = await window.electronAPI.saveProfile(updatedProfile);
      if (result.success) {
        if (onSaved) onSaved(result.profile);
      }
    } catch (err) {
      console.error('Error saving accessibility settings:', err);
    }
  });

  backBtn?.addEventListener('click', () => {
    if (onBack) onBack();
  });
}

/**
 * Apply accessibility settings immediately to the document
 */
function applyAccessibilitySettings(accommodations) {
  if (!accommodations) return;

  // Update CSS custom properties that the app reads
  document.documentElement.style.setProperty('--user-font-size-px', `${accommodations.fontSizePx}px`);
  document.documentElement.style.setProperty('--user-line-height', accommodations.lineHeight);
  document.documentElement.style.setProperty('--user-letter-spacing-em', accommodations.letterSpacingEm);

  // Trigger visual update
  document.body.setAttribute('data-reading-ruler', accommodations.readingRulerEnabled ? 'true' : 'false');
  document.body.setAttribute('data-syllable-coloring', accommodations.syllableColoringEnabled ? 'true' : 'false');
}
