import { mountCompanionWidget } from '../../components/companion/companion-widget.js';
import { mountStickerDecorations } from '../../components/stickers/sticker-layer.js';

/**
 * Learner Screen M2b: Schoolwork Reading (Phase 7.2)
 *
 * Renders a schoolwork assignment that has NO mappable learning objective as
 * a plain reading task: the bounded material excerpts plus a friendly "I read
 * it" completion. No evaluator runs and no learning signal is invented —
 * there is nothing to judge. Completion is honest ("finished reading").
 * Copy is kid-safe; due copy is non-punitive.
 */

const READ_COMPLETE_COPY = {
  title: 'All finished!',
  prompt: 'Nice reading! You can go back to My Day now.'
};

export function renderSchoolworkReadScreen(container, {
  profile,
  schoolwork,
  material,
  onFinish,
  onBack
}) {
  const dueCopy = schoolwork?.dueCopy ? ` • ${schoolwork.dueCopy}` : '';

  container.innerHTML = `
    <div class="learner-container screen-enter" style="justify-content: flex-start; padding-top: var(--space-xl);">
      <div class="learner-header" style="margin-bottom: var(--space-md);">
        <span class="learner-badge">Schoolwork</span>
        <h1 class="learner-title">${escapeHtml(schoolwork?.title || 'Reading')}</h1>
        <p class="learner-subtitle">${escapeHtml([schoolwork?.assignmentLabel, schoolwork?.subject].filter(Boolean).join(' • '))}</p>
      </div>

      <div class="learner-card task-card-enter" style="margin-top: var(--space-md);">
        <span class="task-category-badge">Reading</span>
        <div class="schoolwork-read-meta">${dueCopy ? escapeHtml(dueCopy) : ''}</div>
        ${renderExcerpts(material?.excerptChunks)}
        <div class="learner-button-row" style="margin-top: var(--space-lg);">
          <button type="button" class="learner-btn-primary" id="schoolwork-read-done">I read it all — All done!</button>
        </div>
      </div>

      <button type="button" class="myday-back-link" id="schoolwork-read-back" aria-label="Back to My Day">
        ← Back
      </button>
    </div>
  `;

  const doneBtn = container.querySelector('#schoolwork-read-done');
  if (doneBtn && onFinish) doneBtn.addEventListener('click', () => onFinish());

  mountStickerDecorations(container.querySelector('.learner-container') || container, {
    companionId: profile?.avatar || null,
    placement: 'scrapbook'
  });

  const backBtn = container.querySelector('#schoolwork-read-back');
  if (backBtn && onBack) backBtn.addEventListener('click', () => onBack());

  // Mount docked companion
  mountDockedCompanion(profile);

  void profile;
  void READ_COMPLETE_COPY;
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

function renderExcerpts(chunks) {
  const list = Array.isArray(chunks) ? chunks.filter(Boolean) : [];
  if (list.length === 0) {
    return `<p class="myday-copy">Nothing to read here yet — ask your grown-up about this one.</p>`;
  }
  return list
    .map((chunk) => `<p class="schoolwork-read-chunk">${escapeHtml(chunk)}</p>`)
    .join('');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;');
}