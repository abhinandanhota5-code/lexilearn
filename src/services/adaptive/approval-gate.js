/**
 * Approval Gate — minimal implementation for hackathon MVP
 *
 * Simple in-memory queue for preference change proposals.
 * User must explicitly approve before preferences are persisted.
 * Rejection leaves profile unchanged.
 */

/**
 * In-memory pending proposals: proposalId → { proposal, learnerId, decision }
 * decision: null (pending) | 'approved' | 'declined'
 */
const pendingProposals = new Map();

/**
 * Queue a preference change proposal (user approval required before persist).
 * @param {object} proposal { modality, oldWeight, newWeight, reason }
 * @param {string} learnerId
 * @returns {string} proposalId
 */
export function queueProposal(proposal, learnerId) {
  const proposalId = `prop_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  pendingProposals.set(proposalId, {
    proposal,
    learnerId,
    decision: null, // pending approval
    timestamp: new Date().toISOString()
  });
  return proposalId;
}

/**
 * Record user approval or rejection of a proposal.
 * @param {string} proposalId
 * @param {boolean} approved true = accept, false = reject
 * @returns {{ success: boolean, error?: string }}
 */
export function recordDecision(proposalId, approved) {
  const entry = pendingProposals.get(proposalId);
  if (!entry) {
    return { success: false, error: 'proposal_not_found' };
  }

  entry.decision = approved ? 'approved' : 'declined';
  return { success: true };
}

/**
 * Get all approved proposals for a learner (ready to persist).
 * @param {string} learnerId
 * @returns {object[]} approved proposals
 */
export function getApprovedProposals(learnerId) {
  const approved = [];
  for (const [proposalId, entry] of pendingProposals.entries()) {
    if (entry.learnerId === learnerId && entry.decision === 'approved') {
      approved.push({
        proposalId,
        ...entry.proposal
      });
    }
  }
  return approved;
}

/**
 * Get pending proposals awaiting user decision.
 * @param {string} learnerId
 * @returns {object[]} proposals with proposalId, modality, oldWeight, newWeight, reason
 */
export function getPendingProposals(learnerId) {
  const pending = [];
  for (const [proposalId, entry] of pendingProposals.entries()) {
    if (entry.learnerId === learnerId && entry.decision === null) {
      pending.push({
        proposalId,
        ...entry.proposal
      });
    }
  }
  return pending;
}

/**
 * Clean up proposals after they've been processed (approved/declined).
 * @param {string} proposalId
 */
export function cleanupProposal(proposalId) {
  pendingProposals.delete(proposalId);
}

/**
 * Generate a simple readable proposal from old/new weights.
 * @param {string} modality
 * @param {number} oldWeight
 * @param {number} newWeight
 * @returns {object} { modality, oldWeight, newWeight, reason }
 */
export function createProposal(modality, oldWeight, newWeight) {
  const delta = newWeight - oldWeight;
  const improving = delta > 0;

  return {
    modality,
    oldWeight: Math.round(oldWeight * 100) / 100,
    newWeight: Math.round(newWeight * 100) / 100,
    reason: improving ? 'improved_performance' : 'adjustment_detected',
    rationale: improving
      ? `Your preference for ${modality} improved from ${oldWeight.toFixed(2)} → ${newWeight.toFixed(2)}.`
      : `Adjusting ${modality} based on recent activity.`
  };
}
