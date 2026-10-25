import { 
  AVAILABLE_AVATARS, 
  AVAILABLE_THEMES, 
  GRADE_LEVELS, 
  DEFAULT_ACCOMMODATIONS 
} from '../../../shared/profile-schema.js';
import { companionCharacterArt } from '../../components/companion/companion-art.js';

/**
 * Screen P2: Learner Profile Basics
 * Captures child name, grade level, avatar, theme swatch, and initial accommodations.
 */

export function renderLearnerBasicsScreen(container, { authData, existingProfile, onSaved, onBack }) {
  let selectedAvatar = existingProfile?.avatar || 'dinosaur';
  let selectedTheme = existingProfile?.theme || 'warm-parchment';

  // Apply initial theme live
  document.body.setAttribute('data-theme', selectedTheme);

  const gradeOptions = GRADE_LEVELS.map(g => 
    `<option value="${g}" ${existingProfile?.grade === g ? 'selected' : ''}>${g}</option>`
  ).join('');

  // Labels carry a leading emoji in the schema; cards show the emoji large,
  // so strip it from the name to avoid rendering it twice.
  const displayName = (label) => String(label).replace(/^(\p{Extended_Pictographic}[\uFE0F]?\s*)+/u, '');

  const avatarCards = AVAILABLE_AVATARS.map(a => `
    <button
      type="button"
      class="avatar-option ${selectedAvatar === a.id ? 'is-selected' : ''}"
      data-avatar="${a.id}"
      aria-label="Choose ${displayName(a.label)}"
      aria-pressed="${selectedAvatar === a.id}"
      style="--avatar-color: ${a.color}"
    >
      <span class="avatar-character">${companionCharacterArt(a.id, { size: 96 })}</span>
      <span class="avatar-label">${displayName(a.label)}</span>
      <span class="avatar-personality">${a.personality}</span>
      ${selectedAvatar === a.id ? '<span class="avatar-check" aria-hidden="true">✓</span>' : ''}
    </button>
  `).join('');

  // Theme preview follows the chosen companion (theme is derived from avatar).
  function worldPreviewHTML(avatarId) {
    const avatarData = AVAILABLE_AVATARS.find(a => a.id === avatarId);
    const preview = AVAILABLE_THEMES.find(t => t.id === avatarData?.themeId) || AVAILABLE_THEMES[0];
    return `
      <div class="world-preview" style="background: ${preview.bg}; border-color: ${preview.color || 'rgba(0,0,0,0.15)'};">
        <div class="world-preview-emoji">${companionCharacterArt(avatarId, { size: 88 })}</div>
        <div class="world-preview-name">${preview.name}</div>
        <div class="world-preview-desc">${preview.description}</div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="parent-container">
      <div class="parent-header">
        <span class="parent-badge">Step 2 of 2 • Learner Profile</span>
        <h1 class="parent-title">Tell Us About Your Learner 🌟</h1>
        <p class="parent-subtitle">
          We will customize fonts, spacing, and visual pacing to make reading comfortable and welcoming.
        </p>
      </div>

      <div class="parent-card">
        <form id="basics-form" novalidate>
          <div id="general-error" class="alert-banner error" style="display: none;"></div>

          <div class="form-group">
            <label class="form-label" for="child-name-input">Child's Name or Nickname *</label>
            <input 
              type="text" 
              id="child-name-input" 
              class="form-input" 
              placeholder="e.g. Alex" 
              maxlength="40"
              value="${existingProfile?.name || ''}"
              required
            />
            <div id="name-error" class="field-error" style="display: none;"></div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
            <div class="form-group">
              <label class="form-label" for="child-age-input">Age *</label>
              <input 
                type="number" 
                id="child-age-input" 
                class="form-input" 
                min="4" 
                max="18" 
                placeholder="e.g. 8" 
                value="${existingProfile?.age || 8}"
                required
              />
              <div id="age-error" class="field-error" style="display: none;"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="child-grade-select">Current Grade *</label>
              <select id="child-grade-select" class="form-select" required>
                <option value="" disabled ${!existingProfile?.grade ? 'selected' : ''}>Select Grade</option>
                ${gradeOptions}
              </select>
              <div id="grade-error" class="field-error" style="display: none;"></div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Choose a Companion Avatar</label>
            <span class="form-hint">A friendly companion who appears on the child's learning journey.</span>
            <div class="avatar-grid" id="avatar-container">
              ${avatarCards}
            </div>
            <div id="avatar-error" class="field-error" style="display: none;"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Your Companion's World</label>
            <span class="form-hint">Your companion choice determines the complete visual theme of the app.</span>
            <div id="world-preview-host">${worldPreviewHTML(selectedAvatar)}</div>
            <div id="theme-error" class="field-error" style="display: none;"></div>
          </div>

          <div class="form-group" style="margin-top: var(--space-xl);">
            <label class="form-label">Recommended Accommodations</label>
            <span class="form-hint">These sensory supports can be modified at any time in the Parent Dashboard.</span>
            
            <div class="disclaimer-box" style="margin-top: var(--space-sm); align-items: center;">
              <input 
                type="checkbox" 
                id="syllable-toggle" 
                class="disclaimer-checkbox"
                ${existingProfile?.accommodations?.syllableColoringEnabled ?? true ? 'checked' : ''}
              />
              <label for="syllable-toggle" class="disclaimer-text">
                <strong>Syllable Color Highlighting:</strong> Alternating subtle colors to aid multi-syllable word decoding.
              </label>
            </div>

            <div class="disclaimer-box" style="margin-top: var(--space-xs); align-items: center;">
              <input 
                type="checkbox" 
                id="ruler-toggle" 
                class="disclaimer-checkbox"
                ${existingProfile?.accommodations?.readingRulerEnabled ?? true ? 'checked' : ''}
              />
              <label for="ruler-toggle" class="disclaimer-text">
                <strong>Focus Reading Ruler:</strong> A subtle line overlay that dims distractions and keeps place while reading.
              </label>
            </div>
          </div>

          <div class="button-row">
            ${onBack ? `<button type="button" class="btn-secondary" id="basics-back-btn">⬅ Back</button>` : ''}
            <button type="submit" class="btn-primary" id="basics-save-btn">
              Save Profile & Finish Setup ✨
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector('#basics-form');
  const nameInput = container.querySelector('#child-name-input');
  const ageInput = container.querySelector('#child-age-input');
  const gradeSelect = container.querySelector('#child-grade-select');
  const syllableToggle = container.querySelector('#syllable-toggle');
  const rulerToggle = container.querySelector('#ruler-toggle');

  const nameError = container.querySelector('#name-error');
  const ageError = container.querySelector('#age-error');
  const gradeError = container.querySelector('#grade-error');
  const generalError = container.querySelector('#general-error');

  // Avatar Selection Handlers — update in place so typed form values survive.
  container.querySelectorAll('.avatar-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-avatar');
      if (id === selectedAvatar) return;
      selectedAvatar = id;
      container.querySelectorAll('.avatar-option').forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-selected', on);
        b.setAttribute('aria-pressed', String(on));
        const check = b.querySelector('.avatar-check');
        if (on && !check) b.insertAdjacentHTML('beforeend', '<span class="avatar-check" aria-hidden="true">✓</span>');
        if (!on && check) check.remove();
      });
      const previewHost = container.querySelector('#world-preview-host');
      if (previewHost) previewHost.innerHTML = worldPreviewHTML(selectedAvatar);
    });
  });

  // Back Button
  if (onBack) {
    container.querySelector('#basics-back-btn')?.addEventListener('click', onBack);
  }

  // Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset errors
    nameError.style.display = 'none';
    ageError.style.display = 'none';
    gradeError.style.display = 'none';
    generalError.style.display = 'none';
    nameInput.classList.remove('has-error');
    ageInput.classList.remove('has-error');
    gradeSelect.classList.remove('has-error');

    let hasClientError = false;

    if (!nameInput.value || nameInput.value.trim().length < 2) {
      nameError.textContent = '⚠️ Please enter a name or nickname (at least 2 characters).';
      nameError.style.display = 'flex';
      nameInput.classList.add('has-error');
      hasClientError = true;
    }

    const ageVal = Number(ageInput.value);
    if (!ageInput.value || isNaN(ageVal) || ageVal < 4 || ageVal > 18) {
      ageError.textContent = '⚠️ Age must be between 4 and 18.';
      ageError.style.display = 'flex';
      ageInput.classList.add('has-error');
      hasClientError = true;
    }

    if (!gradeSelect.value) {
      gradeError.textContent = '⚠️ Please select a grade level.';
      gradeError.style.display = 'flex';
      gradeSelect.classList.add('has-error');
      hasClientError = true;
    }

    // Use companion's theme ID instead of separate theme selection
    const selectedAvatarData = AVAILABLE_AVATARS.find(a => a.id === selectedAvatar);
    const finalTheme = selectedAvatarData?.themeId || 'dinosaur-world';

    const payload = {
      name: nameInput.value.trim(),
      age: ageVal,
      grade: gradeSelect.value,
      avatar: selectedAvatar,
      theme: finalTheme,
      parentPinHash: authData?.parentPinHash || existingProfile?.parentPinHash,
      parentPinSalt: authData?.parentPinSalt || existingProfile?.parentPinSalt,
      disclaimerAccepted: true,
      accommodations: {
        ...DEFAULT_ACCOMMODATIONS,
        syllableColoringEnabled: syllableToggle.checked,
        readingRulerEnabled: rulerToggle.checked
      }
    };

    try {
      const saveBtn = container.querySelector('#basics-save-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving Profile...';

      const result = await window.electronAPI.saveProfile(payload);
      if (!result.success) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Profile & Finish Setup ✨';
        
        if (result.errors) {
          const firstKey = Object.keys(result.errors)[0];
          generalError.textContent = `⚠️ Validation error: ${result.errors[firstKey]}`;
        } else {
          generalError.textContent = `⚠️ Error saving profile: ${result.error || 'Unknown error'}`;
        }
        generalError.style.display = 'flex';
        return;
      }

      onSaved(result.profile);
    } catch (err) {
      generalError.textContent = `⚠️ Save failed: ${err.message}`;
      generalError.style.display = 'flex';
    }
  });
}
