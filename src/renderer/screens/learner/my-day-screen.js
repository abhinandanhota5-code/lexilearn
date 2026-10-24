/**
 * Learner Screen M0: My Day — Child-Friendly Home Screen
 *
 * REDESIGN FOR JUDGES' FEEDBACK:
 * - NOT data-centric (no metrics, percentages, activity counts)
 * - Mission-based ("What's next?")
 * - Purposeful emojis, warm language
 * - ONE clear primary action
 * - Optional secondary actions (schoolwork, quick check)
 * - Simple and engaging, not overwhelming
 */

import { renderPESuggestionCard, showPESuccessState, showPEDismissalState } from '../../components/pe-suggestion-card.js';
import { peIntegration } from '../../services/pe-integration.js';

const MISSION_MESSAGES = {
  ready: {
    emoji: '🚀',
    heading: 'Your Next Mission',
    subtitle: 'A fun reading adventure is waiting for you!',
    button: 'Start Mission →'
  },
  continue: {
    emoji: '🎯',
    heading: 'Keep Going!',
    subtitle: 'You\'re doing great. Let\'s continue your mission.',
    button: 'Continue →'
  },
  empty: {
    emoji: '⭐',
    heading: 'All Caught Up!',
    subtitle: 'Check back later for your next adventure.',
    button: null
  },
  done_today: {
    emoji: '🎉',
    heading: 'Amazing Work Today!',
    subtitle: 'You\'ve completed your mission. Great job! 🌟',
    button: null
  }
};

export function renderMyDayScreen(container, {
  profile,
  dashboard,
  onStartPractice,
  onStartSchoolwork,
  onBackToProfile
}) {
  const greeting = dashboard?.greeting || { text: 'Hello!', emoji: '🌟' };
  const practice = dashboard?.practice || { availability: 'ready' };
  const schoolwork = dashboard?.schoolwork || { availability: 'unavailable', items: [] };

  const missionData = MISSION_MESSAGES[practice.availability] || MISSION_MESSAGES.empty;
  const showMissionBtn = practice.availability === 'ready' || practice.availability === 'continue';
  const hasSchoolwork = schoolwork.availability === 'ready' && schoolwork.items && schoolwork.items.length > 0;

  // Build HTML
  let html = `
    <div class="learner-container myday-container screen-enter">
      <!-- Warm Greeting -->
      <div class="myday-header">
        <div class="myday-greeting-area">
          <span class="myday-greeting-emoji">${escapeHtml(greeting.emoji)}</span>
          <h1 class="learner-title">${escapeHtml(greeting.text)}</h1>
        </div>
        <p class="learner-subtitle">What would you like to do today?</p>
      </div>

      <!-- PRIMARY: Mission Card (always focal point) -->
      <div class="myday-main-card task-card-enter">
        <div class="myday-mission-icon">${missionData.emoji}</div>
        <h2 class="myday-mission-heading">${missionData.heading}</h2>
        <p class="myday-mission-subtitle">${missionData.subtitle}</p>
        ${showMissionBtn ? `
          <button type="button" class="learner-btn-primary" id="myday-practice-btn">
            ${missionData.button}
          </button>
        ` : ''}
      </div>
  `;

  // Optional: Schoolwork section
  if (hasSchoolwork) {
    html += `
      <div class="myday-secondary-section">
        <h3 class="myday-section-title">📖 Your Schoolwork</h3>
        <div class="myday-schoolwork-list" id="myday-schoolwork-container">
          ${renderSchoolworkList(schoolwork.items)}
        </div>
      </div>
    `;
  }

  // Quick Check / PE Suggestions (low priority, async)
  html += `
      <div id="pe-suggestions-container" style="display: none;"></div>
      <button type="button" class="myday-settings-link" id="myday-back-btn">⚙️ Settings</button>
    </div>
  `;

  container.innerHTML = html;

  // Wire event handlers
  const practiceBtn = container.querySelector('#myday-practice-btn');
  if (practiceBtn && onStartPractice) {
    practiceBtn.addEventListener('click', () => onStartPractice());
  }

  if (hasSchoolwork) {
    wireSchoolworkButtons(container, onStartSchoolwork);
  }

  const settingsBtn = container.querySelector('#myday-back-btn');
  if (settingsBtn && onBackToProfile) {
    settingsBtn.addEventListener('click', () => onBackToProfile());
  }

  // Load PE suggestions async (low priority)
  loadPESuggestions(container, profile);
}

function renderSchoolworkList(items) {
  if (!items || items.length === 0) return '<p class="myday-empty-text">No schoolwork assigned yet.</p>';

  return items.map((item, idx) => `
    <div class="myday-schoolwork-item" style="animation-delay: ${idx * 0.05}s;">
      <div>
        <div class="myday-item-title">${escapeHtml(item.title)}</div>
        <div class="myday-item-meta">${escapeHtml(item.subject || 'Assignment')}</div>
      </div>
      <button type="button" class="myday-item-btn" data-schoolwork-id="${escapeHtml(item.schoolworkId)}">
        Start
      </button>
    </div>
  `).join('');
}

function wireSchoolworkButtons(container, onStartSchoolwork) {
  if (!onStartSchoolwork) return;
  container.querySelectorAll('.myday-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-schoolwork-id');
      if (id) onStartSchoolwork(id);
    });
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadPESuggestions(container, profile) {
  const suggestionsContainer = container.querySelector('#pe-suggestions-container');
  if (!suggestionsContainer || !profile?.learnerId) return;

  try {
    const proposals = await peIntegration.getPendingProposals(profile.learnerId);
    if (proposals && proposals.length > 0) {
      suggestionsContainer.style.display = 'block';
      suggestionsContainer.innerHTML = '';
      renderPESuggestionCard(suggestionsContainer, {
        proposal: proposals[0],
        onAccept: async (id) => {
          const result = await peIntegration.handleAccept(id);
          if (result.success) showPESuccessState(suggestionsContainer);
        },
        onDismiss: async (id) => {
          const result = await peIntegration.handleDismiss(id);
          if (result.success) showPEDismissalState(suggestionsContainer);
        }
      });
    }
  } catch (err) {
    console.warn('[My Day] PE suggestions error:', err.message);
  }
}
