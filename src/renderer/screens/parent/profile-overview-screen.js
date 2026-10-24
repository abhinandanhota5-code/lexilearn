import { AVAILABLE_AVATARS, AVAILABLE_THEMES } from '../../../shared/profile-schema.js';

/**
 * Parent Profile Overview & Management
 * Loaded automatically on startup when an existing profile is detected.
 */

export function renderProfileOverviewScreen(container, { profile, onEditProfile, onUploadDocument, onSchoolMaterial, onStartLearning, onResetProfile, onParentDashboard }) {
  // Apply saved theme
  document.body.setAttribute('data-theme', profile.theme || 'warm-parchment');

  const avatar = AVAILABLE_AVATARS.find(a => a.id === profile.avatar) || { emoji: '🌟', label: 'Learner' };
  const theme = AVAILABLE_THEMES.find(t => t.id === profile.theme) || { name: 'Warm Parchment' };
  const docInfo = profile.documentExtraction || {};

  const docSectionHtml = docInfo.hasDocument
    ? `
      <div class="info-tile" style="padding: var(--space-md); margin-bottom: var(--space-md); background-color: var(--color-bg-card);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-xs);">
          <div style="display: flex; align-items: center; gap: var(--space-sm);">
            <span style="font-size: 28px;">📑</span>
            <div>
              <div style="font-weight: 700; font-size: var(--font-size-base); color: var(--color-text-primary);">
                ${docInfo.originalFileName || 'Evaluation Document'}
              </div>
              <div class="form-hint" style="margin: 0;">
                Verified by parent • ${docInfo.confirmedAccommodations?.length || 0} accommodations confirmed
              </div>
            </div>
          </div>
          <button type="button" class="btn-secondary" id="update-doc-btn" style="min-height: 44px; padding: 0 var(--space-md); font-size: var(--font-size-xs);">
            📄 Update Report
          </button>
        </div>
        ${docInfo.parentNotes ? `<div style="margin-top: var(--space-xs); font-size: var(--font-size-xs); color: var(--color-text-secondary); font-style: italic;">Notes: "${docInfo.parentNotes}"</div>` : ''}
      </div>
    `
    : `
      <div class="info-tile" style="padding: var(--space-md); margin-bottom: var(--space-md); background-color: var(--color-bg-card); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-xs);">
        <div style="display: flex; align-items: center; gap: var(--space-sm);">
          <span style="font-size: 28px;">📄</span>
          <div>
            <div style="font-weight: 700; font-size: var(--font-size-base); color: var(--color-text-primary);">
              No Educational Assessment Attached Yet
            </div>
            <div class="form-hint" style="margin: 0;">
              Upload an IEP or specialist report anytime to extract accommodations.
            </div>
          </div>
        </div>
        <button type="button" class="btn-secondary" id="upload-new-doc-btn" style="min-height: 44px; padding: 0 var(--space-md); font-size: var(--font-size-xs);">
          📑 Upload Report
        </button>
      </div>
    `;

  container.innerHTML = `
    <div class="parent-container">
      <div class="parent-header">
        <span class="parent-badge">Learner Profile Active</span>
        <h1 class="parent-title">Welcome back, ${profile.name}! 👋</h1>
        <p class="parent-subtitle">
          Your personalized reading space is configured and ready.
        </p>
      </div>

      <div class="parent-card">
        <div class="profile-hero">
          <div class="profile-hero-avatar">
            ${avatar.emoji}
          </div>
          <div class="profile-hero-info">
            <h2>${profile.name}</h2>
            <p>${profile.grade} • Age ${profile.age} • ${avatar.label}</p>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-size: var(--font-size-sm); text-transform: uppercase; color: var(--color-text-secondary);">
            Educational Documentation
          </label>
          ${docSectionHtml}
        </div>

        <div class="form-group">
          <label class="form-label" style="font-size: var(--font-size-sm); text-transform: uppercase; color: var(--color-text-secondary);">
            School Curriculum & Materials
          </label>
          <div class="info-tile" id="school-materials-tile" style="padding: var(--space-md); background-color: var(--color-bg-card); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-xs);">
            <div style="display: flex; align-items: center; gap: var(--space-sm);">
              <span style="font-size: 28px;">📚</span>
              <div>
                <div style="font-weight: 700; font-size: var(--font-size-base); color: var(--color-text-primary);">
                  Loading school materials…
                </div>
                <div class="form-hint" style="margin: 0;" id="school-materials-status">
                  Reading your curriculum setup…
                </div>
              </div>
            </div>
            <button type="button" class="btn-secondary" id="school-material-btn" style="min-height: 44px; padding: 0 var(--space-md); font-size: var(--font-size-xs);">
              📚 School Materials
            </button>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-tile">
            <div class="info-tile-label">Visual Theme</div>
            <div class="info-tile-value" style="display: flex; align-items: center; gap: 8px;">
              <span class="theme-swatch-circle" style="width: 22px; height: 22px; background-color: ${theme.bg || '#FDFBF7'};"></span>
              ${theme.name}
            </div>
          </div>

          <div class="info-tile">
            <div class="info-tile-label">Font & Typography</div>
            <div class="info-tile-value">${profile.accommodations?.fontFamily || 'Lexend'} (${profile.accommodations?.fontSizePx || 24}px)</div>
          </div>

          <div class="info-tile">
            <div class="info-tile-label">Syllable Highlighting</div>
            <div class="info-tile-value">
              ${profile.accommodations?.syllableColoringEnabled ? '✅ Enabled' : '⏸️ Disabled'}
            </div>
          </div>

          <div class="info-tile">
            <div class="info-tile-label">Focus Reading Ruler</div>
            <div class="info-tile-value">
              ${profile.accommodations?.readingRulerEnabled ? '✅ Enabled' : '⏸️ Disabled'}
            </div>
          </div>
        </div>

        <div class="alert-banner" style="background-color: var(--color-bg-card); border: 1px solid var(--color-border); margin-top: var(--space-md);">
          <span style="font-size: 24px;">🔒</span>
          <div>
            <strong>Parent Settings Protected:</strong> A 4-digit PIN is active. Changes to the learner profile require adult verification.
          </div>
        </div>

        <div class="profile-action-grid">
          <div class="profile-action-col profile-action-col-left">
            <button type="button" class="btn-secondary" id="parent-dashboard-btn">
              📊 Parent Dashboard
            </button>
            <button type="button" class="btn-secondary btn-danger" id="reset-profile-btn">
              🗑️ Reset Profile
            </button>
          </div>
          <div class="profile-action-col profile-action-col-right">
            ${profile.screeningStatus === 'completed' ? `<button type="button" class="btn-primary" id="start-learning-btn">🚀 Start Learning</button>` : ''}
            <button type="button" class="btn-primary" id="edit-profile-btn">
              ✏️ Edit Profile Details
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Edit Profile Handler
  container.querySelector('#edit-profile-btn').addEventListener('click', () => {
    onEditProfile(profile);
  });

  // Parent Dashboard Handler
  const dashboardBtn = container.querySelector('#parent-dashboard-btn');
  if (dashboardBtn && onParentDashboard) {
    dashboardBtn.addEventListener('click', () => {
      onParentDashboard(profile);
    });
  }

  // Document Upload / Update Handlers
  const uploadBtn = container.querySelector('#upload-new-doc-btn') || container.querySelector('#update-doc-btn');
  if (uploadBtn && onUploadDocument) {
    uploadBtn.addEventListener('click', () => {
      onUploadDocument(profile);
    });
  }

  // Start Learning (Phase 6 Step 2): hands off to the child's learning flow.
  const startLearningBtn = container.querySelector('#start-learning-btn');
  if (startLearningBtn && onStartLearning) {
    startLearningBtn.addEventListener('click', () => {
      onStartLearning(profile);
    });
  }

  // School Materials: reflect the live (validated) state from storage and open
  // the parent curriculum/school-material setup.
  const schoolMaterialBtn = container.querySelector('#school-material-btn');
  if (schoolMaterialBtn && onSchoolMaterial) {
    schoolMaterialBtn.addEventListener('click', () => {
      onSchoolMaterial(profile);
    });
  }
  if (window.electronAPI && typeof window.electronAPI.listSchoolMaterials === 'function') {
    const tileTitle = container.querySelector('#school-materials-tile > div > div > div:first-child');
    const tileStatus = container.querySelector('#school-materials-status');
    window.electronAPI.listSchoolMaterials(profile.learnerId).then((res) => {
      const materials = res?.success ? (res.materials || []) : null;
      const loadFailed = !materials;
      const verified = materials ? materials.filter((m) => m.verificationStatus === 'verified').length : 0;
      if (tileTitle) {
        tileTitle.textContent = loadFailed
          ? 'School materials unavailable'
          : materials.length > 0
            ? `Curriculum ready — ${materials[0].curriculumId} • ${materials[0].grade} • ${materials[0].subject}`
            : 'No school curriculum set yet';
      }
      if (tileStatus) {
        tileStatus.textContent = loadFailed
          ? 'Could not read your school materials right now.'
          : verified > 0
            ? `${materials.length} material(s) — ${verified} verified as learning context`
            : materials.length > 0
              ? `${materials.length} material(s) — none verified yet (unverified materials are not used)`
              : 'Add the school system and the materials your child is learning from.';
      }
    }).catch(() => {});
  }

  // Reset Profile Handler
  container.querySelector('#reset-profile-btn').addEventListener('click', async () => {
    const confirmReset = window.confirm(
      `Are you sure you want to reset the profile for ${profile.name}? This will clear the current profile and return to the initial setup.`
    );
    if (!confirmReset) return;

    try {
      const res = await window.electronAPI.resetProfile();
      if (res.success || res === true) {
        document.body.removeAttribute('data-theme');
        onResetProfile();
      }
    } catch (err) {
      alert(`Error resetting profile: ${err.message}`);
    }
  });
}
