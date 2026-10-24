/**
 * Parent Dashboard Screen
 * Provides access to learner profiles, progress, settings, and preferences
 */

import { AVAILABLE_AVATARS, AVAILABLE_THEMES } from '../../../shared/profile-schema.js';

export function renderParentDashboardScreen(container, {
  profile,
  onSelectLearner,
  onEditProfile,
  onAccessibilitySettings,
  onBackToProfile,
  onStartLearning
}) {
  const avatar = AVAILABLE_AVATARS.find(a => a.id === profile?.avatar) || { emoji: '🌟', label: 'Star' };
  const theme = AVAILABLE_THEMES.find(t => t.id === profile?.theme) || { name: 'Default' };

  const html = `
    <div class="parent-container">
      <div class="parent-header">
        <h1 class="parent-title">LexiLearn Parent Dashboard</h1>
        <p class="parent-subtitle">Manage learner profiles and track progress</p>
      </div>

      <div class="parent-card">
        <!-- Learner Profile Section -->
        <div class="form-group">
          <label class="form-label">Active Learner</label>
          <div style="background: var(--color-bg-primary); border: 2px solid var(--color-border); border-radius: 12px; padding: var(--space-md); display: flex; align-items: center; gap: var(--space-md);">
            <div style="font-size: 48px;">${avatar.emoji}</div>
            <div style="flex: 1;">
              <div style="font-weight: 700; font-size: var(--font-size-lg); color: var(--color-text-primary);">${profile?.name || 'Unknown'}</div>
              <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                ${profile?.grade || 'No grade'} • Age ${profile?.age || '?'} • ${avatar.label}
              </div>
            </div>
          </div>
        </div>

        <!-- Learning Progress -->
        <div class="form-group">
          <label class="form-label">Learning Progress</label>
          <div style="background: var(--color-bg-primary); border: 2px solid var(--color-border); border-radius: 12px; padding: var(--space-md);">
            <div style="margin-bottom: var(--space-md);">
              <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: 8px;">Activities Completed This Week</div>
              <div style="font-size: 32px; font-weight: 700; color: var(--color-accent);">
                ${(profile?.adaptiveLearning?.meta?.activities || 0) % 100}
              </div>
            </div>
            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
              Current Streak: ${profile?.adaptiveLearning?.meta?.sessionStreakDays || 0} days
            </div>
          </div>
        </div>

        <!-- Settings & Preferences -->
        <div class="form-group">
          <label class="form-label">Settings & Preferences</label>
          <div style="display: grid; gap: var(--space-sm);">
            <div style="background: var(--color-bg-primary); border: 2px solid var(--color-border); border-radius: 12px; padding: var(--space-md); display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-weight: 600; color: var(--color-text-primary);">Visual Theme</div>
                <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${theme.name}</div>
              </div>
              <span style="font-size: 24px;">🎨</span>
            </div>

            <div style="background: var(--color-bg-primary); border: 2px solid var(--color-border); border-radius: 12px; padding: var(--space-md); display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-weight: 600; color: var(--color-text-primary);">Font Size</div>
                <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${profile?.accommodations?.fontSizePx || 24}px</div>
              </div>
              <span style="font-size: 24px;">🔤</span>
            </div>

            <div style="background: var(--color-bg-primary); border: 2px solid var(--color-border); border-radius: 12px; padding: var(--space-md); display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-weight: 600; color: var(--color-text-primary);">Read Aloud</div>
                <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                  ${profile?.accommodations?.questionsReadAloud ? '✓ Enabled' : '✗ Disabled'}
                </div>
              </div>
              <span style="font-size: 24px;">🔊</span>
            </div>

            <div style="background: var(--color-bg-primary); border: 2px solid var(--color-border); border-radius: 12px; padding: var(--space-md); display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-weight: 600; color: var(--color-text-primary);">Reading Ruler</div>
                <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                  ${profile?.accommodations?.readingRulerEnabled ? '✓ Enabled' : '✗ Disabled'}
                </div>
              </div>
              <span style="font-size: 24px;">📏</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); margin-top: var(--space-lg);">
          <button type="button" class="btn-secondary" id="edit-profile-btn">
            ✏️ Edit Profile
          </button>
          <button type="button" class="btn-secondary" id="accessibility-btn">
            ♿ Accessibility
          </button>
        </div>

        <div style="display: flex; gap: var(--space-md); margin-top: var(--space-md);">
          <button type="button" class="btn-primary" id="start-learning-btn" style="flex: 1;">
            🚀 Start Learning
          </button>
          <button type="button" class="btn-secondary" id="back-btn">
            ← Back
          </button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Wire event handlers
  container.querySelector('#edit-profile-btn')?.addEventListener('click', () => {
    if (onEditProfile) onEditProfile(profile);
  });

  container.querySelector('#accessibility-btn')?.addEventListener('click', () => {
    if (onAccessibilitySettings) onAccessibilitySettings(profile);
  });

  container.querySelector('#start-learning-btn')?.addEventListener('click', () => {
    if (onStartLearning) onStartLearning(profile);
  });

  container.querySelector('#back-btn')?.addEventListener('click', () => {
    if (onBackToProfile) onBackToProfile();
  });
}
