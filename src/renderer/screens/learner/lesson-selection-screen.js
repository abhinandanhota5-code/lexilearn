import { AVAILABLE_AVATARS } from '../../../shared/profile-schema.js';
import { getLessonMap } from '../../../services/learning/curriculum.js';
import { mountCompanionWidget } from '../../components/companion/companion-widget.js';
import { mountStickerDecorations, companionIdFromProfile } from '../../components/stickers/sticker-layer.js';

/**
 * Learner Screen L1: Lesson Selection & Journey Map
 * Displays available lessons, locked/unlocked states, and progress within topics.
 * Child navigates to choose which lesson to practice today.
 */

export function renderLessonSelectionScreen(container, {
  profile,
  onSelectLesson,
  onBackToProfile
}) {
  const avatar = AVAILABLE_AVATARS.find(a => a.id === profile?.avatar) || { emoji: '🌟', label: 'Star' };
  const grade = profile?.grade || 'Unknown Grade';
  const lessonMap = getLessonMap(grade, profile?.adaptiveLearning);

  const progressPerLesson = profile?.adaptiveLearning?.inProgressTopics || {};
  const completedLessons = profile?.adaptiveLearning?.skills || {};

  const lessonsBySubject = {};
  lessonMap.forEach(lesson => {
    if (!lessonsBySubject[lesson.subject]) {
      lessonsBySubject[lesson.subject] = [];
    }
    lessonsBySubject[lesson.subject].push(lesson);
  });

  const subjectHtml = Object.entries(lessonsBySubject)
    .map(([subject, lessons]) => `
      <div class="lesson-subject-group" style="margin-bottom: var(--space-lg);">
        <h3 style="font-size: var(--font-size-lg); font-weight: 700; margin-bottom: var(--space-md); color: var(--color-text-primary);">
          ${escapeHtml(subject)}
        </h3>
        <div style="display: grid; gap: var(--space-md);">
          ${lessons.map(lesson => {
            const isLocked = lesson.state === 'locked';
            const isCompleted = lesson.state === 'completed';
            const inProgress = lesson.state === 'in_progress';
            const progressPct = progressPerLesson[lesson.id] || 0;

            return `
              <button
                type="button"
                class="lesson-card ${isLocked ? 'lesson-card-locked' : isCompleted ? 'lesson-card-completed' : ''}"
                id="lesson-${lesson.id}"
                ${isLocked ? 'disabled' : ''}
                style="
                  padding: var(--space-md);
                  border-radius: 8px;
                  border: 2px solid ${isLocked ? 'var(--color-border)' : 'var(--color-accent)'};
                  background: ${isLocked ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)'};
                  cursor: ${isLocked ? 'not-allowed' : 'pointer'};
                  opacity: ${isLocked ? '0.6' : '1'};
                  transition: all 200ms ease;
                  text-align: left;
                "
              >
                <div style="display: flex; align-items: center; gap: var(--space-md);">
                  <div style="font-size: 24px; flex-shrink: 0;">
                    ${isCompleted ? '✅' : isLocked ? '🔒' : inProgress ? '⏳' : '📖'}
                  </div>
                  <div style="flex: 1;">
                    <div style="font-weight: 700; color: var(--color-text-primary);">
                      ${escapeHtml(lesson.title)}
                    </div>
                    <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: 4px;">
                      ${lesson.activities} activities • Difficulty: ${lesson.difficulty}/5
                    </div>
                    ${inProgress ? `
                      <div style="margin-top: 8px; background: var(--color-border); border-radius: 4px; height: 4px;">
                        <div style="background: var(--color-accent); height: 100%; width: ${progressPct}%; border-radius: 4px;"></div>
                      </div>
                      <div style="font-size: var(--font-size-xs); color: var(--color-accent); margin-top: 4px;">
                        ${Math.round(progressPct)}% complete
                      </div>
                    ` : ''}
                    ${isLocked && lesson.unlockReason ? `
                      <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 4px; font-style: italic;">
                        🔓 Unlock by: ${escapeHtml(lesson.unlockReason)}
                      </div>
                    ` : ''}
                  </div>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `)
    .join('');

  container.innerHTML = `
    <div class="learner-container">
      <div class="learner-header" style="margin-bottom: var(--space-lg);">
        <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md);">
          <div style="font-size: 48px;">${avatar.emoji}</div>
          <div>
            <h1 style="font-size: var(--font-size-xl); font-weight: 700; margin: 0; color: var(--color-text-primary);">
              ${escapeHtml(profile?.name)}'s Learning Path
            </h1>
            <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin: 4px 0 0 0;">
              ${grade} • Choose a lesson to practice
            </p>
          </div>
        </div>
      </div>

      <div class="learner-card" style="padding: var(--space-lg);">
        ${subjectHtml}
      </div>

      <div style="display: flex; gap: var(--space-md); margin-top: var(--space-lg);">
        <button type="button" class="btn-secondary" id="back-btn" style="flex: 1;">
          ← Back to My Day
        </button>
      </div>
    </div>
  `;

  // Companion stickers scattered like a scrapbook
  const selectionRoot = container.querySelector('.learner-container') || container;
  mountStickerDecorations(selectionRoot, {
    companionId: companionIdFromProfile(profile),
    placement: 'scrapbook'
  });

  // Wire lesson selection
  lessonMap.forEach(lesson => {
    const btn = container.querySelector(`#lesson-${lesson.id}`);
    if (btn && lesson.state !== 'locked') {
      btn.addEventListener('click', () => {
        if (onSelectLesson) onSelectLesson(lesson);
      });
    }
  });

  // Back button
  container.querySelector('#back-btn').addEventListener('click', () => {
    if (onBackToProfile) onBackToProfile();
  });

  // Mount docked companion
  mountDockedCompanion(profile);
}

function mountDockedCompanion(profile) {
  // Remove any existing docked companion
  const existingHost = document.getElementById('companion-dock-host');
  if (existingHost) {
    existingHost.remove();
  }

  // Create new dock host
  const dockHost = document.createElement('div');
  dockHost.id = 'companion-dock-host';
  document.body.appendChild(dockHost);

  // Mount the docked companion
  mountCompanionWidget(dockHost, { variant: 'docked' });
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