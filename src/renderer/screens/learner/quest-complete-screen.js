import { AVAILABLE_AVATARS } from '../../../shared/profile-schema.js';

/**
 * Learner Screen L3: Quest Complete
 * Celebrates completion in a game-like, encouraging way.
 * No percentages or performance judgments are shown to the child.
 */

export function renderQuestCompleteScreen(container, {
  profile,
  summary,
  onFinish
}) {
  const avatar = AVAILABLE_AVATARS.find(a => a.id === profile?.avatar) || { emoji: '🌟', label: 'Star' };
  const firstName = profile?.name?.split(' ')[0] || 'friend';

  const totalTasks = summary?.totalTasks || 0;
  const categoriesCount = summary?.categoriesCovered?.length || 6;

  container.innerHTML = `
    <div class="learner-container screen-enter">
      <div class="learner-header">
        <span class="learner-badge">Quest Complete 🎉</span>
        <h1 class="learner-title">Amazing work, ${firstName}! ${avatar.emoji}</h1>
        <p class="learner-subtitle">
          You explored all ${categoriesCount} reading areas with ${avatar.label}!
          Your personalized reading space is ready and waiting.
        </p>
      </div>

      <div class="learner-card celebration-card-enter">
        <div class="celebration-emoji">🎉</div>

        <p style="font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text-primary); margin: var(--space-lg) 0 var(--space-md) 0;">
          Quest Complete!
        </p>

        <div class="celebration-stats">
          <div class="celebration-stat celebration-stat-enter" style="animation-delay: 0.15s;">
            <div class="celebration-stat-value">${totalTasks} ✨</div>
            <div class="celebration-stat-label">Games Played</div>
          </div>
          <div class="celebration-stat celebration-stat-enter" style="animation-delay: 0.25s;">
            <div class="celebration-stat-value">${categoriesCount} 🗺️</div>
            <div class="celebration-stat-label">Areas Explored</div>
          </div>
        </div>

        <p style="font-size: var(--font-size-base); color: var(--color-text-secondary); margin: var(--space-lg) 0 var(--space-md) 0;">
          Your friend ${avatar.label} is excited to start learning with you!
        </p>

        <div class="learner-button-row">
          <button type="button" class="learner-btn-primary" id="quest-finish-btn">
            Start My Learning Adventure! 🚀
          </button>
        </div>
      </div>
    </div>
  `;

  const finishBtn = container.querySelector('#quest-finish-btn');
  finishBtn.addEventListener('click', () => {
    finishBtn.disabled = true;
    finishBtn.textContent = 'Opening...';
    onFinish();
  });
}