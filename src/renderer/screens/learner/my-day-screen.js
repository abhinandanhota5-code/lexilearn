/**
 * Learner Screen M0: My Day — daily dashboard (Phase 7.1, Phase 7.2)
 *
 * Kid-facing daily home: greeting + three sections.
 *  - Schoolwork   verified SCHOOLWORK records the parent created for this
 *                 child (Phase 7.2: school materials are never auto-tasks);
 *                 each item can hand off to its assignment session
 *  - Today's Practice  one card that hands off to the existing ALE mission
 *                      flow (the ALE decides the plan on entry)
 *  - Quick Check  interface-only placeholder (engine arrives in a later phase)
 *
 * Everything rendered comes from the main-side view model —
 * nothing is invented here. Copy is kid-safe: no scores, no streaks,
 * no difficulty tiers, no percentages.
 */

const QUICK_CHECK_COPY = {
  title: 'Quick Check',
  subtitle: 'A gentle check-in is coming soon — this space grows as it is built.'
};

const PRACTICE_COPY = {
  ready: {
    title: 'Today\u2019s Practice',
    subtitle: 'A reading mission is ready for you.',
    action: 'Start My Mission! \u{1F680}'
  },
  continue: {
    title: 'Today\u2019s Practice',
    subtitle: 'You are in the middle of a reading mission \u2014 keep going!',
    action: 'Keep Going! \u{1F680}'
  },
  empty: {
    title: 'Today\u2019s Practice',
    subtitle: 'There is no practice ready for you right now. Check back soon!'
  },
  done_today: {
    title: 'Today\u2019s Practice',
    subtitle: 'You finished today\u2019s practice. Great exploring! \u{1F389}',
    action: 'All Done \u{1F44B}'
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
  const schoolwork = dashboard?.schoolwork || { availability: 'unavailable', items: [] };
  const practice = dashboard?.practice || { availability: 'ready' };
  const quickCheck = dashboard?.quickCheck || { availability: 'coming_soon' };

  const schoolworkHtml = renderSchoolwork(schoolwork);
  const practiceCopy = PRACTICE_COPY[practice.availability] || PRACTICE_COPY.empty;
  const showPracticeCta = practice.availability === 'ready' || practice.availability === 'continue';
  const practiceEmpty = practice.availability === 'empty';
  const practiceSubtitle = practiceCopy.subtitle || '';

  const schoolworkLabel = schoolwork.availability === 'ready'
    ? `${schoolwork.items.length} schoolwork item${schoolwork.items.length === 1 ? '' : 's'}`
    : 'Schoolwork';

  container.innerHTML = `
    <div class="learner-container myday-container screen-enter">
      <div class="learner-header myday-header">
        <span class="learner-badge">My Day</span>
        <div class="myday-greeting">
          <span class="myday-greeting-emoji">${escapeHtml(greeting.emoji)}</span>
          <h1 class="learner-title">${escapeHtml(greeting.text)}</h1>
        </div>
        <p class="learner-subtitle">
          Here is what is waiting for you today.
        </p>
      </div>

      <div class="myday-sections">
        <section class="myday-section" aria-label="Schoolwork">
          <div class="myday-section-heading">
            <span class="myday-section-emoji">📚</span>
            <h2 class="myday-section-title">${escapeHtml(schoolworkLabel)}</h2>
          </div>
          <div class="learner-card myday-card">
            ${schoolworkHtml}
          </div>
        </section>

        <section class="myday-section" aria-label="Today's practice">
          <div class="myday-section-heading">
            <span class="myday-section-emoji">🎯</span>
            <h2 class="myday-section-title">${escapeHtml(practiceCopy.title)}</h2>
          </div>
          <div class="learner-card myday-card task-card-enter">
            <p class="myday-copy">${escapeHtml(practiceSubtitle)}</p>
            ${practice.objectiveTitle && !practiceEmpty ? `<p class="myday-objective">${escapeHtml(practice.objectiveTitle)}</p>` : ''}
            <div class="learner-button-row myday-actions">
              ${
                practice.availability === 'done_today'
                  ? `<button type="button" class="learner-btn-primary" id="myday-practice-done" disabled>${escapeHtml(practiceCopy.action)}</button>`
                  : showPracticeCta
                    ? `<button type="button" class="learner-btn-primary" id="myday-practice-btn">${escapeHtml(practiceCopy.action)}</button>`
                    : ''
              }
            </div>
          </div>
        </section>

        <section class="myday-section" aria-label="Quick Check">
          <div class="myday-section-heading">
            <span class="myday-section-emoji">💡</span>
            <h2 class="myday-section-title">${escapeHtml(quickCheck.title || QUICK_CHECK_COPY.title)}</h2>
          </div>
          <div class="learner-card myday-card myday-quickcheck">
            <span class="myday-badge-soon">Coming soon</span>
            <p class="myday-copy">${escapeHtml(QUICK_CHECK_COPY.subtitle)}</p>
          </div>
        </section>
      </div>

      <button type="button" class="myday-back-link" id="myday-back-btn" aria-label="Back to profile">
        ← Back to profile
      </button>
    </div>
  `;

  const practiceBtn = container.querySelector('#myday-practice-btn');
  if (practiceBtn && onStartPractice) {
    practiceBtn.addEventListener('click', () => onStartPractice());
  }

  bindSchoolworkActions(container, onStartSchoolwork);

  const backBtn = container.querySelector('#myday-back-btn');
  if (backBtn && onBackToProfile) {
    backBtn.addEventListener('click', () => onBackToProfile());
  }
}

function renderSchoolwork(schoolwork) {
  if (schoolwork.availability === 'empty') {
    return `
      <div class="myday-empty">
        <span class="myday-empty-emoji">🗂️</span>
        <p class="myday-copy">${escapeHtml(schoolwork.note || 'No schoolwork set up yet.')}</p>
      </div>
    `;
  }
  if (schoolwork.availability === 'unavailable' || schoolwork.items.length === 0) {
    return `
      <div class="myday-empty">
        <span class="myday-empty-emoji">🗂️</span>
        <p class="myday-copy">Schoolwork is not available right now. Check again later.</p>
      </div>
    `;
  }
  const items = schoolwork.items.map((m, i) => `
    <div class="myday-material">
      <div class="myday-material-title">${escapeHtml(m.title)}</div>
      <div class="myday-material-meta">${[m.assignmentLabel, m.subject].filter(Boolean).map(escapeHtml).join(' • ')}${m.dueCopy ? ` • ${escapeHtml(m.dueCopy)}` : ''}</div>
      <button type="button" class="myday-material-start" data-schoolwork-id="${escapeHtml(m.schoolworkId)}" style="animation-delay: ${i * 0.05}s;">Start</button>
    </div>
  `).join('');
  return `<div class="myday-material-list">${items}</div>`;
}

function bindSchoolworkActions(container, onStartSchoolwork) {
  if (!onStartSchoolwork) return;
  [...container.querySelectorAll('.myday-material-start')].forEach((btn) => {
    btn.addEventListener('click', () => {
      const schoolworkId = btn.getAttribute('data-schoolwork-id');
      if (schoolworkId) onStartSchoolwork(schoolworkId);
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