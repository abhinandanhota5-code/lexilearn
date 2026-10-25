import { mountCompanionWidget } from '../../components/companion/companion-widget.js';
import { mountStickerDecorations, companionIdFromProfile } from '../../components/stickers/sticker-layer.js';

/**
 * Learner Screen M3: Learning Break / Celebration (§7 R1, Phase 6 Step 2)
 *
 * Shown when the ALE suggests a break after the session cap. Kid-facing copy
 * only — no scores, no percentages, no difficulty tiers. A friendly summary
 * count ("You explored N activities!") is the only number shown.
 */

export function renderLearningBreakScreen(container, {
  profile,
  summary,
  onFinish
}) {
  const firstName = profile?.name?.split(' ')[0] || 'friend';
  const total = summary?.totalActivities ?? 0;

  container.innerHTML = `
    <div class="learner-container screen-enter">
      <div class="learner-header">
        <span class="learner-badge">Mission Break 🌟</span>
        <h1 class="learner-title">Great exploring, ${escapeHtml(firstName)}!</h1>
        <p class="learner-subtitle">
          You finished today's mission. Your reading adventure will be here
          whenever you come back!
        </p>
      </div>

      <div class="learner-card celebration-card-enter">
        <!-- Live companion widget mounted here -->
        <div class="learner-avatar" id="companion-hero-host" style="margin-bottom: var(--space-md);"></div>

        <div class="break-emoji">🏆</div>

        <div class="celebration-stats">
          <div class="celebration-stat celebration-stat-enter" style="animation-delay: 0.15s;">
            <div class="celebration-stat-value">${total} ✨</div>
            <div class="celebration-stat-label">Activities explored</div>
          </div>
        </div>

        <p style="font-size: var(--font-size-base); color: var(--color-text-secondary); margin: var(--space-md) 0 0 0;">
          Time for a rest. See you on the next adventure! 💙
        </p>

        <div class="learner-button-row">
          <button type="button" class="learner-btn-primary" id="break-done-btn">
            All Done! 👋
          </button>
        </div>
      </div>
    </div>
  `;

  mountStickerDecorations(container.querySelector('.learner-container') || container, {
    companionId: companionIdFromProfile(profile),
    placement: 'scrapbook'
  });

  container.querySelector('#break-done-btn').addEventListener('click', () => {
    onFinish();
  });

  // Mount hero companion after render
  mountCompanionWidget(container.querySelector('#companion-hero-host'), { variant: 'hero' });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;');
}