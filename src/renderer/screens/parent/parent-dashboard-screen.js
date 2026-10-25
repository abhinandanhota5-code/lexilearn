/**
 * Parent Dashboard Screen
 * Provides access to learner profiles, progress, settings, and preferences
 * Includes comprehensive progress charts and analytics
 */

import { AVAILABLE_AVATARS, AVAILABLE_THEMES } from '../../../shared/profile-schema.js';
import { companionCharacterArt } from '../../components/companion/companion-art.js';
import { renderCompanionSelectionScreen } from '../learner/companion-selection-screen.js';
import { WorldState } from '../../../services/world/world-state.js';

// Chart.js loads locally via <script> in index.html (UMD, self-registering) so the
// app stays offline-capable and CSP-compliant.
const Chart = window.Chart;

/* Original inline SVG icons for the preference tiles (same style family as help-icons) */
function prefIcon(kind) {
  const scenes = {
    theme: `
      <path d="M24 8c-9 0-16 7-16 15 0 7 5 11 10 11 3 0 4-2 4-4 0-3-2-3-2-6 0-2 2-4 5-4h6c5 0 9-3 9-7-1-3-7-5-16-5z" fill="#FBB6CE" stroke="#B83280" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="15" cy="18" r="2.4" fill="#D69E2E"/><circle cx="23" cy="13" r="2.4" fill="#63B3ED"/><circle cx="31" cy="15" r="2.4" fill="#9AE6B4"/><circle cx="13" cy="26" r="2.4" fill="#B794F4"/>
      <path d="M34 30c4 1 7 4 7 8 0 3-3 4-5 3-2-2-2-5-2-11z" fill="#F6E05E" stroke="#B7791F" stroke-width="2"/>`,
    font: `
      <rect x="7" y="10" width="34" height="28" rx="5" fill="#EBF8FF" stroke="#3182CE" stroke-width="2.5"/>
      <text x="18" y="31" font-family="sans-serif" font-size="18" font-weight="800" fill="#2B6CB0" text-anchor="middle">A</text>
      <text x="32" y="31" font-family="sans-serif" font-size="12" font-weight="800" fill="#63B3ED" text-anchor="middle">a</text>`,
    read: `
      <path d="M10 19h7l9-8v26l-9-8h-7a2 2 0 01-2-2v-6a2 2 0 012-2z" fill="#C3DAFE" stroke="#3B5BDB" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M31 17a8 8 0 010 14M36 12a14 14 0 010 24" fill="none" stroke="#3B5BDB" stroke-width="2.5" stroke-linecap="round"/>`,
    ruler: `
      <rect x="6" y="17" width="36" height="14" rx="3" fill="#FEFCBF" stroke="#B7791F" stroke-width="2.5"/>
      <path d="M13 17v6M20 17v8M27 17v6M34 17v8" stroke="#B7791F" stroke-width="2.5" stroke-linecap="round"/>`
  };
  const inner = scenes[kind] || '';
  return `<svg viewBox="0 0 48 48" width="36" height="36" role="img" aria-hidden="true" focusable="false">${inner}</svg>`;
}

function statusPill(enabled) {
  return enabled
    ? '<span class="pref-pill pref-pill--on">✓ Enabled</span>'
    : '<span class="pref-pill pref-pill--off">Not yet</span>';
}

/**
 * PIN Verification Screen
 * Verifies parent PIN before accessing parent dashboard
 */
