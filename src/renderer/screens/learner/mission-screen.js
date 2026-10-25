import { mountCompanionWidget } from '../../components/companion/companion-widget.js';
import { mountStickerDecorations, companionIdFromProfile } from '../../components/stickers/sticker-layer.js';

/**
 * Learner Screen M1: Mission Landing (§2 journey, Phase 6 Step 2)
 *
 * Kid-facing mission start: friendly greeting, the practice goal (a gentle
 * count, never a score), and a big start button. The companion hero widget
 * mounts in the host element provided by the app router (same pattern as the
 * screening intro).
 *
 * The child never sees mastery values, difficulty tiers, or rationale tags —
 * only an adventure-themed invitation.
 */

const COMPANION_LINES = {
  'racing-car': [
    'Buckle up — adventure mode: ON!',
    'Ready, steady, READ!',
    'This car runs on curiosity… and snacks.',
    'No pit stops unless you need one!',
    'Vroom vroom — let’s zoom through these!'
  ],
  'dinosaur': [
    'Roar! I did NOT eat the homework.',
    'Stomp with me — one step at a time!',
    'Tiny steps are BIG wins. I counted.',
    'My arms are short but my cheer is loud!'
  ],
  'ocean-friends': [
    'Dive in — I’ll keep you afloat!',
    'Blub blub! Let’s make some waves.',
    'Feeling stuck? I’ll bubble up with help.',
    'The deep end is scary… but we’ve got flippers!'
  ]
};

const NEUTRAL_LINES = [
  'Let’s learn something new together!',
  'I brought snacks. Wait — that’s my job?',
  'Every activity makes your brain stronger!'
];

function pickLines(companionId) {
  return COMPANION_LINES[companionId] || NEUTRAL_LINES;
}

export function renderMissionScreen(container, {
  profile,
  mission,
  onStart
}) {
  const firstName = profile?.name?.split(' ')[0] || 'friend';
  const title = mission?.plan?.title || 'Your Learning Mission';
  const activityCount = mission?.goalActivities ?? 8;
  const companionId = companionIdFromProfile(profile);
  const companionName = mission?.companionName || 'Your friend';

  container.innerHTML = `
    <div class="learner-container screen-enter mission-screen">
      <div class="learner-header">
        <span class="mission-objective-chip">🎯 ${escapeHtml(title)}</span>
        <h1 class="learner-title">Ready for your mission, ${escapeHtml(firstName)}?</h1>
        <p class="learner-subtitle">
          We'll explore a few fun activities together — about ${escapeHtml(String(activityCount))} of them.
          ${escapeHtml(companionName)} will be right here with you!
        </p>
      </div>

      <div class="learner-card task-card-enter mission-card">
        <!-- Live companion widget mounted here by the app router -->
        <div class="mission-hero-wrap">
          <div class="learner-avatar" id="companion-hero-host"></div>
          <div class="mission-bubble" id="mission-bubble" aria-live="polite">
            <span class="mission-bubble-text"></span>
          </div>
        </div>

        <div class="mission-goal">
          <div class="celebration-stat mission-stat">
            <div class="celebration-stat-value">${activityCount} 🎯</div>
            <div class="celebration-stat-label">Fun activities</div>
          </div>
          <div class="celebration-stat mission-stat">
            <div class="celebration-stat-value">♾️ 💙</div>
            <div class="celebration-stat-label">Help always free</div>
          </div>
        </div>

        <div class="learner-button-row">
          <button type="button" class="learner-btn-primary mission-start-btn" id="mission-start-btn">
            Start My Mission! 🚀
          </button>
        </div>
      </div>
    </div>
  `;

  // Home-style decorative stickers for mission landing
  const missionRoot = container.querySelector('.learner-container') || container;
  mountStickerDecorations(missionRoot, {
    companionId: companionIdFromProfile(profile),
    placement: 'scrapbook'
  });

  const startBtn = container.querySelector('#mission-start-btn');
  startBtn.addEventListener('click', () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Getting Ready...';
    onStart();
  });

  // Mount hero companion after render
  mountCompanionWidget(container.querySelector('#companion-hero-host'), { variant: 'hero' });

  // Fun companion chatter bubble — cycles lines gently; static under reduced motion.
  const bubble = container.querySelector('#mission-bubble .mission-bubble-text');
  if (bubble) {
    const lines = pickLines(companionId);
    let idx = Math.floor(Math.random() * lines.length);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    bubble.textContent = lines[idx];
    if (!reduced) {
      const timer = setInterval(() => {
        if (!container.isConnected) { clearInterval(timer); return; }
        idx = (idx + 1) % lines.length;
        const el = container.querySelector('#mission-bubble');
        bubble.textContent = lines[idx];
        el?.classList.remove('bubble-pop');
        void el?.offsetWidth;
        el?.classList.add('bubble-pop');
      }, 5200);
    }
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}