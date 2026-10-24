import { AVAILABLE_AVATARS } from '../../../shared/profile-schema.js';

/**
 * Learner Screen L1: Quest Intro
 * Welcomes the learner to their first reading quest.
 */

let __questIntroRenderCount = 0;

export function renderQuestIntroScreen(container, { profile, onStart }) { // LumiLearn Phase 1: diagnosing duplicate renders to identify root cause.
  __questIntroRenderCount++;
  console.debug('LumiLearn QuestIntro: renderQuestIntroScreen count', __questIntroRenderCount);
  const avatar = AVAILABLE_AVATARS.find(a => a.id === profile?.avatar) || { emoji: '🌟', label: 'Star' };
  const firstName = profile?.name?.split(' ')[0] || 'friend';

  const newHtml = `
    <div class="learner-container">
      <div class="learner-header">
        <span class="learner-badge">Reading Quest • Let's Begin</span>
        <h1 class="learner-title">Hi ${firstName}! Welcome to LumiLearn ✨</h1>
        <p class="learner-subtitle">
          We're going to play some fun reading games together.
          ${avatar.label} will come along and cheer for you!
        </p>
      </div>

      <div class="learner-card">
        <!-- Live companion widget mounted here by the app router -->
        <div class="learner-avatar" id="companion-hero-host"></div>

        <div style="text-align: left; max-width: 520px; margin: 0 auto;">
          <p style="font-size: var(--font-size-base); color: var(--color-text-primary); margin-bottom: var(--space-sm);"><strong>Here's how it works:</strong></p>
          <ul style="line-height: 2; font-size: var(--font-size-base); color: var(--color-text-primary); padding-left: 24px; margin: 0;">
            <li>You'll see <strong>15 fun questions</strong></li>
            <li>Tap the answer that sounds right to you</li>
            <li>There are no wrong grades — just learning together</li>
            <li>You can take all the time you need</li>
          </ul>
        </div>

        <div class="learner-button-row">
          <button type="button" class="learner-btn-primary" id="quest-start-btn">
            Let's Start! 🚀
          </button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = newHtml;
  console.debug('LumiLearn QuestIntro: after render, container length', container?.innerHTML?.length);

  const startBtn = container.querySelector('#quest-start-btn');
  startBtn.addEventListener('click', () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Getting Ready...';
    onStart();
  });
}