export function renderPinVerificationScreen(container, { profile, onVerified, onBack }) {
  container.innerHTML = `
    <div class="parent-container">
      <div class="parent-header">
        <h1 class="parent-title">Parent Verification</h1>
        <p class="parent-subtitle">Enter your 4-digit PIN to access the dashboard</p>
      </div>

      <div class="parent-card">
        <div class="form-group">
          <label class="form-label" for="pin-input">Enter PIN</label>
          <input type="password" id="pin-input" class="form-input" maxlength="4" placeholder="••••" style="letter-spacing: 0.5em; font-size: 24px; text-align: center;">
        </div>

        <div id="pin-error" style="color: var(--color-error); font-size: var(--font-size-sm); margin-top: var(--space-sm); display: none;"></div>

        <div style="display: flex; gap: var(--space-md); margin-top: var(--space-lg);">
          <button type="button" class="btn-primary" id="verify-btn" style="flex: 1;">Verify PIN</button>
          <button type="button" class="btn-secondary" id="back-btn" style="flex: 1;">← Back</button>
        </div>
      </div>
    </div>
  `;

  const pinInput = container.querySelector('#pin-input');
  const verifyBtn = container.querySelector('#verify-btn');
  const backBtn = container.querySelector('#back-btn');
  const errorEl = container.querySelector('#pin-error');

  pinInput?.focus();

  verifyBtn?.addEventListener('click', async () => {
    const pin = pinInput?.value?.trim();
    if (!pin || pin.length !== 4) {
      errorEl.textContent = 'Please enter a 4-digit PIN';
      errorEl.style.display = 'block';
      return;
    }

    try {
      const result = await window.electronAPI.verifyPin(pin);
      if (result.success) {
        if (onVerified) onVerified();
      } else {
        errorEl.textContent = result.error || 'Incorrect PIN';
        errorEl.style.display = 'block';
        pinInput.value = '';
      }
    } catch (err) {
      errorEl.textContent = 'Verification failed. Please try again.';
      errorEl.style.display = 'block';
    }
  });

  backBtn?.addEventListener('click', () => {
    if (onBack) onBack();
  });

  pinInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') verifyBtn?.click();
  });
}

