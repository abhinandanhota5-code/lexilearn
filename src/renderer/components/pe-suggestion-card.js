/**
 * Personalization Engine Suggestion Card — Minimal Functional UI
 *
 * Displays a single preference change proposal with Accept/Dismiss buttons.
 * Integrates with real approval-gate service layer.
 * No fake data or simulation.
 */

export function renderPESuggestionCard(container, options = {}) {
  const {
    proposal = null,
    onAccept = () => {},
    onDismiss = () => {},
    loading = false
  } = options;

  // Clear container
  container.innerHTML = '';

  if (!proposal) {
    // No suggestion to show
    return;
  }

  const card = document.createElement('div');
  card.className = 'pe-suggestion-card';
  card.setAttribute('role', 'alert');
  card.setAttribute('aria-live', 'polite');

  const { modality, oldWeight, newWeight, rationale, proposalId } = proposal;

  // Card content
  card.innerHTML = `
    <div class="pe-card-header">
      <h3 class="pe-card-title">✨ LexiLearn noticed a pattern</h3>
    </div>

    <div class="pe-card-body">
      <p class="pe-card-rationale">${escapeHtml(rationale)}</p>

      <div class="pe-preference-change">
        <span class="pe-modality-badge">${escapeHtml(modality)}</span>
        <div class="pe-weight-transition">
          <span class="pe-weight-old">${(oldWeight * 100).toFixed(0)}%</span>
          <span class="pe-weight-arrow">→</span>
          <span class="pe-weight-new">${(newWeight * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>

    <div class="pe-card-footer">
      <button class="pe-btn-accept" id="pe-accept" ${loading ? 'disabled' : ''}>
        ${loading ? 'Updating...' : 'That sounds right'}
      </button>
      <button class="pe-btn-dismiss" id="pe-dismiss" ${loading ? 'disabled' : ''}>
        ${loading ? 'Processing...' : 'Maybe later'}
      </button>
    </div>
  `;

  container.appendChild(card);

  // Attach handlers
  const acceptBtn = card.querySelector('#pe-accept');
  const dismissBtn = card.querySelector('#pe-dismiss');

  if (acceptBtn) {
    acceptBtn.addEventListener('click', async () => {
      await onAccept(proposalId, true);
    });
  }

  if (dismissBtn) {
    dismissBtn.addEventListener('click', async () => {
      await onDismiss(proposalId, false);
    });
  }

  return card;
}

/**
 * Show success state after acceptance
 */
export function showPESuccessState(container) {
  container.innerHTML = `
    <div class="pe-success-state">
      <div class="pe-success-icon">✓</div>
      <p class="pe-success-message">Preference updated!</p>
    </div>
  `;
}

/**
 * Show dismissal state
 */
export function showPEDismissalState(container) {
  container.innerHTML = `
    <div class="pe-dismissal-state">
      <p class="pe-dismissal-message">Got it. We'll keep learning.</p>
    </div>
  `;
}

/**
 * HTML escape utility
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
