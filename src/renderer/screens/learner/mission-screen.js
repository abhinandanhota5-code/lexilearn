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

export function renderMissionScreen(container, {
  profile,
  mission,
  onStart
}) {
  const firstName = profile?.name?.split(' ')[0] || 'friend';
  const title = mission?.plan?.title || 'Your Learning Mission';
  const activityCount = mission?.goalActivities ?? 8;

  container.innerHTML = `
    <div class="learner-container screen-enter">
      <div class="learner-header">
        <span class="mission-objective-chip">🎯 ${escapeHtml(title)}</span>
        <h1 class="learner-title">Ready for your mission, ${escapeHtml(firstName)}?</h1>
        <p class="learner-subtitle">
          We'll explore a few fun activities together — about ${escapeHtml(String(activityCount))} of them.
          ${escapeHtml(String(mission?.companionName || 'Your friend'))} will be right here with you!
        </p>
      </div>

      <div class="learner-card task-card-enter">
        <!-- Live companion widget mounted here by the app router -->
        <div class="learner-avatar" id="companion-hero-host"></div>

        <div class="mission-goal">
          <div class="celebration-stat">
            <div class="celebration-stat-value">${activityCount} 🎯</div>
            <div class="celebration-stat-label">Fun activities</div>
          </div>
          <div class="celebration-stat">
            <div class="celebration-stat-value">♾️ 💙</div>
            <div class="celebration-stat-label">Help always free</div>
          </div>
        </div>

        <div class="learner-button-row">
          <button type="button" class="learner-btn-primary" id="mission-start-btn">
            Start My Mission! 🚀
          </button>
        </div>
      </div>
    </div>
  `;

  const startBtn = container.querySelector('#mission-start-btn');
  startBtn.addEventListener('click', () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Getting Ready...';
    onStart();
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