export function renderParentDashboardScreen(container, {
  profile,
  onSelectLearner,
  onEditProfile,
  onAccessibilitySettings,
  onBackToProfile,
  onStartLearning,
  onPinVerified
}) {
  const avatar = AVAILABLE_AVATARS.find(a => a.id === profile?.avatar) || { emoji: '🌟', label: 'Star' };
  const theme = AVAILABLE_THEMES.find(t => t.id === profile?.theme) || { name: 'Default' };

  const html = `
    <div class="parent-container">
      <div class="parent-header">
        <h1 class="parent-title">LexiLearn Parent Dashboard</h1>
        <p class="parent-subtitle">Track your child's learning progress and adjust settings</p>
      </div>

      <div class="parent-card" id="dashboard-content">
        <!-- Learner Profile Section -->
        <div class="form-group">
          <label class="form-label">Active Learner</label>
          <div style="background: var(--color-bg-primary); border: 2px solid var(--color-border); border-radius: 12px; padding: var(--space-md); display: flex; align-items: center; gap: var(--space-md);">
            <div style="width: 56px; display: flex; align-items: center; justify-content: center;">${companionCharacterArt(avatar.id, { size: 56 }) || avatar.emoji}</div>
            <div style="flex: 1;">
              <div style="font-weight: 700; font-size: var(--font-size-lg); color: var(--color-text-primary);">${profile?.name || 'Unknown'}</div>
              <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                ${profile?.grade || 'No grade'} • Age ${profile?.age || '?'} • ${avatar.label.replace(/^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)+\s*/u, '')}
              </div>
            </div>
          </div>
        </div>

        <!-- Progress Summary Cards -->
        <div class="form-group">
          <label class="form-label">Progress Overview</label>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-lg);">
            <div class="stat-card" style="background: var(--color-bg-primary); border: 2px solid var(--color-border); border-radius: 12px; padding: var(--space-md); text-align: center;">
              <div style="font-size: 32px; font-weight: 700; color: var(--color-accent);" id="stat-total-activities">${(profile?.adaptiveLearning?.meta?.activities || 0)}</div>
              <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: 4px;">Total Activities</div>
            </div>
            <div class="stat-card" style="background: var(--color-bg-primary); border: 2px solid var(--color-border); border-radius: 12px; padding: var(--space-md); text-align: center;">
              <div style="font-size: 32px; font-weight: 700; color: var(--color-success);" id="stat-correct-rate">${calculateCorrectRate(profile)}%</div>
              <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: 4px;">Correct Rate</div>
            </div>
            <div class="stat-card" style="background: var(--color-bg-primary); border: 2px solid var(--color-border); border-radius: 12px; padding: var(--space-md); text-align: center;">
              <div style="font-size: 32px; font-weight: 700; color: var(--color-warning);" id="stat-streak">${profile?.adaptiveLearning?.meta?.sessionStreakDays || 0}</div>
              <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: 4px;">Day Streak</div>
            </div>
            <div class="stat-card" style="background: var(--color-bg-primary); border: 2px solid var(--color-border); border-radius: 12px; padding: var(--space-md); text-align: center;">
              <div style="font-size: 32px; font-weight: 700; color: var(--color-info);" id="stat-sessions">${profile?.adaptiveLearning?.meta?.sessions || 0}</div>
              <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: 4px;">Sessions</div>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="form-group">
          <label class="form-label">Learning Analytics</label>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-lg); margin-bottom: var(--space-lg);">
            <!-- Progress Over Time Chart -->
            <div style="background: var(--color-bg-primary); border: 2px solid var(--color-border); border-radius: 12px; padding: var(--space-md);">
              <h4 style="margin: 0 0 var(--space-md) 0; font-size: var(--font-size-base); color: var(--color-text-primary);">Activity Progress Over Time</h4>
              <div style="height: 200px; position: relative;">
                <canvas id="progress-chart"></canvas>
              </div>
              <p id="progress-chart-note" style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: var(--space-sm); display: none;"></p>
            </div>

            <!-- Correct Rate by Category Chart -->
            <div style="background: var(--color-bg-primary); border: 2px solid var(--color-border); border-radius: 12px; padding: var(--space-md);">
              <h4 style="margin: 0 0 var(--space-md) 0; font-size: var(--font-size-base); color: var(--color-text-primary);">Performance by Skill Area</h4>
              <div style="height: 200px; position: relative;">
                <canvas id="category-chart"></canvas>
              </div>
              <p id="category-chart-note" style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: var(--space-sm); display: none;"></p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-lg);">
            <!-- Activity Types Distribution -->
            <div style="background: var(--color-bg-primary); border: 2px solid var(--color-border); border-radius: 12px; padding: var(--space-md);">
              <h4 style="margin: 0 0 var(--space-md) 0; font-size: var(--font-size-base); color: var(--color-text-primary);">Activity Types Distribution</h4>
              <div style="height: 200px; position: relative;">
                <canvas id="activity-types-chart"></canvas>
              </div>
              <p id="activity-types-chart-note" style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: var(--space-sm); display: none;"></p>
            </div>

            <!-- Session Duration / Hint Usage -->
            <div style="background: var(--color-bg-primary); border: 2px solid var(--color-border); border-radius: 12px; padding: var(--space-md);">
              <h4 style="margin: 0 0 var(--space-md) 0; font-size: var(--font-size-base); color: var(--color-text-primary);">Help Usage & Difficulty</h4>
              <div style="height: 200px; position: relative;">
                <canvas id="help-chart"></canvas>
              </div>
              <p id="help-chart-note" style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: var(--space-sm); display: none;"></p>
            </div>
          </div>
        </div>

        <!-- Strengths & Areas for Improvement -->
        <div class="form-group">
          <label class="form-label">Observed Strengths & Suggested Focus Areas</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
            <div style="background: var(--color-success-bg); border: 2px solid var(--color-success); border-radius: 12px; padding: var(--space-md);">
              <h4 style="margin: 0 0 var(--space-sm) 0; color: var(--color-success); display: flex; align-items: center; gap: var(--space-xs);">
                <span>✓</span> Strengths
              </h4>
              <ul id="strengths-list" style="margin: 0; padding-left: var(--space-lg); font-size: var(--font-size-sm); color: var(--color-text-primary);">
                <li>Loading...</li>
              </ul>
            </div>
            <div style="background: var(--color-warning-bg); border: 2px solid var(--color-warning); border-radius: 12px; padding: var(--space-md);">
              <h4 style="margin: 0 0 var(--space-sm) 0; color: var(--color-warning); display: flex; align-items: center; gap: var(--space-xs);">
                <span>📈</span> Suggested Focus Areas
              </h4>
              <ul id="focus-areas-list" style="margin: 0; padding-left: var(--space-lg); font-size: var(--font-size-sm); color: var(--color-text-primary);">
                <li>Loading...</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Settings & Preferences -->
        <div class="form-group">
          <label class="form-label">Settings & Preferences</label>
          <div class="pref-grid">
            <div class="pref-tile">
              <span class="pref-tile-icon">${prefIcon('theme')}</span>
              <div class="pref-tile-text">
                <div class="pref-tile-label">Visual Theme</div>
                <div class="pref-tile-value">${theme.name}</div>
              </div>
            </div>

            <div class="pref-tile">
              <span class="pref-tile-icon">${prefIcon('font')}</span>
              <div class="pref-tile-text">
                <div class="pref-tile-label">Font Size</div>
                <div class="pref-tile-value">${profile?.accommodations?.fontSizePx || 24}px • ${profile?.accommodations?.fontFamily || 'Lexend'}</div>
              </div>
            </div>

            <div class="pref-tile">
              <span class="pref-tile-icon">${prefIcon('read')}</span>
              <div class="pref-tile-text">
                <div class="pref-tile-label">Read Aloud</div>
                <div class="pref-tile-value">${statusPill(profile?.accommodations?.questionsReadAloud)}</div>
              </div>
            </div>

            <div class="pref-tile">
              <span class="pref-tile-icon">${prefIcon('ruler')}</span>
              <div class="pref-tile-text">
                <div class="pref-tile-label">Reading Ruler</div>
                <div class="pref-tile-value">${statusPill(profile?.accommodations?.readingRulerEnabled)}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="dashboard-actions-grid">
          <button type="button" class="btn-secondary" id="edit-profile-btn">
            Edit Profile
          </button>
          <button type="button" class="btn-secondary" id="accessibility-btn">
            Accessibility
          </button>
          <button type="button" class="btn-secondary" id="change-companion-btn">
            Change Companion
          </button>
        </div>

        <div style="display: flex; gap: var(--space-md); margin-top: var(--space-md);">
          <button type="button" class="btn-primary" id="start-learning-btn" style="flex: 1;">
            Start Learning
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

  container.querySelector('#change-companion-btn')?.addEventListener('click', () => {
    if (onEditProfile) {
      const editProfileHandler = (prof) => {
        renderCompanionSelectionScreen(container, {
          profile: prof,
          onCompanionSelected: async (companionId) => {
            try {
              const avatarData = AVAILABLE_AVATARS.find(a => a.id === companionId);
              const newTheme = avatarData?.themeId || prof.theme;
              const result = await window.electronAPI.saveProfile({
                ...prof,
                avatar: companionId,
                theme: newTheme
              });
              const updatedProfile = result.success ? result.profile : { ...prof, avatar: companionId, theme: newTheme };
              // Apply the new theme immediately
              document.body.setAttribute('data-theme', newTheme);
              renderParentDashboardScreen(container, {
                profile: updatedProfile,
                onSelectLearner,
                onEditProfile,
                onAccessibilitySettings,
                onBackToProfile,
                onStartLearning,
                onPinVerified
              });
            } catch (err) {
              console.error('Failed to save companion selection:', err);
              const avatarData = AVAILABLE_AVATARS.find(a => a.id === companionId);
              const newTheme = avatarData?.themeId || prof.theme;
              document.body.setAttribute('data-theme', newTheme);
              renderParentDashboardScreen(container, {
                profile: { ...prof, avatar: companionId, theme: newTheme },
                onSelectLearner,
                onEditProfile,
                onAccessibilitySettings,
                onBackToProfile,
                onStartLearning,
                onPinVerified
              });
            }
          },
          onBack: () => {
            renderParentDashboardScreen(container, {
              profile,
              onSelectLearner,
              onEditProfile,
              onAccessibilitySettings,
              onBackToProfile,
              onStartLearning,
              onPinVerified
            });
          }
        });
      };
      editProfileHandler(profile);
    }
  });

  container.querySelector('#start-learning-btn')?.addEventListener('click', () => {
    if (onStartLearning) {
      profile.worldState = profile.worldState || new WorldState(profile).toJSON();
      onStartLearning(profile);
    }
  });

  container.querySelector('#back-btn')?.addEventListener('click', () => {
    if (onBackToProfile) onBackToProfile();
  });

  // Load and render charts
  loadDashboardData(profile).then(data => {
    const enriched = { ...data };
    const hasRealData = (enriched.sessions?.length || 0) > 0 || (enriched.screeningSessions?.length || 0) > 0;
    if (!hasRealData) {
      enriched.isDemo = true;
      enriched.sessions = [{ results: buildDemoResults(), isDemo: true }];
    }
    renderCharts(enriched);
    renderStrengthsAndFocusAreas(enriched);
  }).catch(err => {
    console.error('Failed to load dashboard data:', err);
    showDemoDataNotice();
  });

  // Call onPinVerified callback when dashboard is rendered
  if (onPinVerified) onPinVerified();
}

function calculateCorrectRate(profile) {
  const skills = profile?.adaptiveLearning?.skills || {};
  let totalAttempts = 0;
  let totalCorrect = 0;

  for (const skillId of Object.keys(skills)) {
    totalAttempts += skills[skillId]?.attempts || 0;
    totalCorrect += skills[skillId]?.correct || 0;
  }

  if (totalAttempts === 0) return 0;
  return Math.round((totalCorrect / totalAttempts) * 100);
}

async function loadDashboardData(profile) {
  const learnerId = profile?.learnerId;
  if (!learnerId) {
    return getDemoData();
  }

  try {
    // Get learning sessions via IPC
    const learningRes = await window.electronAPI.getAllLearningSessions(learnerId);
    const sessions = learningRes?.success ? learningRes.sessions : [];

    // Get screening sessions via IPC
    const screeningRes = await window.electronAPI.getAllScreeningSessions(learnerId);
    const screeningSessions = screeningRes?.success ? screeningRes.sessions : [];

    return { sessions, screeningSessions, profile };
  } catch (err) {
    console.error('Failed to load data, using demo:', err);
    return getDemoData();
  }
}

function getDemoData() {
  // Return clearly labeled demo data
  return {
    sessions: [],
    screeningSessions: [],
    profile: null,
    isDemo: true
  };
}

/**
 * Deterministic sample results (14 days) used ONLY when no real history
 * exists, so parents can see what the analytics will look like.
 * Every card shows a "DEMO DATA" notice while these are rendered.
 */
function buildDemoResults() {
  const categories = [
    'phoneme_identification',
    'letter_sound_matching',
    'word_decoding',
    'syllable_counting',
    'rhyme_recognition',
    'sentence_completion'
  ];
  const types = ['choose', 'choose', 'build', 'choose', 'audio_replay', 'choose'];
  const results = [];
  const now = Date.now();
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  for (let day = 13; day >= 0; day--) {
    const perDay = 4 + Math.floor(rand() * 4); // 4-7 activities a day
    for (let i = 0; i < perDay; i++) {
      const catIndex = (day * 5 + i) % categories.length;
      // Gentle upward trend: early days ~55% correct, recent days ~80%
      const trend = 0.55 + ((13 - day) / 13) * 0.25;
      const skillBias = catIndex === 2 || catIndex === 4 ? -0.18 : catIndex === 0 ? 0.12 : 0;
      const isCorrect = rand() < (trend + skillBias);
      results.push({
        category: categories[catIndex],
        type: types[catIndex],
        activityType: types[catIndex],
        isCorrect,
        hintCount: isCorrect ? (rand() < 0.25 ? 1 : 0) : (rand() < 0.6 ? 2 : 1),
        explanationCount: !isCorrect && rand() < 0.4 ? 1 : 0,
        replayCount: rand() < 0.3 ? 1 + Math.floor(rand() * 2) : 0,
        attemptedAt: new Date(now - day * 24 * 60 * 60 * 1000 - i * 45 * 60 * 1000).toISOString()
      });
    }
  }
  return results;
}

function showDemoDataNotice() {
  const notes = document.querySelectorAll('[id$="-chart-note"]');
  notes.forEach(note => {
    note.textContent = '⚠️ DEMO DATA — sample results previewing these charts. Real numbers appear as soon as learning sessions are completed.';
    note.style.display = 'block';
  });
}

function renderCharts(data) {
  const { sessions, screeningSessions, profile, isDemo } = data;

  // Show demo notice if applicable
  if (isDemo || (!sessions.length && !screeningSessions.length)) {
    showDemoDataNotice();
  }

  // Combine all sessions for analysis
  const allResults = [];
  sessions.forEach(session => {
    if (session.results) {
      allResults.push(...session.results);
    }
  });
  screeningSessions.forEach(session => {
    if (session.results) {
      allResults.push(...session.results);
    }
  });

  // 1. Progress Over Time Chart
  renderProgressChart(allResults);

  // 2. Category Performance Chart
  renderCategoryChart(allResults, profile);

  // 3. Activity Types Distribution
  renderActivityTypesChart(allResults);

  // 4. Help Usage Chart
  renderHelpChart(allResults);
}

function renderProgressChart(results) {
  const ctx = document.getElementById('progress-chart');
  if (!ctx) return;

  // Group results by day
  const dailyData = {};
  results.forEach(result => {
    const date = result.attemptedAt ? new Date(result.attemptedAt).toLocaleDateString() : 'Unknown';
    if (!dailyData[date]) {
      dailyData[date] = { total: 0, correct: 0 };
    }
    dailyData[date].total++;
    if (result.isCorrect) dailyData[date].correct++;
  });

  const sortedDates = Object.keys(dailyData).sort((a, b) => new Date(a) - new Date(b));
  const labels = sortedDates.slice(-14); // Last 14 days
  const correctRates = labels.map(date => {
    const d = dailyData[date];
    return d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
  });
  const totals = labels.map(date => dailyData[date]?.total || 0);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Correct %',
        data: correctRates,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      }, {
        label: 'Activities',
        data: totals,
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        yAxisID: 'y1'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11 } } }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: { display: true, text: 'Correct %', font: { size: 10 } },
          ticks: { font: { size: 10 } }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          title: { display: true, text: 'Count', font: { size: 10 } },
          ticks: { font: { size: 10 } },
          grid: { drawOnChartArea: false }
        },
        x: { ticks: { font: { size: 10 } } }
      }
    }
  });
}

function renderCategoryChart(results, profile) {
  const ctx = document.getElementById('category-chart');
  if (!ctx) return;

  // Use skill data from profile for categories
  const skills = profile?.adaptiveLearning?.skills || {};
  const categories = Object.keys(skills).map(skillId => {
    const skill = skills[skillId];
    const total = skill.attempts || 0;
    const correct = skill.correct || 0;
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
    return {
      label: formatSkillName(skillId),
      rate,
      total,
      mastery: Math.round((skill.mastery || 0) * 100)
    };
  });

  if (categories.length === 0) {
    // Use screening results if available
    const categoryMap = {};
    results.forEach(r => {
      const cat = r.category || 'Unknown';
      if (!categoryMap[cat]) categoryMap[cat] = { total: 0, correct: 0 };
      categoryMap[cat].total++;
      if (r.isCorrect) categoryMap[cat].correct++;
    });

    Object.entries(categoryMap).forEach(([cat, data]) => {
      categories.push({
        label: formatCategoryName(cat),
        rate: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        total: data.total
      });
    });
  }

  // Sort by rate
  categories.sort((a, b) => a.rate - b.rate);

  const labels = categories.map(c => c.label);
  const rates = categories.map(c => c.rate);
  const totals = categories.map(c => c.total);
  const colors = rates.map(r => r >= 75 ? 'rgba(34, 197, 94, 0.8)' : r >= 50 ? 'rgba(234, 179, 8, 0.8)' : 'rgba(239, 68, 68, 0.8)');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Correct %',
        data: rates,
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('0.8', '1')),
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, max: 100, ticks: { font: { size: 10 } } },
        y: { ticks: { font: { size: 10 } } }
      }
    }
  });
}

function renderActivityTypesChart(results) {
  const ctx = document.getElementById('activity-types-chart');
  if (!ctx) return;

  const typeMap = {};
  results.forEach(r => {
    const type = r.type || r.activityType || 'Unknown';
    if (!typeMap[type]) typeMap[type] = 0;
    typeMap[type]++;
  });

  const labels = Object.keys(typeMap);
  const data = Object.values(typeMap);
  const colors = [
    'rgba(59, 130, 246, 0.8)',
    'rgba(34, 197, 94, 0.8)',
    'rgba(234, 179, 8, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(249, 115, 22, 0.8)'
  ];

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.map(formatCategoryName),
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length).map(c => c.replace('0.8', '1')),
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 10 } } }
      }
    }
  });
}

function renderHelpChart(results) {
  const ctx = document.getElementById('help-chart');
  if (!ctx) return;

  const helpKinds = { hint: 0, explanation: 0, audioReplay: 0 };
  let totalHints = 0;
  let totalExplanations = 0;
  let totalReplays = 0;

  results.forEach(r => {
    if (r.hintCount) totalHints += r.hintCount;
    if (r.explanationCount) totalExplanations += r.explanationCount;
    if (r.replayCount) totalReplays += r.replayCount;
  });

  // Also check for help array in results
  results.forEach(r => {
    if (Array.isArray(r.help)) {
      r.help.forEach(h => {
        if (h.kind === 'hint') totalHints++;
        else if (h.kind === 'explanation') totalExplanations++;
        else if (h.kind === 'audio_replay') totalReplays++;
      });
    }
  });

  const labels = ['Hints Used', 'Explanations', 'Audio Replays'];
  const data = [totalHints, totalExplanations, totalReplays];
  const colors = [
    'rgba(234, 179, 8, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(59, 130, 246, 0.8)'
  ];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Count',
        data,
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('0.8', '1')),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { font: { size: 10 }, stepSize: 1 } },
        x: { ticks: { font: { size: 10 } } }
      }
    }
  });
}

function renderStrengthsAndFocusAreas(data) {
  const { sessions, screeningSessions, profile } = data;

  const strengths = [];
  const focusAreas = [];

  // Analyze skills from profile
  const skills = profile?.adaptiveLearning?.skills || {};

  for (const [skillId, skill] of Object.entries(skills)) {
    const total = skill.attempts || 0;
    const correct = skill.correct || 0;
    const mastery = skill.mastery || 0;
    const rate = total > 0 ? (correct / total) : 0;

    const displayName = formatSkillName(skillId);

    if (rate >= 0.8 && total >= 5) {
      strengths.push(`${displayName} (${Math.round(rate * 100)}% accuracy)`);
    } else if (rate < 0.6 && total >= 3) {
      focusAreas.push(`${displayName} (${Math.round(rate * 100)}% accuracy — needs practice)`);
    } else if (mastery < 0.3 && total > 0) {
      focusAreas.push(`${displayName} (mastery: ${Math.round(mastery * 100)}%)`);
    }
  }

  // If no skills data, use screening results
  if (strengths.length === 0 && focusAreas.length === 0) {
    const allResults = [];
    sessions.forEach(s => s.results && allResults.push(...s.results));
    screeningSessions.forEach(s => s.results && allResults.push(...s.results));

    const categoryMap = {};
    allResults.forEach(r => {
      const cat = r.category || 'Unknown';
      if (!categoryMap[cat]) categoryMap[cat] = { total: 0, correct: 0 };
      categoryMap[cat].total++;
      if (r.isCorrect) categoryMap[cat].correct++;
    });

    Object.entries(categoryMap).forEach(([cat, data]) => {
      const rate = data.total > 0 ? data.correct / data.total : 0;
      const displayName = formatCategoryName(cat);
      if (rate >= 0.8 && data.total >= 3) {
        strengths.push(`${displayName} (${Math.round(rate * 100)}% accuracy)`);
      } else if (rate < 0.6 && data.total >= 3) {
        focusAreas.push(`${displayName} (${Math.round(rate * 100)}% accuracy — needs practice)`);
      }
    });
  }

  // Default messages if no data
  if (strengths.length === 0) {
    strengths.push('Complete more activities to identify strengths');
  }
  if (focusAreas.length === 0) {
    focusAreas.push('Complete more activities to identify focus areas');
  }

  // Limit to top 3 each
  const demoTag = data.isDemo
    ? '<li style="color: var(--color-text-secondary); font-style: italic;">Sample data — not your child\'s results</li>'
    : '';
  document.getElementById('strengths-list').innerHTML =
    strengths.slice(0, 3).map(s => `<li>${s}</li>`).join('') + demoTag;
  document.getElementById('focus-areas-list').innerHTML =
    focusAreas.slice(0, 3).map(f => `<li>${f}</li>`).join('') + demoTag;
}

function formatSkillName(skillId) {
  const names = {
    'phoneme_identification': 'Sound Recognition',
    'letter_sound_matching': 'Letter-Sound Matching',
    'word_decoding': 'Word Decoding',
    'syllable_counting': 'Syllable Counting',
    'rhyme_recognition': 'Rhyme Recognition',
    'sentence_completion': 'Sentence Completion',
    'blending': 'Sound Blending',
    'segmenting': 'Sound Segmenting'
  };
  return names[skillId] || skillId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatCategoryName(cat) {
  const names = {
    'phoneme_identification': 'Sound Detective',
    'letter_sound_matching': 'Letter Explorer',
    'word_decoding': 'Word Wizard',
    'syllable_counting': 'Syllable Counter',
    'rhyme_recognition': 'Rhyme Finder',
    'sentence_completion': 'Sentence Builder'
  };
  return names[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}