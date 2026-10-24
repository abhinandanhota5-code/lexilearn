/**
 * Personalization Engine Demo Screen
 *
 * Shows PE suggestion card with real approval workflow.
 * Uses mock proposal data only for demonstration purposes.
 * All approval/dismissal calls are real.
 */

import { renderPESuggestionCard, showPESuccessState, showPEDismissalState } from '../components/pe-suggestion-card.js';
import { peIntegration } from '../services/pe-integration.js';

export function renderPEDemoScreen(root, options = {}) {
  const { onBack = () => {} } = options;

  root.innerHTML = `
    <div class="pe-demo-container">
      <div class="pe-demo-header">
        <button class="pe-demo-back-btn">← Back</button>
        <h2>Personalization Engine Demo</h2>
      </div>

      <div class="pe-demo-content">
        <p class="pe-demo-subtitle">Real approval workflow with live IPC integration</p>

        <div class="pe-demo-section">
          <h3>Try It Out</h3>
          <p>Accept or dismiss a suggestion to test the real approval gate.</p>

          <div id="pe-suggestion-container" class="pe-suggestion-container">
            <p class="pe-loading">Loading suggestions...</p>
          </div>

          <div class="pe-demo-info">
            <p><strong>Note:</strong> This demo uses real IPC handlers. Accepting a suggestion will persist your preference through the actual profile store.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  const backBtn = root.querySelector('.pe-demo-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', onBack);
  }

  // Load and display first pending proposal
  loadAndDisplayProposal(root);
}

async function loadAndDisplayProposal(root) {
  const container = root.querySelector('#pe-suggestion-container');
  if (!container) return;

  try {
    // Get learner ID from profile
    let learnerId = null;
    try {
      const profile = await window.electronAPI?.getProfile?.();
      learnerId = profile?.learnerId;
    } catch (err) {
      console.warn('[PE Demo] Could not get profile, using demo ID');
      learnerId = 'demo_learner_' + Date.now();
    }

    if (!learnerId) {
      container.innerHTML = '<p class="pe-error">No learner context available</p>';
      return;
    }

    // Create demo proposal if integration is available but no real proposals
    let proposals = [];
    if (peIntegration.isAvailable()) {
      proposals = await peIntegration.getPendingProposals(learnerId);
    }

    if (proposals.length === 0) {
      // Create demo proposal for demonstration
      const demoProposal = {
        proposalId: 'demo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
        modality: 'audio',
        oldWeight: 0.5,
        newWeight: 0.68,
        reason: 'improved_performance',
        rationale: 'Your preference for audio explanations improved from 0.50 → 0.68 based on successful completion.'
      };

      proposals = [demoProposal];
      container.innerHTML = '<p class="pe-demo-note">📝 Using demo proposal (not persisted in profile)</p>';
    }

    // Render first proposal
    if (proposals.length > 0) {
      const proposal = proposals[0];

      renderPESuggestionCard(container, {
        proposal,
        onAccept: async (proposalId) => {
          await handleAcceptance(container, proposalId, learnerId);
        },
        onDismiss: async (proposalId) => {
          await handleDismissal(container, proposalId, learnerId);
        }
      });
    } else {
      container.innerHTML = '<p class="pe-empty">No suggestions available</p>';
    }
  } catch (err) {
    console.error('[PE Demo] Error loading proposals:', err);
    container.innerHTML = `<p class="pe-error">Error loading suggestions: ${err.message}</p>`;
  }
}

async function handleAcceptance(container, proposalId, learnerId) {
  try {
    renderPESuggestionCard(container, { loading: true });

    const result = await peIntegration.handleAccept(proposalId);

    if (result.success) {
      showPESuccessState(container);
      console.log('[PE Demo] Proposal accepted and persisted');
    } else {
      container.innerHTML = `<p class="pe-error">Failed: ${result.message}</p>`;
    }
  } catch (err) {
    console.error('[PE Demo] Acceptance error:', err);
    container.innerHTML = `<p class="pe-error">Error: ${err.message}</p>`;
  }
}

async function handleDismissal(container, proposalId, learnerId) {
  try {
    renderPESuggestionCard(container, { loading: true });

    const result = await peIntegration.handleDismiss(proposalId);

    if (result.success) {
      showPEDismissalState(container);
      console.log('[PE Demo] Proposal dismissed');
    } else {
      container.innerHTML = `<p class="pe-error">Failed: ${result.message}</p>`;
    }
  } catch (err) {
    console.error('[PE Demo] Dismissal error:', err);
    container.innerHTML = `<p class="pe-error">Error: ${err.message}</p>`;
  }
}
