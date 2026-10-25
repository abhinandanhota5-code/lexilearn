import { AVAILABLE_AVATARS } from '../../../shared/profile-schema.js';
import { mountCompanionWidget } from '../../components/companion/companion-widget.js';
import { companionCharacterArt } from '../../components/companion/companion-art.js';
import { mountStickerDecorations, companionIdFromProfile } from '../../components/stickers/sticker-layer.js';

/**
 * Learner Screen L3: Quest Complete
 * Celebrates completion in a game-like, encouraging way.
 * No percentages or performance judgments are shown to the child.
 */

const stripEmoji = (label) => String(label).replace(/^(\p{Extended_Pictographic}[\uFE0F]?\s*)+/u, '');

export function renderQuestCompleteScreen(container, {
  profile,
  summary,
  onFinish
}) {
  const avatar = AVAILABLE_AVATARS.find(a => a.id === profile?.avatar) || AVAILABLE_AVATARS[0] || { id: null, emoji: '🌟', label: 'Star' };
  const firstName = profile?.name?.split(' ')[0] || 'friend';
  const companionName = stripEmoji(avatar.label);
  const companionArt = companionCharacterArt(avatar.id, { size: 56 });

  const totalTasks = summary?.totalTasks || 0;
  const categoriesCount = summary?.categoriesCovered?.length || 6;

  container.innerHTML = `
    <div class="learner-container screen-enter">
      <div class="learner-header">
        <span class="learner-badge">Quest Complete</span>
        <h1 class="learner-title">Amazing work, ${firstName}!</h1>
        <p class="learner-subtitle">
          You explored all ${categoriesCount} reading areas with ${companionName}!
          Your personalized reading space is ready and waiting.
        </p>
      </div>

      <div class="learner-card celebration-card-enter quest-summary-card">
        <div class="quest-hero-row">
          <div class="quest-hero-host" id="companion-hero-host"></div>
          <div class="quest-hero-intro">
            <p class="quest-complete-heading">Quest Complete!</p>
            <p class="quest-complete-sub">Your friend ${companionName} is excited to start learning with you.</p>
          </div>
        </div>

        <div class="celebration-stats">
          <div class="celebration-stat celebration-stat-enter" style="animation-delay: 0.15s;">
            <div class="celebration-stat-value">${totalTasks}</div>
            <div class="celebration-stat-label">Games Played</div>
          </div>
          <div class="celebration-stat celebration-stat-enter" style="animation-delay: 0.25s;">
            <div class="celebration-stat-value">${categoriesCount}</div>
            <div class="celebration-stat-label">Areas Explored</div>
          </div>
          <div class="celebration-stat celebration-stat-enter" style="animation-delay: 0.35s;">
            <span class="celebration-stat-art">${companionArt}</span>
            <div class="celebration-stat-label">${companionName}</div>
          </div>
        </div>

        <div class="learner-button-row">
          <button type="button" class="learner-btn-primary" id="quest-finish-btn">
            Start My Learning Adventure!
          </button>
        </div>
      </div>
    </div>
  `;

  // Scrapbook scatter of companion stickers across the screen
  const questRoot = container.querySelector('.learner-container') || container;
  mountStickerDecorations(questRoot, {
    companionId: companionIdFromProfile(profile),
    placement: 'scrapbook'
  });
  const celebrationCard = container.querySelector('.learner-card');
  if (celebrationCard) {
    mountStickerDecorations(celebrationCard, {
      companionId: companionIdFromProfile(profile),
      placement: 'progress'
    });
  }

  const finishBtn = container.querySelector('#quest-finish-btn');
  finishBtn.addEventListener('click', () => {
    finishBtn.disabled = true;
    finishBtn.textContent = 'Opening...';
    onFinish();
  });

  // Mount hero companion after render
  mountCompanionWidget(container.querySelector('#companion-hero-host'), { variant: 'hero' });
}
