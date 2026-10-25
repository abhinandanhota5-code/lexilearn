import { AVAILABLE_AVATARS } from '../../../shared/profile-schema.js';
import { mountCompanionWidget } from '../../components/companion/companion-widget.js';
import { mountStickerDecorations, companionIdFromProfile } from '../../components/stickers/sticker-layer.js';

/**
 * Learner Screen L4: Lesson Completion & Celebration
 * Shows achievement, encouragement, and next steps after completing a lesson.
 */

export function renderLessonCompletionScreen(container, {
  profile,
  lesson,
  summary,
  onContinue,
  onSelectAnother
}) {
  const avatar = AVAILABLE_AVATARS.find(a => a.id === profile?.avatar) || { emoji: '🌟', label: 'Star' };

  const accuracyPct = summary?.accuracy || 0;
  const activitiesCompleted = summary?.activitiesCompleted || 0;
  const celebrationMessage =
    accuracyPct >= 90 ? '🌟 Outstanding work!' :
    accuracyPct >= 75 ? '🎉 Great job!' :
    accuracyPct >= 60 ? '👍 Good progress!' :
    '💙 You\'re learning!';

  const celebrationEmoji =
    accuracyPct >= 90 ? '⭐⭐⭐' :
    accuracyPct >= 75 ? '⭐⭐' :
    accuracyPct >= 60 ? '⭐' :
    '💙';

  container.innerHTML = `
    <div class="learner-container" style="justify-content: center; align-items: center; min-height: 100vh; padding: var(--space-lg);">
      <div class="learner-card" style="max-width: 500px; text-align: center; animation: slideUp 400ms ease;">
        <!-- Live companion widget mounted here -->
        <div class="learner-avatar" id="companion-hero-host" style="margin-bottom: var(--space-md);"></div>

        <div style="font-size: 80px; margin-bottom: var(--space-lg); animation: bounce 600ms ease infinite;">
          ${celebrationEmoji}
        </div>

        <h1 style="font-size: 36px; font-weight: 700; margin: 0 0 var(--space-md) 0; color: var(--color-accent);">
          ${celebrationMessage}
        </h1>

        <p style="font-size: var(--font-size-lg); color: var(--color-text-primary); margin-bottom: var(--space-lg);">
          You completed: <strong>${escapeHtml(lesson?.title)}</strong>
        </p>

        <div style="background: var(--color-bg-secondary); border-radius: 12px; padding: var(--space-md); margin-bottom: var(--space-lg);">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
            <div>
              <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: 4px;">
                Accuracy
              </div>
              <div style="font-size: 28px; font-weight: 700; color: var(--color-accent);">
                ${Math.round(accuracyPct)}%
              </div>
            </div>
            <div>
              <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: 4px;">
                Activities
              </div>
              <div style="font-size: 28px; font-weight: 700; color: var(--color-accent);">
                ${activitiesCompleted}
              </div>
            </div>
          </div>
        </div>

        <div style="background: var(--color-border); border-radius: 8px; padding: var(--space-md); margin-bottom: var(--space-lg); font-size: var(--font-size-sm); color: var(--color-text-secondary);">
          <strong>💡 Tip:</strong> Keep practicing to unlock harder lessons and build confidence!
        </div>

        <div style="display: grid; gap: var(--space-md);">
          <button type="button" class="btn-primary" id="continue-btn" style="padding: var(--space-md); font-size: var(--font-size-base);">
            ✅ Lesson Complete
          </button>
          <button type="button" class="btn-secondary" id="another-btn">
            📚 Choose Another Lesson
          </button>
        </div>
      </div>

      <style>
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      </style>
    </div>
  `;

  // Themed progress / achievement stickers
  const completionRoot = container.querySelector('.learner-container') || container;
  mountStickerDecorations(completionRoot, {
    companionId: companionIdFromProfile(profile),
    placement: 'scrapbook'
  });
  const celebrationCard = container.querySelector('.learner-card');
  if (celebrationCard) {
    mountStickerDecorations(celebrationCard, {
      companionId: companionIdFromProfile(profile),
      placement: 'celebrate'
    });
  }

  container.querySelector('#continue-btn').addEventListener('click', () => {
    if (onContinue) onContinue();
  });

  container.querySelector('#another-btn').addEventListener('click', () => {
    if (onSelectAnother) onSelectAnother();
  });

  // Mount hero companion after render
  mountCompanionWidget(container.querySelector('#companion-hero-host'), { variant: 'hero' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}